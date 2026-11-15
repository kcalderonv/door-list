/**
 * DESTRUCTIVE FIXTURES, TEST PROJECT ONLY. Obtain approval before running.
 * Required environment variables:
 * SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY,
 * SUPABASE_TEST_SERVICE_ROLE_KEY, ALLOW_REGISTRATION_DB_TESTS=1.
 * Apply all migrations first. Creates a temporary confirmed organizer account
 * and events; finally removes only their registrations, events and account.
 * No confirmation emails are sent. Never prints credentials or attendee data.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.ALLOW_REGISTRATION_DB_TESTS !== "1") throw new Error("Database tests require explicit approval and ALLOW_REGISTRATION_DB_TESTS=1");
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
if (!url || !key || !serviceKey) throw new Error("Set all three SUPABASE_TEST_* variables for a disposable test project");
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceKey, options);
const anon = createClient(url, key, options);
const organizer = createClient(url, key, options);
const fixtureIds = [];
let userId;
const tag = randomUUID();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const start = new Date(`${today}T00:00:00-05:00`);
const tomorrow = new Date(start.getTime() + 86400000).toISOString();
const yesterday = new Date(start.getTime() - 86400000).toISOString();
async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  assert.ifError(error);
  return data;
}
async function makeEvent(status, date, capacities = [1]) {
  const id = await rpc(organizer, "save_event", { p_id: null, p_title: `Registration test ${tag}`, p_description: "Temporary test fixture", p_date: date, p_venue: "Test", p_status: status, p_capacity: capacities.reduce((sum, n) => sum + n, 0) });
  fixtureIds.push(id);
  const tickets = [];
  for (const [index, capacity] of capacities.entries()) tickets.push(await rpc(organizer, "save_ticket_type", { p_id: null, p_event_id: id, p_name: `Entrada ${index}`, p_capacity: capacity }));
  return { id, tickets };
}
const register = (event, ticket, email = `${randomUUID()}@example.com`, name = "Prueba") => rpc(anon, "create_registration", { p_event_id: event, p_ticket_type_id: ticket, p_name: name, p_email: email });
const snapshot = id => rpc(anon, "get_public_event", { p_event_id: id });
const update = (id, status, date, capacity) => ({ p_id: id, p_title: `Registration test ${tag}`, p_description: "Temporary test fixture", p_date: date, p_venue: "Test", p_status: status, p_capacity: capacity });

try {
  const email = `door-list-test-${tag}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const login = await organizer.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);

  const event = await makeEvent("publicado", start.toISOString(), [1, 2]);
  const future = await makeEvent("publicado", tomorrow);
  const draft = await makeEvent("borrador", tomorrow);
  const past = await makeEvent("publicado", yesterday);
  const boundary = await makeEvent("publicado", `${today}T04:59:59.999Z`);
  assert.equal(await snapshot(draft.id), null);
  assert.equal(await snapshot(past.id), null);
  assert.equal(await snapshot(boundary.id), null, "UTC today's date is still yesterday in Lima before 05:00Z");
  assert.equal(await snapshot(randomUUID()), null);
  assert.ok(await snapshot(future.id));
  const initial = await snapshot(event.id);
  assert.equal(initial.remaining, 3, "the entire event day remains open after its start");
  assert.deepEqual(Object.keys(initial).sort(), ["date", "description", "id", "remaining", "tickets", "title", "venue"]);
  for (const ticket of initial.tickets) assert.deepEqual(Object.keys(ticket).sort(), ["id", "name", "remaining"]);
  for (const closed of [draft, past, boundary]) assert.equal((await register(closed.id, closed.tickets[0])).code, "EVENT_UNAVAILABLE");
  assert.equal((await register(randomUUID(), event.tickets[0])).code, "EVENT_UNAVAILABLE");
  assert.equal((await register(event.id, future.tickets[0])).code, "INVALID_TICKET_TYPE");
  assert.equal((await register(event.id, event.tickets[0], "invalid-email")).code, "VALIDATION_ERROR");
  assert.equal((await register(event.id, event.tickets[0], "valid@example.com", " \t ")).code, "VALIDATION_ERROR");

  const racers = [`first-${tag}@example.com`, `second-${tag}@example.com`];
  const results = await Promise.all(racers.map(address => register(event.id, event.tickets[0], address)));
  assert.equal(results.filter(result => result.code === "CREATED").length, 1);
  assert.equal(results.filter(result => result.code === "SOLD_OUT").length, 1);
  const winner = racers[results.findIndex(result => result.code === "CREATED")];
  const issued = results.find(result => result.code === "CREATED");
  assert.match(issued.ticket_code, /^[a-f0-9]{64}$/);
  const duplicate = await register(event.id, event.tickets[0], `  ${winner.toUpperCase()}  `);
  assert.equal(duplicate.code, "ALREADY_REGISTERED");
  assert.equal(duplicate.ticket_code, undefined, "an email is not proof of possession of an entry");
  assert.equal((await register(event.id, event.tickets[1], winner)).code, "ALREADY_REGISTERED");
  const more = await Promise.all(Array.from({ length: 3 }, () => register(event.id, event.tickets[1])));
  assert.equal(more.filter(result => result.code === "CREATED").length, 2);
  assert.equal(more.filter(result => result.code === "SOLD_OUT").length, 1);
  assert.equal((await snapshot(event.id)).remaining, 0);
  const count = await admin.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id);
  assert.ifError(count.error);
  assert.equal(count.count, 3);

  const issuedTickets = [issued, ...more.filter(result => result.code === "CREATED")];
  assert.equal(new Set(issuedTickets.map(ticket => ticket.ticket_code)).size, 3);
  const rows = await admin.from("tickets").select("*").in("registration_id", issuedTickets.map(ticket => ticket.registration_id));
  assert.ifError(rows.error);
  assert.equal(rows.data.length, 3);
  assert.deepEqual(Object.keys(rows.data[0]).sort(), ["code_hash", "created_at", "registration_id", "status"]);
  const row = rows.data.find(ticket => ticket.registration_id === issued.registration_id);
  assert.equal(row.code_hash, `\\x${createHash("sha256").update(issued.ticket_code).digest("hex")}`);
  assert.equal(row.status, "valid");
  const lookup = code => rpc(anon, "get_public_ticket", { p_code: code });
  const view = await lookup(issued.ticket_code);
  assert.equal(view.email, winner);
  assert.equal(view.status, "valid");
  assert.deepEqual(Object.keys(view).sort(), ["email", "event", "issuedAt", "name", "status", "ticketName"]);
  for (const badCode of [null, "", "1", issued.registration_id, winner, issued.ticket_code.slice(0, -1), issued.ticket_code.toUpperCase(), `${issued.ticket_code}\n`, randomBytes(32).toString("hex")]) {
    assert.equal(await lookup(badCode), null);
  }
  // Constraints are checked by the database, independent of application code.
  assert.equal((await admin.from("tickets").insert({ registration_id: row.registration_id, code_hash: `\\x${randomBytes(32).toString("hex")}` })).error?.code, "23505");
  assert.equal((await admin.from("tickets").update({ code_hash: row.code_hash }).eq("registration_id", issuedTickets[1].registration_id)).error?.code, "23505");
  assert.equal((await admin.from("tickets").update({ status: "invalid" }).eq("registration_id", row.registration_id)).error?.code, "23514");
  for (const status of ["used", "revoked"]) {
    assert.ifError((await admin.from("tickets").update({ status }).eq("registration_id", row.registration_id)).error);
    assert.equal((await lookup(issued.ticket_code)).status, status);
  }

  const sameEmailEvent = await makeEvent("publicado", tomorrow, [2]);
  const sameEmail = `retry-${tag}@example.com`;
  const retries = await Promise.all(Array.from({ length: 2 }, () => register(sameEmailEvent.id, sameEmailEvent.tickets[0], sameEmail)));
  assert.deepEqual(retries.map(result => result.code).sort(), ["ALREADY_REGISTERED", "CREATED"]);
  const retryCount = await admin.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", sameEmailEvent.id);
  assert.ifError(retryCount.error);
  assert.equal(retryCount.count, 1);

  for (const client of [anon, organizer]) {
    assert.ok((await client.from("tickets").select("*")).error, "tickets cannot be enumerated directly");
    assert.ok((await client.from("tickets").insert({ registration_id: row.registration_id, code_hash: row.code_hash })).error);
    assert.ok((await client.from("tickets").update({ status: "valid" }).eq("registration_id", row.registration_id)).error);
    assert.ok((await client.from("tickets").delete().eq("registration_id", row.registration_id)).error);
    assert.ok((await client.from("registrations").select("id")).error, "personal data cannot be read directly");
    assert.ok((await client.from("registrations").insert({ event_id: event.id, ticket_type_id: event.tickets[0], name: "Bypass", email: "bypass@example.com" })).error);
    assert.ok((await client.from("registrations").update({ name: "Bypass" }).eq("event_id", event.id)).error);
    assert.ok((await client.from("registrations").delete().eq("event_id", event.id)).error);
  }
  const lowerTicket = await organizer.rpc("save_ticket_type", { p_id: event.tickets[1], p_event_id: event.id, p_name: "Entrada 1", p_capacity: 1 });
  assert.ok(lowerTicket.error?.message.includes("personas registradas"));
  assert.ok((await organizer.rpc("save_event", update(event.id, "publicado", start.toISOString(), 2))).error?.message.includes("personas registradas"));
  assert.equal((await organizer.from("ticket_types").delete().eq("id", event.tickets[0])).error?.code, "23503");
  assert.equal((await organizer.from("events").delete().eq("id", event.id)).error?.code, "23503");
  await rpc(organizer, "save_event", update(event.id, "borrador", start.toISOString(), 3));
  assert.equal(await snapshot(event.id), null);
  assert.equal((await register(event.id, event.tickets[1])).code, "EVENT_UNAVAILABLE");

  assert.ok(await snapshot(future.id));
  await rpc(organizer, "save_event", update(future.id, "publicado", yesterday, 1));
  assert.equal((await register(future.id, future.tickets[0])).code, "EVENT_UNAVAILABLE", "date changed after page load");
  await rpc(organizer, "save_event", update(future.id, "publicado", tomorrow, 1));
  assert.ifError((await organizer.from("ticket_types").delete().eq("id", future.tickets[0])).error);
  assert.equal((await register(future.id, future.tickets[0])).code, "INVALID_TICKET_TYPE");
  console.log("PASS: eligibility, capacity, atomic ticket issuance, unique secrets, duplicates, status, privacy and organizer protections");
} finally {
  // Restricted to identifiers created by this invocation, including on failure.
  if (fixtureIds.length) {
    const registrations = await admin.from("registrations").delete().in("event_id", fixtureIds);
    const events = registrations.error ? null : await admin.from("events").delete().in("id", fixtureIds);
    if (registrations.error || events?.error) throw new Error("Test cleanup failed; remove this run's fixtures from the test project");
  }
  if (userId) assert.ifError((await admin.auth.admin.deleteUser(userId)).error);
}
