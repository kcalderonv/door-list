import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegistrationHistory } from "./contracts";
import { isUuid } from "./registration";

export async function registrationHistoryResponse(
  request: Request,
  eventId: string,
  createClient: (token: string) => SupabaseClient,
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
  if (!isUuid(eventId)) return fail("Evento no disponible.", 404);
  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return fail("Inicia sesión para consultar los registros.", 401);
  try {
    const client = createClient(token);
    const { data: userData, error: authError } = await client.auth.getUser(token);
    if (authError || !userData.user) return fail("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
    const { data, error } = await client.rpc("get_organizer_registration_history", { p_event_id: eventId });
    if (error) return fail("No se pudo cargar la gráfica de registros.", 500);
    if (!data) return fail("Evento no disponible.", 404);
    return Response.json(data as RegistrationHistory, { headers });
  } catch {
    return fail("No se pudo cargar la gráfica de registros.", 500);
  }
}
