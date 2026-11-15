export type EmailDelivery = "sent" | "failed" | "disabled";
export type Event = { id: string; title: string; description: string; date: string; venue: string; status: string; max_capacity: number };
export type TicketType = { id: string; event_id: string; name: string; max_capacity: number };
