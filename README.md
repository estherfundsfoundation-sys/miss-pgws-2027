# Miss Pretty Girls Who Serve 2027

The official application, contestant, and staff platform for **Miss Pretty
Girls Who Serve 2027 — The New Beauty Issue** by Esther Funds Foundation.

## Platform

- Next.js App Router and React
- Vercel deployment
- Supabase Auth, Postgres, and Storage
- Jotform voting totals read through server-only API routes

The public application pages never receive privileged credentials. Supabase
Row Level Security remains the source of truth for applicant and staff access,
and Jotform credentials stay in Vercel's encrypted environment settings.

## Local setup

1. Install Node.js 22.13 or newer.
2. Run `npm ci` in an environment with npm registry access.
3. Copy `.env.example` to `.env.local` and add development credentials.
4. Run `npm run doctor`.
5. Run `npm run dev`.

Never commit `.env.local`, a Supabase secret key, or a Jotform API key.

## Commands

- `npm run doctor` checks the source, lockfile, environment safety, and brand
  assets without requiring installed dependencies.
- `npm run dev` starts the Next.js development server.
- `npm run build` creates the production build used by Vercel.
- `npm test` runs the foundation check, production build, and source tests.
- `npm run db:generate` is retained while database migrations are being
  finalized.

## Deployment

Vercel should use the standard framework preset with:

- Install command: `npm ci`
- Build command: `npm run build`
- Output: detected automatically by Next.js

Set the variables documented in `.env.example` for Preview and Production.
The future branded domain is `misspgws.estherfundsfoundation.org`.
