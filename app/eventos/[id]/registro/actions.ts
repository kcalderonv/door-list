"use server";
import { mapRegistration } from "@/lib/supabase/mappers";
import type { EmailDelivery } from "@/lib/contracts";

import { isUuid, validateRegistration, type RegistrationState } from "@/lib/registration";
import { isTicketCode } from "@/lib/tickets";
import { sendRegistrationEmail } from "@/lib/registration-email";
import { getPublicEvent } from "@/lib/public-event";
import { publicClient } from "@/lib/supabase/public-client";

export async function registerForEvent(
  eventId: string,
  previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  if (!isUuid(eventId)) {
    return { status: "unavailable", message: "Este evento ya no está disponible para registros.", fieldErrors: {}, event: null };
  }
  const { fields, errors } = validateRegistration(formData);
  if (Object.keys(errors).length) {
    return { status: "validation_error", message: "Revisa los campos indicados.", fieldErrors: errors, event: previous.event };
  }

  try {
    const { data: rawData, error } = await publicClient().rpc("create_registration", {
      p_event_id: eventId,
      p_ticket_type_id: fields.ticketTypeId,
      p_name: fields.name,
      p_email: fields.email,
    });
    const data = mapRegistration(rawData);
    if (error) throw new Error("Registration request failed");

    if (data?.code === "CREATED" && isUuid(data.registrationId ?? "") && typeof data.ticketName === "string" && isTicketCode(data.ticketCode)) {
      // Issuance has already committed. Email delivery must never turn a valid
      // registration into an error or prompt another registration attempt.
      let emailDelivery: EmailDelivery = "failed";
      try {
        emailDelivery = await sendRegistrationEmail(data.ticketCode);
      } catch {
        // Preserve confirmation even if the mail adapter unexpectedly throws.
      }
      return { status: "success", message: "Registro confirmado", fieldErrors: {}, ticketName: data.ticketName, ticketCode: data.ticketCode, emailDelivery };
    }
    if (data?.code === "EVENT_UNAVAILABLE") {
      return { status: "unavailable", message: "Este evento ya no admite registros. Puede haber finalizado o dejado de estar publicado.", fieldErrors: {}, event: null };
    }
    if (data?.code === "ALREADY_REGISTERED") {
      return { status: "duplicate", message: "Este correo ya está registrado en el evento. No se ha creado otro registro.", fieldErrors: {}, event: previous.event };
    }
    if (data?.code === "SOLD_OUT" || data?.code === "INVALID_TICKET_TYPE") {
      const event = await getPublicEvent(eventId);
      return event
        ? { status: "sold_out", message: "La entrada seleccionada ya no está disponible. Elige otra opción con cupo.", fieldErrors: {}, event }
        : { status: "unavailable", message: "Este evento ya no admite registros.", fieldErrors: {}, event: null };
    }
    if (data?.code === "VALIDATION_ERROR") {
      return { status: "validation_error", message: "Revisa tu nombre, correo y tipo de entrada antes de volver a enviar.", fieldErrors: {}, event: previous.event };
    }
    throw new Error("Unexpected registration result");
  } catch {
    // A lost response may follow a committed insert. The unique email constraint
    // makes retrying with the same email safe without claiming unverified success.
    return { status: "error", message: "No pudimos confirmar el resultado. Vuelve a intentarlo con el mismo correo; si ya se guardó, no se duplicará.", fieldErrors: {}, event: previous.event };
  }
}
