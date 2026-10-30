# Bloom mobile app

Bloom is an end-to-end random chat experience built with Expo, React Native, and TypeScript.

## Included frontend flows

- Animated splash, onboarding, anonymous Bloom ID, gender selection, and one-step 18+/terms agreement
- Home, video/voice/text matching, practical filters, chat, translation, and safety tools
- For You profiles, friend requests, private conversations, verified profiles, and notifications
- Settings/privacy plus post-chat like, block, report, and comfort-rating states

Live media calls, moderation, translation, and persistent anonymous IDs are represented as polished UI states ready to connect to backend services.

## Start developing

1. Install Node.js 22.13 or newer.
2. Run `npm install` if dependencies are missing.
3. Run `npm start` and open with Expo Go, or use `npm run android`, `npm run ios`, or `npm run web`.

The app flow is coordinated in `App.tsx`, with feature screens in `src/screens`.

For web design review, use `?preview=main` and optionally `&tab=people`, `&tab=friends`, or `&tab=profile`.

## Structure

- `src/components` — reusable UI components
- `src/screens` — app flows and feature screens
- `src/constants` — theme, sample profiles, and app-wide data
- `src/types` — shared TypeScript types
