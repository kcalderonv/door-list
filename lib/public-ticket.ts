import "server-only";
import { publicClient } from "@/lib/supabase/public-client";
import { isTicketCode, type Ticket } from "@/lib/tickets";

export async function getPublicTicket(code: string): Promise<Ticket | null> {
  if (!isTicketCode(code)) return null;
  const { data, error } = await publicClient().rpc("get_public_ticket", { p_code: code });
  if (error) throw new Error("Could not load ticket");
  return data as Ticket | null;
}
