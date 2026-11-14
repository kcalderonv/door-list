"use client";

export default function RegistrationError({ reset }: { reset: () => void }) {
  return <section className="registration-placeholder">
    <h1>No pudimos cargar el evento</h1>
    <p role="alert">Ocurrió un problema al consultar la disponibilidad. Inténtalo nuevamente.</p>
    <button className="registration-submit" onClick={reset}>Volver a intentar</button>
  </section>;
}
