import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isBootstrapped: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  setBootstrapped: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isBootstrapped: false,
      setSession: (token, user) => {
        localStorage.setItem('tempo.token', token);
        set({ token, user });
      },
      clearSession: () => {
        localStorage.removeItem('tempo.token');
        set({ token: null, user: null });
      },
      setBootstrapped: (value) => set({ isBootstrapped: value }),
    }),
    {
      name: 'tempo-auth-store',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
