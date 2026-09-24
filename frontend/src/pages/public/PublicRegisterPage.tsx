import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  TelegramIcon,
  XIcon,
  TikTokIcon,
  YouTubeIcon,
} from '../../components/ui/SocialIcons';
import { getCalendarTile } from '../../utils/date';

export const PublicRegisterPage: React.FC = () => {
  const { token, id } = useParams<{ token?: string; id?: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  useEffect(() => {
    const fetchEventAndStatus = async () => {
      setLoading(true);
      try {
        let fetched: Event | null = null;
        if (token) {
          fetched = await api.events.getByShareToken(token);
        } else if (id) {
          fetched = await api.events.getById(id);
        }
        setEvent(fetched);

        if (fetched && user) {
          try {
            const ticket = await api.registration.getTicketByEvent(fetched.id, user.id);
            if (ticket) {
              setIsAlreadyRegistered(true);
            }
          } catch {
            // Not registered
          }
        }
      } catch (e) {
        console.error('Failed to load event:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndStatus();
  }, [token, id, user]);

  const organizerSocials = React.useMemo(() => {
    if (event?.organizerSocials) return event.organizerSocials;
    try {
      const stored =
        (event?.organizerId && localStorage.getItem(`sheeba_organizer_socials_${event.organizerId}`)) ||
        localStorage.getItem('sheeba_organizer_socials');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  }, [event]);

  const hasSocials = Boolean(
    organizerSocials &&
    (organizerSocials.telegram ||
      organizerSocials.x ||
      organizerSocials.tiktok ||
      organizerSocials.youtube)
  );





  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-[#E8DDD7]/50 w-2/3 rounded-xl"></div>
          <div className="h-64 bg-[#E8DDD7]/50 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-[#AA767C] mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">Event Not Found</h2>
        <p className="text-xs text-[#756366]">
          This event link may be invalid, closed, or the event was removed by the organizer.
        </p>
        <Link to="/login">
          <Button variant="outline" size="sm">
            Sign In to Sheba
          </Button>
        </Link>
      </div>
    );
  }

  const isFull = Boolean(
    event.isFull || (event.capacity > 0 && event.registeredCount >= event.capacity) || event.status === 'closed'
  );

  const posterImage =
    event.posterImageUrl ||
    event.bannerUrl ||
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

  const cal = getCalendarTile(event.date);
  const eventMonthYear = cal.monthYear;
  const displayOrganization =
    event.organizationName ||
    (event as any).organizer_organization ||
    (event as any).organizerOrganization ||
    (user && (user.role === 'ORGANIZER' || user.id === event.organizerId) && user.organization ? user.organization : '') ||
    (event.organizerName && event.organizerName !== user?.name ? event.organizerName : '') ||
    user?.organization ||
    event.organizerName ||
    'Organization';

  // Modern 2-Column Structure aligned to the left beginning of the floating header pill
  return (
    <div className="w-full pt-2 sm:pt-4 pb-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* LEFT COLUMN: Title, Date/Time, Location, Registration Area, Description */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">

            {/* Event Category & Price Row (Yellow lines) */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="primary" className="uppercase font-mono text-xs sm:text-sm py-1.5 px-4 rounded-xl shadow-xs font-bold">
                {event.type}
              </Badge>
              <span className="text-gray-400 font-bold">•</span>
              <span className="font-extrabold text-base sm:text-lg text-[#1B6B4A] tracking-wide">
                {event.isPaid ? `${event.ticketPrice} ETB` : 'FREE ADMISSION'}
              </span>
            </div>

            {/* Event Title (Orange line - wraps down to middle if long) */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D1F23] tracking-tight leading-tight">
              {event.title}
            </h1>

            {/* Date/Time and Location in side-by-side structures (Blue boxes - fully visible with no ellipsis) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
              {/* Date & Time Structure (Left blue box) */}
              <div className="flex items-start gap-3.5">
                <div className="flex flex-col items-center justify-center shrink-0 text-center w-10 pt-0.5">
                  <span className="text-[11px] font-bold text-[#63474D] uppercase leading-tight tracking-wider">
                    {cal.month}
                  </span>
                  <span className="text-xl font-extrabold text-[#2D1F23] leading-tight">
                    {cal.day}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-[#2D1F23]">
                    {cal.weekday ? `${cal.weekday}, ${cal.fullDate}` : event.date}
                  </p>
                  <p className="text-xs text-[#756366] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#AA767C] shrink-0" />
                    <span>{event.time || `${event.startTime} - ${event.endTime}`}</span>
                  </p>
                </div>
              </div>

              {/* Location Structure (Right blue box - no truncation, full text visible) */}
              <div className="flex items-start gap-3">
                <div className="w-6 flex items-center justify-center shrink-0 pt-0.5">
                  <img src="/location.webp" alt="Location" className="w-5 h-5 object-contain" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#2D1F23] break-words">
                    {event.venueName || event.location}
                  </p>
                  {event.venueName && event.location && event.venueName !== event.location && (
                    <p className="text-xs text-[#756366] break-words leading-relaxed">
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* REGISTRATION SECTION (Red line: Registration divider, welcome message, register button) */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8DDD7]/70">
                <span className="text-xs font-bold uppercase tracking-wider text-[#756366]">
                  Registration
                </span>
                {isFull && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    Registration Full / Closed
                  </span>
                )}
              </div>

              {/* Already Registered State */}
              {isAlreadyRegistered ? (
                <div className="space-y-3 pt-1 text-left">
                  <div className="flex items-center justify-start gap-2 text-xs font-semibold text-emerald-800">
                    <img src="/tick.webp" alt="Done" className="w-5 h-5 object-contain shrink-0" />
                    <span>You are registered for this event!</span>
                  </div>
                  <div className="flex justify-start gap-3 pt-1">
                    <Link to={`/app/ticket/${event.id}`}>
                      <Button variant="primary" size="sm">
                        View Entry Pass
                      </Button>
                    </Link>
                    <Link to="/app/badges">
                      <Button variant="outline" size="sm">
                        View Badges
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Welcome message & Left-aligned Register Button */
                <div className="space-y-3 pt-1">
                  {isAuthenticated && user ? (
                    <div className="space-y-1 text-left">
                      <p className="font-serif text-sm sm:text-base font-bold text-[#2D1F23]">
                        Welcome, {user.name}!
                      </p>
                      {user.role === 'ORGANIZER' && (
                        <p className="text-xs text-[#756366]">
                          Signed in with Organizer account. Registering will link to your personal Attendee profile so you can collect verified badges.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-serif text-sm sm:text-base font-bold text-[#2D1F23] text-left">
                      Welcome! Create an attendee account or sign in to register and earn verifiable badges.
                    </p>
                  )}

                  {isFull ? (
                    <div className="p-3 text-left text-xs font-bold text-gray-500">
                      Registration is full
                    </div>
                  ) : (
                    <div className="flex justify-start pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        className="px-8 py-2.5 text-xs font-bold rounded-xl shadow-xs hover:shadow-sm cursor-pointer"
                        onClick={() => {
                          const targetUrl = token ? `/e/${token}/register` : `/events/${event.id}/register/form`;
                          navigate(targetUrl);
                        }}
                      >
                        Register
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* About Event Description (aligned to the left edge, taking space horizontally to the right) */}
            <div className="pt-2">
              <div className="rounded-2xl overflow-hidden border border-white/25 shadow-sm max-w-3xl">
                {/* Colored row for 'About event' title */}
                <div className="bg-[#63474D] px-6 py-3.5 rounded-t-2xl">
                  <h2 className="font-serif font-bold text-base sm:text-lg text-white">About Event</h2>
                </div>
                {/* 80% see-through glassmorphic card for paragraph with border radius and black text */}
                <div className="bg-white/20 backdrop-blur-md p-6 border-x border-b border-white/25 rounded-b-2xl">
                  <p className="text-xs sm:text-sm text-black font-medium leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Poster Image on Right (Positioned at red box level) + Presented By + Sticky Scrolling */}
          <div className="lg:col-span-5 space-y-4 order-1 lg:order-2 lg:pt-11 lg:sticky lg:top-24 self-start">
            {/* Poster Image Container: positioned in red box, hugging image naturally */}
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-black/20 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center">
              <img
                src={posterImage}
                alt={event.title}
                className="w-full h-auto max-h-[380px] sm:max-h-[420px] object-contain rounded-xl"
              />
            </div>

            {/* Presented By Section: Company/Organization name (not personal name), Month and Year only */}
            <div className="flex items-center justify-between gap-4 pt-1 px-1">
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] uppercase font-bold text-white/80 tracking-wider block">
                  Presented by
                </span>
                <p className="font-bold text-sm sm:text-base text-white truncate">
                  {displayOrganization}
                </p>
                {eventMonthYear && (
                  <span className="text-[11px] sm:text-xs text-white/70 block mt-0.5 font-medium">
                    {eventMonthYear}
                  </span>
                )}
              </div>

              {/* Social icons beside organizer info */}
              {hasSocials && (
                <div className="flex items-center gap-2 shrink-0">
                  {organizerSocials?.telegram && (
                    <a
                      href={
                        organizerSocials.telegram.startsWith('http')
                          ? organizerSocials.telegram
                          : `https://t.me/${organizerSocials.telegram.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors border border-white/30"
                      title="Telegram"
                    >
                      <TelegramIcon className="w-4 h-4" />
                    </a>
                  )}
                  {organizerSocials?.x && (
                    <a
                      href={
                        organizerSocials.x.startsWith('http')
                          ? organizerSocials.x
                          : `https://x.com/${organizerSocials.x.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors border border-white/30"
                      title="X (Twitter)"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {organizerSocials?.tiktok && (
                    <a
                      href={
                        organizerSocials.tiktok.startsWith('http')
                          ? organizerSocials.tiktok
                          : `https://tiktok.com/@${organizerSocials.tiktok.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors border border-white/30"
                      title="TikTok"
                    >
                      <TikTokIcon className="w-4 h-4 text-white" />
                    </a>
                  )}
                  {organizerSocials?.youtube && (
                    <a
                      href={
                        organizerSocials.youtube.startsWith('http')
                          ? organizerSocials.youtube
                          : `https://youtube.com/${organizerSocials.youtube}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors border border-white/30"
                      title="YouTube"
                    >
                      <YouTubeIcon className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
