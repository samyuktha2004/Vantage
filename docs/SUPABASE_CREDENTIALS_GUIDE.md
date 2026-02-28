# Supabase Credentials Guide (Visual)

Use this guide to collect the required values for `.env`.

## What this app actually needs

Primary runtime values:

- `DATABASE_URL` (required)
- `SESSION_SECRET` (required)

Optional values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Step 1: Create project

1. Go to https://supabase.com/dashboard
2. Create a new project
3. Save your DB password safely

## Step 2: Copy `DATABASE_URL`

1. Open Project Settings → Database
2. Copy the Postgres connection URI
3. Put it in `.env` as `DATABASE_URL`

## Step 3: (Optional) Copy project URL and anon key

1. Open Project Settings → API
2. Copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`

## Step 4: Configure local file

```bash
cp .env.example .env
```

Then fill values:

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
```

Generate `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Step 5: Sync schema and verify

```bash
npm install
npm run db:push
npm run dev
```

Create one user and one event in the app, then confirm rows in Supabase Table Editor.

## Security reminders

- Never commit `.env`
- Never share service-role keys publicly
- Rotate credentials if leaked

## Related docs

- [QUICKSTART.md](./QUICKSTART.md)
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
