import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
import type { IExhibitorCall } from '../../types/exhibitor';
import { EventExhibitorsTab } from '../../components/organizer/EventExhibitorsTab';
import {
  Store,
  Calendar,
  MapPin,
  Clock,
  PlusCircle,
  ChevronDown,
  ArrowLeft,
  Search,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface EventWithCallData {
  event: Event;
  call: (IExhibitorCall & {
    stats?: {
      confirmedCount: number;
      totalSpaceAllocated: number;
      totalSpaceRemaining: number;
    };
  }) | null;
  isOpen: boolean;
}

export const OrganizerExhibitorsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [eventsWithCall, setEventsWithCall] = useState<EventWithCallData[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab filter for list view: 'open' | 'not_open'
  const [activeTab, setActiveTab] = useState<'open' | 'not_open'>('open');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Events & their Exhibitor Call status
  const fetchAllEventsAndCalls = async () => {
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

      // Fetch calls in parallel for all events
      const callResults = await Promise.all(
        sorted.map(async (evt) => {
          try {
            const call = await api.exhibitors.getCall(evt.id);
            const isOpen = Boolean(call && call.isEnabled && call.status === 'open');
            return {
              event: evt,
              call,
              isOpen,
            };
          } catch {
            return {
              event: evt,
              call: null,
              isOpen: false,
            };
          }
        })
      );

      setEventsWithCall(callResults);

      if (id) {
        const matched = sorted.find((e) => e.id === id);
        setCurrentEvent(matched || null);
      } else {
        setCurrentEvent(null);
      }
    } catch (err) {
      console.error('Failed to load events for exhibitors management:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEventsAndCalls();
  }, [user?.id, user?.role, id]);

  const handleSelectEvent = (eventId: string) => {
    navigate(`/organizer/exhibitors/${eventId}`);
  };

  const handleBackToList = () => {
    navigate('/organizer/exhibitors');
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

  if (eventsWithCall.length === 0) {
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

  // -------------------------------------------------------------
  // VIEW 1: EVENT DETAIL VIEW (when `id` is present in route params)
  // -------------------------------------------------------------
  if (id && currentEvent) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Top Header with Back Navigation & Event Switcher */}
        <div className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBackToList}
                  icon={<ArrowLeft className="w-4 h-4" />}
                  className="!px-3 !py-1.5 text-xs font-semibold text-[#63474D] border-[#E8DDD7] hover:bg-[#FAF7F5]"
                >
                  Back to All Events
                </Button>
                <div className="h-4 w-px bg-gray-200" />
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1.5 bg-[#63474D]/10 text-[#63474D] rounded-xl shrink-0">
                    <Store className="w-4 h-4" />
                  </span>
                  <h1 className="font-serif font-bold text-lg sm:text-xl text-[#2D1F23] tracking-tight truncate">
                    {currentEvent.title}
                  </h1>
                </div>
              </div>
            </div>

            {/* Event Dropdown Quick Switcher */}
            <div className="relative shrink-0 sm:w-64">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                Switch Event
              </label>
              <div className="relative">
                <select
                  value={id}
                  onChange={(e) => handleSelectEvent(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs font-bold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] pr-9 cursor-pointer truncate"
                >
                  {eventsWithCall.map(({ event }) => (
                    <option key={event.id} value={event.id}>
                      {event.title} ({event.date})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Selected Event Quick Meta Strip */}
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
        </div>

        {/* Embedded Full Exhibitor Management Tab */}
        <EventExhibitorsTab
          eventId={id}
          eventTitle={currentEvent.title}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: EVENT SELECTION LIST VIEW (Default when no `:id` selected)
  // -------------------------------------------------------------
  const openEvents = eventsWithCall.filter((item) => item.isOpen);
  const notOpenEvents = eventsWithCall.filter((item) => !item.isOpen);

  const displayedList = activeTab === 'open' ? openEvents : notOpenEvents;

  const filteredList = displayedList.filter(({ event }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(q) ||
      (event.location && event.location.toLowerCase().includes(q)) ||
      (event.venueName && event.venueName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-6 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-[#63474D]/10 text-[#63474D] rounded-2xl">
                <Store className="w-6 h-6" />
              </span>
              <h1 className="font-serif font-bold text-2xl text-[#2D1F23] tracking-tight">
                Exhibitors & Booth Management
              </h1>
            </div>
            <p className="text-xs text-gray-500">
              Select an event below to configure booth space, set pricing per square meter, review vendor applications, and manage exhibition rosters.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/organizer/events/create')}
            icon={<PlusCircle className="w-4 h-4" />}
            className="shrink-0"
          >
            Create Event
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Two Filters: Open to Exhibitors vs Not Open */}
        <div className="flex items-center gap-2 p-1 bg-white border border-[#E8DDD7] rounded-2xl w-fit shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'open'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-gray-500 hover:text-[#2D1F23] hover:bg-gray-50'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'open' ? 'text-emerald-300' : 'text-gray-400'}`} />
            <span>Events Open to Exhibitors</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'open' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {openEvents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('not_open')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'not_open'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-gray-500 hover:text-[#2D1F23] hover:bg-gray-50'
            }`}
          >
            <Sliders className={`w-3.5 h-3.5 ${activeTab === 'not_open' ? 'text-amber-300' : 'text-gray-400'}`} />
            <span>Events Not Open to Exhibitors</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'not_open' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {notOpenEvents.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] shadow-2xs"
          />
        </div>
      </div>

      {/* Events Grid */}
      {filteredList.length === 0 ? (
        <div className="bg-white border border-[#E8DDD7] rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base text-[#2D1F23]">
            {activeTab === 'open'
              ? 'No Events Currently Open to Exhibitors'
              : 'No Events In This Category'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {activeTab === 'open'
              ? 'None of your events are currently accepting booth applications. Switch to "Events Not Open to Exhibitors" to configure and open exhibitor calls.'
              : 'All your events currently have active exhibitor calls open.'}
          </p>
          {activeTab === 'open' && notOpenEvents.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('not_open')}
              className="mt-2"
            >
              View Events Not Open ({notOpenEvents.length})
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map(({ event, call, isOpen }) => {
            const confirmedCount = call?.stats?.confirmedCount || 0;
            const maxExhibitors = call?.maxExhibitors || 10;
            const totalSpace = call?.totalSpaceSqm || 0;
            const spaceAllocated = call?.stats?.totalSpaceAllocated || 0;
            const spaceRemaining = Math.max(0, totalSpace - spaceAllocated);
            const basePrice = call?.pricePerSqm || 0;
            const cutPercent = call?.sheebaCutPercent || 30;
            const exhibitorPrice = Math.round(basePrice * (1 + cutPercent / 100));

            return (
              <div
                key={event.id}
                className="bg-white border border-[#E8DDD7] rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Event Banner / Poster Header */}
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-gray-100">
                    {event.posterImageUrl || event.bannerUrl ? (
                      <img
                        src={event.posterImageUrl || event.bannerUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#63474D]/20 via-[#AA767C]/15 to-[#FAF7F5] flex items-center justify-center">
                        <Store className="w-10 h-10 text-[#63474D]/40" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/95 text-white backdrop-blur-xs shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Open to Exhibitors
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-800/80 text-white backdrop-blur-xs shadow-xs">
                          Exhibitors Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1.5">
                    <h3 className="font-serif font-bold text-base text-[#2D1F23] group-hover:text-[#63474D] transition-colors line-clamp-1">
                      {event.title}
                    </h3>
                    <div className="space-y-1 text-xs text-[#756366]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#AA767C] shrink-0" />
                        <span className="truncate">{event.date}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#AA767C] shrink-0" />
                          <span className="truncate">
                            {event.location} {event.venueName ? `(${event.venueName})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exhibitor Quick Stats Strip */}
                  {isOpen ? (
                    <div className="bg-[#FAF7F5] border border-[#E8DDD7]/60 rounded-2xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">
                            Floor Space
                          </span>
                          <span className="font-bold text-[#2D1F23]">
                            {totalSpace} m²
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            {spaceRemaining} m² free
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">
                            Vendors
                          </span>
                          <span className="font-bold text-[#2D1F23]">
                            {confirmedCount} / {maxExhibitors} max
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            Confirmed
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-medium">
                          {call?.isPaid === false || (call as any)?.is_paid === false || call?.pricingMode === 'free' ? 'Exhibition Fee:' : 'Base Price:'}
                        </span>
                        {call?.isPaid === false || (call as any)?.is_paid === false || call?.pricingMode === 'free' ? (
                          <span className="font-bold text-emerald-700">
                            Free / Complimentary
                          </span>
                        ) : (
                          <span className="font-bold text-[#2D1F23]">
                            {basePrice.toLocaleString()} ETB/m²
                            <span className="text-[10px] text-gray-400 font-normal ml-1">
                              ({exhibitorPrice.toLocaleString()} ETB to vendor)
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/60 border border-amber-200/50 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Not visible to exhibitors</span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 leading-relaxed">
                        Exhibitor applications are disabled. Click below to configure booth space, pricing, and open applications.
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Button */}
                <div className="pt-4 mt-2">
                  <Button
                    variant={isOpen ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth
                    onClick={() => handleSelectEvent(event.id)}
                    icon={isOpen ? <ArrowRight className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
                    className="justify-center"
                  >
                    {isOpen ? 'Manage Exhibitors & Booths' : 'Configure & Open Exhibitors'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
