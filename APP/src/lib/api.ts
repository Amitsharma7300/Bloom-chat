import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ChatMessage, ConversationSummary, Partner, SessionUser } from '../types/chat';
import type { MatchPreference } from '../components/MatchPreferenceModal';

const TOKEN_KEY = 'bloom_api_token';
type IceServerConfig = { urls: string | string[]; username?: string; credential?: string };
const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const API_ORIGINS = [...new Set([configuredUrl ?? (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000'), ...(Platform.OS === 'android' ? ['http://10.0.2.2:5000'] : [])])];
let activeApiOrigin = API_ORIGINS[0];
const realtimeSockets = new Set<WebSocket>();
const pendingRealtimeEvents: unknown[] = [];

async function getToken() { return Platform.OS === 'web' ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY); }
async function setToken(token: string) { if (Platform.OS === 'web') await AsyncStorage.setItem(TOKEN_KEY, token); else await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }); }
async function removeToken() { if (Platform.OS === 'web') await AsyncStorage.removeItem(TOKEN_KEY); else await SecureStore.deleteItemAsync(TOKEN_KEY); }

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}, requiresAuth = true): Promise<T> {
  const token = requiresAuth ? await getToken() : null;
  for (const origin of [activeApiOrigin, ...API_ORIGINS.filter((candidate) => candidate !== activeApiOrigin)]) {
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), path.endsWith('/images') || path.endsWith('/image') || path.endsWith('/view') || path.startsWith('/creator/selfie') || path.startsWith('/creator/otp-photo') ? 40_000 : 5000);
    try {
      response = await fetch(`${origin}/api/v1${path}`, {
        ...init,
        signal: controller.signal,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
      });
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
    activeApiOrigin = origin;
    const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(payload?.error ?? 'Bloom service is unavailable', response.status, payload?.code);
    return payload as T;
  }
  throw new ApiError('Could not connect to Bloom. Check your network and try again.', 0);
}

export async function getCurrentUser() {
  const token = await getToken();
  if (!token) return null;
  try { return (await request<{ user: SessionUser }>('/me')).user; }
  catch (error) { if (error instanceof ApiError && error.status === 401) { await removeToken(); return null; } throw error; }
}
export async function updatePreferences(preferences: { theme?: 'light' | 'dark'; fontScale?: number }) {
  return (await request<{ user: SessionUser }>('/me/preferences', { method: 'PATCH', body: JSON.stringify(preferences) })).user;
}

export async function getIceServers() {
  return (await request<{ iceServers: IceServerConfig[] }>('/rtc/ice-servers')).iceServers;
}

export async function createSession(gender: 'Man' | 'Woman') {
  const result = await request<{ token: string; user: SessionUser }>('/sessions', { method: 'POST', body: JSON.stringify({ termsAccepted: true, gender }) }, false);
  await setToken(result.token);
  return result.user;
}

export async function clearApiSession() { await removeToken(); }
export async function getPeople() { return (await request<{ people: Partner[] }>('/people')).people; }
export async function getFriends() { return (await request<{ friends: Partner[] }>('/friends')).friends; }
export async function getFriendRequests() { return request<{ incoming: Partner[]; outgoing: string[] }>('/friend-requests'); }
export async function acceptFriendRequest(senderId: string) { return request<{ friend: Partner }>(`/friend-requests/${senderId}/accept`, { method: 'POST' }); }
export async function declineFriendRequest(senderId: string) { return request<null>(`/friend-requests/${senderId}`, { method: 'DELETE' }); }
export async function getConversations() { return (await request<{ conversations: ConversationSummary[] }>('/conversations')).conversations; }

export async function createMatch(preference: MatchPreference) {
  return request<{ waiting: true } | { conversationId: string; partner: Partner; user: SessionUser }>('/matches', { method: 'POST', body: JSON.stringify({ preference }) });
}
export async function leaveMatchQueue() { return request<null>('/matches/waiting', { method: 'DELETE' }); }
export async function endMatch(conversationId: string) { return request<null>(`/matches/${conversationId}/end`, { method: 'POST' }); }

