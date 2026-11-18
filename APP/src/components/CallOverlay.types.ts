import type { ChatMode, Partner } from '../types/chat';

export type CallMode = Extract<ChatMode, 'Voice' | 'Video'>;
export type CallRequest = { id: number; mode: CallMode };
export type IncomingCall = { callId: string; mode: CallMode };

export interface CallOverlayProps {
  conversationId: string;
  currentUserId: string;
  partner: Partner;
  request: CallRequest | null;
  incoming: IncomingCall | null;
  onClose: () => void;
}
