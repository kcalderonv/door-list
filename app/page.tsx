import { formatEventDate } from "@/lib/dates";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getAvailableEvents, type AvailableEvent } from "../lib/public-events";
import { siteUrl } from "@/lib/site";
import { Suspense } from "react";
import CardSkeleton from "@/components/card-skeleton";

const description = "Descubre eventos y encuentros en Door List y regístrate para tu próxima experiencia.";
export const metadata: Metadata = {
  title: "Eventos y encuentros", description,
  ...(siteUrl ? { alternates: { canonical: "/" } } : {}),
  openGraph: { title: "Eventos y encuentros | Door List", description, type: "website", ...(siteUrl ? { url: "/" } : {}) },
  twitter: { card: "summary", title: "Eventos y encuentros | Door List", description },
};

function EventListSkeleton() {
  return <>
    <p className="public-loading-label" role="status">Cargando eventos…</p>
    <div className="public-event-list" aria-busy="true" aria-label="Eventos">
      {[0, 1, 2].map(index => <CardSkeleton key={index} />)}
    </div>
  </>;
}

async function PublicEventList() {
  await connection();
  let events: AvailableEvent[] = [];
  let failed = false;
  try { events = await getAvailableEvents(); } catch { failed = true; }
  return failed ? <div className="public-message public-message-error" role="alert"><h2>No pudimos cargar los eventos</h2><p>Inténtalo nuevamente en unos momentos.</p><form action="/" method="get"><button type="submit">Volver a intentar</button></form></div>
        : events.length === 0 ? <div className="public-message"><h2>Pronto habrá nuevos encuentros</h2><p>Por ahora no hay eventos con registro abierto. Vuelve a visitarnos.</p></div>
        : <div className="public-event-list">{events.map(event => <article className="public-event-card" key={event.id} aria-labelledby={`event-${event.id}`}>
          <h2 id={`event-${event.id}`}>{event.title}</h2>
          <p className="public-availability">Registro abierto</p>
          <dl className="registration-facts"><div><dt>Fecha y hora</dt><dd><time dateTime={event.date}>{formatEventDate(event.date)}</time><small>Hora de Lima</small></dd></div><div><dt>Lugar</dt><dd>{event.venue}</dd></div></dl>
          {event.description.length > 240
            ? <details className="public-description-details"><summary>Leer descripción completa<span className="public-sr-only"> de {event.title}</span></summary><p className="public-description">{event.description}</p></details>
            : <p className="public-description">{event.description}</p>}
          <Link className="registration-submit public-register" href={`/eventos/${event.id}/registro`} prefetch={false} aria-label={`Registrarme en ${event.title}`}>Registrarme</Link>
        </article>)}</div>;
}

export default function Home() {
  return <main className="page public-home">
    <header className="header public-header">
      <Link className="brand" href="/" aria-label="Door List, ir al inicio">door list<span className="brand-dot">.</span></Link>
      <Link className="back-link" href="/organizador">Acceso organizador</Link>
    </header>
    <section className="public-events" aria-labelledby="events-title">
      <div className="public-intro">
        <h1 id="events-title">Tu próximo encuentro<span className="brand-dot">.</span></h1>
        <p className="public-tagline">Un lugar para encontrarnos</p>
        <p>Descubre los eventos con registro abierto y reserva tu lugar.</p>
      </div>
      <Suspense fallback={<EventListSkeleton />}><PublicEventList /></Suspense>
    </section>
    <footer className="footer">Buenos momentos, mejores encuentros.</footer>
  </main>;
}
