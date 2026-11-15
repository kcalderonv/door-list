import type { RegistrationRequest, RegistrationResponse } from "./contracts";
import { isTicketCode } from "./tickets";
import { validateRegistration, type RegistrationState } from "./registration";
import { registrationError } from "./registration-errors";
export async function registerForEvent(eventId: string, previous: RegistrationState, formData: FormData): Promise<RegistrationState> {
 const {fields, errors} = validateRegistration(formData);
 if (Object.keys(errors).length) return {status:"validation_error", message:"Revisa los campos indicados.", fieldErrors:errors, event:previous.event};
 try {
  const response = await fetch("/api/registros", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({eventId,...fields} satisfies RegistrationRequest)});
  if (!response.ok) {
   const body = await response.json();
   const error = registrationError(typeof body.error === "string" ? body.error : "REGISTRATION_FAILED");
   let event = error.status === "unavailable" ? null : previous.event;
   if (error.status === "sold_out") {
    try {
     const fresh = await fetch(`/api/eventos/${eventId}`, {cache:"no-store"});
     if (!fresh.ok) { if (fresh.status === 404) return {...registrationError("EVENT_UNAVAILABLE"),fieldErrors:{},event:null}; }
     else event = await fresh.json();
    } catch { /* Keep the diagnosed business error and last snapshot. */ }
   }
   return {...error,fieldErrors:{},event};
  }
  const result: RegistrationResponse = await response.json();
  if (!result || typeof result.registrationId !== "string" || typeof result.ticketName !== "string" || !isTicketCode(result.ticketCode) || !["sent","failed","disabled"].includes(result.emailDelivery)) throw new Error("Invalid registration response");
  return {status:"success",message:"Registro confirmado",fieldErrors:{},registrationId:result.registrationId,ticketName:result.ticketName,ticketCode:result.ticketCode,emailDelivery:result.emailDelivery};
 } catch { return {...registrationError("REGISTRATION_FAILED"),fieldErrors:{},event:previous.event}; }
}
