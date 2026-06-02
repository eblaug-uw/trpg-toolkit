-- supabase/schema.sql
-- Database setup for the TRPG Toolkit project.
-- Idempotent: safe to re-run on an existing or fresh Supabase project.

-- -------------------  ----------------------------------------------
-- Storage buckets
-- ------------------------------------------------------------------
-- Two private buckets: `maps` for backdrop images, `tokens` for character/creature pieces.
-- `public = false` means files are not served by URL — clients must request a signed URL.
-- The conflict clause makes this re-runnable.

insert into storage.buckets (id, name, public)
values
  ('maps',   'maps',   false),
  ('tokens', 'tokens', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------------
-- Row-Level Security policies on storage.objects
-- ------------------------------------------------------------------
-- Convention: every file is stored at `<user_id>/<filename>` so that the first
-- folder in the path identifies the owner. Policies enforce that a user can
-- only see/write objects whose first folder matches their auth.uid().
--
-- We drop-then-create so this script is safe to re-run.

-- ------------------------------------------------------------------
-- Monsters 5.5e (D&D 2024 Monster Manual)
-- ------------------------------------------------------------------
-- CR is stored as text to handle fractional values like "1/4", "1/2".
-- Legendary is nullable boolean: TRUE for legendary monsters, NULL otherwise.
-- All long-form text fields (actions, traits, etc.) are unconstrained text.

create table if not exists monsters (
  id                bigint primary key generated always as identity,
  name              text        not null,
  cr                text,
  type              text,
  size              text,
  ac                smallint,
  hp                smallint,
  speed             text,
  str               smallint,
  dex               smallint,
  con               smallint,
  int               smallint,
  wis               smallint,
  cha               smallint,
  alignment         text,
  legendary         boolean,
  habitat           text,
  source            text,
  image_url         text,
  initiative        text,
  skills            text,
  senses            text,
  languages         text,
  xp                integer,
  immunities        text,
  resistances       text,
  vulnerabilities   text,
  treasure          text,
  traits            text,
  actions           text,
  bonus_actions     text,
  reactions         text,
  legendary_actions text
);

-- Public read access so the enemy generator can query monsters without auth.
alter table monsters enable row level security;

drop policy if exists "Anyone can read monsters" on monsters;
create policy "Anyone can read monsters"
on monsters for select
to anon, authenticated
using (true);

-- ------------------------------------------------------------------
-- Status reference data
-- ------------------------------------------------------------------
-- Read-only lookup table for combat statuses/conditions selectable in the VTT.

create schema if not exists references;

create table if not exists references.statuses (
  id text,
  name text,
  stackable boolean,
  default_duration_type text,
  effect_summary text
) tablespace pg_default;

alter table references.statuses enable row level security;

drop policy if exists "Anyone can read statuses" on references.statuses;
create policy "Anyone can read statuses"
on references.statuses for select
to anon, authenticated
using (true);

-- ------------------------------------------------------------------
-- Row-Level Security policies on storage.objects
-- ------------------------------------------------------------------
drop policy if exists "Users can read their own files in maps and tokens"   on storage.objects;
drop policy if exists "Users can upload to their own folder in maps and tokens" on storage.objects;
drop policy if exists "Users can update their own files in maps and tokens" on storage.objects;
drop policy if exists "Users can delete their own files in maps and tokens" on storage.objects;

-- READ
create policy "Users can read their own files in maps and tokens"
on storage.objects for select
to authenticated
using (
  bucket_id in ('maps', 'tokens')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT
create policy "Users can upload to their own folder in maps and tokens"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('maps', 'tokens')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE
create policy "Users can update their own files in maps and tokens"
on storage.objects for update
to authenticated
using (
  bucket_id in ('maps', 'tokens')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE
create policy "Users can delete their own files in maps and tokens"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('maps', 'tokens')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Campaigns
create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on campaigns (user_id);

alter table campaigns enable row level security;

drop policy if exists "Users can read their own campaigns"   on campaigns;
drop policy if exists "Users can insert their own campaigns" on campaigns;
drop policy if exists "Users can update their own campaigns" on campaigns;
drop policy if exists "Users can delete their own campaigns" on campaigns;

create policy "Users can read their own campaigns"
on campaigns for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own campaigns"
on campaigns for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own campaigns"
on campaigns for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own campaigns"
on campaigns for delete
to authenticated
using (auth.uid() = user_id);

-- Encounters

create table if not exists encounters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  title        text not null,
  vtt_state    jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists encounters_user_id_idx     on encounters (user_id);
create index if not exists encounters_campaign_id_idx on encounters (campaign_id);

alter table encounters enable row level security;

drop policy if exists "Users can read their own encounters"   on encounters;
drop policy if exists "Users can insert their own encounters" on encounters;
drop policy if exists "Users can update their own encounters" on encounters;
drop policy if exists "Users can delete their own encounters" on encounters;

create policy "Users can read their own encounters"
on encounters for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own encounters"
on encounters for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own encounters"
on encounters for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own encounters"
on encounters for delete
to authenticated
using (auth.uid() = user_id);
