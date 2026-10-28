import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { env } from '../config/env';

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

interface MockProfileRecord {
  _id: string;
  id: string;
  userId: string;
  phone: string;
  avatarUrl: string;
  institution: string;
  department: string;
  degree: string;
  graduationYear: number | null;
  cgpa: number | null;
  rollNumber: string;
  skills: string[];
  bio: string;
  linkedInUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  resumeStatus: string;
  resumeUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockListingRecord {
  _id: string;
  id: string;
  companyName: string;
  title: string;
  description: string;
  opportunityType: 'internship' | 'full_time' | 'internship_and_full_time';
  location: string;
  workArrangement: 'on_site' | 'remote' | 'hybrid';
  compensation: string;
  employmentType: 'full_time' | 'internship' | 'contract';
  skillsRequired: string[];
  responsibilities: string[];
  eligibility: {
    minCgpa: number;
    eligibleDepartments: string[];
    eligibleGraduationYears: number[];
    additionalCriteria?: string;
  };
  applicationOpenDate: Date;
  applicationDeadline: Date;
  status: 'draft' | 'published' | 'closed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const mockUsers = new Map<string, MockUserRecord>();
const mockProfiles = new Map<string, MockProfileRecord>();
const mockListings = new Map<string, MockListingRecord>();

jest.mock('../models/user.model', () => {
  return {
    User: {
      findById: jest.fn(async (id: string) => {
        const user = mockUsers.get(id);
        return user ? createMockUserDoc(user) : null;
      }),
    },
  };
});

jest.mock('../models/profile.model', () => {
  return {
    StudentProfile: {
      findOne: jest.fn(async (query: { userId?: string }) => {
        if (query.userId) {
          const profile = Array.from(mockProfiles.values()).find(
            (p) => p.userId === query.userId
          );
          return profile ? createMockProfileDoc(profile) : null;
        }
        return null;
      }),
    },
  };
});

let listingSeq = 1000;

jest.mock('../models/listing.model', () => {
  return {
    Listing: {
      create: jest.fn(async (data: Partial<MockListingRecord>) => {
        const seq = (listingSeq++).toString(16).padStart(4, '0');
        const id = `507f1f77bcf86cd79943${seq}`;
        const record: MockListingRecord = {
          _id: id,
          id,
          companyName: data.companyName || '',
          title: data.title || '',
          description: data.description || '',
          opportunityType: data.opportunityType || 'full_time',
          location: data.location || '',
          workArrangement: data.workArrangement || 'on_site',
          compensation: data.compensation || '',
          employmentType: data.employmentType || 'full_time',
          skillsRequired: data.skillsRequired || [],
          responsibilities: data.responsibilities || [],
          eligibility: {
            minCgpa: data.eligibility?.minCgpa ?? 0,
            eligibleDepartments: data.eligibility?.eligibleDepartments ?? [],
            eligibleGraduationYears: data.eligibility?.eligibleGraduationYears ?? [],
            additionalCriteria: data.eligibility?.additionalCriteria ?? '',
          },
          applicationOpenDate: data.applicationOpenDate || new Date(),
          applicationDeadline: data.applicationDeadline || new Date(Date.now() + 864000000),
          status: data.status || 'draft',
          createdBy: data.createdBy?.toString() || 'admin_user_id',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockListings.set(id, record);
        return createMockListingDoc(record);
      }),
      findById: jest.fn(async (id: string) => {
        const record = mockListings.get(id);
        return record ? createMockListingDoc(record) : null;
      }),
      findByIdAndUpdate: jest.fn(
        async (
          id: string,
          update: { $set?: Partial<MockListingRecord> },
          _options?: Record<string, unknown>
        ) => {
          const record = mockListings.get(id);
          if (!record) return null;
          if (update.$set) {
            Object.assign(record, update.$set, { updatedAt: new Date() });
          }
          return createMockListingDoc(record);
        }
      ),
      findByIdAndDelete: jest.fn(async (id: string) => {
        const record = mockListings.get(id);
        if (record) {
          mockListings.delete(id);
          return createMockListingDoc(record);
        }
        return null;
      }),
      countDocuments: jest.fn(async (filter: Record<string, unknown>) => {
        return filterListingsInMemory(filter).length;
      }),
      find: jest.fn((filter: Record<string, unknown>) => {
        const matches = filterListingsInMemory(filter);
        return {
          sort: jest.fn().mockReturnThis(),
          skip: jest.fn((skipCount: number) => ({
            limit: jest.fn((limitCount: number) => {
              const sliced = matches.slice(skipCount, skipCount + limitCount);
              return Promise.resolve(sliced.map((item) => createMockListingDoc(item)));
            }),
          })),
        };
      }),
    },
  };
});

function filterListingsInMemory(filter: Record<string, unknown>): MockListingRecord[] {
  let list = Array.from(mockListings.values());

  if (filter.status) {
    list = list.filter((l) => l.status === filter.status);
  }

  if (filter.$or && Array.isArray(filter.$or)) {
    list = list.filter((l) => {
      return (filter.$or as Array<{ companyName?: { $regex: RegExp }; title?: { $regex: RegExp } }>).some(
        (clause) => {
          if (clause.companyName?.$regex && clause.companyName.$regex.test(l.companyName)) {
            return true;
          }
          if (clause.title?.$regex && clause.title.$regex.test(l.title)) {
            return true;
          }
          return false;
        }
      );
    });
  }

  if (filter.opportunityType) {
    list = list.filter((l) => l.opportunityType === filter.opportunityType);
  }

  if (filter.workArrangement) {
    list = list.filter((l) => l.workArrangement === filter.workArrangement);
  }

  return list;
}

function createMockUserDoc(data: MockUserRecord): Record<string, unknown> {
  return {
    ...data,
  };
}

function createMockProfileDoc(data: MockProfileRecord): Record<string, unknown> {
  return {
    ...data,
  };
}

function createMockListingDoc(record: MockListingRecord): Record<string, unknown> {
  const doc = {
    ...record,
    toJSON(this: MockListingRecord) {
      return {
        _id: this._id,
        id: this.id,
        companyName: this.companyName,
        title: this.title,
        description: this.description,
        opportunityType: this.opportunityType,
        location: this.location,
        workArrangement: this.workArrangement,
        compensation: this.compensation,
        employmentType: this.employmentType,
        skillsRequired: this.skillsRequired,
        responsibilities: this.responsibilities,
        eligibility: this.eligibility,
        applicationOpenDate: this.applicationOpenDate,
        applicationDeadline: this.applicationDeadline,
        status: this.status,
        createdBy: this.createdBy,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
    save: jest.fn(async function (this: { toJSON: () => MockListingRecord }) {
      const updated = this.toJSON();
      mockListings.set(record._id, updated);
      return this;
    }),
  };
  return doc;
}

describe('Placement & Internship Listings API (/api/listings)', () => {
  let studentToken: string;
  let adminToken: string;
  const adminId = '507f1f77bcf86cd799439011';
  const studentId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    mockUsers.clear();
    mockProfiles.clear();
    mockListings.clear();

    mockUsers.set(adminId, {
      _id: adminId,
      id: adminId,
      name: 'TPO Officer',
      email: 'tpo@college.edu',
      passwordHash: 'hash',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUsers.set(studentId, {
      _id: studentId,
      id: studentId,
      name: 'Jordan Lee',
      email: 'jordan@college.edu',
      passwordHash: 'hash',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockProfiles.set('profile_student_1', {
      _id: 'profile_student_1',
      id: 'profile_student_1',
      userId: studentId,
      phone: '9876543210',
      avatarUrl: '',
      institution: 'Tech Institute',
      department: 'Computer Science',
      degree: 'B.Tech',
      graduationYear: 2026,
      cgpa: 8.5,
      rollNumber: 'CS202201',
      skills: ['React', 'Node.js'],
      bio: 'Enthusiastic CS student',
      linkedInUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      resumeStatus: 'not_uploaded',
      resumeUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    adminToken = jwt.sign(
      { userId: adminId, email: 'tpo@college.edu', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { userId: studentId, email: 'jordan@college.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/listings (Admin Only)', () => {
    const validListingPayload = {
      companyName: 'Acme Technologies',
      title: 'Full Stack Software Engineer Intern',
      description: 'Join our cloud infrastructure and web development team for a 6-month internship.',
      opportunityType: 'internship',
      location: 'Bangalore, India',
      workArrangement: 'hybrid',
      compensation: '₹40,000 / month',
      employmentType: 'internship',
      skillsRequired: ['React', 'TypeScript', 'Node.js'],
      responsibilities: ['Build APIs', 'Design UI components'],
      eligibility: {
        minCgpa: 7.5,
        eligibleDepartments: ['Computer Science', 'Information Technology'],
        eligibleGraduationYears: [2026],
        additionalCriteria: 'No active backlogs allowed',
      },
      applicationDeadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'draft',
    };

    it('allows an administrator to create a new opportunity listing', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validListingPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listing.companyName).toBe('Acme Technologies');
      expect(res.body.data.listing.status).toBe('draft');
      expect(res.body.data.listing.eligibility.minCgpa).toBe(7.5);
    });

    it('forbids students from creating opportunity listings with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validListingPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/listings').send(validListingPayload);

      expect(res.status).toBe(401);
    });

    it('rejects listings with application deadlines in the past', async () => {
      const pastDeadlinePayload = {
        ...validListingPayload,
        applicationDeadline: new Date(Date.now() - 86400000).toISOString(),
      };

      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pastDeadlinePayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toHaveProperty('applicationDeadline');
    });

    it('rejects listings with invalid CGPA or missing required fields', async () => {
      const invalidPayload = {
        ...validListingPayload,
        companyName: '', // empty
        eligibility: {
          minCgpa: 15.0, // exceeds 10
        },
      };

      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/listings (Browsing & Visibility)', () => {
    beforeEach(async () => {
      // Seed a draft listing
      await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Draft Co',
          title: 'Draft Role',
          description: 'A draft listing not yet open to students.',
          opportunityType: 'full_time',
          location: 'Delhi',
          workArrangement: 'on_site',
          compensation: '10 LPA',
          employmentType: 'full_time',
          skillsRequired: ['Python'],
          eligibility: { minCgpa: 6.0, eligibleDepartments: [], eligibleGraduationYears: [] },
          applicationDeadline: new Date(Date.now() + 864000000).toISOString(),
          status: 'draft',
        });

      // Seed a published listing
      await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Google',
          title: 'Associate Product Manager',
          description: 'Prestigious APM program for graduating engineering seniors.',
          opportunityType: 'full_time',
          location: 'Hyderabad',
          workArrangement: 'hybrid',
          compensation: '25 LPA',
          employmentType: 'full_time',
          skillsRequired: ['Product Sense', 'Analytics'],
          eligibility: {
            minCgpa: 8.0,
            eligibleDepartments: ['Computer Science'],
            eligibleGraduationYears: [2026],
          },
          applicationDeadline: new Date(Date.now() + 864000000).toISOString(),
          status: 'published',
        });
    });

    it('allows students to browse only published listings, hiding drafts', async () => {
      const res = await request(app)
        .get('/api/listings')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listings.length).toBe(1);
      expect(res.body.data.listings[0].companyName).toBe('Google');
      expect(res.body.data.listings[0].status).toBe('published');
    });

    it('allows admins to view all listings including drafts', async () => {
      const res = await request(app)
        .get('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listings.length).toBe(2);
    });

    it('filters listings by search query (company or title)', async () => {
      const res = await request(app)
        .get('/api/listings?search=Google')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.listings.length).toBe(1);
      expect(res.body.data.listings[0].companyName).toBe('Google');
    });
  });

  describe('GET /api/listings/:id & Eligibility Calculation', () => {
    let publishedListingId: string;
    let draftListingId: string;

    beforeEach(async () => {
      const resPub = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Meta',
          title: 'Software Engineer',
          description: 'Systems and frontend infrastructure role.',
          opportunityType: 'full_time',
          location: 'Remote',
          workArrangement: 'remote',
          compensation: '30 LPA',
          employmentType: 'full_time',
          skillsRequired: ['C++', 'React'],
          eligibility: {
            minCgpa: 8.0,
            eligibleDepartments: ['Computer Science'],
            eligibleGraduationYears: [2026],
          },
          applicationDeadline: new Date(Date.now() + 864000000).toISOString(),
          status: 'published',
        });

      publishedListingId = resPub.body.data.listing.id || resPub.body.data.listing._id;

      const resDraft = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Secret Startup',
          title: 'Founding Engineer',
          description: 'Unpublished draft opportunity.',
          opportunityType: 'full_time',
          location: 'Bangalore',
          workArrangement: 'on_site',
          compensation: '15 LPA',
          employmentType: 'full_time',
          skillsRequired: ['Node.js'],
          eligibility: { minCgpa: 0, eligibleDepartments: [], eligibleGraduationYears: [] },
          applicationDeadline: new Date(Date.now() + 864000000).toISOString(),
          status: 'draft',
        });

      draftListingId = resDraft.body.data.listing.id || resDraft.body.data.listing._id;
    });

    it('returns 404 when a student attempts to view a draft listing', async () => {
      const res = await request(app)
        .get(`/api/listings/${draftListingId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });

    it('returns listing details and calculates eligible status for qualifying student', async () => {
      const res = await request(app)
        .get(`/api/listings/${publishedListingId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listing.companyName).toBe('Meta');
      expect(res.body.data.eligibility).toBeDefined();
      expect(res.body.data.eligibility.isEligible).toBe(true);
      expect(res.body.data.eligibility.status).toBe('eligible');
      expect(res.body.data.eligibility.criteria.length).toBeGreaterThan(0);
    });

    it('identifies ineligibility when student CGPA does not meet cutoff', async () => {
      // Set student CGPA to 7.0 (below 8.0 cutoff)
      mockProfiles.set('profile_student_1', {
        ...mockProfiles.get('profile_student_1')!,
        cgpa: 7.0,
      });

      const res = await request(app)
        .get(`/api/listings/${publishedListingId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.eligibility.isEligible).toBe(false);
      expect(res.body.data.eligibility.status).toBe('ineligible');
      const cgpaCriterion = res.body.data.eligibility.criteria.find(
        (c: { criterion: string }) => c.criterion.includes('CGPA')
      );
      expect(cgpaCriterion.met).toBe(false);
    });

    it('returns incomplete_profile when academic parameters are missing', async () => {
      // Clear department and graduation year
      mockProfiles.set('profile_student_1', {
        ...mockProfiles.get('profile_student_1')!,
        department: '',
        graduationYear: null,
      });

      const res = await request(app)
        .get(`/api/listings/${publishedListingId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.eligibility.status).toBe('incomplete_profile');
      expect(res.body.data.eligibility.missingProfileFields).toContain('Department / Branch');
      expect(res.body.data.eligibility.missingProfileFields).toContain('Graduation Year');
    });
  });

  describe('PUT / PATCH / DELETE /api/listings/:id', () => {
    let listingId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Original Co',
          title: 'Software Developer',
          description: 'Initial opportunity description.',
          opportunityType: 'full_time',
          location: 'Pune',
          workArrangement: 'on_site',
          compensation: '8 LPA',
          employmentType: 'full_time',
          skillsRequired: ['Java'],
          eligibility: { minCgpa: 6.5, eligibleDepartments: [], eligibleGraduationYears: [] },
          applicationDeadline: new Date(Date.now() + 864000000).toISOString(),
          status: 'draft',
        });

      listingId = res.body.data.listing.id || res.body.data.listing._id;
    });

    it('allows admin to update listing details', async () => {
      const res = await request(app)
        .put(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Updated Co',
          compensation: '12 LPA',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.listing.companyName).toBe('Updated Co');
      expect(res.body.data.listing.compensation).toBe('12 LPA');
    });

    it('allows admin to transition listing status from draft to published', async () => {
      const res = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.data.listing.status).toBe('published');
    });

    it('allows admin to delete listing', async () => {
      const res = await request(app)
        .delete(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(listingId);
    });

    it('forbids students from updating, transitioning status, or deleting listings', async () => {
      const resPut = await request(app)
        .put(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ companyName: 'Hacked Co' });
      expect(resPut.status).toBe(403);

      const resPatch = await request(app)
        .patch(`/api/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'published' });
      expect(resPatch.status).toBe(403);

      const resDelete = await request(app)
        .delete(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(resDelete.status).toBe(403);
    });
  });
});
