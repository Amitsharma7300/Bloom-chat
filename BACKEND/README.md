# Bloom backend

Production-oriented Express and TypeScript API for Bloom's mobile application.

## Implemented

- Anonymous, token-authenticated sessions with gender-correct default avatars
- SQLite persistence with WAL, foreign keys, indexes, and graceful shutdown
- People discovery, gender-filtered matching, point charging, friends, likes, blocks, and reports
- Persistent conversations and messages with authenticated WebSocket delivery
- Automatic conversation and message deletion after 72 hours, with a startup and minute cleanup sweep
- One View text and photos with recipient-only, single-use reveal and immediate payload deletion
- Per-user light/dark theme and text size preferences
- Authenticated WebSocket call signaling and short-lived TURN REST credentials
- Subscription webhook endpoint, security headers, CORS allow-listing, validation, request limits, and rate limiting
- Docker image, Compose service, health endpoint, and an end-to-end API test
- Per-user completed-chat ad counters, signed ad-delivery checks, impression-only counter reset, Premium bypass, and an authenticated ad dashboard
- Creator applications, encrypted verification images, admin review, separate Coin wallets, idempotent transfers, withdrawal holds, and a creator admin dashboard

## Local development

```bash
npm install
npm run dev
```

The API listens on `http://localhost:5000`. In non-production environments it seeds five offline preview profiles for the Explore screen. They are labeled as previews in the app and are excluded from matchmaking. Production never seeds or returns these profiles. Real matching only selects registered users with a live WebSocket connection.

Validate changes with:

```bash
npm run typecheck
npm run test:e2e
```

## Ads and Premium

Set a random `ADMIN_API_KEY` of at least 32 characters and `AD_PROBE_SECRET`, then open `/admin/ads`. The dashboard shows impressions, failed requests, detection events, subscriptions, frequencies, and the known-filter catalog. Ads start disabled; set live Android/iOS AdMob interstitial unit IDs and enable them in the dashboard after the native app is built with matching production AdMob app IDs. The default thresholds are three completed random chats for men and four for women. A chat counts only when it is explicitly ended after at least 15 seconds and has content, or after 60 seconds; disconnects do not count. Only a native AdMob impression event resets a counter. Premium entitlement is checked on the server and cancels pending ad tickets.

Ad delivery checks use two short-lived, signed requests. Failure of both is recorded as a likely block; inconclusive results are allowed to avoid false positives during network faults. This can identify blocked Bloom ad paths but cannot reliably identify a particular DNS service, browser extension, or VPN. The catalog is for administrators and is not used to inspect installed software. Store purchase activation requires a verified billing provider and product IDs; the existing Premium purchase preview remains disabled until those credentials are supplied. The billing webhook must only be called by a trusted billing service.

## Creator and Coin setup

Open `/admin/creators` with the same `ADMIN_API_KEY` used for the ads dashboard. The admin can inspect both protected photos and the code, review verification results, approve or reject applications, configure the Coin name/pricing/minimums/revenue share, inspect wallet and transaction records, and approve/reject/mark withdrawals paid. The dashboard requires both photos to be opened before a creator decision. Marking a withdrawal paid requires an actual external payout reference; the application does not send bank transfers itself.

Set `CREATOR_IMAGE_KEY` to 64 random hexadecimal characters and keep it backed up securely. Changing it makes retained photos and codes unreadable. Set `CREATOR_VERIFY_URL` to an HTTPS identity provider endpoint and `CREATOR_VERIFY_TOKEN` to its secret. The provider receives `step`, `imageBase64`, `referenceSelfieBase64` for the second step, `expectedCode`, and `requirements`; it must return `faceDetected`, `faceFrameFraction`, `livenessPassed`, and `authentic`. For the code photo it must also return `sameFace`, `faceAndCodeTogether`, and `handwrittenCode`. The backend checks every result and the exact code before allowing admin review. The default provider is **unconfigured**, so applications stay disabled rather than accepting unverified photos. A plain still-photo classifier cannot establish robust liveness; connect a provider that performs a real liveness challenge before production use. Verification photos and codes are encrypted with AES-256-GCM and removed 30 days after review or 7 days after an abandoned application. Keep the provider and storage in a region compatible with your privacy policy.

The Coin wallet is separate from the existing free Bloom points. The app shows ₹50, ₹100, ₹200, ₹500, and ₹1,000 packages, but purchases remain unavailable until Android/iOS store products and a trusted receipt-verification service are connected. Configure `COIN_BILLING_WEBHOOK_SECRET`, store product IDs, and packages in the admin dashboard. After independently verifying a purchase with Google Play or App Store, the trusted billing service may call `POST /api/v1/coins/billing/confirm` with `x-bloom-coin-billing-secret` and `{orderId,providerTransactionId,platform,productId}`. The backend credits each order and transaction once. Never expose this secret to the mobile app. Creator earnings arise from member-to-creator Coin transfers; purchased Coins and free points do not become the sender's withdrawable earnings. Withdrawals reserve earned Coins and calculate the payout using the configured percentage in integer paise. Rejection refunds the held Coins; approval and a recorded external payout reference mark a request paid. Complete KYC, tax, payment-provider, and store-policy setup before opening live payments.

## Production deployment

Copy `.env.example`, replace every example origin/secret, then run from the repository root:

```bash
docker compose up --build -d
```

The included SQLite setup is suitable for a single API instance. Use PostgreSQL and shared real-time infrastructure before horizontal scaling. Store billing should call the authenticated billing webhook; the development activation route is disabled when `NODE_ENV=production`.

The mobile app now uses WebRTC for live voice and video. Direct STUN connections work where peer-to-peer traffic is allowed. For reliable calls across restrictive mobile and office networks, deploy a public TURN server such as coturn, set `TURN_URL` and `TURN_SHARED_SECRET` in the API environment, and configure the TURN server with the same shared secret. Open the TURN listener (UDP/TCP 3478) and its configured UDP relay port range in the host firewall. The API issues one-hour, user-bound TURN credentials; the shared secret stays on the server. Calls can connect without TURN on some networks, but TURN is required when direct ICE paths fail.

File uploads, automated moderation, push notifications, and app-store billing still require external provider setup.
