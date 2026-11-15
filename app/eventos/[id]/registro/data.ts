import "server-only";

import { publicClient } from "@/app/lib/public-supabase";
import type { PublicEvent } from "@/app/lib/registration";
export { publicClient };

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  const { data, error } = await publicClient().rpc("get_public_event", { p_event_id: id });
  if (error) throw new Error("Could not load public event");
  return data ? { ...data, ticketTypes: data.tickets } as PublicEvent : null;
}
