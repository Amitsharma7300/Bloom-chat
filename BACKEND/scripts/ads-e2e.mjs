import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const port = 5600 + Math.floor(Math.random() * 300);
const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'bloom-ads-e2e-'));
const key = crypto.randomBytes(32).toString('hex');
const secret = crypto.randomBytes(32).toString('hex');
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), DATA_DIR: dataDirectory, NODE_ENV: 'test', ADMIN_API_KEY: key, BILLING_WEBHOOK_SECRET: secret }, stdio: ['ignore', 'pipe', 'pipe'] });
let database;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function call(route, options = {}) {
  const response = await fetch(`${base}${route}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } });
  const payload = response.status === 204 ? null : await response.json();
  return { status: response.status, payload };
}
async function ready() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('API did not start');
}
try {
  await ready();
  database = new Database(path.join(dataDirectory, 'bloom.sqlite'));
  const man = (await call('/api/v1/sessions', { method: 'POST', body: JSON.stringify({ termsAccepted: true, gender: 'Man' }) })).payload;
  const woman = (await call('/api/v1/sessions', { method: 'POST', body: JSON.stringify({ termsAccepted: true, gender: 'Woman' }) })).payload;
  const manAuth = { authorization: `Bearer ${man.token}` };
  const womanAuth = { authorization: `Bearer ${woman.token}` };
  const status = async (headers) => (await call('/api/v1/ads/status', { headers })).payload;
  assert(!(await status(manAuth)).enabled, 'Ads should start disabled until configured');
  assert((await call('/admin/api/ads/config', { method: 'PATCH', headers: { 'x-admin-key': key }, body: JSON.stringify({ enabled: true, maleInterval: 3, femaleInterval: 4 }) })).status === 200, 'Admin could not enable ad testing');
  const nonce = () => crypto.randomBytes(16).toString('hex');
  async function check(headers, checkpoint = 'start_chat') {
    const value = nonce();
    const display = (await call(`/api/v1/ads/probe/display/${value}`, { headers })).payload.proof;
    const video = (await call(`/api/v1/ads/probe/video/${value}`, { headers })).payload.proof;
    return call('/api/v1/ads/check', { method: 'POST', headers, body: JSON.stringify({ nonce: value, displayProof: display, videoProof: video, checkpoint }) });
  }
  assert((await check(manAuth)).payload.outcome === 'clear', 'Valid signed probes were not accepted');
  assert((await check(womanAuth)).payload.outcome === 'clear', 'Female user check failed');
  const blockedProbe = await call('/api/v1/ads/check', { method: 'POST', headers: manAuth, body: JSON.stringify({ nonce: nonce(), displayFailure: 'network', videoFailure: 'network', checkpoint: 'resume' }) });
  assert(blockedProbe.payload.outcome === 'blocked', 'Two failed probes did not trigger the ad warning');
  assert((await check(manAuth, 'retry')).payload.outcome === 'clear', 'Retry did not clear the blocked state');
  for (let i = 1; i <= 4; i++) {
    const conversationId = `ads_test_${i}`;
    database.prepare('INSERT INTO conversations (id,user_a,user_b,created_at) VALUES (?,?,?,?)').run(conversationId, man.user.id, woman.user.id, new Date(Date.now() - 65_000).toISOString());
    assert((await call(`/api/v1/matches/${conversationId}/end`, { method: 'POST', headers: manAuth })).status === 204, 'Could not complete chat');
    const male = await status(manAuth); const female = await status(womanAuth);
    assert(male.due === (i >= 3), `Male ad threshold wrong at ${i}`);
    assert(female.due === (i >= 4), `Female ad threshold wrong at ${i}`);
  }
  const maleTicket = (await status(manAuth)).ticketId;
  const started = (await call('/api/v1/ads/attempts', { method: 'POST', headers: manAuth, body: JSON.stringify({ ticketId: maleTicket }) })).payload.attemptId;
  assert((await call(`/api/v1/ads/attempts/${started}`, { method: 'PATCH', headers: manAuth, body: JSON.stringify({ result: 'failed', errorCode: 'network' }) })).status === 200, 'Failed ad report rejected');
  assert((await status(manAuth)).ticketId === maleTicket, 'Failed ad cleared a pending ticket');
  const retried = (await call('/api/v1/ads/attempts', { method: 'POST', headers: manAuth, body: JSON.stringify({ ticketId: maleTicket }) })).payload.attemptId;
  assert((await call(`/api/v1/ads/attempts/${retried}`, { method: 'PATCH', headers: manAuth, body: JSON.stringify({ result: 'impression' }) })).status === 200, 'Impression report rejected');
  assert(!(await status(manAuth)).due && (await status(manAuth)).completedSinceAd === 0, 'Impression did not reset the male counter');
  assert((await status(womanAuth)).due, 'Male impression incorrectly reset female counter');
  const summary = await call('/admin/api/ads/summary', { headers: { 'x-admin-key': key } });
  assert(summary.payload.stats.impressions === 1 && summary.payload.stats.failures === 1 && summary.payload.stats.blockedChecks === 1, 'Admin metrics are incorrect');
  assert((await call('/admin/api/ads/summary')).status === 401, 'Admin data was available without a key');
  const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
  assert((await call('/api/v1/billing/webhook', { method: 'POST', headers: { 'x-bloom-billing-secret': secret }, body: JSON.stringify({ userId: woman.user.id, provider: 'test', plan: 'weekly', externalId: 'test-premium', status: 'active', expiresAt }) })).status === 200, 'Premium webhook failed');
  assert((await status(womanAuth)).premium && !(await status(womanAuth)).due, 'Premium did not bypass pending ads');
  console.log(JSON.stringify({ ok: true, maleInterval: 3, femaleInterval: 4, failedAttemptsRetained: true, impressionReset: true, premiumBypass: true, adminProtected: true }));
} finally {
  database?.close();
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
  await rm(dataDirectory, { recursive: true, force: true });
}
