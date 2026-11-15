import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, afterEach, beforeEach, mock, test } from "node:test";

const smtp = { options: [], messages: [], fail: false, accepted: true, closed: 0 };
globalThis.__mailAdapterTest = smtp;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    if (specifier === "nodemailer") return { url: "test:nodemailer", shortCircuit: true };
    if (specifier === "./public-ticket" && context.parentURL?.endsWith("/registration-email.ts")) return { url: "test:confirmed-ticket", shortCircuit: true };
    if (["./mail-config", "./tickets", "./registration"].includes(specifier) && context.parentURL?.endsWith("/registration-email.ts")) return { url: new URL(`../app/lib/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    if (url === "test:confirmed-ticket") return { format: "module", source: "export async function getPublicTicket() { return globalThis.__mailAdapterTest.ticket; }", shortCircuit: true };
    if (url === "test:nodemailer") return {
      format: "module", shortCircuit: true,
      source: `export default { createTransport(options) {
        const smtp = globalThis.__mailAdapterTest;
        smtp.options.push(options);
        return { async sendMail(message) {
          smtp.messages.push(message);
          if (smtp.fail) throw new Error("SMTP secret failure must not leak");
          return { accepted: smtp.accepted ? [message.to.address] : [] };
        }, close() { smtp.closed++; } };
      } };`,
    };
    return next(url, context);
  },
});
const { sendRegistrationEmail } = await import("../app/lib/registration-email.ts");
const keys = ["MAIL_ENABLED", "MAIL_TRANSPORT", "MAIL_FROM_ADDRESS", "MAIL_FROM_NAME", "APP_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_REQUIRE_TLS", "SMTP_USER", "SMTP_PASSWORD"];
const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const code = "a1".repeat(32);
const ticket = { status: "valid", name: 'Ana <script>alert("test")</script>', email: "ana@example.com", ticketName: 'General & "Preferente"', issuedAt: "2099-11-14T20:00:00Z", event: { title: 'Encuentro <amigos> & familia', date: "2099-11-14T22:00:00Z", venue: 'Casa de encuentros <Lima>' } };
beforeEach(() => {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { MAIL_ENABLED: "true", MAIL_TRANSPORT: "smtp", MAIL_FROM_ADDRESS: "entradas@example.com", APP_URL: "https://events.example.com", SMTP_HOST: "localhost", SMTP_PORT: "25" });
  smtp.options = []; smtp.messages = []; smtp.closed = 0; smtp.fail = false; smtp.accepted = true;
  smtp.ticket = structuredClone(ticket);
  mock.method(console, "error", () => {});
});
afterEach(() => { mock.restoreAll(); });
after(() => {
  hooks.deregister(); delete globalThis.__mailAdapterTest;
  for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
});

test("confirmation email has escaped content, a private link and a local PNG QR", async () => {
  assert.equal(await sendRegistrationEmail(code), "sent");
  assert.equal(smtp.messages.length, 1);
  const message = smtp.messages[0];
  assert.deepEqual(message.to, { name: ticket.name, address: ticket.email });
  assert.ok(message.text.includes(`https://events.example.com/entradas/${code}`));
  assert.ok(message.html.includes(`href="https://events.example.com/entradas/${code}"`));
  assert.ok(message.text.includes(ticket.event.title));
  assert.ok(message.text.includes(ticket.event.venue));
  const eventDate = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "full", timeStyle: "short" }).format(new Date(ticket.event.date));
  assert.ok(message.text.includes(`${eventDate} (hora de Lima)`));
  assert.ok(message.html.includes(eventDate));
  assert.ok(message.html.includes("Encuentro &lt;amigos&gt; &amp; familia"));
  assert.ok(message.html.includes("Casa de encuentros &lt;Lima&gt;"));
  assert.ok(!message.html.includes("<script>"));
  assert.ok(message.html.includes("&lt;script&gt;"));
  assert.ok(message.html.includes("General &amp; &quot;Preferente&quot;"));
  assert.ok(message.html.includes('src="cid:ticket-qr"'));
  assert.equal(message.attachments[0].cid, "ticket-qr");
  assert.equal(message.attachments[0].content.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(smtp.options[0].disableUrlAccess, true);
  assert.equal(smtp.options[0].disableFileAccess, true);
  assert.equal(smtp.closed, 1);
});

test("disabled mail or invalid configuration never contacts SMTP", async () => {
  process.env.MAIL_ENABLED = "false";
  assert.equal(await sendRegistrationEmail(code), "disabled");
  process.env.MAIL_ENABLED = "true";
  process.env.MAIL_FROM_ADDRESS = "";
  assert.equal(await sendRegistrationEmail(code), "failed");
  assert.equal(smtp.options.length, 0);
});

test("invalid ticket secrets and recipient header injection never contact SMTP", async () => {
  assert.equal(await sendRegistrationEmail("123"), "failed");
  smtp.ticket.email = "ana@example.com\r\nBcc:other@example.com";
  assert.equal(await sendRegistrationEmail(code), "failed");
  assert.equal(smtp.options.length, 0);
});

test("missing or revoked tickets are never emailed", async () => {
  smtp.ticket = null;
  assert.equal(await sendRegistrationEmail(code), "failed");
  smtp.ticket = { ...ticket, status: "revoked" };
  assert.equal(await sendRegistrationEmail(code), "failed");
  assert.equal(smtp.options.length, 0);
});

test("SMTP failure preserves privacy and closes the transport", async () => {
  smtp.fail = true;
  assert.equal(await sendRegistrationEmail(code), "failed");
  assert.equal(smtp.closed, 1);
  const output = console.error.mock.calls.flatMap(call => call.arguments).join(" ");
  for (const secret of [ticket.email, code, "SMTP secret failure"]) assert.ok(!output.includes(secret));
});

test("SMTP rejection is not reported as a sent email", async () => {
  smtp.accepted = false;
  assert.equal(await sendRegistrationEmail(code), "failed");
});
