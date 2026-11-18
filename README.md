# Bloom 🌸

Bloom is a focused, safety-first 18+ anonymous chat application for text, voice, video, and private friendships. It uses unique Bloom IDs instead of phone, email, or social sign-in.

## Architecture

- **`APP/`**: Expo + React Native mobile application
  - Anonymous registration, gender-aware avatars, matching, people discovery, friends, chat, privacy, and settings
  - Warm botanical identity using coral, violet, cream, and deep plum
  - Persistent messaging and native WebRTC voice/video calls
- **`BACKEND/`**: Node.js + Express + TypeScript API
  - Token auth, matching, points, friends, blocks, reports, subscriptions, SQLite persistence, WebSocket signaling, and temporary TURN credentials

## Quick start

Start the API first with `cd BACKEND && npm install && npm run dev`, then start the app with `cd APP && npm install && npm start`.

For calls across restrictive networks, configure a public TURN server using `TURN_URL` and `TURN_SHARED_SECRET` in `BACKEND/.env.example`; STUN-only connections can fail behind some NATs or firewalls.

Run `npm run typecheck` in both projects and `npm run test:e2e` in `BACKEND` to validate the complete data flow. A production API container is provided through `docker-compose.yml`.
