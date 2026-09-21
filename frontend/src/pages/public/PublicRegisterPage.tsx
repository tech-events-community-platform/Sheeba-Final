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



  const getCalendarTile = (dateStr?: string) => {
    if (!dateStr) return { month: 'EVENT', day: '•', weekday: '', fullDate: '' };
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const day = d.getDate();
        const weekday = d.toLocaleString('en-US', { weekday: 'long' });
        const fullDate = d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return { month, day, weekday, fullDate };
      }
    } catch {
      // ignore
    }
    return { month: 'EVENT', day: '•', weekday: '', fullDate: dateStr };
  };

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



  // Modern 2-Column Structure
  return (
    <div className="w-full py-8 sm:py-10 px-4 sm:px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* LEFT COLUMN: Title, Date/Time, Location, Registration Area, Description */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">

            {/* Event Category & Price Row (Increased size by a few px for strong visibility) */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="primary" className="uppercase font-mono text-sm sm:text-base py-1.5 px-4 rounded-xl shadow-xs font-bold">
                {event.type}
              </Badge>
              <span className="text-gray-400 font-bold">•</span>
              <span className="font-extrabold text-base sm:text-lg text-[#1B6B4A] tracking-wide">
                {event.isPaid ? `${event.ticketPrice} ETB` : 'FREE ADMISSION'}
              </span>
            </div>

            {/* Event Title */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D1F23] tracking-tight leading-tight">
              {event.title}
            </h1>

            {/* Date/Time and Location in the same row (Location to the right of date) */}
            <div className="flex flex-wrap items-center gap-x-8 sm:gap-x-10 gap-y-3 pt-1">
              {/* Date & Time */}
              <div className="flex items-center gap-3.5">
                <div className="flex flex-col items-center justify-center shrink-0 text-center w-10">
                  <span className="text-[11px] font-bold text-[#63474D] uppercase leading-tight tracking-wider">
                    {cal.month}
                  </span>
                  <span className="text-xl font-extrabold text-[#2D1F23] leading-tight">
                    {cal.day}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#2D1F23]">
                    {cal.weekday ? `${cal.weekday}, ${cal.fullDate}` : event.date}
                  </p>
                  <p className="text-xs text-[#756366] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#AA767C]" />
                    <span>{event.time || `${event.startTime} - ${event.endTime}`}</span>
                  </p>
                </div>
              </div>

              {/* Location (in the space to the right of date in the same row) */}
              <div className="flex items-center gap-3">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <img src="/location.webp" alt="Location" className="w-5 h-5 object-contain" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#2D1F23]">{event.venueName || event.location}</p>
                  <p className="text-xs text-[#756366] truncate max-w-[240px]">{event.location}</p>
                </div>
              </div>
            </div>

            {/* REGISTRATION SECTION (Unboxed, brought up) */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8DDD7]/60">
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
                <div className="space-y-3 pt-2 text-left">
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
                /* Welcome message (No red line) & Left-aligned Register Button */
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
                    <div className="flex justify-start pt-2">
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

            {/* About Event Description (80% see-through glassmorphic card with colored title row & black paragraph text) */}
            <div className="pt-2">
              <div className="rounded-2xl overflow-hidden border border-white/25 shadow-sm">
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

          {/* RIGHT COLUMN: Poster Image on the Right + Unboxed Presented By with Socials */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4 order-1 lg:order-2">
            <div className="rounded-3xl overflow-hidden shadow-lg border border-[#E8DDD7] bg-white aspect-[4/5] sm:aspect-square lg:aspect-[4/5] relative">
              <img
                src={posterImage}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Presented By Info & Social Icons (Text completely white) */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={event.organizerAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'}
                  alt={event.organizerName}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/40"
                />
                <div className="min-w-0">
                  <span className="text-[11px] uppercase font-bold text-white/90 block">Presented by</span>
                  <p className="font-bold text-sm text-white truncate">{event.organizerName}</p>
                </div>
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
