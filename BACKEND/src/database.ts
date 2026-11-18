import 'dotenv/config';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dataDirectory = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

fs.mkdirSync(dataDirectory, { recursive: true });

export const db = new Database(path.join(dataDirectory, 'bloom.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('secure_delete = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    token_hash TEXT UNIQUE,
    bloom_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT 'Private',
    city TEXT NOT NULL DEFAULT 'Private',
    flag TEXT NOT NULL DEFAULT '🌍',
    age INTEGER NOT NULL DEFAULT 18 CHECK(age >= 18),
    gender TEXT NOT NULL CHECK(gender IN ('Man', 'Woman', 'Other')),
    language TEXT NOT NULL DEFAULT 'English',
    level INTEGER NOT NULL DEFAULT 1,
    verified INTEGER NOT NULL DEFAULT 0,
    about TEXT NOT NULL DEFAULT '',
    interests TEXT NOT NULL DEFAULT '[]',
    points INTEGER NOT NULL DEFAULT 120 CHECK(points >= 0),
    premium_until TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    approved_at TEXT,
    PRIMARY KEY (user_id, friend_id),
    CHECK(user_id <> friend_id)
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (sender_id, receiver_id),
    CHECK(sender_id <> receiver_id)
  );

  CREATE TABLE IF NOT EXISTS blocks (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, blocked_id),
    CHECK(user_id <> blocked_id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    liked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('like', 'super')),
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, liked_id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    ended_at TEXT,
    CHECK(user_a <> user_b)
  );

  CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON conversations(user_a, created_at DESC);
  CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON conversations(user_b, created_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('text', 'image', 'location', 'points', 'call')),
    text TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at ASC);

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    external_id TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL
  );
