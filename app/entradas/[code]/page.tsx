import { formatEventDate } from "@/lib/dates";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isTicketCode, ticketPath, ticketStatuses } from "@/lib/tickets";
import TicketQr from "./ticket-qr";
import { getPublicTicket } from "@/lib/public-ticket";
import CopyTicketLink from "./copy-ticket-link";
import "./ticket.css";

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  if (!isTicketCode(code)) notFound();
  const ticket = await getPublicTicket(code);
  if (!ticket) notFound();
  const status = ticketStatuses[ticket.status];

  return <section className="issued-ticket registration-panel public-issued-ticket" aria-labelledby="ticket-title">
    <p className="eyebrow">Tu entrada personal</p>
    <h1 id="ticket-title">{ticket.event.title}</h1>
    <p className="status" data-ticket-state={ticket.status}>Estado: {status.label}</p>
    <p className="registration-note">{status.description}</p>
    {ticket.status === "valid" ? <figure className="ticket-qr">
      <TicketQr code={code} />
      <figcaption>Código de tu entrada</figcaption>
      <code className="ticket-code">{code}</code>
    </figure> : <p className="registration-note">Si crees que este estado es incorrecto, contacta al organizador del evento.</p>}
    <dl className="registration-facts">
      <div><dt>Asistente</dt><dd>{ticket.name}</dd></div>
      <div><dt>Correo electrónico</dt><dd>{ticket.email}</dd></div>
      <div><dt>Tipo de entrada</dt><dd>{ticket.ticketName}</dd></div>
      <div><dt>Fecha y hora</dt><dd>{formatEventDate(ticket.event.date)}<small>Hora de Lima</small></dd></div>
      <div><dt>Lugar</dt><dd>{ticket.event.venue}</dd></div>
    </dl>
    <p className="registration-note">Este enlace es privado: quien lo tenga podrá ver tus datos y, si la entrada es válida, tu QR. Copia el enlace y guárdalo en un lugar privado. Evita compartirlo.</p>
    <div className="ticket-actions">
      <CopyTicketLink path={ticketPath(code)} />
      <a className="ticket-refresh" href={ticketPath(code)}>Actualizar estado</a>
    </div>
    <p className="registration-note">El estado se consulta al abrir o actualizar esta página. Escanear el QR no marca la entrada como utilizada.</p>
  </section>;
}
