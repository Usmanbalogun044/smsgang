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
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, loading: false });
  },

  logout: async () => {
    try {
      await api.post('/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, loading: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/user');
      const user = data.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, loading: false });
    }
  },

  hydrate: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
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
