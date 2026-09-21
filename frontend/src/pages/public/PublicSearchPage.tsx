import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types/user';
import type { Event } from '../../types/event';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Search as SearchIcon,
  User as UserIcon,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  Filter,
} from 'lucide-react';

export const PublicSearchPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [attendees, setAttendees] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'events' | 'attendees'>('events');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults('');
    fetchUserTickets();
  }, [user]);

  const fetchUserTickets = async () => {
    if (!user) {
      setRegisteredEventIds(new Set());
      return;
    }
    try {
      const tickets = await api.registration.getMyTickets(user.id);
      const ids = new Set(tickets.map((t) => t.eventId));
      setRegisteredEventIds(ids);
    } catch (e) {
      console.warn('Failed to fetch user tickets:', e);
    }
  };

  const fetchResults = async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await api.search.searchPublic(searchQuery);
      setAttendees(res.attendees);
      setEvents(res.events);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults(query);
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedType === 'all') return true;
    return ev.type.toLowerCase() === selectedType.toLowerCase();
  });

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <Badge variant="tertiary" icon={<Sparkles className="w-3.5 h-3.5" />}>
          Community Registry & Directory
        </Badge>
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#2D1F23]">
          Explore Events & Profiles
        </h1>
        <p className="text-xs sm:text-sm text-[#756366]">
          Discover upcoming workshops, hackathons, and meetups in Ethiopia.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756366]" />
          <input
            type="text"
            placeholder="Search by event title, organizer, location, or attendee name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              fetchResults(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-3 bg-white border border-[#E8DDD7] rounded-2xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] shadow-xs"
          />
        </div>
        <Button type="submit" variant="primary" size="md">
          Search
        </Button>
      </form>

      {/* Main Switch Tabs: Events vs Attendees */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#E8DDD7] pb-3">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'events'
                ? 'border-[#63474D] text-[#63474D]'
                : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain" />
            All Events ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('attendees')}
            className={`pb-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'attendees'
                ? 'border-[#63474D] text-[#63474D]'
                : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Verified Attendees ({attendees.length})
          </button>
        </div>

        {/* Category Filters (when on events tab) */}
        {activeTab === 'events' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#756366] mr-1" />
            {['all', 'workshop', 'meetup', 'hackathon'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                  selectedType === type
                    ? 'bg-[#63474D] text-white'
                    : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-[#E8DDD7]/50 rounded-3xl"></div>
          ))}
        </div>
      ) : activeTab === 'events' ? (
        filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#E8DDD7] space-y-3 shadow-xs">
            <img src="/calendar.webp" alt="Calendar" className="w-12 h-12 object-contain mx-auto" />
            <h3 className="font-serif text-lg font-bold text-[#2D1F23]">No Events Found</h3>
            <p className="text-xs text-[#756366]">
              Try adjusting your search terms or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs hover:shadow-md hover:border-[#63474D] transition-all flex flex-col justify-between group"
              >
                {ev.bannerUrl && (
                  <div className="h-40 w-full overflow-hidden relative bg-[#FAF7F5]">
                    <img
                      src={ev.bannerUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge variant="primary" className="uppercase font-mono text-[10px] shadow-sm">
                        {ev.type}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-[#63474D] shadow-sm">
                        {ev.isPaid ? `${ev.ticketPrice} ETB` : 'FREE'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h2 className="font-serif font-bold text-lg text-[#2D1F23] group-hover:text-[#63474D] transition-colors leading-snug">
                      {ev.title}
                    </h2>
                    <p className="text-xs font-semibold text-[#AA767C]">
                      Hosted by {ev.organizerName}
                    </p>
                    {ev.description && (
                      <p className="text-xs text-[#756366] line-clamp-2 leading-relaxed">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-[#E8DDD7]">
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#756366]">
                      <div className="flex items-center gap-1.5">
                        <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain shrink-0" />
                        <span>{ev.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#63474D]" />
                        <span>{ev.time || `${ev.startTime} - ${ev.endTime}`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                        <span className="truncate">{ev.venueName || ev.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#756366] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#63474D]" />
                        {ev.registeredCount} / {ev.capacity} spots taken
                      </span>
                      {registeredEventIds.has(ev.id) ? (
                        <Link to={`/app/events`}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2A7B5F] text-white text-xs font-bold hover:bg-[#22634d] transition-all shadow-xs cursor-pointer"
                          >
                            <img src="/tick.webp" alt="Registered" className="w-3.5 h-3.5 object-contain" />
                            <span>Registered</span>
                          </button>
                        </Link>
                      ) : ev.registeredCount >= ev.capacity || ev.status === 'closed' ? (
                        <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold">
                          Capacity Full
                        </span>
                      ) : (
                        <Link to={`/e/${ev.shareLinkToken || ev.id}`}>
                          <Button variant="accent" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Register / Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : attendees.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E8DDD7] space-y-3 shadow-xs">
          <UserIcon className="w-12 h-12 text-[#AA767C] mx-auto" />
          <h3 className="font-serif text-lg font-bold text-[#2D1F23]">No Attendees Found</h3>
          <p className="text-xs text-[#756366]">No public attendee profiles matched your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attendees.map((att) => (
            <Link
              key={att.id}
              to={`/profile/${att.id}`}
              className="bg-white p-5 rounded-2xl border border-[#E8DDD7] hover:border-[#63474D] transition-all shadow-xs flex items-center justify-between group block"
            >
              <div className="flex items-center gap-3">
                <img
                  src={att.avatarUrl}
                  alt={att.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#D6A184]"
                />
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23] group-hover:text-[#63474D]">
                    {att.name}
                  </h3>
                  <p className="text-[11px] text-[#756366]">
                    {att.stats?.totalEventsAttended || 14} Verified Events Attended
                  </p>
                  <p className="text-[10px] text-[#AA767C] font-semibold">
                    {att.role} • Public Profile
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#756366] group-hover:text-[#63474D] transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
