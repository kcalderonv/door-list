// Explicit SMTP validation against Mailtrap Sandbox only. Never reads or writes
// the database. --send sends one clearly labelled email with a synthetic QR.
import { randomBytes } from "node:crypto";
import { registerHooks } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import nodemailer from "nodemailer";
import { mailConfig } from "../lib/mail-config.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
nextEnv.loadEnvConfig(root, true, { info() {}, error() {} });
process.env.NODE_ENV = "development";

const fixture = {
  status: "valid", name: "Validación de Mailtrap", email: "prueba@example.com", ticketName: "Entrada de prueba (sin reserva)",
  issuedAt: new Date().toISOString(),
  event: { title: "PRUEBA SMTP — Door List", date: "2099-11-15T23:00:00Z", venue: "Lugar de prueba, Lima" },
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "test:server-only", shortCircuit: true };
    if (context.parentURL?.endsWith("/registration-email.ts")) {
      if (specifier === "./public-ticket") return { url: "test:mailtrap-fixture", shortCircuit: true };
      if (["./mail-config", "./tickets", "./registration", "./dates"].includes(specifier)) return { url: new URL(`../lib/${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === "test:server-only") return { format: "module", source: "", shortCircuit: true };
    if (url === "test:mailtrap-fixture") return { format: "module", source: `export async function getPublicTicket() { return ${JSON.stringify(fixture)}; }`, shortCircuit: true };
    return next(url, context);
  },
});

try {
  const config = mailConfig();
  if (!config) throw new Error("MAIL_DISABLED");
  if (process.env.MAIL_TRANSPORT === "smtp" || config.smtp.host !== "sandbox.smtp.mailtrap.io") throw new Error("SANDBOX_ONLY");
  const transporter = nodemailer.createTransport(config.smtp);
  try {
    await transporter.verify();
    console.log("PASS: Mailtrap Sandbox connection, TLS and authentication.");
  } finally {
    transporter.close();
  }
  if (process.argv.includes("--send")) {
    const { sendRegistrationEmail } = await import("../lib/registration-email.ts");
    const delivery = await sendRegistrationEmail(randomBytes(32).toString("hex"));
    if (delivery !== "sent") throw new Error("DELIVERY_FAILED");
    console.log('PASS: Mailtrap accepted "PRUEBA SMTP — Door List", including event, Lima date/time, venue and embedded PNG QR. No reservation was created.');
  }
} catch (error) {
  // SMTP errors can include secrets and message contents; report only a safe
  // category plus the numeric SMTP status, never the raw response or stack.
  const categories = {
    EAUTH: "Mailtrap rejected the SMTP credentials.",
    ETIMEDOUT: "SMTP connection timed out.",
    ESOCKET: "SMTP connection or TLS failed.",
    EDNS: "SMTP hostname could not be resolved.",
    ECONNECTION: "SMTP connection failed.",
    ECONNREFUSED: "SMTP connection was refused.",
    MAIL_DISABLED: "Set MAIL_ENABLED=true before validating.",
    SANDBOX_ONLY: "This script only supports Mailtrap Sandbox.",
    DELIVERY_FAILED: "Mailtrap did not accept the test email; check the mail configuration.",
  };
  const code = error?.code || error?.message;
  console.error(categories[code] || "Mailtrap validation failed; check SMTP and sender configuration.");
  if (Number.isInteger(error?.responseCode)) console.error("SMTP status:", error.responseCode);
  process.exitCode = 1;
} finally {
  hooks.deregister();
}
