import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  QrCode,
  PlusCircle,
  Copy,
  Clock,
  ChevronRight,
} from 'lucide-react';

export const OrganizerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const evts = await api.events.getAll(user?.id);
        setEvents(evts);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/e/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Section 2: Date-derived event status (Ongoing / Upcoming / Past)
  const getEventTimeState = (evt: Event): 'ongoing' | 'upcoming' | 'past' => {
    return api.getEventTimeStatus(evt);
  };

  // Section 2: Sort order
  // 1. Ongoing events first
  // 2. Upcoming events next, soonest date first
  // 3. Past events last, most recently ended first
  const sortedEvents = [...events].sort((a, b) => {
    const stateA = getEventTimeState(a);
    const stateB = getEventTimeState(b);

    const stateRank = { ongoing: 1, upcoming: 2, past: 3 };
    if (stateRank[stateA] !== stateRank[stateB]) {
      return stateRank[stateA] - stateRank[stateB];
    }

    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();

    if (stateA === 'upcoming') {
      return dateA - dateB; // Soonest first
    }

    if (stateA === 'past') {
      return dateB - dateA; // Most recently ended first
    }

    return dateA - dateB;
  });

  // Section 2: Count label formatting
  const getCountLabel = (evt: Event, state: 'ongoing' | 'upcoming' | 'past') => {
    const reg = evt.registeredCount || 0;
    const checked = evt.checkedInCount || 0;
    if (state === 'upcoming') {
      return `${reg} registered`;
    }
    if (state === 'ongoing') {
      return `${reg} registered · ${checked} checked in`;
    }
    return `${reg} registered · ${checked} attended`;
  };

  const totalEvents = events.length;
  const activeEvents = events.filter((e) => getEventTimeState(e) === 'ongoing' || getEventTimeState(e) === 'upcoming').length;
  const totalRegistrations = events.reduce((acc, curr) => acc + (curr.registeredCount || 0), 0);
  const totalCheckIns = events.reduce((acc, curr) => acc + (curr.checkedInCount || 0), 0);

  return (
    <div className="space-y-6 pb-16 w-full">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D1F23]">
            {user?.organization || 'GDG Addis'}
          </h1>
          <p className="text-xs text-gray-500 font-light">
            Organizer Dashboard • Verified attendance, door check-in, and authentic badge issuance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link to="/organizer/check-in">
            <Button variant="accent" size="sm" icon={<QrCode className="w-4 h-4" />}>
              Door Check-in
            </Button>
          </Link>
          <Link to="/organizer/events/create">
            <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
              Create Event
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Main Area: Your Events (left) + Unboxed Metrics (right) */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Left: Your Events List */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#2D1F23]">Your Events</h2>
            <span className="text-xs text-gray-500 font-medium">
              {sortedEvents.length} event{sortedEvents.length === 1 ? '' : 's'} (Sorted: Ongoing → Upcoming → Past)
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-2xl"></div>
              ))}
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
                <img src="/calendar.webp" alt="Calendar" className="w-7 h-7 object-contain" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No Events Created Yet</h3>
                <p className="text-xs text-[#756366] max-w-sm mx-auto">
                  Create your first single-day workshop, hackathon, or meetup to accept registrations, check people in, and award badges.
                </p>
              </div>
              <Link to="/organizer/events/create">
                <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                  Create Your First Event
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {sortedEvents.map((evt) => {
                const state = getEventTimeState(evt);
                const countLabel = getCountLabel(evt, state);
                const posterImage = evt.posterImageUrl || evt.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80';

                return (
                  <div
                    key={evt.id}
                    onClick={() => navigate(`/organizer/events/${evt.id}`)}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:border-[#63474D] hover:shadow-xs transition-all overflow-hidden flex flex-row items-stretch cursor-pointer group h-28 sm:h-28"
                  >
                    {/* Left Poster Image Container (Flexible container, fully visible image) */}
                    <div className="w-28 sm:w-36 md:w-44 h-full shrink-0 overflow-hidden bg-[#FAF7F5] border-r border-gray-100 flex items-center justify-center p-2">
                      <img
                        src={posterImage}
                        alt={evt.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 rounded-lg"
                      />
                    </div>

                    {/* Rest of the Row */}
                    <div className="flex-1 px-3.5 sm:px-4 py-2 flex flex-col justify-between min-w-0">
                      {/* Top Row: Event Title + Link copy button */}
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-serif font-bold text-sm sm:text-base text-[#2D1F23] group-hover:text-[#63474D] transition-colors truncate">
                          {evt.title}
                        </h3>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(evt.shareLinkToken, e)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF7F5] border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-[#2D1F23] transition-colors cursor-pointer"
                            title="Copy Registration Link"
                          >
                            {copiedId === evt.shareLinkToken ? (
                              <>
                                <img src="/tick.webp" alt="Copied" className="w-3.5 h-3.5 object-contain shrink-0" />
                                <span className="text-[11px] text-[#2A7B5F]">copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#AA767C]" />
                                <span className="text-[11px]">link</span>
                              </>
                            )}
                          </button>

                          <div className="hidden sm:flex items-center text-[#AA767C] group-hover:text-[#63474D] group-hover:translate-x-0.5 transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Below: Workshop/type, Upcoming/state, and registered ppl count */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary" className="uppercase font-mono text-[9px] py-0.5 px-2">
                          {evt.type}
                        </Badge>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            state === 'ongoing'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                              : state === 'upcoming'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {state === 'ongoing' ? '● Ongoing Today' : state === 'upcoming' ? 'Upcoming' : 'Past Event'}
                        </span>
                        <span className="text-xs font-semibold text-[#63474D]">
                          {countLabel}
                        </span>
                      </div>

                      {/* Date, hour (time), and place (location) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-[#756366] font-normal pt-1 border-t border-gray-100">
                        <span className="flex items-center gap-1">
                          <img src="/calendar.webp" alt="Calendar" className="w-3 h-3 object-contain shrink-0" />
                          {evt.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#AA767C]" />
                          {evt.time || `${evt.startTime} - ${evt.endTime}`}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                          {evt.location}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Small Unboxed Overview Metrics (aligned together based on furthest label) */}
        <div className="w-full lg:w-48 xl:w-56 shrink-0 pt-1">
          <div className="grid grid-cols-[max-content_auto] gap-x-2.5 gap-y-2 text-xs items-baseline">
            <span className="text-[#756366] font-medium">Total events:</span>
            <span className="font-bold text-[#2D1F23] text-sm">{totalEvents}</span>

            <span className="text-[#756366] font-medium">Upcoming:</span>
            <span className="font-bold text-[#2D1F23] text-sm">{activeEvents}</span>

            <span className="text-[#756366] font-medium">Total Registrations:</span>
            <span className="font-bold text-[#2D1F23] text-sm">{totalRegistrations}</span>

            <span className="text-[#756366] font-medium">Verified attendance:</span>
            <span className="font-bold text-[#2A7B5F] text-sm">{totalCheckIns}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
