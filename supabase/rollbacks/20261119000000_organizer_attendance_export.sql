-- Apply only after reverting the attendance UI. Removes only this feature's
-- metadata; registrations, issued QR hashes, tickets and old policies survive.
begin;
drop function public.get_organizer_attendance(uuid);
drop policy "Owners read event tickets" on public.tickets;
drop policy "Owners read event registrations" on public.registrations;
revoke select (id, event_id, ticket_type_id, name, email, created_at)
  on public.registrations from authenticated;
revoke select (registration_id, door_code, status, sales_status, created_at)
  on public.tickets from authenticated;
alter table public.tickets drop column door_code, drop column sales_status;
commit;
