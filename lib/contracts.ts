export type EmailDelivery = "sent" | "failed" | "disabled";
export type Event = { id: string; title: string; description: string; date: string; venue: string; status: string; max_capacity: number };
export type TicketType = { id: string; event_id: string; name: string; max_capacity: number };

export type RegistrationRequest = import("./registration").RegistrationFields & { eventId: string };
export type RegistrationResponse = { registrationId: string; ticketName: string; ticketCode: string; emailDelivery: EmailDelivery };
