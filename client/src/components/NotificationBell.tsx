import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationItem,
} from '../api/notifications';

/**
 * Format timestamp into readable relative time or date string.
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll / fetch unread count on mount
  useEffect(() => {
    let isMounted = true;

    const fetchCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (isMounted) {
          setUnreadCount(count);
        }
      } catch (err) {
        // Silently catch error if unauthenticated or network failure
        console.debug('Failed to fetch unread notification count', err);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch full notifications list when dropdown is opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    getNotifications({ limit: 15 })
      .then((res) => {
        if (isMounted) {
          setNotifications(res.notifications);
          setUnreadCount(res.unreadCount);
        }
      })
      .catch((err) => {
        console.error('Failed to load notifications', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.debug('Failed to mark notification as read upon click', err);
      }
    }

    setIsOpen(false);

    // If related application or listing exists, navigate to appropriate page
    if (notification.application) {
      navigate('/applications');
    } else if (notification.listing) {
      const listingId =
        typeof notification.listing === 'object'
          ? notification.listing.id
          : notification.listing;
      navigate(`/listings/${listingId}`);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
        data-testid="notification-bell-btn"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold text-white bg-rose-600 rounded-full leading-none shadow-sm"
            data-testid="unread-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
          data-testid="notification-dropdown"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition"
                data-testid="mark-all-read-btn"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 px-4 text-center text-slate-500"
                data-testid="empty-notifications"
              >
                <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Updates on your applications and listings will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start space-x-3 ${
                    !item.isRead ? 'bg-blue-50/50' : 'bg-white'
                  }`}
                  data-testid="notification-item"
                >
                  {/* Unread dot */}
                  <div className="mt-1 flex-shrink-0">
                    {!item.isRead ? (
                      <span className="block w-2 h-2 rounded-full bg-blue-600" />
                    ) : (
                      <span className="block w-2 h-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs ${
                        !item.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-400">
                      <span>{formatRelativeTime(item.createdAt)}</span>
                      {item.application && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 inline-flex items-center">
                            View Application <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Single Mark as Read button */}
                  {!item.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, item.id)}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200/50 rounded transition flex-shrink-0"
                      data-testid="mark-read-btn"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