export type AdStatus = { enabled: boolean; premium: boolean; frequency: number; completedSinceAd: number; due: boolean; ticketId: string | null; androidUnitId: string; iosUnitId: string };
export type AdCheckpoint = 'terms' | 'gender' | 'launch' | 'start_chat' | 'resume' | 'retry';
export async function getAdStatus() { return request<AdStatus>('/ads/status'); }
export async function checkAdsBeforeRegistration() {
  const status = await request<{ enabled: boolean }>('/ads/preflight/status', {}, false);
  if (!status.enabled) return true;
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const results = await Promise.allSettled(['display', 'video'].map((channel) => request<{ ok: boolean }>(`/ads/preflight/probe/${channel}/${nonce}`, {}, false)));
  return results.some((result) => result.status === 'fulfilled' && result.value.ok);
}
export async function checkAdDelivery(checkpoint: AdCheckpoint) {
  const status = await getAdStatus();
  if (!status.enabled || status.premium) return { allowed: true, outcome: status.premium ? 'premium' : 'disabled' };
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const probe = async (channel: 'display' | 'video') => {
    try { return { proof: (await request<{ proof: string }>(`/ads/probe/${channel}/${nonce}`)).proof, failure: 'none' as const }; }
    catch (error) { return { proof: undefined, failure: error instanceof ApiError && error.status === 0 ? 'network' as const : 'http' as const }; }
  };
  const [display, video] = await Promise.all([probe('display'), probe('video')]);
  return request<{ allowed: boolean; outcome: string }>('/ads/check', { method: 'POST', body: JSON.stringify({ nonce, displayProof: display.proof, videoProof: video.proof, displayFailure: display.failure, videoFailure: video.failure, checkpoint }) });
}
export async function startAdAttempt(ticketId: string) { return request<{ attemptId: string }>('/ads/attempts', { method: 'POST', body: JSON.stringify({ ticketId }) }); }
export async function finishAdAttempt(attemptId: string, result: 'failed' | 'impression', errorCode?: string) {
  return request<{ status: string; ad: AdStatus }>(`/ads/attempts/${attemptId}`, { method: 'PATCH', body: JSON.stringify({ result, errorCode }) });
}

export type CreatorOverview = {
  application: { id: string; status: 'selfie_required' | 'otp_required' | 'under_review' | 'approved' | 'rejected'; submittedAt: string | null; reviewerNote: string | null } | null;
  verificationAvailable: boolean;
  wallet: { purchasedCoins: number; earnedCoins: number; totalCoins: number; eligibleCoins: number };
  config: { coinName: string; rupeesPerCoin: number; minTopupRupees: number; minWithdrawalCoins: number; creatorSharePercent: number };
  packages: { coins: number; enabled: number; android_product_id: string; ios_product_id: string }[];
  transactions: { id: string; type: string; purchasedDelta: number; earnedDelta: number; createdAt: string }[];
  withdrawals: { id: string; coins: number; payoutPaise: number; commissionPaise: number; status: string; createdAt: string; note: string | null }[];
};
export async function getCreatorOverview() { return request<CreatorOverview>('/creator/overview'); }
export async function applyCreator() { return request('/creator/apply', { method: 'POST', body: JSON.stringify({ biometricConsent: true }) }); }
export async function submitCreatorSelfie(image: string) { return request('/creator/selfie', { method: 'POST', body: JSON.stringify({ image }) }); }
export async function generateCreatorCode() { return request<{ code: string; expiresAt: string }>('/creator/otp', { method: 'POST' }); }
export async function submitCreatorCodePhoto(image: string) { return request('/creator/otp-photo', { method: 'POST', body: JSON.stringify({ image }) }); }
export async function transferCoins(recipientBloomId: string, amount: number, clientRequestId: string) { return request('/creator/coins/transfer', { method: 'POST', body: JSON.stringify({ recipientBloomId, amount, clientRequestId }) }); }
export async function requestCreatorWithdrawal(coins: number, clientRequestId: string) { return request('/creator/withdrawals', { method: 'POST', body: JSON.stringify({ coins, clientRequestId }) }); }

