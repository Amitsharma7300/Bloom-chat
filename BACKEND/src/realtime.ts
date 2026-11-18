import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { CHAT_LIFETIME_MS, db, deleteExpiredChats, id, now } from './database.js';
import { userFromToken } from './auth.js';
import type { UserRow } from './domain.js';

const clients = new Map<string, Set<WebSocket>>();
const activeMatches = new Map<string, string>();
const waitingMatches = new Map<string, { preference: 'Random' | 'Male' | 'Female'; since: number }>();

export function waitingUsers() { return [...waitingMatches.entries()]; }
export function queueMatch(userId: string, preference: 'Random' | 'Male' | 'Female') { waitingMatches.set(userId, { preference, since: Date.now() }); }
export function leaveMatchQueue(userId: string) { waitingMatches.delete(userId); }

export function isMatching(userId: string) { return activeMatches.has(userId); }
export function matchingConversation(userId: string) { return activeMatches.get(userId); }
export function reserveMatch(userA: string, userB: string, conversationId: string) {
  leaveMatchQueue(userA);
  leaveMatchQueue(userB);
  activeMatches.set(userA, conversationId);
  activeMatches.set(userB, conversationId);
}
export function releaseMatch(conversationId: string) {
  for (const [userId, activeId] of activeMatches) if (activeId === conversationId) activeMatches.delete(userId);
}

export function expireChats() {
  for (const conversation of deleteExpiredChats()) {
    releaseMatch(conversation.id);
    publishToUser(conversation.user_a, { type: 'conversation.expired', conversationId: conversation.id, at: now() });
    publishToUser(conversation.user_b, { type: 'conversation.expired', conversationId: conversation.id, at: now() });
  }
}

function addClient(userId: string, socket: WebSocket) {
  const sockets = clients.get(userId) ?? new Set<WebSocket>();
  sockets.add(socket);
  clients.set(userId, sockets);
  socket.on('close', () => {
    sockets.delete(socket);
    if (!sockets.size) {
      clients.delete(userId);
      leaveMatchQueue(userId);
      const conversationId = activeMatches.get(userId);
      if (conversationId) {
        releaseMatch(conversationId);
        db.prepare('UPDATE conversations SET ended_at = ? WHERE id = ? AND ended_at IS NULL').run(now(), conversationId);
        const conversation = db.prepare('SELECT user_a, user_b FROM conversations WHERE id = ?').get(conversationId) as { user_a: string; user_b: string } | undefined;
        if (conversation) publishToUser(conversation.user_a === userId ? conversation.user_b : conversation.user_a, { type: 'match.ended', conversationId, at: now() });
      }
    }
  });
}

export function publishToUser(userId: string, event: unknown) {
  const payload = JSON.stringify(event);
  for (const socket of clients.get(userId) ?? []) {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  }
}

export function isUserOnline(userId: string) {
  return (clients.get(userId)?.size ?? 0) > 0;
}

function conversationForUser(conversationId: string, userId: string) {
  return db.prepare('SELECT * FROM conversations WHERE id = ? AND ended_at IS NULL AND created_at > ? AND (user_a = ? OR user_b = ?)').get(conversationId, new Date(Date.now() - CHAT_LIFETIME_MS).toISOString(), userId, userId) as { id: string; user_a: string; user_b: string } | undefined;
}

export function attachRealtime(server: Server) {
  const websocketServer = new WebSocketServer({ server, path: '/ws', maxPayload: 32_768 });
  websocketServer.on('connection', (socket, request) => {
    const url = new URL(request.url ?? '/ws', 'http://localhost');
    const user = userFromToken(url.searchParams.get('token'));
    if (!user) return socket.close(4001, 'Unauthorized');
    addClient(user.id, socket);
    socket.send(JSON.stringify({ type: 'connected', userId: user.id, at: now() }));

    socket.on('message', (raw) => {
      try {
        const event = JSON.parse(raw.toString()) as { type?: string; conversationId?: string; targetUserId?: string; payload?: unknown };
        if (!event.type?.startsWith('call.') || !event.conversationId || !event.targetUserId) return;
        const conversation = conversationForUser(event.conversationId, user.id);
        if (!conversation || ![conversation.user_a, conversation.user_b].includes(event.targetUserId)) return;
        publishToUser(event.targetUserId, { type: event.type, conversationId: event.conversationId, fromUserId: user.id, payload: event.payload, at: now() });
      } catch {
        socket.send(JSON.stringify({ type: 'error', error: 'Invalid realtime event' }));
      }
    });
  });
  return websocketServer;
}

export function createMessage(conversationId: string, sender: UserRow, type: 'text' | 'image' | 'location' | 'points' | 'call', text: string, metadata: object = {}, oneView = false, media?: { mime: string; bytes: Buffer }) {
  const conversation = conversationForUser(conversationId, sender.id);
  if (!conversation) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  const message = { id: id('msg'), conversationId, senderId: sender.id, type, text: oneView ? '' : text, metadata: oneView ? {} : metadata, oneView, viewedAt: null, createdAt: now() };
  db.transaction(() => {
    db.prepare('INSERT INTO messages (id, conversation_id, sender_id, type, text, metadata, created_at, one_view) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(message.id, conversationId, sender.id, type, message.text, JSON.stringify(message.metadata), message.createdAt, Number(oneView));
    if (oneView) db.prepare('INSERT INTO one_view_payloads (message_id, text, metadata) VALUES (?, ?, ?)').run(message.id, text, JSON.stringify(metadata));
    if (media) db.prepare('INSERT INTO message_media (message_id, mime, bytes) VALUES (?, ?, ?)').run(message.id, media.mime, media.bytes);
  })();
  const recipientId = conversation.user_a === sender.id ? conversation.user_b : conversation.user_a;
  publishToUser(recipientId, { type: 'message.created', message });
  return { message, recipientId };
}
