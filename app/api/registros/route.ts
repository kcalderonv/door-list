import type { RegistrationResponse } from "@/lib/contracts";
import { registerForEvent } from "@/lib/registration-service";
import { initialRegistrationState } from "@/lib/registration";
export async function POST(request: Request) {
 let body;
 try { body = await request.json(); } catch { return Response.json({error:"INVALID_REQUEST"},{status:400}); }
 if (!body || typeof body !== "object" || Array.isArray(body) || !["eventId","ticketTypeId","name","email"].every(key => typeof body[key] === "string")) return Response.json({error:"INVALID_REQUEST"},{status:400});
 try {
  const form = new FormData();
  for (const key of ["ticketTypeId","name","email"]) form.set(key,body[key]);
  const result = await registerForEvent(body.eventId,initialRegistrationState,form);
  if (result.status === "success" && result.registrationId && result.ticketName && result.ticketCode && result.emailDelivery) return Response.json({registrationId:result.registrationId,ticketName:result.ticketName,ticketCode:result.ticketCode,emailDelivery:result.emailDelivery} satisfies RegistrationResponse,{status:201,headers:{"Cache-Control":"no-store"}});
  const errors = { unavailable:[404,"EVENT_UNAVAILABLE"], sold_out:[409,"SOLD_OUT"], duplicate:[409,"ALREADY_REGISTERED"], validation_error:[422,"VALIDATION_ERROR"] } as const;
  const [status,error] = errors[result.status as keyof typeof errors] ?? [500,"REGISTRATION_FAILED"];
  return Response.json({error:result.errorCode ?? error},{status});
 } catch { return Response.json({error:"REGISTRATION_FAILED"},{status:500}); }
}
function unsupported() { return Response.json({error:"METHOD_NOT_ALLOWED"},{status:405,headers:{Allow:"POST, OPTIONS"}}); }
export {unsupported as GET, unsupported as PUT, unsupported as PATCH, unsupported as DELETE};
