'use client';

import { create } from 'zustand';
import api from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,

  setAuth: (user, token) => {
    if (user.role !== 'admin') {
      return;
    }
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    set({ user, token, loading: false });
  },

  logout: async () => {
    try {
      await api.post('/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({ user: null, token: null, loading: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/user');
      const user = data.data;
      if (user.role !== 'admin') {
        get().logout();
        return;
      }
      localStorage.setItem('admin_user', JSON.stringify(user));
      set({ user, loading: false });
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      set({ user: null, token: null, loading: false });
    }
  },

  hydrate: () => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        if (user.role !== 'admin') {
          set({ loading: false });
          return;
        }
        set({ user, token, loading: false });
        get().fetchUser();
      } catch {
        set({ loading: false });
      }
    } else {
      set({ loading: false });
    }
  },
}));
