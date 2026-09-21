import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Ticket } from '../../types/ticket';
import type { Event } from '../../types/event';
import { TicketCard } from '../../components/ticket/TicketCard';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { printTicketPass } from '../../utils/printTicket';

export const TicketPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      if (eventId) {
        const evt = await api.events.getById(eventId);
        setEvent(evt || null);

        if (user) {
          const tickets = await api.registration.getAttendeeTickets(user.id);
          const found = tickets.find((t: Ticket) => t.eventId === eventId);
          setTicket(found || tickets[0] || null);
        }
      }
      setLoading(false);
    };
    fetchTicket();
  }, [eventId, user]);

  const handleDownload = () => {
    if (!ticket) return;
    printTicketPass(`ticket-card-${ticket.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4 animate-pulse">
        <div className="h-96 bg-[#E8DDD7]/50 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full space-y-6 pb-16">
      <div className="flex items-center justify-between no-print">
        <Link
          to="/app/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to QR Wallet
        </Link>
      </div>

      {ticket ? (
        <TicketCard ticket={ticket} onDownload={handleDownload} />
      ) : (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#E8DDD7] space-y-4 shadow-xs">
          <AlertCircle className="w-12 h-12 text-[#AA767C] mx-auto" />
          <h2 className="font-serif text-xl font-bold text-[#2D1F23]">No Ticket Found</h2>
          <p className="text-xs text-[#756366]">
            {event
              ? `You haven't registered for "${event.title}" yet.`
              : 'Please register through the event organizer share link to obtain a dynamic QR pass.'}
          </p>
          <Link to="/search">
            <Button variant="primary" size="sm">
              Search Active Events
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
