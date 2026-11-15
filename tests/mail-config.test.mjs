import assert from "node:assert/strict";
import { test } from "node:test";
import { mailConfig } from "../app/lib/mail-config.ts";

const sender = { MAIL_ENABLED: "true", MAIL_FROM_ADDRESS: "entradas@example.com", MAIL_FROM_NAME: "Door List" };
const sandbox = { ...sender, MAILTRAP_SMTP_USER: "sandbox-user", MAILTRAP_SMTP_PASSWORD: "sandbox-password" };

test("email stays disabled until explicitly enabled", () => {
  assert.equal(mailConfig({}), null);
  assert.equal(mailConfig({ MAIL_ENABLED: "false" }), null);
});

test("development selects Mailtrap sandbox with TLS and private credentials", () => {
  const config = mailConfig({ ...sandbox, NODE_ENV: "development" });
  assert.equal(config.origin, "http://localhost:3000");
  assert.equal(config.smtp.host, "sandbox.smtp.mailtrap.io");
  assert.equal(config.smtp.port, 2525);
  assert.equal(config.smtp.secure, false);
  assert.equal(config.smtp.requireTLS, true);
  assert.deepEqual(config.smtp.auth, { user: "sandbox-user", pass: "sandbox-password" });
});

test("production selects localhost SMTP without borrowing Mailtrap credentials", () => {
  const config = mailConfig({ ...sandbox, NODE_ENV: "production", APP_URL: "https://events.example.com" });
  assert.equal(config.smtp.host, "localhost");
  assert.equal(config.smtp.port, 25);
  assert.equal(config.smtp.requireTLS, false);
  assert.equal(config.smtp.auth, undefined);
  assert.equal(config.origin, "https://events.example.com");
});

test("transport and SMTP options can be overridden for a hosted relay or sandbox", () => {
  const config = mailConfig({ ...sandbox, MAIL_TRANSPORT: "smtp", SMTP_HOST: "smtp.example.com", SMTP_PORT: "465", SMTP_SECURE: "true", SMTP_USER: "production-user", SMTP_PASSWORD: "production-password", SMTP_REQUIRE_TLS: "false" });
  assert.equal(config.smtp.host, "smtp.example.com");
  assert.equal(config.smtp.secure, true);
  assert.deepEqual(config.smtp.auth, { user: "production-user", pass: "production-password" });
  assert.equal(mailConfig({ ...sandbox, NODE_ENV: "production", MAIL_TRANSPORT: "mailtrap", APP_URL: "https://staging.example.com" }).smtp.host, "sandbox.smtp.mailtrap.io");
});

test("incomplete credentials, invalid senders and unsafe origins fail before connecting", () => {
  for (const overrides of [
    { MAIL_TRANSPORT: "unknown" }, { MAIL_ENABLED: "yes" },
    { MAILTRAP_SMTP_PASSWORD: "" }, { MAILTRAP_SMTP_PORT: "0" }, { MAILTRAP_SMTP_PORT: "65536" }, { MAILTRAP_SMTP_PORT: "25.5" },
    { MAILTRAP_SMTP_SECURE: "yes" }, { MAIL_FROM_ADDRESS: "invalid" }, { MAIL_FROM_NAME: "Door\r\nBcc: other@example.com" },
    { APP_URL: "javascript:alert(1)" }, { APP_URL: "https://user:pass@example.com" }, { APP_URL: "https://example.com/path" }, { APP_URL: "https://example.com/?secret=true" },
    { NODE_ENV: "production" }, { NODE_ENV: "production", APP_URL: "http://example.com" },
  ]) assert.throws(() => mailConfig({ ...sandbox, ...overrides }));
});
