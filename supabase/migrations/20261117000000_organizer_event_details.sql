begin;

-- Keep registrations inaccessible through direct table queries. Only the event
-- owner may read this snapshot; published status never grants private access.
create function public.get_organizer_event_details(p_event_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'eventId', e.id,
    'maxCapacity', e.max_capacity,
    'ticketTypes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tt.id, 'eventId', tt.event_id, 'name', tt.name,
        'maxCapacity', tt.max_capacity,
        'registrationCount', (select count(*) from public.registrations r
          where r.event_id = e.id and r.ticket_type_id = tt.id)
      ) order by tt.name, tt.id)
      from public.ticket_types tt where tt.event_id = e.id
    ), '[]'::jsonb),
    'registrations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'eventId', r.event_id, 'ticketTypeId', r.ticket_type_id,
        'name', r.name, 'email', r.email, 'createdAt', r.created_at
      ) order by r.created_at desc, r.id)
      from public.registrations r where r.event_id = e.id
    ), '[]'::jsonb)
  )
  from public.events e
  where e.id = p_event_id and e.organizer_id = (select auth.uid());
$$;

revoke all on function public.get_organizer_event_details(uuid) from public, anon, authenticated;
grant execute on function public.get_organizer_event_details(uuid) to authenticated;

commit;
