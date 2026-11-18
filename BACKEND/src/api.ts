import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from './auth.js';
import { CHAT_LIFETIME_MS, db, id, now, tokenHash } from './database.js';
import { isPremium, privateUser, publicUser, type UserRow } from './domain.js';
import { createMessage, expireChats, isMatching, isUserOnline, leaveMatchQueue, matchingConversation, publishToUser, queueMatch, releaseMatch, reserveMatch, waitingUsers } from './realtime.js';
import { adAccessForMatch, advertisingApi, clearAdStateOnPremium, recordCompletedConversation } from './advertising.js';
import { coinBillingApi, creatorApi } from './creator.js';

export const api = Router();

const sessionSchema = z.object({
  termsAccepted: z.literal(true),
  gender: z.enum(['Man', 'Woman', 'Other']),
  name: z.string().trim().min(2).max(24).optional(),
});

const messageSchema = z.object({
  type: z.enum(['text', 'image', 'location', 'points', 'call']).default('text'),
  text: z.string().trim().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  oneView: z.boolean().default(false),
});

function parse<T>(schema: z.ZodType<T>, value: unknown, response: Response): T | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    response.status(400).json({ error: 'Invalid request', details: result.error.flatten() });
    return undefined;
  }
  return result.data;
}

function userById(userId: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;
}

function auth(request: Request) {
  return (request as AuthenticatedRequest).user;
}

function refreshUser(userId: string) {
  return userById(userId) as UserRow;
}

function newBloomId() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `BLOOM-${crypto.randomInt(100000, 1000000)}`;
    if (!db.prepare('SELECT 1 FROM users WHERE bloom_id = ?').get(candidate)) return candidate;
  }
  throw new Error('Unable to allocate a Bloom ID');
}

function serializeMessage(row: Record<string, unknown>) {
  return { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, type: row.type, text: row.text, metadata: JSON.parse(String(row.metadata)), oneView: Boolean(row.one_view), viewedAt: row.viewed_at, createdAt: row.created_at };
}

api.post('/sessions', (request, response) => {
  const body = parse(sessionSchema, request.body, response);
  if (!body) return;
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const userId = id('usr');
  const timestamp = now();
  const bloomId = newBloomId();
  const name = body.name ?? `Bloom ${bloomId.slice(-4)}`;
  const avatar = `bloom-avatar://${body.gender.toLowerCase()}/${body.gender === 'Other' ? 0 : Number.parseInt(userId.slice(-1), 16) % 2}`;
  db.prepare(`INSERT INTO users (id, token_hash, bloom_id, name, avatar, gender, interests, points, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '[]', 120, ?, ?)`)
    .run(userId, tokenHash(rawToken), bloomId, name, avatar, body.gender, timestamp, timestamp);
  response.status(201).json({ token: rawToken, user: privateUser(refreshUser(userId)) });
});

