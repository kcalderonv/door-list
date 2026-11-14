import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";

// Exercise the real Server Action while replacing only its database boundary.
const database = { result: null, event: null, failure: false, calls: [] };
globalThis.__registrationTestDatabase = database;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@/app/lib/registration") return { url: new URL("../app/lib/registration.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "./data" && context.parentURL?.endsWith("/actions.ts")) return { url: "test:registration-data", shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
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
const { registerForEvent } = await import("../app/eventos/[id]/registro/actions.ts");
const eventId = "8f9a1248-8cf1-4739-9d8a-e0d6a7847353";
const ticketId = "976722c2-e5d2-4a2a-8207-7c571b9fab3c";
const initial = { status: "idle", message: "", fieldErrors: {} };
function form() {
  const data = new FormData();
  data.set("name", "  Ana  "); data.set("email", " ANA@Example.com "); data.set("ticketTypeId", ticketId);
  return data;
}
beforeEach(() => { database.calls = []; database.result = null; database.event = null; database.failure = false; });
after(() => { hooks.deregister(); delete globalThis.__registrationTestDatabase; });

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
  database.result = { data: { code: "CREATED", registration_id: eventId, ticket_name: "General" }, error: null };
  const result = await registerForEvent(eventId, initial, form());
  assert.equal(result.status, "success");
  assert.equal(result.ticketName, "General");
  assert.deepEqual(database.calls, [{ name: "create_registration", args: { p_event_id: eventId, p_ticket_type_id: ticketId, p_name: "Ana", p_email: "ana@example.com" } }]);
});

test("a duplicate consumes no further action request", async () => {
  database.result = { data: { code: "ALREADY_REGISTERED" }, error: null };
  assert.equal((await registerForEvent(eventId, initial, form())).status, "duplicate");
  assert.equal(database.calls.length, 1);
});

test("sold-out and removed tickets refresh the event's options", async () => {
  const fresh = { id: eventId, remaining: 1, tickets: [{ id: "another-ticket", name: "Alternativa", remaining: 1 }] };
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
