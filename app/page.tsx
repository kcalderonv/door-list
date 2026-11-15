import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Noche de verano",
  description: "Descubre los detalles de Noche de verano en Casa Prado, Lima: fecha y lugar del encuentro.",
  ...(siteUrl ? { alternates: { canonical: "/" } } : {}),
  openGraph: { title: "Noche de verano | Door List", description: "Los detalles de Noche de verano en Casa Prado, Lima.", type: "website", ...(siteUrl ? { url: "/" } : {}) },
  twitter: { card: "summary", title: "Noche de verano | Door List", description: "Los detalles de Noche de verano en Casa Prado, Lima." },
};

const event = {
  title: "Noche de verano",
  date: "Sábado 12 de diciembre de 2026",
  venue: "Casa Prado, Lima",
};

export default function Home() {
  return (
    <main className="page">
      <header className="header"><span className="brand">door list<span className="brand-dot">.</span></span> <a href="/organizador" style={{ float: "right", color: "inherit" }}>Acceso organizador</a></header>
      <article className="event">
        <div className="event-main">
          <p className="intro">Bienvenido a door list. Una noche para recordar.</p>
          <h1>{event.title}</h1>
          <div className="details">
            <div><p className="label">Fecha</p><p>{event.date}</p></div>
            <div><p className="label">Lugar</p><p>{event.venue}</p></div>
          </div>
        </div>
        <div className="art" aria-hidden="true"><div className="sun" /><div className="art-caption">Nos vemos ahí.</div></div>
      </article>
      <footer className="footer">Buenos momentos, mejores encuentros.</footer>
    </main>
  );
}

