"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { hasPublicRegistration } from "@/app/lib/registration";

type EventRow = { id: string; title: string; description: string; date: string; venue: string; status: string; max_capacity: number };
type Ticket = { id: string; event_id: string; name: string; max_capacity: number };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;
const blank = { title: "", description: "", date: "", venue: "", status: "borrador", max_capacity: 1 };
function Icon({ name }: { name: string }) { return <span className="material-icons-outlined app-icon" aria-hidden="true">{name}</span>; }
function localDate(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

export default function Organizer() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketName, setTicketName] = useState("");
  const [ticketCapacity, setTicketCapacity] = useState(1);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = client.auth.onAuthStateChange((_event, next) => { setSession(next); if (!next) { setEvents([]); setTickets([]); setSelected(null); } });
    return () => data.subscription.unsubscribe();
  }, []);
  async function refresh() {
    if (!supabase || !session) return;
    const [e, t] = await Promise.all([supabase.from("events").select("*").eq("organizer_id", session.user.id).order("date"), supabase.from("tickets_types").select("*")]);
    if (e.error || t.error) { setMessage((e.error || t.error)?.message || "Error al cargar los datos"); return; }
    setEvents(e.data || []); setTickets(t.data || []);
  }
  useEffect(() => { if (session) { void refresh(); } }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage(""); const data = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) });
    setMessage(error ? "No se pudo iniciar sesión. Revisa tus credenciales." : ""); setBusy(false);
  }
  async function saveEvent(e: FormEvent) {
    e.preventDefault(); if (!supabase) return; setBusy(true); setMessage("");
    const { error } = await supabase.rpc("save_event", { p_id: editing, p_title: form.title.trim(), p_description: form.description.trim(), p_date: new Date(form.date).toISOString(), p_venue: form.venue.trim(), p_status: form.status, p_capacity: Number(form.max_capacity) });
    if (error) setMessage(error.message); else { setForm(blank); setEditing(null); setFormOpen(false); await refresh(); setMessage("Evento guardado."); } setBusy(false);
  }
  async function saveTicket(e: FormEvent) {
    e.preventDefault(); if (!supabase || !selected) return; setBusy(true); setMessage("");
    const { error } = await supabase.rpc("save_ticket_type", { p_id: ticketId, p_event_id: selected, p_name: ticketName.trim(), p_capacity: Number(ticketCapacity) });
    if (error) setMessage(error.code === "23505" ? "Ya existe un tipo de entrada con ese nombre." : error.message); else { setTicketId(null); setTicketName(""); setTicketCapacity(1); await refresh(); setMessage("Tipo de entrada guardado."); } setBusy(false);
  }
  async function remove(table: "events" | "tickets_types", id: string) {
    if (!supabase || !confirm(table === "events" ? "¿Eliminar este evento y todos sus tipos de entrada?" : "¿Eliminar este tipo de entrada?")) return;
    setBusy(true); setMessage(""); const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.code === "23503" ? (table === "events" ? "No puedes eliminar un evento con personas registradas. Puedes cambiar su estado a borrador para cerrar nuevos registros." : "No puedes eliminar una entrada con personas registradas.") : error.message); else { if (table === "events" && selected === id) setSelected(null); await refresh(); setMessage("Eliminado correctamente."); } setBusy(false);
  }
  const event = events.find(item => item.id === selected);
  const eventTickets = tickets.filter(item => item.event_id === selected);
  const assigned = eventTickets.reduce((sum, item) => sum + item.max_capacity, 0);
  function showForm(item?: EventRow) {
    setEditing(item?.id ?? null);
    setForm(item ? { ...item, date: localDate(item.date) } : blank);
    setFormOpen(true);
    window.setTimeout(() => document.getElementById("event-form")?.scrollIntoView({ behavior: "auto", block: "start" }), 50);
  }
  function showTickets(id: string) {
    setSelected(id); setTicketId(null); setTicketName(""); setTicketCapacity(1);
    window.setTimeout(() => document.getElementById("ticket-panel")?.scrollIntoView({ behavior: "auto", block: "start" }), 50);
  }
  return <main className="dashboard">
    <header className="dashboard-header">
      <Link className="brand" href="/" aria-label="Door List, ir al inicio">door list<span className="brand-dot">.</span></Link>
      {session ? <button className="header-action" onClick={() => void supabase?.auth.signOut()}>Cerrar sesión</button> : <Link className="back-link" href="/">Volver al inicio</Link>}
    </header>
    {!supabase ? <p role="alert">Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para conectar Supabase.</p> : loading ? <p className="loading">Preparando tu espacio…</p> : !session ?
      <div className="login-layout"><section className="login-intro"><span className="section-tag">Para organizadores</span><h1>Grandes eventos empiezan aquí<span className="brand-dot">.</span></h1><p>Un lugar para organizar cada detalle y dar la bienvenida a tus invitados.</p><div className="login-art" aria-hidden="true"><span /><span /><span /></div></section>
      <form className="panel login" onSubmit={login}><div className="panel-heading"><div><p className="eyebrow">Tu espacio</p><h2>Qué bueno verte</h2><p>Inicia sesión para gestionar tus eventos.</p></div></div><label>Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="tu@correo.com" /></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password" placeholder="Tu contraseña" /></label>{message && <p className="notice" role="status">{message}</p>}<button className="primary wide" disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</button><p className="login-note">Usa la cuenta de organizador que ya tienes en Door List.</p></form></div> : <>
      <section className="dashboard-intro"><div><p className="eyebrow">Panel de organizador</p><h1>Hagamos que suceda<span className="brand-dot">.</span></h1><p>Todo lo que necesitas para tus próximos encuentros.</p></div><button className="primary create-button" onClick={() => showForm()}><Icon name="add" /> Crear evento</button></section>
      {message && <p className="notice" role="status">{message}</p>}
      <div className="workspace"><section className="events-section" aria-labelledby="events-title"><div className="section-heading"><div><p className="eyebrow">Tu agenda</p><h2 id="events-title">Mis eventos <span className="count">{events.length}</span></h2></div><span className="section-hint">Todos tus encuentros, en un lugar</span></div>
      {events.length === 0 ? <div className="empty-state"><div className="empty-icon"><Icon name="event_available" /></div><h3>Tu próximo evento empieza aquí</h3><p>Crea un evento para empezar a organizar sus entradas y aforo.</p><button className="secondary" onClick={() => showForm()}>Crear mi primer evento</button></div> : <div className="event-list">{events.map(item => <article className={"event-card" + (selected === item.id ? " selected" : "")} key={item.id}><div className="event-card-top"><div className="date-tile"><strong>{new Date(item.date).toLocaleDateString("es-PE", {day:"2-digit"})}</strong><span>{new Date(item.date).toLocaleDateString("es-PE", {month:"short"}).replace(".", "")}</span></div><div className="event-card-title"><span className={"status " + (item.status === "publicado" ? "published" : "draft")}>{item.status === "publicado" ? "Publicado" : "Borrador"}</span><h3>{item.title}</h3><p>{item.venue}</p></div></div><div className="event-meta"><span>{new Date(item.date).toLocaleString("es-PE", {dateStyle:"medium",timeStyle:"short"})}</span><span>Aforo: {item.max_capacity}</span></div><div className="actions">{hasPublicRegistration(item) && <Link className="public-registration-link" href={`/eventos/${item.id}/registro`} prefetch={false}><Icon name="open_in_new" />Ver registro público</Link>}<button className="secondary" aria-pressed={selected === item.id} onClick={() => showTickets(item.id)}><Icon name="confirmation_number" />{selected === item.id ? "Viendo entradas" : "Gestionar entradas"}</button><button className="text-button" onClick={() => showForm(item)}><Icon name="edit" />Editar</button><button className="danger" disabled={busy} onClick={() => void remove("events", item.id)}><Icon name="delete_outline" />Eliminar</button></div></article>)}</div>}</section>
      {formOpen && <section className="panel event-form" id="event-form" aria-labelledby="form-title"><div className="panel-heading"><div><p className="eyebrow">Los detalles importan</p><h2 id="form-title">{editing ? "Editar evento" : "Crear evento"}</h2><p>Cuéntanos sobre tu próximo encuentro.</p></div><button className="close-button" type="button" aria-label="Cerrar formulario" onClick={() => {setFormOpen(false);setEditing(null);setForm(blank);}}><Icon name="close" /></button></div><form onSubmit={saveEvent}>
        <label>Nombre del evento<input required value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Ej. Noche de verano" /></label>
        <label>Descripción<textarea required value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="¿Qué hace especial a tu evento?" /></label>
        <label>Fecha y hora<input required type="datetime-local" value={form.date} onChange={e => setForm({...form,date:e.target.value})} /></label>
        <label>Lugar<input required value={form.venue} onChange={e => setForm({...form,venue:e.target.value})} placeholder="Nombre del lugar o dirección" /></label>
        <div className="form-row"><label>Aforo máximo<input required type="number" min="1" step="1" value={form.max_capacity} onChange={e => setForm({...form,max_capacity:Number(e.target.value)})} /></label><label>Estado<select value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option value="borrador">Borrador</option><option value="publicado">Publicado</option></select></label></div><p className="field-help">La suma de los aforos de tus entradas no puede superar este límite.</p>
        {message && <p className="notice" role="status">{message}</p>}<div className="form-actions"><button className="primary" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear evento"}</button><button type="button" className="text-button" onClick={() => {setFormOpen(false);setEditing(null);setForm(blank);}}>Cancelar</button></div></form></section>}
      </div>
      {event && <section className="panel ticket-panel" id="ticket-panel" aria-labelledby="tickets-title"><div className="panel-heading"><div><p className="eyebrow">Gestionar entradas</p><h2 id="tickets-title">{event.title}</h2><p>Define los tipos de entrada y su aforo.</p></div><button className="close-button" aria-label="Cerrar entradas" onClick={() => setSelected(null)}><Icon name="close" /></button></div><div className="capacity-summary"><div><span>Aforo asignado</span><strong>{assigned} <small>/ {event.max_capacity}</small></strong></div><div className="capacity-right"><span>Disponible</span><strong>{event.max_capacity - assigned}</strong></div><div className="capacity-track" role="progressbar" aria-label="Aforo asignado" aria-valuemin={0} aria-valuemax={event.max_capacity} aria-valuenow={assigned}><span style={{width: `${Math.min(100, assigned / event.max_capacity * 100)}%`}} /></div></div><div className="ticket-layout"><div><h3>Tipos de entrada <span className="count">{eventTickets.length}</span></h3>{eventTickets.length === 0 ? <p className="ticket-empty">Aún no hay tipos de entrada. Añade el primero para distribuir el aforo.</p> : eventTickets.map(item => <article className="ticket-item" key={item.id}><div><h4>{item.name}</h4><p>{item.max_capacity} lugares</p></div><div className="actions"><button className="text-button" onClick={() => {setTicketId(item.id);setTicketName(item.name);setTicketCapacity(item.max_capacity);document.getElementById("ticket-name")?.focus();}}><Icon name="edit" />Editar</button><button className="danger" disabled={busy} onClick={() => void remove("tickets_types",item.id)}><Icon name="delete_outline" />Eliminar</button></div></article>)}</div><form className="ticket-form" onSubmit={saveTicket}><h3>{ticketId ? "Editar entrada" : "Añadir tipo de entrada"}</h3><label>Nombre<input id="ticket-name" required value={ticketName} onChange={e => setTicketName(e.target.value)} placeholder="Ej. General" /></label><label>Aforo<input required type="number" min="1" step="1" value={ticketCapacity} onChange={e => setTicketCapacity(Number(e.target.value))} /></label>{message && <p className="notice" role="status">{message}</p>}<div className="form-actions"><button className="primary" disabled={busy}>{busy ? "Guardando…" : ticketId ? "Guardar cambios" : "Añadir entrada"}</button>{ticketId && <button type="button" className="text-button" onClick={() => {setTicketId(null);setTicketName("");setTicketCapacity(1);}}>Cancelar</button>}</div></form></div></section>}
      <footer className="dashboard-footer">Door List <span>·</span> Hecho para reunirnos.</footer></>}
  </main>;
}
