# Bloom mobile app

Bloom is an end-to-end random chat experience built with Expo, React Native, and TypeScript.

## Included app flows

- Launch sequence from the product flow: terms/privacy consent, first-registration gender, dismissible plans, and Start Chat
- Free random matching plus Premium/points-based male and female filters
- Persistent text and photo chat, optional One View for each send, friend actions, call requests, and rich stranger profiles
- Hamburger menu for Friends, Chats & Messages, Search, daily friend suggestions, and Settings
- Persistent first-registration gender, gender-correct avatars, Bloom points, legal screens, notifications, block/report, and post-chat feedback
- Saved light/dark mode and text size preferences; chats expire 72 hours after creation
- Google AdMob interstitials after configurable completed-chat intervals, with consent handling and a retry screen for confirmed ad-delivery failures
- Creator entry in the menu, live camera selfie and code-photo steps, creator review status, separate Coin wallet, transfer history, and withdrawal requests

Anonymous IDs, real-user presence, online-only matching, points, friendships, blocks, reports, conversations, text and photo messages, and WebRTC voice/video calls are connected to the Bloom API. Calls use authenticated WebSocket signaling and STUN. Configure a public TURN service in `BACKEND/.env.example` for reliable calls across restrictive networks. No demo profiles are enabled in development or production. Real translation, automated moderation, push notifications, and store billing still need external services and credentials.

## Start developing

1. Install Node.js 22.13 or newer.
2. Run `npm install` if dependencies are missing.
3. Set `EXPO_PUBLIC_API_URL` in `.env.local` (Android emulator: `http://10.0.2.2:5000`).
4. Run `npm start`, or use `npm run android`, `npm run ios`, or `npm run web`.

AdMob is included in native builds, so Expo Go cannot display ads. Development builds use Google's test app IDs and test interstitial unit. For production builds, set `ADMOB_ANDROID_APP_ID` and `ADMOB_IOS_APP_ID` before native prebuild/build, then enter the corresponding live interstitial unit IDs in the backend admin dashboard. The backend keeps ad delivery disabled until an administrator enables it. Do not enable live ads with test IDs. The Google consent form needs a configured AdMob privacy message for regions where it is required. Web previews do not show native ads.

The app flow is coordinated in `App.tsx`, with feature screens in `src/screens`.

For web design review, use `?preview=main` and optionally `&tab=people`, `&tab=friends`, or `&tab=profile`.

## Structure

- `src/components` — reusable UI components
- `src/screens` — app flows and feature screens
- `src/constants` — theme, sample profiles, and app-wide data
- `src/types` — shared TypeScript types
