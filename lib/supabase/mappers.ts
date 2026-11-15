import type { PublicEvent } from "../registration";
export function mapPublicEvent(data: (Omit<PublicEvent, "ticketTypes"> & { tickets: PublicEvent["ticketTypes"] }) | null): PublicEvent | null {
 if (!data) return null;
 const { tickets, ...event } = data;
 return { ...event, ticketTypes: tickets };
}
export function mapRegistration(data: { code?: string; registration_id?: string; ticket_name?: string; ticket_code?: string } | null) {
 return data ? { code: data.code, registrationId: data.registration_id, ticketName: data.ticket_name, ticketCode: data.ticket_code } : null;
}
