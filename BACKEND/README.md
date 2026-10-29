# Bloomchat Backend

Node.js + Express + TypeScript backend starter for Bloomchat.

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Check `.env` (configured for port `5000` by default).

### 3. Run development server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
npm start
```

## Folder Structure

- `src/config` — Configuration files and environment variables
- `src/controllers` — Route controllers and request handlers
- `src/middleware` — Custom Express middleware (auth, error handling, etc.)
- `src/models` — Data models and schemas
- `src/routes` — API route declarations
- `src/services` — Business logic and external service integrations
- `src/index.ts` — Main server entry point

