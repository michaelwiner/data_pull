-- Functions: profile bootstrap, group create/join, verification, and the feed.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profile bootstrap on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'חבר'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Invite codes
--
-- The code is the only thing standing between a stranger and a group's offers
-- and phone numbers, so it comes from gen_random_bytes rather than random().
-- 32-character alphabet x 10 characters = 50 bits. The alphabet omits I, O, 0
-- and 1 so codes survive being read aloud or retyped.
-- 256 is an exact multiple of 32, so the modulo stays uniform.
-- ---------------------------------------------------------------------------

create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes    bytea := gen_random_bytes(10);
  result   text  := '';
  i        integer;
begin
  for i in 1..10 loop
    result := result || substr(alphabet, 1 + (get_byte(bytes, i - 1) % 32), 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Group lifecycle.
--
-- SECURITY DEFINER because group_members deliberately has no insert policy:
-- membership is only ever granted through these two entry points.
-- ---------------------------------------------------------------------------

create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g        public.groups;
  code     text;
  attempts integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'שם הקבוצה חסר' using errcode = '22023';
  end if;

  loop
    attempts := attempts + 1;
    code := public.generate_invite_code();
    begin
      insert into public.groups (name, invite_code, created_by)
      values (trim(p_name), code, auth.uid())
      returning * into g;
      exit;
    exception when unique_violation then
      if attempts >= 5 then raise; end if;
    end;
  end loop;

  insert into public.group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'owner');

  return g;
end;
$$;

create or replace function public.join_group_by_code(p_code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into g from public.groups
  where invite_code = upper(trim(p_code));

  if not found then
    raise exception 'קוד הזמנה לא תקין' using errcode = '22023';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return g;
end;
$$;

-- Any member of the group may refresh the "still valid" stamp on an offer that
-- belongs to their group. Global seed offers have no single group to verify on
-- behalf of, so they are excluded.
create or replace function public.verify_offer(p_offer_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  o  public.offers;
  ts timestamptz := now();
begin
  select * into o from public.offers where id = p_offer_id;
  if not found then
    raise exception 'ההטבה לא נמצאה' using errcode = '22023';
  end if;
  if o.group_id is null or not public.is_group_member(o.group_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.offers set verified_at = ts where id = p_offer_id;
  return ts;
end;
$$;

-- ---------------------------------------------------------------------------
-- The feed.
--
-- Deliberately SECURITY INVOKER (the default): every table it touches is
-- already correctly protected by RLS, so the caller's own rights enforce
-- visibility. The explicit membership guard only turns a silently empty result
-- into a clear error.
--
-- `holders` answers the question the whole app exists for: which members of
-- THIS group hold the program this offer comes from. An empty array is
-- meaningful - it drives the "nobody here is a member" gap analysis card.
-- ---------------------------------------------------------------------------

create or replace function public.group_offers(p_group_id uuid)
returns table (
  id             uuid,
  program_id     uuid,
  group_id       uuid,
  title_he       text,
  merchant       text,
  category       text,
  discount_text  text,
  discount_pct   integer,
  description_he text,
  shareability   text,
  costs_quota    boolean,
  valid_from     date,
  valid_until    date,
  source_url     text,
  image_url      text,
  created_by     uuid,
  verified_at    timestamptz,
  status         text,
  program        json,
  holders        json
)
language plpgsql
stable
as $$
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'not a member of this group' using errcode = '42501';
  end if;

  return query
    select
      o.id, o.program_id, o.group_id, o.title_he, o.merchant, o.category,
      o.discount_text, o.discount_pct, o.description_he, o.shareability,
      o.costs_quota, o.valid_from, o.valid_until, o.source_url, o.image_url, o.created_by,
      o.verified_at, o.status,
      to_json(p) as program,
      coalesce(h.holders, '[]'::json) as holders
    from public.offers o
    join public.programs p on p.id = o.program_id
    left join lateral (
      select json_agg(
               json_build_object(
                 'id',           pr.id,
                 'display_name', pr.display_name,
                 'phone_e164',   pr.phone_e164,
                 'avatar_url',   pr.avatar_url
               )
               order by pr.display_name
             ) as holders
      from public.group_members gm
      join public.memberships m
        on m.user_id = gm.user_id and m.program_id = o.program_id
      join public.profiles pr on pr.id = gm.user_id
      where gm.group_id = p_group_id
    ) h on true
    where o.status = 'active'
      and (o.group_id is null or o.group_id = p_group_id)
      and (o.valid_until is null or o.valid_until >= current_date)
    order by
      -- Actionable first: someone here holds it AND it can actually be asked
      -- for. A personal_only offer is information, not something to act on, so
      -- it must not outrank an offer a friend could hand over today.
      (h.holders is not null and o.shareability <> 'personal_only') desc,
      (h.holders is not null) desc,
      o.valid_until asc nulls last,
      o.title_he asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Execution grants: signed-in users only, never anon.
-- ---------------------------------------------------------------------------

revoke all on function public.create_group(text)        from public, anon;
revoke all on function public.join_group_by_code(text)   from public, anon;
revoke all on function public.verify_offer(uuid)         from public, anon;
revoke all on function public.group_offers(uuid)         from public, anon;
revoke all on function public.generate_invite_code()     from public, anon;

grant execute on function public.create_group(text)      to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.verify_offer(uuid)      to authenticated;
grant execute on function public.group_offers(uuid)      to authenticated;
