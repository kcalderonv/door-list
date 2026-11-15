import type { RegistrationStatus } from "./registration";
export const registrationErrors: Record<string, { status: RegistrationStatus; message: string }> = {
 EVENT_UNAVAILABLE: { status: "unavailable", message: "Este evento ya no admite registros. Puede haber finalizado o dejado de estar publicado." },
 SOLD_OUT: { status: "sold_out", message: "La entrada seleccionada ya no est? disponible. Elige otra opci?n con cupo." },
 INVALID_TICKET_TYPE: { status: "sold_out", message: "La entrada seleccionada ya no est? disponible. Elige otra opci?n con cupo." },
 ALREADY_REGISTERED: { status: "duplicate", message: "Este correo ya est? registrado en el evento. No se ha creado otro registro." },
 VALIDATION_ERROR: { status: "validation_error", message: "Revisa tu nombre, correo y tipo de entrada antes de volver a enviar." },
 INVALID_REQUEST: { status: "validation_error", message: "Revisa los campos indicados." },
 REGISTRATION_FAILED: { status: "error", message: "No pudimos confirmar el resultado. Vuelve a intentarlo con el mismo correo; si ya se guard?, no se duplicar?." },
};
export function registrationError(code: string) { return Object.prototype.hasOwnProperty.call(registrationErrors, code) ? registrationErrors[code] : registrationErrors.REGISTRATION_FAILED; }