// Billing providers authenticate with a server secret, not a user's session token.
api.post('/billing/webhook', (request, response) => {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  const supplied = request.header('x-bloom-billing-secret') ?? '';
  if (!secret || secret.length < 32 || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
      !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) return response.status(401).json({ error: 'Invalid billing signature' });
  const body = parse(z.object({ userId: z.string(), provider: z.string(), plan: z.string(), externalId: z.string(), status: z.enum(['active', 'cancelled', 'expired']), expiresAt: z.string().datetime().nullable() }), request.body, response); if (!body) return;
  const user = userById(body.userId); if (!user) return response.status(404).json({ error: 'User not found' });
  db.transaction(() => {
    db.prepare('INSERT INTO subscriptions (id, user_id, provider, plan, status, external_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id('sub'), body.userId, body.provider, body.plan, body.status, body.externalId, body.expiresAt, now());
    db.prepare('UPDATE users SET premium_until=?, updated_at=? WHERE id=?').run(body.status === 'active' ? body.expiresAt : null, now(), body.userId);
    if (body.status === 'active' && body.expiresAt && Date.parse(body.expiresAt) > Date.now()) clearAdStateOnPremium(body.userId);
  })();
  response.json({ received: true });
});
api.use('/coins/billing', coinBillingApi);

// Before registration there is no user identity for a persistent check.
api.get('/ads/preflight/status', (_request, response) => response.json({ enabled: Boolean((db.prepare('SELECT enabled FROM ad_config WHERE id=1').get() as { enabled: number }).enabled) }));
api.get('/ads/preflight/probe/:channel/:nonce', (request, response) => {
  if (!['display', 'video'].includes(request.params.channel) || !/^[A-Za-z0-9_-]{16,80}$/.test(request.params.nonce)) return response.status(400).json({ error: 'Invalid probe' });
  response.setHeader('Cache-Control', 'no-store');
  response.json({ ok: true });
});

api.use(authenticate);
api.use((_request, _response, next) => { expireChats(); next(); });
api.use('/ads', advertisingApi);
api.use('/creator', creatorApi);

api.get('/me', (request, response) => response.json({ user: privateUser(auth(request)) }));
api.patch('/me/preferences', (request, response) => {
  const body = parse(z.object({ theme: z.enum(['light', 'dark']).optional(), fontScale: z.number().min(0.8).max(1.5).optional() }).refine((value) => value.theme !== undefined || value.fontScale !== undefined), request.body, response);
  if (!body) return;
  const user = auth(request);
  db.prepare('UPDATE users SET theme=?, font_scale=?, updated_at=? WHERE id=?').run(body.theme ?? user.theme, body.fontScale ?? user.font_scale, now(), user.id);
  response.json({ user: privateUser(refreshUser(user.id)) });
});

api.get('/rtc/ice-servers', (request, response) => {
  const user = auth(request);
  const iceServers: { urls: string | string[]; username?: string; credential?: string }[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const turnUrls = process.env.TURN_URL?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  const turnSecret = process.env.TURN_SHARED_SECRET;
  if (turnUrls.length && turnSecret) {
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
    const username = `${expiresAt}:${user.id}`;
    const credential = crypto.createHmac('sha1', turnSecret).update(username).digest('base64');
    iceServers.push({ urls: turnUrls, username, credential });
  }
  response.json({ iceServers });
});

api.patch('/me', (request, response) => {
  const body = parse(z.object({ name: z.string().trim().min(2).max(24).optional(), about: z.string().trim().max(280).optional(), interests: z.array(z.string().trim().min(1).max(30)).max(8).optional(), city: z.string().trim().max(50).optional(), country: z.string().trim().max(50).optional(), language: z.string().trim().max(40).optional() }), request.body, response);
  if (!body) return;
  const user = auth(request);
  const next = { name: body.name ?? user.name, about: body.about ?? user.about, interests: JSON.stringify(body.interests ?? JSON.parse(user.interests)), city: body.city ?? user.city, country: body.country ?? user.country, language: body.language ?? user.language };
  db.prepare('UPDATE users SET name=?, about=?, interests=?, city=?, country=?, language=?, updated_at=? WHERE id=?').run(next.name, next.about, next.interests, next.city, next.country, next.language, now(), user.id);
  response.json({ user: privateUser(refreshUser(user.id)) });
});

api.get('/people', (request, response) => {
  const user = auth(request);
  const query = String(request.query.query ?? '').trim().toLowerCase();
  const gender = String(request.query.gender ?? 'All');
  const realMembersOnly = process.env.NODE_ENV === 'production' ? 'AND u.is_demo = 0' : '';
  const rows = db.prepare(`SELECT * FROM users u WHERE u.id <> @userId ${realMembersOnly}
    AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE user_id = @userId)
    AND u.id NOT IN (SELECT user_id FROM blocks WHERE blocked_id = @userId)
    AND NOT EXISTS (SELECT 1 FROM friends f WHERE f.user_id = @userId AND f.friend_id = u.id AND f.approved_at IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM conversations c WHERE (c.user_a = @userId AND c.user_b = u.id) OR (c.user_b = @userId AND c.user_a = u.id))
    ORDER BY u.is_demo ASC, u.updated_at DESC LIMIT 100`).all({ userId: user.id }) as UserRow[];
  const people = rows.filter((person) => (gender === 'All' || person.gender === gender) && (!query || `${person.name} ${person.country} ${person.city} ${person.interests}`.toLowerCase().includes(query))).map((person) => ({ ...publicUser(person), online: isUserOnline(person.id) }));
  response.json({ people });
});

api.post('/matches', (request, response) => {
  const body = parse(z.object({ preference: z.enum(['Random', 'Male', 'Female']) }), request.body, response);
  if (!body) return;
  const user = auth(request);
  if (!isUserOnline(user.id)) return response.status(409).json({ error: 'Connect to live matching before searching' });
  const activeId = matchingConversation(user.id);
  if (activeId) {
    const active = db.prepare('SELECT user_a, user_b FROM conversations WHERE id = ? AND ended_at IS NULL').get(activeId) as { user_a: string; user_b: string } | undefined;
    if (active) return response.json({ conversationId: activeId, partner: publicUser(userById(active.user_a === user.id ? active.user_b : active.user_a) as UserRow), user: privateUser(user) });
    releaseMatch(activeId);
  }
  const adAccess = adAccessForMatch(user);
  if (adAccess === 'blocked') return response.status(403).json({ error: 'Advertisement delivery is blocked. Retry the ad check or use Premium.', code: 'AD_BLOCKED' });
  if (adAccess === 'check_required') return response.status(428).json({ error: 'Check advertisement delivery before starting a chat', code: 'AD_CHECK_REQUIRED' });
  const gender = body.preference === 'Male' ? 'Man' : body.preference === 'Female' ? 'Woman' : null;
  if (gender && !isPremium(user) && user.points < 50) return response.status(402).json({ error: 'Premium or 50 Bloom points required', code: 'PREMIUM_REQUIRED' });
  const queued = waitingUsers().find(([candidateId, entry]) => {
    if (candidateId === user.id || !isUserOnline(candidateId) || isMatching(candidateId)) return false;
    const candidate = userById(candidateId);
    if (!candidate || candidate.is_demo || (gender && candidate.gender !== gender)) return false;
    if (entry.preference !== 'Random' && !isPremium(candidate) && candidate.points < 50) return false;
    if (entry.preference === 'Male' && user.gender !== 'Man') return false;
    if (entry.preference === 'Female' && user.gender !== 'Woman') return false;
    return !db.prepare('SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(user.id, candidateId, candidateId, user.id);
  });
  if (!queued) {
    queueMatch(user.id, body.preference);
    return response.status(202).json({ waiting: true });
  }
  const partner = userById(queued[0]) as UserRow;
  const conversationId = id('con');
  db.transaction(() => {
    if (gender && !isPremium(user)) db.prepare('UPDATE users SET points = points - 50, updated_at = ? WHERE id = ?').run(now(), user.id);
    if (queued[1].preference !== 'Random' && !isPremium(partner)) db.prepare('UPDATE users SET points = points - 50, updated_at = ? WHERE id = ?').run(now(), partner.id);
    db.prepare('INSERT INTO conversations (id, user_a, user_b, created_at) VALUES (?, ?, ?, ?)').run(conversationId, user.id, partner.id, now());
  })();
  reserveMatch(user.id, partner.id, conversationId);
  publishToUser(partner.id, { type: 'match.invite', conversationId, fromUserId: user.id, at: now() });
  response.status(201).json({ conversationId, partner: publicUser(partner), user: privateUser(refreshUser(user.id)) });
});

api.delete('/matches/waiting', (request, response) => {
  leaveMatchQueue(auth(request).id);
  response.status(204).end();
});

api.post('/matches/:conversationId/end', (request, response) => {
  const user = auth(request);
  const conversation = db.prepare('SELECT user_a, user_b FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)').get(request.params.conversationId, user.id, user.id) as { user_a: string; user_b: string } | undefined;
  if (!conversation) return response.status(404).json({ error: 'Match not found' });
  const ended = db.prepare('UPDATE conversations SET ended_at = ? WHERE id = ? AND ended_at IS NULL').run(now(), request.params.conversationId);
  if (ended.changes) {
    for (const dueUserId of recordCompletedConversation(request.params.conversationId, [conversation.user_a, conversation.user_b])) {
      publishToUser(dueUserId, { type: 'ad.due', at: now() });
    }
  }
  releaseMatch(request.params.conversationId);
  publishToUser(conversation.user_a === user.id ? conversation.user_b : conversation.user_a, { type: 'match.ended', conversationId: request.params.conversationId, at: now() });
  response.status(204).end();
});

api.get('/friends', (request, response) => {
  const rows = db.prepare('SELECT u.* FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.approved_at IS NOT NULL ORDER BY f.approved_at DESC').all(auth(request).id) as UserRow[];
  response.json({ friends: rows.map((person) => ({ ...publicUser(person), online: isUserOnline(person.id) })) });
});

api.get('/friend-requests', (request, response) => {
  const user = auth(request);
  const incoming = db.prepare('SELECT u.* FROM friend_requests r JOIN users u ON u.id = r.sender_id WHERE r.receiver_id = ? ORDER BY r.created_at DESC').all(user.id) as UserRow[];
  const outgoing = db.prepare('SELECT receiver_id FROM friend_requests WHERE sender_id = ?').all(user.id) as { receiver_id: string }[];
  response.json({ incoming: incoming.map((person) => ({ ...publicUser(person), online: isUserOnline(person.id) })), outgoing: outgoing.map((row) => row.receiver_id) });
});

api.post('/friends/:friendId', (request, response) => {
  const user = auth(request); const friend = userById(request.params.friendId);
  if (!friend || friend.id === user.id) return response.status(404).json({ error: 'Person not found' });
  if (db.prepare('SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(user.id, friend.id, friend.id, user.id)) return response.status(403).json({ error: 'Friend request unavailable' });
  if (db.prepare('SELECT 1 FROM friends WHERE user_id=? AND friend_id=? AND approved_at IS NOT NULL').get(user.id, friend.id)) return response.json({ status: 'friends', friend: publicUser(friend) });
  const timestamp = now();
  db.prepare('INSERT OR IGNORE INTO friend_requests (sender_id, receiver_id, created_at) VALUES (?, ?, ?)').run(user.id, friend.id, timestamp);
  publishToUser(friend.id, { type: 'friend.requested', fromUserId: user.id, at: timestamp });
  response.status(201).json({ status: 'pending', friend: publicUser(friend) });
});

api.post('/friend-requests/:senderId/accept', (request, response) => {
  const user = auth(request); const sender = userById(request.params.senderId);
  if (!sender || !db.prepare('SELECT 1 FROM friend_requests WHERE sender_id=? AND receiver_id=?').get(sender.id, user.id)) return response.status(404).json({ error: 'Friend request not found' });
  const timestamp = now();
  db.transaction(() => {
    db.prepare('DELETE FROM friend_requests WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)').run(sender.id, user.id, user.id, sender.id);
    db.prepare('INSERT INTO friends (user_id, friend_id, created_at, approved_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, friend_id) DO UPDATE SET approved_at=excluded.approved_at').run(user.id, sender.id, timestamp, timestamp);
    db.prepare('INSERT INTO friends (user_id, friend_id, created_at, approved_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, friend_id) DO UPDATE SET approved_at=excluded.approved_at').run(sender.id, user.id, timestamp, timestamp);
  })();
  publishToUser(sender.id, { type: 'friend.added', friend: publicUser(user), at: timestamp });
  response.json({ friend: publicUser(sender) });
});

api.delete('/friend-requests/:senderId', (request, response) => {
  const user = auth(request);
  db.prepare('DELETE FROM friend_requests WHERE sender_id=? AND receiver_id=?').run(request.params.senderId, user.id);
  response.status(204).end();
});

api.delete('/friends/:friendId', (request, response) => {
  const user = auth(request);
  db.transaction(() => {
    db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(user.id, request.params.friendId);
    db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(request.params.friendId, user.id);
    db.prepare('DELETE FROM friend_requests WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)').run(user.id, request.params.friendId, request.params.friendId, user.id);
  })();
  response.status(204).end();
});

api.post('/blocks/:blockedId', (request, response) => {
  const user = auth(request); const blocked = userById(request.params.blockedId);
  if (!blocked || blocked.id === user.id) return response.status(404).json({ error: 'Person not found' });
  const timestamp = now();
  db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?)').run(user.id, blocked.id, timestamp);
    db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(user.id, blocked.id, blocked.id, user.id);
    db.prepare('DELETE FROM friend_requests WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)').run(user.id, blocked.id, blocked.id, user.id);
    db.prepare('UPDATE conversations SET ended_at = ? WHERE ended_at IS NULL AND ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?))').run(timestamp, user.id, blocked.id, blocked.id, user.id);
  })();
  const activeConversation = db.prepare('SELECT id FROM conversations WHERE ended_at = ? AND ((user_a=? AND user_b=?) OR (user_a=? AND user_b=?)) ORDER BY created_at DESC LIMIT 1').get(timestamp, user.id, blocked.id, blocked.id, user.id) as { id: string } | undefined;
  if (activeConversation) releaseMatch(activeConversation.id);
  publishToUser(blocked.id, { type: 'conversation.blocked', byUserId: user.id, at: timestamp });
  response.status(204).end();
});

api.post('/likes/:likedId', (request, response) => {
  const body = parse(z.object({ kind: z.enum(['like', 'super']) }), request.body, response); if (!body) return;
  const user = auth(request); const liked = userById(request.params.likedId);
  if (!liked) return response.status(404).json({ error: 'Person not found' });
  if (body.kind === 'super' && !isPremium(user)) return response.status(402).json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' });
  db.prepare(`INSERT INTO likes (user_id, liked_id, kind, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, liked_id) DO UPDATE SET kind=excluded.kind, created_at=excluded.created_at`).run(user.id, liked.id, body.kind, now());
  response.status(201).json({ liked: true, mutual: Boolean(db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND liked_id = ?').get(liked.id, user.id)) });
});

api.post('/points/transfer', (request, response) => {
  const body = parse(z.object({ recipientId: z.string().min(1), amount: z.number().int().min(1).max(1000) }), request.body, response); if (!body) return;
  const sender = auth(request); const recipient = userById(body.recipientId);
  if (!recipient || recipient.id === sender.id) return response.status(404).json({ error: 'Recipient not found' });
  if (sender.points < body.amount) return response.status(409).json({ error: 'Insufficient points' });
  db.transaction(() => {
    db.prepare('UPDATE users SET points=points-?, updated_at=? WHERE id=?').run(body.amount, now(), sender.id);
    db.prepare('UPDATE users SET points=points+?, updated_at=? WHERE id=?').run(body.amount, now(), recipient.id);
  })();
  publishToUser(recipient.id, { type: 'points.received', fromUser: publicUser(sender), amount: body.amount, at: now() });
  response.json({ user: privateUser(refreshUser(sender.id)) });
});

api.get('/conversations', (request, response) => {
  const user = auth(request);
  const rows = db.prepare(`SELECT c.*, CASE WHEN c.user_a = @id THEN c.user_b ELSE c.user_a END AS partner_id, (SELECT CASE WHEN m.one_view = 1 THEN 'One View message' ELSE m.text END FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message, (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at FROM conversations c WHERE c.created_at > @cutoff AND (c.user_a = @id OR c.user_b = @id) ORDER BY COALESCE(last_message_at, c.created_at) DESC`).all({ id: user.id, cutoff: new Date(Date.now() - CHAT_LIFETIME_MS).toISOString() }) as Record<string, unknown>[];
  response.json({ conversations: rows.map((row) => {
    const partner = userById(String(row.partner_id)) as UserRow;
    return { id: row.id, partner: { ...publicUser(partner), online: isUserOnline(partner.id) }, lastMessage: row.last_message ?? null, updatedAt: row.last_message_at ?? row.created_at, endedAt: row.ended_at };
  }) });
});

api.post('/conversations', (request, response) => {
  const body = parse(z.object({ partnerId: z.string().min(1) }), request.body, response); if (!body) return;
  const user = auth(request); const partner = userById(body.partnerId);
  if (!partner || partner.id === user.id) return response.status(404).json({ error: 'Person not found' });
  const blocked = db.prepare('SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').get(user.id, partner.id, partner.id, user.id);
  if (blocked) return response.status(403).json({ error: 'Conversation unavailable' });
  if (!db.prepare('SELECT 1 FROM friends WHERE user_id=? AND friend_id=? AND approved_at IS NOT NULL').get(user.id, partner.id)) return response.status(403).json({ error: 'Accept a friend request before starting a private chat' });
  const existing = db.prepare('SELECT id, ended_at FROM conversations WHERE created_at > ? AND ((user_a=? AND user_b=?) OR (user_a=? AND user_b=?)) ORDER BY created_at DESC LIMIT 1').get(new Date(Date.now() - CHAT_LIFETIME_MS).toISOString(), user.id, partner.id, partner.id, user.id) as { id: string; ended_at: string | null } | undefined;
  const conversationId = existing?.id ?? id('con');
  if (existing?.ended_at) db.prepare('UPDATE conversations SET ended_at = NULL WHERE id = ?').run(existing.id);
  if (!existing) db.prepare('INSERT INTO conversations (id, user_a, user_b, created_at) VALUES (?, ?, ?, ?)').run(conversationId, user.id, partner.id, now());
  response.status(existing ? 200 : 201).json({ conversationId, partner: publicUser(partner) });
});

api.get('/conversations/:conversationId/messages', (request, response) => {
  const user = auth(request); const conversation = db.prepare('SELECT 1 FROM conversations WHERE id=? AND created_at > ? AND (user_a=? OR user_b=?)').get(request.params.conversationId, new Date(Date.now() - CHAT_LIFETIME_MS).toISOString(), user.id, user.id);
  if (!conversation) return response.status(404).json({ error: 'Conversation not found' });
  const rows = db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 500').all(request.params.conversationId) as Record<string, unknown>[];
  response.json({ messages: rows.map(serializeMessage) });
});

api.post('/conversations/:conversationId/messages', (request, response) => {
  const body = parse(messageSchema, request.body, response); if (!body) return;
  try {
    const sender = auth(request); const result = createMessage(request.params.conversationId, sender, body.type, body.text, body.metadata, body.oneView);
    response.status(201).json({ message: result.message });
  } catch (error) {
    const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500;
    response.status(statusCode).json({ error: error instanceof Error ? error.message : 'Unable to send message' });
  }
});

api.post('/conversations/:conversationId/images', (request, response) => {
  const body = parse(z.object({ image: z.string().min(100).max(5_600_000), oneView: z.boolean().default(false) }), request.body, response);
  if (!body) return;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.image);
  if (!match) return response.status(400).json({ error: 'Unsupported image format' });
  const bytes = Buffer.from(match[2], 'base64');
  const signature = bytes.subarray(0, 12).toString('hex');
  const valid = match[1] === 'image/jpeg' ? signature.startsWith('ffd8ff') : match[1] === 'image/png' ? signature.startsWith('89504e470d0a1a0a') : signature.startsWith('52494646') && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid || bytes.length > 4_000_000 || bytes.length < 32) return response.status(400).json({ error: 'Invalid image' });
  try {
    const result = createMessage(request.params.conversationId, auth(request), 'image', 'Photo', {}, body.oneView, { mime: match[1], bytes });
    response.status(201).json({ message: result.message });
  } catch (error) {
    const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500;
    response.status(statusCode).json({ error: error instanceof Error ? error.message : 'Unable to send image' });
  }
});

api.get('/conversations/:conversationId/messages/:messageId/image', (request, response) => {
  const viewer = auth(request);
  const row = db.prepare(`SELECT media.mime, media.bytes FROM message_media media JOIN messages m ON m.id=media.message_id
    JOIN conversations c ON c.id=m.conversation_id WHERE m.id=? AND m.conversation_id=? AND m.one_view=0
    AND c.created_at>? AND (c.user_a=? OR c.user_b=?)`).get(request.params.messageId, request.params.conversationId, new Date(Date.now() - CHAT_LIFETIME_MS).toISOString(), viewer.id, viewer.id) as { mime: string; bytes: Buffer } | undefined;
  if (!row) return response.status(404).json({ error: 'Image unavailable' });
  response.setHeader('Cache-Control', 'private, no-store');
  response.json({ image: `data:${row.mime};base64,${row.bytes.toString('base64')}` });
});

api.post('/conversations/:conversationId/messages/:messageId/view', (request, response) => {
  const viewer = auth(request);
  const reveal = db.transaction(() => {
    const row = db.prepare(`SELECT m.*, c.user_a, c.user_b FROM messages m JOIN conversations c ON c.id=m.conversation_id
      WHERE m.id=? AND m.conversation_id=? AND m.one_view=1 AND m.viewed_at IS NULL AND c.created_at > ?
      AND (c.user_a=? OR c.user_b=?) AND m.sender_id<>?`).get(request.params.messageId, request.params.conversationId, new Date(Date.now() - CHAT_LIFETIME_MS).toISOString(), viewer.id, viewer.id, viewer.id) as Record<string, unknown> | undefined;
    if (!row) return null;
    const payload = db.prepare('SELECT text, metadata FROM one_view_payloads WHERE message_id=?').get(row.id) as { text: string; metadata: string } | undefined;
    if (!payload) return null;
    const media = db.prepare('SELECT mime, bytes FROM message_media WHERE message_id=?').get(row.id) as { mime: string; bytes: Buffer } | undefined;
    db.prepare('DELETE FROM one_view_payloads WHERE message_id=?').run(row.id);
    if (media) db.prepare('DELETE FROM message_media WHERE message_id=?').run(row.id);
    db.prepare('UPDATE messages SET viewed_at=? WHERE id=?').run(now(), row.id);
    return { text: payload.text, metadata: JSON.parse(payload.metadata), image: media ? `data:${media.mime};base64,${media.bytes.toString('base64')}` : null, senderId: row.sender_id };
  })();
  if (!reveal) return response.status(410).json({ error: 'One View content is no longer available' });
  publishToUser(String(reveal.senderId), { type: 'message.viewed', conversationId: request.params.conversationId, messageId: request.params.messageId, at: now() });
  response.setHeader('Cache-Control', 'no-store');
  response.json({ text: reveal.text, metadata: reveal.metadata, image: reveal.image });
});

api.post('/reports', (request, response) => {
  const body = parse(z.object({ reportedId: z.string().min(1), conversationId: z.string().optional(), reason: z.string().trim().min(3).max(200) }), request.body, response); if (!body) return;
  db.prepare('INSERT INTO reports (id, reporter_id, reported_id, conversation_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id('rep'), auth(request).id, body.reportedId, body.conversationId ?? null, body.reason, now());
  response.status(201).json({ reported: true });
});
