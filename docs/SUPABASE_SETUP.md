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
