import type { OrganizerSocials } from './user';

export type EventType = 'hackathon' | 'workshop' | 'meetup' | 'summit' | 'other' | string;

export type EventStatus = 'open' | 'closed' | 'canceled' | 'postponed' | 'completed';

export type QuestionType = 'text' | 'choice' | 'multi_choice';

export interface RegistrationQuestion {
  id: string;
  eventId?: string;
  questionText: string;
  type?: QuestionType;
  options?: string[];
  isRequired: boolean;
  order: number;
}

export interface Event {
  id: string;
  organizerId: string;
  organizerName: string;
  organizationName?: string;
  organizerAvatar?: string;
  organizerSocials?: OrganizerSocials;
  title: string;
  description: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "09:00 AM"
  endTime?: string; // e.g. "05:00 PM"
  time: string; // display string e.g. "09:00 AM - 05:00 PM EAT"
  location: string;
  venueName?: string;
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  status: EventStatus;
  isPaid: boolean;
  ticketPrice: number; // In ETB
  currency: 'ETB';
  shareLinkToken: string;
  customQuestions: RegistrationQuestion[];
  includeDefaultQuestions?: boolean;
  bannerUrl?: string;
  posterImageUrl?: string;
  isFull?: boolean;
  createdAt?: string;
}
