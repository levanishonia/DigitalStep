# DigitalStep

DigitalStep is a real mobile app for small-business marketing management and automation. It is **not AI-first**: the initial product focuses on a practical marketing manager workflow with auth, onboarding, daily tasks, content planning, campaigns, recommendations, and settings.

## Monorepo layout

```text
apps/mobile       Expo React Native app with TypeScript
apps/api          Lightweight Express API server, Railway-ready
packages/database Prisma schema, client generation, and seed script
packages/shared   Shared TypeScript types and app constants
```

## Tech stack

- Expo React Native + TypeScript for the mobile app
- Lightweight Node/Express API for backend routes
- Prisma + PostgreSQL for persistence
- Railway-ready API deployment
- Clean mobile-first UI components and screen structure

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL locally and update `DATABASE_URL` if needed.

4. Generate Prisma Client and run migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Seed demo data:

   ```bash
   npm run db:seed
   ```

6. Start the API:

   ```bash
   npm run dev:api
   ```

7. Start the mobile app in another terminal:

   ```bash
   npm run dev:mobile
   ```

## Demo account

After seeding, use:

- Email: `owner@digitalstep.app`
- Password: `password123`

## Current product scope

Included now:

- Welcome, login, register, and business onboarding screens
- Home dashboard and marketing workflow screens
- Tasks, content planner, calendar, campaigns, recommendations, and settings screens
- JWT auth flow with protected API routes
- Prisma models for User, Business, ContentItem, Task, Campaign, and Recommendation
- Seed data for a realistic small-business workspace

Intentionally not included yet:

- AI content generation
- Payments or subscriptions
- Social media publishing integrations

## API overview

Base URL defaults to `http://localhost:4000`.

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /me`
- `POST /businesses`
- `GET /dashboard`
- `GET /tasks`
- `GET /content-items`
- `GET /campaigns`
- `GET /recommendations`

## Railway deployment notes

The API is ready to deploy as a Railway service:

1. Create a Railway PostgreSQL database.
2. Set service root to `apps/api` if deploying the API as a focused service, or use the root with the commands below.
3. Add environment variables:
   - `DATABASE_URL` from Railway PostgreSQL
   - `JWT_SECRET`
   - `CORS_ORIGIN` for your Expo/web origin when applicable
   - `NODE_ENV=production`
4. Build command from repo root:

   ```bash
   npm install && npm run db:generate && npm run build --workspace @digitalstep/api
   ```

5. Start command from repo root:

   ```bash
   npm run start --workspace @digitalstep/api
   ```

6. Run migrations before production traffic:

   ```bash
   npm run db:migrate
   ```

Railway automatically provides `PORT`; the API falls back to `4000` locally.
