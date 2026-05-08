import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken } from '../services/api';

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  bio: string;
  avatar: string;
  avatar_url: string;   // alias — both returned by the API
  coverImage: string;
  cover_image_url: string; // alias
  mbti: string;
  isPrivate?: boolean;
  followers: number;
  following: number;
  isFollowing: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; fullName: string; mbti?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (u: AppUser) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('aura_token');
    if (!token) { setLoading(false); return; }
    api.get<{ user: AppUser }>('/auth/me')
      .then(d => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: AppUser }>('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload: { username: string; email: string; password: string; fullName: string; mbti?: string }) => {
    const data = await api.post<{ token: string; user: AppUser }>('/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateUser = useCallback((u: AppUser) => setUser(u), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
