import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, AuthUser, login as loginRequest, register as registerRequest } from '../services/api';

const TOKEN_KEY = 'digitalstep.authToken';

type AuthContextValue = {
  isInitializing: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistAuth(response: AuthResponse) {
  await SecureStore.setItemAsync(TOKEN_KEY, response.token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((storedToken) => setToken(storedToken))
      .finally(() => setIsInitializing(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isInitializing,
    isAuthenticated: Boolean(token),
    token,
    user,
    async login(input) {
      const response = await loginRequest(input);
      await persistAuth(response);
      setToken(response.token);
      setUser(response.user);
    },
    async register(input) {
      const response = await registerRequest(input);
      await persistAuth(response);
      setToken(response.token);
      setUser(response.user);
    },
    async logout() {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }), [isInitializing, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
