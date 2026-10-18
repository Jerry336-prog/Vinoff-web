import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loading: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export const NotificationProvider = ({ children }) => {
  const { user, refreshUser } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await api.get('/api/notifications');
      const data = res?.data || res;
      if (data) {
        const rawItems = data.items || data;
        const normalizedItems = (Array.isArray(rawItems) ? rawItems : []).map((n) => {
          const isReadState = Boolean(n.isRead || n.read);
          return {
            ...n,
            isRead: isReadState,
            read: isReadState,
          };
        });
        const computedUnread = normalizedItems.filter((n) => !n.isRead).length;
        setNotifications(normalizedItems);
        setUnreadCount(
          typeof data.unreadCount === 'number' ? data.unreadCount : computedUnread
        );

        // If there is a recent unread VIP_CREDIT_UPDATED or INVOICE notification, refresh user state
        const hasCreditSignal = normalizedItems.some(
          (n) =>
            !n.isRead &&
            (n.type === 'VIP_CREDIT_UPDATED' ||
              n.type === 'INVOICE_ISSUED' ||
              n.type === 'PAYMENT_CONFIRMED')
        );
        if (hasCreditSignal) {
          refreshUser?.();
        }
      }
    } catch (err) {
      // Avoid spamming logs if unauthenticated
      if (err.status !== 401 && err.status !== 403) {
        console.warn('Failed to fetch notifications:', err.message);
      }
    }
  }, [user, refreshUser]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    // Poll every 15 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchNotifications, user]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
