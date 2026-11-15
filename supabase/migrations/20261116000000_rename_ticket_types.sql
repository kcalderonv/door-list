begin;

alter table public.tickets_types rename to ticket_types;
alter table public.ticket_types rename constraint tickets_types_pkey to ticket_types_pkey;
alter table public.ticket_types rename constraint tickets_types_event_id_fkey to ticket_types_event_id_fkey;
alter table public.ticket_types rename constraint tickets_types_max_capacity_check to ticket_types_max_capacity_check;
alter table public.ticket_types rename constraint tickets_types_event_id_name_key to ticket_types_event_id_name_key;
alter table public.ticket_types rename constraint tickets_types_event_id_id_key to ticket_types_event_id_id_key;

-- Policies, grants and foreign keys follow the table identity.
-- Renaming unique/primary constraints also renames their supporting indexes.
alter table public.ticket_types enable row level security;

create or replace function public.get_public_event(p_event_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description,
    'date', e.date, 'venue', e.venue,
    'remaining', greatest(0::bigint, e.max_capacity - (
      select count(*) from public.registrations r where r.event_id = e.id
    )),
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name,
        'remaining', greatest(0::bigint, t.max_capacity - (
          select count(*) from public.registrations r
          where r.event_id = e.id and r.ticket_type_id = t.id
        ))
      ) order by t.name, t.id)
      from public.ticket_types t where t.event_id = e.id
    ), '[]'::jsonb)
  )
  from public.events e
  where e.id = p_event_id and e.status = 'publicado'
    and (e.date at time zone 'America/Lima')::date >= (statement_timestamp() at time zone 'America/Lima')::date;
$$;

create or replace function public.save_event(p_id uuid, p_title text, p_description text, p_date timestamptz, p_venue text, p_status text, p_capacity integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_capacity is null or p_capacity < 1 then raise exception 'El aforo debe ser positivo'; end if;
  if p_id is null then
    insert into public.events(organizer_id,title,description,date,venue,status,max_capacity)
      values(auth.uid(),p_title,p_description,p_date,p_venue,p_status,p_capacity) returning id into result;
  else
    perform 1 from public.events where id = p_id and organizer_id = auth.uid() for update;
    if not found then raise exception 'Evento no encontrado'; end if;
    if (select count(*) from public.registrations where event_id = p_id) > p_capacity then
      raise exception 'El aforo no puede ser menor que la cantidad de personas registradas';
    end if;
    if (select coalesce(sum(max_capacity),0) from public.ticket_types where event_id = p_id) > p_capacity then
      raise exception 'El aforo es menor que el total asignado a las entradas';
    end if;
    update public.events set title=p_title,description=p_description,date=p_date,venue=p_venue,status=p_status,max_capacity=p_capacity where id=p_id;
    result := p_id;
  end if;
  return result;
end;
$$;

create or replace function public.save_ticket_type(p_id uuid, p_event_id uuid, p_name text, p_capacity integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare event_capacity integer; result uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  select max_capacity into event_capacity from public.events where id=p_event_id and organizer_id=auth.uid() for update;
  if not found then raise exception 'Evento no encontrado'; end if;
  if p_capacity is null or p_capacity < 1 then raise exception 'El aforo debe ser positivo'; end if;
  if p_id is not null then
    perform 1 from public.ticket_types where id = p_id and event_id = p_event_id for update;
    if not found then raise exception 'Tipo de entrada no encontrado'; end if;
    if (select count(*) from public.registrations where event_id = p_event_id and ticket_type_id = p_id) > p_capacity then
      raise exception 'El aforo de la entrada no puede ser menor que la cantidad de personas registradas';
    end if;
  end if;
  if (select coalesce(sum(max_capacity),0) from public.ticket_types where event_id=p_event_id and (p_id is null or id <> p_id)) + p_capacity > event_capacity then
    raise exception 'La suma de aforos supera el aforo del evento';
  end if;
  if p_id is null then
    insert into public.ticket_types(event_id,name,max_capacity) values(p_event_id,p_name,p_capacity) returning id into result;
  else
    update public.ticket_types set name=p_name,max_capacity=p_capacity where id=p_id and event_id=p_event_id returning id into result;
  end if;
  return result;
end;
$$;

create or replace function public.create_registration(p_event_id uuid, p_ticket_type_id uuid, p_name text, p_email text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  selected_event public.events%rowtype;
  selected_ticket public.ticket_types%rowtype;
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

  select * into selected_ticket from public.ticket_types
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

create or replace function public.get_public_ticket(p_code text)
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
    join public.ticket_types tt on tt.id = r.ticket_type_id and tt.event_id = r.event_id
    join public.events e on e.id = r.event_id
    where t.code_hash = sha256(convert_to(p_code, 'UTF8'))
  );
end;
$$;

commit;
