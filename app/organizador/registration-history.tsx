"use client";

import { useEffect, useState } from "react";
import type { RegistrationHistory } from "@/lib/contracts";
import { formatRegistrationDay } from "@/lib/dates";
import { fetchRegistrationHistory } from "@/lib/registration-history-client";
import { supabase } from "@/lib/supabase/organizer";

// The browser session, endpoint fetching and refresh button require client execution.
export default function RegistrationHistoryChart({ eventId }: { eventId: string }) {
  const [history, setHistory] = useState<RegistrationHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (!supabase) throw new Error("El panel no está disponible en este momento.");
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (controller.signal.aborted) return;
        if (sessionError || !data.session) throw new Error("Inicia sesión para consultar los registros.");
        const result = await fetchRegistrationHistory(eventId, data.session.access_token, controller.signal);
        if (!controller.signal.aborted) { setHistory(result); setError(""); }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error && cause.message.startsWith("Tu sesión")
          ? cause.message : "No se pudo cargar la gráfica de registros. Inténtalo nuevamente.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [eventId, revision]);

  const days = history?.days ?? [];
  const total = days.reduce((sum, day) => sum + day.registrationCount, 0);
  const peak = days.reduce((max, day) => Math.max(max, day.registrationCount), 0);
  const ceiling = Math.max(2, Math.ceil(peak / 2) * 2);
  // Normalized SVG coordinates describe the data, while CSS tokens set the rendered size.
  const points = days.map((day, index) => ({
    ...day,
    x: days.length === 1 ? 50 : index / (days.length - 1) * 100,
    y: 95 - day.registrationCount / ceiling * 90,
  }));
  const labelIndexes = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];

  return <section className="registration-history" aria-labelledby="registration-history-title">
    <div className="section-heading">
      <div><p className="eyebrow">La evolución de tu evento</p><h3 id="registration-history-title">Registros por día</h3></div>
      <button className="secondary" disabled={loading} onClick={() => {
        setLoading(true); setError(""); setRevision(value => value + 1);
      }}>{loading ? "Cargando gráfica…" : "Actualizar gráfica"}</button>
    </div>
    {loading && <p role="status">Cargando registros diarios…</p>}
    {error && <p className="notice error-notice" role="alert">{error}{history && " Se muestran los últimos datos disponibles."}</p>}
    <div aria-busy={loading}>
      {loading && !history && <div className="history-skeleton" aria-hidden="true" />}
      {history && !history.publishedAt && <div className="history-empty">
        <h4>{history.isPublished ? "Fecha de publicación no disponible" : "Este evento aún no tiene historial de publicación"}</h4>
        <p>{history.isPublished
          ? "Este evento se publicó antes de que guardáramos esa fecha y todavía no tiene registros para estimarla. La gráfica estará disponible cuando reciba su primer registro."
          : "Al publicar el evento comenzaremos a guardar su evolución diaria."}</p>
      </div>}
      {history && days.length > 0 && <>
        <p className="history-period">Del {formatRegistrationDay(days[0].date)} al {formatRegistrationDay(days[days.length - 1].date)} · Hora de Lima</p>
        {history.publicationDateEstimated && <p className="notice">La fecha de publicación original no se guardó. El historial comienza en el primer registro conocido.</p>}
        <dl className="history-stats">
          <div><dt>Registros en el período</dt><dd>{total}</dd></div>
          <div><dt>Días transcurridos</dt><dd>{days.length}</dd></div>
          <div><dt>Máximo en un día</dt><dd>{peak}</dd></div>
        </dl>
        {total === 0 && <p className="history-empty">Aún no hay registros. La gráfica incluye todos los días desde la publicación, con valor cero.</p>}
        <figure className="history-figure">
          <figcaption id="history-chart-caption">Cantidad de registros por día · Incluye días sin registros</figcaption>
          <div className="history-plot">
            <div className="history-y-axis" aria-hidden="true"><span>{ceiling}</span><span>{ceiling / 2}</span><span>0</span></div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-labelledby="history-chart-caption" aria-describedby="history-chart-description">
              <desc id="history-chart-description">{total} registros en {days.length} días. Máximo diario: {peak}. Los valores exactos están en la tabla de registros diarios.</desc>
              {[5, 50, 95].map(y => <line key={y} className="history-grid" x1="0" x2="100" y1={y} y2={y} vectorEffect="non-scaling-stroke" />)}
              <polyline className="history-line" points={points.map(point => `${point.x},${point.y}`).join(" ")} vectorEffect="non-scaling-stroke" />
              {points.length <= 90 && points.map(point => <line key={point.date} className="history-dot" x1={point.x} x2={point.x} y1={point.y} y2={point.y} vectorEffect="non-scaling-stroke"><title>{formatRegistrationDay(point.date)}: {point.registrationCount} registros</title></line>)}
            </svg>
            <div className="history-x-axis" aria-hidden="true">{labelIndexes.map(index => <span key={index}>{formatRegistrationDay(days[index].date)}</span>)}</div>
          </div>
        </figure>
        <details className="history-data"><summary>Ver tabla de registros diarios</summary>
          <div className="attendees-table" role="region" aria-label="Registros diarios" tabIndex={0}>
            <table><caption>Registros diarios en horario de Lima</caption><thead><tr><th scope="col">Día</th><th scope="col">Registros</th></tr></thead>
              <tbody>{days.map(day => <tr key={day.date}><th scope="row"><time dateTime={day.date}>{formatRegistrationDay(day.date)}</time></th><td>{day.registrationCount}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </>}
    </div>
  </section>;
}
