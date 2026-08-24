-- Security tests for the RLS policies.
--
-- Three users: Michael and Dana share group G1; Outsider is in their own group
-- G2 and must never see anything of theirs - above all, not their phone numbers.
--
-- Run with ON_ERROR_STOP=1: any failed assertion aborts with 'TEST FAILED'.

\set QUIET on
\set michael  '''aaaaaaaa-0000-4000-8000-000000000001'''
\set dana     '''bbbbbbbb-0000-4000-8000-000000000002'''
\set outsider '''cccccccc-0000-4000-8000-000000000003'''

-- --------------------------------------------------------------------------
-- Fixtures, created as superuser.
-- --------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  (:michael::uuid,  'michael@example.com', '{"full_name":"מיכאל"}'),
  (:dana::uuid,     'dana@example.com',    '{"full_name":"דנה"}'),
  (:outsider::uuid, 'zed@example.com',     '{"full_name":"זר"}');

update public.profiles set phone_e164 = '+972501111111' where id = :michael::uuid;
update public.profiles set phone_e164 = '+972502222222' where id = :dana::uuid;
update public.profiles set phone_e164 = '+972503333333' where id = :outsider::uuid;

insert into public.programs (id, slug, name_he, category, emoji, color) values
  ('11111111-0000-4000-8000-000000000001', 'pais-plus',  'פיס פלוס',            'lottery',  '🎟️', '#0aa06e'),
  ('11111111-0000-4000-8000-000000000002', 'hot-club',   'מועדון צרכנות HOT',   'consumer', '🛒', '#e4002b'),
  ('11111111-0000-4000-8000-000000000003', 'miluim',     'משרתי מילואים',       'government','🎖️','#4a5d3a');

-- Global seed offers (created_by NULL, group_id NULL).
insert into public.offers
  (id, program_id, group_id, title_he, merchant, category, discount_text,
   shareability, valid_until, created_by, seed_key)
values
  ('22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001',
   null, 'כרטיסים להצגה בהיכל התרבות', 'היכל התרבות', 'culture', '50% הנחה',
   'transferable', current_date + 60, null, 'seed-1'),
  ('22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000003',
   null, 'נקודות זיכוי במס הכנסה', 'רשות המסים', 'finance', 'זיכוי מס',
   'personal_only', null, null, 'seed-2');

-- --------------------------------------------------------------------------
-- Michael creates G1; Dana joins by code. Outsider creates G2.
-- --------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select public.create_group('חברים') \gset g1_
insert into public.memberships (user_id, program_id) values
  (:michael::uuid, '11111111-0000-4000-8000-000000000001'),
  (:michael::uuid, '11111111-0000-4000-8000-000000000003');
reset role;

-- Recover the group id and invite code as superuser for later steps.
select id as g1_id, invite_code as g1_code from public.groups where name = 'חברים' \gset

set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
select public.join_group_by_code(:'g1_code');
insert into public.memberships (user_id, program_id) values
  (:dana::uuid, '11111111-0000-4000-8000-000000000002');
reset role;

set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';
select public.create_group('קבוצה אחרת');
reset role;

select id as g2_id from public.groups where name = 'קבוצה אחרת' \gset

-- Michael contributes a group-private offer into G1.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
insert into public.offers
  (id, program_id, group_id, title_he, merchant, category, discount_text,
   shareability, valid_until, created_by)
values
  ('22222222-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000002',
   :'g1_id'::uuid, 'מבצע סופ״ש ברשת', 'שופרסל', 'food', '15% בקופה',
   'presence_required', current_date + 14, :michael::uuid);
reset role;

\set QUIET off
\echo '--- running assertions ---'

-- ==========================================================================
-- Outsider must see nothing belonging to G1.
-- ==========================================================================
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';

do $$
declare n integer;
begin
  -- Phone numbers are the crown jewels: an outsider must not read the rows at all.
  select count(*) into n from public.profiles
   where id in ('aaaaaaaa-0000-4000-8000-000000000001',
                'bbbbbbbb-0000-4000-8000-000000000002');
  if n <> 0 then raise exception 'TEST FAILED: outsider read % foreign profile row(s)', n; end if;

  select count(*) into n from public.groups where name = 'חברים';
  if n <> 0 then raise exception 'TEST FAILED: outsider read a foreign group'; end if;

  select count(*) into n from public.group_members;
  if n <> 1 then raise exception 'TEST FAILED: outsider saw % group_members rows, expected only their own', n; end if;

  select count(*) into n from public.memberships
   where user_id <> 'cccccccc-0000-4000-8000-000000000003';
  if n <> 0 then raise exception 'TEST FAILED: outsider read foreign memberships'; end if;

  -- The group-private contributed offer.
  select count(*) into n from public.offers where group_id is not null;
  if n <> 0 then raise exception 'TEST FAILED: outsider read a group-private offer'; end if;

  -- Global seed offers stay visible to everyone signed in.
  select count(*) into n from public.offers where group_id is null;
  if n <> 2 then raise exception 'TEST FAILED: outsider saw % global offers, expected 2', n; end if;
