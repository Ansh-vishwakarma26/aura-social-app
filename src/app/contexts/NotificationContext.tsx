import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  markAsRead: () => void;
  fetchUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  const fetchUnreadCount = useCallback(() => {
    if (!user) return;
    api.get<{ count: number }>('/notifications/unread-count')
      .then(d => setUnreadCount(d.count))
      .catch(() => {});
  }, [user]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Fetch unread count periodically and on mount
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // 30 seconds
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user, fetchUnreadCount]);

  // Reset count when visiting the notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      markAsRead();
    }
  }, [location.pathname, markAsRead]);

  return (
    <NotificationContext.Provider value={{ unreadCount, markAsRead, fetchUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
