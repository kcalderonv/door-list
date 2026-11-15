-- Explicit opt-in integration test for a migrated TEST database, run with psql
-- -v ON_ERROR_STOP=1 -f tests/attendees-rls.sql. Requires fixture administration
-- rights, but no service-role API key. Assertions run as authenticated with RLS.
-- Fixtures are rolled back, including auth users. Never run on production.
begin;

insert into auth.users (id, email) values
  ('a1111111-1111-4111-8111-111111111111', 'attendance-owner@example.test'),
  ('a2222222-2222-4222-8222-222222222222', 'attendance-other@example.test');
insert into public.events (id, organizer_id, title, description, date, venue, status, max_capacity) values
  ('a3333333-3333-4333-8333-333333333333', 'a1111111-1111-4111-8111-111111111111', 'Prueba CSV', 'Fixture', '2099-11-15T20:00:00Z', 'Lima', 'publicado', 100),
  ('a4444444-4444-4444-8444-444444444444', 'a1111111-1111-4111-8111-111111111111', 'Sin asistentes', 'Fixture', '2099-11-15T20:00:00Z', 'Lima', 'borrador', 100);
insert into public.ticket_types (id, event_id, name, max_capacity) values
  ('a5555555-5555-4555-8555-555555555555', 'a3333333-3333-4333-8333-333333333333', 'General', 10);
insert into public.registrations (id, event_id, ticket_type_id, name, email)
  select ('b0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
    'a3333333-3333-4333-8333-333333333333', 'a5555555-5555-4555-8555-555555555555',
    'Asistente ' || i, 'attendee-' || i || '@example.test'
  from generate_series(1, 5) i;
insert into public.tickets (registration_id, code_hash, status, sales_status)
  select ('b0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
    decode(repeat(lpad(i::text, 2, '0'), 32), 'hex'),
    case when i = 2 then 'used' when i = 5 then 'revoked' else 'valid' end,
    case when i = 3 then 'cancelled' when i = 4 then 'refunded' else 'active' end
  from generate_series(1, 5) i;

do $$ begin
  if (select prosecdef from pg_proc where oid = 'public.get_organizer_attendance(uuid)'::regprocedure) then
    raise exception 'Attendance must use SECURITY INVOKER';
  end if;
  if has_function_privilege('anon', 'public.get_organizer_attendance(uuid)', 'execute') then
    raise exception 'Anonymous callers must not execute attendance';
  end if;
  if has_column_privilege('authenticated', 'public.tickets', 'code_hash', 'select') then
    raise exception 'Ticket secrets must remain inaccessible';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$ begin
  if public.get_organizer_attendance('a3333333-3333-4333-8333-333333333333') is not null then
    raise exception 'Non-owner read another organizer attendance';
  end if;
  if exists (select id from public.registrations where event_id = 'a3333333-3333-4333-8333-333333333333') then
    raise exception 'Direct registration query bypassed RLS';
  end if;
  if exists (select registration_id from public.tickets where registration_id::text like 'b0000000-%') then
    raise exception 'Direct ticket query bypassed RLS';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$ declare snapshot jsonb; begin
  snapshot := public.get_organizer_attendance('a3333333-3333-4333-8333-333333333333');
  if snapshot is null or jsonb_array_length(snapshot->'attendees') <> 2 then
    raise exception 'Owner must see only valid and used active tickets';
  end if;
  if exists (select 1 from jsonb_array_elements(snapshot->'attendees') attendee
    where attendee->'ticket'->>'salesStatus' <> 'active'
      or attendee->'ticket'->>'status' not in ('valid', 'used')
      or attendee->'ticket'->>'code' is null) then
    raise exception 'Ineligible or uncoded ticket in export';
  end if;
  snapshot := public.get_organizer_attendance('a4444444-4444-4444-8444-444444444444');
  if snapshot is null or snapshot->'attendees' <> '[]'::jsonb then
    raise exception 'Empty owned event must return an empty attendance list';
  end if;
end $$;
reset role;
rollback;
