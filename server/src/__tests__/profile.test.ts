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

const mockUsers = new Map<string, MockUserRecord>();
const mockProfiles = new Map<string, MockProfileRecord>();

jest.mock('../models/user.model', () => {
  return {
    User: {
      findOne: jest.fn(async (query: { email?: string; _id?: string }) => {
        if (query.email) {
          const user = Array.from(mockUsers.values()).find(
            (u) => u.email.toLowerCase() === query.email?.toLowerCase()
          );
          return user ? createMockUserDoc(user) : null;
        }
        return null;
      }),
      findById: jest.fn(async (id: string) => {
        const user = mockUsers.get(id);
        return user ? createMockUserDoc(user) : null;
      }),
      create: jest.fn(async (data: Partial<MockUserRecord>) => {
        const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const userRecord: MockUserRecord = {
          _id: id,
          id,
          name: data.name || 'Mock Student',
          email: (data.email || 'mock@student.edu').toLowerCase(),
          passwordHash: data.passwordHash || 'mock_hash',
          role: data.role || 'student',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.set(id, userRecord);
        return createMockUserDoc(userRecord);
      }),
    },
  };
});

jest.mock('../models/profile.model', () => {
  const originalModule = jest.requireActual('../models/profile.model');
  return {
    ...originalModule,
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
      create: jest.fn(
        async (data: Partial<MockProfileRecord> & { userId: { toString(): string } | string }) => {
          const id = `prof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const profileRecord: MockProfileRecord = {
            _id: id,
            id,
            userId: data.userId.toString(),
            phone: data.phone || '',
            avatarUrl: data.avatarUrl || '',
            institution: data.institution || '',
            department: data.department || '',
            degree: data.degree || '',
            graduationYear: data.graduationYear ?? null,
            cgpa: data.cgpa ?? null,
            rollNumber: data.rollNumber || '',
            skills: data.skills || [],
            bio: data.bio || '',
            linkedInUrl: data.linkedInUrl || '',
            githubUrl: data.githubUrl || '',
            portfolioUrl: data.portfolioUrl || '',
            resumeStatus: data.resumeStatus || 'not_uploaded',
            resumeUrl: data.resumeUrl || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockProfiles.set(id, profileRecord);
          return createMockProfileDoc(profileRecord);
        }
      ),
      findOneAndUpdate: jest.fn(
        async (
          query: { userId: string },
          update: { $set?: Partial<MockProfileRecord> },
          _options?: Record<string, unknown>
        ) => {
          let profile = Array.from(mockProfiles.values()).find(
            (p) => p.userId === query.userId.toString()
          );

          if (!profile) {
            const id = `prof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            profile = {
              _id: id,
              id,
              userId: query.userId.toString(),
              phone: '',
              avatarUrl: '',
              institution: '',
              department: '',
              degree: '',
              graduationYear: null,
              cgpa: null,
              rollNumber: '',
              skills: [],
              bio: '',
              linkedInUrl: '',
              githubUrl: '',
              portfolioUrl: '',
              resumeStatus: 'not_uploaded',
              resumeUrl: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockProfiles.set(id, profile);
          }

          if (update.$set) {
            Object.assign(profile, update.$set, { updatedAt: new Date() });
          }

          return createMockProfileDoc(profile);
        }
      ),
    },
  };
});

function createMockUserDoc(data: MockUserRecord): Record<string, unknown> {
  return {
    ...data,
    save: jest.fn(async function (this: { name: string }) {
      mockUsers.set(data._id, { ...data, name: this.name });
      return this;
    }),
    toSafeObject: () => ({
      id: data._id || data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }),
  };
}

function createMockProfileDoc(data: MockProfileRecord): Record<string, unknown> {
  return {
    ...data,
  };
}