`);

const messageColumns = db.pragma('table_info(messages)') as { name: string }[];
if (!messageColumns.some((column) => column.name === 'one_view')) db.exec('ALTER TABLE messages ADD COLUMN one_view INTEGER NOT NULL DEFAULT 0');
if (!messageColumns.some((column) => column.name === 'viewed_at')) db.exec('ALTER TABLE messages ADD COLUMN viewed_at TEXT');
db.exec('CREATE INDEX IF NOT EXISTS conversations_expiry_idx ON conversations(created_at)');
const userColumns = db.pragma('table_info(users)') as { name: string }[];
if (!userColumns.some((column) => column.name === 'theme')) db.exec("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark'))");
if (!userColumns.some((column) => column.name === 'font_scale')) db.exec('ALTER TABLE users ADD COLUMN font_scale REAL NOT NULL DEFAULT 1 CHECK(font_scale BETWEEN 0.8 AND 1.5)');
db.exec(`CREATE TABLE IF NOT EXISTS one_view_payloads (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
)`);
db.exec(`CREATE TABLE IF NOT EXISTS message_media (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  mime TEXT NOT NULL CHECK(mime IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes BLOB NOT NULL
)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ad_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
    male_interval INTEGER NOT NULL DEFAULT 3 CHECK(male_interval BETWEEN 1 AND 20),
    female_interval INTEGER NOT NULL DEFAULT 4 CHECK(female_interval BETWEEN 1 AND 20),
    other_interval INTEGER NOT NULL DEFAULT 4 CHECK(other_interval BETWEEN 1 AND 20),
    android_unit_id TEXT NOT NULL DEFAULT '',
    ios_unit_id TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ad_user_state (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completed_since_ad INTEGER NOT NULL DEFAULT 0 CHECK(completed_since_ad >= 0),
    pending_ticket_id TEXT,
    last_clear_at TEXT,
    last_blocked_at TEXT
  );
  CREATE TABLE IF NOT EXISTS ad_session_completions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY(user_id, conversation_id)
  );
  CREATE TABLE IF NOT EXISTS ad_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'served', 'cancelled')),
    created_at TEXT NOT NULL,
    served_at TEXT
  );
  CREATE INDEX IF NOT EXISTS ad_tickets_user_idx ON ad_tickets(user_id, status);
  CREATE TABLE IF NOT EXISTS ad_attempts (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES ad_tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'started' CHECK(status IN ('started', 'failed', 'impression')),
    error_code TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS ad_attempts_created_idx ON ad_attempts(created_at);
  CREATE TABLE IF NOT EXISTS ad_detection_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK(outcome IN ('clear', 'blocked', 'inconclusive', 'premium')),
    checkpoint TEXT NOT NULL,
    evidence TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ad_detection_events_created_idx ON ad_detection_events(created_at);
  CREATE TABLE IF NOT EXISTS ad_detection_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK(category IN ('dns', 'app', 'browser', 'vpn')),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS premium_plans (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    product_id TEXT NOT NULL DEFAULT '',
    price_label TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
    updated_at TEXT NOT NULL
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS coin_config (
    id INTEGER PRIMARY KEY CHECK(id=1), coin_name TEXT NOT NULL DEFAULT 'Coins',
    rupees_per_coin INTEGER NOT NULL DEFAULT 1 CHECK(rupees_per_coin BETWEEN 1 AND 100),
    min_topup_rupees INTEGER NOT NULL DEFAULT 50 CHECK(min_topup_rupees BETWEEN 1 AND 100000),
    min_withdrawal_coins INTEGER NOT NULL DEFAULT 100 CHECK(min_withdrawal_coins BETWEEN 1 AND 100000),
    creator_share_percent INTEGER NOT NULL DEFAULT 80 CHECK(creator_share_percent BETWEEN 1 AND 99),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS coin_wallets (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    purchased_coins INTEGER NOT NULL DEFAULT 0 CHECK(purchased_coins >= 0),
    earned_coins INTEGER NOT NULL DEFAULT 0 CHECK(earned_coins >= 0)
  );
  CREATE TABLE IF NOT EXISTS coin_transactions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('purchase','transfer_sent','transfer_received','withdrawal_hold','withdrawal_refund')),
    purchased_delta INTEGER NOT NULL DEFAULT 0, earned_delta INTEGER NOT NULL DEFAULT 0,
    related_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    reference_id TEXT, created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS coin_transactions_user_idx ON coin_transactions(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS coin_transfer_requests (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_request_id TEXT NOT NULL, recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, transfer_id TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY(user_id,client_request_id)
  );
  CREATE TABLE IF NOT EXISTS coin_orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK(platform IN ('android','ios')),
    package_coins INTEGER NOT NULL, amount_rupees INTEGER NOT NULL, product_id TEXT NOT NULL DEFAULT '',
    provider_transaction_id TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','credited','cancelled')),
    created_at TEXT NOT NULL, credited_at TEXT
  );
  CREATE TABLE IF NOT EXISTS coin_packages (
    coins INTEGER PRIMARY KEY CHECK(coins >= 50), android_product_id TEXT NOT NULL DEFAULT '',
    ios_product_id TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1))
  );
  CREATE TABLE IF NOT EXISTS creator_applications (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('selfie_required','otp_required','under_review','approved','rejected')),
    consent_at TEXT NOT NULL, selfie_encrypted BLOB, otp_photo_encrypted BLOB,
    selfie_result TEXT, otp_result TEXT, otp_hash TEXT, otp_encrypted BLOB, otp_expires_at TEXT,
    otp_attempts INTEGER NOT NULL DEFAULT 0, submitted_at TEXT, reviewed_at TEXT,
    reviewer_note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS creator_applications_user_idx ON creator_applications(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS creator_photo_fingerprints (
    digest TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES creator_applications(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS creator_withdrawals (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coins INTEGER NOT NULL CHECK(coins > 0), payout_paise INTEGER NOT NULL CHECK(payout_paise > 0),
    commission_paise INTEGER NOT NULL CHECK(commission_paise >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','rejected')),
    payout_reference TEXT, note TEXT, client_request_id TEXT, created_at TEXT NOT NULL, reviewed_at TEXT, paid_at TEXT
  );
  CREATE INDEX IF NOT EXISTS creator_withdrawals_user_idx ON creator_withdrawals(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS creator_admin_events (
    id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
    action TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL
  );
`);
db.prepare('INSERT OR IGNORE INTO coin_config (id, updated_at) VALUES (1, ?)').run(new Date().toISOString());
for (const coins of [50, 100, 200, 500, 1000]) db.prepare('INSERT OR IGNORE INTO coin_packages (coins) VALUES (?)').run(coins);
if (!(db.pragma('table_info(coin_orders)') as {name:string}[]).some((column) => column.name === 'product_id')) db.exec("ALTER TABLE coin_orders ADD COLUMN product_id TEXT NOT NULL DEFAULT ''");
if (!(db.pragma('table_info(creator_applications)') as {name:string}[]).some((column) => column.name === 'otp_encrypted')) db.exec('ALTER TABLE creator_applications ADD COLUMN otp_encrypted BLOB');
if (!(db.pragma('table_info(creator_withdrawals)') as {name:string}[]).some((column) => column.name === 'client_request_id')) db.exec('ALTER TABLE creator_withdrawals ADD COLUMN client_request_id TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS creator_withdrawals_request_idx ON creator_withdrawals(user_id,client_request_id)');
db.prepare('INSERT OR IGNORE INTO ad_config (id, updated_at) VALUES (1, ?)').run(new Date().toISOString());
for (const [category, names] of Object.entries({
  dns: ['AdGuard DNS', 'NextDNS', 'Control D', 'RethinkDNS', 'Pi-hole', 'Technitium DNS Server', 'CleanBrowsing', 'Cisco Umbrella', 'OpenDNS FamilyShield', 'Mullvad DNS Content Blocking', 'AdAway DNS'],
  app: ['AdGuard', 'Blokada', 'AdAway', 'DNS66', 'NetGuard', 'Rethink', 'personalDNSfilter', 'TrackerControl', 'DuckDuckGo App Tracking Protection'],
  browser: ['uBlock Origin', 'AdBlock', 'AdBlock Plus', 'Ghostery', 'Privacy Badger', 'AdGuard Browser Extension', 'Brave Shields', 'Firefox Tracking Protection', 'Opera Ad Blocker', 'Samsung Internet Content Blockers'],
  vpn: ['AdGuard VPN Filtering', 'Blokada VPN', 'NextDNS VPN Configuration', 'RethinkDNS VPN Mode', 'Local VPN-Based Filtering Applications', 'Custom DNS-Based Advertisement Filtering'],
})) {
  const insert = db.prepare('INSERT OR IGNORE INTO ad_detection_catalog (id, name, category, updated_at) VALUES (?, ?, ?, ?)');
  for (const name of names) insert.run(crypto.createHash('sha256').update(`${category}:${name}`).digest('hex').slice(0, 24), name, category, new Date().toISOString());
}
for (const [planId, label] of [['weekly', 'Weekly'], ['monthly', 'Monthly']]) {
  db.prepare('INSERT OR IGNORE INTO premium_plans (id, label, updated_at) VALUES (?, ?, ?)').run(planId, label, new Date().toISOString());
}

export const CHAT_LIFETIME_MS = 72 * 60 * 60 * 1000;
export function deleteExpiredChats() {
  // Cascading deletes remove messages, including any unconsumed one-view payloads.
  return db.transaction(() => {
    const cutoff = new Date(Date.now() - CHAT_LIFETIME_MS).toISOString();
    const expired = db.prepare('SELECT id, user_a, user_b FROM conversations WHERE created_at <= ?').all(cutoff) as { id: string; user_a: string; user_b: string }[];
    if (expired.length) db.prepare('DELETE FROM conversations WHERE created_at <= ?').run(cutoff);
    return expired;
  })();
}

// Older builds inserted reciprocal friends as soon as one person tapped Add.
// Those rows remain unapproved until the recipient accepts a new request.
const friendColumns = db.pragma('table_info(friends)') as { name: string }[];
if (!friendColumns.some((column) => column.name === 'approved_at')) db.exec('ALTER TABLE friends ADD COLUMN approved_at TEXT');

db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
db.transaction(() => {
  const migration = 'legacy_friends_to_requests_v1';
  if (db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(migration)) return;
  db.prepare(`INSERT OR IGNORE INTO friend_requests (sender_id, receiver_id, created_at)
    SELECT f.user_id, f.friend_id, f.created_at FROM friends f
    WHERE f.approved_at IS NULL AND f.user_id < f.friend_id
      AND EXISTS (SELECT 1 FROM friends reciprocal WHERE reciprocal.user_id = f.friend_id AND reciprocal.friend_id = f.user_id AND reciprocal.approved_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id = f.user_id AND b.blocked_id = f.friend_id) OR (b.user_id = f.friend_id AND b.blocked_id = f.user_id))`).run();
  db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migration);
})();

if (process.env.NODE_ENV !== 'production') {
  const timestamp = new Date().toISOString();
  const previewPeople = [
    { id: 'demo_maya', bloomId: 'BLOOM-DEMO01', name: 'Maya', country: 'Spain', city: 'Barcelona', flag: '🇪🇸', age: 24, gender: 'Woman', language: 'English', level: 18, verified: 1, about: 'Coffee, weekend trips, and good conversations.', interests: ['Travel', 'Music', 'Coffee'], seed: 'bloom-maya' },
    { id: 'demo_noah', bloomId: 'BLOOM-DEMO02', name: 'Noah', country: 'Canada', city: 'Toronto', flag: '🇨🇦', age: 27, gender: 'Man', language: 'English', level: 12, verified: 1, about: 'Design, cooking, and sharing playlists.', interests: ['Design', 'Food', 'Movies'], seed: 'bloom-noah' },
    { id: 'demo_aisha', bloomId: 'BLOOM-DEMO03', name: 'Aisha', country: 'United Kingdom', city: 'London', flag: '🇬🇧', age: 23, gender: 'Woman', language: 'English', level: 21, verified: 1, about: 'Books, live music, and spontaneous travel.', interests: ['Books', 'Concerts', 'Travel'], seed: 'bloom-aisha' },
    { id: 'demo_arjun', bloomId: 'BLOOM-DEMO04', name: 'Arjun', country: 'India', city: 'Bengaluru', flag: '🇮🇳', age: 26, gender: 'Man', language: 'Hindi', level: 16, verified: 0, about: 'Tech by day, cricket and anime by night.', interests: ['Tech', 'Cricket', 'Anime'], seed: 'bloom-arjun' },
    { id: 'demo_sofia', bloomId: 'BLOOM-DEMO05', name: 'Sofia', country: 'Brazil', city: 'Rio de Janeiro', flag: '🇧🇷', age: 25, gender: 'Woman', language: 'Portuguese', level: 24, verified: 1, about: 'Beach days, photography, and meeting kind people.', interests: ['Photos', 'Fitness', 'Beach'], seed: 'bloom-sofia' },
  ] as const;
  const insertPreview = db.prepare(`INSERT OR IGNORE INTO users
    (id, token_hash, bloom_id, name, avatar, country, city, flag, age, gender, language, level, verified, about, interests, points, is_demo, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 120, 1, ?, ?)`);
  const seedPreviews = db.transaction(() => {
    for (const person of previewPeople) {
      insertPreview.run(person.id, person.bloomId, person.name,
        `https://api.dicebear.com/9.x/notionists-neutral/png?seed=${person.seed}`,
        person.country, person.city, person.flag, person.age, person.gender, person.language,
        person.level, person.verified, person.about, JSON.stringify(person.interests), timestamp, timestamp);
    }
  });
  seedPreviews();
}

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}

export function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function now() {
  return new Date().toISOString();
}
