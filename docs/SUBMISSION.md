# Vantage — VoyageHack 3.0 Submission

## One-line pitch

An end-to-end Event Hospitality Management platform that streamlines guest onboarding, travel coordination and real-time capacity monitoring with secure guest access links and built-in TBO integrations.

## Problem Statement

Large corporate events require fast, reliable guest management and travel coordination. Manual guest handling causes lost time, capacity issues, and mismatched travel arrangements.

## Our Solution

Vantage provides organizers a unified dashboard to import and manage guest lists, issue secure guest portal links, coordinate travel bookings (hotel & flights), and manage approvals and requests — with real-time capacity alerts and downloadable reports.

## Why this wins

- Comprehensive end-to-end flow: import → manage → notify → report.
- Token-based guest access removes password friction while preserving security.
- Native integrations for TBO (hotel & flight endpoints) make bookings and prebook flows demonstrable to judges.
- Focus on operational needs (capacity warnings, approval workflow, ID vault) that organizers value in production.

## Key Features

- Bulk guest import (Excel/CSV) with data validation and reporting.
- Unique, secure guest access links (token-based portal).
- Hotel & flight search + prebook/book flows using TBO APIs (placeholders for credentials in `.env.example`).
- Approval and request workflow for payments and room upgrades.
- Real-time capacity monitoring and visual alerts.
- Document vault for IDs (Supabase storage) and exportable Excel reports.

## Technical Highlights

- Frontend: React + TypeScript, Tailwind, Framer Motion, React Query.
- Backend: Express + TypeScript, Drizzle ORM, PostgreSQL (Supabase), secure sessions.
- CI/Deployment: repository-ready for GitHub Actions, deployable to Vercel/Netlify (see `DEPLOY.md` placeholder).

## TBO Integration

- We demonstrate TBO hotel/flight flows in `server/tbo/` and `server/tbo-*` routes and provide a Postman collection in the repo root for reproducibility.
- Credentials are intentionally omitted; use `TBO_*` env vars (see `.env.example`) to run live tests.

## Run locally

1. Copy placeholders: `cp .env.example .env` and fill in Supabase and (optional) TBO credentials.
2. Install: `npm install`
3. Migrate DB: `npm run db:push`
4. Start dev server: `npm run dev`

## What to review in the repo

- `client/src/pages` — UI flows for guests, agent dashboard, approvals.
- `server/` — API routes, TBO integration, Supabase client code.
- `docs/SUPABASE_SETUP.md` and `README.md` — setup and evaluation instructions.
- `HotelAPI Client.postman_collection 6.json` — collection to replay hotel/booking calls.

## Demo and assets

- A short demo GIF and optional video link will be added to `README.md` (recommendation: 60–90s highlighting import → booking → approval flows).

## Scoring guidance for judges

Map features to common hackathon criteria:

- Innovation: token-based guest access + payload minimization.
- Technical complexity: TBO integration, real-time capacity logic, document vault.
- UX & polish: focused flows, clear error handling, and exportable reporting.

## Notes for judges

- The repo intentionally uses `env.example` for credentials — reviewers can run with their own keys. If you need live TBO sandbox credentials, contact the team via the repo issue or email listed in `README.md`.

## Release

We will tag `voyagehack-3.0` for the submission release and attach a zip containing the production-ready build.

---

_Prepared for VoyageHack 3.0 by Travel Boutique Online (TBO). For questions or a live walkthrough, open an issue or contact the maintainers._
