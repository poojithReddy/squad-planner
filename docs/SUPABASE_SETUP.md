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
