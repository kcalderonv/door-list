import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

const state = { rows: [], snapshots: {}, error: null, calls: [] };
globalThis.__publicEventsTest = state;
const moduleUrl = code => `data:text/javascript,${encodeURIComponent(code)}`;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: moduleUrl("export {};"), shortCircuit: true };
    if (context.parentURL?.endsWith("/lib/public-events.ts")) {
      if (specifier === "./supabase/public-client") return { url: moduleUrl(`
        export function publicClient() {
          const state = globalThis.__publicEventsTest;
          const query = { select() { return query; }, eq() { return query; },
            async order() { return { data: state.rows, error: state.error }; } };
          return { from() { return query; } };
        }`), shortCircuit: true };
      if (specifier === "./public-event") return { url: moduleUrl(`
        export async function getPublicEvent(id) {
          const state = globalThis.__publicEventsTest;
          state.calls.push(id);
          const result = state.snapshots[id];
          if (result instanceof Error) throw result;
          return result ?? null;
        }`), shortCircuit: true };
    }
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.includes("/lib/") && !context.parentURL.includes("/node_modules/")) {
      return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { getAvailableEvents } = await import("../lib/public-events.ts");
after(() => { hooks.deregister(); delete globalThis.__publicEventsTest; });

test("home only advertises events with capacity and ticket types, preserving date order", async () => {
  const event = id => ({ id, title: id, description: "Descripción", venue: "Lugar", date: "2099-12-01T18:00:00Z", status: "publicado" });
  state.rows = ["full", "no-types", "types-full", "closed", "first", "second"].map(event);
  state.rows.unshift({ ...event("past"), date: "2000-01-01T18:00:00Z" });
  state.snapshots = {
    full: { ...event("full"), remaining: 0, ticketTypes: [{ remaining: 1 }] },
    "no-types": { ...event("no-types"), remaining: 5, ticketTypes: [] },
    "types-full": { ...event("types-full"), remaining: 5, ticketTypes: [{ remaining: 0 }] },
    closed: null,
    first: { ...event("first"), remaining: 1, ticketTypes: [{ remaining: 1 }] },
    second: { ...event("second"), remaining: 2, ticketTypes: [{ remaining: 2 }] },
  };
  state.calls = [];
  assert.deepEqual((await getAvailableEvents()).map(item => item.id), ["first", "second"]);
  assert.ok(!state.calls.includes("past"));
});

test("capacity lookup failures surface as an error rather than an empty or open catalog", async () => {
  state.rows = [{ id: "failed", status: "publicado", date: "2099-12-01T18:00:00Z" }];
  state.snapshots = { failed: new Error("Lookup failed") };
  await assert.rejects(getAvailableEvents(), /Lookup failed/);
});
