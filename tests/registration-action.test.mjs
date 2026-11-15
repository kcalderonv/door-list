import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";

// Exercise the registration service while replacing only its database boundary.
const database = { result: null, event: null, failure: false, calls: [] };
const mail = { calls: [], result: "sent", failure: false };
globalThis.__registrationTestDatabase = database;
globalThis.__registrationTestMail = mail;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return {url: "test:server-only", shortCircuit: true};
    if (specifier === "@/lib/registration") return { url: new URL("../lib/registration.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/tickets") return { url: new URL("../lib/tickets.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/registration-email") return { url: "test:registration-mail", shortCircuit: true };
    if (["@/lib/public-event", "@/lib/supabase/public-client"].includes(specifier) && context.parentURL?.endsWith("/registration-service.ts")) return { url: "test:registration-data", shortCircuit: true };
    if (specifier.startsWith("@/lib/")) return { url: new URL("../lib/" + specifier.slice(6) + ".ts", import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.includes("/lib/") && !context.parentURL.includes("/node_modules/")) return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    if (url === "test:registration-mail") return {
      format: "module", shortCircuit: true,
      source: `export async function sendRegistrationEmail(ticket) {
        const mail = globalThis.__registrationTestMail;
        mail.calls.push(ticket);
        if (mail.failure) throw new Error("SMTP unavailable");
        return mail.result;
      }`,
    };
    if (url === "test:registration-data") return {
      format: "module", shortCircuit: true,
      source: `
        export function publicClient() {
          return { rpc: async (name, args) => {
            const db = globalThis.__registrationTestDatabase;
            db.calls.push({ name, args });
            if (db.failure) throw new Error("Connection lost");
            return db.result;
          } };
        }
        export async function getPublicEvent() { return globalThis.__registrationTestDatabase.event; }
      `,
    };
    return next(url, context);
  },
});
const { registerForEvent } = await import("../lib/registration-service.ts");
const eventId = "8f9a1248-8cf1-4739-9d8a-e0d6a7847353";
const ticketId = "976722c2-e5d2-4a2a-8207-7c571b9fab3c";
const initial = { status: "idle", message: "", fieldErrors: {} };
const issuedCode = "a1".repeat(32);
function form() {
  const data = new FormData();
  data.set("name", "  Ana  "); data.set("email", " ANA@Example.com "); data.set("ticketTypeId", ticketId);
  return data;
}
beforeEach(() => { database.calls = []; database.result = null; database.event = null; database.failure = false; mail.calls = []; mail.result = "sent"; mail.failure = false; });
after(() => { hooks.deregister(); delete globalThis.__registrationTestDatabase; delete globalThis.__registrationTestMail; });

test("invalid fields never reach the database", async () => {
  const result = await registerForEvent(eventId, initial, new FormData());
  assert.equal(result.status, "validation_error");
  assert.equal(database.calls.length, 0);
});

test("invalid event IDs are unavailable without a database request", async () => {
  assert.equal((await registerForEvent("invalid", initial, form())).status, "unavailable");
  assert.equal(database.calls.length, 0);
});

test("success requires a confirmed insert and submits normalized values", async () => {
  database.result = { data: { code: "CREATED", registration_id: eventId, ticket_name: "General", ticket_code: issuedCode }, error: null };
  const result = await registerForEvent(eventId, initial, form());
  assert.equal(result.status, "success");
  assert.equal(result.ticketName, "General");
  assert.equal(result.ticketCode, issuedCode);
  assert.equal(result.emailDelivery, "sent");
  assert.deepEqual(mail.calls, [issuedCode]);
  assert.deepEqual(database.calls, [{ name: "create_registration", args: { p_event_id: eventId, p_ticket_type_id: ticketId, p_name: "Ana", p_email: "ana@example.com" } }]);
});

test("a duplicate consumes no further action request", async () => {
  database.result = { data: { code: "ALREADY_REGISTERED", ticket_code: issuedCode }, error: null };
  const result = await registerForEvent(eventId, initial, form());
  assert.equal(result.status, "duplicate");
  assert.equal(result.ticketCode, undefined, "knowing an email never reveals its ticket secret");
  assert.equal(database.calls.length, 1);
  assert.equal(mail.calls.length, 0, "duplicates must never trigger another email");
});

test("a CREATED response without a valid issued secret never confirms an entry", async () => {
  for (const ticket_code of [undefined, null, eventId, "a".repeat(63), "a".repeat(65), "g".repeat(64), "../organizador"]) {
    database.result = { data: { code: "CREATED", registration_id: eventId, ticket_name: "General", ticket_code }, error: null };
    const result = await registerForEvent(eventId, initial, form());
    assert.equal(result.status, "error");
    assert.equal(result.ticketCode, undefined);
    assert.equal(mail.calls.length, 0);
  }
});

test("email failure or disabled email never removes a committed ticket confirmation", async () => {
  database.result = { data: { code: "CREATED", registration_id: eventId, ticket_name: "General", ticket_code: issuedCode }, error: null };
  for (const delivery of ["failed", "disabled"]) {
    mail.result = delivery;
    const result = await registerForEvent(eventId, initial, form());
    assert.equal(result.status, "success");
    assert.equal(result.ticketCode, issuedCode);
    assert.equal(result.emailDelivery, delivery);
  }
  mail.failure = true;
  const result = await registerForEvent(eventId, initial, form());
  assert.equal(result.status, "success");
  assert.equal(result.ticketCode, issuedCode);
  assert.equal(result.emailDelivery, "failed");
});

test("sold-out and removed tickets refresh the event's options", async () => {
  const fresh = { id: eventId, remaining: 1, ticketTypes: [{ id: "another-ticket", name: "Alternativa", remaining: 1 }] };
  database.event = fresh;
  for (const code of ["SOLD_OUT", "INVALID_TICKET_TYPE"]) {
    database.result = { data: { code }, error: null };
    const result = await registerForEvent(eventId, initial, form());
    assert.equal(result.status, "sold_out");
    assert.equal(result.event, fresh);
  }
});

test("a closed event removes the form, including when discovered during refresh", async () => {
  for (const code of ["EVENT_UNAVAILABLE", "SOLD_OUT"]) {
    database.result = { data: { code }, error: null };
    const result = await registerForEvent(eventId, initial, form());
    assert.equal(result.status, "unavailable");
    assert.equal(result.event, null);
  }
});

test("database validation failures remain errors", async () => {
  database.result = { data: { code: "VALIDATION_ERROR" }, error: null };
  assert.equal((await registerForEvent(eventId, initial, form())).status, "validation_error");
});

test("connection failures, DB errors and malformed success replies never report success", async () => {
  database.failure = true;
  assert.equal((await registerForEvent(eventId, initial, form())).status, "error");
  database.failure = false;
  for (const result of [{ data: null, error: { message: "SQL details must stay private" } }, { data: { code: "CREATED" }, error: null }]) {
    database.result = result;
    const response = await registerForEvent(eventId, initial, form());
    assert.equal(response.status, "error");
    assert.ok(!response.message.includes("SQL details"));
  }
});
