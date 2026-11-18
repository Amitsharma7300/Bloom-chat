import crypto from 'node:crypto';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db, id, now } from './database.js';
import { isPremium, type UserRow } from './domain.js';
import type { AuthenticatedRequest } from './auth.js';

type AdConfig = {
  enabled: number; male_interval: number; female_interval: number; other_interval: number;
  android_unit_id: string; ios_unit_id: string; updated_at: string;
};
type AdState = { completed_since_ad: number; pending_ticket_id: string | null; last_clear_at: string | null; last_blocked_at: string | null };
const proofSecret = process.env.AD_PROBE_SECRET || crypto.randomBytes(32).toString('hex');
const checkLifetimeMs = 5 * 60 * 1000;

function config() {
  return db.prepare('SELECT * FROM ad_config WHERE id=1').get() as AdConfig;
}

function state(userId: string) {
  db.prepare('INSERT OR IGNORE INTO ad_user_state (user_id) VALUES (?)').run(userId);
  return db.prepare('SELECT * FROM ad_user_state WHERE user_id=?').get(userId) as AdState;
}

function intervalFor(user: UserRow, settings = config()) {
  return user.gender === 'Man' ? settings.male_interval : user.gender === 'Woman' ? settings.female_interval : settings.other_interval;
}

function signedProof(userId: string, channel: string, nonce: string, issuedAt: number) {
  return crypto.createHmac('sha256', proofSecret).update(`${userId}:${channel}:${nonce}:${issuedAt}`).digest('hex');
}

function validProof(userId: string, channel: string, nonce: string, proof: string | undefined) {
  if (!proof) return false;
  const [issuedText, signature] = proof.split('.');
  const issuedAt = Number(issuedText);
  if (!Number.isSafeInteger(issuedAt) || Math.abs(Date.now() - issuedAt) > 120_000 || !/^[a-f0-9]{64}$/.test(signature ?? '')) return false;
  const expected = Buffer.from(signedProof(userId, channel, nonce, issuedAt), 'hex');
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

function authenticated(request: Request) {
  return (request as AuthenticatedRequest).user;
}

export function adAccessForMatch(user: UserRow): 'allowed' | 'check_required' | 'blocked' {
  if (!config().enabled || isPremium(user)) return 'allowed';
  const current = state(user.id);
  const clearTime = current.last_clear_at ? Date.parse(current.last_clear_at) : 0;
  const blockedTime = current.last_blocked_at ? Date.parse(current.last_blocked_at) : 0;
  if (blockedTime > clearTime) return 'blocked';
  return clearTime && Date.now() - clearTime <= checkLifetimeMs ? 'allowed' : 'check_required';
}

export function adStatus(user: UserRow) {
  const settings = config();
  const current = state(user.id);
  const premium = isPremium(user);
  return {
    enabled: Boolean(settings.enabled), premium,
    frequency: intervalFor(user, settings), completedSinceAd: current.completed_since_ad,
    due: Boolean(settings.enabled && !premium && current.pending_ticket_id),
    ticketId: settings.enabled && !premium ? current.pending_ticket_id : null,
    androidUnitId: settings.android_unit_id,
    iosUnitId: settings.ios_unit_id,
  };
}

// Only an explicit end of a meaningful session counts. Disconnects and cancelled searches do not call this.
export function recordCompletedConversation(conversationId: string, userIds: string[]) {
  const settings = config();
  if (!settings.enabled) return [] as string[];
  const conversation = db.prepare('SELECT created_at FROM conversations WHERE id=?').get(conversationId) as { created_at: string } | undefined;
  if (!conversation) return [];
  const durationMs = Date.now() - Date.parse(conversation.created_at);
  const messages = (db.prepare("SELECT COUNT(*) AS count FROM messages WHERE conversation_id=? AND type IN ('text','image','call')").get(conversationId) as { count: number }).count;
  if (durationMs < 15_000 || (messages === 0 && durationMs < 60_000)) return [];
  return db.transaction(() => {
    const newlyDue: string[] = [];
    for (const userId of userIds) {
      const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId) as UserRow | undefined;
      if (!user || isPremium(user)) continue;
      const inserted = db.prepare('INSERT OR IGNORE INTO ad_session_completions (user_id, conversation_id, created_at) VALUES (?, ?, ?)').run(userId, conversationId, now());
      if (!inserted.changes) continue;
      const current = state(userId);
      const completed = current.completed_since_ad + 1;
      if (completed >= intervalFor(user, settings) && !current.pending_ticket_id) {
        const ticketId = id('adt');
        db.prepare('INSERT INTO ad_tickets (id, user_id, created_at) VALUES (?, ?, ?)').run(ticketId, userId, now());
        db.prepare('UPDATE ad_user_state SET completed_since_ad=?, pending_ticket_id=? WHERE user_id=?').run(completed, ticketId, userId);
        newlyDue.push(userId);
      } else {
        db.prepare('UPDATE ad_user_state SET completed_since_ad=? WHERE user_id=?').run(completed, userId);
      }
    }
    return newlyDue;
  })();
}

