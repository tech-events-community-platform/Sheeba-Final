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
  X,
  AlertTriangle,
} from 'lucide-react';
import { printTicketPass } from '../../utils/printTicket';
import { isEventPassed } from '../../utils/date';

export const MyEventsPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Past' | 'Tickets'>('Upcoming');
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);
  const [selectedAttendeeTicket, setSelectedAttendeeTicket] = useState<Ticket | null>(null);

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

  // Combine tickets with event details and categorize into Upcoming vs Past
  const registeredEvents = tickets.map((ticket) => {
    const matchedEvent = allEvents.find((e) => e.id === ticket.eventId);
    const eventObj = matchedEvent || ({
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
    } as Partial<Event>);

    const isPassed = Boolean(
      eventObj.isPassed ||
      ticket.isExpired ||
      isEventPassed((ticket as any).rawEventDate || eventObj.date || ticket.eventDate || ticket.expiresAt)
    );
    const isAttended = ticket.status === 'Checked in' || ticket.status === 'Used';

    return {
      ticket,
      event: eventObj,
      isPassed,
      isAttended,
    };
  });

  const upcomingEvents = registeredEvents.filter((item) => !item.isPassed);
  const pastEvents = registeredEvents.filter((item) => item.isPassed);

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

      {/* 3 Clean Tabs: Upcoming, Past Events & My Tickets */}
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
          <span>Upcoming ({upcomingEvents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('Past')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'Past'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Past Events ({pastEvents.length})</span>
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
          {upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E8DDD7] space-y-3 shadow-xs">
              <img src="/calendar.webp" alt="Calendar" className="w-10 h-10 object-contain mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#2D1F23]">No Upcoming Registrations</h3>
              <p className="text-xs text-[#756366] font-light max-w-md mx-auto">
                You haven't registered for any upcoming events yet. {pastEvents.length > 0 ? `You have ${pastEvents.length} past event${pastEvents.length > 1 ? 's' : ''} in your history.` : ''}
              </p>
              {pastEvents.length > 0 && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('Past')}>
                    View Past Events ({pastEvents.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {upcomingEvents.map(({ ticket, event }) => (
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
      ) : activeTab === 'Past' ? (
        /* TAB 2: Past Events (Registered & Attended) */
        <div className="space-y-4">
          {pastEvents.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E8DDD7] space-y-3 shadow-xs">
              <Clock className="w-10 h-10 text-[#AA767C] mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#2D1F23]">No Past Events</h3>
              <p className="text-xs text-[#756366] font-light max-w-md mx-auto">
                Once events you have registered for pass their scheduled dates, they will automatically appear here with your turnout records and badges.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pastEvents.map(({ ticket, event, isAttended }) => (
                <div
                  key={ticket.id}
                  className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8DDD7] transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary" className="uppercase font-mono text-[10px]">
                        {event.type || ticket.eventType}
                      </Badge>
                      {isAttended ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1b4332] bg-[#1b4332]/10 px-2.5 py-0.5 rounded-full border border-[#1b4332]/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified Attended</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-300">
                          <Clock className="w-3.5 h-3.5 text-stone-500" />
                          <span>Event Concluded • Pass Expired</span>
                        </div>
                      )}
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

                  {/* Actions for Past Event */}
                  <div className="flex flex-row md:flex-col items-center sm:items-end gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E8DDD7]">
                    {isAttended ? (
                      <Link to="/app/badges" className="w-full md:w-auto">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="w-full md:w-auto"
                        >
                          View Badges
                        </Button>
                      </Link>
                    ) : null}

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
                        Pass Record
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
                const isPassed = Boolean(ticket.isExpired || isEventPassed((ticket as any).rawEventDate || ticket.eventDate || ticket.expiresAt));
                const isAttended = ticket.status === 'Checked in' || ticket.status === 'Used';

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
                        {isAttended ? (
                          <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>
                            Attended • Badge Earned
                          </Badge>
                        ) : isPassed ? (
                          <Badge variant="secondary" icon={<Clock className="w-3 h-3 text-[#756366]" />}>
                            Pass Expired • Event Concluded
                          </Badge>
                        ) : (
                          <Badge variant="success" icon={<ShieldCheck className="w-3 h-3" />}>
                            {ticket.status === 'Valid' ? 'Valid for Entry' : ticket.status}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Main Content: QR Code Left + Details Right */}
                    <div className="p-6 flex flex-col md:flex-row items-center md:items-stretch gap-6">
                      {/* Live Dynamic QR Code Section (Clickable to open Attendee Box) */}
                      <div
                        onClick={() => setSelectedAttendeeTicket(ticket)}
                        title="Click QR Code to view Attendee Information Box"
                        className="flex flex-col items-center justify-center p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] shrink-0 text-center w-full md:w-auto cursor-pointer hover:border-[#63474D] hover:shadow-md transition-all group"
                      >
                        <div className="bg-white p-3 rounded-xl border border-[#E8DDD7] shadow-2xs group-hover:scale-105 transition-transform relative">
                          <QRCodeSVG
                            value={ticket.attendeeName || 'Attendee'}
                            size={160}
                            bgColor="#ffffff"
                            fgColor="#2D1F23"
                            level="M"
                            includeMargin={false}
                            className={isPassed && !isAttended ? 'opacity-30 grayscale' : ''}
                          />
                          {isPassed && !isAttended && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-white/70 backdrop-blur-[1px] rounded-xl">
                              <span className="text-[10px] font-bold text-[#8C2838] bg-[#8C2838]/10 px-2 py-0.5 rounded-full border border-[#8C2838]/20 shadow-xs">
                                Pass Expired
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2.5 text-center w-full max-w-[180px]">
                          <span className="text-[10px] font-bold text-[#63474D] bg-[#63474D]/10 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 group-hover:bg-[#63474D] group-hover:text-white transition-colors">
                            <Sparkles className="w-3 h-3 text-[#FFA686]" />
                            Click QR for Info
                          </span>
                          <p className="text-xs font-bold text-[#2D1F23] truncate mt-1">
                            {ticket.attendeeName}
                          </p>
                          <p className="text-[11px] font-mono font-bold text-[#63474D]">
                            {ticket.ticketCode || 'SHB-PASS'}
                          </p>
                          {isAttended ? (
                            <span className="text-[10px] font-bold text-[#2A7B5F] mt-1 flex items-center justify-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-[#2A7B5F]" />
                              <span>Attended & Verified</span>
                            </span>
                          ) : isPassed ? (
                            <span className="text-[10px] font-bold text-[#756366] mt-1 flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-[#756366]" />
                              <span>Expired at End of Day</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#2A7B5F] mt-1 flex items-center justify-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#2A7B5F]" />
                              <span>Scan to Verify Attendee</span>
                            </span>
                          )}
                        </div>
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
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            {isAttended ? (
                              <div className="flex items-center gap-1.5 text-[#2A7B5F]">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Attendance verified at event door</span>
                              </div>
                            ) : isPassed ? (
                              <div className="flex items-center gap-1.5 text-[#756366]">
                                <Clock className="w-4 h-4 text-[#756366]" />
                                <span>Event concluded. Pass expired at 11:59 PM EAT.</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[#2A7B5F]">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Present live QR at the door for badge accreditation</span>
                              </div>
                            )}
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

      {/* ATTRACTIVE ATTENDEE INFORMATION MODAL BOX */}
      {selectedAttendeeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white rounded-3xl max-w-md w-full border border-[#E8DDD7] shadow-2xl overflow-hidden relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-[#63474D] to-[#43272D] text-white p-6 text-center relative overflow-hidden">
              <button
                onClick={() => setSelectedAttendeeTicket(null)}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-2 mb-3">
                <img src="/logo.webp" alt="Sheeba Logo" className="h-7 w-auto object-contain drop-shadow-xs" />
                <span className="font-serif font-bold text-sm tracking-wider text-white">
                  SHEEBA<span className="text-[#FFA686]">.</span> ATTENDEE PASS
                </span>
              </div>

              <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/60 mx-auto flex items-center justify-center font-serif text-3xl font-bold text-white shadow-inner mb-2">
                {selectedAttendeeTicket.attendeeName ? selectedAttendeeTicket.attendeeName.charAt(0).toUpperCase() : 'A'}
              </div>

              <h3 className="font-serif text-2xl font-bold text-white leading-tight">
                {selectedAttendeeTicket.attendeeName}
              </h3>
              <p className="text-xs text-[#FFA686] font-medium mt-0.5">
                {selectedAttendeeTicket.attendeeEmail}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-[#FAF7F5]">
              <div className="p-4 bg-white rounded-2xl border border-[#E8DDD7] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E8DDD7]">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Pass Code</span>
                  <span className="font-mono font-bold text-[#63474D] bg-[#FAF7F5] px-2.5 py-0.5 rounded-md border border-[#E8DDD7]">
                    {selectedAttendeeTicket.ticketCode || selectedAttendeeTicket.id}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Status</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedAttendeeTicket.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Event</span>
                  <span className="font-bold text-[#2D1F23] truncate max-w-[210px]">{selectedAttendeeTicket.eventTitle}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Date & Time</span>
                  <span className="text-[#2D1F23] font-medium">{selectedAttendeeTicket.eventDate} • {selectedAttendeeTicket.eventTime}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#756366]">Location</span>
                  <span className="text-[#756366] truncate max-w-[210px]">{selectedAttendeeTicket.eventLocation}</span>
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <Link
                  to={`/profile/${selectedAttendeeTicket.attendeeId}`}
                  className="block w-full"
                  onClick={() => setSelectedAttendeeTicket(null)}
                >
                  <Button
                    variant="outline"
                    fullWidth
                    className="border-[#63474D] text-[#63474D] hover:bg-[#63474D]/10 font-bold py-2.5 text-sm"
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    View Attendee Profile
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setSelectedAttendeeTicket(null)}
                  className="border-gray-300 text-gray-700 hover:bg-black/5 text-xs py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
