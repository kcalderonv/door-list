export type TicketStatus = "valid" | "used" | "revoked";

export type Ticket = {
  status: TicketStatus;
  name: string;
  email: string;
  ticketName: string;
  issuedAt: string;
  event: { title: string; date: string; venue: string };
};

// Exactly 32 random bytes encoded as lowercase hexadecimal; never accept IDs,
// prefixes, email addresses, wildcard queries, or user-controlled paths.
export function isTicketCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function ticketPath(code: string): string {
  if (!isTicketCode(code)) throw new Error("Invalid ticket code");
  return `/entradas/${code}`;
}

export const ticketStatuses: Record<TicketStatus, { label: string; description: string }> = {
  valid: { label: "Válida", description: "Presenta este QR al ingresar al evento." },
  used: { label: "Utilizada", description: "Esta entrada ya se utilizó y no permite otro ingreso." },
  revoked: { label: "Revocada", description: "Esta entrada fue revocada y no permite el ingreso." },
};
