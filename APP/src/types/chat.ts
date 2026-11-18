export type Gender = 'Woman' | 'Man' | 'Other';
export type ChatMode = 'Text' | 'Voice' | 'Video';

export interface Partner {
  id: string; name: string; avatar: string; country: string; city: string; flag: string; age: number;
  gender: Gender; language: string; level: number; verified: boolean; about: string; interests: string[];
  bloomId?: string; isDemo?: boolean; online?: boolean;
}

export interface SessionUser extends Partner {
  bloomId: string;
  points: number;
  premium: boolean;
  premiumUntil: string | null;
  theme: 'light' | 'dark';
  fontScale: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'location' | 'points' | 'call';
  text: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  oneView?: boolean;
  viewedAt?: string | null;
}

export interface ConversationSummary {
  id: string;
  partner: Partner;
  lastMessage: string | null;
  updatedAt: string;
  endedAt: string | null;
}
