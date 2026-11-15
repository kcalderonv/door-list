begin;

-- Supabase installs pgcrypto in extensions. Fail rather than silently falling
-- back to a predictable source if that installation is misconfigured.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$ begin
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null then
    raise exception 'pgcrypto must be installed in the extensions schema before issuing tickets';
  end if;
end $$;

create table public.tickets (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  code_hash bytea not null unique check (octet_length(code_hash) = 32),
  status text not null default 'valid' check (status in ('valid', 'used', 'revoked')),
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;
-- The bearer secret is returned once, never stored in plaintext. There is no
-- public list endpoint, lookup by registration/email, or ticket write policy.
revoke all on public.tickets from public, anon, authenticated;
grant all on public.tickets to service_role;

create or replace function public.create_registration(p_event_id uuid, p_ticket_type_id uuid, p_name text, p_email text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  selected_event public.events%rowtype;
  selected_ticket public.tickets_types%rowtype;
  clean_name text := regexp_replace(p_name, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  clean_email text := lower(regexp_replace(p_email, '^[[:space:]]+|[[:space:]]+$', '', 'g'));
  registration_id uuid;
  issued_code text;
begin
  if p_event_id is null or p_ticket_type_id is null
    or clean_name is null or char_length(clean_name) not between 1 and 200
    or clean_name ~ '^[[:space:]]*$'
    or clean_email is null or char_length(clean_email) > 254
    or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('code', 'VALIDATION_ERROR');
  end if;

  -- The organizer's save functions take this same event lock first. All
  -- availability checks below see committed data after any lock wait.
  select * into selected_event from public.events where id = p_event_id for update;
  if not found then return jsonb_build_object('code', 'EVENT_UNAVAILABLE'); end if;
  if selected_event.status <> 'publicado'
    or (selected_event.date at time zone 'America/Lima')::date < (clock_timestamp() at time zone 'America/Lima')::date then
    return jsonb_build_object('code', 'EVENT_UNAVAILABLE');
  end if;

  select * into selected_ticket from public.tickets_types
    where id = p_ticket_type_id and event_id = p_event_id for update;
  if not found then return jsonb_build_object('code', 'INVALID_TICKET_TYPE'); end if;

  if exists (select 1 from public.registrations where event_id = p_event_id and email = clean_email) then
    return jsonb_build_object('code', 'ALREADY_REGISTERED');
  end if;
  if (select count(*) from public.registrations where event_id = p_event_id) >= selected_event.max_capacity
    or (select count(*) from public.registrations where event_id = p_event_id and ticket_type_id = p_ticket_type_id) >= selected_ticket.max_capacity then
    return jsonb_build_object('code', 'SOLD_OUT');
  end if;
  -- Recheck the date after the ticket lock too: a wait can cross midnight.
  if (selected_event.date at time zone 'America/Lima')::date < (clock_timestamp() at time zone 'America/Lima')::date then
    return jsonb_build_object('code', 'EVENT_UNAVAILABLE');
  end if;

  insert into public.registrations(event_id, ticket_type_id, name, email)
    values (p_event_id, p_ticket_type_id, clean_name, clean_email)
    returning id into registration_id;
  -- Both writes commit together. A collision or issuance error also rolls back
  -- the registration and its capacity. No caller can supply the secret.
  issued_code := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.tickets(registration_id, code_hash)
    values (registration_id, sha256(convert_to(issued_code, 'UTF8')));
  return jsonb_build_object('code', 'CREATED', 'registration_id', registration_id,
    'ticket_name', selected_ticket.name, 'ticket_code', issued_code);
end;
$$;

create function public.get_public_ticket(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  -- Exact match only; malformed and unknown tokens both return null.
  if p_code is null or char_length(p_code) <> 64 or p_code !~ '^[a-f0-9]{64}$' then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'status', t.status, 'name', r.name, 'email', r.email,
      'ticketName', tt.name, 'issuedAt', t.created_at,
      'event', jsonb_build_object('title', e.title, 'date', e.date, 'venue', e.venue)
    )
    from public.tickets t
    join public.registrations r on r.id = t.registration_id
    join public.tickets_types tt on tt.id = r.ticket_type_id and tt.event_id = r.event_id
    join public.events e on e.id = r.event_id
    where t.code_hash = sha256(convert_to(p_code, 'UTF8'))
  );
end;
$$;

revoke all on function public.get_public_ticket(text) from public, anon, authenticated;
grant execute on function public.get_public_ticket(text) to anon, authenticated;
-- CREATE OR REPLACE preserves the existing create_registration permissions.

commit;
