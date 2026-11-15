-- Read-only post-deployment verification. No fixtures, writes or service keys.
-- Run with an authorized migration connection. Actual attendance reads execute
-- as authenticated and only booleans/counts are returned, never attendee data.
\set ON_ERROR_STOP on
begin read only;

do $$ begin
  if not exists (select 1 from supabase_migrations.schema_migrations
    where version = '20261119000000') then
    raise exception 'Attendance migration is not recorded';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.get_organizer_attendance(uuid)'::regprocedure) then
    raise exception 'Attendance function bypasses RLS';
  end if;
  if exists (select 1 from pg_class where oid in ('public.registrations'::regclass, 'public.tickets'::regclass)
    and not relrowsecurity) then
    raise exception 'RLS must remain enabled';
  end if;
  if has_column_privilege('authenticated', 'public.tickets', 'code_hash', 'select') then
    raise exception 'Ticket hash must remain inaccessible';
  end if;
  if has_function_privilege('anon', 'public.get_organizer_attendance(uuid)', 'execute') then
    raise exception 'Anonymous attendance access must be denied';
  end if;
end $$;

select exists (select 1 from public.events) as has_event \gset
\if :has_event
select id as event_id, organizer_id as owner_id from public.events order by id limit 1 \gset
set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true) as ignored \gset
select set_config('request.jwt.claims', json_build_object('sub', :'owner_id', 'role', 'authenticated')::text, true) as ignored \gset
select public.get_organizer_attendance(:'event_id') is not null as owner_has_access \gset
\if :owner_has_access
\echo 'PASS: owner can read attendance through RLS.'
\else
\echo 'FAIL: owner cannot read attendance.'
\quit 1
\endif

select not exists (
  select 1 from jsonb_array_elements(public.get_organizer_attendance(:'event_id')->'attendees') attendee
  where attendee->'ticket'->>'salesStatus' <> 'active'
    or attendee->'ticket'->>'status' not in ('valid', 'used')
    or attendee->'ticket'->>'code' is null
) as eligible_only \gset
\if :eligible_only
\echo 'PASS: export contains only eligible tickets with door codes.'
\else
\echo 'FAIL: export contains an ineligible or uncoded ticket.'
\quit 1
\endif

-- A fresh UUID has no relationship to the selected event's actual owner.
select gen_random_uuid() as other_id \gset
select set_config('request.jwt.claim.sub', :'other_id', true) as ignored \gset
select set_config('request.jwt.claims', json_build_object('sub', :'other_id', 'role', 'authenticated')::text, true) as ignored \gset
select public.get_organizer_attendance(:'event_id') is null
  and not exists (select id from public.registrations where event_id = :'event_id')
  and not exists (select registration_id from public.tickets) as non_owner_denied \gset
\if :non_owner_denied
\echo 'PASS: another authenticated user gets no attendance or direct table data.'
\else
\echo 'FAIL: another authenticated user can read private attendance.'
\quit 1
\endif
reset role;
\else
\echo 'SKIP: no events available for owner/non-owner checks.'
\endif

rollback;
\echo 'PASS: attendance migration, privileges and read-only verification completed.'
