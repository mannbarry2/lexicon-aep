# AEP Lexicon

A glossary application for Adobe Experience Platform terminology and Adobe Speak vocabulary. Migrated from Replit.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind + Radix UI (shadcn-style)
- **Backend**: Node.js + Express + TypeScript (tsx)
- **Database**: Neon PostgreSQL via Drizzle ORM
- **Storage**: Firebase Storage (images)
- **Email**: SendGrid
- **Auth**: Passport (local strategy) + express-session

## Local Development

```bash
npm install
cp .env.example .env   # then fill in your values
npm run dev
```

Server runs on port 5000 by default.

## Required Environment Variables

```
DATABASE_URL=postgresql://...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
SENDGRID_API_KEY=...
SESSION_SECRET=...
```

Firebase Admin SDK service account JSON should be set as `FIREBASE_SERVICE_ACCOUNT_JSON` (single line).

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – run production build
- `npm run check` – TypeScript check
- `npm run db:push` – sync Drizzle schema to DB

## Deployment

Designed for deployment on Render / Railway / Fly.io. See deployment notes in repository wiki.
