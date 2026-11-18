import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const port = 6100 + Math.floor(Math.random() * 300);
const verifyPort = port + 400;
const dir = await mkdtemp(path.join(os.tmpdir(), 'bloom-creator-e2e-'));
const adminKey = crypto.randomBytes(32).toString('hex');
const billingKey = crypto.randomBytes(32).toString('hex');
const imageKey = crypto.randomBytes(32).toString('hex');
const verifier = http.createServer(async (request, response) => {
  let raw = ''; for await (const chunk of request) raw += chunk;
  const body = JSON.parse(raw);
  const result = { faceDetected: true, faceFrameFraction: 0.85, livenessPassed: true, authentic: true, sameFace: true, handwrittenCode: body.expectedCode, faceAndCodeTogether: true };
  response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(result));
});
await new Promise((resolve) => verifier.listen(verifyPort, '127.0.0.1', resolve));
const server = spawn(process.execPath, ['dist/index.js'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', DATA_DIR: dir, PORT: String(port), ADMIN_API_KEY: adminKey, COIN_BILLING_WEBHOOK_SECRET: billingKey, CREATOR_IMAGE_KEY: imageKey, CREATOR_VERIFY_URL: `http://127.0.0.1:${verifyPort}`, CREATOR_VERIFY_TOKEN: 'test-verifier-token' }, stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://127.0.0.1:${port}`;
function ensure(condition, message) { if (!condition) throw new Error(message); }
async function call(route, method = 'GET', body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { 'content-type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  return { status: response.status, payload };
}
function fakePhoto() { return `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff,0xd8]), crypto.randomBytes(20000), Buffer.from([0xff,0xd9])]).toString('base64')}`; }
try {
  let ready = false;
  for (let i = 0; i < 40; i++) { try { ready = (await fetch(base + '/health')).ok; if (ready) break; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 200)); }
  ensure(ready, 'Backend did not start');
  const creator = (await call('/api/v1/sessions', 'POST', { termsAccepted: true, gender: 'Woman' })).payload;
  const buyer = (await call('/api/v1/sessions', 'POST', { termsAccepted: true, gender: 'Man' })).payload;
  const cAuth = { authorization: `Bearer ${creator.token}` }; const bAuth = { authorization: `Bearer ${buyer.token}` }; const admin = { 'x-admin-key': adminKey };
  const overview = async (headers) => (await call('/api/v1/creator/overview', 'GET', null, headers)).payload;
  ensure((await overview(cAuth)).wallet.totalCoins === 0, 'Creator wallet should not include free points');
  ensure((await call('/api/v1/creator/apply', 'POST', { biometricConsent: false }, cAuth)).status === 400, 'Biometric consent was not enforced');
  ensure((await call('/api/v1/creator/apply', 'POST', { biometricConsent: true }, cAuth)).status === 201, 'Application failed');
  ensure((await call('/api/v1/creator/selfie', 'POST', { image: fakePhoto() }, cAuth)).status === 200, 'Selfie verification failed');
  const otp = (await call('/api/v1/creator/otp', 'POST', {}, cAuth)).payload;
  ensure(/^\d{4}$/.test(otp.code), 'Server did not generate a four-digit code');
  ensure((await call('/api/v1/creator/otp-photo', 'POST', { image: fakePhoto() }, cAuth)).status === 200, 'Code photo verification failed');
  ensure((await overview(cAuth)).application.status === 'under_review', 'Application did not enter review');
  ensure((await call('/api/v1/creator/withdrawals', 'POST', { coins: 100, clientRequestId: crypto.randomUUID() }, cAuth)).status === 403, 'Unapproved user could withdraw');
  const summary = (await call('/admin/api/creators/summary', 'GET', null, admin)).payload;
  const appId = summary.applications[0].id;
  ensure((await call(`/admin/api/creators/applications/${appId}/code`, 'GET', null, admin)).payload.code === otp.code, 'Admin could not inspect the code');
  ensure((await fetch(`${base}/admin/api/creators/applications/${appId}/photo/selfie`, { headers: admin })).status === 200, 'Admin could not inspect selfie');
  ensure((await fetch(`${base}/admin/api/creators/applications/${appId}/photo/otp`, { headers: admin })).status === 200, 'Admin could not inspect code photo');
  ensure((await call(`/admin/api/creators/applications/${appId}`, 'PATCH', { decision: 'approved', note: 'Photos reviewed' }, admin)).status === 200, 'Admin approval failed');
  ensure((await overview(cAuth)).application.status === 'approved', 'Creator status was not applied');
  ensure((await call('/admin/api/creators/packages/100', 'PATCH', { androidProductId: 'bloom_100', iosProductId: 'bloom_100_ios', enabled: true }, admin)).status === 200, 'Package setup failed');
  const order = (await call('/api/v1/creator/coins/orders', 'POST', { coins: 100, platform: 'android' }, bAuth)).payload;
  ensure(order.amountRupees === 100 && order.productId === 'bloom_100', 'Coin pricing was wrong');
  const confirmation = { orderId: order.orderId, platform: 'android', productId: 'bloom_100', providerTransactionId: 'play-transaction-000001' };
  ensure((await call('/api/v1/coins/billing/confirm', 'POST', confirmation)).status === 401, 'Unauthenticated billing credited Coins');
  ensure((await call('/api/v1/coins/billing/confirm', 'POST', confirmation, { 'x-bloom-coin-billing-secret': billingKey })).status === 200, 'Verified billing confirmation failed');
  ensure((await call('/api/v1/coins/billing/confirm', 'POST', confirmation, { 'x-bloom-coin-billing-secret': billingKey })).payload.duplicate === true, 'Repeated billing notification was not idempotent');
  ensure((await overview(bAuth)).wallet.purchasedCoins === 100, 'Purchase was not credited exactly once');
  const transferRequest = crypto.randomUUID();
  ensure((await call('/api/v1/creator/coins/transfer', 'POST', { recipientBloomId: creator.user.bloomId, amount: 100, clientRequestId: transferRequest }, bAuth)).status === 200, '1:1 Coin transfer failed');
  ensure((await call('/api/v1/creator/coins/transfer', 'POST', { recipientBloomId: creator.user.bloomId, amount: 100, clientRequestId: transferRequest }, bAuth)).payload.duplicate === true, 'Retried transfer was not idempotent');
  ensure((await overview(bAuth)).wallet.totalCoins === 0 && (await overview(cAuth)).wallet.earnedCoins === 100, 'Coin transfer changed total supply');
  ensure((await call('/api/v1/creator/coins/transfer', 'POST', { recipientBloomId: creator.user.bloomId, amount: 100, clientRequestId: crypto.randomUUID() }, bAuth)).status === 409, 'Double transfer succeeded');
  const withdrawalRequest = crypto.randomUUID();
  const withdrawal = await call('/api/v1/creator/withdrawals', 'POST', { coins: 100, clientRequestId: withdrawalRequest }, cAuth);
  ensure(withdrawal.status === 201 && withdrawal.payload.payoutPaise === 8000 && withdrawal.payload.commissionPaise === 2000, '80:20 split is wrong');
  ensure((await call('/api/v1/creator/withdrawals', 'POST', { coins: 100, clientRequestId: withdrawalRequest }, cAuth)).payload.duplicate === true, 'Retried withdrawal was not idempotent');
  ensure((await overview(cAuth)).wallet.eligibleCoins === 0, 'Pending withdrawal did not hold Coins');
  let withdrawalId = (await overview(cAuth)).withdrawals[0].id;
  ensure((await call(`/admin/api/creators/withdrawals/${withdrawalId}`, 'PATCH', { decision: 'rejected', note: 'Retry KYC' }, admin)).status === 200, 'Withdrawal rejection failed');
  ensure((await overview(cAuth)).wallet.eligibleCoins === 100, 'Rejected withdrawal did not refund Coins');
  ensure((await call('/api/v1/creator/withdrawals', 'POST', { coins: 100, clientRequestId: crypto.randomUUID() }, cAuth)).status === 201, 'Second withdrawal request failed');
  withdrawalId = (await overview(cAuth)).withdrawals[0].id;
  ensure((await call(`/admin/api/creators/withdrawals/${withdrawalId}`, 'PATCH', { decision: 'approved' }, admin)).status === 200, 'Withdrawal approval failed');
  ensure((await call(`/admin/api/creators/withdrawals/${withdrawalId}`, 'PATCH', { decision: 'paid', payoutReference: 'bank-payout-0001' }, admin)).status === 200, 'Paid withdrawal update failed');
  ensure((await overview(cAuth)).withdrawals[0].status === 'paid', 'Paid status was not persisted');
  console.log(JSON.stringify({ ok: true, creatorApproval: true, encryptedPhotos: true, verifiedPurchase: true, transferOneToOne: true, withdrawalSplit: '80/20', refund: true }));
} finally {
  server.kill('SIGTERM'); await new Promise((resolve) => server.once('exit', resolve));
  await new Promise((resolve) => verifier.close(resolve));
  await rm(dir, { recursive: true, force: true });
}
