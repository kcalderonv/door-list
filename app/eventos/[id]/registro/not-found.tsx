import Link from "next/link";

export default function RegistrationNotFound() {
  return <section className="registration-placeholder">
    <p className="eyebrow">Registro no disponible</p>
    <h1>Evento no disponible para registros</h1>
    <p>El enlace puede ser incorrecto, el evento puede haber finalizado o aún no estar publicado.</p>
    <Link href="/">Volver al inicio</Link>
  </section>;
}
