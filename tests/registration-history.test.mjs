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
const { registrationHistoryResponse } = await import("../lib/registration-history-service.ts");
const { fetchRegistrationHistory } = await import("../lib/registration-history-client.ts");
const { formatRegistrationDay } = await import("../lib/dates.ts");
const originalFetch = globalThis.fetch;
after(() => { hooks.deregister(); globalThis.fetch = originalFetch; });
const eventId = "123e4567-e89b-42d3-a456-426614174000";
const request = () => new Request("https://example.test", { headers: { Authorization: "Bearer session-token" } });

test("invalid IDs and anonymous requests never reach the provider", async () => {
  const noClient = () => assert.fail("Provider must not be called");
  assert.equal((await registrationHistoryResponse(request(), "invalid", noClient)).status, 404);
  assert.equal((await registrationHistoryResponse(new Request("https://example.test"), eventId, noClient)).status, 401);
});

test("expired sessions cannot query aggregates", async () => {
  const client = {
    auth: { async getUser(token) { assert.equal(token, "session-token"); return { data: { user: null }, error: {} }; } },
    rpc() { assert.fail("Unauthenticated RPC"); },
  };
  assert.equal((await registrationHistoryResponse(request(), eventId, () => client)).status, 401);
});

test("owner aggregate preserves zero days and uses private cache headers", async () => {
  const history = { eventId, publishedAt: "2026-11-14T20:00:00Z", publicationDateEstimated: false,
    isPublished: true, timeZone: "America/Lima", days: [
      { date: "2026-11-14", registrationCount: 0 }, { date: "2026-11-15", registrationCount: 3 },
    ] };
  const client = { auth: { async getUser() { return { data: { user: { id: "owner" } }, error: null }; } },
    async rpc(name, args) {
      assert.equal(name, "get_organizer_registration_history");
      assert.deepEqual(args, { p_event_id: eventId });
      return { data: history, error: null };
    } };
  const response = await registrationHistoryResponse(request(), eventId, token => {
    assert.equal(token, "session-token"); return client;
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Authorization");
  assert.deepEqual(await response.json(), history);
});

test("unavailable events and provider failures return controlled JSON errors", async () => {
  for (const [result, status] of [[{ data: null, error: null }, 404], [{ data: null, error: { message: "secret SQL" } }, 500]]) {
    const client = { auth: { async getUser() { return { data: { user: { id: "owner" } }, error: null }; } }, async rpc() { return result; } };
    const response = await registrationHistoryResponse(request(), eventId, () => client);
    assert.equal(response.status, status);
    const body = await response.json();
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.ok(!body.error.includes("SQL"));
  }
});

test("client checks HTTP status without parsing provider errors", async () => {
  for (const status of [401, 404, 500]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `/api/eventos/${eventId}/registros-por-dia`);
      assert.equal(options.headers.Authorization, "Bearer token");
      return { ok: false, status, json() { assert.fail("Error body must not be parsed"); } };
    };
    await assert.rejects(fetchRegistrationHistory(eventId, "token"));
  }
  globalThis.fetch = originalFetch;
});

test("date-only labels keep their Lima calendar day", () => {
  assert.match(formatRegistrationDay("2026-11-15"), /15.*2026/);
});
