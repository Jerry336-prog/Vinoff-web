import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';
import { unwrapApiList } from '../utils/apiResponse';

export const AnnouncementContext = createContext({
  activeAnnouncements: [],
  modalAnnouncement: null,
  loading: false,
  fetchActiveAnnouncements: async () => {},
  dismissModalAnnouncement: async () => {},
});

export const AnnouncementProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [activeAnnouncements, setActiveAnnouncements] = useState([]);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchActiveAnnouncements = useCallback(async () => {
    if (!user) {
      setActiveAnnouncements([]);
      setModalAnnouncement(null);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/api/announcements/active');
      const list = unwrapApiList(res);
      const items = Array.isArray(list) ? list : [];
      setActiveAnnouncements(items);

      // Pick the highest priority non-dismissed announcement for the popup modal
      const pendingModal = items.find((item) => !item.isDismissedByMe);
      setModalAnnouncement(pendingModal || null);
    } catch (err) {
      if (err.status !== 401 && err.status !== 403) {
        console.warn('Failed to fetch active announcements:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActiveAnnouncements();
  }, [fetchActiveAnnouncements]);

  const dismissModalAnnouncement = async (announcementId) => {
    if (!announcementId) return;

    try {
      await api.post(`/api/announcements/${announcementId}/dismiss`);
      setActiveAnnouncements((prev) =>
        prev.map((item) =>
          item._id === announcementId ? { ...item, isDismissedByMe: true } : item
        )
      );

      // Check if there is another non-dismissed announcement waiting
      const remaining = activeAnnouncements.filter(
        (item) => item._id !== announcementId && !item.isDismissedByMe
      );
      setModalAnnouncement(remaining.length > 0 ? remaining[0] : null);
    } catch (err) {
      console.error('Failed to dismiss announcement modal:', err);
      // Close modal locally even if network fails
      setModalAnnouncement(null);
    }
  };

  const value = {
    activeAnnouncements,
    modalAnnouncement,
    loading,
    fetchActiveAnnouncements,
    dismissModalAnnouncement,
  };

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
};

export default AnnouncementProvider;
