import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  businessId: string | null;
  roles: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;  // Memory-only — NOT persisted to localStorage (XSS protection)
  refreshToken: string | null; // Persisted so silent refresh works after page reload
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  primaryRole: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      hasRole: (role) => get().user?.roles.includes(role) ?? false,

      hasAnyRole: (roles) => roles.some((r) => get().user?.roles.includes(r)) ?? false,

      primaryRole: () => {
        const roles = get().user?.roles ?? [];
        const priority = ['admin', 'warehouse_manager', 'sales_executive', 'retailer'];
        return priority.find((r) => roles.includes(r)) ?? roles[0] ?? null;
      },
    }),
    {
      name: 'fdms-auth',
      // accessToken is intentionally excluded — it lives in memory only.
      // On page reload, the 401 → refresh flow in api.ts will obtain a new
      // access token using the persisted refreshToken.
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

