import { createContext } from 'react';

export type AuthUser = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  role?: 'admin' | 'user' | string | null;
} | null;

export type AuthContextValue = {
  user: AuthUser;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name?: string, accessCode?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
