begin;

alter table public.events add column published_at timestamptz;
alter table public.events add column publication_date_estimated boolean not null default false;

-- Publication was not tracked before this migration. The first registration is
-- only an estimate; never silently substitute the migration or event date.
update public.events e
set published_at = history.first_registration, publication_date_estimated = true
from (select event_id, min(created_at) as first_registration
      from public.registrations group by event_id) history
where e.id = history.event_id;

create function public.track_event_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.published_at := case when new.status = 'publicado' then now() else null end;
    new.publication_date_estimated := false;
  elsif old.published_at is not null then
    new.published_at := old.published_at;
    new.publication_date_estimated := old.publication_date_estimated;
  elsif exists (select 1 from public.registrations where event_id = old.id) then
    select min(created_at) into new.published_at from public.registrations where event_id = old.id;
    new.publication_date_estimated := true;
  elsif old.status <> 'publicado' and new.status = 'publicado' then
    new.published_at := now();
    new.publication_date_estimated := false;
  else
    new.published_at := old.published_at;
    new.publication_date_estimated := old.publication_date_estimated;
  end if;
  return new;
end;
$$;

create trigger events_track_publication before insert or update on public.events
for each row execute function public.track_event_publication();
revoke all on function public.track_event_publication() from public, anon, authenticated;

create index registrations_event_created_at_idx on public.registrations(event_id, created_at);

-- RLS stays enabled; registrations remain private. This aggregate is restricted
-- to the event owner and never returns attendee names, emails or ticket data.
create function public.get_organizer_registration_history(p_event_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with owned_event as (
    select e.id, coalesce(e.published_at, history.first_registration) as published_at,
      e.publication_date_estimated or (e.published_at is null and history.first_registration is not null) as publication_date_estimated,
      e.status
    from public.events e
    left join lateral (
      select min(r.created_at) as first_registration
      from public.registrations r where r.event_id = e.id
    ) history on true
    where e.id = p_event_id and e.organizer_id = (select auth.uid())
  ), counts as (
    select (r.created_at at time zone 'America/Lima')::date as day, count(*) as total
    from public.registrations r join owned_event e on e.id = r.event_id
    where r.created_at >= e.published_at and r.created_at <= now()
    group by 1
  )
  select jsonb_build_object(
    'eventId', e.id,
    'publishedAt', e.published_at,
    'publicationDateEstimated', e.publication_date_estimated,
    'isPublished', e.status = 'publicado',
    'timeZone', 'America/Lima',
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', to_char(days.day, 'YYYY-MM-DD'),
        'registrationCount', coalesce(c.total, 0)
      ) order by days.day)
      from generate_series(
        (e.published_at at time zone 'America/Lima')::date::timestamp,
        (now() at time zone 'America/Lima')::date::timestamp,
        interval '1 day'
      ) as days(day)
      left join counts c on c.day = days.day::date
    ), '[]'::jsonb)
  ) from owned_event e;
$$;

revoke all on function public.get_organizer_registration_history(uuid) from public, anon, authenticated;
grant execute on function public.get_organizer_registration_history(uuid) to authenticated;

commit;
