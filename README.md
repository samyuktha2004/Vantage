# Vantage

> **Group Travel Management Platform** for MICE, destination weddings, and corporate events.
> Built for **VoyageHacks 3.0 by TBO**.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

---

## Running the Project Locally

### Prerequisites

- **Node.js 18+** — check with `node -v`
- A **Supabase** project (free tier is fine) — [supabase.com](https://supabase.com)

### Setup steps

```bash
# 1. Clone and install
git clone https://github.com/samyuktha2004/Vantage.git
cd Vantage
npm install

# 2. Create your .env file from the template
cp .env.example .env
# Then open .env and fill in your DATABASE_URL and SESSION_SECRET (see below)

# 3. Push the schema to your Supabase DB (run this once, and again after schema changes)
npm run db:push

# 4. Start the dev server
npm run dev
```

The app runs at **http://localhost:5001**

> **macOS note:** macOS Monterey and later uses port 5000 for AirPlay Receiver, which blocks the server.
> The `.env.example` sets `PORT=5001` to avoid this. If you change the port, update your browser URL accordingly.

---

### Environment Variables

Copy `.env.example` to `.env` and fill in these values:

| Variable | Where to find it | Required |
|----------|-----------------|----------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → URI | Yes |
| `SESSION_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Yes (in prod) |
| `PORT` | Any free port — use `5001` on macOS | No (default: 5000) |
| `TBO_HOTEL_URL` | TBO B2B Holidays API base URL | For hotel search |
| `TBO_HOTEL_USERNAME` / `TBO_HOTEL_PASSWORD` | TBO Hackathon credentials | For hotel search |
| `TBO_AIR_URL` | TekTravels UAT endpoint | For flight search |
| `TBO_AIR_USERNAME` / `TBO_AIR_PASSWORD` | TBO Hackathon credentials | For flight search |
| `TBO_AIR_SERVER_IP` | Your server's public IP (use `127.0.0.1` for local) | For flight auth |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are **not required** — the app connects directly to Postgres via `DATABASE_URL`.

---

## How the Database Works

The project uses **Drizzle ORM** connected directly to **Supabase PostgreSQL**.

```
shared/schema.ts          ← Single source of truth for all tables and columns
      ↓
npm run db:push           ← Drizzle reads the schema and syncs it to Supabase
      ↓
server/db.ts              ← Creates a connection pool using DATABASE_URL
      ↓
server/storage.ts         ← All DB queries (wrapped in typed functions)
server/routes.ts          ← API handlers call storage functions
```

### Key points

- **`shared/schema.ts`** is where all tables are defined. If you add a column here, run `npm run db:push` to apply it to the live DB.
- **No migration files are used** — `db:push` applies changes directly. This is fast for development but skips the migration history. The `migrations/` folder is a stale artefact and can be ignored.
- **Session store is in-memory** (`MemoryStore`). Sessions are lost when the server restarts. For production, swap in `connect-pg-simple` to persist sessions in Postgres.
- **DB reset for demos**: Paste `supabase/migrations/002_clear_data.sql` into the Supabase SQL Editor to wipe all data and reset ID sequences.

### Drizzle cheat sheet

```bash
npm run db:push     # Apply schema changes to Supabase (run after editing shared/schema.ts)
npm run dev         # Start dev server (hot reload)
npm run build       # Build for production (output: dist/)
npm run start       # Run production build
```

---

## Deploying

### Railway (Recommended)

Railway supports persistent Node.js processes — the simplest match for this app.

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Add environment variables in the Railway dashboard (same as your `.env`)
4. Railway auto-detects Node.js, runs `npm install && npm run build && npm run start`
5. Your app is live on a `.railway.app` URL

**No `vercel.json` or config files needed.**

### Render

1. Push to GitHub
2. [render.com](https://render.com) → New Web Service → Connect repo
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Add env vars, deploy

> Render's free tier spins down after 15 minutes of inactivity — first request after sleep takes ~30s.

---

### Why not Vercel?

Vercel runs **serverless functions**, not persistent Node.js processes. This app uses:
- **Express sessions** (stateful — lost between serverless invocations)
- **In-memory session store** (doesn't survive cold starts)
- **Long-lived DB connection pool** (incompatible with per-request serverless)

Hosting this on Vercel would require rewriting the auth system as stateless (JWTs) and replacing the session store. That's a significant change — **use Railway or Render instead.**

### Why not Firebase?

Firebase Hosting serves **static files only**. The Express API would need to be rewritten as **Firebase Cloud Functions** — another significant restructuring. Not recommended.

---

## Architecture

```
Vantage/
├── client/                     # React 18 frontend (Vite)
│   └── src/
│       ├── components/         # Shared UI (shadcn/ui, hotel search, flight search)
│       ├── hooks/              # TanStack Query hooks (use-tbo-hotels, use-tbo-flights, etc.)
│       ├── lib/                # Utilities (excelParser, report generators)
│       └── pages/
│           ├── auth/           # Sign-in / sign-up pages (agent, client, ground team)
│           ├── guest/          # 4-step guest wizard (rsvp, travel-prefs, summary, addons)
│           └── groundteam/     # Check-in dashboard + rooming list
├── server/
│   ├── index.ts                # Entry point, session middleware, port config
│   ├── routes.ts               # All agent/client/event/inventory API routes
│   ├── guest-routes.ts         # Guest portal routes (token-based, no auth)
│   ├── storage.ts              # All DB queries (Drizzle)
│   ├── db.ts                   # DB connection pool
│   └── tbo/                    # TBO API services (hotel + flight)
├── shared/
│   ├── schema.ts               # ← Drizzle table definitions (source of truth)
│   └── routes.ts               # Shared API route path constants
└── supabase/
    └── migrations/
        └── 002_clear_data.sql  # Utility: wipe all data for demo reset
```

---

## User Roles

| Role | Access | Sign-in URL |
|------|--------|-------------|
| **Agent** | Creates events, imports guests, manages all settings | `/auth/agent/signin` |
| **Client** | Views their event, edits label budgets, toggles perk coverage | `/auth/client/signin` |
| **Ground Team** | Check-in dashboard + rooming list, scoped to one event | `/auth/groundteam/signin` |
| **Guest** | Token-based URL — no login required | `/guest/:token` |

---

## Key User Flows

### Agent creates an event
```
Sign in → Dashboard "+ New Event" → EventSetup (hotel + flight via TBO) →
Labels tab (add tiers + budgets) → Perks tab → Import guests (CSV/XLSX) →
Publish → Copy invite link → Share with guests
```

### Guest RSVPs
```
Open microsite /event/:eventCode → Enter booking ref →
/guest/:token → RSVP + family → Travel prefs → Summary → Add-ons → Receipt
```

### Ground team checks in guests
```
Sign in → /groundteam/:id/checkin → Scan QR / search by name →
Mark Arrived → Update flight status → Walk-in registration if needed
```

### Client monitors the event
```
Sign in → Enter event code → ClientEventView →
Edit label budgets → Toggle perk coverage → View pending requests
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query v5 |
| UI | shadcn/ui, Tailwind CSS, Framer Motion |
| Backend | Express 5, TypeScript, tsx (dev) |
| Database | PostgreSQL via Supabase, Drizzle ORM |
| Auth | bcryptjs + express-session (agents/clients); token URL (guests) |
| APIs | TBO Hotel B2B, TBO Air (TekTravels) |
| Utilities | XLSX (Excel import/export), Papaparse (CSV), html5-qrcode |
