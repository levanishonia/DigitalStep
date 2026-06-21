export type MarketingChannel = 'instagram' | 'facebook' | 'email' | 'website' | 'in_store';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type ContentType = 'post' | 'story' | 'reel' | 'campaign' | 'offer';
export type ContentStatus = 'draft' | 'planned' | 'published';
export type TaskPriority = 'low' | 'medium' | 'high';
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
