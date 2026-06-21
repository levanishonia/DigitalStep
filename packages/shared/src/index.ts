export type MarketingChannel = 'instagram' | 'facebook' | 'email' | 'website' | 'in_store';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type ContentStatus = 'idea' | 'draft' | 'scheduled' | 'published';
export type CampaignStatus = 'planned' | 'active' | 'paused' | 'completed';

export interface AuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const appName = 'DigitalStep';
