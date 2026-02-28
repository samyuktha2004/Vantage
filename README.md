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

The app runs at **http://localhost:5000** by default.

| OS | Default URL | Notes |
|----|-------------|-------|
| Windows / Linux | http://localhost:5000 | Works out of the box |
| macOS Monterey+ | http://localhost:5000 | ⚠️ May fail if AirPlay Receiver is on |

> **macOS AirPlay conflict:** macOS Monterey and later reserves port 5000 for AirPlay Receiver.
> If you see an error on startup, add `PORT=5001` to your `.env` and open http://localhost:5001 instead.
> To check: System Settings → General → AirDrop & Handoff → AirPlay Receiver.

---

### Environment Variables

Copy `.env.example` to `.env` and fill in these values:

| Variable | Where to find it | Required |
|----------|-----------------|----------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → URI | Yes |
| `SESSION_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | Yes (in prod) |
| `PORT` | Leave unset (default 5000). Set to `5001` only on macOS if AirPlay conflicts | No |
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

### Free Hosting (Zero Cost Stack)

The entire project can be hosted for **free** using these services:

| Layer | Service | Free tier |
|-------|---------|-----------|
| **Database** | [Supabase](https://supabase.com) | 2 projects, 500 MB DB, always-on |
| **App hosting** | [Render](https://render.com) | 1 free web service, spins down after 15 min idle |
| **App hosting** | [Railway](https://railway.app) | $5 free credit/month, no spin-down |

**Supabase** is already set up (your `DATABASE_URL` points to it). You just need to host the app.

#### Render (no credit card required)

1. Push your code to GitHub (make sure `.env` is in `.gitignore`)
2. [render.com](https://render.com) → New → Web Service → Connect your repo
3. Set these fields:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run start`
   - **Node version:** 18 (set in Environment → `NODE_VERSION=18`)
4. Add your environment variables (same as your local `.env`)
5. Click **Deploy** — Render gives you a `.onrender.com` URL

> **Free tier note:** Render spins your service down after 15 minutes of no traffic. The first request after idle takes ~30 seconds to wake up. For a hackathon demo, open the URL 30s before you present.

#### Railway ($5 free credit/month — no spin-down)

1. Push to GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select your repo → Railway auto-detects Node.js
4. Add environment variables in the Railway dashboard
5. Your app is live on a `.railway.app` URL immediately

Railway runs persistently (no cold starts) and the free $5/month credit covers ~500 hours — more than enough for a project this size.

---

### Why not Vercel or Firebase?

**Vercel** runs serverless functions, not persistent Node.js servers. This app uses Express sessions (stateful) and an in-memory session store — both incompatible with serverless. You'd need to rewrite auth as stateless JWTs first.

**Firebase Hosting** only serves static files. The Express API would need to be rewritten as Cloud Functions — significant restructuring.

**Use Render or Railway instead** — they run regular Node.js servers and need zero configuration changes.

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
