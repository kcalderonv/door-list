export const EVENT_TIME_ZONE = "America/Lima";

export type PublicTicket = { id: string; name: string; remaining: number };
export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  remaining: number;
  tickets: PublicTicket[];
};

export type RegistrationFields = { ticketTypeId: string; name: string; email: string };
export type FieldErrors = Partial<Record<keyof RegistrationFields, string>>;
export type RegistrationStatus = "idle" | "validation_error" | "unavailable" | "sold_out" | "duplicate" | "error" | "success";
export type RegistrationState = {
  status: RegistrationStatus;
  message: string;
  fieldErrors: FieldErrors;
  // Undefined preserves the last snapshot; null means registration has closed.
  event?: PublicEvent | null;
  ticketName?: string;
};

export const initialRegistrationState: RegistrationState = { status: "idle", message: "", fieldErrors: {} };

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function validateRegistration(formData: FormData): { fields: RegistrationFields; errors: FieldErrors } {
  const read = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const fields = { ticketTypeId: read("ticketTypeId"), name: read("name"), email: read("email").toLowerCase() };
  const errors: FieldErrors = {};
  if (!isUuid(fields.ticketTypeId)) errors.ticketTypeId = "Elige un tipo de entrada disponible.";
  if (!fields.name || fields.name.length > 200) errors.name = "Ingresa tu nombre (máximo 200 caracteres).";
  if (fields.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = "Ingresa un correo electrónico válido (máximo 254 caracteres).";
  }
  return { fields, errors };
}

export function limaDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function hasPublicRegistration(event: { status: string; date: string }, now = new Date()): boolean {
  return event.status === "publicado" && limaDate(event.date) >= limaDate(now);
}
