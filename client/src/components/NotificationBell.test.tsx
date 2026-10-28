import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import * as notifApi from '../api/notifications';

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('Phase 7: NotificationBell Component', () => {
  const sampleNotifications: notifApi.NotificationItem[] = [
    {
      id: 'notif_1',
      recipient: 'student_1',
      title: 'Application Status: Shortlisted',
      message: 'Your application for Frontend Engineer at Google has been updated to "Shortlisted".',
      type: 'application_status',
      application: 'app_123',
      listing: 'listing_456',
      isRead: false,
      readAt: null,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
      updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif_2',
      recipient: 'student_1',
      title: 'Application Status: Under Review',
      message: 'Your application for Cloud Associate at Microsoft has been updated to "Under Review".',
      type: 'application_status',
      application: 'app_789',
      listing: 'listing_101',
      isRead: true,
      readAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockedNavigate.mockReset();
  });

  it('renders notification bell icon and fetches unread count', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(1);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    expect(screen.getByTestId('notification-bell-btn')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('unread-badge')).toHaveTextContent('1');
    });
  });

  it('does not display badge when unreadCount is 0', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(0);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    expect(screen.getByTestId('notification-bell-btn')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    });
  });

  it('opens dropdown panel on click and displays notification list', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(1);
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    const bellBtn = screen.getByTestId('notification-bell-btn');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText(/1 unread/i)).toBeInTheDocument();

    const items = screen.getAllByTestId('notification-item');
    expect(items).toHaveLength(2);

    expect(screen.getByText(/Application Status: Shortlisted/i)).toBeInTheDocument();
    expect(screen.getByText(/Frontend Engineer at Google/i)).toBeInTheDocument();
    expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
  });

  it('displays empty state when user has no notifications', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(0);
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      notifications: [],
      unreadCount: 0,
      pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('empty-notifications')).toBeInTheDocument();
    });

    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
  });

  it('allows marking a single notification as read', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(1);
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
    });
    vi.spyOn(notifApi, 'markNotificationAsRead').mockResolvedValue({
      ...sampleNotifications[0],
      isRead: true,
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mark-read-btn')).toBeInTheDocument();
    });

    const markBtn = screen.getByTestId('mark-read-btn');
    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(notifApi.markNotificationAsRead).toHaveBeenCalledWith('notif_1');
    });

    // Badge should disappear as unread count hits 0
    await waitFor(() => {
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    });
  });

  it('allows marking all notifications as read', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(1);
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
    });
    vi.spyOn(notifApi, 'markAllNotificationsAsRead').mockResolvedValue(1);

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('mark-all-read-btn')).toBeInTheDocument();
    });

    const markAllBtn = screen.getByTestId('mark-all-read-btn');
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(notifApi.markAllNotificationsAsRead).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    });
  });

  it('navigates to /applications when an application notification item is clicked', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(1);
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
    });
    vi.spyOn(notifApi, 'markNotificationAsRead').mockResolvedValue({
      ...sampleNotifications[0],
      isRead: true,
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    await waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
    });

    const firstItem = screen.getAllByTestId('notification-item')[0];
    fireEvent.click(firstItem);

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/applications');
    });
  });

  it('closes dropdown when Escape key is pressed', async () => {
    vi.spyOn(notifApi, 'getUnreadNotificationCount').mockResolvedValue(0);
    vi.spyOn(notifApi, 'getNotifications').mockResolvedValue({
      notifications: [],
      unreadCount: 0,
      pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
    });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });
});
