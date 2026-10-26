import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
import { EventExhibitorsTab } from '../../components/organizer/EventExhibitorsTab';
import {
  Store,
  Calendar,
  MapPin,
  Clock,
  PlusCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const OrganizerExhibitorsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(id || '');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Events & Sort
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const evts = await api.events.getAll(user?.id);
        const myEvents =
          user?.role === 'ADMIN' ? evts : evts.filter((e) => e.organizerId === user?.id || !user?.id);

        const sorted = [...myEvents].sort((a, b) => {
          const stateA = api.getEventTimeStatus(a);
          const stateB = api.getEventTimeStatus(b);
          const stateRank = { ongoing: 1, upcoming: 2, past: 3 };
          if (stateRank[stateA] !== stateRank[stateB]) {
            return stateRank[stateA] - stateRank[stateB];
          }
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setEvents(sorted);

        // Auto-select event: url id, or existing selected, or first in sorted list
        let chosen = sorted.find((e) => e.id === id);
        if (!chosen && selectedEventId) {
          chosen = sorted.find((e) => e.id === selectedEventId);
        }
        if (!chosen && sorted.length > 0) {
          chosen = sorted[0];
        }

        if (chosen) {
          setSelectedEventId(chosen.id);
          setCurrentEvent(chosen);
        }
      } catch (err) {
        console.error('Failed to load events for exhibitors management:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user?.id, user?.role, id]);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    const chosen = events.find((e) => e.id === eventId) || null;
    setCurrentEvent(chosen);
    navigate(`/organizer/exhibitors/${eventId}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-8 bg-gray-200 rounded-xl w-64" />
        <div className="h-24 bg-gray-100 rounded-3xl" />
        <div className="h-96 bg-gray-100 rounded-3xl" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-[#63474D]/10 text-[#63474D] rounded-3xl flex items-center justify-center mx-auto">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="font-serif font-bold text-2xl text-[#2D1F23]">No Events Created Yet</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Create your first event on Sheeba to enable exhibitor applications, configure booth space, and manage vendors.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/organizer/events/create')}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          Create Event
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header & Event Switcher Bar */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#63474D]/10 text-[#63474D] rounded-xl">
                <Store className="w-5 h-5" />
              </span>
              <h1 className="font-serif font-bold text-xl sm:text-2xl text-[#2D1F23] tracking-tight">
                Exhibitors & Booth Management
              </h1>
            </div>
            <p className="text-xs text-gray-500">
              Configure exhibitor calls, review booth applications, manage floor space, and roster vendors.
            </p>
          </div>

          {/* Event Dropdown Selector */}
          <div className="relative shrink-0 sm:w-72">
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Active Event
            </label>
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs font-bold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] pr-9 cursor-pointer truncate"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.date})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selected Event Quick Meta Strip */}
        {currentEvent && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#756366]">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#AA767C]" />
              <span>{currentEvent.date}</span>
            </span>
            {currentEvent.location && (
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#AA767C]" />
                <span>
                  {currentEvent.location} {currentEvent.venueName ? `(${currentEvent.venueName})` : ''}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#AA767C]" />
              <span>{currentEvent.time || `${currentEvent.startTime} - ${currentEvent.endTime}`}</span>
            </span>
          </div>
        )}
      </div>

      {/* Embedded Exhibitor Tab Content */}
      {selectedEventId && currentEvent && (
        <EventExhibitorsTab
          eventId={selectedEventId}
          eventTitle={currentEvent.title}
        />
      )}
    </div>
  );
};
