import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiError, AuthResponse, AuthUser, getMe, login as loginRequest, register as registerRequest } from '../services/api';

const TOKEN_KEY = 'digitalstep.authToken';

type AuthContextValue = {
  isInitializing: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  hasBusiness: boolean | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function isSecureStoreAvailable() {
  return Platform.OS !== 'web' && await SecureStore.isAvailableAsync();
}

async function getStoredToken() {
  if (await isSecureStoreAvailable()) return SecureStore.getItemAsync(TOKEN_KEY);
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setStoredToken(token: string) {
  if (await isSecureStoreAvailable()) return SecureStore.setItemAsync(TOKEN_KEY, token);
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

async function deleteStoredToken() {
  if (await isSecureStoreAvailable()) return SecureStore.deleteItemAsync(TOKEN_KEY);
  return AsyncStorage.removeItem(TOKEN_KEY);
}

async function persistAuth(response: AuthResponse) {
  await setStoredToken(response.token);
}

function isInvalidTokenError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);

  useEffect(() => {
    async function restoreAuth() {
      try {
        const storedToken = await getStoredToken();
        if (!storedToken) return;

        const me = await getMe(storedToken);
        setToken(storedToken);
        setUser(me.user);
        setHasBusiness(me.businesses.length > 0);
      } catch (error) {
        if (isInvalidTokenError(error)) {
          await deleteStoredToken();
        }
        setToken(null);
        setUser(null);
        setHasBusiness(null);
      } finally {
        setIsInitializing(false);
      }
    }

    restoreAuth();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isInitializing,
    isAuthenticated: Boolean(token),
    token,
    user,
    hasBusiness,
    async login(input) {
      const response = await loginRequest(input);
      await persistAuth(response);
      const me = await getMe(response.token);
      setToken(response.token);
      setUser(me.user);
      setHasBusiness(me.businesses.length > 0);
    },
    async register(input) {
      const response = await registerRequest(input);
      await persistAuth(response);
      setToken(response.token);
      setUser(response.user);
      setHasBusiness(false);
    },
    async logout() {
      await deleteStoredToken();
      setToken(null);
      setUser(null);
      setHasBusiness(null);
    }
  }), [hasBusiness, isInitializing, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
