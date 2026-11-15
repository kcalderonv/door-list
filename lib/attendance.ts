import type { OrganizerAttendance, OrganizerAttendee } from "./contracts";

export function soldAttendees(attendees: readonly OrganizerAttendee[]): OrganizerAttendee[] {
  return attendees.filter(({ ticket }) => ticket.salesStatus === "active" &&
    (ticket.status === "valid" || ticket.status === "used"));
}

export function attendanceSales(details: OrganizerAttendance) {
  const attendees = soldAttendees(details.attendees);
  const counts = new Map<string, number>();
  for (const attendee of attendees) {
    counts.set(attendee.ticketTypeId, (counts.get(attendee.ticketTypeId) ?? 0) + 1);
  }
  return details.ticketTypes.map(type => {
    const sold = counts.get(type.id) ?? 0;
    return { ...type, sold, remaining: type.maxCapacity === null ? null : Math.max(0, type.maxCapacity - sold) };
  });
}
