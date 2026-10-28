import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { env } from '../config/env';
import {
  ApplicationStatus,
  WITHDRAWABLE_STATUSES,
} from '../models/application.model';

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
  opportunityType: string;
  location: string;
  workArrangement: string;
  compensation: string;
  employmentType: string;
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
const mockProfiles = new Map<string, MockProfileRecord>();
const mockListings = new Map<string, MockListingRecord>();
const mockApplications = new Map<string, MockApplicationRecord>();
const mockNotifications = new Map<string, Record<string, unknown>>();

jest.mock('../models/notification.model', () => ({
  Notification: {
    create: jest.fn(async (data: Record<string, unknown>) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const record = {
        _id: id,
        id,
        recipient: data.recipient?.toString() || '',
        title: data.title || '',
        message: data.message || '',
        type: data.type || 'application_status',
        application: data.application?.toString(),
        listing: data.listing?.toString(),
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockNotifications.set(id, record);
      return { ...record, toJSON: () => ({ ...record }) };
    }),
  },
}));

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
      find: jest.fn(async (query: { userId?: { $in: string[] } }) => {
        if (query.userId?.$in) {
          const list = Array.from(mockProfiles.values()).filter((p) =>
            query.userId?.$in.includes(p.userId)
          );
          return list.map(createMockProfileDoc);
        }
        return Array.from(mockProfiles.values()).map(createMockProfileDoc);
      }),
    },
  };
});

jest.mock('../models/listing.model', () => {
  return {
    Listing: {
      findById: jest.fn(async (id: string) => {
        const record = mockListings.get(id);
        return record ? createMockListingDoc(record) : null;
      }),
    },
  };
});

jest.mock('../models/resume.model', () => ({
  Resume: {
    find: jest.fn(() => ({
      select: jest.fn(async () => []),
    })),
    findOne: jest.fn(() => ({
      select: jest.fn(async () => null),
    })),
  },
}));

let appSeq = 1000;

