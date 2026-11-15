import "server-only";

import { publicClient } from "@/lib/supabase/public-client";
import { mapPublicEvent } from "./supabase/mappers";
import type { PublicEvent } from "@/lib/registration";

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  const { data, error } = await publicClient().rpc("get_public_event", { p_event_id: id });
  if (error) throw new Error("Could not load public event");
  return mapPublicEvent(data);
}
