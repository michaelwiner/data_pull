-- הטבות ביחד — schema, indexes and row level security.
--
-- Run against a fresh Supabase project:
--   supabase db push
-- or paste into the SQL editor.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  -- E.164 (+9725XXXXXXXX). The WhatsApp target: the most sensitive column here,
  -- which is why profiles rows are readable only by self and fellow group members.
  phone_e164  text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.programs (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name_he    text not null,
  category   text not null
    check (category in ('bank', 'credit', 'consumer', 'lottery', 'government')),
  emoji      text not null default '🎁',
  color      text not null default '#3b6ef5',
  join_url   text,
  terms_url  text,
  notes_he   text,
  sort_order integer not null default 0
);

create table if not exists public.memberships (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  since      date,
  note       text,
  created_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.offers (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references public.programs (id) on delete cascade,
  -- NULL  = globally seeded offer, visible to every group.
  -- set   = contributed by a member, private to that one group.
  group_id      uuid references public.groups (id) on delete cascade,
  title_he      text not null,
  merchant      text not null,
  category      text not null
    check (category in ('culture', 'food', 'travel', 'fashion',
                        'electronics', 'finance', 'health', 'other')),
  discount_text text not null,
  discount_pct  integer check (discount_pct between 0 and 100),
  description_he text,
  -- Drives the whole ask UI: whether the holder can forward it, must be
  -- present, or cannot share it at all.
  shareability  text not null
    check (shareability in ('transferable', 'presence_required', 'personal_only')),
  valid_from    date,
  valid_until   date,
  source_url    text,
  image_url     text,
  -- Some clubs cap how many benefits a member may redeem per month (Pais gives
  -- a כסף subscriber 12, a פלטינום 18, non-cumulative). Asking such a member to
  -- use one spends a scarce entitlement of theirs, so the card says so instead
  -- of implying the favour is free.
  costs_quota   boolean not null default false,
  -- NULL identifies a seed row, so re-seeding never clobbers member contributions.
  created_by    uuid references public.profiles (id) on delete set null,
  -- Stable identity for seed upserts only.
  seed_key      text unique,
  verified_at   timestamptz,
  status        text not null default 'active'
    check (status in ('active', 'expired', 'hidden')),
  created_at    timestamptz not null default now(),
  constraint offers_member_rows_have_author
    check ((group_id is null) = (created_by is null))
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Postgres ships no Hebrew full-text dictionary, so to_tsvector('hebrew', ...)
-- does not exist. Trigram matching handles Hebrew substrings, including
-- partial words, which is what the search box actually needs.
create index if not exists offers_search_idx
  on public.offers using gin ((title_he || ' ' || merchant) gin_trgm_ops);

create index if not exists offers_active_idx
  on public.offers (program_id, valid_until) where status = 'active';

create index if not exists offers_group_idx
  on public.offers (group_id) where group_id is not null;

create index if not exists memberships_program_idx on public.memberships (program_id);
create index if not exists group_members_user_idx  on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper predicates.
--
-- These are SECURITY DEFINER on purpose: a policy on group_members that itself
-- queries group_members recurses infinitely under RLS. Reading membership
-- through a definer function breaks that cycle.
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = auth.uid()
  );
$$;

create or replace function public.shares_group_with(other_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.programs      enable row level security;
alter table public.memberships   enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.offers        enable row level security;

-- profiles: yourself, plus anyone you share a group with. This is what keeps
-- phone numbers from leaking beyond the group.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- programs: shared reference data, readable by any signed-in user.
-- Writes are service-role only (the seed script), so no write policy exists.
drop policy if exists programs_select on public.programs;
create policy programs_select on public.programs for select to authenticated
  using (true);

-- memberships: your own, plus those of people you share a group with.
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.shares_group_with(user_id));

drop policy if exists memberships_write on public.memberships;
create policy memberships_write on public.memberships for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- groups: members only. Joining happens through join_group_by_code(), so an
-- invite code never needs to make a group readable to a non-member.
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id));

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated
  using (created_by = auth.uid());

-- group_members: visible to fellow members. Inserts go exclusively through the
-- create_group / join_group_by_code functions, so there is no insert policy.
-- Leaving a group is a plain delete of your own row.
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete to authenticated
  using (user_id = auth.uid());

-- offers: global seed rows, plus the contributions of groups you belong to.
drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers for select to authenticated
  using (group_id is null or public.is_group_member(group_id));

-- A member may only contribute into a group they belong to, and only as
-- themselves. Nobody can write a global (group_id IS NULL) offer through the API.
drop policy if exists offers_insert on public.offers;
create policy offers_insert on public.offers for insert to authenticated
  with check (
    created_by = auth.uid()
    and group_id is not null
    and public.is_group_member(group_id)
  );

drop policy if exists offers_update on public.offers;
create policy offers_update on public.offers for update to authenticated
  using (created_by = auth.uid() and public.is_group_member(group_id))
  with check (created_by = auth.uid() and public.is_group_member(group_id));

drop policy if exists offers_delete on public.offers;
create policy offers_delete on public.offers for delete to authenticated
  using (created_by = auth.uid() and public.is_group_member(group_id));

-- ---------------------------------------------------------------------------
-- Table privileges.
--
-- Supabase's default privileges grant the public schema to anon as well and
-- lean entirely on RLS. Granting only to `authenticated` means an unauthenticated
-- request is refused at the privilege layer, before any policy is consulted.
-- ---------------------------------------------------------------------------

grant select                         on public.programs      to authenticated;
grant select, insert, update         on public.profiles      to authenticated;
grant select, insert, update, delete on public.memberships   to authenticated;
grant select, update, delete         on public.groups        to authenticated;
grant select, delete                 on public.group_members to authenticated;
grant select, insert, update, delete on public.offers        to authenticated;
