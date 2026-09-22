import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Ticket } from '../../types/ticket';
import type { Event } from '../../types/event';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  QrCode,
  ShieldCheck,
  Clock,
  Printer,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { printTicketPass } from '../../utils/printTicket';

export const MyEventsPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Tickets'>('Upcoming');
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (user) {
          const userTickets = await api.registration.getAttendeeTickets(user.id);
          setTickets(userTickets);
        }
        const events = await api.events.getAll();
        setAllEvents(events);
      } catch (e) {
        console.error('Failed to load attendee registrations:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Combine tickets with event details to form the list of upcoming registered events
  const registeredEvents = tickets.map((ticket) => {
    const matchedEvent = allEvents.find((e) => e.id === ticket.eventId);
    return {
      ticket,
      event: matchedEvent || {
        id: ticket.eventId,
        title: ticket.eventTitle,
        type: ticket.eventType,
        date: ticket.eventDate,
        time: ticket.eventTime,
        location: ticket.eventLocation,
        organizerName: 'Community Organizer',
        status: 'open',
        isPaid: ticket.isPaid,
        ticketPrice: ticket.ticketPrice,
      } as Partial<Event>,
    };
  });

  const handleViewTicketQr = (ticketId: string) => {
    setActiveTab('Tickets');
    setHighlightedTicketId(ticketId);
    setTimeout(() => {
      const el = document.getElementById(`ticket-card-${ticketId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handlePrint = (ticketId?: string) => {
    if (!ticketId) {
      window.print();
      return;
    }
    printTicketPass(`ticket-card-${ticketId}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 w-full">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
          My Registrations
        </h1>
        <p className="text-xs text-[#756366] font-light">
          Track upcoming events you've registered for and access your digital QR entry passes.
        </p>
      </div>

      {/* 2 Clean Tabs: Upcoming & My Tickets */}
      <div className="flex border-b border-[#E8DDD7] gap-8 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('Upcoming')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'Upcoming'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain" />
          <span>Upcoming ({registeredEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Tickets')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'Tickets'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>My Tickets ({tickets.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl"></div>
          ))}
        </div>
      ) : activeTab === 'Upcoming' ? (
        /* TAB 1: Upcoming Events */
        <div className="space-y-4">
          {registeredEvents.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E8DDD7] space-y-3 shadow-xs">
              <img src="/calendar.webp" alt="Calendar" className="w-10 h-10 object-contain mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#2D1F23]">No Upcoming Registrations</h3>
              <p className="text-xs text-[#756366] font-light max-w-md mx-auto">
                You haven't registered for any upcoming events yet. Once you register for workshops, hackathons, or meetups, they will appear here so you can prepare to attend.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {registeredEvents.map(({ ticket, event }) => (
                <div
                  key={ticket.id}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8DDD7] hover:border-[#63474D] transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary" className="uppercase font-mono text-[10px]">
                        {event.type || ticket.eventType}
                      </Badge>
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registration Confirmed</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#756366] bg-[#FAF7F5] border border-[#E8DDD7] px-2 py-0.5 rounded">
                        Pass: {ticket.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#2D1F23] leading-snug">
                        {event.title || ticket.eventTitle}
                      </h3>
                      {event.organizerName && (
                        <p className="text-xs font-semibold text-[#AA767C] mt-0.5">
                          Hosted by {event.organizerName}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#756366] pt-1">
                      <div className="flex items-center gap-1.5">
                        <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain shrink-0" />
                        <span className="font-medium text-[#2D1F23]">{event.date || ticket.eventDate}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#63474D]" />
                        <span>{event.time || ticket.eventTime}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                        <span className="truncate">{event.venueName || event.location || ticket.eventLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Upcoming Event */}
                  <div className="flex flex-row md:flex-col items-center sm:items-end gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E8DDD7]">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewTicketQr(ticket.id)}
                      icon={<QrCode className="w-4 h-4" />}
                      className="w-full md:w-auto"
                    >
                      View QR Pass
                    </Button>

                    <Link
                      to={`/app/ticket/${ticket.eventId}`}
                      className="w-full md:w-auto"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        className="w-full md:w-auto"
                      >
                        Pass View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: My Tickets (QR Codes per Event) */
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E8DDD7] space-y-3 shadow-xs">
              <QrCode className="w-10 h-10 text-[#FFA686] mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#2D1F23]">No Event Tickets Available</h3>
              <p className="text-xs text-[#756366] font-light max-w-md mx-auto">
                You do not have any registered event passes yet. When you register for an event, your digital QR pass will be displayed here for entrance check-in.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {tickets.map((ticket) => {
                const isHighlighted = highlightedTicketId === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    id={`ticket-card-${ticket.id}`}
                    className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-xs ${
                      isHighlighted
                        ? 'border-[#63474D] ring-2 ring-[#63474D]/20 shadow-md'
                        : 'border-[#E8DDD7] hover:border-[#63474D]/50'
                    }`}
                  >
                    {/* Top Ticket Header Ribbon */}
                    <div className="bg-[#63474D] text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/logo.webp"
                          alt="Sheeba Logo"
                          className="h-7 sm:h-8 w-auto object-contain shrink-0"
                        />
                        <span className="font-serif font-bold text-sm tracking-wider text-white">
                          SHEEBA<span className="text-[#FFA686]">.</span> PASS
                        </span>
                        <span className="text-[11px] text-[#E8DDD7] font-mono ml-2 border-l border-white/20 pl-2">
                          {ticket.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>
                          {ticket.status === 'Valid' ? 'Valid for Entry' : ticket.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Main Content: QR Code Left + Details Right */}
                    <div className="p-6 flex flex-col md:flex-row items-center md:items-stretch gap-6">
                      {/* Live Dynamic QR Code Section */}
                      <div className="flex flex-col items-center justify-center p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] shrink-0 text-center">
                        <div className="bg-white p-3 rounded-xl border border-[#E8DDD7] shadow-2xs">
                          <QRCodeSVG
                            value={`${window.location.origin}/verify-ticket?token=${encodeURIComponent(ticket.qrToken || ticket.id)}&code=${encodeURIComponent(ticket.ticketCode || '')}`}
                            size={160}
                            bgColor="#ffffff"
                            fgColor="#2D1F23"
                            level="H"
                            includeMargin={false}
                          />
                        </div>
                        <p className="mt-2 text-[11px] font-mono font-bold text-[#63474D]">
                          {ticket.ticketCode || 'SHB-PASS'}
                        </p>
                        <span className="text-[10px] font-bold text-[#2A7B5F] mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#2A7B5F]" />
                          <span>Scan for Entrance & Verification</span>
                        </span>
                      </div>

                      {/* Event & Pass Details */}
                      <div className="flex-1 flex flex-col justify-between space-y-4 text-left w-full">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#AA767C]">
                              {ticket.eventType} ENTRANCE PASS
                            </span>
                            <span className="text-xs font-bold text-[#63474D]">
                              {ticket.isPaid ? `${ticket.ticketPrice} ${ticket.currency}` : 'FREE PASS'}
                            </span>
                          </div>

                          <h2 className="font-serif text-xl font-bold text-[#2D1F23] leading-snug">
                            {ticket.eventTitle}
                          </h2>

                          {/* Event Date & Location */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#2D1F23] pt-1">
                            <div className="flex items-start gap-2">
                              <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain mt-0.5 shrink-0" />
                              <div>
                                <p className="font-semibold">{ticket.eventDate}</p>
                                <p className="text-[#756366] text-[11px]">{ticket.eventTime}</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain mt-0.5 shrink-0" />
                              <div>
                                <p className="font-semibold">{ticket.eventLocation}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Attendee Info Box */}
                        <div className="p-3 bg-[#FAF7F5] rounded-xl border border-[#E8DDD7] text-xs flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-[#756366] uppercase font-bold block">Attendee Name</span>
                            <span className="font-bold text-[#2D1F23]">{ticket.attendeeName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#756366] uppercase font-bold block">Email</span>
                            <span className="text-[#756366] text-[11px]">{ticket.attendeeEmail}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-[#E8DDD7] flex flex-wrap items-center justify-between gap-3 no-print">
                          <div className="flex items-center gap-1.5 text-xs text-[#2A7B5F] font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Present live QR at the door for badge accreditation</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link to={`/app/ticket/${ticket.eventId}`}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                icon={<ExternalLink className="w-3.5 h-3.5" />}
                              >
                                Ticket Card View
                              </Button>
                            </Link>

                            <Button
                              type="button"
                              variant="accent"
                              size="sm"
                              onClick={() => handlePrint(ticket.id)}
                              icon={<Printer className="w-3.5 h-3.5" />}
                            >
                              Print / Save Pass
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
