import "server-only";
import { formatEventDate } from "./dates";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { mailConfig } from "./mail-config";
import { isTicketCode, ticketPath } from "./tickets";
import { getPublicTicket } from "./public-ticket";

import type { EmailDelivery } from "./contracts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function sendRegistrationEmail(code: string): Promise<EmailDelivery> {
  try {
    const config = mailConfig();
    if (!config) return "disabled";
    if (!isTicketCode(code)) throw new Error("Invalid ticket code");
    // Read the recipient and event from the confirmed entry, never from
    // browser-provided titles, dates, venues or an arbitrary recipient.
    const ticket = await getPublicTicket(code);
    if (!ticket || ticket.status !== "valid" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(ticket.email)) throw new Error("Invalid ticket email");
    const date = formatEventDate(ticket.event.date);
    const url = new URL(ticketPath(code), config.origin).href;
    const qr = await QRCode.toBuffer(code, { type: "png", errorCorrectionLevel: "M", margin: 4, width: 320 });
    const transporter = nodemailer.createTransport(config.smtp);
    try {
      const result = await transporter.sendMail({
        from: config.from,
        to: { name: ticket.name, address: ticket.email },
        subject: `Tu entrada para ${ticket.event.title.replace(/[\r\n]+/g, " ").slice(0, 200)} | Door List`,
        text: `Hola ${ticket.name},\n\nTu registro está confirmado.\nEvento: ${ticket.event.title}\nFecha y hora: ${date} (hora de Lima)\nLugar: ${ticket.event.venue}\nEntrada: ${ticket.ticketName}\n\nPresenta el QR adjunto al ingresar. El estado válido se comprueba al momento del ingreso.\n\nPuedes consultar el estado actual de tu entrada en:\n${url}\n\nGuarda este enlace privado y evita compartirlo.\n\nDoor List`,
        html: `<div lang="es" style="font-family:Arial,sans-serif;color:#102447;max-width:560px;margin:auto;line-height:1.6"><h1>Tu entrada está confirmada</h1><p>Hola ${escapeHtml(ticket.name)},</p><h2>${escapeHtml(ticket.event.title)}</h2><p><strong>Fecha y hora:</strong> ${escapeHtml(date)} (hora de Lima)</p><p><strong>Lugar:</strong> ${escapeHtml(ticket.event.venue)}</p><p><strong>Entrada:</strong> ${escapeHtml(ticket.ticketName)}</p><p>Presenta este QR al ingresar. El estado válido se comprueba al momento del ingreso.</p><img src="cid:ticket-qr" width="280" height="280" alt="Código QR de tu entrada" style="display:block;max-width:100%;height:auto"><p><a href="${escapeHtml(url)}">Consultar el estado actual de mi entrada</a></p><p>Si el enlace no abre, copia esta dirección en tu navegador:</p><p style="overflow-wrap:anywhere">${escapeHtml(url)}</p><p>Guarda este enlace privado y evita compartirlo.</p><p>Door List</p></div>`,
        attachments: [{ filename: "entrada-qr.png", content: qr, contentType: "image/png", cid: "ticket-qr", contentDisposition: "inline" }],
      });
      return result.accepted?.length > 0 ? "sent" : "failed";
    } finally {
      transporter.close();
    }
  } catch {
    // SMTP errors can contain credentials, recipients or the private ticket URL.
    // Keep those details out of the console, client state and error telemetry.
    console.error("[registration-email] No se pudo enviar el correo de confirmación.");
    return "failed";
  }
}