export function clearAdStateOnPremium(userId: string) {
  db.transaction(() => {
    const current = state(userId);
    if (current.pending_ticket_id) db.prepare("UPDATE ad_tickets SET status='cancelled' WHERE id=? AND status='pending'").run(current.pending_ticket_id);
    db.prepare('UPDATE ad_user_state SET completed_since_ad=0, pending_ticket_id=NULL WHERE user_id=?').run(userId);
  })();
}

export const advertisingApi = Router();

advertisingApi.get('/status', (request, response) => {
  response.setHeader('Cache-Control', 'private, no-store');
  response.json(adStatus(authenticated(request)));
});

advertisingApi.get('/probe/:channel/:nonce', (request, response) => {
  const channel = request.params.channel;
  const nonce = request.params.nonce;
  if (!['display', 'video'].includes(channel) || !/^[A-Za-z0-9_-]{16,80}$/.test(nonce)) return response.status(400).json({ error: 'Invalid probe' });
  const issuedAt = Date.now();
  response.setHeader('Cache-Control', 'no-store');
  response.json({ proof: `${issuedAt}.${signedProof(authenticated(request).id, channel, nonce, issuedAt)}` });
});

advertisingApi.post('/check', (request, response) => {
  const body = z.object({
    nonce: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),
    displayProof: z.string().max(100).optional(), videoProof: z.string().max(100).optional(),
    displayFailure: z.enum(['network', 'timeout', 'http', 'none']).optional(),
    videoFailure: z.enum(['network', 'timeout', 'http', 'none']).optional(),
    checkpoint: z.enum(['terms', 'gender', 'launch', 'start_chat', 'resume', 'retry']),
  }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid ad check' });
  const user = authenticated(request);
  if (!config().enabled) return response.json({ outcome: 'disabled', allowed: true });
  const premium = isPremium(user);
  const displayValid = validProof(user.id, 'display', body.data.nonce, body.data.displayProof);
  const videoValid = validProof(user.id, 'video', body.data.nonce, body.data.videoProof);
  const blocked = !premium && !displayValid && !videoValid &&
    ['network', 'timeout'].includes(body.data.displayFailure ?? '') && ['network', 'timeout'].includes(body.data.videoFailure ?? '');
  const outcome = premium ? 'premium' : displayValid && videoValid ? 'clear' : blocked ? 'blocked' : 'inconclusive';
  const evidence = { display: displayValid ? 'ok' : body.data.displayFailure ?? 'missing', video: videoValid ? 'ok' : body.data.videoFailure ?? 'missing' };
  db.transaction(() => {
    db.prepare('INSERT INTO ad_detection_events (id, user_id, outcome, checkpoint, evidence, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id('ade'), user.id, outcome, body.data.checkpoint, JSON.stringify(evidence), now());
    state(user.id);
    if (outcome === 'clear' || outcome === 'inconclusive') db.prepare('UPDATE ad_user_state SET last_clear_at=?, last_blocked_at=NULL WHERE user_id=?').run(now(), user.id);
    if (outcome === 'blocked') db.prepare('UPDATE ad_user_state SET last_blocked_at=? WHERE user_id=?').run(now(), user.id);
  })();
  response.json({ outcome, allowed: outcome !== 'blocked', expiresInSeconds: outcome === 'clear' ? checkLifetimeMs / 1000 : 0 });
});

advertisingApi.post('/attempts', (request, response) => {
  const body = z.object({ ticketId: z.string().min(1).max(80) }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid ad ticket' });
  const user = authenticated(request);
  if (!config().enabled || isPremium(user)) return response.status(403).json({ error: 'Ads are unavailable' });
  const ticket = db.prepare("SELECT id FROM ad_tickets WHERE id=? AND user_id=? AND status='pending'").get(body.data.ticketId, user.id);
  if (!ticket || state(user.id).pending_ticket_id !== body.data.ticketId) return response.status(404).json({ error: 'Ad ticket not found' });
  const recent = db.prepare("SELECT id FROM ad_attempts WHERE ticket_id=? AND status='started' AND created_at>?").get(body.data.ticketId, new Date(Date.now() - 90_000).toISOString());
  if (recent) return response.status(409).json({ error: 'Ad attempt already in progress' });
  const attemptId = id('ada');
  db.prepare('INSERT INTO ad_attempts (id, ticket_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(attemptId, body.data.ticketId, user.id, now());
  response.status(201).json({ attemptId });
});

advertisingApi.patch('/attempts/:attemptId', (request, response) => {
  const body = z.object({ result: z.enum(['failed', 'impression']), errorCode: z.string().max(60).optional() }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid ad result' });
  const user = authenticated(request);
  const result = db.transaction(() => {
    const attempt = db.prepare("SELECT a.ticket_id FROM ad_attempts a JOIN ad_tickets t ON t.id=a.ticket_id WHERE a.id=? AND a.user_id=? AND a.status='started' AND t.status='pending'")
      .get(request.params.attemptId, user.id) as { ticket_id: string } | undefined;
    if (!attempt) return false;
    db.prepare('UPDATE ad_attempts SET status=?, error_code=?, completed_at=? WHERE id=?').run(body.data.result, body.data.errorCode ?? null, now(), request.params.attemptId);
    if (body.data.result === 'impression') {
      db.prepare("UPDATE ad_tickets SET status='served', served_at=? WHERE id=?").run(now(), attempt.ticket_id);
      db.prepare('UPDATE ad_user_state SET completed_since_ad=0, pending_ticket_id=NULL WHERE user_id=? AND pending_ticket_id=?').run(user.id, attempt.ticket_id);
    }
    return true;
  })();
  if (!result) return response.status(409).json({ error: 'Ad attempt is no longer active' });
  response.json({ status: body.data.result, ad: adStatus(user) });
});

export function authorizeAdmin(request: Request, response: Response, next: () => void) {
  const configured = process.env.ADMIN_API_KEY;
  if (!configured || configured.length < 32) return response.status(503).json({ error: 'Admin dashboard is not configured' });
  const supplied = request.header('x-admin-key') ?? '';
  const a = Buffer.from(configured); const b = Buffer.from(supplied);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return response.status(401).json({ error: 'Invalid admin key' });
  next();
}

export const adminAdvertisingApi = Router();
adminAdvertisingApi.use(authorizeAdmin);

adminAdvertisingApi.get('/summary', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.json({
    config: config(),
    stats: {
      requests: (db.prepare('SELECT COUNT(*) AS n FROM ad_attempts').get() as { n: number }).n,
      impressions: (db.prepare("SELECT COUNT(*) AS n FROM ad_attempts WHERE status='impression'").get() as { n: number }).n,
      failures: (db.prepare("SELECT COUNT(*) AS n FROM ad_attempts WHERE status='failed'").get() as { n: number }).n,
      blockedChecks: (db.prepare("SELECT COUNT(*) AS n FROM ad_detection_events WHERE outcome='blocked'").get() as { n: number }).n,
      premiumUsers: (db.prepare('SELECT COUNT(*) AS n FROM users WHERE premium_until>?').get(now()) as { n: number }).n,
    },
    attempts: db.prepare('SELECT id, user_id, status, error_code, created_at FROM ad_attempts ORDER BY created_at DESC LIMIT 50').all(),
    detections: db.prepare('SELECT id, user_id, outcome, checkpoint, evidence, created_at FROM ad_detection_events ORDER BY created_at DESC LIMIT 50').all(),
    catalog: db.prepare('SELECT * FROM ad_detection_catalog ORDER BY category, name').all(),
    plans: db.prepare('SELECT * FROM premium_plans ORDER BY id').all(),
    subscriptions: db.prepare('SELECT user_id, provider, plan, status, expires_at, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 50').all(),
  });
});

adminAdvertisingApi.patch('/config', (request, response) => {
  const body = z.object({
    enabled: z.boolean().optional(), maleInterval: z.number().int().min(1).max(20).optional(),
    femaleInterval: z.number().int().min(1).max(20).optional(), otherInterval: z.number().int().min(1).max(20).optional(),
    androidUnitId: z.string().max(80).optional(), iosUnitId: z.string().max(80).optional(),
  }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid ad settings' });
  const current = config();
  const android = body.data.androidUnitId ?? current.android_unit_id;
  const ios = body.data.iosUnitId ?? current.ios_unit_id;
  const validUnit = (value: string) => !value || /^ca-app-pub-\d{16}\/\d{10}$/.test(value);
  if (!validUnit(android) || !validUnit(ios)) return response.status(400).json({ error: 'Invalid AdMob unit ID' });
  if (process.env.NODE_ENV === 'production' && (body.data.enabled ?? Boolean(current.enabled)) && !android && !ios) return response.status(400).json({ error: 'Configure a production AdMob unit before enabling ads' });
  db.prepare('UPDATE ad_config SET enabled=?, male_interval=?, female_interval=?, other_interval=?, android_unit_id=?, ios_unit_id=?, updated_at=? WHERE id=1')
    .run(Number(body.data.enabled ?? Boolean(current.enabled)), body.data.maleInterval ?? current.male_interval,
      body.data.femaleInterval ?? current.female_interval, body.data.otherInterval ?? current.other_interval, android, ios, now());
  response.json({ config: config() });
});

adminAdvertisingApi.put('/plans/:planId', (request, response) => {
  const body = z.object({ label: z.string().trim().min(2).max(40), productId: z.string().max(100), priceLabel: z.string().max(40), enabled: z.boolean() }).safeParse(request.body);
  if (!body.success || !['weekly', 'monthly'].includes(request.params.planId)) return response.status(400).json({ error: 'Invalid plan' });
  db.prepare('INSERT INTO premium_plans (id, label, product_id, price_label, enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET label=excluded.label, product_id=excluded.product_id, price_label=excluded.price_label, enabled=excluded.enabled, updated_at=excluded.updated_at')
    .run(request.params.planId, body.data.label, body.data.productId, body.data.priceLabel, Number(body.data.enabled), now());
  response.json({ plan: db.prepare('SELECT * FROM premium_plans WHERE id=?').get(request.params.planId) });
});

adminAdvertisingApi.post('/catalog', (request, response) => {
  const body = z.object({ name: z.string().trim().min(2).max(80), category: z.enum(['dns', 'app', 'browser', 'vpn']) }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid catalog entry' });
  const entryId = id('adc');
  try { db.prepare('INSERT INTO ad_detection_catalog (id, name, category, updated_at) VALUES (?, ?, ?, ?)').run(entryId, body.data.name, body.data.category, now()); }
  catch { return response.status(409).json({ error: 'Catalog entry already exists' }); }
  response.status(201).json({ entry: db.prepare('SELECT * FROM ad_detection_catalog WHERE id=?').get(entryId) });
});

adminAdvertisingApi.patch('/catalog/:entryId', (request, response) => {
  const body = z.object({ enabled: z.boolean() }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid catalog change' });
  const changed = db.prepare('UPDATE ad_detection_catalog SET enabled=?, updated_at=? WHERE id=?').run(Number(body.data.enabled), now(), request.params.entryId);
  if (!changed.changes) return response.status(404).json({ error: 'Catalog entry not found' });
  response.json({ entry: db.prepare('SELECT * FROM ad_detection_catalog WHERE id=?').get(request.params.entryId) });
});

export function serveAdvertisingAdmin(_request: Request, response: Response) {
  response.setHeader('Cache-Control', 'no-store');
  response.sendFile(path.resolve(process.cwd(), 'public/admin-ads.html'));
}
