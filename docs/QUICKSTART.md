# Quickstart (5 Minutes)

Use this if you want the fastest local run path.

## 1) Install and configure

```bash
npm install
cp .env.example .env
```

Update `.env` with:

- `DATABASE_URL` (Supabase Postgres connection string)
- `SESSION_SECRET` (random 48+ bytes hex)
- Optional: `TBO_*` variables for live hotel/flight APIs

## 2) Sync database schema

```bash
npm run db:push
```

This project uses Drizzle schema push from `shared/schema.ts`.

## 3) Start app

```bash
npm run dev
```

Open:

- `http://localhost:5000` (default)
- If macOS port conflict, set `PORT=5001` in `.env` and use `http://localhost:5001`

## 4) Smoke test

1. Sign up as Agent.
2. Create an event.
3. Add one guest.
4. Open guest link and confirm portal loads.

## Need deeper setup?

- Supabase details: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- TBO credentials/setup: [TBO_API_SETUP.md](./TBO_API_SETUP.md)
- API implementation reference: [API_INTEGRATION.md](./API_INTEGRATION.md)
