export const EVENT_TIME_ZONE = "America/Lima";
export function formatRegistrationDay(value: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: EVENT_TIME_ZONE, dateStyle: "medium" }).format(new Date(`${value}T12:00:00-05:00`));
}
export function limaDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: EVENT_TIME_ZONE, dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}
export function localDate(value: string): string { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
export function formatOrganizerDate(value: string, part?: "day" | "month"): string {
 const date = new Date(value);
 if (part === "day") return date.toLocaleDateString("es-PE", {day:"2-digit"});
 if (part === "month") return date.toLocaleDateString("es-PE", {month:"short"}).replace(".", "");
 return date.toLocaleString("es-PE", {dateStyle:"medium",timeStyle:"short"});
}
