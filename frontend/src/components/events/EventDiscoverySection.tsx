import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Event, EventType } from '../../types/event';
import type { Ticket } from '../../types/ticket';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Ticket as TicketIcon,
  CheckCircle2,
  Share2,
  Filter,
} from 'lucide-react';

interface EventDiscoverySectionProps {
  onViewTicket?: (ticket: Ticket) => void;
  registeredEventIds?: string[];
  limit?: number;
  showHeader?: boolean;
}

export const EventDiscoverySection: React.FC<EventDiscoverySectionProps> = ({
  registeredEventIds = [],
  limit,
  showHeader = true,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicized = async () => {
      setLoading(true);
      try {
        const data = await api.events.getDiscoveryEvents();
        // Only show upcoming / ongoing open events
        const activeEvents = data.filter((e) => !e.isPassed && e.status !== 'canceled');
        setEvents(activeEvents);
      } catch (err) {
        console.error('Failed to load discovery events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicized();
  }, []);

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/e/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRegisterClick = (event: Event) => {
    const registerPath = `/e/${event.shareLinkToken}/register`;
    if (!isAuthenticated) {
      navigate(`/register?redirect=${encodeURIComponent(registerPath)}`);
    } else {
      navigate(registerPath);
    }
  };

  // Filter events by search and type
  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.organizerName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedType === 'All' || evt.type?.toLowerCase() === selectedType.toLowerCase();

    return matchesSearch && matchesType;
  });

  const displayedEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8DDD7] pb-5">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
              Upcoming Events
            </h2>
            <p className="text-xs sm:text-sm text-[#756366] max-w-xl">
              Explore verified gatherings, workshops, and summits publicized on Sheeba.
              Register in seconds and claim your verifiable attendance pass.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#AA767C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events, cities, topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] placeholder-[#AA767C] focus:outline-none focus:ring-2 focus:ring-[#63474D] shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[#756366] flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </span>
        {['All', 'Workshop', 'Hackathon', 'Meetup', 'Summit'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedType === type
                ? 'bg-[#63474D] text-white shadow-2xs scale-105'
                : 'bg-white text-[#756366] border border-[#E8DDD7] hover:bg-[#FAF7F5]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] overflow-hidden min-h-[340px] p-6 flex flex-col justify-between animate-pulse"
            >
              <div className="flex justify-between">
                <div className="h-6 w-24 bg-[#E8DDD7] rounded-full" />
                <div className="h-6 w-16 bg-[#E8DDD7] rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-[#E8DDD7] rounded-md w-1/3" />
                <div className="h-6 bg-[#E8DDD7] rounded-md w-3/4" />
                <div className="h-3 bg-[#E8DDD7] rounded-md w-1/2" />
                <div className="h-10 bg-[#E8DDD7] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F5ECE8] text-[#AA767C] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#2D1F23]">No Upcoming Publicized Events Right Now</h3>
          <p className="text-xs text-[#756366] max-w-md mx-auto leading-relaxed">
            {searchTerm || selectedType !== 'All'
              ? 'No publicized events matched your search filter. Try clearing filters.'
              : 'There are no events publicized on the landing page yet. When organizers enable "Publicize in Sheeba", their upcoming events will appear right here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedEvents.map((evt) => {
            const isRegistered = registeredEventIds.includes(evt.id);
            const isFull = evt.isFull || (evt.registeredCount >= evt.capacity);
            const poster = evt.posterImageUrl || evt.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

            return (
              <div
                key={evt.id}
                className="group relative bg-[#2D1F23] rounded-2xl border border-[#E8DDD7] hover:border-[#AA767C] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 min-h-[350px] sm:min-h-[370px] flex flex-col justify-between"
              >
                {/* Background Poster Image */}
                <img
                  src={poster}
                  alt={evt.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Light top vignette for badge contrast */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

                {/* Bottom-only fade so the poster stays vibrant while description texts remain crisp */}
                <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/95 via-black/65 to-transparent pointer-events-none" />

                {/* Top Badges Bar */}
                <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {evt.type || 'Event'}
                    </span>

                    {isRegistered && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A7B5F] text-white text-[10px] font-bold shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Registered</span>
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                      evt.isPaid
                        ? 'bg-[#FFA686] text-[#2D1F23]'
                        : 'bg-[#2A7B5F] text-white'
                    }`}
                  >
                    {evt.isPaid ? `${evt.ticketPrice} ETB` : 'FREE'}
                  </span>
                </div>

                {/* Bottom Content Area Overlaid On Fade */}
                <div className="relative z-10 p-5 sm:p-6 space-y-2.5">
                  {/* Date & Time */}
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#FFA686]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FFA686]" />
                      <span className="text-white/95">{evt.date}</span>
                    </div>
                    <span className="text-white/40">•</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FFA686]" />
                      <span className="text-white/95">{evt.startTime || '09:00 AM'}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-white group-hover:text-[#FFA686] transition-colors leading-snug line-clamp-2">
                    {evt.title}
                  </h3>

                  {/* Organizer & Location */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
                    <p className="font-medium truncate max-w-[55%]">
                      By {evt.organizationName || evt.organizerName || 'Community Lead'}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-white/70 truncate max-w-[42%]">
                      <MapPin className="w-3 h-3 text-[#FFA686] shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-white/70 mb-1">
                      <span>Capacity</span>
                      <span>
                        {evt.registeredCount} / {evt.capacity} registered
                      </span>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull ? 'bg-red-400' : 'bg-emerald-400'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((evt.registeredCount / Math.max(1, evt.capacity)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-3">
                    {isRegistered ? (
                      <Link
                        to={`/app/ticket/${evt.id}`}
                        className="px-4 sm:px-5 py-2 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer"
                      >
                        <TicketIcon className="w-3.5 h-3.5" />
                        <span>View Ticket Pass</span>
                      </Link>
                    ) : isFull ? (
                      <button
                        type="button"
                        disabled
                        className="px-4 sm:px-5 py-2 bg-white/10 rounded-xl text-xs font-bold text-white/40 border border-white/10 cursor-not-allowed"
                      >
                        Capacity Reached (Sold Out)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRegisterClick(evt)}
                        className="px-4 sm:px-5 py-2 bg-[#63474D] hover:bg-[#7b5760] text-white border border-[#AA767C]/40 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                      >
                        <span>{isAuthenticated ? 'Register Now' : 'Sign Up to Register'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Share / Copy Link Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(evt.shareLinkToken, e)}
                      title="Copy Share Link"
                      className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white backdrop-blur-md transition-colors cursor-pointer shrink-0"
                    >
                      {copiedId === evt.shareLinkToken ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
