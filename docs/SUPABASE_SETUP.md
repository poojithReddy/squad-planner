# Manual Supabase Setup

This project intentionally does not use Supabase CLI linking. The hosted project is configured through `.env.local`, and the initial schema is applied manually in Supabase SQL Editor.

Never paste a secret key, service-role key, database password, or personal access token into this repository.

## Apply the migration

1. Open Supabase Dashboard.
2. Open **SQUADPLANNERDB**.
3. Click **SQL Editor** in the left sidebar.
4. Click **New Query**.
5. Open `supabase/migrations/001_initial_schema.sql` locally.
6. Copy the entire SQL file.
7. Paste it into SQL Editor.
8. Confirm the selected project is **SQUADPLANNERDB**.
9. Click **Run** once.

The migration creates the tables, constraints, indexes, triggers, atomic `create_team` function, non-recursive RLS helpers and policies, and the private `team-assets` Storage bucket.

The migration is intended for the new project. If SQL Editor reports that an object already exists, stop and inspect the existing schema instead of deleting or resetting anything.

## Verify tables and RLS in the Dashboard

1. Open **Table Editor**.
2. Confirm `profiles`, `teams`, and `team_members` appear under the `public` schema.
3. Open each table and confirm its RLS indicator is enabled.
4. Open **Storage** and confirm `team-assets` exists and is private.
5. Open **Authentication → URL Configuration** and configure:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

6. Open **Authentication → Providers → Email** and keep email/password authentication enabled.

## Verify from the application

Restart the local server after changing `.env.local`:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/dev/supabase-check
```

Before the migration, Auth and connection checks can pass while table checks fail. After the migration, all checks should pass.

## Test atomic team creation

1. Sign up or sign in through the application.
2. Open `/teams/new`.
3. Submit the temporary team form.
4. Confirm the new team opens successfully.
5. In Supabase Table Editor, inspect `teams` and `team_members`.
6. Confirm the same team ID has exactly one membership for the creator with role `owner`.

Suggested manual test values:

```text
Team Name: Thunder Knights
Primary Colour: Blue
Captain Name: Poojith K C
Vice Captain Name: Uday
Squad Size: 18
Total Auction Budget: 0
```

These values are not inserted automatically and are not production seed data.

## Storage design

The migration creates a private `team-assets` bucket with PNG, JPEG, and WEBP MIME types and a shared 5 MB bucket ceiling. Future uploads use:

```text
teams/{teamId}/logo/{filename}
teams/{teamId}/banner/{filename}
```

The database stores only the object path in `teams.logo_url` or `teams.banner_url`. The application must enforce the stricter 2 MB logo limit before upload; the bucket enforces the 5 MB maximum applicable to banners.

## Safe verification SQL

Run these read-only metadata queries in SQL Editor after the migration.

```sql
-- Expected public tables.
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'teams', 'team_members')
order by table_name;

-- RLS must be true for all three tables.
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'teams', 'team_members')
order by c.relname;

-- Foreign keys, primary keys, unique constraint, and CHECK constraints.
select conrelid::regclass as table_name,
       conname as constraint_name,
       contype as constraint_type,
       pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where conrelid in (
  'public.profiles'::regclass,
  'public.teams'::regclass,
  'public.team_members'::regclass
)
order by conrelid::regclass::text, conname;

-- Database functions created by the migration.
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname in ('create_team', 'app_setup_status'))
   or (n.nspname = 'private' and p.proname in (
     'set_updated_at',
     'handle_new_user',
     'is_team_member',
     'has_team_role',
     'team_id_from_storage_path',
     'prevent_team_creator_change'
   ))
order by n.nspname, p.proname;

-- Triggers, excluding PostgreSQL internal triggers.
select event_object_schema,
       event_object_table,
       trigger_name,
       action_timing,
       event_manipulation
from information_schema.triggers
where trigger_name in (
  'profiles_set_updated_at',
  'teams_set_updated_at',
  'team_members_set_updated_at',
  'teams_prevent_creator_change',
  'on_auth_user_created'
)
order by event_object_schema, event_object_table, trigger_name;

-- Private Storage bucket restrictions.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'team-assets';

