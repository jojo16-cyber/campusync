import mongoose from 'mongoose';
import { seedAdmin, parseCliArgs } from '../scripts/seedAdmin';
import { User, IUser } from '../models/user.model';
import { comparePassword } from '../utils/password';

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

const mockUsers = new Map<string, MockUserRecord>();

jest.mock('../config/db', () => ({
  connectDatabase: jest.fn(async () => {}),
  disconnectDatabase: jest.fn(async () => {}),
}));

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
    },
  };
});

function createMockUserDoc(data: MockUserRecord): IUser {
  return {
    ...data,
    save: jest.fn(async function (this: IUser) {
      const existing = mockUsers.get(data.id || data._id);
      if (existing) {
        existing.name = this.name;
        existing.passwordHash = this.passwordHash;
        existing.role = this.role;
        existing.updatedAt = new Date();
      }
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
  } as unknown as IUser;
}

describe('Administrator Provisioning & Seeding Script (seedAdmin)', () => {
  beforeEach(() => {
    mockUsers.clear();
    jest.clearAllMocks();
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
    });
  });

  describe('parseCliArgs', () => {
    it('parses --key=value formatted command line arguments', () => {
      const args = parseCliArgs([
        '--name=Super Admin',
        '--email=admin@college.edu',
        '--password=SecurePass123!',
      ]);

      expect(args.name).toBe('Super Admin');
      expect(args.email).toBe('admin@college.edu');
      expect(args.password).toBe('SecurePass123!');
    });

    it('ignores arguments that do not follow --key=value syntax', () => {
      const args = parseCliArgs(['run', 'npm', '--flag', 'value']);
      expect(args).toEqual({});
    });
  });

  describe('Initial Administrator Creation', () => {
    it('successfully provisions a new administrator account when none exists', async () => {
      const result = await seedAdmin({
        name: 'Placement Director',
        email: 'director@university.edu',
        password: 'AdminPassword2026!',
        disconnectWhenDone: false,
      });

      expect(result.action).toBe('created');
      expect(result.email).toBe('director@university.edu');
      expect(result.role).toBe('admin');

      const savedUser = await User.findOne({ email: 'director@university.edu' });
      expect(savedUser).not.toBeNull();
      expect(savedUser?.role).toBe('admin');
      expect(savedUser?.name).toBe('Placement Director');

      // Verify password can be validated with bcrypt
      const isMatch = await comparePassword('AdminPassword2026!', savedUser!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('normalizes email addresses by trimming and converting to lower case', async () => {
      const result = await seedAdmin({
        name: 'Dean of Placements',
        email: '  DEAN.Placement@University.EDU  ',
        password: 'AdminPassword2026!',
        disconnectWhenDone: false,
      });

      expect(result.email).toBe('dean.placement@university.edu');

      const savedUser = await User.findOne({ email: 'dean.placement@university.edu' });
      expect(savedUser).not.toBeNull();
      expect(savedUser?.email).toBe('dean.placement@university.edu');
    });
  });

  describe('Existing Account Promotion to Administrator', () => {
    it('promotes an existing student account to administrator and resets password securely', async () => {
      // 1. Existing user registered as student
      await User.create({
        name: 'Student Leader',
        email: 'leader@university.edu',
        passwordHash: 'old_student_password_hash',
        role: 'student',
      });

      const initialStudent = await User.findOne({ email: 'leader@university.edu' });
      expect(initialStudent?.role).toBe('student');

      // 2. Admin provisioning promotes the account
      const result = await seedAdmin({
        name: 'Promoted Admin Leader',
        email: 'leader@university.edu',
        password: 'NewPromotedAdminPassword2026!',
        disconnectWhenDone: false,
      });

      expect(result.action).toBe('updated');
      expect(result.role).toBe('admin');

      // 3. Confirm in database
      const updatedUser = await User.findOne({ email: 'leader@university.edu' });
      expect(updatedUser?.role).toBe('admin');
      expect(updatedUser?.name).toBe('Promoted Admin Leader');

      // 4. Confirm new password works
      const isNewPasswordValid = await comparePassword(
        'NewPromotedAdminPassword2026!',
        updatedUser!.passwordHash
      );
      expect(isNewPasswordValid).toBe(true);
    });
  });

  describe('Validation & Security Invariants', () => {
    it('throws error when email is missing or empty', async () => {
      await expect(
        seedAdmin({
          email: '',
          password: 'ValidPassword123!',
          disconnectWhenDone: false,
        })
      ).rejects.toThrow(/ADMIN_EMAIL and ADMIN_PASSWORD must be configured/i);
    });

    it('throws error when password is missing or empty', async () => {
      await expect(
        seedAdmin({
          email: 'valid@university.edu',
          password: '',
          disconnectWhenDone: false,
        })
      ).rejects.toThrow(/ADMIN_EMAIL and ADMIN_PASSWORD must be configured/i);
    });

    it('throws error when password is shorter than 8 characters', async () => {
      await expect(
        seedAdmin({
          email: 'admin@university.edu',
          password: 'short',
          disconnectWhenDone: false,
        })
      ).rejects.toThrow(/must be at least 8 characters long/i);
    });

    it('throws error when email format is invalid', async () => {
      await expect(
        seedAdmin({
          email: 'invalid-email-no-at-sign',
          password: 'ValidPassword123!',
          disconnectWhenDone: false,
        })
      ).rejects.toThrow(/Invalid admin email format/i);
    });

    it('throws error when database connection could not be established', async () => {
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 0,
        configurable: true,
      });

      await expect(
        seedAdmin({
          email: 'admin@college.edu',
          password: 'ValidPassword123!',
          disconnectWhenDone: false,
        })
      ).rejects.toThrow(/Database connection could not be established/i);
    });
  });
});
