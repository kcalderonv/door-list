import { registrationHistoryResponse } from "@/lib/registration-history-service";
import { authenticatedClient } from "@/lib/supabase/authenticated-client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return registrationHistoryResponse(request, id, authenticatedClient);
}

function unsupported() {
  return Response.json({ error: "Método no permitido." }, {
    status: 405,
    headers: { Allow: "GET, HEAD, OPTIONS", "Cache-Control": "no-store" },
  });
}
export { unsupported as POST, unsupported as PUT, unsupported as PATCH, unsupported as DELETE };