-- RLS policies for application tables and Storage objects.
select schemaname, tablename, policyname, roles, cmd
from pg_catalog.pg_policies
where (schemaname = 'public' and tablename in ('profiles', 'teams', 'team_members'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
```

## Apply Phase 3 migration

Migration 001 must already be present. Do not use `supabase link`, `supabase db push`, or `supabase db reset`.

1. Open the Supabase Dashboard.
2. Open **SQUADPLANNERDB**.
3. Click **SQL Editor**.
4. Click **New Query**.
5. Open `supabase/migrations/002_players_buckets_planning.sql` locally.
6. Copy the entire file and paste it into the query editor.
7. Confirm **SQUADPLANNERDB** is selected.
8. Click **Run** once.
9. Refresh `http://localhost:3000/dev/supabase-check` and confirm all four Phase 3 checks are available.

Migration 002 creates `players`, `auction_buckets`, `probable_teams`, and `probable_team_players`. It also adds automatic Plan A/B/C creation, updated-at triggers, role-aware RLS policies, composite foreign keys that prevent cross-team assignments, and a safe development readiness function.

### Phase 3 read-only verification SQL

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('players','auction_buckets','probable_teams','probable_team_players')
order by table_name;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('players','auction_buckets','probable_teams','probable_team_players')
order by c.relname;

select conrelid::regclass as table_name, conname, contype,
       pg_get_constraintdef(oid) as definition
from pg_catalog.pg_constraint
where conrelid in (
  'public.players'::regclass,
  'public.auction_buckets'::regclass,
  'public.probable_teams'::regclass,
  'public.probable_team_players'::regclass
)
order by conrelid::regclass::text, conname;

select schemaname, tablename, policyname, roles, cmd
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('players','auction_buckets','probable_teams','probable_team_players')
order by tablename, policyname;

select public.phase3_setup_status();
```

The application does not seed players. Test imports are only written after mapping, validation, duplicate choice, and explicit confirmation.

## Apply Phase 4 migration

Migration 001 and Migration 002 must already be applied.

1. Open Supabase Dashboard and select **SQUADPLANNERDB**.
2. Open **SQL Editor** and click **New Query**.
3. Open `supabase/migrations/003_live_auction.sql` locally.
4. Copy the entire file into SQL Editor.
5. Confirm the selected project and click **Run** once.
6. Restart `npm run dev` and open `/dev/supabase-check`.
7. Confirm all three Phase 4 checks show Available.

Migration 003 adds auction lifecycle status to teams, immutable auction and lifecycle history, atomic concurrency-safe auction RPCs, RLS, performance indexes, and Realtime publication entries. The SQL adds `players`, `auction_history`, and `teams` to the existing `supabase_realtime` publication when that publication exists. No separate Dashboard toggle is required when the Phase 4 Realtime check passes.

### Phase 4 verification SQL

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='teams' and column_name='auction_status';

select table_name
from information_schema.tables
where table_schema='public' and table_name in ('auction_history','auction_lifecycle_history');

select public.phase4_setup_status();

select schemaname, tablename, policyname, cmd
from pg_catalog.pg_policies
where schemaname='public' and tablename in ('auction_history','auction_lifecycle_history')
order by tablename, policyname;

select schemaname, tablename
from pg_catalog.pg_publication_tables
where pubname='supabase_realtime'
  and schemaname='public'
  and tablename in ('players','auction_history','teams')
order by tablename;
```

### Manual auction simulation

1. Open a team and create at least two available players.
2. Open `/teams/{teamId}/auction` and start the live auction.
3. Search Player A and mark My Team at price 70.
4. Confirm Player A appears immediately in My Live Squad and `/squad`.
5. Confirm total and bucket spending update and Plan A reflects Secured when applicable.
6. Mark Player B Other Team and confirm the red text-labelled state.
7. Confirm the recommended target changes.
8. Undo Player A and confirm budget, squad and bucket counts restore.
9. Purchase Player A again at price 0 and confirm 0 is accepted.
10. Open a second authenticated browser/session for the same team and confirm player, squad, history and lifecycle changes arrive without refresh.
11. Try a bucket maximum or squad limit and confirm the explicit override prompt appears.
12. Complete the auction, open `/teams/{teamId}/squad`, and confirm Final Squad and summary totals.

## Apply Phase 5 migration

Migrations 001–003 must already be applied.

1. Open Supabase Dashboard and select **SQUADPLANNERDB**.
2. Open **SQL Editor** and choose **New Query**.
3. Open `supabase/migrations/004_tournament_matches.sql` locally.
4. Copy the complete SQL, paste it into the editor, and click **Run** once.
5. Restart `npm run dev` and open the team Tournament module.

Migration 004 creates `tournaments`, `matches`, and `match_players`; updated-at triggers; team-scoped RLS; same-team composite foreign keys; final/live-squad validation; duplicate-player prevention; and the one-captain-per-match constraint.

### Phase 5 verification SQL

```sql
select public.phase5_setup_status();
select relname, relrowsecurity from pg_class where oid in ('public.tournaments'::regclass,'public.matches'::regclass,'public.match_players'::regclass);
select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint where conrelid in ('public.tournaments'::regclass,'public.matches'::regclass,'public.match_players'::regclass) order by 1,2;
```

### Manual tournament simulation

1. Create a tournament with valid dates and squad sizes.
2. Add three fixtures.
3. Open Match 1 and select a Playing XI or other configured size.
4. Mark one player unavailable and replace that player.
5. Set one Match Captain and one Wicketkeeper.
6. Mark selected players as Playing or Substitute.
7. Enter a Won result, team score, opponent score, and result notes.
8. Confirm participation indicators update on the next match.
9. Confirm the tournament overview shows matches played, wins, losses, next fixture, and last result.
10. Repeat match selection on a mobile-width browser.

## Apply Phase 6 migration

After Migrations 001–004, open **SQUADPLANNERDB → SQL Editor → New Query**, paste the complete contents of `supabase/migrations/005_duties_reporting.sql`, and click **Run** once. Restart `npm run dev` afterward.

Migration 005 creates `volunteer_duties`, `volunteer_duty_assignments`, team-scoped RLS, composite cross-team protections, the atomic `assign_volunteer` conflict-checking RPC, indexes, and guarded Realtime publication entries.

```sql
select public.phase6_setup_status();
```

### Phase 6 manual simulation

1. Use a tournament containing at least three fixtures and confirm Opportunity counts.
2. Open a player with no appearance and inspect match history.
3. Create an Umpire duty and assign one suggested player.
4. Create a Scorer duty and confirm duty fairness counts change.
5. Attempt a same-time, playing-player, unavailable-player, or over-capacity assignment and verify the warning/override flow.
6. Complete a duty and confirm the dashboard status.
7. Open Reports and verify match, auction, player usage, role, Plan A/B/C, and volunteer summaries.
# Migration 006: profile and production foundation

After Migrations 001-005 succeed, copy all of `supabase/migrations/006_profile_production.sql` into **Supabase Dashboard > SQL Editor > New Query** and click **Run**. Do not use `db push`.

Verify it with `select public.phase7_setup_status();`. All returned values should be `true`. It adds optional profile fields and the private `profile-assets` bucket with self-only avatar policies.
# Migration 007: bucket player statistics import

After Migration 006 succeeds, copy all of `supabase/migrations/007_bucket_player_stats_import.sql` into **Supabase Dashboard > SQL Editor > New Query** and click **Run**. Do not use `db push`.

Verify it with `select public.phase8_setup_status();`. All returned values should be `true`. See `docs/BUCKET_PLAYER_IMPORT.md` for the supported spreadsheet format and normalization rules.
## Migration 008 — Fixture import and public availability

1. Open the Supabase Dashboard and select **SQUADPLANNERDB**.
2. Open **SQL Editor** and choose **New Query**.
3. Open `supabase/migrations/008_fixture_import_availability.sql` locally.
4. Copy the complete file, paste it into the SQL Editor, and click **Run**.
5. Verify with:

```sql
select public.phase13_setup_status();
```

Every returned value should be `true`. The migration keeps `teams`, `players`, `matches`, and `tournaments` private. Anonymous availability access is limited to the three token-validated RPC functions; the raw public token is never stored in the database.
# Migration 009 — Tournament Admin and Multi-Team Access

Apply `supabase/migrations/009_tournament_admin_access.sql` after Migration 008.

1. Open Supabase Dashboard → SQL Editor → New Query.
2. Copy the complete Migration 009 SQL file.
3. Paste it into the intended Squad Planner project and click **Run**.
4. Verify it with:

```sql
select public.phase14_setup_status();
```

To nominate the first Tournament Admin, obtain the intended user UUID from **Authentication → Users**, then run this once with the correct tournament and user IDs:

```sql
insert into public.tournament_members (tournament_id, user_id, role)
values ('YOUR_TOURNAMENT_UUID', 'YOUR_AUTH_USER_UUID', 'tournament_admin')
on conflict (tournament_id, user_id) do update set role = excluded.role;
```

This bootstrap does not add the administrator to `team_members`. Team auction planning therefore remains private unless that administrator is explicitly assigned to the team.

## Invitation email configuration

The application records pending invitations in the database and automatically claims them when the matching Supabase Auth email creates an account. To send Supabase invitation emails from the admin screen, configure the server-only `SUPABASE_SERVICE_ROLE_KEY` in Vercel and local `.env.local`. Never prefix this variable with `NEXT_PUBLIC_`, print it, or commit its value. Supabase Auth and the configured custom SMTP provider send the email.

# Migration 010 — Super Admin and Multi-Tournament Administration

Migration 009 has already established tournament/team access. Do not edit or rerun it. Apply `supabase/migrations/010_super_admin_multi_tournament.sql` next:

1. Open **Supabase Dashboard → SQL Editor → New Query**.
2. Open `supabase/migrations/010_super_admin_multi_tournament.sql` locally.
3. Copy the entire SQL file, paste it into the SQL Editor, and click **Run** once.
4. Verify the installation:

```sql
select public.phase15_setup_status();
```

All values should be `true`.

## Bootstrap the first Super Admin

There is deliberately no public “Make me Super Admin” button. First create a normal account, copy that account's UUID from **Authentication → Users**, and run this manually with the intended UUID:

```sql
insert into public.platform_roles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'super_admin')
on conflict (user_id, role) do nothing;
```

Sign out and sign in again, then open `/admin`. Never put a real user UUID or email in a migration. This platform role grants administrative tournament setup access; it does not create `team_members` access and therefore does not expose private team plans, expected prices, priorities, notes, or recommendations.

## Migration 011 — Tournament registration and central live auction

Apply `supabase/migrations/011_registration_live_auction.sql` only after Migration 010:

1. Open Supabase Dashboard → **SQL Editor** → **New Query**.
2. Open `supabase/migrations/011_registration_live_auction.sql` locally.
3. Copy the entire file, paste it into SQL Editor, and click **Run**.
4. Run the read-only verification query below. Every value should be `true`.

```sql
select public.phase16_setup_status();
```

Migration 011 creates the public registration form model, tournament player pool, tournament auction buckets, live auction/bid/history tables, restricted public registration RPCs, atomic bid/winner functions, RLS, indexes, and Realtime publication entries. It also repairs legacy team-owned tournament foreign keys so a centrally managed tournament can safely contain multiple teams.

Manual Phase 16 smoke test:

1. Open Tournament Admin → Registration, create a form, copy the one-time secure link, and open registration.
2. Submit the public link in an Incognito window without signing in.
3. Approve the response in Tournament Admin → Player Pool.
4. Import tournament teams from `.xlsx` or `.csv`, then confirm Captain/Vice Captain invitations.
5. Open Tournament Admin → Live Auction, create tournament buckets and schedule the auction.
6. Select a random player, start bidding, sign in as a Captain in another browser, and place a bid from the team Auction page.
7. Confirm the winning bid and verify the player, squad, budget, bid history, and other connected sessions update.

## Migration 012 — Module-Based RBAC

Migration 012 is required before deploying the Phase 17 application code. It does not replace or modify Migrations 001–011.

1. Open **Supabase Dashboard → SQL Editor → New Query**.
2. Open `supabase/migrations/012_module_rbac.sql` locally.
3. Copy the complete file into the SQL Editor and click **Run** once.
4. Verify the installation:

```sql
select public.phase17_setup_status();
```

Every returned value must be `true`. Then sign out and sign in again. Super Admins can open `/admin/roles`; Tournament Admins can open `/tournaments/{tournamentId}/admin/roles`.

Permission resolution is default-deny. The applicable role template is loaded for the platform, tournament, or team scope; a tournament-specific role template overrides its global default. An explicit user `allow` overrides a role default, while an explicit user `deny` has final precedence. Overrides never create membership, so removing tournament/team access also removes effective access even if an old override remains.

Do not grant anonymous access to the RBAC tables or helper functions. Do not edit an already-applied migration; use the next migration number for future permission changes.
