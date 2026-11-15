"use client";

import { useEffect, useState } from "react";
import type { OrganizerAttendance } from "@/lib/contracts";
import { formatEventDate } from "@/lib/dates";
import { attendanceSales, soldAttendees } from "@/lib/attendance";
import { loadOrganizerAttendance, supabase } from "@/lib/supabase/organizer";
import { ticketStatuses } from "@/lib/tickets";

// Browser session authentication and refresh controls require client execution.
export default function EventAttendance({ eventId }: { eventId: string }) {
  const [details, setDetails] = useState<OrganizerAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return;
    void loadOrganizerAttendance(supabase, eventId).then(data => {
      if (cancelled) return;
      setDetails(data);
      setError(data ? "" : "Evento no disponible. Solo el dueño puede consultar sus registros.");
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError("No se pudieron cargar los registros. Inténtalo nuevamente.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [eventId, revision]);

  function refresh() {
    setError("");
    setLoading(true);
    setRevision(value => value + 1);
  }

  const currentDetails = details?.eventId === eventId ? details : null;
  const attendees = currentDetails ? soldAttendees(currentDetails.attendees) : [];
  const sales = currentDetails ? attendanceSales(currentDetails) : [];

  return <section className="event-attendance" aria-labelledby="attendance-title">
    <div className="section-heading">
      <h3 id="attendance-title">Ventas y disponibilidad</h3>
      <button className="secondary" disabled={loading} onClick={refresh}>Actualizar registros</button>
    </div>
    {loading && <p role="status">Cargando registros…</p>}
    {error && <p className="notice error-notice" role="alert">{error}</p>}
    <div aria-busy={loading}>
    {currentDetails && <>
      <p className="attendance-total"><strong>{attendees.length} / {currentDetails.maxCapacity}</strong> entradas vendidas en el evento</p>
      {sales.length === 0 ? <p className="ticket-empty">Este evento aún no tiene tipos de entrada.</p> : <ul className="attendance-types">
        {sales.map(ticketType => <li key={ticketType.id}>
          <div><strong>{ticketType.name}</strong><span>{ticketType.sold} / {ticketType.maxCapacity ?? "sin límite"} vendidas</span>
            {ticketType.remaining !== null && <span>{ticketType.remaining === 0 ? "Cupo completo" : `Faltan ${ticketType.remaining} por vender`}</span>}
          </div>
          {ticketType.maxCapacity !== null && <progress value={Math.min(ticketType.sold, ticketType.maxCapacity)} max={Math.max(1, ticketType.maxCapacity)} aria-label={`Entradas vendidas de ${ticketType.name}`} />}
        </li>)}
      </ul>}
      <div className="section-heading">
        <h3>Asistentes <span className="count">{attendees.length}</span></h3>
      </div>
      <p className="field-help">La lista incluye entradas válidas o utilizadas. El código de puerta identifica el ticket en esta lista; es independiente del QR.</p>
      {attendees.length === 0 ? <p className="ticket-empty">Aún no hay asistentes con entradas vigentes en este evento.</p> : <div className="attendees-table" role="region" aria-label="Lista de asistentes" tabIndex={0}>
        <table>
          <caption>Entradas vigentes, de la compra más reciente a la más antigua. No incluye tickets revocados, cancelados ni reembolsados.</caption>
          <thead><tr><th scope="col">Nombre</th><th scope="col">Correo electrónico</th><th scope="col">Tipo de entrada</th><th scope="col">Código de ticket</th><th scope="col">Fecha de compra (Lima)</th><th scope="col">Estado del ticket</th></tr></thead>
          <tbody>{attendees.map(registration => <tr key={registration.id}>
            <th scope="row">{registration.name}</th><td>{registration.email}</td>
            <td>{currentDetails.ticketTypes.find(type => type.id === registration.ticketTypeId)?.name ?? "Entrada no disponible"}</td>
            <td>{registration.ticket.code}</td>
            <td><time dateTime={registration.ticket.issuedAt}>{formatEventDate(registration.ticket.issuedAt)}</time></td>
            <td>{ticketStatuses[registration.ticket.status].label}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </>}
    </div>
  </section>;
}
