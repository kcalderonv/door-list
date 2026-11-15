begin;

-- A non-secret reference for printed door lists, independent of the QR bearer
-- secret. Defaults backfill existing tickets and cover future issuance without
-- changing the public registration function or retaining QR secrets.
alter table public.tickets
  add column door_code uuid not null default gen_random_uuid() unique,
  add column sales_status text not null default 'active'
    check (sales_status in ('active', 'cancelled', 'refunded'));

create policy "Owners read event registrations" on public.registrations
  for select to authenticated using (exists (
    select 1 from public.events e
    where e.id = registrations.event_id and e.organizer_id = (select auth.uid())
  ));

create policy "Owners read event tickets" on public.tickets
  for select to authenticated using (exists (
    select 1 from public.registrations r join public.events e on e.id = r.event_id
    where r.id = tickets.registration_id and e.organizer_id = (select auth.uid())
  ));

grant select (id, event_id, ticket_type_id, name, email, created_at)
  on public.registrations to authenticated;
grant select (registration_id, door_code, status, sales_status, created_at)
  on public.tickets to authenticated;

-- SECURITY INVOKER is intentional: every underlying read uses the caller's
-- grants and RLS. A single snapshot also avoids truncated PostgREST row pages.
create function public.get_organizer_attendance(p_event_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'eventId', e.id, 'eventTitle', e.title, 'maxCapacity', e.max_capacity,
    'ticketTypes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tt.id, 'eventId', tt.event_id, 'name', tt.name,
        'maxCapacity', tt.max_capacity
      ) order by tt.name, tt.id)
      from public.ticket_types tt where tt.event_id = e.id
    ), '[]'::jsonb),
    'attendees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'eventId', r.event_id, 'ticketTypeId', r.ticket_type_id,
        'name', r.name, 'email', r.email, 'createdAt', r.created_at,
        'ticket', jsonb_build_object(
          'code', t.door_code, 'status', t.status,
          'salesStatus', t.sales_status, 'issuedAt', t.created_at
        )
      ) order by r.created_at desc, r.id)
      from public.registrations r join public.tickets t on t.registration_id = r.id
      where r.event_id = e.id and t.sales_status = 'active' and t.status in ('valid', 'used')
    ), '[]'::jsonb)
  )
  from public.events e
  where e.id = p_event_id and e.organizer_id = (select auth.uid());
$$;

revoke all on function public.get_organizer_attendance(uuid) from public, anon;
grant execute on function public.get_organizer_attendance(uuid) to authenticated;

commit;
