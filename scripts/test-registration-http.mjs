// Offline rendering checks against an existing build. Uses an in-memory HTTP
// stub and blocks all other outbound fetches, never contacting a database.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { delimiter, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const id = "8f9a1248-8cf1-4739-9d8a-e0d6a7847353";
const ticketId = "976722c2-e5d2-4a2a-8207-7c571b9fab3c";
const issuedCode = "a1".repeat(32);
let issuedTicket = { status: "valid", name: "Ana de prueba", email: "ana@example.com", ticketName: "General", issuedAt: "2099-11-14T20:00:00Z", event: { title: "Encuentro de prueba", date: "2099-11-14T22:00:00Z", venue: "Casa de encuentros" } };
let ticketReads = 0;
let event = { id, title: "Encuentro de prueba", description: "Una tarde para compartir.", date: "2099-11-14T22:00:00Z", venue: "Casa de encuentros", remaining: 1, tickets: [{ id: ticketId, name: "General", remaining: 1 }, { id: "83c90473-5358-49ea-be46-d6fab9ea29d4", name: "Preferente", remaining: 0 }] };
let reads = 0;
let requests = 0;
const listen = server => new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const stub = createServer(async (request, response) => {
  requests++;
  assert.ok(["/rest/v1/rpc/get_public_event", "/rest/v1/rpc/get_public_ticket"].includes(request.url));
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const args = JSON.parse(Buffer.concat(chunks).toString());
  if (request.url === "/rest/v1/rpc/get_public_ticket") {
    ticketReads++;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(args.p_code === issuedCode ? issuedTicket : null));
    return;
  }
  assert.equal(args.p_event_id, id);
  reads++;
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(event));
});
const stubPort = await listen(stub);
const reservation = createServer();
const appPort = await listen(reservation);
await new Promise(resolve => reservation.close(resolve));
const serverSource = `
  import next from 'next';
  import { createServer } from 'node:http';
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (['/rest/v1/rpc/get_public_event', '/rest/v1/rpc/get_public_ticket'].includes(target.pathname)) return nativeFetch(new URL(target.pathname, process.env.REGISTRATION_STUB_ORIGIN), init);
    throw new Error('Outbound request blocked by offline rendering test');
  };
  const app = next({ dev: false, hostname: '127.0.0.1', port: Number(process.env.REGISTRATION_TEST_PORT) });
  await app.prepare();
  const server = createServer(app.getRequestHandler());
  server.listen(Number(process.env.REGISTRATION_TEST_PORT), '127.0.0.1', () => console.log('Ready in test server'));
`;
const child = spawn(process.execPath, ["--input-type=module", "-e", serverSource], {
  cwd: root, windowsHide: true,
  env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", DATABASE_URL: "", REGISTRATION_TEST_PORT: String(appPort), REGISTRATION_STUB_ORIGIN: `http://127.0.0.1:${stubPort}`, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}` },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", chunk => { logs += chunk.toString(); });
child.stderr.on("data", chunk => { logs += chunk.toString(); });
const exited = new Promise(resolve => child.once("exit", resolve));
const origin = `http://127.0.0.1:${appPort}`;
try {
  await Promise.race([
    (async () => {
      for (let attempt = 0; attempt < 120; attempt++) {
        if (child.exitCode !== null) throw new Error("Next.js exited before becoming ready");
        if (logs.includes("Ready in")) return;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      throw new Error("Next.js startup timed out");
    })(),
    exited.then(() => { throw new Error("Next.js stopped unexpectedly"); }),
  ]);
  const page = await fetch(`${origin}/eventos/${id}/registro`);
  const html = await page.text();
  assert.equal(page.status, 200);
  for (const content of ["Encuentro de prueba", "Casa de encuentros", "Hora de Lima", "Confirmar registro", 'name="name"', 'name="email"', 'name="ticketTypeId"']) assert.ok(html.includes(content), content);
  assert.match(html, /<input[^>]*type="radio"[^>]*disabled=""/);
  assert.ok(html.includes("1 entrada disponible"));
  assert.ok(html.includes("Agotada"));
  assert.ok(!html.includes("Iniciar sesión"));
  const count = reads;
  await (await fetch(`${origin}/eventos/invalid-id/registro`)).text();
  assert.equal(reads, count, "invalid UUIDs must not query the service");
  event = { ...event, remaining: 0, tickets: event.tickets.map(ticket => ({ ...ticket, remaining: 0 })) };
  const full = await (await fetch(`${origin}/eventos/${id}/registro`)).text();
  assert.ok(full.includes("No hay entradas disponibles"));
  assert.match(full, /<fieldset disabled="">/);
  assert.ok(reads > count, "availability must not be persistently cached");
  event = null;
  const closed = await (await fetch(`${origin}/eventos/${id}/registro`)).text();
  assert.ok(closed.includes("Evento no disponible para registros"));
  assert.ok(!closed.includes('name="email"'));
  for (const [status, label] of [["valid", "Válida"], ["used", "Utilizada"], ["revoked", "Revocada"]]) {
    issuedTicket = { ...issuedTicket, status };
    const response = await fetch(`${origin}/entradas/${issuedCode}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    const content = await response.text();
    for (const value of [label, "Ana de prueba", "ana@example.com", "General", "Casa de encuentros", issuedCode, '<svg role="img"', 'shape-rendering="crispEdges"', "Actualizar estado"]) assert.ok(content.includes(value), value);
    assert.ok(!/https?:[^"<>]*[?&](?:data|text)=/.test(content), "QR must not use an external service");
  }
  const previousTicketReads = ticketReads;
  const invalid = await fetch(`${origin}/entradas/123`);
  assert.equal(invalid.status, 404);
  assert.ok((await invalid.text()).includes("Entrada no encontrada"));
  assert.equal(ticketReads, previousTicketReads, "enumerable IDs must not query the service");
  const missing = await fetch(`${origin}/entradas/${"b2".repeat(32)}`);
  assert.equal(missing.status, 404);
  assert.ok((await missing.text()).includes("Entrada no encontrada"));
  assert.equal(requests, reads + ticketReads, "only fake read RPCs were contacted");
  console.log("PASS: registration availability, ticket data/QR, all states, invalid secrets, privacy headers and fresh reads; no database accessed");
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  child.kill();
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
  stub.closeAllConnections();
  await new Promise(resolve => stub.close(resolve));
}
