import { apiClient } from './client';

export type NotificationType = 'application_status' | 'listing' | 'general' | 'system';

export interface NotificationItem {
  id: string;
  recipient: string;
  title: string;
  message: string;
  type: NotificationType;
  application?: string | { id: string; status: string; submittedAt: string };
  listing?: string | { id: string; companyName: string; title: string; opportunityType: string };
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Fetch paginated notifications for the current user.
 */
export const getNotifications = async (
  params?: NotificationQueryParams
): Promise<NotificationsResponse> => {
  const response = await apiClient.get('/notifications', { params });
  return response.data.data;
};

/**
 * Retrieve the current unread notifications count.
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.data.unreadCount;
};

/**
 * Mark a single notification as read by ID.
 */
export const markNotificationAsRead = async (
  id: string
): Promise<NotificationItem> => {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data.data.notification;
};

/**
 * Mark all user notifications as read.
 */
export const markAllNotificationsAsRead = async (): Promise<number> => {
  const response = await apiClient.patch('/notifications/read-all');
  return response.data.data.updatedCount;
};
