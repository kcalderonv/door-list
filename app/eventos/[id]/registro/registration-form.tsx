"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { initialRegistrationState, type PublicEvent, type RegistrationState } from "@/app/lib/registration";
import { registerForEvent } from "./actions";

export default function RegistrationForm({ event: initialEvent }: { event: PublicEvent }) {
  const [state, action, pending] = useActionState(async (previous: RegistrationState, data: FormData): Promise<RegistrationState> => {
    try {
      return await registerForEvent(initialEvent.id, previous, data);
    } catch {
      // This also handles a lost browser-to-Next.js response, not only a DB error.
      return { status: "error", message: "No pudimos confirmar el resultado. Vuelve a intentarlo con el mismo correo; si ya se guardó, no se duplicará.", fieldErrors: {}, event: previous.event };
    }
  }, initialRegistrationState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketId, setTicketId] = useState("");
  const feedback = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const event = state.event === undefined ? initialEvent : state.event;
  const tickets = event?.tickets ?? [];
  const available = !!event && event.remaining > 0 && tickets.some(ticket => ticket.remaining > 0);
  const selection = tickets.some(ticket => ticket.id === ticketId && ticket.remaining > 0) ? ticketId : "";

  useEffect(() => {
    if (state.status === "idle") return;
    const invalid = Object.keys(state.fieldErrors)[0];
    const input = invalid ? form.current?.elements.namedItem(invalid) : null;
    if (input instanceof HTMLElement) input.focus();
    else feedback.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return <section className="registration-panel registration-success" aria-labelledby="success-title">
      <div ref={feedback} tabIndex={-1} role="status">
        <span className="registration-check" aria-hidden="true">✓</span>
        <p className="eyebrow">Tu lugar está reservado</p>
        <h2 id="success-title">{state.message}</h2>
        <p>Te esperamos en <strong>{initialEvent.title}</strong>.</p>
        <p>Entrada: <strong>{state.ticketName}</strong></p>
        <p className="registration-note">Guarda los detalles del evento para el día del encuentro.</p>
      </div>
    </section>;
  }

  return <section className="registration-panel" aria-labelledby="registration-title">
    <p className="eyebrow">Forma parte del encuentro</p>
    <h2 id="registration-title">Reserva tu lugar</h2>
    <p className="registration-note">Elige una entrada y déjanos tus datos. Todos los campos son obligatorios.</p>
    <div ref={feedback} tabIndex={-1} role={state.status === "error" || state.status === "validation_error" ? "alert" : "status"} aria-live="polite">
      {state.message && <p className="registration-message">{state.message}</p>}
    </div>
    {!event ? <p className="registration-note">El registro para este evento está cerrado.</p> : <>
      {!available && <p className="registration-message" role="status">No hay entradas disponibles en este momento.</p>}
      <form ref={form} action={action} aria-busy={pending}>
        <fieldset disabled={pending || !available}>
          <label htmlFor="registration-ticket">Tipo de entrada</label>
          <select id="registration-ticket" name="ticketTypeId" required value={selection} onChange={e => setTicketId(e.target.value)} aria-invalid={!!state.fieldErrors.ticketTypeId} aria-describedby={state.fieldErrors.ticketTypeId ? "ticket-error" : undefined}>
            <option value="" disabled>Elige tu entrada</option>
            {tickets.map(ticket => <option key={ticket.id} value={ticket.id} disabled={ticket.remaining <= 0 || event.remaining <= 0}>{ticket.name} — {ticket.remaining > 0 && event.remaining > 0 ? "Disponible" : "Agotada"}</option>)}
          </select>
          {state.fieldErrors.ticketTypeId && <p className="registration-field-error" id="ticket-error">{state.fieldErrors.ticketTypeId}</p>}
          <label htmlFor="registration-name">Nombre</label>
          <input id="registration-name" name="name" required maxLength={200} autoComplete="name" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!state.fieldErrors.name} aria-describedby={state.fieldErrors.name ? "name-error" : undefined} />
          {state.fieldErrors.name && <p className="registration-field-error" id="name-error">{state.fieldErrors.name}</p>}
          <label htmlFor="registration-email">Correo electrónico</label>
          <input id="registration-email" name="email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!state.fieldErrors.email} aria-describedby={state.fieldErrors.email ? "email-error" : "email-help"} />
          {state.fieldErrors.email && <p className="registration-field-error" id="email-error">{state.fieldErrors.email}</p>}
          <p className="registration-note" id="email-help">Un registro por correo y evento.</p>
          <button className="registration-submit" type="submit" disabled={pending || !available}>{pending ? "Registrando…" : "Confirmar registro"}</button>
        </fieldset>
        <p className="registration-note" role="status" aria-live="polite">{pending ? "Estamos comprobando la disponibilidad y guardando tu registro…" : "El cupo se confirma al completar el registro."}</p>
      </form>
    </>}
  </section>;
}
