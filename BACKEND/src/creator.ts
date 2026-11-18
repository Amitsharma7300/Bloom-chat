import crypto from 'node:crypto';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db, id, now } from './database.js';
import { authorizeAdmin } from './advertising.js';
import type { AuthenticatedRequest } from './auth.js';
import type { UserRow } from './domain.js';

type Application = { id: string; user_id: string; status: string; consent_at: string; selfie_encrypted: Buffer | null; otp_photo_encrypted: Buffer | null; selfie_result: string | null; otp_result: string | null; otp_hash: string | null; otp_encrypted: Buffer | null; otp_expires_at: string | null; otp_attempts: number; submitted_at: string | null; reviewed_at: string | null; reviewer_note: string | null; created_at: string; updated_at: string };
type Wallet = { user_id: string; purchased_coins: number; earned_coins: number };
type CoinConfig = { coin_name: string; rupees_per_coin: number; min_topup_rupees: number; min_withdrawal_coins: number; creator_share_percent: number };
const auth = (request: Request) => (request as AuthenticatedRequest).user;
const settings = () => db.prepare('SELECT * FROM coin_config WHERE id=1').get() as CoinConfig;
const application = (userId: string) => db.prepare('SELECT * FROM creator_applications WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(userId) as Application | undefined;
function wallet(userId: string) {
  db.prepare('INSERT OR IGNORE INTO coin_wallets (user_id) VALUES (?)').run(userId);
  return db.prepare('SELECT * FROM coin_wallets WHERE user_id=?').get(userId) as Wallet;
}
const approved = (userId: string) => application(userId)?.status === 'approved';
function safeApplication(row?: Application) {
  if (!row) return null;
  return { id: row.id, status: row.status, consentAt: row.consent_at, otpExpiresAt: row.otp_expires_at, submittedAt: row.submitted_at, reviewedAt: row.reviewed_at, reviewerNote: row.reviewer_note, selfieResult: row.selfie_result ? JSON.parse(row.selfie_result) : null, otpResult: row.otp_result ? JSON.parse(row.otp_result) : null };
}
function key() {
  const value = process.env.CREATOR_IMAGE_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) return null;
  return Buffer.from(value, 'hex');
}
function encrypt(bytes: Buffer) {
  const secret = key(); if (!secret) throw new Error('Creator photo encryption is not configured');
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
  return Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
}
function decrypt(bytes: Buffer) {
  const secret = key(); if (!secret) throw new Error('Creator photo encryption is not configured');
  const cipher = crypto.createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(bytes.length - 16));
  return Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]);
}
function photo(value: unknown) {
  if (typeof value !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value) || value.length > 5_500_000) return null;
  const bytes = Buffer.from(value.slice('data:image/jpeg;base64,'.length), 'base64');
  if (bytes.length < 15_000 || bytes.length > 4_000_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null;
  return bytes;
}
function photoUnused(bytes: Buffer) { return !db.prepare('SELECT 1 FROM creator_photo_fingerprints WHERE digest=?').get(crypto.createHash('sha256').update(bytes).digest('hex')); }
function rememberPhoto(bytes: Buffer, applicationId: string) { db.prepare('INSERT INTO creator_photo_fingerprints (digest,application_id,created_at) VALUES (?,?,?)').run(crypto.createHash('sha256').update(bytes).digest('hex'), applicationId, now()); }
function readyForVerification() { return Boolean(key() && process.env.CREATOR_VERIFY_URL && process.env.CREATOR_VERIFY_TOKEN); }
async function verifyPhoto(step: 'selfie' | 'otp', bytes: Buffer, code?: string, originalSelfie?: Buffer) {
  const url = process.env.CREATOR_VERIFY_URL!;
  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) throw new Error('Verification provider must use HTTPS');
  const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(25_000), headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.CREATOR_VERIFY_TOKEN}` }, body: JSON.stringify({ step, imageBase64: bytes.toString('base64'), referenceSelfieBase64: originalSelfie?.toString('base64'), expectedCode: code, requirements: { minFaceFrameFraction: 0.8, liveness: true, authenticity: true, sameFace: step === 'otp', handwrittenCode: step === 'otp' } }) });
  if (!response.ok) throw new Error('Verification provider is unavailable');
  const result = z.object({ faceDetected: z.boolean(), faceFrameFraction: z.number().min(0).max(1), livenessPassed: z.boolean(), authentic: z.boolean(), sameFace: z.boolean().optional(), handwrittenCode: z.string().optional(), faceAndCodeTogether: z.boolean().optional() }).parse(await response.json());
  const passed = result.faceDetected && result.faceFrameFraction >= 0.8 && result.livenessPassed && result.authentic && (step === 'selfie' || result.sameFace === true && result.faceAndCodeTogether === true && result.handwrittenCode === code);
  return { passed, result };
}
function record(userId: string, type: string, purchasedDelta: number, earnedDelta: number, relatedUserId: string | null, referenceId: string | null) {
  db.prepare('INSERT INTO coin_transactions (id,user_id,type,purchased_delta,earned_delta,related_user_id,reference_id,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id('ctx'), userId, type, purchasedDelta, earnedDelta, relatedUserId, referenceId, now());
}
function adminEvent(entityType: string, entityId: string, action: string, note?: string) {
  db.prepare('INSERT INTO creator_admin_events (id,entity_type,entity_id,action,note,created_at) VALUES (?,?,?,?,?,?)').run(id('cae'), entityType, entityId, action, note ?? null, now());
}
export function purgeCreatorPhotos() {
  const reviewedCutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
  const abandonedCutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
  db.transaction(() => {
    db.prepare("UPDATE creator_applications SET status='rejected',reviewer_note='Verification expired. Please retry.',reviewed_at=?,updated_at=? WHERE status IN ('selfie_required','otp_required') AND created_at<?").run(now(),now(),abandonedCutoff);
    db.prepare('UPDATE creator_applications SET selfie_encrypted=NULL, otp_photo_encrypted=NULL, otp_encrypted=NULL WHERE reviewed_at IS NOT NULL AND reviewed_at<?').run(reviewedCutoff);
  })();
}
export const creatorApi = Router();
creatorApi.get('/overview', (request, response) => {
  const user = auth(request); const funds = wallet(user.id); const config = settings();
  response.setHeader('Cache-Control', 'private, no-store');
  response.json({ application: safeApplication(application(user.id)), verificationAvailable: readyForVerification(), wallet: { purchasedCoins: funds.purchased_coins, earnedCoins: funds.earned_coins, totalCoins: funds.purchased_coins + funds.earned_coins, eligibleCoins: approved(user.id) ? funds.earned_coins : 0 }, config: { coinName: config.coin_name, rupeesPerCoin: config.rupees_per_coin, minTopupRupees: config.min_topup_rupees, minWithdrawalCoins: config.min_withdrawal_coins, creatorSharePercent: config.creator_share_percent }, packages: db.prepare('SELECT * FROM coin_packages ORDER BY coins').all(), transactions: db.prepare('SELECT id,type,purchased_delta AS purchasedDelta,earned_delta AS earnedDelta,related_user_id AS relatedUserId,created_at AS createdAt FROM coin_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(user.id), withdrawals: db.prepare('SELECT id,coins,payout_paise AS payoutPaise,commission_paise AS commissionPaise,status,created_at AS createdAt,note FROM creator_withdrawals WHERE user_id=? ORDER BY created_at DESC').all(user.id) });
});
creatorApi.post('/apply', (request, response) => {
  const user = auth(request);
  if (user.gender !== 'Man' && user.gender !== 'Woman') return response.status(403).json({ error: 'Creator applications are currently for registered men and women' });
  if (request.body?.biometricConsent !== true) return response.status(400).json({ error: 'Biometric photo consent is required' });
  if (!readyForVerification()) return response.status(503).json({ error: 'Creator identity verification is not configured yet' });
  const current = application(user.id);
  if (current && current.status !== 'rejected') return response.status(409).json({ error: 'An application already exists' });
  const timestamp = now(); const appId = id('crapp');
  db.prepare("INSERT INTO creator_applications (id,user_id,status,consent_at,created_at,updated_at) VALUES (?,?,'selfie_required',?,?,?)").run(appId, user.id, timestamp, timestamp, timestamp);
  response.status(201).json({ application: safeApplication(application(user.id)) });
});
creatorApi.post('/selfie', async (request, response) => {
  const user = auth(request); const current = application(user.id); const bytes = photo(request.body?.image);
  if (!current || current.status !== 'selfie_required') return response.status(409).json({ error: 'Start a creator application first' });
  if (!bytes || !photoUnused(bytes)) return response.status(400).json({ error: 'A new live JPEG photo is required' });
  if (!readyForVerification()) return response.status(503).json({ error: 'Verification service is unavailable' });
  try {
    const checked = await verifyPhoto('selfie', bytes);
    if (!checked.passed) return response.status(422).json({ error: 'Face framing or liveness check did not pass', result: checked.result });
    db.transaction(() => { rememberPhoto(bytes, current.id); db.prepare("UPDATE creator_applications SET selfie_encrypted=?,selfie_result=?,status='otp_required',updated_at=? WHERE id=?").run(encrypt(bytes), JSON.stringify(checked.result), now(), current.id); })();
    response.json({ application: safeApplication(application(user.id)) });
  } catch { response.status(503).json({ error: 'Could not complete secure face verification' }); }
});
creatorApi.post('/otp', (request, response) => {
  const user = auth(request); const current = application(user.id);
  if (!current || current.status !== 'otp_required') return response.status(409).json({ error: 'Complete selfie verification first' });
  if (!readyForVerification()) return response.status(503).json({ error: 'Verification service is unavailable' });
  const code = String(crypto.randomInt(1000, 10000)); const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  db.prepare('UPDATE creator_applications SET otp_hash=?,otp_encrypted=?,otp_expires_at=?,otp_attempts=0,updated_at=? WHERE id=?').run(crypto.createHash('sha256').update(`${current.id}:${code}`).digest('hex'), encrypt(Buffer.from(code)), expiresAt, now(), current.id);
  response.json({ code, expiresAt });
});
creatorApi.post('/otp-photo', async (request, response) => {
  const user = auth(request); const current = application(user.id); const bytes = photo(request.body?.image);
  if (!current || current.status !== 'otp_required' || !current.otp_hash || !current.otp_encrypted) return response.status(409).json({ error: 'Generate a verification code first' });
  if (Date.parse(current.otp_expires_at ?? '') <= Date.now() || current.otp_attempts >= 3) return response.status(410).json({ error: 'Code expired or used too many times. Generate a new code.' });
  if (!bytes || !photoUnused(bytes)) return response.status(400).json({ error: 'A new live JPEG photo is required' });
  if (!readyForVerification()) return response.status(503).json({ error: 'Verification service is unavailable' });
  const code = decrypt(current.otp_encrypted).toString('utf8');
  try {
    const checked = await verifyPhoto('otp', bytes, code, current.selfie_encrypted ? decrypt(current.selfie_encrypted) : undefined);
    db.prepare('UPDATE creator_applications SET otp_attempts=otp_attempts+1 WHERE id=?').run(current.id);
    if (!checked.passed) return response.status(422).json({ error: 'Handwritten code, face, or authenticity check failed', result: checked.result });
    db.transaction(() => { rememberPhoto(bytes, current.id); db.prepare("UPDATE creator_applications SET otp_photo_encrypted=?,otp_result=?,otp_hash=NULL,otp_expires_at=NULL,status='under_review',submitted_at=?,updated_at=? WHERE id=? AND status='otp_required'").run(encrypt(bytes), JSON.stringify(checked.result), now(), now(), current.id); })();
    response.json({ application: safeApplication(application(user.id)) });
  } catch { response.status(503).json({ error: 'Could not complete code-photo verification' }); }
});
creatorApi.post('/coins/transfer', (request, response) => {
  const body = z.object({ recipientBloomId: z.string().regex(/^BLOOM-\d{6}$/), amount: z.number().int().min(1).max(100000), clientRequestId: z.string().min(16).max(80) }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid transfer' });
  const sender = auth(request); const recipient = db.prepare('SELECT * FROM users WHERE bloom_id=? AND is_demo=0').get(body.data.recipientBloomId) as UserRow | undefined;
  if (!recipient || recipient.id === sender.id) return response.status(404).json({ error: 'Recipient not found' });
  let duplicate = false;
  try { db.transaction(() => {
    const old = db.prepare('SELECT recipient_id,amount FROM coin_transfer_requests WHERE user_id=? AND client_request_id=?').get(sender.id, body.data.clientRequestId) as {recipient_id:string;amount:number} | undefined;
    if (old) { if (old.recipient_id !== recipient.id || old.amount !== body.data.amount) throw new Error('Transfer request ID was already used'); duplicate = true; return; }
    const source = wallet(sender.id); wallet(recipient.id);
    if (source.purchased_coins + source.earned_coins < body.data.amount) throw new Error('Insufficient Coins');
    const spentEarned = Math.min(source.earned_coins, body.data.amount); const spentPurchased = body.data.amount - spentEarned;
    db.prepare('UPDATE coin_wallets SET purchased_coins=purchased_coins-?,earned_coins=earned_coins-? WHERE user_id=?').run(spentPurchased, spentEarned, sender.id);
    const recipientEarned = approved(recipient.id) ? body.data.amount : 0;
    db.prepare('UPDATE coin_wallets SET purchased_coins=purchased_coins+?,earned_coins=earned_coins+? WHERE user_id=?').run(body.data.amount - recipientEarned, recipientEarned, recipient.id);
    const ref = id('trf'); db.prepare('INSERT INTO coin_transfer_requests (user_id,client_request_id,recipient_id,amount,transfer_id,created_at) VALUES (?,?,?,?,?,?)').run(sender.id,body.data.clientRequestId,recipient.id,body.data.amount,ref,now()); record(sender.id, 'transfer_sent', -spentPurchased, -spentEarned, recipient.id, ref); record(recipient.id, 'transfer_received', body.data.amount - recipientEarned, recipientEarned, sender.id, ref);
  })(); } catch (error) { return response.status(409).json({ error: error instanceof Error ? error.message : 'Transfer failed' }); }
  response.json({ wallet: wallet(sender.id), duplicate });
});
creatorApi.post('/withdrawals', (request, response) => {
  const body = z.object({ coins: z.number().int().positive().max(1000000), clientRequestId: z.string().min(16).max(80) }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid withdrawal' });
  const user = auth(request); if (!approved(user.id)) return response.status(403).json({ error: 'Admin creator approval is required' });
  const previous = db.prepare('SELECT id,coins,payout_paise,commission_paise FROM creator_withdrawals WHERE user_id=? AND client_request_id=?').get(user.id,body.data.clientRequestId) as {id:string;coins:number;payout_paise:number;commission_paise:number} | undefined;
  if (previous) return previous.coins === body.data.coins ? response.json({ requested: true, duplicate: true, payoutPaise: previous.payout_paise, commissionPaise: previous.commission_paise }) : response.status(409).json({ error: 'Withdrawal request ID was already used' });
  const config = settings(); if (body.data.coins < config.min_withdrawal_coins) return response.status(400).json({ error: `Minimum withdrawal is ${config.min_withdrawal_coins} Coins` });
  const grossPaise = body.data.coins * config.rupees_per_coin * 100;
  const payoutPaise = Math.floor(grossPaise * config.creator_share_percent / 100); const commissionPaise = grossPaise - payoutPaise;
  try { db.transaction(() => {
    wallet(user.id);
    const taken = db.prepare('UPDATE coin_wallets SET earned_coins=earned_coins-? WHERE user_id=? AND earned_coins>=?').run(body.data.coins, user.id, body.data.coins);
    if (!taken.changes) throw new Error('Insufficient eligible Coins');
    const withdrawalId = id('wd'); db.prepare('INSERT INTO creator_withdrawals (id,user_id,coins,payout_paise,commission_paise,client_request_id,created_at) VALUES (?,?,?,?,?,?,?)').run(withdrawalId, user.id, body.data.coins, payoutPaise, commissionPaise, body.data.clientRequestId, now());
    record(user.id, 'withdrawal_hold', 0, -body.data.coins, null, withdrawalId);
  })(); } catch (error) { return response.status(409).json({ error: error instanceof Error ? error.message : 'Withdrawal failed' }); }
  response.status(201).json({ requested: true, payoutPaise, commissionPaise });
});
creatorApi.post('/coins/orders', (request, response) => {
  const body = z.object({ coins: z.number().int(), platform: z.enum(['android','ios']) }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid package' });
  const config = settings(); const pack = db.prepare('SELECT * FROM coin_packages WHERE coins=? AND enabled=1').get(body.data.coins) as { android_product_id: string; ios_product_id: string } | undefined;
  const productId = body.data.platform === 'android' ? pack?.android_product_id : pack?.ios_product_id;
  if (!productId || !process.env.COIN_BILLING_WEBHOOK_SECRET) return response.status(503).json({ error: 'Store coin purchases are not configured yet' });
  const amountRupees = body.data.coins * config.rupees_per_coin;
  if (amountRupees < config.min_topup_rupees) return response.status(400).json({ error: 'Below minimum top-up' });
  const orderId = id('cord'); db.prepare('INSERT INTO coin_orders (id,user_id,platform,package_coins,amount_rupees,product_id,created_at) VALUES (?,?,?,?,?,?,?)').run(orderId, auth(request).id, body.data.platform, body.data.coins, amountRupees, productId, now());
  response.status(201).json({ orderId, productId, amountRupees, status: 'pending' });
});

export const coinBillingApi = Router();
coinBillingApi.post('/confirm', (request, response) => {
  const secret = process.env.COIN_BILLING_WEBHOOK_SECRET;
  const supplied = request.header('x-bloom-coin-billing-secret') ?? '';
  if (!secret || secret.length < 32 || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) return response.status(401).json({ error: 'Invalid billing signature' });
  const body = z.object({ orderId: z.string().min(1), providerTransactionId: z.string().min(5).max(150), productId: z.string().min(2), platform: z.enum(['android','ios']) }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid purchase confirmation' });
  const order = db.prepare('SELECT * FROM coin_orders WHERE id=?').get(body.data.orderId) as { user_id: string; platform: string; product_id: string; package_coins: number; status: string } | undefined;
  if (!order || order.platform !== body.data.platform || order.product_id !== body.data.productId) return response.status(404).json({ error: 'Order mismatch' });
  if (order.status === 'credited') return response.json({ received: true, duplicate: true });
  try { db.transaction(() => {
    const changed = db.prepare("UPDATE coin_orders SET status='credited',provider_transaction_id=?,credited_at=? WHERE id=? AND status='pending'").run(body.data.providerTransactionId, now(), body.data.orderId);
    if (!changed.changes) throw new Error('Order is no longer pending');
    wallet(order.user_id); db.prepare('UPDATE coin_wallets SET purchased_coins=purchased_coins+? WHERE user_id=?').run(order.package_coins, order.user_id);
    record(order.user_id, 'purchase', order.package_coins, 0, null, body.data.orderId);
  })(); } catch { return response.status(409).json({ error: 'Duplicate transaction or invalid order' }); }
  response.json({ received: true });
});

export const adminCreatorApi = Router();
adminCreatorApi.use(authorizeAdmin);
adminCreatorApi.get('/summary', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.json({ config: settings(), packages: db.prepare('SELECT * FROM coin_packages ORDER BY coins').all(), applications: db.prepare("SELECT a.id,a.user_id,u.name,u.bloom_id,u.gender,a.status,a.selfie_result,a.otp_result,a.submitted_at,a.reviewed_at,a.reviewer_note FROM creator_applications a JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100").all(), withdrawals: db.prepare('SELECT w.*,u.name,u.bloom_id FROM creator_withdrawals w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 100').all(), wallets: db.prepare('SELECT w.*,u.name,u.bloom_id FROM coin_wallets w JOIN users u ON u.id=w.user_id ORDER BY u.name LIMIT 200').all(), transactions: db.prepare('SELECT * FROM coin_transactions ORDER BY created_at DESC LIMIT 200').all(), audit: db.prepare('SELECT * FROM creator_admin_events ORDER BY created_at DESC LIMIT 200').all(), stats: { purchased: (db.prepare("SELECT COALESCE(SUM(purchased_delta),0) AS n FROM coin_transactions WHERE type='purchase'").get() as {n:number}).n, transferred: (db.prepare("SELECT COALESCE(SUM(-purchased_delta-earned_delta),0) AS n FROM coin_transactions WHERE type='transfer_sent'").get() as {n:number}).n, earned: (db.prepare("SELECT COALESCE(SUM(earned_delta),0) AS n FROM coin_transactions WHERE type='transfer_received'").get() as {n:number}).n, pendingWithdrawals: (db.prepare("SELECT COUNT(*) AS n FROM creator_withdrawals WHERE status='pending'").get() as {n:number}).n, paidCommissionPaise: (db.prepare("SELECT COALESCE(SUM(commission_paise),0) AS n FROM creator_withdrawals WHERE status='paid'").get() as {n:number}).n } });
});
adminCreatorApi.get('/applications/:id/photo/:step', (request, response) => {
  const row = db.prepare('SELECT selfie_encrypted,otp_photo_encrypted FROM creator_applications WHERE id=?').get(request.params.id) as Pick<Application,'selfie_encrypted'|'otp_photo_encrypted'> | undefined;
  const bytes = request.params.step === 'selfie' ? row?.selfie_encrypted : request.params.step === 'otp' ? row?.otp_photo_encrypted : null;
  if (!bytes) return response.status(404).json({ error: 'Photo unavailable or removed by retention policy' });
  try { const image = decrypt(bytes); adminEvent('application',request.params.id,`view_${request.params.step}`); response.setHeader('Cache-Control', 'no-store'); response.type('jpeg').send(image); } catch { response.status(503).json({ error: 'Could not decrypt photo' }); }
});
adminCreatorApi.get('/applications/:id/code', (request, response) => {
  const row = db.prepare('SELECT otp_encrypted FROM creator_applications WHERE id=?').get(request.params.id) as { otp_encrypted: Buffer | null } | undefined;
  if (!row?.otp_encrypted) return response.status(404).json({ error: 'Code expired or already used' });
  try { const code = decrypt(row.otp_encrypted).toString('utf8'); adminEvent('application',request.params.id,'view_code'); response.setHeader('Cache-Control', 'no-store'); response.json({ code }); } catch { response.status(503).json({ error: 'Could not decrypt code' }); }
});
adminCreatorApi.patch('/applications/:id', (request, response) => {
  const body = z.object({ decision: z.enum(['approved','rejected']), note: z.string().max(500).default('') }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid decision' });
  const row = db.prepare('SELECT * FROM creator_applications WHERE id=?').get(request.params.id) as Application | undefined;
  if (!row || row.status !== 'under_review' || !row.selfie_encrypted || !row.otp_photo_encrypted || !row.selfie_result || !row.otp_result) return response.status(409).json({ error: 'Application is not ready for manual review' });
  for (const action of ['view_selfie','view_otp']) if (!db.prepare('SELECT 1 FROM creator_admin_events WHERE entity_type=? AND entity_id=? AND action=?').get('application',row.id,action)) return response.status(409).json({ error: 'Open both verification photos before deciding' });
  db.transaction(() => { db.prepare('UPDATE creator_applications SET status=?,reviewer_note=?,reviewed_at=?,updated_at=? WHERE id=?').run(body.data.decision, body.data.note, now(), now(), row.id); adminEvent('application',row.id,body.data.decision,body.data.note); })();
  response.json({ application: safeApplication(application(row.user_id)) });
});
adminCreatorApi.patch('/config', (request, response) => {
  const body = z.object({ coinName: z.string().trim().min(2).max(30), rupeesPerCoin: z.number().int().min(1).max(100), minTopupRupees: z.number().int().min(1).max(100000), minWithdrawalCoins: z.number().int().min(1).max(100000), creatorSharePercent: z.number().int().min(1).max(99) }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid Coin settings' });
  db.prepare('UPDATE coin_config SET coin_name=?,rupees_per_coin=?,min_topup_rupees=?,min_withdrawal_coins=?,creator_share_percent=?,updated_at=? WHERE id=1').run(body.data.coinName,body.data.rupeesPerCoin,body.data.minTopupRupees,body.data.minWithdrawalCoins,body.data.creatorSharePercent,now());
  adminEvent('coin_config','1','update');
  response.json({ config: settings() });
});
adminCreatorApi.patch('/packages/:coins', (request, response) => {
  const body = z.object({ androidProductId: z.string().max(100), iosProductId: z.string().max(100), enabled: z.boolean() }).safeParse(request.body);
  if (!body.success) return response.status(400).json({ error: 'Invalid package' });
  const changed = db.prepare('UPDATE coin_packages SET android_product_id=?,ios_product_id=?,enabled=? WHERE coins=?').run(body.data.androidProductId,body.data.iosProductId,Number(body.data.enabled),Number(request.params.coins));
  if (!changed.changes) return response.status(404).json({ error: 'Package not found' });
  adminEvent('coin_package',request.params.coins,'update');
  response.json({ updated: true });
});
adminCreatorApi.patch('/withdrawals/:id', (request, response) => {
  const body = z.object({ decision: z.enum(['approved','rejected','paid']), note: z.string().max(500).default(''), payoutReference: z.string().max(120).optional() }).safeParse(request.body);
  if (!body.success || body.data.decision === 'paid' && !body.data.payoutReference) return response.status(400).json({ error: 'Invalid withdrawal decision' });
  const current = db.prepare('SELECT * FROM creator_withdrawals WHERE id=?').get(request.params.id) as {user_id:string;coins:number;status:string} | undefined;
  if (!current || !(current.status === 'pending' && body.data.decision !== 'paid' || current.status === 'approved' && body.data.decision === 'paid')) return response.status(409).json({ error: 'Invalid withdrawal transition' });
  db.transaction(() => {
    db.prepare('UPDATE creator_withdrawals SET status=?,note=?,payout_reference=?,reviewed_at=COALESCE(reviewed_at,?),paid_at=? WHERE id=?').run(body.data.decision,body.data.note,body.data.payoutReference ?? null,now(),body.data.decision === 'paid' ? now() : null,request.params.id);
    if (body.data.decision === 'rejected') { db.prepare('UPDATE coin_wallets SET earned_coins=earned_coins+? WHERE user_id=?').run(current.coins,current.user_id); record(current.user_id,'withdrawal_refund',0,current.coins,null,request.params.id); }
    adminEvent('withdrawal',request.params.id,body.data.decision,body.data.note);
  })();
  response.json({ updated: true });
});
export function serveCreatorAdmin(_request: Request, response: Response) { response.setHeader('Cache-Control','no-store'); response.sendFile(path.resolve(process.cwd(), 'public/admin-creators.html')); }
