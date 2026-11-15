import { getPublicEvent } from "@/lib/public-event";
import { isUuid } from "@/lib/registration";
export async function GET(_request: Request, {params}: {params:Promise<{id:string}>}) {
 const {id} = await params;
 if (!isUuid(id)) return Response.json({error:"EVENT_UNAVAILABLE"},{status:404});
 try {
  const event = await getPublicEvent(id);
  return event ? Response.json(event,{headers:{"Cache-Control":"no-store"}}) : Response.json({error:"EVENT_UNAVAILABLE"},{status:404});
 } catch { return Response.json({error:"EVENT_LOAD_FAILED"},{status:500}); }
}
function unsupported() { return Response.json({error:"METHOD_NOT_ALLOWED"},{status:405,headers:{Allow:"GET, HEAD, OPTIONS"}}); }
export {unsupported as POST, unsupported as PUT, unsupported as PATCH, unsupported as DELETE};
