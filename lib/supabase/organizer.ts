import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export function loadOrganizerData(client: SupabaseClient, userId: string) {
 return Promise.all([client.from("events").select("*").eq("organizer_id", userId).order("date"), client.from("ticket_types").select("*")]);
}
