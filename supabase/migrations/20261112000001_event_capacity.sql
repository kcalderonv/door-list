alter table public.events add column max_capacity integer;
update public.events e set max_capacity = greatest(1, coalesce((select sum(t.max_capacity) from public.tickets_types t where t.event_id = e.id), 0));
alter table public.events alter column max_capacity set not null;
alter table public.events add constraint events_capacity_positive check (max_capacity > 0);
revoke update on public.events from authenticated;
revoke insert, update on public.tickets_types from authenticated;

create function public.save_event(p_id uuid, p_title text, p_description text, p_date timestamptz, p_venue text, p_status text, p_capacity integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_capacity is null or p_capacity < 1 then raise exception 'El aforo debe ser positivo'; end if;
  if p_id is null then
    insert into public.events (organizer_id,title,description,date,venue,status,max_capacity)
    values (auth.uid(),p_title,p_description,p_date,p_venue,p_status,p_capacity) returning id into result;
  else
    perform 1 from public.events where id=p_id and organizer_id=auth.uid() for update;
    if not found then raise exception 'Evento no encontrado'; end if;
    if (select coalesce(sum(max_capacity),0) from public.tickets_types where event_id=p_id) > p_capacity then
      raise exception 'El aforo es menor que el total asignado a las entradas';
    end if;
    update public.events set title=p_title,description=p_description,date=p_date,venue=p_venue,status=p_status,max_capacity=p_capacity where id=p_id;
    result := p_id;
  end if;
  return result;
end $$;

create function public.save_ticket_type(p_id uuid, p_event_id uuid, p_name text, p_capacity integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare event_capacity integer; result uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  select max_capacity into event_capacity from public.events where id=p_event_id and organizer_id=auth.uid() for update;
  if not found then raise exception 'Evento no encontrado'; end if;
  if p_capacity is null or p_capacity < 1 then raise exception 'El aforo debe ser positivo'; end if;
  if p_id is not null and not exists (select 1 from public.tickets_types where id=p_id and event_id=p_event_id) then raise exception 'Tipo de entrada no encontrado'; end if;
  if (select coalesce(sum(max_capacity),0) from public.tickets_types where event_id=p_event_id and (p_id is null or id <> p_id)) + p_capacity > event_capacity then
    raise exception 'La suma de aforos supera el aforo del evento';
  end if;
  if p_id is null then
    insert into public.tickets_types(event_id,name,max_capacity) values(p_event_id,p_name,p_capacity) returning id into result;
  else
    update public.tickets_types set name=p_name,max_capacity=p_capacity where id=p_id and event_id=p_event_id returning id into result;
  end if;
  return result;
end $$;
revoke all on function public.save_event(uuid,text,text,timestamptz,text,text,integer) from public, anon;
revoke all on function public.save_ticket_type(uuid,uuid,text,integer) from public, anon;
grant execute on function public.save_event(uuid,text,text,timestamptz,text,text,integer) to authenticated;
grant execute on function public.save_ticket_type(uuid,uuid,text,integer) to authenticated;
