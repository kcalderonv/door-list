import type { RegistrationHistory } from "./contracts";

export async function fetchRegistrationHistory(eventId: string, token: string, signal?: AbortSignal): Promise<RegistrationHistory> {
  const response = await fetch(`/api/eventos/${encodeURIComponent(eventId)}/registros-por-dia`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal,
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
    if (response.status === 404) throw new Error("Evento no disponible. Solo el dueño puede consultar sus registros.");
    throw new Error("No se pudo cargar la gráfica de registros. Inténtalo nuevamente.");
  }
  return response.json();
}
