import "server-only";
import { publicClient } from "./supabase/public-client";
import { hasPublicRegistration, type PublicEvent } from "./registration";

export type AvailableEvent = Pick<PublicEvent, "id" | "title" | "description" | "date" | "venue"> & { status: string };

export async function getAvailableEvents(): Promise<AvailableEvent[]> {
  const { data, error } = await publicClient().from("events")
    .select("id,title,description,date,venue,status")
    .eq("status", "publicado").order("date", { ascending: true });
  if (error) throw new Error("Could not load public events");
  const now = new Date();
  return ((data ?? []) as AvailableEvent[]).filter(event => hasPublicRegistration(event, now));
}
