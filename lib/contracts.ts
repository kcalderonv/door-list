export type EmailDelivery = "sent" | "failed" | "disabled";
export type RegistrationHistory = {
  eventId: string;
  publishedAt: string | null;
  publicationDateEstimated: boolean;
  isPublished: boolean;
  timeZone: string;
  days: { date: string; registrationCount: number }[];
};
export type Event = { id: string; title: string; description: string; date: string; venue: string; status: string; maxCapacity: number };
export type TicketType = { id: string; eventId: string; name: string; maxCapacity: number };
export type Registration = { id: string; eventId: string; ticketTypeId: string; name: string; email: string; createdAt: string };
export type OrganizerEventDetails = {
  eventId: string;
  maxCapacity: number;
  ticketTypes: (TicketType & { registrationCount: number })[];
  registrations: Registration[];
};

export type RegistrationRequest = import("./registration").RegistrationFields & { eventId: string };
export type RegistrationResponse = { registrationId: string; ticketName: string; ticketCode: string; emailDelivery: EmailDelivery };