export async function openConversation(partnerId: string) {
  return request<{ conversationId: string; partner: Partner }>('/conversations', { method: 'POST', body: JSON.stringify({ partnerId }) });
}

export async function getMessages(conversationId: string) {
  return (await request<{ messages: ChatMessage[] }>(`/conversations/${conversationId}/messages`)).messages;
}

export async function sendMessage(conversationId: string, type: ChatMessage['type'], text: string, metadata: Record<string, unknown> = {}, oneView = false) {
  return (await request<{ message: ChatMessage }>(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ type, text, metadata, oneView }) })).message;
}
export async function viewOneViewMessage(conversationId: string, messageId: string) {
  return request<{ text: string; metadata: Record<string, unknown>; image: string | null }>(`/conversations/${conversationId}/messages/${messageId}/view`, { method: 'POST' });
}
export async function sendImage(conversationId: string, image: string, oneView = false) {
  return (await request<{ message: ChatMessage }>(`/conversations/${conversationId}/images`, { method: 'POST', body: JSON.stringify({ image, oneView }) })).message;
}
export async function getImage(conversationId: string, messageId: string) {
  return (await request<{ image: string }>(`/conversations/${conversationId}/messages/${messageId}/image`)).image;
}

export async function addFriend(partnerId: string) { return request<{ friend: Partner; status: 'pending' | 'friends' }>(`/friends/${partnerId}`, { method: 'POST' }); }
export async function blockUser(partnerId: string) { return request<null>(`/blocks/${partnerId}`, { method: 'POST' }); }
export async function likeUser(partnerId: string, kind: 'like' | 'super') { return request<{ liked: boolean; mutual: boolean }>(`/likes/${partnerId}`, { method: 'POST', body: JSON.stringify({ kind }) }); }
export async function transferPoints(recipientId: string, amount: number) { return (await request<{ user: SessionUser }>('/points/transfer', { method: 'POST', body: JSON.stringify({ recipientId, amount }) })).user; }
export async function reportUser(reportedId: string, conversationId: string, reason: string) { return request<{ reported: true }>('/reports', { method: 'POST', body: JSON.stringify({ reportedId, conversationId, reason }) }); }
export function connectRealtime(onEvent: (event: any) => void) {
  let socket: WebSocket | null = null;
  let disposed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const connect = async () => {
    const token = await getToken();
    if (!token || disposed) return;
    const wsOrigin = activeApiOrigin.replace(/^http/, 'ws');
    socket = new WebSocket(`${wsOrigin}/ws?token=${encodeURIComponent(token)}`);
    socket.onopen = () => {
      realtimeSockets.add(socket!);
      while (pendingRealtimeEvents.length && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(pendingRealtimeEvents.shift()));
    };
    socket.onmessage = (event) => { try { onEvent(JSON.parse(event.data)); } catch { /* ignore malformed server event */ } };
    socket.onclose = () => { realtimeSockets.delete(socket!); if (!disposed) reconnectTimer = setTimeout(() => { void connect(); }, 2000); };
  };
  void connect();
  return () => { disposed = true; if (reconnectTimer) clearTimeout(reconnectTimer); if (socket) realtimeSockets.delete(socket); socket?.close(); };
}

export function sendRealtime(event: unknown) {
  const socket = [...realtimeSockets].find((connection) => connection.readyState === WebSocket.OPEN);
  if (socket) socket.send(JSON.stringify(event));
  else pendingRealtimeEvents.push(event);
}