end
$$;

-- group_offers() on someone else's group must raise, not quietly return rows.
do $$
declare denied boolean := false;
begin
  begin
    perform * from public.group_offers(
      (select id from public.groups where name = 'חברים' limit 1));
  exception when others then denied := true;
  end;
  if not denied then raise exception 'TEST FAILED: group_offers() served a non-member'; end if;
end
$$;

-- An outsider must not be able to write an offer into a group they are not in.
do $$
declare denied boolean := false;
begin
  begin
    insert into public.offers
      (program_id, group_id, title_he, merchant, category, discount_text,
       shareability, created_by)
    values ('11111111-0000-4000-8000-000000000001',
            (select id from public.groups where name = 'קבוצה אחרת' limit 1),
            'חדירה', 'זר', 'other', 'x', 'transferable',
            'aaaaaaaa-0000-4000-8000-000000000001');
  exception when others then denied := true;
  end;
  if not denied then raise exception 'TEST FAILED: offer inserted with a forged created_by'; end if;
end
$$;

-- Nobody may create a global (group_id IS NULL) offer through the API.
do $$
declare denied boolean := false;
begin
  begin
    insert into public.offers
      (program_id, group_id, title_he, merchant, category, discount_text,
       shareability, created_by)
    values ('11111111-0000-4000-8000-000000000001', null, 'גלובלי מזויף', 'זר',
            'other', 'x', 'transferable', 'cccccccc-0000-4000-8000-000000000003');
  exception when others then denied := true;
  end;
  if not denied then raise exception 'TEST FAILED: a user created a global offer'; end if;
end
$$;

reset role;

-- ==========================================================================
-- Dana, a fellow member, sees exactly what she should.
-- ==========================================================================
set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';

do $$
declare
  n     integer;
  phone text;
begin
  -- She can reach Michael's phone: it is the WhatsApp target.
  select phone_e164 into phone from public.profiles
   where id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if phone is distinct from '+972501111111' then
    raise exception 'TEST FAILED: group member cannot read a fellow member phone';
  end if;

  -- But not the outsider's.
  select count(*) into n from public.profiles
   where id = 'cccccccc-0000-4000-8000-000000000003';
  if n <> 0 then raise exception 'TEST FAILED: member read an unrelated profile'; end if;

  -- She sees Michael's memberships, which is how holders are computed.
  select count(*) into n from public.memberships
   where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  if n <> 2 then raise exception 'TEST FAILED: member saw % of Michael memberships, expected 2', n; end if;

  -- The group-private offer Michael contributed.
  select count(*) into n from public.offers where group_id is not null;
  if n <> 1 then raise exception 'TEST FAILED: member saw % group offers, expected 1', n; end if;
end
$$;

-- The feed: holders resolved, ordering and gap analysis behaviour.
do $$
declare
  g1       uuid := (select id from public.groups where name = 'חברים' limit 1);
  rec      record;
  holders  integer;
begin
  -- Expired-or-not, personal_only, global and group offers all come back.
  select count(*) into holders from public.group_offers(g1);
  if holders <> 3 then raise exception 'TEST FAILED: feed returned % rows, expected 3', holders; end if;

  -- Pais Plus offer: Michael holds it, Dana does not. One holder, and it is him.
  select * into rec from public.group_offers(g1)
   where title_he = 'כרטיסים להצגה בהיכל התרבות';
  if json_array_length(rec.holders) <> 1 then
    raise exception 'TEST FAILED: expected 1 holder, got %', json_array_length(rec.holders);
  end if;
  if rec.holders -> 0 ->> 'display_name' <> 'מיכאל' then
    raise exception 'TEST FAILED: wrong holder resolved: %', rec.holders -> 0 ->> 'display_name';
  end if;
  if rec.holders -> 0 ->> 'phone_e164' <> '+972501111111' then
    raise exception 'TEST FAILED: holder phone missing from feed';
  end if;

  -- The HOT offer Michael contributed: Dana holds HOT, so she is the holder.
  select * into rec from public.group_offers(g1) where title_he = 'מבצע סופ״ש ברשת';
  if rec.holders -> 0 ->> 'display_name' <> 'דנה' then
    raise exception 'TEST FAILED: HOT holder should be Dana, got %', rec.holders -> 0 ->> 'display_name';
  end if;

  -- personal_only rows still surface, for awareness; the UI hides their button.
  select * into rec from public.group_offers(g1) where shareability = 'personal_only';
  if rec.title_he <> 'נקודות זיכוי במס הכנסה' then
    raise exception 'TEST FAILED: personal_only offer missing from feed';
  end if;
