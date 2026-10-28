import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Readable } from 'stream';
import app from '../app';
import { env } from '../config/env';
import { resumeStorageService } from '../services/storage/gridfs.storage';

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
  resumeStatus: string;
  resumeUrl: string;
  updatedAt: Date;
}

interface MockResumeRecord {
  _id: string;
  id: string;
  student: string;
  originalName: string;
  storageFileId: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  version: number;
  isCurrent: boolean;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MockApplicationRecord {
  _id: string;
  id: string;
  student: string;
  listing: string;
  status: string;
}

const mockUsers = new Map<string, MockUserRecord>();
const mockProfiles = new Map<string, MockProfileRecord>();
const mockResumes = new Map<string, MockResumeRecord>();
const mockApplications = new Map<string, MockApplicationRecord>();
const storedFiles = new Map<string, Buffer>();

// Mock User Model
jest.mock('../models/user.model', () => ({
  User: {
    findById: jest.fn(async (id: string) => {
      const user = mockUsers.get(id);
      if (!user) return null;
      return {
        ...user,
        toJSON: () => ({ id: user.id, name: user.name, email: user.email, role: user.role }),
      };
    }),
  },
}));

// Mock StudentProfile Model
jest.mock('../models/profile.model', () => ({
  StudentProfile: {
    findOne: jest.fn(async (query: { userId?: string }) => {
      if (query.userId) {
        return mockProfiles.get(query.userId) || null;
      }
      return null;
    }),
    findOneAndUpdate: jest.fn(async (query: { userId?: string }, update: Record<string, unknown>) => {
      const existing = query.userId ? mockProfiles.get(query.userId) : null;
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      return null;
    }),
  },
}));

// Mock Application Model
jest.mock('../models/application.model', () => ({
  Application: {
    findById: jest.fn(async (id: string) => {
      return mockApplications.get(id) || null;
    }),
  },
}));

// Mock Resume Model
jest.mock('../models/resume.model', () => {
  const MockResumeConstructor = function (this: unknown, data: Partial<MockResumeRecord>) {
    const id = data._id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: MockResumeRecord = {
      _id: id,
      id,
      student: data.student ? data.student.toString() : '',
      originalName: data.originalName || 'resume.pdf',
      storageFileId: data.storageFileId ? data.storageFileId.toString() : `file_${Date.now()}`,
      storageKey: data.storageKey || `key_${Date.now()}`,
      mimeType: data.mimeType || 'application/pdf',
      fileSize: data.fileSize || 1024,
      version: data.version || 1,
      isCurrent: data.isCurrent !== undefined ? data.isCurrent : true,
      uploadedAt: data.uploadedAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const doc: Record<string, unknown> = {
      ...record,
      save: jest.fn(async () => {
        mockResumes.set(id, record);
        return doc;
      }),
      toJSON: () => ({
        id: record.id,
        student: record.student,
        originalName: record.originalName,
        fileSize: record.fileSize,
        mimeType: record.mimeType,
        version: record.version,
        isCurrent: record.isCurrent,
        uploadedAt: record.uploadedAt,
      }),
    };
    return doc;
  };

  (MockResumeConstructor as unknown as Record<string, unknown>).findOne = jest.fn(
    async (query: { student?: string | object; isCurrent?: boolean }) => {
      const studentId = query.student ? query.student.toString() : undefined;
      const found = Array.from(mockResumes.values()).find(
        (r) =>
          (!studentId || r.student === studentId) &&
          (query.isCurrent === undefined || r.isCurrent === query.isCurrent)
      );
      if (!found) return null;

      const doc: Record<string, unknown> = {
        ...found,
        save: jest.fn(async () => {
          mockResumes.set(found._id, found);
          return doc;
        }),
        toJSON: () => ({
          id: found.id,
          student: found.student,
          originalName: found.originalName,
          fileSize: found.fileSize,
          mimeType: found.mimeType,
          version: found.version,
          isCurrent: found.isCurrent,
          uploadedAt: found.uploadedAt,
        }),
      };
      return doc;
    }
  );

  (MockResumeConstructor as unknown as Record<string, unknown>).deleteOne = jest.fn(
    async (query: { _id?: string }) => {
      if (query._id) {
        mockResumes.delete(query._id);
      }
      return { deletedCount: 1 };
    }
  );

  return { Resume: MockResumeConstructor };
});

// Mock GridFS storage service
jest.mock('../services/storage/gridfs.storage', () => ({
  resumeStorageService: {
    uploadStream: jest.fn(async (filename: string, stream: Readable) => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const fullBuffer = Buffer.concat(chunks);
      const fileId = '507f1f77bcf86cd799439088';
      storedFiles.set(fileId, fullBuffer);
      return {
        fileId,
        filename,
        size: fullBuffer.length,
      };
    }),
    getDownloadStream: jest.fn((fileId: string) => {
      const buf = storedFiles.get(fileId) || Buffer.from('%PDF-1.4\nTest Resume\n%%EOF');
      return Readable.from([buf]);
    }),
    deleteFile: jest.fn(async (fileId: string) => {
      storedFiles.delete(fileId);
      return true;
    }),
    fileExists: jest.fn(async (fileId: string) => {
      return storedFiles.has(fileId);
    }),
  },
}));

describe('Resume Uploads & Secure Document Management API (/api/resumes)', () => {
  const student1Id = '507f1f77bcf86cd799439011';
  const student2Id = '507f1f77bcf86cd799439012';
  const adminId = '507f1f77bcf86cd799439099';
  const appId = '507f1f77bcf86cd799439033';

  let student1Token: string;
  let student2Token: string;
  let adminToken: string;

  // Valid PDF buffer with magic bytes %PDF- and EOF marker
  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Title (Student Resume) >>\nendobj\ntrailer\n<< >>\n%%EOF\n'
  );

  beforeEach(() => {
    mockUsers.clear();
    mockProfiles.clear();
    mockResumes.clear();
    mockApplications.clear();
    storedFiles.clear();
    jest.clearAllMocks();

    mockUsers.set(student1Id, {
      _id: student1Id,
      id: student1Id,
      name: 'Emily Davis',
      email: 'emily@college.edu',
      passwordHash: 'hash',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockProfiles.set(student1Id, {
      _id: `prof_${student1Id}`,
      id: `prof_${student1Id}`,
      userId: student1Id,
      resumeStatus: 'not_uploaded',
      resumeUrl: '',
      updatedAt: new Date(),
    });

    mockUsers.set(student2Id, {
      _id: student2Id,
      id: student2Id,
      name: 'James Wilson',
      email: 'james@college.edu',
      passwordHash: 'hash',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockProfiles.set(student2Id, {
      _id: `prof_${student2Id}`,
      id: `prof_${student2Id}`,
      userId: student2Id,
      resumeStatus: 'not_uploaded',
      resumeUrl: '',
      updatedAt: new Date(),
    });

    mockUsers.set(adminId, {
      _id: adminId,
      id: adminId,
      name: 'TPO Director',
      email: 'tpo@college.edu',
      passwordHash: 'hash',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockApplications.set(appId, {
      _id: appId,
      id: appId,
      student: student1Id,
      listing: '507f1f77bcf86cd799439055',
      status: 'submitted',
    });

    student1Token = jwt.sign(
      { userId: student1Id, email: 'emily@college.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    student2Token = jwt.sign(
      { userId: student2Id, email: 'james@college.edu', role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminId, email: 'tpo@college.edu', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/resumes (Upload & Validation)', () => {
    it('successfully uploads a valid PDF resume and persists metadata', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', validPdfBuffer, 'emily_cv.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resume).toBeDefined();
      expect(res.body.data.resume.originalName).toBe('emily_cv.pdf');
      expect(res.body.data.resume.mimeType).toBe('application/pdf');
      expect(res.body.data.resume.isCurrent).toBe(true);

      // Verify StudentProfile was updated
      const prof = mockProfiles.get(student1Id);
      expect(prof?.resumeStatus).toBe('uploaded');
    });

    it('rejects unauthenticated upload requests with 401', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .attach('resume', validPdfBuffer, 'test.pdf');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('forbids administrators from uploading student resumes with 403', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('resume', validPdfBuffer, 'admin_doc.pdf');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-PDF file extensions with 415 Unsupported Media Type', async () => {
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', Buffer.from('hello world'), 'profile.docx');

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/(pdf|\.pdf)/i);
    });

    it('rejects disguised files with fake extensions that lack PDF magic bytes', async () => {
      // File has .pdf extension but plain text content
      const fakePdfBuffer = Buffer.from('Plain text fake resume without PDF magic header');
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', fakePdfBuffer, 'disguised.pdf');

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/signature/i);
    });

    it('rejects empty (0 byte) files with 400 Bad Request', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', emptyBuffer, 'empty.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects malformed PDF documents that lack EOF markers', async () => {
      const truncatedPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\nTruncated document');
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', truncatedPdfBuffer, 'truncated.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/missing end-of-file/i);
    });

    it('safely replaces existing resume and increments version counter', async () => {
      // 1. Initial upload
      await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', validPdfBuffer, 'initial_resume.pdf');

      // 2. Second upload (replacement)
      const res = await request(app)
        .post('/api/resumes')
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('resume', validPdfBuffer, 'updated_resume.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.resume.originalName).toBe('updated_resume.pdf');
      expect(res.body.data.resume.version).toBe(2);

      // Verify previous storage cleanup was triggered
      expect(resumeStorageService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('GET /api/resumes/me (Metadata Retrieval)', () => {
    it('returns the authenticated student active resume metadata', async () => {
      mockResumes.set('res_01', {
        _id: 'res_01',
        id: 'res_01',
        student: student1Id,
        originalName: 'emily_resume_v1.pdf',
        storageFileId: 'file_01',
        storageKey: 'key_01',
        mimeType: 'application/pdf',
        fileSize: 45000,
        version: 1,
        isCurrent: true,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/resumes/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resume.originalName).toBe('emily_resume_v1.pdf');
      expect(res.body.data.resume.storageFileId).toBeUndefined(); // Never expose internal GridFS id
    });

    it('returns 404 when student has not uploaded a resume', async () => {
      const res = await request(app)
        .get('/api/resumes/me')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('maintains strict student isolation: student 2 cannot access student 1 resume', async () => {
      mockResumes.set('res_01', {
        _id: 'res_01',
        id: 'res_01',
        student: student1Id,
        originalName: 'emily_secret.pdf',
        storageFileId: 'file_01',
        storageKey: 'key_01',
        mimeType: 'application/pdf',
        fileSize: 45000,
        version: 1,
        isCurrent: true,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/resumes/me')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/resumes/me/download (Secure File Download)', () => {
    beforeEach(() => {
      mockResumes.set('res_01', {
        _id: 'res_01',
        id: 'res_01',
        student: student1Id,
        originalName: 'my_resume.pdf',
        storageFileId: 'file_01',
        storageKey: 'key_01',
        mimeType: 'application/pdf',
        fileSize: validPdfBuffer.length,
        version: 1,
        isCurrent: true,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      storedFiles.set('file_01', validPdfBuffer);
    });

    it('streams resume file with safe Content-Type, Content-Disposition, and nosniff headers', async () => {
      const res = await request(app)
        .get('/api/resumes/me/download')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="my_resume.pdf"/i);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('returns 404 if resume not found for download', async () => {
      const res = await request(app)
        .get('/api/resumes/me/download')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/resumes/me (Deletion & Cleanup)', () => {
    beforeEach(() => {
      mockResumes.set('res_01', {
        _id: 'res_01',
        id: 'res_01',
        student: student1Id,
        originalName: 'emily_resume.pdf',
        storageFileId: 'file_01',
        storageKey: 'key_01',
        mimeType: 'application/pdf',
        fileSize: 1024,
        version: 1,
        isCurrent: true,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockProfiles.set(student1Id, {
        _id: `prof_${student1Id}`,
        id: `prof_${student1Id}`,
        userId: student1Id,
        resumeStatus: 'uploaded',
        resumeUrl: '/api/resumes/me/download',
        updatedAt: new Date(),
      });
    });

    it('deletes resume from storage, removes metadata, and resets profile status', async () => {
      const res = await request(app)
        .delete('/api/resumes/me')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify underlying storage delete was invoked
      expect(resumeStorageService.deleteFile).toHaveBeenCalledWith('file_01');

      // Verify StudentProfile status reset
      const prof = mockProfiles.get(student1Id);
      expect(prof?.resumeStatus).toBe('not_uploaded');
      expect(prof?.resumeUrl).toBe('');
    });

    it('returns 404 when attempting to delete a non-existent resume', async () => {
      const res = await request(app)
        .delete('/api/resumes/me')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Admin Authorized Endpoints', () => {
    beforeEach(() => {
      mockResumes.set('res_01', {
        _id: 'res_01',
        id: 'res_01',
        student: student1Id,
        originalName: 'applicant_cv.pdf',
        storageFileId: 'file_01',
        storageKey: 'key_01',
        mimeType: 'application/pdf',
        fileSize: validPdfBuffer.length,
        version: 1,
        isCurrent: true,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      storedFiles.set('file_01', validPdfBuffer);
    });

    it('allows admin to download student resume via GET /api/students/:studentId/resume', async () => {
      const res = await request(app)
        .get(`/api/students/${student1Id}/resume`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="applicant_cv.pdf"/i);
    });

    it('allows admin to query student resume metadata via ?metadata=true', async () => {
      const res = await request(app)
        .get(`/api/students/${student1Id}/resume?metadata=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resume.originalName).toBe('applicant_cv.pdf');
    });

    it('forbids students from accessing admin student resume route with 403', async () => {
      const res = await request(app)
        .get(`/api/students/${student1Id}/resume`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
    });

    it('allows admin to download applicant resume via GET /api/applications/:id/resume', async () => {
      const res = await request(app)
        .get(`/api/applications/${appId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="applicant_cv.pdf"/i);
    });

    it('returns 404 when applicant has not uploaded a resume', async () => {
      const appWithoutResumeId = '507f1f77bcf86cd799439098';
      mockApplications.set(appWithoutResumeId, {
        _id: appWithoutResumeId,
        id: appWithoutResumeId,
        student: student2Id, // student2 has no resume
        listing: '507f1f77bcf86cd799439055',
        status: 'submitted',
      });

      const res = await request(app)
        .get(`/api/applications/${appWithoutResumeId}/resume`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/The applicant has not uploaded a resume/i);
    });
  });
});