describe('Student Profile API (/api/profile)', () => {
  let student1Token: string;
  let student1Id: string;
  let student2Token: string;
  let student2Id: string;

  beforeEach(() => {
    mockUsers.clear();
    mockProfiles.clear();
    jest.clearAllMocks();

    student1Id = 'student_user_1';
    mockUsers.set(student1Id, {
      _id: student1Id,
      id: student1Id,
      name: 'Alice Student',
      email: 'alice@college.edu',
      passwordHash: 'hash1',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    student1Token = jwt.sign(
      { userId: student1Id, email: 'alice@college.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    student2Id = 'student_user_2';
    mockUsers.set(student2Id, {
      _id: student2Id,
      id: student2Id,
      name: 'Bob Learner',
      email: 'bob@college.edu',
      passwordHash: 'hash2',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    student2Token = jwt.sign(
      { userId: student2Id, email: 'bob@college.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/profile/me', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const res = await request(app).get('/api/profile/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('token is required');
    });

    it('initializes and returns a default profile for a newly registered student', async () => {
      const res = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toMatchObject({
        userId: student1Id,
        name: 'Alice Student',
        email: 'alice@college.edu',
        role: 'student',
        phone: '',
        skills: [],
      });
      expect(res.body.data).toHaveProperty('completion');
      expect(res.body.data.completion.percentage).toBeLessThan(100);
      expect(res.body.data.completion.missingFields).toContain('Phone Number');
    });
  });

  describe('PUT /api/profile/me', () => {
    it('successfully updates student academic and professional details', async () => {
      const updatePayload = {
        name: 'Alice S. Cooper',
        phone: '+1-555-123-4567',
        institution: 'National Institute of Technology',
        department: 'Computer Science',
        degree: 'B.Tech',
        graduationYear: 2026,
        cgpa: 8.85,
        rollNumber: 'CS2026-042',
        skills: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
        bio: 'Aspiring full-stack software engineer interested in scalable distributed systems.',
        linkedInUrl: 'https://linkedin.com/in/alicescooper',
        githubUrl: 'https://github.com/alicescooper',
        portfolioUrl: 'https://alice.dev',
      };

      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toMatchObject({
        name: 'Alice S. Cooper',
        department: 'Computer Science',
        degree: 'B.Tech',
        cgpa: 8.85,
        graduationYear: 2026,
        rollNumber: 'CS2026-042',
        skills: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
      });
      expect(res.body.data.completion.percentage).toBe(100);
      expect(res.body.data.completion.isComplete).toBe(true);
      expect(res.body.data.completion.missingFields).toHaveLength(0);
    });

    it('rejects invalid CGPA values above 10.0 or below 0.0', async () => {
      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ cgpa: 11.5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toHaveProperty('cgpa');
    });

    it('successfully updates student with standardized engineering branch and expected graduation year 2027', async () => {
      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          department: 'Computer Science and Engineering (CSE)',
          graduationYear: 2027,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.department).toBe('Computer Science and Engineering (CSE)');
      expect(res.body.data.profile.graduationYear).toBe(2027);
    });

    it('rejects invalid graduation years outside sensible ranges', async () => {
      const resPast = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ graduationYear: 1990 });

      expect(resPast.status).toBe(400);
      expect(resPast.body.success).toBe(false);
      expect(resPast.body.details).toHaveProperty('graduationYear');

      const unreasonableYear = new Date().getFullYear() + 25;
      const resFarFuture = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ graduationYear: unreasonableYear });

      expect(resFarFuture.status).toBe(400);
      expect(resFarFuture.body.success).toBe(false);
      expect(resFarFuture.body.details).toHaveProperty('graduationYear');
    });

    it('rejects malformed social and portfolio URLs', async () => {
      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ linkedInUrl: 'not-a-valid-url' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toHaveProperty('linkedInUrl');
    });

    it('prevents mass assignment of role to admin', async () => {
      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          department: 'Information Technology',
          role: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('prevents tampering with email or userId via profile update', async () => {
      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          email: 'hacked@college.edu',
          userId: 'malicious_user_id',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('ensures student 1 cannot access or modify student 2 profile', async () => {
      // Student 1 updates their profile
      await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ department: 'Aerospace Engineering' });

      // Student 2 fetches their own profile
      const resStudent2 = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(resStudent2.status).toBe(200);
      expect(resStudent2.body.data.profile.userId).toBe(student2Id);
      expect(resStudent2.body.data.profile.department).toBe('');
      expect(resStudent2.body.data.profile.name).toBe('Bob Learner');
    });
  });
});
