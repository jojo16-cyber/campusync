import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { env } from '../config/env';
import { ApplicationStatus, APPLICATION_STATUSES } from '../models/application.model';

interface MockUserRecord {
  _id: string;
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

interface MockListingRecord {
  _id: string;
  id: string;
  companyName: string;
  title: string;
  opportunityType: string;
  location: string;
  status: 'draft' | 'published' | 'closed';
  applicationOpenDate: Date;
  applicationDeadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MockApplicationRecord {
  _id: string;
  id: string;
  student: string;
  listing: string;
  status: ApplicationStatus;
  coverLetter: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mockUsers = new Map<string, MockUserRecord>();
const mockListings = new Map<string, MockListingRecord>();
const mockApplications = new Map<string, MockApplicationRecord>();

jest.mock('../models/user.model', () => {
  return {
    User: {
      findById: jest.fn(async (id: string) => {
        const user = mockUsers.get(id);
        return user
          ? {
              ...user,
              _id: user._id,
              id: user._id,
              toSafeObject: () => ({ ...user }),
            }
          : null;
      }),
      countDocuments: jest.fn(async (query: { role?: string }) => {
        return Array.from(mockUsers.values()).filter((u) => {
          if (query.role && u.role !== query.role) return false;
          return true;
        }).length;
      }),
    },
  };
});

jest.mock('../models/listing.model', () => {
  return {
    Listing: {
      findById: jest.fn(async (id: string) => {
        const listing = mockListings.get(id);
        return listing ? { ...listing, _id: listing._id, id: listing._id } : null;
      }),
      countDocuments: jest.fn(
        async (query?: {
          status?: string;
          opportunityType?: string;
          applicationDeadline?: { $gte?: Date; $lte?: Date };
        }) => {
          return Array.from(mockListings.values()).filter((l) => {
            if (query?.status && l.status !== query.status) return false;
            if (query?.opportunityType && l.opportunityType !== query.opportunityType) return false;
            if (query?.applicationDeadline?.$gte) {
              if (new Date(l.applicationDeadline) < query.applicationDeadline.$gte) return false;
            }
            return true;
          }).length;
        }
      ),
      find: jest.fn(() => ({
        lean: jest.fn(async () => Array.from(mockListings.values())),
      })),
    },
  };
});

jest.mock('../models/application.model', () => {
  const actual = jest.requireActual('../models/application.model');

  return {
    ...actual,
    Application: {
      countDocuments: jest.fn(async (query?: { status?: string }) => {
        return Array.from(mockApplications.values()).filter((a) => {
          if (query?.status && a.status !== query.status) return false;
          return true;
        }).length;
      }),

      distinct: jest.fn(async (field: string, query?: { status?: string }) => {
        if (field === 'student') {
          const matching = Array.from(mockApplications.values()).filter((a) => {
            if (query?.status && a.status !== query.status) return false;
            return true;
          });
          const uniqueStudentIds = Array.from(new Set(matching.map((a) => a.student)));
          return uniqueStudentIds;
        }
        return [];
      }),

      aggregate: jest.fn(async (pipeline: Array<Record<string, unknown>>) => {
        // Mock company application aggregation
        const isCompanyAgg = pipeline.some(
          (stage) => stage.$lookup && (stage.$lookup as { from?: string }).from === 'listings'
        );

        if (isCompanyAgg) {
          const companyCounts = new Map<string, number>();

          for (const app of mockApplications.values()) {
            const listing = mockListings.get(app.listing);
            if (listing) {
              const name = listing.companyName;
              companyCounts.set(name, (companyCounts.get(name) || 0) + 1);
            }
          }

          return Array.from(companyCounts.entries())
            .map(([companyName, applicationCount]) => ({
              _id: companyName,
              applicationCount,
            }))
            .sort((a, b) => b.applicationCount - a.applicationCount);
        }

        return [];
      }),

      find: jest.fn((query?: { status?: string }) => {
        let results = Array.from(mockApplications.values()).filter((a) => {
          if (query?.status && a.status !== query.status) return false;
          return true;
        });

        const chainObj: Record<string, unknown> = {
          sort: jest.fn().mockImplementation(() => chainObj),
          limit: jest.fn().mockImplementation((limitNum: number) => {
            results = results.slice(0, limitNum);
            return chainObj;
          }),
          populate: jest.fn().mockImplementation(() => chainObj),
          lean: jest.fn(async () => {
            return results.map((a) => {
              const listing = mockListings.get(a.listing);
              return {
                ...a,
                listing: listing ? { companyName: listing.companyName } : null,
              };
            });
          }),
          then: (resolve: (val: unknown) => void) => {
            const mapped = results.map((a) => {
              const user = mockUsers.get(a.student);
              const listing = mockListings.get(a.listing);

              return {
                ...a,
                _id: a._id,
                id: a._id,
                student: user
                  ? { _id: user._id, id: user._id, name: user.name, email: user.email }
                  : a.student,
                listing: listing
                  ? {
                      _id: listing._id,
                      id: listing._id,
                      companyName: listing.companyName,
                      title: listing.title,
                      opportunityType: listing.opportunityType,
                      location: listing.location,
                    }
                  : a.listing,
              };
            });
            resolve(mapped);
          },
        };

        return chainObj;
      }),
    },
  };
});

describe('Admin Dashboard & Placement Analytics API (/api/analytics)', () => {
  let adminToken: string;
  let adminId: string;
  let studentToken: string;
  let studentId: string;

  beforeEach(() => {
    mockUsers.clear();
    mockListings.clear();
    mockApplications.clear();
    jest.clearAllMocks();

    adminId = '507f1f77bcf86cd799439000';
    studentId = '507f1f77bcf86cd799439001';

    mockUsers.set(adminId, {
      _id: adminId,
      id: adminId,
      name: 'TPO Administrator',
      email: 'admin@campasync.edu',
      passwordHash: 'hash',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUsers.set(studentId, {
      _id: studentId,
      id: studentId,
      name: 'Student One',
      email: 'student1@campasync.edu',
      passwordHash: 'hash',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    adminToken = jwt.sign(
      { userId: adminId, email: 'admin@campasync.edu', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { userId: studentId, email: 'student1@campasync.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('Authorization & Access Control', () => {
    it('rejects unauthenticated request to /api/analytics/dashboard with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/analytics/dashboard');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication token is required/i);
    });

    it('rejects malformed Bearer token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('forbids student access to /api/analytics/dashboard with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden: Access denied. Required role: admin/i);
    });

    it('forbids student access to /api/analytics/kpis with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/analytics/kpis')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows administrator access to /api/analytics/dashboard with 200 OK', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Metric Calculations & Deduplication Logic', () => {
    beforeEach(() => {
      // Setup 4 students (studentId already set as student 1)
      const student2Id = '507f1f77bcf86cd799439002';
      const student3Id = '507f1f77bcf86cd799439003';
      const student4Id = '507f1f77bcf86cd799439004';

      mockUsers.set(student2Id, {
        _id: student2Id,
        id: student2Id,
        name: 'Student Two',
        email: 'student2@campasync.edu',
        passwordHash: 'hash',
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUsers.set(student3Id, {
        _id: student3Id,
        id: student3Id,
        name: 'Student Three',
        email: 'student3@campasync.edu',
        passwordHash: 'hash',
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockUsers.set(student4Id, {
        _id: student4Id,
        id: student4Id,
        name: 'Student Four',
        email: 'student4@campasync.edu',
        passwordHash: 'hash',
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Future date for open deadline
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      // Past date for expired deadline
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // Listings
      // Listing 1: Active published listing (Google)
      mockListings.set('listing_google', {
        _id: 'listing_google',
        id: 'listing_google',
        companyName: 'Google',
        title: 'SWE Intern',
        opportunityType: 'internship',
        location: 'Bangalore, India',
        status: 'published',
        applicationOpenDate: new Date(Date.now() - 10000),
        applicationDeadline: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Listing 2: Active published listing (Microsoft)
      mockListings.set('listing_msft', {
        _id: 'listing_msft',
        id: 'listing_msft',
        companyName: 'Microsoft',
        title: 'Software Engineer',
        opportunityType: 'full_time',
        location: 'Hyderabad, India',
        status: 'published',
        applicationOpenDate: new Date(Date.now() - 10000),
        applicationDeadline: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Listing 3: Draft listing (Amazon) - not active
      mockListings.set('listing_amzn', {
        _id: 'listing_amzn',
        id: 'listing_amzn',
        companyName: 'Amazon',
        title: 'Cloud Associate',
        opportunityType: 'internship_and_full_time',
        location: 'Chennai, India',
        status: 'draft',
        applicationOpenDate: new Date(Date.now() - 10000),
        applicationDeadline: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Listing 4: Closed listing (Apple) - not active
      mockListings.set('listing_aapl', {
        _id: 'listing_aapl',
        id: 'listing_aapl',
        companyName: 'Apple',
        title: 'Hardware Engineer',
        opportunityType: 'full_time',
        location: 'Bangalore, India',
        status: 'closed',
        applicationOpenDate: new Date(Date.now() - 10000),
        applicationDeadline: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Listing 5: Expired published listing (Netflix) - deadline passed, not active
      mockListings.set('listing_nflx', {
        _id: 'listing_nflx',
        id: 'listing_nflx',
        companyName: 'Netflix',
        title: 'Systems Intern',
        opportunityType: 'internship',
        location: 'Remote',
        status: 'published',
        applicationOpenDate: new Date(Date.now() - 20000),
        applicationDeadline: pastDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Applications:
      // Student 1 selected at Google and Microsoft (2 offers for 1 student!)
      mockApplications.set('app_1', {
        _id: 'app_1',
        id: 'app_1',
        student: studentId,
        listing: 'listing_google',
        status: 'selected',
        coverLetter: 'Hello Google',
        submittedAt: new Date(Date.now() - 5000),
        createdAt: new Date(Date.now() - 5000),
        updatedAt: new Date(),
      });

      mockApplications.set('app_2', {
        _id: 'app_2',
        id: 'app_2',
        student: studentId,
        listing: 'listing_msft',
        status: 'selected',
        coverLetter: 'Hello MSFT',
        submittedAt: new Date(Date.now() - 4000),
        createdAt: new Date(Date.now() - 4000),
        updatedAt: new Date(),
      });

      // Student 2 selected at Google (1 offer)
      mockApplications.set('app_3', {
        _id: 'app_3',
        id: 'app_3',
        student: student2Id,
        listing: 'listing_google',
        status: 'selected',
        coverLetter: 'Hello Google S2',
        submittedAt: new Date(Date.now() - 3000),
        createdAt: new Date(Date.now() - 3000),
        updatedAt: new Date(),
      });

      // Student 3 in interview pipeline
      mockApplications.set('app_4', {
        _id: 'app_4',
        id: 'app_4',
        student: student3Id,
        listing: 'listing_google',
        status: 'shortlisted',
        coverLetter: '',
        submittedAt: new Date(Date.now() - 2500),
        createdAt: new Date(Date.now() - 2500),
        updatedAt: new Date(),
      });

      mockApplications.set('app_5', {
        _id: 'app_5',
        id: 'app_5',
        student: student3Id,
        listing: 'listing_msft',
        status: 'interview_scheduled',
        coverLetter: '',
        submittedAt: new Date(Date.now() - 2000),
        createdAt: new Date(Date.now() - 2000),
        updatedAt: new Date(),
      });

      // Student 4 in review and rejected
      mockApplications.set('app_6', {
        _id: 'app_6',
        id: 'app_6',
        student: student4Id,
        listing: 'listing_google',
        status: 'under_review',
        coverLetter: '',
        submittedAt: new Date(Date.now() - 1500),
        createdAt: new Date(Date.now() - 1500),
        updatedAt: new Date(),
      });

      mockApplications.set('app_7', {
        _id: 'app_7',
        id: 'app_7',
        student: student4Id,
        listing: 'listing_msft',
        status: 'rejected',
        coverLetter: '',
        submittedAt: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 1000),
        updatedAt: new Date(),
      });

      // Student 2 submitted another
      mockApplications.set('app_8', {
        _id: 'app_8',
        id: 'app_8',
        student: student2Id,
        listing: 'listing_msft',
        status: 'submitted',
        coverLetter: '',
        submittedAt: new Date(Date.now() - 800),
        createdAt: new Date(Date.now() - 800),
        updatedAt: new Date(),
      });

      // Student 1 withdrawn from Netflix
      mockApplications.set('app_9', {
        _id: 'app_9',
        id: 'app_9',
        student: studentId,
        listing: 'listing_nflx',
        status: 'withdrawn',
        coverLetter: '',
        submittedAt: new Date(Date.now() - 500),
        createdAt: new Date(Date.now() - 500),
        updatedAt: new Date(),
      });
    });

    it('correctly calculates KPIs, dedupes selected students, and computes placement rate', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { kpis } = res.body.data;

      // 4 registered students (admin not counted)
      expect(kpis.totalStudents).toBe(4);

      // 2 active opportunities (Google & MSFT; Amazon is draft, Apple is closed, Netflix is expired)
      expect(kpis.activeOpportunities).toBe(2);

      // 9 total submitted applications
      expect(kpis.totalApplications).toBe(9);

      // Selected students must be 2 (Student 1 and Student 2), NOT 3!
      expect(kpis.selectedStudents).toBe(2);

      // Total offers is 3
      expect(kpis.totalOffers).toBe(3);

      // Placement Rate = (2 / 4) * 100 = 50.0%
      expect(kpis.placementRate).toBe(50.0);

      // Selection Rate = (3 / 9) * 100 = 33.3%
      expect(kpis.selectionRate).toBe(33.3);
    });

    it('returns application status distribution covering all 7 valid statuses', async () => {
      const res = await request(app)
        .get('/api/analytics/status-distribution')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const distribution = res.body.data;
      expect(distribution).toHaveLength(APPLICATION_STATUSES.length);

      const statusMap = new Map<string, { status: string; count: number; percentage: number }>(
        distribution.map((d: { status: string; count: number; percentage: number }) => [
          d.status,
          d,
        ])
      );

      // Verify each status count matches mock applications
      expect(statusMap.get('submitted')?.count).toBe(1);
      expect(statusMap.get('under_review')?.count).toBe(1);
      expect(statusMap.get('shortlisted')?.count).toBe(1);
      expect(statusMap.get('interview_scheduled')?.count).toBe(1);
      expect(statusMap.get('selected')?.count).toBe(3);
      expect(statusMap.get('rejected')?.count).toBe(1);
      expect(statusMap.get('withdrawn')?.count).toBe(1);

      // Total count across all 7 statuses should sum to total applications (9)
      const totalCount = distribution.reduce(
        (acc: number, curr: { count: number }) => acc + curr.count,
        0
      );
      expect(totalCount).toBe(9);
    });

    it('aggregates company-wise application counts sorted by descending volume', async () => {
      const res = await request(app)
        .get('/api/analytics/company-applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const companies = res.body.data;
      expect(Array.isArray(companies)).toBe(true);
      expect(companies.length).toBeGreaterThan(0);

      // Google has 4 apps (app_1, app_3, app_4, app_6)
      // Microsoft has 4 apps (app_2, app_5, app_7, app_8)
      // Netflix has 1 app (app_9)
      const google = companies.find((c: { companyName: string }) => c.companyName === 'Google');
      const msft = companies.find((c: { companyName: string }) => c.companyName === 'Microsoft');
      const nflx = companies.find((c: { companyName: string }) => c.companyName === 'Netflix');

      expect(google).toBeDefined();
      expect(google.applicationCount).toBe(4);
      expect(msft).toBeDefined();
      expect(msft.applicationCount).toBe(4);
      expect(nflx).toBeDefined();
      expect(nflx.applicationCount).toBe(1);
    });

    it('returns recent applications with populated student and listing data', async () => {
      const res = await request(app)
        .get('/api/analytics/recent-applications?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const recent = res.body.data;
      expect(Array.isArray(recent)).toBe(true);
      expect(recent.length).toBeLessThanOrEqual(5);

      if (recent.length > 0) {
        const item = recent[0];
        expect(item.id).toBeDefined();
        expect(item.student).toBeDefined();
        expect(item.student.name).toBeDefined();
        expect(item.student.email).toBeDefined();
        expect(item.listing).toBeDefined();
        expect(item.listing.companyName).toBeDefined();
        expect(item.listing.title).toBeDefined();
        expect(item.status).toBeDefined();
        expect(item.submittedAt).toBeDefined();
      }
    });

    it('returns placement activity summary with opportunity types and pipeline counts', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { activitySummary } = res.body.data;

      expect(activitySummary.totalListings).toBe(5);
      expect(activitySummary.publishedListings).toBe(3);
      expect(activitySummary.draftListings).toBe(1);
      expect(activitySummary.closedListings).toBe(1);

      expect(activitySummary.opportunitiesByType.internship).toBe(2);
      expect(activitySummary.opportunitiesByType.full_time).toBe(2);
      expect(activitySummary.opportunitiesByType.internship_and_full_time).toBe(1);

      expect(activitySummary.pipelineStages.inReview).toBe(2); // 1 submitted + 1 under_review
      expect(activitySummary.pipelineStages.interviewing).toBe(2); // 1 shortlisted + 1 interview_scheduled
      expect(activitySummary.pipelineStages.selected).toBe(3);
    });
  });

  describe('Empty Datasets & Zero-Division Edge Cases', () => {
    beforeEach(() => {
      mockUsers.clear();
      mockListings.clear();
      mockApplications.clear();

      // Keep only admin user
      mockUsers.set(adminId, {
        _id: adminId,
        id: adminId,
        name: 'TPO Administrator',
        email: 'admin@campasync.edu',
        passwordHash: 'hash',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('safely handles zero students, zero listings, and zero applications without NaN', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { kpis, statusDistribution, companyApplications, recentApplications } = res.body.data;

      expect(kpis.totalStudents).toBe(0);
      expect(kpis.activeOpportunities).toBe(0);
      expect(kpis.totalApplications).toBe(0);
      expect(kpis.selectedStudents).toBe(0);
      expect(kpis.totalOffers).toBe(0);
      expect(kpis.placementRate).toBe(0);
      expect(kpis.selectionRate).toBe(0);

      // Verify no NaN values in JSON
      expect(Number.isNaN(kpis.placementRate)).toBe(false);
      expect(Number.isNaN(kpis.selectionRate)).toBe(false);

      // Status distribution still returns 7 items with 0 counts
      expect(statusDistribution).toHaveLength(APPLICATION_STATUSES.length);
      for (const item of statusDistribution) {
        expect(item.count).toBe(0);
        expect(item.percentage).toBe(0);
      }

      // Empty arrays
      expect(companyApplications).toEqual([]);
      expect(recentApplications).toEqual([]);
    });

    it('handles scenario where students exist but no applications have been submitted', async () => {
      mockUsers.set('student_lone', {
        _id: 'student_lone',
        id: 'student_lone',
        name: 'Solo Student',
        email: 'solo@campasync.edu',
        passwordHash: 'hash',
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/analytics/kpis')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalStudents).toBe(1);
      expect(res.body.data.totalApplications).toBe(0);
      expect(res.body.data.selectedStudents).toBe(0);
      expect(res.body.data.placementRate).toBe(0);
      expect(res.body.data.selectionRate).toBe(0);
    });
  });
});
