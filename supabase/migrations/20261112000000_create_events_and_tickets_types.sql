create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id),
  title text not null,
  description text not null,
  date timestamptz not null,
  venue text not null,
  status text not null default 'borrador' check (status in ('borrador', 'publicado'))
);

create table public.tickets_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  max_capacity integer not null check (max_capacity > 0),
  unique (event_id, name)
);

create index events_organizer_id_idx on public.events (organizer_id);

alter table public.events enable row level security;
alter table public.tickets_types enable row level security;

grant select on public.events, public.tickets_types to anon, authenticated;
grant insert, update, delete on public.events, public.tickets_types to authenticated;

create policy "View published or own events" on public.events
  for select to anon, authenticated
  using (status = 'publicado' or organizer_id = (select auth.uid()));

create policy "Create own events" on public.events
  for insert to authenticated
  with check (organizer_id = (select auth.uid()));

create policy "Update own events" on public.events
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy "Delete own events" on public.events
  for delete to authenticated
  using (organizer_id = (select auth.uid()));

create policy "View ticket types for visible events" on public.tickets_types
  for select to anon, authenticated
  using (exists (
    select 1 from public.events e where e.id = event_id
      and (e.status = 'publicado' or e.organizer_id = (select auth.uid()))
  ));

create policy "Create ticket types for own events" on public.tickets_types
  for insert to authenticated
  with check (exists (
    select 1 from public.events e where e.id = event_id
      and e.organizer_id = (select auth.uid())
  ));

create policy "Update ticket types for own events" on public.tickets_types
  for update to authenticated
  using (exists (
    select 1 from public.events e where e.id = event_id
      and e.organizer_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.events e where e.id = event_id
      and e.organizer_id = (select auth.uid())
  ));

create policy "Delete ticket types for own events" on public.tickets_types
  for delete to authenticated
  using (exists (
    select 1 from public.events e where e.id = event_id
      and e.organizer_id = (select auth.uid())
  ));
