import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.includes("/lib/") && !context.parentURL.includes("/node_modules/")) {
      return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { loadOrganizerData, loadOrganizerEventDetails, loadOrganizerAttendance } = await import("../lib/supabase/organizer.ts");
after(() => hooks.deregister());

function mockClient(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      const query = {
        select(columns) { calls.push([table, "select", columns]); return query; },
        eq(column, value) { calls.push([table, "eq", column, value]); return query; },
        in(column, values) { calls.push([table, "in", column, values]); return query; },
        order() { return Promise.resolve(results[table]); },
      };
      return query;
    },
  };
}

test("organizer queries filter owners and ticket types, and expose camelCase", async () => {
  const client = mockClient({
    events: { data: [{ id: "own-event", title: "Evento", max_capacity: 10 }], error: null },
    ticket_types: { data: [{ id: "type", event_id: "own-event", name: "General", max_capacity: 5 }], error: null },
  });
  const [events, ticketTypes] = await loadOrganizerData(client, "owner");
  assert.ok(client.calls.some(call => JSON.stringify(call) === JSON.stringify(["events", "eq", "organizer_id", "owner"])));
  assert.ok(client.calls.some(call => JSON.stringify(call) === JSON.stringify(["ticket_types", "in", "event_id", ["own-event"]])));
  assert.equal(events.data[0].maxCapacity, 10);
  assert.deepEqual(ticketTypes.data, [{ id: "type", eventId: "own-event", name: "General", maxCapacity: 5 }]);
  assert.equal(events.data[0].max_capacity, undefined);
});

test("no owned events or failed event lookup never triggers an unscoped ticket query", async () => {
  for (const result of [{ data: [], error: null }, { data: null, error: { message: "failed" } }]) {
    const client = mockClient({ events: result });
    const [, types] = await loadOrganizerData(client, "owner");
    assert.deepEqual(types.data, []);
    assert.ok(client.calls.every(call => call[0] === "events"));
  }
});

test("details use the authenticated RPC and preserve a denied or missing event", async () => {
  const client = { async rpc(name, args) {
    assert.equal(name, "get_organizer_event_details");
    assert.deepEqual(args, { p_event_id: "event" });
    return { data: null, error: null };
  } };
  assert.equal(await loadOrganizerEventDetails(client, "event"), null);
});

test("provider errors never expose database details", async () => {
  const client = { async rpc() { return { data: null, error: { message: "Private SQL details" } }; } };
  await assert.rejects(loadOrganizerEventDetails(client, "event"), { message: "No se pudieron cargar los registros. Inténtalo nuevamente." });
});

test("attendance uses the caller's RLS-protected RPC and returns no data for another owner", async () => {
  const client = { async rpc(name, args) {
    assert.equal(name, "get_organizer_attendance");
    assert.deepEqual(args, { p_event_id: "another-owner-event" });
    return { data: null, error: null };
  } };
  assert.equal(await loadOrganizerAttendance(client, "another-owner-event"), null);
});

test("attendance provider errors cannot be downloaded as an empty event or expose private messages", async () => {
  const client = { async rpc() { return { data: null, error: { message: "private SQL or JWT failure" } }; } };
  await assert.rejects(loadOrganizerAttendance(client, "event"), { message: "No se pudieron cargar los asistentes. Inténtalo nuevamente." });
});
