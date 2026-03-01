# GitHub Import → Full Local Setup (VS Code, Any OS)

Use this guide after importing/cloning the repo from GitHub to fully set up and run locally on VS Code (Windows/macOS/Linux).

## 0) What you need to set up

- Git
- Node.js 18+ (recommended: Node 20 LTS)
- npm 9+
- VS Code
- Supabase project (required for DB)
- TBO API credentials (optional; only needed for live hotel/flight APIs)

Check versions:

```bash
git --version
node -v
npm -v
```

## 1) Import from GitHub into VS Code

Choose one:

### Option A: Clone in terminal

```bash
git clone <YOUR_REPO_URL>
cd vantage
code .
```

### Option B: VS Code “Clone Repository”

1. Open VS Code.
2. Run `Cmd+Shift+P` → **Git: Clone**.
3. Paste repo URL and choose local folder.
4. Open the cloned `vantage` folder.

## 2) Install dependencies

From project root:

```bash
npm install
```

## 3) Create `.env` from template

### macOS/Linux (zsh/bash)

```bash
cp .env.example .env
```

### Windows (PowerShell)

```powershell
Copy-Item .env.example .env
```

## 4) Configure required environment variables

Update `.env` with these required values:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SESSION_SECRET=<RANDOM_HEX>
```

Generate `SESSION_SECRET` (works on all OS):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Notes:

- `DATABASE_URL` is mandatory. Use the direct Postgres URI from Supabase Settings → Database.
- `SESSION_SECRET` is mandatory for secure sessions.
- `PORT` is optional (defaults to `5000`).

## 5) Supabase setup (required)

1. Create/open your Supabase project.
2. Go to **Project Settings → Database → Connection string → URI**.
3. Paste that URI into `.env` as `DATABASE_URL`.
4. Run schema sync:

```bash
npm run db:push
```

This creates/updates all tables from `shared/schema.ts`.

## 6) Other setup (optional but useful)

### A) TBO live API credentials (optional)

If you want real hotel/flight search (not mock fallback), fill these in `.env`:

```env
TBO_HOTEL_URL=http://api.tbotechnology.in/TBOHolidays_HotelAPI
TBO_HOTEL_USERNAME=
TBO_HOTEL_PASSWORD=

TBO_AIR_URL=
TBO_AIR_USERNAME=
TBO_AIR_PASSWORD=
TBO_AIR_SERVER_IP=127.0.0.1
```

Without TBO credentials, app features still run locally with fallback/mock behavior where implemented.

### B) Recommended VS Code extensions (optional)

- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `ms-vscode.vscode-typescript-next`
- `ms-ossdata.vscode-postgresql` (if you want DB browsing from VS Code)

## 7) Start locally

```bash
npm run dev
```

Open:

- `http://localhost:5000` (default)
- If port conflict, set `PORT=5001` in `.env` and restart

## 8) Basic verification checklist

1. Sign up/sign in as Agent.
2. Create one event.
3. Add one guest.
4. Open guest link.
5. Check Supabase Table Editor for inserted rows.

## 9) Cross-platform troubleshooting

### `npm install` fails

- Use Node 18+.
- Delete `node_modules` and `package-lock.json`, then reinstall.

### `db:push` fails

- Recheck `DATABASE_URL` format and password.
- Confirm Supabase project is active.

### `EADDRINUSE` on startup

- Port is occupied; set `PORT=5001` (or another free port) in `.env`.

### Windows execution policy blocks scripts

- Run PowerShell as user and allow local scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 10) Useful commands

```bash
npm run dev      # start local dev server
npm run db:push  # sync schema to Supabase
npm run check    # TypeScript type-check
npm run build    # production build
```

## Related docs

- Supabase details: `docs/SUPABASE_SETUP.md`
- TBO credentials/setup: `docs/TBO_API_SETUP.md`
- Fast path: `docs/QUICKSTART.md`