end
$$;

-- Any member of the group may refresh the verification stamp.
do $$
declare ts timestamptz;
begin
  select public.verify_offer('22222222-0000-4000-8000-000000000003') into ts;
  if ts is null then raise exception 'TEST FAILED: verify_offer returned null'; end if;
end
$$;

reset role;

-- An outsider may not verify another group's offer.
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';
do $$
declare denied boolean := false;
begin
  begin
    perform public.verify_offer('22222222-0000-4000-8000-000000000003');
  exception when others then denied := true;
  end;
  if not denied then raise exception 'TEST FAILED: outsider verified a foreign offer'; end if;
end
$$;
reset role;

-- ==========================================================================
-- Hebrew trigram search, and the gap-analysis case.
-- ==========================================================================
set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';

do $$
declare n integer;
begin
  -- Partial Hebrew word: 'הצג' inside 'להצגה'. This is exactly what a
  -- to_tsvector-based search would miss and trigram matching catches.
  select count(*) into n from public.offers
   where (title_he || ' ' || merchant) ilike '%' || 'הצג' || '%';
  if n <> 1 then raise exception 'TEST FAILED: Hebrew substring search matched % rows, expected 1', n; end if;

  -- Merchant-side match.
  select count(*) into n from public.offers
   where (title_he || ' ' || merchant) ilike '%' || 'שופרסל' || '%';
  if n <> 1 then raise exception 'TEST FAILED: merchant search matched % rows, expected 1', n; end if;
end
$$;

-- Gap analysis: an offer for a program nobody in the group holds returns [].
reset role;
insert into public.offers
  (program_id, group_id, title_he, merchant, category, discount_text,
   shareability, created_by, seed_key)
values
  ((select id from public.programs where slug = 'pais-plus'),
   null, 'הטבה ללא בעלים', 'ספק כלשהו', 'other', '10%', 'transferable', null, 'seed-3');

-- Michael holds Pais Plus, so remove that membership to create a true gap.
delete from public.memberships
 where user_id = 'aaaaaaaa-0000-4000-8000-000000000001'
   and program_id = (select id from public.programs where slug = 'pais-plus');

set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
do $$
declare
  g1  uuid := (select id from public.groups where name = 'חברים' limit 1);
  rec record;
begin
  select * into rec from public.group_offers(g1) where title_he = 'הטבה ללא בעלים';
  if json_array_length(rec.holders) <> 0 then
    raise exception 'TEST FAILED: expected an empty holders array for the gap case, got %', rec.holders;
  end if;

  -- Offers somebody holds must sort ahead of the gap ones.
  select * into rec from public.group_offers(g1) limit 1;
  if json_array_length(rec.holders) = 0 then
    raise exception 'TEST FAILED: a held offer should sort before unheld ones';
  end if;
end
$$;
reset role;

-- ==========================================================================
-- Data integrity constraints.
-- ==========================================================================
do $$
declare denied boolean := false;
begin
  begin
    insert into public.offers
      (program_id, group_id, title_he, merchant, category, discount_text,
       shareability, created_by)
    values ((select id from public.programs limit 1), null, 'x', 'y', 'other', 'z',
            'transferable', 'aaaaaaaa-0000-4000-8000-000000000001');
  exception when others then denied := true;
  end;
  if not denied then
    raise exception 'TEST FAILED: a global offer was allowed to carry an author';
  end if;
end
$$;

do $$
declare denied boolean := false;
begin
  begin
    insert into public.offers
      (program_id, group_id, title_he, merchant, category, discount_text, shareability)
    values ((select id from public.programs limit 1), null, 'x', 'y', 'other', 'z', 'maybe');
  exception when others then denied := true;
  end;
  if not denied then raise exception 'TEST FAILED: an invalid shareability was accepted'; end if;
end
$$;

\echo '--- ALL SECURITY TESTS PASSED ---'
