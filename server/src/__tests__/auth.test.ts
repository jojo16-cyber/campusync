import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { User, IUser } from '../models/user.model';
import { hashPassword } from '../utils/password';
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

// In-memory mock storage for isolated testing (never touches live Atlas DB)
const mockUsers = new Map<string, MockUserRecord>();

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
      create: jest.fn(async (data: { name: string; email: string; passwordHash: string; role?: 'student' | 'admin' }) => {
        const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const userRecord: MockUserRecord = {
          _id: id,
          id,
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          role: data.role || 'student',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.set(id, userRecord);
        return createMockUserDoc(userRecord);
      }),
      deleteMany: jest.fn(async () => {
        mockUsers.clear();
      }),
    },
  };
});

function createMockUserDoc(data: MockUserRecord): IUser {
  return {
    ...data,
    toSafeObject: () => ({
      id: data._id || data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }),
  } as unknown as IUser;
}

describe('Authentication & Authorization API (/api/auth)', () => {
  beforeEach(() => {
    mockUsers.clear();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('successfully registers a new student with valid credentials', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Jane Doe',
        email: 'jane.doe@college.edu',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Student registration successful');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toMatchObject({
        name: 'Jane Doe',
        email: 'jane.doe@college.edu',
        role: 'student',
      });
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('forces role to student even if admin role is sent in payload', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Malicious User',
        email: 'attacker@college.edu',
        password: 'Password123!',
        role: 'admin',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('student');
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      // Pre-populate user
      const passwordHash = await hashPassword('Password123!');
      await User.create({
        name: 'Existing User',
        email: 'existing@college.edu',
        passwordHash,
        role: 'student',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate User',
        email: 'existing@college.edu',
        password: 'NewPassword123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('rejects registration with invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.details).toHaveProperty('email');
    });

    it('rejects registration with password lacking requirements (e.g. no numbers)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Weak Pass User',
        email: 'weakpass@college.edu',
        password: 'WeakPasswordOnly',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toHaveProperty('password');
    });

    it('rejects registration when required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details).toHaveProperty('name');
      expect(res.body.details).toHaveProperty('email');
      expect(res.body.details).toHaveProperty('password');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('ValidPass123!');
      await User.create({
        name: 'Test Student',
        email: 'student@college.edu',
        passwordHash,
        role: 'student',
      });
    });

    it('successfully logs in with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'student@college.edu',
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('student@college.edu');
    });

    it('returns generic 401 when email is not found (avoids user enumeration)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@college.edu',
        password: 'ValidPass123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns generic 401 when password is incorrect', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'student@college.edu',
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects empty login credentials with 400', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: '',
        password: '',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('ValidPass123!');
      const user = await User.create({
        name: 'Profile Student',
        email: 'profile@college.edu',
        passwordHash,
        role: 'student',
      });
      userId = user._id.toString();

      validToken = jwt.sign(
        { userId, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('returns user profile when presented with a valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        id: userId,
        email: 'profile@college.edu',
        role: 'student',
      });
    });

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('token is required');
    });

    it('returns 401 when token is malformed', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid authentication token');
    });

    it('returns 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { userId, email: 'profile@college.edu', role: 'student' },
        env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('expired');
    });
  });

  describe('Role-Based Authorization (/api/auth/admin-only)', () => {
    it('forbids student access with 403 Forbidden', async () => {
      const student = await User.create({
        name: 'Regular Student',
        email: 'student.only@college.edu',
        passwordHash: 'hash',
        role: 'student',
      });

      const studentToken = jwt.sign(
        { userId: student._id.toString(), email: student.email, role: 'student' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('allows admin access with 200 OK', async () => {
      const admin = await User.create({
        name: 'College Dean',
        email: 'dean@college.edu',
        passwordHash: 'hash',
        role: 'admin',
      });

      const adminToken = jwt.sign(
        { userId: admin._id.toString(), email: admin.email, role: 'admin' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.adminUser.role).toBe('admin');
    });
  });
});
