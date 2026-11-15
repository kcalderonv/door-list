import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { isTicketCode, ticketPath, ticketStatuses } from "../lib/tickets.ts";

const code = "0123456789abcdef".repeat(4);
const service = { calls: [], data: null, error: null };
globalThis.__ticketLookupTest = service;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    if (specifier === "@/lib/tickets") return { url: new URL("../lib/tickets.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/public-ticket") return { url: new URL("../lib/public-ticket.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/supabase/public-client") return { url: "test:ticket-service", shortCircuit: true };
    if (specifier.startsWith("@/lib/")) return { url: new URL("../lib/" + specifier.slice(6) + ".ts", import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.includes("/lib/") && !context.parentURL.includes("/node_modules/")) return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    if (url === "test:ticket-service") return {
      format: "module", shortCircuit: true,
      source: `export function publicClient() { return { rpc: async (name, args) => {
        const test = globalThis.__ticketLookupTest;
        test.calls.push({ name, args });
        return { data: test.data, error: test.error };
      } }; }`,
    };
    return next(url, context);
  },
});
const { getPublicTicket } = await import("../lib/public-ticket.ts");
beforeEach(() => { service.calls = []; service.data = null; service.error = null; });
after(() => { hooks.deregister(); delete globalThis.__ticketLookupTest; });

test("only a complete 256-bit hex code can form a ticket URL", () => {
  assert.equal(isTicketCode(code), true);
  assert.equal(ticketPath(code), `/entradas/${code}`);
  for (const invalid of [null, undefined, 1, {}, "", "1", "a".repeat(63), "a".repeat(65), "g".repeat(64), code.toUpperCase(), `${code}\n`, "../organizador", "ana@example.com", "%", "8f9a1248-8cf1-4739-9d8a-e0d6a7847353"]) {
    assert.equal(isTicketCode(invalid), false);
    assert.throws(() => ticketPath(invalid));
  }
});

test("malformed and enumerable identifiers never call the lookup service", async () => {
  for (const invalid of ["1", "ana@example.com", "a".repeat(63), "../organizador", "8f9a1248-8cf1-4739-9d8a-e0d6a7847353"]) {
    assert.equal(await getPublicTicket(invalid), null);
  }
  assert.deepEqual(service.calls, []);
});

test("an unknown secret returns no data; lookup only submits the exact secret", async () => {
  assert.equal(await getPublicTicket(code), null);
  assert.deepEqual(service.calls, [{ name: "get_public_ticket", args: { p_code: code } }]);
});

test("each lookup refreshes the current ticket state including used and revoked", async () => {
  for (const status of ["valid", "used", "revoked"]) {
    service.data = { status, name: "Ana", email: "ana@example.com", ticketName: "General", issuedAt: "2099-11-15T00:00:00Z", event: { title: "Encuentro", date: "2099-11-15T22:00:00Z", venue: "Lima" } };
    assert.equal((await getPublicTicket(code)).status, status);
    assert.ok(ticketStatuses[status].label);
  }
  assert.equal(service.calls.length, 3);
});

test("service failures do not masquerade as a missing ticket or leak DB details", async () => {
  service.error = { message: "Private SQL detail" };
  await assert.rejects(() => getPublicTicket(code), { message: "Could not load ticket" });
});
