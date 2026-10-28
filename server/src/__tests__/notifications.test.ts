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

interface MockNotificationRecord {
  _id: string;
  id: string;
  recipient: string;
  title: string;
  message: string;
  type: string;
  application?: string;
  listing?: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockListingRecord {
  _id: string;
  id: string;
  companyName: string;
  title: string;
  status: string;
}

interface MockApplicationRecord {
  _id: string;
  id: string;
  student: string;
  listing: string;
  status: string;
  canWithdraw: () => boolean;
}

const mockUsers = new Map<string, MockUserRecord>();
const mockNotifications = new Map<string, MockNotificationRecord>();
const mockListings = new Map<string, MockListingRecord>();
const mockApplications = new Map<string, MockApplicationRecord>();

jest.mock('../models/user.model', () => ({
  User: {
    findById: jest.fn(async (id: string) => {
      const user = mockUsers.get(id);
      return user
        ? {
            ...user,
            toSafeObject: () => ({ ...user }),
          }
        : null;
    }),
  },
}));

jest.mock('../models/listing.model', () => ({
  Listing: {
    findById: jest.fn(async (id: string) => {
      const listing = mockListings.get(id);
      return listing ? { ...listing } : null;
    }),
  },
}));

jest.mock('../models/application.model', () => {
  const actual = jest.requireActual('../models/application.model');
  return {
    ...actual,
    Application: {
      findById: jest.fn(async (id: string) => {
        const appRecord = mockApplications.get(id);
        if (!appRecord) return null;
        return {
          ...appRecord,
          save: jest.fn(async function (this: MockApplicationRecord) {
            mockApplications.set(id, {
              ...appRecord,
              status: this.status,
            });
            return this;
          }),
        };
      }),
    },
  };
});

jest.mock('../models/notification.model', () => ({
  Notification: {
    create: jest.fn(async (data: Partial<MockNotificationRecord>) => {
      const id = `507f1f77bcf86cd799439${Math.floor(100 + Math.random() * 900)}`;
      const record: MockNotificationRecord = {
        _id: id,
        id,
        recipient: data.recipient?.toString() || '',
        title: data.title || '',
        message: data.message || '',
        type: data.type || 'application_status',
        application: data.application?.toString(),
        listing: data.listing?.toString(),
        isRead: data.isRead ?? false,
        readAt: data.readAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockNotifications.set(id, record);
      return { ...record, toJSON: () => ({ ...record }) };
    }),

    find: jest.fn((query: { recipient?: string; isRead?: boolean }) => {
      let isPopulated = false;
      const getResults = () => {
        return Array.from(mockNotifications.values()).filter((n) => {
          if (query.recipient && n.recipient !== query.recipient) return false;
          if (query.isRead !== undefined && n.isRead !== query.isRead) return false;
          return true;
        });
      };

      const chain: Record<string, unknown> = {
        populate: jest.fn().mockImplementation(() => {
          isPopulated = true;
          return chain;
        }),
        sort: jest.fn().mockImplementation(() => chain),
        skip: jest.fn().mockImplementation(() => chain),
        limit: jest.fn().mockImplementation((limitCount: number) => {
          return {
            then: (resolve: (val: unknown) => void) => {
              const items = getResults().slice(0, limitCount).map((item) => ({
                ...item,
                toJSON: () => ({ ...item }),
                listing: isPopulated && item.listing ? mockListings.get(item.listing) : item.listing,
              }));
              resolve(items);
            },
          };
        }),
      };
      return chain;
    }),

    findOne: jest.fn(async (query: { _id?: string; recipient?: string }) => {
      const record = Array.from(mockNotifications.values()).find((n) => {
        if (query._id && n._id !== query._id && n.id !== query._id) return false;
        if (query.recipient && n.recipient !== query.recipient) return false;
        return true;
      });

      if (!record) return null;

      const doc = {
        ...record,
        save: jest.fn(async function (this: MockNotificationRecord) {
          mockNotifications.set(record._id, {
            ...record,
            isRead: this.isRead,
            readAt: this.readAt,
            updatedAt: new Date(),
          });
          return this;
        }),
        toJSON: function (this: MockNotificationRecord) {
          return {
            _id: this._id,
            id: this._id,
            recipient: this.recipient,
            title: this.title,
            message: this.message,
            type: this.type,
            isRead: this.isRead,
            readAt: this.readAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
          };
        },
      };

      return doc;
    }),

    countDocuments: jest.fn(async (query: { recipient?: string; isRead?: boolean }) => {
      return Array.from(mockNotifications.values()).filter((n) => {
        if (query.recipient && n.recipient !== query.recipient) return false;
        if (query.isRead !== undefined && n.isRead !== query.isRead) return false;
        return true;
      }).length;
    }),

    updateMany: jest.fn(
      async (
        filter: { recipient?: string; isRead?: boolean },
        update: { $set: { isRead: boolean; readAt: Date } }
      ) => {
        let modifiedCount = 0;
        for (const [id, record] of mockNotifications.entries()) {
          if (filter.recipient && record.recipient !== filter.recipient) continue;
          if (filter.isRead !== undefined && record.isRead !== filter.isRead) continue;

          mockNotifications.set(id, {
            ...record,
            isRead: update.$set.isRead,
            readAt: update.$set.readAt,
            updatedAt: new Date(),
          });
          modifiedCount++;
        }
        return { modifiedCount };
      }
    ),
  },
}));

describe('Notifications API (/api/notifications)', () => {
  const student1Id = '507f1f77bcf86cd799439001';
  const student2Id = '507f1f77bcf86cd799439002';
  const adminId = '507f1f77bcf86cd799439003';

  let student1Token: string;
  let student2Token: string;
  let adminToken: string;

  beforeEach(() => {
    mockUsers.clear();
    mockNotifications.clear();
    mockListings.clear();
    mockApplications.clear();
    jest.clearAllMocks();

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

    mockUsers.set(student2Id, {
      _id: student2Id,
      id: student2Id,
      name: 'Bob Student',
      email: 'bob@college.edu',
      passwordHash: 'hash2',
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUsers.set(adminId, {
      _id: adminId,
      id: adminId,
      name: 'Admin User',
      email: 'admin@college.edu',
      passwordHash: 'hash3',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockListings.set('listing_google', {
      _id: 'listing_google',
      id: 'listing_google',
      companyName: 'Google',
      title: 'Software Engineer Intern',
      status: 'published',
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
      { userId: adminId, email: 'admin@college.edu', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/notifications', () => {
    beforeEach(() => {
      // Seed 2 notifications for student 1 (1 unread, 1 read) and 1 for student 2
      mockNotifications.set('notif_1', {
        _id: 'notif_1',
        id: 'notif_1',
        recipient: student1Id,
        title: 'Status Update',
        message: 'Your application has been shortlisted.',
        type: 'application_status',
        isRead: false,
        readAt: null,
        createdAt: new Date(Date.now() - 10000),
        updatedAt: new Date(Date.now() - 10000),
      });

      mockNotifications.set('notif_2', {
        _id: 'notif_2',
        id: 'notif_2',
        recipient: student1Id,
        title: 'Interview Scheduled',
        message: 'Interview round scheduled.',
        type: 'application_status',
        isRead: true,
        readAt: new Date(),
        createdAt: new Date(Date.now() - 20000),
        updatedAt: new Date(Date.now() - 20000),
      });

      mockNotifications.set('notif_3', {
        _id: 'notif_3',
        id: 'notif_3',
        recipient: student2Id,
        title: 'Welcome',
        message: 'Welcome to CampuSync.',
        type: 'system',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('returns paginated notifications for the authenticated student with unreadCount', async () => {
      const res = await request(app)
        .get('/api/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toHaveLength(2);
      expect(res.body.data.unreadCount).toBe(1);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('filters unread-only notifications when unreadOnly=true is provided', async () => {
      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('ensures student 2 cannot see student 1 notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.notifications[0].title).toBe('Welcome');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('returns the exact unread notifications count for the authenticated user', async () => {
      mockNotifications.set('notif_a', {
        _id: 'notif_a',
        id: 'notif_a',
        recipient: student1Id,
        title: 'New Listing',
        message: 'Google posted an opportunity.',
        type: 'listing',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(1);
    });

    it('returns unread count 0 when user has no unread notifications', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBe(0);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/notifications/unread-count');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    const validNotifId = '507f1f77bcf86cd799439111';

    beforeEach(() => {
      mockNotifications.set(validNotifId, {
        _id: validNotifId,
        id: validNotifId,
        recipient: student1Id,
        title: 'Status Update',
        message: 'You have been selected.',
        type: 'application_status',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('marks a single notification as read and sets readAt', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${validNotifId}/read`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.isRead).toBe(true);
      expect(res.body.data.notification.readAt).toBeDefined();

      // Verify persisted state
      expect(mockNotifications.get(validNotifId)?.isRead).toBe(true);
    });

    it('prevents student 2 from marking student 1 notification as read (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${validNotifId}/read`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
      expect(mockNotifications.get(validNotifId)?.isRead).toBe(false);
    });

    it('rejects invalid ObjectId format with 400', async () => {
      const res = await request(app)
        .patch('/api/notifications/invalid-format-id/read')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('identifier format');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).patch(`/api/notifications/${validNotifId}/read`);
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    beforeEach(() => {
      // 2 unread notifications for student 1
      mockNotifications.set('n1', {
        _id: 'n1',
        id: 'n1',
        recipient: student1Id,
        title: 'Notice 1',
        message: 'Msg 1',
        type: 'general',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockNotifications.set('n2', {
        _id: 'n2',
        id: 'n2',
        recipient: student1Id,
        title: 'Notice 2',
        message: 'Msg 2',
        type: 'general',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // 1 unread notification for student 2
      mockNotifications.set('n3', {
        _id: 'n3',
        id: 'n3',
        recipient: student2Id,
        title: 'Notice 3',
        message: 'Msg 3',
        type: 'general',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('marks all notifications for authenticated user as read without affecting other users', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedCount).toBe(2);

      // Verify student 1 notifications are marked as read
      expect(mockNotifications.get('n1')?.isRead).toBe(true);
      expect(mockNotifications.get('n2')?.isRead).toBe(true);

      // Verify student 2 notification remains UNREAD
      expect(mockNotifications.get('n3')?.isRead).toBe(false);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).patch('/api/notifications/read-all');
      expect(res.status).toBe(401);
    });
  });

  describe('Application Status Transition -> Notification Workflow', () => {
    const appId = '507f1f77bcf86cd799439999';

    beforeEach(() => {
      mockApplications.set(appId, {
        _id: appId,
        id: appId,
        student: student1Id,
        listing: 'listing_google',
        status: 'submitted',
        canWithdraw: () => true,
      });
    });

    it('automatically creates in-app notification when admin updates status', async () => {
      const res = await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'under_review' });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('under_review');

      // Verify notification was created for student1
      const notifs = Array.from(mockNotifications.values());
      expect(notifs).toHaveLength(1);
      const notif = notifs[0];
      expect(notif.recipient).toBe(student1Id);
      expect(notif.title).toContain('Under Review');
      expect(notif.message).toContain('Google');
      expect(notif.message).toContain('Software Engineer Intern');
      expect(notif.message).toContain('Under Review');
      expect(notif.type).toBe('application_status');
    });

    it('does not create duplicate notification if status is unchanged', async () => {
      // First update: submitted -> under_review (creates 1 notification)
      const res1 = await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'under_review' });

      expect(res1.status).toBe(200);
      expect(mockNotifications.size).toBe(1);

      // Second update with identical status: under_review -> under_review
      const res2 = await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'under_review' });

      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain('already under_review');

      // Still exactly 1 notification, no duplicate created
      expect(mockNotifications.size).toBe(1);
    });

    it('does not create notification if status transition is invalid', async () => {
      const res = await request(app)
        .patch(`/api/applications/${appId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'selected' }); // submitted -> selected is invalid

      expect(res.status).toBe(400);
      expect(mockNotifications.size).toBe(0);
    });
  });
});
