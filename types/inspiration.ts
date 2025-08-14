export interface MoodBoard {
  id: string;
  name: string;
  type: 'wedding-day' | 'reception' | 'engagement' | 'custom';
  images: string[];
  vibes: string[];
  createdAt: Date;
  vibeInputMethod?: string; // How vibes were created (pills, image, pinterest)
}

export interface UserPlan {
  tier: 'free' | 'premium' | 'pro';
  maxBoards: number;
  maxImagesPerBoard: number;
  maxStorageMB: number;
  features: string[];
}

export interface BoardTemplate {
  type: 'wedding-day' | 'reception' | 'engagement' | 'custom';
  name: string;
  icon: string;
  description: string;
}

// Plan configurations
export const PLAN_LIMITS: Record<string, UserPlan> = {
  free: {
    tier: 'free',
    maxBoards: 2,
    maxImagesPerBoard: 10,
    maxStorageMB: 25,
    features: ['basic-vibes', 'mood-boards']
  },
  premium: {
    tier: 'premium',
    maxBoards: 5,
    maxImagesPerBoard: 25,
    maxStorageMB: 250,
    features: ['basic-vibes', 'mood-boards', 'advanced-ai', 'pinterest']
  },
  pro: {
    tier: 'pro',
    maxBoards: 999, // Unlimited
    maxImagesPerBoard: 100,
    maxStorageMB: 1000,
    features: ['basic-vibes', 'mood-boards', 'advanced-ai', 'pinterest', 'priority-support']
  }
};

// Board templates
export const BOARD_TEMPLATES: BoardTemplate[] = [
  { type: 'wedding-day', name: 'Wedding Day', icon: '💒', description: 'Ceremony and formal aesthetics' },
  { type: 'reception', name: 'Reception', icon: '🎉', description: 'Party atmosphere and decor' },
  { type: 'engagement', name: 'Engagement Photos', icon: '💍', description: 'Pre-wedding style and locations' },
  { type: 'custom', name: 'Custom Board', icon: '✨', description: 'Your unique vision' }
];
