"use client";

export default function TicketError({ reset }: { reset: () => void }) {
  return <section className="registration-placeholder">
    <h1>No pudimos cargar tu entrada</h1>
    <p role="alert">Inténtalo nuevamente para consultar tus datos y el estado actual.</p>
    <button className="registration-submit" onClick={reset}>Volver a intentar</button>
  </section>;
}
