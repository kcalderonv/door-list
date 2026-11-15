import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
 if (specifier === "./dates" && context.parentURL?.endsWith("/lib/registration.ts")) return {url: new URL("../lib/dates.ts", import.meta.url).href, shortCircuit: true};
 return next(specifier, context);
}});
const { hasPublicRegistration, isUuid, limaDate, validateRegistration } = await import("../lib/registration.ts");

const ticketId = "8f9a1248-8cf1-4739-9d8a-e0d6a7847353";
function fields(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ticketTypeId: ticketId, name: "Ana Pérez", email: "ana@example.com", ...overrides })) data.set(key, value);
  return data;
}

test("normalizes name and email before registration", () => {
  const result = validateRegistration(fields({ name: "  Ana Pérez  ", email: "  ANA@Example.COM  " }));
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.fields, { ticketTypeId: ticketId, name: "Ana Pérez", email: "ana@example.com" });
});

test("requires a ticket UUID, a nonblank name and a valid email", () => {
  const result = validateRegistration(fields({ ticketTypeId: "other-event", name: " \t\n ", email: "not-an-email" }));
  assert.deepEqual(Object.keys(result.errors).sort(), ["email", "name", "ticketTypeId"]);
  assert.equal(isUuid(ticketId), true);
  assert.equal(isUuid(""), false);
});

test("rejects missing fields and file uploads masquerading as text", () => {
  assert.equal(Object.keys(validateRegistration(new FormData()).errors).length, 3);
  const data = fields();
  data.set("name", new Blob(["Ana"]), "name.txt");
  assert.ok(validateRegistration(data).errors.name);
});

test("enforces name and email bounds", () => {
  assert.ok(validateRegistration(fields({ name: "a".repeat(201) })).errors.name);
  assert.equal(validateRegistration(fields({ name: "a".repeat(200) })).errors.name, undefined);
  assert.ok(validateRegistration(fields({ email: "a".repeat(250) + "@example.com" })).errors.email);
  for (const email of ["a b@example.com", "a@@example.com", "a@example", "", "@example.com"]) {
    assert.ok(validateRegistration(fields({ email })).errors.email, email);
  }
});

test("uses Lima's calendar date even when UTC is already the next day", () => {
  assert.equal(limaDate("2026-11-15T04:59:59.999Z"), "2026-11-14");
  assert.equal(limaDate("2026-11-15T05:00:00.000Z"), "2026-11-15");
});

test("allows all of the event day, including after its start, and closes at Lima midnight", () => {
  const event = { status: "publicado", date: "2026-11-14T05:00:00Z" };
  assert.equal(hasPublicRegistration(event, new Date("2026-11-15T04:59:59.999Z")), true);
  assert.equal(hasPublicRegistration(event, new Date("2026-11-15T05:00:00Z")), false);
});

test("allows future published events and rejects drafts and past dates", () => {
  const now = new Date("2026-11-14T20:00:00Z");
  assert.equal(hasPublicRegistration({ status: "publicado", date: "2026-11-16T15:00:00Z" }, now), true);
  assert.equal(hasPublicRegistration({ status: "borrador", date: "2026-11-16T15:00:00Z" }, now), false);
  assert.equal(hasPublicRegistration({ status: "publicado", date: "2026-11-13T23:00:00Z" }, now), false);
});
