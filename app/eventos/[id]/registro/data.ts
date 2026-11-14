import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { PublicEvent } from "@/app/lib/registration";

export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Public event service is not configured");
  // This client never reads organizer cookies or persists an authenticated session.
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  const { data, error } = await publicClient().rpc("get_public_event", { p_event_id: id });
  if (error) throw new Error("Could not load public event");
  return data as PublicEvent | null;
}
