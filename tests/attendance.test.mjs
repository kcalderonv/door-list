import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceSales, soldAttendees } from "../lib/attendance.ts";

function attendee(id, status = "valid", salesStatus = "active", ticketTypeId = "general") {
  return {
    id, eventId: "event", ticketTypeId, name: `Persona ${id}`, email: `${id}@example.com`, createdAt: "2026-11-15T19:00:00Z",
    ticket: { code: `door-${id}`, status, salesStatus, issuedAt: "2026-11-15T19:00:00Z" },
  };
}

function details(attendees = []) {
  return {
    eventId: "event", eventTitle: "Noche de música", maxCapacity: 20,
    ticketTypes: [
      { id: "general", eventId: "event", name: "General", maxCapacity: 10 },
      { id: "unlimited", eventId: "event", name: "Invitados", maxCapacity: null },
      { id: "empty", eventId: "event", name: "Platea", maxCapacity: 5 },
    ], attendees,
  };
}

test("sales exclude cancelled, refunded and revoked tickets and include valid or used tickets", () => {
  const data = details([
    attendee("valid"), attendee("used", "used"), attendee("cancelled", "valid", "cancelled"),
    attendee("refunded", "used", "refunded"), attendee("revoked", "revoked"), attendee("guest", "valid", "active", "unlimited"),
  ]);
  assert.deepEqual(soldAttendees(data.attendees).map(item => item.id), ["valid", "used", "guest"]);
  assert.deepEqual(attendanceSales(data).map(({ sold, remaining, maxCapacity }) => ({ sold, remaining, maxCapacity })), [
    { sold: 2, remaining: 8, maxCapacity: 10 }, { sold: 1, remaining: null, maxCapacity: null }, { sold: 0, remaining: 5, maxCapacity: 5 },
  ]);
});

test("remaining capacity never becomes negative when the sales target is exceeded", () => {
  const data = details([attendee("one"), attendee("two")]);
  data.ticketTypes[0].maxCapacity = 1;
  assert.equal(attendanceSales(data)[0].remaining, 0);
});

test("an event without attendees retains every ticket type and its remaining capacity", () => {
  assert.deepEqual(attendanceSales(details()).map(({ sold, remaining }) => ({ sold, remaining })), [
    { sold: 0, remaining: 10 }, { sold: 0, remaining: null }, { sold: 0, remaining: 5 },
  ]);
});
