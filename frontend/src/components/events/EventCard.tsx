import React from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../types/event';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface EventCardProps {
  event: Event;
  isRegistered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, isRegistered }) => {
  const availableSeats = event.capacity - event.registeredCount;
  const isFull = availableSeats <= 0 || event.status === 'closed';

  return (
    <div className="bg-white rounded-3xl border border-[#E8DDD7] shadow-xs hover:border-[#63474D] transition-all flex flex-col overflow-hidden group">
      {event.bannerUrl && (
        <div className="relative h-44 overflow-hidden bg-gray-100">
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4 justify-between">
            <Badge variant="primary" className="uppercase font-mono text-[10px]">
              {event.type}
            </Badge>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md bg-black/60 text-white">
              {event.isPaid ? `${event.ticketPrice} ETB` : 'FREE'}
            </span>
          </div>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-[#756366]">
            <span className="font-semibold text-[#2D1F23] truncate">{event.organizerName}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#63474D] flex-shrink-0" />
          </div>

          <Link to={`/e/${event.shareLinkToken}`}>
            <h3 className="font-serif font-bold text-lg text-[#2D1F23] group-hover:text-[#63474D] transition-colors line-clamp-1">
              {event.title}
            </h3>
          </Link>

          <p className="text-xs text-[#756366] line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        <div className="pt-3 border-t border-[#E8DDD7] space-y-2 text-xs text-[#2D1F23]">
          <div className="flex items-center gap-2 text-[#756366]">
            <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain shrink-0" />
            <span className="truncate">{event.date} • {event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-[#756366]">
            <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <div className="pt-2">
          {isRegistered ? (
            <Link to={`/app/ticket/${event.id}`} className="w-full block">
              <Button fullWidth size="sm" variant="accent" icon={<ShieldCheck className="w-4 h-4" />}>
                View Ticket Pass
              </Button>
            </Link>
          ) : (
            <Link to={`/e/${event.shareLinkToken}`} className="w-full block">
              <Button
                fullWidth
                size="sm"
                variant={isFull ? 'ghost' : 'primary'}
                icon={<ArrowRight className="w-4 h-4" />}
                disabled={isFull}
              >
                {isFull ? 'Registration Closed' : 'Register for Event'}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
