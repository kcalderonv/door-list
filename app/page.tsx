import { formatEventDate } from "@/lib/dates";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getAvailableEvents, type AvailableEvent } from "../lib/public-events";
import { siteUrl } from "@/lib/site";

const description = "Descubre eventos y encuentros en Door List y regístrate para tu próxima experiencia.";
export const metadata: Metadata = {
  title: "Eventos y encuentros", description,
  ...(siteUrl ? { alternates: { canonical: "/" } } : {}),
  openGraph: { title: "Eventos y encuentros | Door List", description, type: "website", ...(siteUrl ? { url: "/" } : {}) },
  twitter: { card: "summary", title: "Eventos y encuentros | Door List", description },
};

export default async function Home() {
  await connection();
  let events: AvailableEvent[] = [];
  let failed = false;
  try { events = await getAvailableEvents(); } catch { failed = true; }
  return <main className="page public-home">
    <header className="header public-header">
      <Link className="brand" href="/" aria-label="Door List, ir al inicio">door list<span className="brand-dot">.</span></Link>
      <Link className="back-link" href="/organizador">Acceso organizador</Link>
    </header>
    <section className="public-events" aria-labelledby="events-title">
      <div className="public-intro"><p className="eyebrow">Un lugar para encontrarnos</p><h1 id="events-title">Tu próximo encuentro<span className="brand-dot">.</span></h1><p>Descubre los eventos con registro abierto y reserva tu lugar.</p></div>
      {failed ? <div className="public-message" role="alert"><h2>No pudimos cargar los eventos</h2><p>Inténtalo nuevamente en unos momentos.</p><form action="/" method="get"><button type="submit">Volver a intentar</button></form></div>
        : events.length === 0 ? <div className="public-message"><h2>Pronto habrá nuevos encuentros</h2><p>Por ahora no hay eventos con registro abierto. Vuelve a visitarnos.</p></div>
        : <div className="public-event-list">{events.map(event => <article className="public-event-card" key={event.id} aria-labelledby={`event-${event.id}`}>
          <p className="eyebrow">Registro abierto</p><h2 id={`event-${event.id}`}>{event.title}</h2>
          <p className="public-description">{event.description}</p>
          <dl className="registration-facts"><div><dt>Fecha y hora</dt><dd><time dateTime={event.date}>{formatEventDate(event.date)}</time><small>Hora de Lima</small></dd></div><div><dt>Lugar</dt><dd>{event.venue}</dd></div></dl>
          <Link className="registration-submit public-register" href={`/eventos/${event.id}/registro`} prefetch={false} aria-label={`Registrarme en ${event.title}`}>Registrarme</Link>
        </article>)}</div>}
    </section>
    <footer className="footer">Buenos momentos, mejores encuentros.</footer>
  </main>;
}
