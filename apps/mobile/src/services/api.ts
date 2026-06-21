export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://digitalstepapi-production.up.railway.app';

export type AuthUser = { id: string; name: string; email: string };
export type AuthResponse = { token: string; user: AuthUser };
export type MarketingChannel = 'instagram' | 'facebook' | 'email' | 'website' | 'in_store';
export type ContentType = 'post' | 'story' | 'reel' | 'campaign' | 'offer';
export type ContentStatus = 'draft' | 'planned' | 'published';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type Business = {
  id: string;
  name: string;
  industry: string;
  audience: string;
  location?: string | null;
  primaryGoal: string;
  channels: MarketingChannel[];
};
export type MeResponse = { user: AuthUser; businesses: Business[] };
export type BusinessInput = {
  name: string;
  industry: string;
  audience: string;
  location?: string;
  primaryGoal: string;
  channels: MarketingChannel[];
};
export type TaskInput = { title: string; description?: string; dueDate?: string; status: TaskStatus; priority: TaskPriority };
export type Task = TaskInput & { id: string; description?: string | null; dueDate?: string | null };
export type ContentItemInput = { title: string; description?: string; type: ContentType; channel: MarketingChannel; status: ContentStatus; publishDate?: string };
export type ContentItem = ContentItemInput & { id: string; description?: string | null; publishDate?: string | null; scheduledFor?: string | null; notes?: string | null };
export type Campaign = { id: string; name: string; objective: string; status: 'planned' | 'active' | 'paused' | 'completed'; startDate?: string | null; endDate?: string | null };
export type Recommendation = { id: string; title: string; description: string; priority: number };
export type DashboardResponse = { business: Business | null; tasks: Task[]; contentItems: ContentItem[]; campaigns: Campaign[]; recommendations: Recommendation[] };

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

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
  if (!response.ok) throw new ApiError(body?.message ?? 'Something went wrong. Please try again.', response.status);
  return body as T;
}

export function register(input: { name: string; email: string; password: string }) { return api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }); }
export function login(input: { email: string; password: string }) { return api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }); }
export function getMe(token: string) { return api<MeResponse>('/me', {}, token); }
export function getBusinesses(token: string) { return api<{ businesses: Business[] }>('/businesses', {}, token); }
export function createBusiness(input: BusinessInput, token: string) { return api<{ business: Business }>('/businesses', { method: 'POST', body: JSON.stringify(input) }, token); }
export function getDashboard(token: string) { return api<DashboardResponse>('/dashboard', {}, token); }
export function getTasks(token: string, filters: { status?: TaskStatus | 'all' } = {}) {
  const query = filters.status && filters.status !== 'all' ? `?status=${filters.status}` : '';
  return api<{ tasks: Task[] }>(`/tasks${query}`, {}, token);
}
export function createTask(input: TaskInput, token: string) { return api<{ task: Task }>('/tasks', { method: 'POST', body: JSON.stringify(input) }, token); }
export function updateTask(id: string, input: TaskInput, token: string) { return api<{ task: Task }>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(input) }, token); }
export function deleteTask(id: string, token: string) { return api<void>(`/tasks/${id}`, { method: 'DELETE' }, token); }
export function getContentItems(token: string, filters: { status?: ContentStatus | 'all'; type?: ContentType | 'all' } = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  const query = params.toString();
  return api<{ contentItems: ContentItem[] }>(`/content-items${query ? `?${query}` : ''}`, {}, token);
}
export function createContentItem(input: ContentItemInput, token: string) { return api<{ contentItem: ContentItem }>('/content-items', { method: 'POST', body: JSON.stringify(input) }, token); }
export function updateContentItem(id: string, input: ContentItemInput, token: string) { return api<{ contentItem: ContentItem }>(`/content-items/${id}`, { method: 'PUT', body: JSON.stringify(input) }, token); }
export function deleteContentItem(id: string, token: string) { return api<void>(`/content-items/${id}`, { method: 'DELETE' }, token); }
