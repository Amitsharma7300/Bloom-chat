import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { api } from './api.js';
import { db } from './database.js';
import { attachRealtime, expireChats } from './realtime.js';
import { adminAdvertisingApi, serveAdvertisingAdmin } from './advertising.js';
import { adminCreatorApi, purgeCreatorPhotos, serveCreatorAdmin } from './creator.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);
const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:19006').split(',').map((value) => value.trim());

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? origins : true, credentials: false }));
app.use(express.json({ limit: '6mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/health', (_request, response) => {
  const database = db.prepare('SELECT 1 AS ok').get() as { ok: number };
  response.json({ status: database.ok === 1 ? 'ok' : 'degraded', service: 'bloomchat-api', time: new Date().toISOString() });
});

app.get('/admin/ads', serveAdvertisingAdmin);
app.use('/admin/api/ads', adminAdvertisingApi);
app.get('/admin/ads.js', (_request, response) => response.sendFile(path.resolve(process.cwd(), 'public/admin-ads.js')));
app.get('/admin/ads.css', (_request, response) => response.sendFile(path.resolve(process.cwd(), 'public/admin-ads.css')));
app.get('/admin/creators', serveCreatorAdmin);
app.use('/admin/api/creators', adminCreatorApi);
app.get('/admin/creators.js', (_request, response) => response.sendFile(path.resolve(process.cwd(), 'public/admin-creators.js')));

app.use('/api/v1', api);
app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
attachRealtime(server);
expireChats();
purgeCreatorPhotos();
const expiryTimer = setInterval(expireChats, 60_000);
expiryTimer.unref();
const creatorRetentionTimer = setInterval(purgeCreatorPhotos, 24 * 60 * 60_000);
creatorRetentionTimer.unref();

server.listen(port, '0.0.0.0', () => {
  console.log(`BloomChat API listening on http://0.0.0.0:${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, closing BloomChat API`);
  clearInterval(expiryTimer);
  clearInterval(creatorRetentionTimer);
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
