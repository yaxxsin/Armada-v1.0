import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, apiPost } from '../api/client';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const response = await api('/auth/me');
      setUser(response.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void check();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [check]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiPost('/auth/login', { email, password });
    setUser(response.user || null);
    return response.user as AuthUser;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string, accessCode?: string) => {
    const response = await apiPost('/auth/register', {
      email,
      password,
      name,
      inviteCode: accessCode,
      bootstrapToken: accessCode,
    });
    // Registration creates the account, but the user must still sign in.
    return response.user as AuthUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout', {});
    } catch {
      // A local logout still succeeds when the session has already expired.
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
