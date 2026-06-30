import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, AuthUser, LoginRequest } from '../types/auth';
import { login as loginApi, logout as logoutApi } from '../api/authApi';
import {
  clearAuthStorage,
  getRefreshToken,
  getAccessToken,
  getSavedUser,
  saveAuthData,
} from './tokenStorage';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthResponseToUser(response: AuthResponse): AuthUser {
  return {
    userId: response.userId,
    email: response.email,
    fullName: response.fullName,
    roles: response.roles,
    engineerPublicId: response.engineerPublicId,
    profilePhotoUrl: response.profilePhotoUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getSavedUser());
  const queryClient = useQueryClient();

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,

async login(request: LoginRequest) {
  const response = await loginApi(request);
  const authUser = mapAuthResponseToUser(response);

const canAccessDashboard = authUser.roles.some((role) => {
  const normalizedRole = role.toLowerCase();

  return normalizedRole === 'admin' || normalizedRole === 'manager';
});

if (!canAccessDashboard) {
  throw new Error('DASHBOARD_ACCESS_DENIED');
}
  saveAuthData(response.token, response.refreshToken, authUser);

  setUser(authUser);
},

      async logout() {
        const refreshToken = getRefreshToken();

        clearAuthStorage();
        setUser(null);
        queryClient.clear();

        if (refreshToken) {
          try {
            await logoutApi(refreshToken);
          } catch {
            // Ignore logout API errors because local logout already happened.
          }
        }
      },

      updateUser(updates: Partial<AuthUser>) {
        setUser((prev) => {
          if (!prev) return null;
          const updatedUser = { ...prev, ...updates };
          const token = getAccessToken() || '';
          const refreshToken = getRefreshToken() || '';
          saveAuthData(token, refreshToken, updatedUser);
          return updatedUser;
        });
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}