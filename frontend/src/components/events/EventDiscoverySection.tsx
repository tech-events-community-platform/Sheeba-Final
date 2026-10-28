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
  Users,
  Tag,
  ArrowRight,
  Sparkles,
  Ticket as TicketIcon,
  CheckCircle2,
  Share2,
  ExternalLink,
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4EF] text-[#2A7B5F] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upcoming Events on Sheeba</span>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden p-4 space-y-3 animate-pulse"
            >
              <div className="h-44 bg-[#F5ECE8] rounded-2xl" />
              <div className="h-4 bg-[#F5ECE8] rounded-md w-3/4" />
              <div className="h-3 bg-[#F5ECE8] rounded-md w-1/2" />
              <div className="h-8 bg-[#F5ECE8] rounded-xl" />
            </div>
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="bg-[#FAF7F5] border border-[#E8DDD7] rounded-3xl p-10 text-center space-y-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEvents.map((evt) => {
            const isRegistered = registeredEventIds.includes(evt.id);
            const isFull = evt.isFull || (evt.registeredCount >= evt.capacity);
            const poster = evt.posterImageUrl || evt.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

            return (
              <div
                key={evt.id}
                className="group bg-white rounded-3xl border border-[#E8DDD7] hover:border-[#AA767C]/50 hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden relative"
              >
                {/* Poster Image */}
                <div className="relative h-44 w-full overflow-hidden bg-[#2D1F23]">
                  <img
                    src={poster}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {evt.type || 'Event'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                        evt.isPaid
                          ? 'bg-[#FFA686] text-[#2D1F23]'
                          : 'bg-[#2A7B5F] text-white'
                      }`}
                    >
                      {evt.isPaid ? `${evt.ticketPrice} ETB` : 'FREE'}
                    </span>
                  </div>

                  {/* Registered indicator badge on top of image */}
                  {isRegistered && (
                    <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A7B5F] text-white text-xs font-bold shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Registered</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Date & Time */}
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#63474D]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#AA767C]" />
                        <span>{evt.date}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#AA767C]" />
                        <span>{evt.startTime || '09:00 AM'}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif font-bold text-base text-[#2D1F23] line-clamp-2 leading-snug group-hover:text-[#63474D] transition-colors">
                      {evt.title}
                    </h3>

                    {/* Organizer & Location */}
                    <div className="space-y-1 text-xs text-[#756366]">
                      <p className="font-medium text-[#2D1F23] truncate">
                        By {evt.organizationName || evt.organizerName || 'Community Lead'}
                      </p>
                      <div className="flex items-center gap-1 truncate text-[11px]">
                        <MapPin className="w-3 h-3 text-[#AA767C] shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    </div>

                    {/* Spots remaining progress */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#756366] mb-1">
                        <span>Capacity</span>
                        <span>
                          {evt.registeredCount} / {evt.capacity} registered
                        </span>
                      </div>
                      <div className="w-full bg-[#FAF7F5] border border-[#E8DDD7] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull ? 'bg-red-500' : 'bg-[#2A7B5F]'
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
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                    {isRegistered ? (
                      <Link
                        to={`/app/ticket/${evt.id}`}
                        className="flex-1 py-2.5 px-3 bg-[#FAF7F5] hover:bg-[#F5ECE8] border border-[#E8DDD7] rounded-xl text-xs font-bold text-[#63474D] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <TicketIcon className="w-3.5 h-3.5" />
                        <span>View Ticket Pass</span>
                      </Link>
                    ) : isFull ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-2.5 px-3 bg-gray-100 rounded-xl text-xs font-bold text-gray-400 cursor-not-allowed text-center"
                      >
                        Capacity Reached (Sold Out)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRegisterClick(evt)}
                        className="flex-1 py-2.5 px-3 bg-[#63474D] hover:bg-[#523a3f] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
                      className="p-2.5 bg-white border border-[#E8DDD7] hover:bg-[#FAF7F5] rounded-xl text-[#756366] transition-colors cursor-pointer"
                    >
                      {copiedId === evt.shareLinkToken ? (
                        <CheckCircle2 className="w-4 h-4 text-[#2A7B5F]" />
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
