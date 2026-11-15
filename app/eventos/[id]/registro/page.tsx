import { formatEventDate } from "@/lib/dates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isUuid } from "@/lib/registration";
import { getPublicEvent } from "@/lib/public-event";
import RegistrationForm from "./registration-form";

export const metadata: Metadata = { title: "Registro al evento" };

export default async function RegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const event = await getPublicEvent(id);
  if (!event) notFound();

  return <div className="registration-layout">
    <section className="registration-details" aria-labelledby="event-title">
      <p className="eyebrow">Un lugar para encontrarnos</p>
      <h1 id="event-title">{event.title}</h1>
      <p className="registration-description">{event.description}</p>
      <dl className="registration-facts">
        <div><dt>Fecha y hora</dt><dd><time dateTime={event.date}>{formatEventDate(event.date)}</time><small>Hora de Lima</small></dd></div>
        <div><dt>Lugar</dt><dd>{event.venue}</dd></div>
      </dl>
      <p className="registration-note">Puedes registrarte durante todo el día del evento, mientras haya cupo.</p>
    </section>
    <RegistrationForm event={event} />
  </div>;
}
