import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { BadgeAward } from '../../types/attendance';
import { Button } from '../../components/ui/Button';
import {
  Sparkles,
  Ticket as TicketIcon,
  Clock,
  ChevronRight,
} from 'lucide-react';

export const BadgesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      try {
        if (user) {
          const userBadges = await api.badges.getAttendeeBadges(user.id);
          setBadges(userBadges || []);
        }
      } catch (err) {
        console.error('Failed to load badges:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [user]);

  const getBadgeImage = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('hackathon')) return '/badges/hackathon-badge.webp';
    if (t.includes('workshop')) return '/badges/workshop-badge.webp';
    if (t.includes('meetup')) return '/badges/meetup-badge.webp';
    return '/badges/other.webp';
  };

  const getStatusLabel = (code: string) => {
    switch (code?.toLowerCase()) {
      case 'winner':
        return 'Won';
      case 'participant':
        return 'Participated';
      case 'speaker':
        return 'Speaker';
      case 'attended':
      default:
        return 'Attended';
    }
  };

  const getBadgePillStyle = (code: string) => {
    switch (code) {
      case 'winner':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'speaker':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'participant':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'attended':
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
        <div className="h-10 w-48 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 bg-gray-100 rounded-3xl animate-pulse"></div>
          <div className="h-56 bg-gray-100 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 space-y-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">

            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#2D1F23]">
              My Badges
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#756366] font-light mt-1">
            Authentic, tamper-proof credentials issued by organizers at verified events.
          </p>
        </div>

        {badges.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
            <span>{badges.length} Verified Badges Earned</span>
          </div>
        )}
      </div>

      {/* SECTION 5: STATE 1 — Designed Empty State */}
      {badges.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-12 shadow-xs text-center space-y-6 max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-10 h-10 text-[#63474D]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">
              Your Badges Will Unlock Here
            </h2>
            <p className="text-xs text-[#756366] max-w-md mx-auto leading-relaxed">
              Sheeba badges are not earned by registering — they are officially issued when an organizer checks you in at the door on the day of the event.
            </p>
          </div>

          {/* Educational 4-Badge Tier Preview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-left">
            <div className="p-3.5 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-2">
              <img src="/badges/attended-badge.webp" loading="lazy" alt="Attended" className="w-10 h-10 object-contain rounded-lg" />
              <p className="font-bold text-xs text-[#2D1F23]">Attended</p>
              <p className="text-[10px] text-[#756366] leading-tight">
                Awarded instantly upon door check-in scan.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-2">
              <img src="/badges/participant-badge.webp" loading="lazy" alt="Participant" className="w-10 h-10 object-contain rounded-lg" />
              <p className="font-bold text-xs text-[#2D1F23]">Participant</p>
              <p className="text-[10px] text-[#756366] leading-tight">
                Awarded for active project submission.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-2">
              <img src="/badges/hackathon-winner-badge.webp" loading="lazy" alt="Winner" className="w-10 h-10 object-contain rounded-lg" />
              <p className="font-bold text-xs text-[#2D1F23]">Winner</p>
              <p className="text-[10px] text-[#756366] leading-tight">
                Awarded for podium and track achievements.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-2">
              <img src="/badges/speaker-badge.webp" loading="lazy" alt="Speaker" className="w-10 h-10 object-contain rounded-lg" />
              <p className="font-bold text-xs text-[#2D1F23]">Speaker</p>
              <p className="text-[10px] text-[#756366] leading-tight">
                Awarded to keynote speakers & mentors.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E8DDD7] flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/app/events">
              <Button variant="primary" size="md" className="flex items-center gap-2">
                <TicketIcon className="w-4 h-4" />
                <span>View Registered Events & Passes</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* SECTION 5: STATE 2 — Horizontal Badge Rows */
        <div className="space-y-3.5">
          {badges.map((b) => {
            const badgeImg = getBadgeImage(b.eventType);
            const statusLabel = getStatusLabel(b.badgeCode);
            const pillStyle = getBadgePillStyle(b.badgeCode);

            return (
              <div
                key={b.id}
                onClick={() => navigate(`/badge/${b.id}`)}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:border-[#63474D] hover:shadow-xs transition-all overflow-hidden flex flex-row items-stretch cursor-pointer group min-h-[140px] sm:min-h-[148px]"
              >
                {/* Left Badge Container: bigger size, uncropped high-fidelity badge image */}
                <div className="w-32 sm:w-44 shrink-0 overflow-hidden bg-[#FAF7F5] border-r border-gray-100 flex items-center justify-center p-3 sm:p-4">
                  <img
                    src={badgeImg}
                    alt={`${statusLabel} Badge`}
                    className="w-full h-full max-h-28 sm:max-h-32 object-contain rounded-xl drop-shadow-xs group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Rest of the Row */}
                <div className="flex-1 px-4 sm:px-5 py-3 flex flex-col justify-between min-w-0">
                  {/* Top Row: Status (Attended, Won, Participated, etc.) + Verified + Chevron */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${pillStyle}`}
                      >
                        <span>{statusLabel}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <img src="/tick.webp" alt="Verified" className="w-3.5 h-3.5 object-contain shrink-0" />
                        Verified
                      </span>

                      <span className="text-[10px] text-gray-400 font-mono hidden sm:inline-block">
                        #{b.id.substring(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:flex items-center text-[#AA767C] group-hover:text-[#63474D] group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Middle: Event Title + Given by + Note snippet */}
                  <div className="space-y-0.5 my-1">
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#2D1F23] group-hover:text-[#63474D] transition-colors truncate">
                      {b.eventTitle}
                    </h3>
                    <p className="text-xs font-semibold text-[#63474D]">
                      Given by {b.givenBy || b.issuerName || b.organizerName || 'Organizer'}
                    </p>
                    {b.organizerNote && (
                      <p className="text-xs text-gray-500 italic truncate line-clamp-1">
                        Note: &ldquo;{b.organizerNote}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Date and Location (when and where it took place) */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#756366] font-normal pt-1.5 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain shrink-0" />
                      {b.eventDate}
                    </span>
                    {b.eventTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#AA767C]" />
                        {b.eventTime}
                      </span>
                    )}
                    <span className="flex items-center gap-1 truncate">
                      <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                      {b.eventLocation}
                    </span>
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
