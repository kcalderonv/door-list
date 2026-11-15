import type { OrganizerAttendance } from "../contracts";
import { soldAttendees } from "../attendance";
import { formatEventDate, limaDate } from "../dates";
import { ticketStatuses } from "../tickets";
import { createCsv } from "./csv";

export const attendeeHeaders = [
  "nombre", "email", "tipo de entrada", "código de ticket", "fecha de compra", "estado del ticket",
] as const;

export function createAttendeesCsv(details: OrganizerAttendance): string {
  const types = new Map(details.ticketTypes.map(type => [type.id, type.name]));
  return createCsv(attendeeHeaders, soldAttendees(details.attendees).map(attendee => [
    attendee.name, attendee.email, types.get(attendee.ticketTypeId) ?? "Entrada no disponible",
    attendee.ticket.code, formatEventDate(attendee.ticket.issuedAt), ticketStatuses[attendee.ticket.status].label,
  ]));
}

export function attendeesFilename(title: string, now: Date = new Date()): string {
  const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "evento";
  return `asistentes-${slug}-${limaDate(now)}.csv`;
}
