import "server-only";
import { publicClient } from "./supabase/public-client";
import { hasAvailableTickets, hasPublicRegistration, type PublicEvent } from "./registration";
import { getPublicEvent } from "./public-event";

export type AvailableEvent = Pick<PublicEvent, "id" | "title" | "description" | "date" | "venue"> & { status: string };

export async function getAvailableEvents(): Promise<AvailableEvent[]> {
  const { data, error } = await publicClient().from("events")
    .select("id,title,description,date,venue,status")
    .eq("status", "publicado").order("date", { ascending: true });
  if (error) throw new Error("Could not load public events");
  const now = new Date();
  const candidates = ((data ?? []) as AvailableEvent[]).filter(event => hasPublicRegistration(event, now));
  // Use the same public capacity snapshot as the registration page. The final
  // registration transaction still checks capacity again to handle concurrent requests.
  const snapshots = await Promise.all(candidates.map(event => getPublicEvent(event.id)));
  return snapshots.filter(hasAvailableTickets).map(event => ({
    id: event.id, title: event.title, description: event.description,
    date: event.date, venue: event.venue, status: "publicado",
  }));
}
