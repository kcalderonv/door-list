import assert from "node:assert/strict";
import { after, test } from "node:test";
import { registerHooks } from "node:module";
import { createCsv } from "../lib/export/csv.ts";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.includes("/lib/") && !context.parentURL.includes("/node_modules/")) {
      return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { attendeesFilename, createAttendeesCsv } = await import("../lib/export/attendees.ts");
after(() => hooks.deregister());

const headers = ["nombre", "email", "tipo de entrada", "código de ticket", "fecha de compra", "estado del ticket"];

test("CSV preserves column order, accents and UTF-8 BOM bytes", () => {
  const csv = createCsv(headers, [["María", "maria@example.com", "General", "ticket-code", "2026-11-15", "Válida"]]);
  assert.deepEqual([...Buffer.from(csv, "utf8").subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(csv, `\uFEFF${headers.join(",")}\r\nMaría,maria@example.com,General,ticket-code,2026-11-15,Válida\r\n`);
});

test("CSV escapes commas, double quotes and embedded line breaks", () => {
  const csv = createCsv(headers, [['Ana "La Jefa" Pérez, Jr.', "ana@example.com", "General\nPlatea\r\nPreferente", "ticket-code", "2026-11-15", "Válida"]]);
  assert.equal(csv, `\uFEFF${headers.join(",")}\r\n"Ana ""La Jefa"" Pérez, Jr.",ana@example.com,"General\nPlatea\r\nPreferente",ticket-code,2026-11-15,Válida\r\n`);
});

test("an event without attendees produces just the header row and BOM", () => {
  assert.equal(createCsv(headers, []), `\uFEFF${headers.join(",")}\r\n`);
});

test("CSV handles missing values, numeric zero and quotes in headers", () => {
  assert.equal(createCsv(['A "quoted" header', "B", "C"], [[null, undefined, 0]]), '\uFEFF"A ""quoted"" header",B,C\r\n,,0\r\n');
});

test("CSV refuses rows that would silently misalign attendee columns", () => {
  assert.throws(() => createCsv(headers, [["Ana"]]), /header column count/);
});

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

test("cancelled, refunded and revoked tickets never appear in CSV", () => {
  const data = details([
    attendee("valid"), attendee("used", "used"), attendee("cancelled", "valid", "cancelled"),
    attendee("refunded", "used", "refunded"), attendee("revoked", "revoked"), attendee("guest", "valid", "active", "unlimited"),
  ]);
  const csv = createAttendeesCsv(data);
  for (const id of ["cancelled", "refunded", "revoked"]) assert.ok(!csv.includes(`door-${id}`));
  assert.ok(csv.includes("door-valid"));
  assert.ok(csv.includes("door-used"));
  assert.ok(csv.includes("Utilizada"));
});

test("attendee export uses the six required columns and escapes the actual attendee name", () => {
  const data = details([{ ...attendee("ana"), name: 'Ana "La Jefa" Pérez, Jr.' }]);
  const csv = createAttendeesCsv(data);
  assert.ok(csv.startsWith(`\uFEFF${headers.join(",")}\r\n`));
  assert.ok(csv.includes('"Ana ""La Jefa"" Pérez, Jr.",ana@example.com,General,door-ana,'));
  assert.ok(csv.endsWith(",Válida\r\n"));
});

test("real attendee export with no tickets contains only the required headers", () => {
  assert.equal(createAttendeesCsv(details()), `\uFEFF${headers.join(",")}\r\n`);
});

test("filename uses a safe event slug and Lima calendar date at the UTC date boundary", () => {
  assert.equal(attendeesFilename("¡Noche de Música / Perú!", new Date("2026-11-16T02:30:00Z")), "asistentes-noche-de-musica-peru-2026-11-15.csv");
  assert.equal(attendeesFilename(" / ", new Date("2026-11-15T19:00:00Z")), "asistentes-evento-2026-11-15.csv");
});
