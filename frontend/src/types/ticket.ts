import type { EventType } from './event';

export type TicketStatus = 'Valid' | 'Checked in' | 'Used' | 'Expired' | 'Cancelled';

export interface Ticket {
  id: string; // e.g. "SHB-8921-2026"
  ticketCode?: string;
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  qrToken: string; // Dynamic signed token evaluated server-side
  qrCodeDataUrl?: string;
  status: TicketStatus;
  issuedAt: string;
  expiresAt: string; // Valid through day after event (auto-updates on postponement)
  checkedInAt?: string;
  isPaid: boolean;
  ticketPrice: number;
  currency: 'ETB';
}
