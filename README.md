# Squad Planner

Responsive cricket tournament squad planning built with Next.js, TypeScript, Tailwind CSS, and hosted Supabase.

The production-ready application includes authentication and profiles, team-scoped player planning, auctions, squads, tournaments, opportunity tracking, volunteer duties, and reporting. Supabase provides PostgreSQL, Auth, private Storage, RLS, and Realtime; the Next.js architecture is compatible with Vercel.

## Requirements

- Node.js 22.13 or newer; Node.js 24 LTS is recommended
- npm or pnpm
- Existing hosted Supabase project

```bash
npm install
copy .env.example .env.local
npm run dev
```

## Environment

Set the hosted Project URL and publishable key in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` is ignored by Git. Never place a secret key, service-role key, database password, or personal access token in the application environment.

## Manual database setup

Do not use Supabase CLI linking for this project. Follow [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) and manually run:

Apply `supabase/migrations/001_initial_schema.sql` through `supabase/migrations/006_profile_production.sql` in numeric order.

through **Supabase Dashboard → SQUADPLANNERDB → SQL Editor → New Query**.

The migration creates:

- `profiles`, `teams`, and `team_members`
- reusable updated-at triggers
- safe Auth profile creation
- atomic `create_team` RPC using `auth.uid()`
- non-recursive membership and role helpers
- RLS policies scoped to authorised teams
- private `team-assets` Storage bucket and policies
- non-sensitive setup-status RPC for development verification

## Development verification

Open [http://localhost:3000/dev/supabase-check](http://localhost:3000/dev/supabase-check).

The route reports only configuration and availability booleans. It never displays keys, tokens, cookies, credentials, connection strings, or database rows. It returns 404 in production. Before the migration is applied, table checks are expected to fail gracefully.

## Production

Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` before release. Follow the [Vercel deployment guide](docs/VERCEL_DEPLOYMENT.md) and [email setup](docs/EMAIL_SETUP.md). Never commit application, database, or SMTP credentials.

Bucket-scoped `.xlsx`/`.csv` player imports and imported summary statistics are documented in [Bucket player import](docs/BUCKET_PLAYER_IMPORT.md). Apply Migration 007 before using that workflow.

## Authentication routes

| Route | Purpose |
| --- | --- |
| `/login` | Email/password sign in |
| `/signup` | Registration with full name, email, and password |
| `/forgot-password` | Request a password reset email |
| `/reset-password` | Choose a new password from a recovery session |
| `/auth/callback` | Exchange Supabase PKCE/recovery codes |
| `/dashboard` | Authenticated team dashboard |
| `/teams/new` | Temporary `create_team` RPC test |

Unauthenticated requests to `/dashboard` or `/teams/*` redirect to `/login`.

## Security model

- Browser and per-request server clients use `@supabase/ssr`; no global server client shares sessions.
- Protected data access and server actions re-check authentication close to the operation.
- Team reads require membership through RLS.
- Team updates require `owner` or `captain` role.
- `team_members` policies use private security-definer helpers to avoid RLS recursion.
- `create_team` atomically creates the team and owner membership. Callers cannot choose `created_by`.
- Team assets use private paths under `teams/{teamId}/...`; image binaries are not stored in PostgreSQL.

## Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Project structure

```text
docs/SUPABASE_SETUP.md             Manual Dashboard and verification guide
supabase/migrations/001_initial_schema.sql
src/app/(auth)/                    Authentication routes and actions
src/app/(protected)/               Dashboard and protected team routes
src/app/dev/supabase-check/        Development-only health page
src/lib/supabase/                  Browser, server, proxy, and health utilities
src/lib/auth/                      Request-time session verification
```
