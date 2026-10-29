# Bloomchat 🌸

Bloomchat is a modern random chat mobile application featuring a dark neon glassmorphism UI theme.

## Architecture

- **`APP/`**: React Native + Expo mobile application
  - Dark obsidian & radiant violet/magenta neon glassmorphic theme
  - Anonymous & Instant Random Chat Matchmaking with interest topics
  - Rich chat conversations with frosted glass received bubbles & gradient sent bubbles
  - Active users, status indicators, stories, and bottom glass navigation
- **`BACKEND/`**: Node.js + Express + TypeScript server
  - Clean modular architecture (`controllers`, `routes`, `models`, `middleware`, `services`, `config`)
  - Ready for WebSocket / Socket.io real-time chat & REST APIs

## Quick Start

### 1. Mobile App (`APP`)
```bash
cd APP
npm install
npm start
```

### 2. Backend Server (`BACKEND`)
```bash
cd BACKEND
npm install
npm run dev
```
