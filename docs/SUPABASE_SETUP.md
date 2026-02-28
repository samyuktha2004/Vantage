# Supabase Setup (Canonical)

This guide covers only the Supabase + database connectivity details.

## Current architecture

- App uses `DATABASE_URL` for direct Postgres access via `pg` + Drizzle.
- Schema is managed from `shared/schema.ts`.
- Apply schema with `npm run db:push` (no required `001_initial_schema.sql` step).
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` exist in `.env.example` for optional client/storage use, but primary app persistence runs through `DATABASE_URL`.

## Prerequisites

- Node.js 18+
- Supabase project

## 1) Create Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a project and wait for provisioning.

## 2) Get database connection string

1. Supabase → Project Settings → Database
2. Copy the connection URI
3. Use the direct Postgres URI format in `.env` as `DATABASE_URL`

Example:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## 3) Configure local env

```bash
cp .env.example .env
```

Set at minimum:

```env
DATABASE_URL=...
SESSION_SECRET=...
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4) Push schema and run

```bash
npm install
npm run db:push
npm run dev
```

## 5) Verify

1. Sign up as Agent in local app.
2. Create an event.
3. Check Supabase Table Editor for inserted rows.

## Troubleshooting

### Drizzle push fails

- Check `DATABASE_URL` format and password.
- Confirm your Supabase project is active (not paused).
- Retry with stable network; some SSL/proxy setups need a reconnect.

### App runs but no data persists

- Ensure server started with correct `.env` file.
- Validate writes in Supabase Table Editor.
- Check server logs for query errors.

### Port conflict on macOS

- If `5000` is occupied (AirPlay), set `PORT=5001` in `.env`.

## Related docs

- Fast setup: [QUICKSTART.md](./QUICKSTART.md)
- TBO setup: [TBO_API_SETUP.md](./TBO_API_SETUP.md)
- Full integration reference: [API_INTEGRATION.md](./API_INTEGRATION.md)
