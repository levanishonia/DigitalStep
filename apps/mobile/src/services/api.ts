export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://digitalstepapi-production.up.railway.app';

export type AuthUser = { id: string; name: string; email: string };
export type AuthResponse = { token: string; user: AuthUser };

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message ?? 'Something went wrong. Please try again.');
  }
  return body as T;
}

export function register(input: { name: string; email: string; password: string }) {
  return api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function login(input: { email: string; password: string }) {
  return api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}
