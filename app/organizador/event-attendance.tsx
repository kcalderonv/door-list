"use client";

import { useEffect, useState } from "react";
import type { OrganizerEventDetails } from "@/lib/contracts";
import { formatEventDate } from "@/lib/dates";
import { loadOrganizerEventDetails, supabase } from "@/lib/supabase/organizer";

// Browser session authentication and refresh controls require client execution.
export default function EventAttendance({ eventId }: { eventId: string }) {
  const [details, setDetails] = useState<OrganizerEventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return;
    void loadOrganizerEventDetails(supabase, eventId).then(data => {
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

  return <section className="event-attendance" aria-labelledby="attendance-title">
    <div className="section-heading">
      <h3 id="attendance-title">Registros y aforo</h3>
      <button className="secondary" disabled={loading} onClick={refresh}>Actualizar registros</button>
    </div>
    {loading && <p role="status">Cargando registros…</p>}
    {error && <p className="notice error-notice" role="alert">{error}</p>}
    <div aria-busy={loading}>
    {details && <>
      <p className="attendance-total"><strong>{details.registrations.length} / {details.maxCapacity}</strong> personas registradas en el evento</p>
      {details.ticketTypes.length === 0 ? <p className="ticket-empty">Este evento aún no tiene tipos de entrada.</p> : <ul className="attendance-types">
        {details.ticketTypes.map(ticketType => <li key={ticketType.id}>
          <div><strong>{ticketType.name}</strong><span>{ticketType.registrationCount} / {ticketType.maxCapacity} registros{ticketType.registrationCount >= ticketType.maxCapacity ? " · Aforo completo" : ""}</span></div>
          <progress value={ticketType.registrationCount} max={ticketType.maxCapacity} aria-label={`Registros de ${ticketType.name}`} />
        </li>)}
      </ul>}
      <h3>Asistentes registrados <span className="count">{details.registrations.length}</span></h3>
      {details.registrations.length === 0 ? <p className="ticket-empty">Aún no hay asistentes registrados en este evento.</p> : <div className="attendees-table" role="region" aria-label="Lista de asistentes" tabIndex={0}>
        <table>
          <caption>Asistentes del evento, del registro más reciente al más antiguo</caption>
          <thead><tr><th scope="col">Nombre</th><th scope="col">Correo electrónico</th><th scope="col">Tipo de entrada</th><th scope="col">Fecha de registro (Lima)</th></tr></thead>
          <tbody>{details.registrations.map(registration => <tr key={registration.id}>
            <th scope="row">{registration.name}</th><td>{registration.email}</td>
            <td>{details.ticketTypes.find(type => type.id === registration.ticketTypeId)?.name ?? "Entrada no disponible"}</td>
            <td><time dateTime={registration.createdAt}>{formatEventDate(registration.createdAt)}</time></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </>}
    </div>
  </section>;
}
