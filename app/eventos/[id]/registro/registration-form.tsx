"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { initialRegistrationState, type PublicEvent, type RegistrationState } from "@/lib/registration";
import { registerForEvent } from "@/lib/registration-client";
import { ticketPath } from "@/lib/tickets";

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
  const tickets = event?.ticketTypes ?? [];
  const available = !!event && event.remaining > 0 && tickets.some(ticket => ticket.remaining > 0);
  const selection = tickets.some(ticket => ticket.id === ticketId && ticket.remaining > 0) ? ticketId : "";

  useEffect(() => {
    if (state.status === "idle") return;
    const invalid = Object.keys(state.fieldErrors)[0];
    const input = invalid ? form.current?.querySelector<HTMLInputElement>(`input[name="${invalid}"]:not(:disabled)`) : null;
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
        {state.ticketCode && <a className="registration-submit ticket-link" href={ticketPath(state.ticketCode)}>Ver mi entrada y QR</a>}
        {state.emailDelivery === "sent" && <p className="registration-note">Enviamos tu entrada por correo. Revisa también la carpeta de spam.</p>}
        {state.emailDelivery === "failed" && <p className="registration-note">Tu entrada está confirmada, pero no pudimos enviarla por correo. Abre tu entrada y guarda el enlace.</p>}
        <p className="registration-note">Abre tu entrada y guarda su enlace privado. Lo necesitarás para ver tu QR y el estado de tu entrada.</p>
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
          <fieldset className="registration-tickets" aria-invalid={!!state.fieldErrors.ticketTypeId} aria-describedby={state.fieldErrors.ticketTypeId ? "ticket-error" : undefined}>
            <legend>Tipo de entrada</legend>
            <div className="registration-ticket-options">
              {tickets.map(ticket => {
                const remaining = Math.max(0, Math.min(ticket.remaining, event.remaining));
                return <label className="registration-ticket-option" key={ticket.id}>
                  <input type="radio" name="ticketTypeId" value={ticket.id} required checked={selection === ticket.id} onChange={e => setTicketId(e.target.value)} disabled={remaining <= 0} aria-describedby={state.fieldErrors.ticketTypeId ? "ticket-error" : undefined} />
                  <span>
                    <span className="registration-ticket-name">{ticket.name}</span>
                    <span className="registration-ticket-availability">{remaining > 0 ? `${remaining} ${remaining === 1 ? "entrada disponible" : "entradas disponibles"}` : "Agotada · 0 entradas disponibles"}</span>
                  </span>
                </label>;
              })}
            </div>
            {state.fieldErrors.ticketTypeId && <p className="registration-field-error" id="ticket-error">{state.fieldErrors.ticketTypeId}</p>}
          </fieldset>
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