jest.mock('../models/application.model', () => {
  const actual = jest.requireActual('../models/application.model');
  return {
    ...actual,
    Application: {
      create: jest.fn(async (data: {
        student: string;
        listing: string;
        coverLetter?: string;
        status?: ApplicationStatus;
        submittedAt?: Date;
      }) => {
        // Enforce compound uniqueness simulation
        const existing = Array.from(mockApplications.values()).find(
          (a) => a.student === data.student && a.listing === data.listing
        );
        if (existing) {
          const mongoErr = new Error('E11000 duplicate key error') as Error & {
            code: number;
            keyValue: Record<string, string>;
          };
          mongoErr.code = 11000;
          mongoErr.keyValue = { student: data.student, listing: data.listing };
          throw mongoErr;
        }

        const seq = (appSeq++).toString(16).padStart(4, '0');
        const id = `607f1f77bcf86cd79943${seq}`;
        const record: MockApplicationRecord = {
          _id: id,
          id,
          student: data.student,
          listing: data.listing,
          status: data.status || 'submitted',
          coverLetter: data.coverLetter || '',
          submittedAt: data.submittedAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockApplications.set(id, record);
        return createMockApplicationDoc(record, false);
      }),

      findOne: jest.fn((query: { _id?: string; student?: string; listing?: string }) => {
        let isPopulated = false;
        const execute = async () => {
          const record = Array.from(mockApplications.values()).find((a) => {
            if (query._id && a._id !== query._id && a.id !== query._id) return false;
            if (query.student && a.student !== query.student) return false;
            if (query.listing && a.listing !== query.listing) return false;
            return true;
          });
          return record ? createMockApplicationDoc(record, isPopulated) : null;
        };

        const queryObj: Record<string, unknown> = {
          populate: jest.fn().mockImplementation(() => {
            isPopulated = true;
            return queryObj;
          }),
          then: (resolve: (val: unknown) => void, reject: (err: unknown) => void) =>
            execute().then(resolve, reject),
        };
        return queryObj;
      }),

      findById: jest.fn((id: string) => {
        let isPopulated = false;
        const execute = async () => {
          const record = mockApplications.get(id);
          return record ? createMockApplicationDoc(record, isPopulated) : null;
        };

        const queryObj: Record<string, unknown> = {
          populate: jest.fn().mockImplementation(() => {
            isPopulated = true;
            return queryObj;
          }),
          then: (resolve: (val: unknown) => void, reject: (err: unknown) => void) =>
            execute().then(resolve, reject),
        };
        return queryObj;
      }),

      find: jest.fn((query: { student?: string; listing?: string; status?: string }) => {
        let isPopulated = false;
        const results = Array.from(mockApplications.values()).filter((a) => {
          if (query.student && a.student !== query.student) return false;
          if (query.listing && a.listing !== query.listing) return false;
          if (query.status && a.status !== query.status) return false;
          return true;
        });

        let skipCount = 0;
        let limitCount = results.length;

        const chainObj: Record<string, unknown> = {
          populate: jest.fn().mockImplementation(() => {
            isPopulated = true;
            return chainObj;
          }),
          sort: jest.fn().mockImplementation(() => chainObj),
          skip: jest.fn().mockImplementation((n: number) => {
            skipCount = n;
            return chainObj;
          }),
          limit: jest.fn().mockImplementation((n: number) => {
            limitCount = n;
            return chainObj;
          }),
          then: (resolve: (val: unknown) => void, reject: (err: unknown) => void) => {
            const paged = results.slice(skipCount, skipCount + limitCount);
            Promise.resolve(paged.map((r) => createMockApplicationDoc(r, isPopulated))).then(
              resolve,
              reject
            );
          },
        };
        return chainObj;
      }),

      countDocuments: jest.fn(async (query: { listing?: string; status?: string }) => {
        return Array.from(mockApplications.values()).filter((a) => {
          if (query.listing && a.listing !== query.listing) return false;
          if (query.status && a.status !== query.status) return false;
          return true;
        }).length;
      }),
    },
  };
});

function createMockUserDoc(data: MockUserRecord) {
  return {
    ...data,
    _id: data._id,
    id: data._id,
    toSafeObject: () => ({
      id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
    }),
  };
}

function createMockProfileDoc(data: MockProfileRecord) {
  return {
    ...data,
  };
}

function createMockListingDoc(data: MockListingRecord) {
  return {
    ...data,
    _id: data._id,
    id: data._id,
    isExpired: () => new Date() > new Date(data.applicationDeadline),
    isOpen: () =>
      data.status === 'published' &&
      new Date() <= new Date(data.applicationDeadline) &&
      new Date() >= new Date(data.applicationOpenDate),
    toJSON: function (this: { _id?: string; id?: string }) {
      return { ...data, id: data._id };
    },
  };
}

function createMockApplicationDoc(data: MockApplicationRecord, populated = false) {
  const listingRecord = mockListings.get(data.listing);
  const studentRecord = mockUsers.get(data.student);

  return {
    ...data,
    _id: data._id,
    id: data._id,
    student: populated && studentRecord
      ? { _id: studentRecord._id, id: studentRecord._id, name: studentRecord.name, email: studentRecord.email, role: studentRecord.role }
      : data.student,
    listing: populated && listingRecord
      ? { ...listingRecord }
      : data.listing,
    canWithdraw: () => WITHDRAWABLE_STATUSES.includes(data.status),
    save: jest.fn(async function (this: MockApplicationRecord) {
      mockApplications.set(data._id, {
        ...data,
        status: this.status,
        updatedAt: new Date(),
      });
      return this;
    }),
    toJSON: function (this: MockApplicationRecord) {
      return {
        id: data._id,
        student: populated && studentRecord
          ? { id: studentRecord._id, name: studentRecord.name, email: studentRecord.email, role: studentRecord.role }
          : data.student,
        listing: populated && listingRecord
          ? {
              id: listingRecord._id,
              companyName: listingRecord.companyName,
              title: listingRecord.title,
              opportunityType: listingRecord.opportunityType,
              location: listingRecord.location,
              workArrangement: listingRecord.workArrangement,
              compensation: listingRecord.compensation,
              status: listingRecord.status,
              applicationDeadline: listingRecord.applicationDeadline,
            }
          : data.listing,
        status: this.status || data.status,
        coverLetter: data.coverLetter,
        submittedAt: data.submittedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    },
  };
}

describe('Student Applications & Application Tracking API (/api/applications)', () => {
  let student1Token: string;
  let student1Id: string;
  let student2Token: string;
  let student2Id: string;
  let adminToken: string;
  let adminId: string;

  let publishedListingId: string;
  let closedListingId: string;
  let expiredListingId: string;
  let draftListingId: string;

  beforeEach(() => {
    mockUsers.clear();
    mockProfiles.clear();
    mockListings.clear();
    mockApplications.clear();
    mockNotifications.clear();
    jest.clearAllMocks();

    student1Id = '507f1f77bcf86cd799439001';
    student2Id = '507f1f77bcf86cd799439002';
    adminId = '507f1f77bcf86cd799439003';

    // Users
    mockUsers.set(student1Id, {
      _id: student1Id,
      id: student1Id,
      name: 'Alice Student',
      email: 'alice@college.edu',
      passwordHash: 'secret_hash_1',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUsers.set(student2Id, {
      _id: student2Id,
      id: student2Id,
      name: 'Bob Learner',
      email: 'bob@college.edu',
      passwordHash: 'secret_hash_2',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUsers.set(adminId, {
      _id: adminId,
      id: adminId,
      name: 'TPO Admin',
      email: 'tpo@college.edu',
      passwordHash: 'secret_hash_3',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Student 1 Profile: Eligible for CSE / 2026 / 8.5 CGPA
    mockProfiles.set('profile_student_1', {
      _id: 'profile_student_1',
      id: 'profile_student_1',
      userId: student1Id,
      phone: '+91 9876543210',
      avatarUrl: '',
      institution: 'College of Engineering',
      department: 'Computer Science and Engineering (CSE)',
      degree: 'B.Tech',
      graduationYear: 2026,
      cgpa: 8.5,
      rollNumber: 'CS2022_01',
      skills: ['React', 'Node.js', 'TypeScript'],
      bio: 'Full-stack software student',
      linkedInUrl: 'https://linkedin.com/in/alice',
      githubUrl: 'https://github.com/alice',
      portfolioUrl: '',
      resumeStatus: 'not_uploaded',
      resumeUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Student 2 Profile: Ineligible (Low CGPA 6.0, Mechanical Engineering)
    mockProfiles.set('profile_student_2', {
      _id: 'profile_student_2',
      id: 'profile_student_2',
      userId: student2Id,
      phone: '+91 9123456789',
      avatarUrl: '',
      institution: 'College of Engineering',
      department: 'Mechanical Engineering',
      degree: 'B.Tech',
      graduationYear: 2025,
      cgpa: 6.0,
      rollNumber: 'ME2021_05',
      skills: ['AutoCAD'],
      bio: 'Mechanical engineering enthusiast',
      linkedInUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      resumeStatus: 'not_uploaded',
      resumeUrl: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Published Listing (Requires CSE, CGPA 7.5, Batch 2026)
    publishedListingId = '507f1f77bcf86cd79943a001';
    mockListings.set(publishedListingId, {
      _id: publishedListingId,
      id: publishedListingId,
      companyName: 'Google',
      title: 'Associate Software Engineer',
      description: 'Campus hiring for graduate software engineers.',
      opportunityType: 'full_time',
      location: 'Bangalore',
      workArrangement: 'hybrid',
      compensation: '25 LPA',
      employmentType: 'full_time',
      skillsRequired: ['Data Structures', 'TypeScript'],
      responsibilities: ['Build distributed services'],
      eligibility: {
        minCgpa: 7.5,
        eligibleDepartments: ['Computer Science and Engineering (CSE)'],
        eligibleGraduationYears: [2026],
      },
      applicationOpenDate: new Date(Date.now() - 86400000),
      applicationDeadline: new Date(Date.now() + 864000000), // 10 days in future
      status: 'published',
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Closed Listing
    closedListingId = '507f1f77bcf86cd79943a002';
    mockListings.set(closedListingId, {
      _id: closedListingId,
      id: closedListingId,
      companyName: 'Closed Corp',
      title: 'Backend Engineer',
      description: 'Closed opportunity.',
      opportunityType: 'full_time',
      location: 'Hyderabad',
      workArrangement: 'on_site',
      compensation: '12 LPA',
      employmentType: 'full_time',
      skillsRequired: ['Java'],
      responsibilities: [],
      eligibility: { minCgpa: 6.0, eligibleDepartments: [], eligibleGraduationYears: [] },
      applicationOpenDate: new Date(Date.now() - 864000000),
      applicationDeadline: new Date(Date.now() + 864000000),
      status: 'closed',
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Expired Listing
    expiredListingId = '507f1f77bcf86cd79943a003';
    mockListings.set(expiredListingId, {
      _id: expiredListingId,
      id: expiredListingId,
      companyName: 'Expired Inc',
      title: 'Intern',
      description: 'Expired deadline.',
      opportunityType: 'internship',
      location: 'Remote',
      workArrangement: 'remote',
      compensation: '50k/month',
      employmentType: 'internship',
      skillsRequired: ['Python'],
      responsibilities: [],
      eligibility: { minCgpa: 6.0, eligibleDepartments: [], eligibleGraduationYears: [] },
      applicationOpenDate: new Date(Date.now() - 864000000 * 2),
      applicationDeadline: new Date(Date.now() - 86400000), // yesterday
      status: 'published',
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Draft Listing
    draftListingId = '507f1f77bcf86cd79943a004';
    mockListings.set(draftListingId, {
      _id: draftListingId,
      id: draftListingId,
      companyName: 'Secret Draft',
      title: 'Stealth Engineer',
      description: 'Draft listing.',
      opportunityType: 'full_time',
      location: 'Pune',
      workArrangement: 'on_site',
      compensation: '20 LPA',
      employmentType: 'full_time',
      skillsRequired: ['Go'],
      responsibilities: [],
      eligibility: { minCgpa: 6.0, eligibleDepartments: [], eligibleGraduationYears: [] },
      applicationOpenDate: new Date(),
      applicationDeadline: new Date(Date.now() + 864000000),
      status: 'draft',
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    student1Token = jwt.sign(
      { userId: student1Id, email: 'alice@college.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    student2Token = jwt.sign(
      { userId: student2Id, email: 'bob@college.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminId, email: 'tpo@college.edu', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/applications (Student Submission)', () => {
    it('successfully submits an application with an optional statement for an eligible student', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          listingId: publishedListingId,
          coverLetter: 'I have built scalable React & Node.js web applications and am very enthusiastic about Google.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application).toMatchObject({
        student: student1Id,
        listing: publishedListingId,
        status: 'submitted',
        coverLetter: 'I have built scalable React & Node.js web applications and am very enthusiastic about Google.',
      });
      expect(res.body.data.application).toHaveProperty('id');
      expect(res.body.data.application).toHaveProperty('submittedAt');
    });

    it('rejects unauthenticated application submissions with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/applications')
        .send({ listingId: publishedListingId });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('forbids administrators from submitting student applications with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ listingId: publishedListingId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('student');
    });

    it('returns 404 when applying to a non-existent listing ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: nonExistentId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('rejects submissions for draft listings with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: draftListingId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not currently open');
    });

    it('rejects submissions for closed listings with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: closedListingId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not currently open');
    });

    it('rejects submissions after deadline has passed with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: expiredListingId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('deadline');
    });

    it('rejects submissions when student does not satisfy eligibility cutoffs (CGPA & Dept)', async () => {
      // Student 2 has CGPA 6.0 (cutoff is 7.5) and Mechanical Dept (cutoff is CSE)
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ listingId: publishedListingId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('eligibility criteria');
      expect(res.body.details).toHaveProperty('eligibility');
      expect(res.body.details.eligibility.isEligible).toBe(false);
    });

    it('rejects submissions when student profile is missing required academic parameters', async () => {
      // Clear Student 1 academic profile parameters
      mockProfiles.set('profile_student_1', {
        ...mockProfiles.get('profile_student_1')!,
        cgpa: null,
        graduationYear: null,
      });

      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: publishedListingId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.eligibility.status).toBe('incomplete_profile');
    });

    it('rejects duplicate application submissions with 409 Conflict', async () => {
      // First submission succeeds
      const res1 = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: publishedListingId });
      expect(res1.status).toBe(201);

      // Second submission for same listing fails
      const res2 = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: publishedListingId });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toContain('already submitted an application');
    });

    it('safely ignores and strips malicious client attempts to forge studentId or status', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          listingId: publishedListingId,
          student: student2Id, // Attempting to forge another student's ID
          status: 'selected', // Attempting to self-select
        });

      expect(res.status).toBe(201);
      expect(res.body.data.application.student).toBe(student1Id); // Bound strictly to token
      expect(res.body.data.application.status).toBe('submitted'); // Enforces initial lifecycle stage
    });
  });

  describe('GET /api/applications/me (Student Applications List)', () => {
    beforeEach(async () => {
      // Create an application for student 1
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: publishedListingId });
    });

    it('returns the authenticated student applications with populated listing details', async () => {
      const res = await request(app)
        .get('/api/applications/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.applications[0].listing.companyName).toBe('Google');
      expect(res.body.data.applications[0].status).toBe('submitted');
    });

    it('maintains strict isolation so student 2 sees empty list', async () => {
      const res = await request(app)
        .get('/api/applications/me')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(0);
      expect(res.body.data.applications).toHaveLength(0);
    });

    it('returns 401 when request is unauthenticated', async () => {
      const res = await request(app).get('/api/applications/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/applications/me/:id (Student Application Detail)', () => {
    let student1AppId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: publishedListingId });
      student1AppId = res.body.data.application.id;
    });

    it('allows student to fetch their own application details', async () => {
      const res = await request(app)
        .get(`/api/applications/me/${student1AppId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.id).toBe(student1AppId);
      expect(res.body.data.application.listing.companyName).toBe('Google');
    });

    it('returns 404 when student 2 attempts to access student 1 application', async () => {
      const res = await request(app)
        .get(`/api/applications/me/${student1AppId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('PATCH /api/applications/:id/withdraw (Student Withdrawal)', () => {
    let applicationId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ listingId: publishedListingId });
      applicationId = res.body.data.application.id;
    });

    it('allows student to withdraw an application in submitted status', async () => {
      const res = await request(app)
        .patch(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.status).toBe('withdrawn');
    });

    it('rejects duplicate withdrawal when already withdrawn', async () => {
      // First withdrawal
      await request(app)
        .patch(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Second withdrawal attempt
      const res = await request(app)
        .patch(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already been withdrawn');
    });

    it('rejects withdrawal once application has advanced past eligible stages (e.g. shortlisted)', async () => {
      // Advance status to shortlisted
      const appRecord = mockApplications.get(applicationId)!;
      appRecord.status = 'shortlisted';

      const res = await request(app)
        .patch(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot withdraw');
    });

    it('forbids student 2 from withdrawing student 1 application', async () => {
      const res = await request(app)
        .patch(`/api/applications/${applicationId}/withdraw`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Admin Applicant Management Endpoints', () => {
    let student1AppId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          listingId: publishedListingId,
          coverLetter: 'Alice recommendation letter.',
        });
      student1AppId = res.body.data.application.id;
    });

    describe('GET /api/listings/:listingId/applications', () => {
      it('allows admin to list applicants with student profiles and sensitive fields excluded', async () => {
        const res = await request(app)
          .get(`/api/listings/${publishedListingId}/applications`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.applications).toHaveLength(1);

        const applicant = res.body.data.applications[0];
        expect(applicant.student.name).toBe('Alice Student');
        expect(applicant.student.email).toBe('alice@college.edu');
        // Verify passwordHash is never exposed
        expect(applicant.student).not.toHaveProperty('passwordHash');

        // Verify student profile details
        expect(applicant.studentProfile).toMatchObject({
          rollNumber: 'CS2022_01',
          cgpa: 8.5,
          department: 'Computer Science and Engineering (CSE)',
        });
      });

      it('filters applicants by status tab', async () => {
        // Query for 'selected' status (which is empty)
        const res = await request(app)
          .get(`/api/listings/${publishedListingId}/applications?status=selected`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.applications).toHaveLength(0);
      });

      it('forbids students from listing all applicants with 403 Forbidden', async () => {
        const res = await request(app)
          .get(`/api/listings/${publishedListingId}/applications`)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/applications/:id', () => {
      it('allows admin to inspect full application and profile details', async () => {
        const res = await request(app)
          .get(`/api/applications/${student1AppId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.application.student.name).toBe('Alice Student');
        expect(res.body.data.application.student).not.toHaveProperty('passwordHash');
        expect(res.body.data.application.studentProfile.rollNumber).toBe('CS2022_01');
      });

      it('forbids students from using admin application detail route', async () => {
        const res = await request(app)
          .get(`/api/applications/${student1AppId}`)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /api/applications/:id/status', () => {
      it('allows admin to update status according to valid transitions (submitted -> under_review -> shortlisted -> selected)', async () => {
        // 1. submitted -> under_review
        const resReview = await request(app)
          .patch(`/api/applications/${student1AppId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'under_review' });

        expect(resReview.status).toBe(200);
        expect(resReview.body.data.application.status).toBe('under_review');

        // 2. under_review -> shortlisted
        const resShortlist = await request(app)
          .patch(`/api/applications/${student1AppId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'shortlisted' });

        expect(resShortlist.status).toBe(200);
        expect(resShortlist.body.data.application.status).toBe('shortlisted');

        // 3. shortlisted -> selected
        const resSelect = await request(app)
          .patch(`/api/applications/${student1AppId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'selected' });

        expect(resSelect.status).toBe(200);
        expect(resSelect.body.data.application.status).toBe('selected');
      });

      it('rejects invalid status transitions with 400 Bad Request', async () => {
        // Alice app is currently in 'submitted'.
        // Valid transitions from 'submitted' are 'under_review', 'shortlisted', 'rejected'.
        // Transitioning directly to 'selected' is invalid.
        const res = await request(app)
          .patch(`/api/applications/${student1AppId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'selected' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Cannot transition');
      });

      it('forbids students from updating application status with 403 Forbidden', async () => {
        const res = await request(app)
          .patch(`/api/applications/${student1AppId}/status`)
          .set('Authorization', `Bearer ${student1Token}`)
          .send({ status: 'shortlisted' });

        expect(res.status).toBe(403);
      });
    });
  });
});
