import type { PublicEvent } from "../registration";
import type { Event, TicketType } from "../contracts";

export function mapOrganizerEvent(data: Omit<Event, "maxCapacity"> & { max_capacity: number }): Event {
 const { max_capacity: maxCapacity, ...event } = data;
 return { ...event, maxCapacity };
}

export function mapOrganizerTicketType(data: { id: string; event_id: string; name: string; max_capacity: number }): TicketType {
 return { id: data.id, eventId: data.event_id, name: data.name, maxCapacity: data.max_capacity };
}
export function mapPublicEvent(data: (Omit<PublicEvent, "ticketTypes"> & { tickets: PublicEvent["ticketTypes"] }) | null): PublicEvent | null {
 if (!data) return null;
 const { tickets, ...event } = data;
 return { ...event, ticketTypes: tickets };
}
export function mapRegistration(data: { code?: string; registration_id?: string; ticket_name?: string; ticket_code?: string } | null) {
 return data ? { code: data.code, registrationId: data.registration_id, ticketName: data.ticket_name, ticketCode: data.ticket_code } : null;
}
