import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { WebSocket } from 'ws';

const port = 5100 + Math.floor(Math.random() * 500);
const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'bloom-e2e-'));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), DATA_DIR: dataDirectory, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`${base}/health`); if (response.ok) return; } catch { /* server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Bloom API did not become healthy');
}

async function json(pathname, init = {}) {
  const response = await fetch(`${base}${pathname}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${response.status} ${payload?.error ?? pathname}`);
  return payload;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${encodeURIComponent(token)}`);
    const timeout = setTimeout(() => reject(new Error('Realtime connection timed out')), 5_000);
    socket.once('open', () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once('error', reject);
  });
}

function nextEvent(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off('message', onMessage); reject(new Error('Realtime event timed out')); }, 5_000);
    const onMessage = (raw) => {
      const event = JSON.parse(raw.toString());
      if (!predicate(event)) return;
      clearTimeout(timeout);
      socket.off('message', onMessage);
      resolve(event);
    };
    socket.on('message', onMessage);
  });
}

let partnerSocket; let senderSocket; let database;
try {
  await waitForHealth();
  const session = await json('/api/v1/sessions', { method: 'POST', body: JSON.stringify({ termsAccepted: true, gender: 'Man', name: 'E2E Sender' }) });
  const partnerSession = await json('/api/v1/sessions', { method: 'POST', body: JSON.stringify({ termsAccepted: true, gender: 'Woman', name: 'E2E Receiver' }) });
  const newPersonSession = await json('/api/v1/sessions', { method: 'POST', body: JSON.stringify({ termsAccepted: true, gender: 'Woman', name: 'E2E New Person' }) });
  if (!/^BLOOM-\d{6}$/.test(session.user.bloomId) || !/^BLOOM-\d{6}$/.test(partnerSession.user.bloomId) || session.user.bloomId === partnerSession.user.bloomId) throw new Error('Unique Bloom IDs were not returned during registration');
  if (!session.user.avatar.startsWith('bloom-avatar://man/') || !partnerSession.user.avatar.startsWith('bloom-avatar://woman/')) throw new Error('Registration did not assign illustrated avatars');
  partnerSocket = await connect(partnerSession.token);
  senderSocket = await connect(session.token);
  const headers = { authorization: `Bearer ${session.token}` };
  const exploreBeforeMatch = await json('/api/v1/people', { headers });
  if (!exploreBeforeMatch.people.some((person) => person.id === partnerSession.user.id) || !exploreBeforeMatch.people.some((person) => person.id === newPersonSession.user.id)) throw new Error('New members were missing from Explore');
  const waiting = await json('/api/v1/matches', { method: 'POST', headers: { authorization: `Bearer ${partnerSession.token}` }, body: JSON.stringify({ preference: 'Random' }) });
  if (waiting.waiting !== true) throw new Error('The first searching user was not kept waiting');
  await json('/api/v1/matches/waiting', { method: 'DELETE', headers: { authorization: `Bearer ${partnerSession.token}` } });
  const waitingAfterCancel = await json('/api/v1/matches', { method: 'POST', headers: { authorization: `Bearer ${partnerSession.token}` }, body: JSON.stringify({ preference: 'Random' }) });
  if (waitingAfterCancel.waiting !== true) throw new Error('A cancelled search could not be started again');
  const matchInvite = nextEvent(partnerSocket, (event) => event.type === 'match.invite');
  const match = await json('/api/v1/matches', { method: 'POST', headers, body: JSON.stringify({ preference: 'Random' }) });
  const invite = await matchInvite;
  if (match.partner.id !== partnerSession.user.id) throw new Error('Matching did not select the real online user');
  const exploreAfterMatch = await json('/api/v1/people', { headers });
  if (exploreAfterMatch.people.some((person) => person.id === partnerSession.user.id) || !exploreAfterMatch.people.some((person) => person.id === newPersonSession.user.id)) throw new Error('Explore showed a connected person or hid an unconnected one');
  const recoveredMatch = await json('/api/v1/matches', { method: 'POST', headers, body: JSON.stringify({ preference: 'Random' }) });
  if (recoveredMatch.conversationId !== match.conversationId) throw new Error('A reconnect created a duplicate match');
  if (match.partner.bloomId !== partnerSession.user.bloomId) throw new Error('Matching did not return the partner Bloom ID');
  if (invite.conversationId !== match.conversationId || invite.fromUserId !== session.user.id) throw new Error('The matched user did not receive the real-time chat invitation');
  const callInvite = nextEvent(partnerSocket, (event) => event.type === 'call.invite');
  senderSocket.send(JSON.stringify({ type: 'call.invite', conversationId: match.conversationId, targetUserId: partnerSession.user.id, payload: { callId: 'e2e-call', mode: 'Video' } }));
  const relayedCall = await callInvite;
  if (relayedCall.fromUserId !== session.user.id || relayedCall.payload?.mode !== 'Video') throw new Error('The video call invitation was not relayed to the matched user');
  const callAnswer = nextEvent(senderSocket, (event) => event.type === 'call.answer');
  partnerSocket.send(JSON.stringify({ type: 'call.answer', conversationId: match.conversationId, targetUserId: session.user.id, payload: { callId: 'e2e-call', description: { type: 'answer', sdp: 'e2e-sdp' } } }));
  if ((await callAnswer).payload?.description?.sdp !== 'e2e-sdp') throw new Error('The video call answer was not relayed to the caller');
  const liveMessage = nextEvent(partnerSocket, (event) => event.type === 'message.created');
  const sent = await json(`/api/v1/conversations/${match.conversationId}/messages`, { method: 'POST', headers, body: JSON.stringify({ type: 'text', text: 'Production path test' }) });
  if ((await liveMessage).message?.id !== sent.message.id) throw new Error('The recipient did not receive the live chat message');
  const replyEvent = nextEvent(senderSocket, (event) => event.type === 'message.created');
  const reply = await json(`/api/v1/conversations/${match.conversationId}/messages`, { method: 'POST', headers: { authorization: `Bearer ${partnerSession.token}` }, body: JSON.stringify({ type: 'text', text: 'Live reply' }) });
  if ((await replyEvent).message?.id !== reply.message.id) throw new Error('The sender did not receive the live chat reply');
  const messages = await json(`/api/v1/conversations/${match.conversationId}/messages`, { headers });
  if (sent.message.oneView || reply.message.oneView) throw new Error('Normal text messages did not default to reusable messages');
  const preferences = await json('/api/v1/me/preferences', { method: 'PATCH', headers, body: JSON.stringify({ theme: 'dark', fontScale: 1.3 }) });
  if (preferences.user.theme !== 'dark' || preferences.user.fontScale !== 1.3 || (await json('/api/v1/me', { headers })).user.fontScale !== 1.3) throw new Error('Appearance preferences were not persisted');
  const partnerPreferences = (await json('/api/v1/me', { headers: { authorization: `Bearer ${partnerSession.token}` } })).user;
  if (partnerPreferences.theme !== 'light' || partnerPreferences.fontScale !== 1) throw new Error('Appearance preferences affected another user');
  const oneView = await json(`/api/v1/conversations/${match.conversationId}/messages`, { method: 'POST', headers, body: JSON.stringify({ type: 'text', text: 'Secret once', oneView: true }) });
  if (oneView.message.text !== '' || oneView.message.oneView !== true) throw new Error('One View content leaked in send response');
  const receiverHeaders = { authorization: `Bearer ${partnerSession.token}` };
  const oneViewList = await json(`/api/v1/conversations/${match.conversationId}/messages`, { headers: receiverHeaders });
  if (oneViewList.messages.find((message) => message.id === oneView.message.id)?.text !== '') throw new Error('One View content leaked in history');
  const viewPath = `/api/v1/conversations/${match.conversationId}/messages/${oneView.message.id}/view`;
  const senderView = await fetch(`${base}${viewPath}`, { method: 'POST', headers });
  if (senderView.status !== 410) throw new Error('Sender could open their own One View message');
  const [firstView, secondView] = await Promise.all([fetch(`${base}${viewPath}`, { method: 'POST', headers: receiverHeaders }), fetch(`${base}${viewPath}`, { method: 'POST', headers: receiverHeaders })]);
  if (![firstView.status, secondView.status].includes(200) || ![firstView.status, secondView.status].includes(410)) throw new Error('One View was accessible more than once');
  const visible = firstView.status === 200 ? await firstView.json() : await secondView.json();
  if (visible.text !== 'Secret once') throw new Error('One View did not reveal the original content');
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9a0W0AAAAASUVORK5CYII=';
  const normalPhoto = await json(`/api/v1/conversations/${match.conversationId}/images`, { method: 'POST', headers, body: JSON.stringify({ image }) });
  if (normalPhoto.message.oneView) throw new Error('Normal images defaulted to One View');
  const photoUrl = `/api/v1/conversations/${match.conversationId}/messages/${normalPhoto.message.id}/image`;
  if ((await json(photoUrl, { headers: receiverHeaders })).image !== image) throw new Error('Normal image was unavailable');
  const oncePhoto = await json(`/api/v1/conversations/${match.conversationId}/images`, { method: 'POST', headers, body: JSON.stringify({ image, oneView: true }) });
  const onceUrl = `/api/v1/conversations/${match.conversationId}/messages/${oncePhoto.message.id}`;
  if ((await fetch(`${base}${onceUrl}/image`, { headers: receiverHeaders })).status !== 404) throw new Error('One View image leaked through normal media route');
  if ((await json(`${onceUrl}/view`, { method: 'POST', headers: receiverHeaders })).image !== image) throw new Error('One View image did not reveal');
  if ((await fetch(`${base}${onceUrl}/view`, { method: 'POST', headers: receiverHeaders })).status !== 410) throw new Error('One View image reopened');
  database = new Database(path.join(dataDirectory, 'bloom.sqlite'));
  if (database.prepare('SELECT 1 FROM one_view_payloads WHERE message_id=?').get(oneView.message.id) || database.prepare('SELECT 1 FROM message_media WHERE message_id=?').get(oncePhoto.message.id)) throw new Error('Viewed content was not deleted from storage');
  const request = await json(`/api/v1/friends/${match.partner.id}`, { method: 'POST', headers });
  if (request.status !== 'pending') throw new Error('Friendship activated without approval');
  const beforeApproval = await json('/api/v1/friends', { headers });
  if (beforeApproval.friends.length !== 0) throw new Error('Random partner appeared in Friends before approval');
  const earlyChat = await fetch(`${base}/api/v1/conversations`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ partnerId: partnerSession.user.id }) });
  if (earlyChat.status !== 403) throw new Error('Private chat opened before friend approval');
  const receivedRequests = await json('/api/v1/friend-requests', { headers: { authorization: `Bearer ${partnerSession.token}` } });
  if (receivedRequests.incoming[0]?.id !== session.user.id) throw new Error('Friend request was not delivered');
  await json(`/api/v1/friend-requests/${session.user.id}/accept`, { method: 'POST', headers: { authorization: `Bearer ${partnerSession.token}` } });
  const afterApproval = await json('/api/v1/friends', { headers });
  if (afterApproval.friends[0]?.id !== partnerSession.user.id) throw new Error('Approved friend is missing');
  const exploreAfterApproval = await json('/api/v1/people', { headers });
  if (exploreAfterApproval.people.some((person) => person.id === partnerSession.user.id)) throw new Error('An approved friend appeared in Explore');
  await json(`/api/v1/matches/${match.conversationId}/end`, { method: 'POST', headers });
  const keptChat = await json('/api/v1/conversations', { method: 'POST', headers, body: JSON.stringify({ partnerId: partnerSession.user.id }) });
  if (keptChat.conversationId !== match.conversationId) throw new Error('Approved chat history was not preserved');
  const waitingAgain = await json('/api/v1/matches', { method: 'POST', headers: { authorization: `Bearer ${partnerSession.token}` }, body: JSON.stringify({ preference: 'Random' }) });
  if (waitingAgain.waiting !== true) throw new Error('The person who stayed could not search again');
  const secondInvite = nextEvent(partnerSocket, (event) => event.type === 'match.invite');
  const secondMatch = await json('/api/v1/matches', { method: 'POST', headers, body: JSON.stringify({ preference: 'Random' }) });
  if ((await secondInvite).conversationId !== secondMatch.conversationId) throw new Error('A second match did not connect');
  await json(`/api/v1/matches/${secondMatch.conversationId}/end`, { method: 'POST', headers });
  const transfer = await json('/api/v1/points/transfer', { method: 'POST', headers, body: JSON.stringify({ recipientId: match.partner.id, amount: 10 }) });
  const persisted = await json('/api/v1/me', { headers });
  if (messages.messages.length !== 2 || messages.messages[0].text !== 'Production path test' || messages.messages[1].text !== 'Live reply') throw new Error('The real messages were not persisted end to end');
  if (transfer.user.points !== 110 || persisted.user.points !== 110) throw new Error('Point transfer was not persisted');
  const unviewed = await json(`/api/v1/conversations/${match.conversationId}/messages`, { method: 'POST', headers, body: JSON.stringify({ type: 'text', text: 'Expire without opening', oneView: true }) });
  database.prepare('UPDATE conversations SET created_at=? WHERE id=?').run(new Date(Date.now() - 72 * 60 * 60 * 1000 - 1000).toISOString(), match.conversationId);
  const afterExpiry = await json('/api/v1/conversations', { headers });
  if (afterExpiry.conversations.some((conversation) => conversation.id === match.conversationId) || database.prepare('SELECT 1 FROM conversations WHERE id=?').get(match.conversationId) || database.prepare('SELECT 1 FROM messages WHERE conversation_id=?').get(match.conversationId) || database.prepare('SELECT 1 FROM message_media WHERE message_id=?').get(normalPhoto.message.id) || database.prepare('SELECT 1 FROM one_view_payloads WHERE message_id=?').get(unviewed.message.id)) throw new Error('Expired chat, messages, or media remained available');
  if ((await fetch(`${base}/api/v1/conversations/${match.conversationId}/messages`, { headers })).status !== 404) throw new Error('Expired chat history was accessible');
  console.log(JSON.stringify({ ok: true, conversationId: match.conversationId, matchInvite: true, waitingQueue: true, rematch: true, friendApproval: true, exclusiveExplore: true, callSignaling: true, liveMessages: true, messages: messages.messages.length, points: persisted.user.points }));
} finally {
  partnerSocket?.close();
  senderSocket?.close();
  database?.close();
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
  await rm(dataDirectory, { recursive: true, force: true });
}
