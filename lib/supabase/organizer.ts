import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OrganizerEventDetails, TicketType } from "../contracts";
import { mapOrganizerEvent, mapOrganizerTicketType } from "./mappers";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export async function loadOrganizerData(client: SupabaseClient, userId: string) {
 const events = await client.from("events").select("id,title,description,date,venue,status,max_capacity").eq("organizer_id", userId).order("date");
 const mappedEvents = { ...events, data: events.error ? null : (events.data ?? []).map(mapOrganizerEvent) };
 if (events.error || !events.data?.length) return [mappedEvents, { data: [] as TicketType[], error: null }] as const;
 const ticketTypes = await client.from("ticket_types").select("id,event_id,name,max_capacity").in("event_id", events.data.map(event => event.id)).order("name");
 return [mappedEvents, { ...ticketTypes, data: ticketTypes.error ? null : (ticketTypes.data ?? []).map(mapOrganizerTicketType) }] as const;
}

export async function loadOrganizerEventDetails(client: SupabaseClient, eventId: string): Promise<OrganizerEventDetails | null> {
 const { data, error } = await client.rpc("get_organizer_event_details", { p_event_id: eventId });
 if (error) throw new Error("No se pudieron cargar los registros. Inténtalo nuevamente.");
 return data;
}
