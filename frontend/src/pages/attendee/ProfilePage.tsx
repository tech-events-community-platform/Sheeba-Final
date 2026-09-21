import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { BadgeAward } from '../../types/attendance';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ShieldCheck,
  Settings,
  Award,
  ExternalLink,
  Share2,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeAward[]>([]);

  useEffect(() => {
    const fetchBadges = async () => {
      if (user) {
        const userBadges = await api.badges.getAttendeeBadges(user.id);
        setBadges(userBadges);
      }
    };
    fetchBadges();
  }, [user]);

  if (!user) return null;

  const stats = user.stats || {
    meetupsCount: 8,
    workshopsCount: 4,
    hackathonsCount: 2,
    totalEventsAttended: 14,
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-16">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDD7] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-[#FFA686]/60 shadow-xs"
          />

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">{user.name}</h1>
              <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Member Since {user.memberSince}
              </Badge>
            </div>

            <p className="text-xs text-[#756366]">{user.email}</p>
            <p className="text-xs text-[#756366] leading-relaxed">{user.bio || 'Developer in Ethiopia'}</p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Link to={`/profile/${user.id}`}>
                <Button variant="accent" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                  View Public Verifiable Profile
                </Button>
              </Link>
              <Link to="/app/settings">
                <Button variant="outline" size="sm" icon={<Settings className="w-3.5 h-3.5" />}>
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid: Meetups, Workshops, Hackathons */}
        <div className="pt-4 border-t border-[#E8DDD7] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Total Turnout</span>
            <p className="font-serif text-2xl font-bold text-[#63474D]">{stats.totalEventsAttended}</p>
            <span className="text-[10px] text-[#756366]">Events</span>
          </div>

          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Meetups</span>
            <p className="font-serif text-2xl font-bold text-[#AA767C]">{stats.meetupsCount}</p>
            <span className="text-[10px] text-[#756366]">Attended</span>
          </div>

          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Workshops</span>
            <p className="font-serif text-2xl font-bold text-[#D6A184]">{stats.workshopsCount}</p>
            <span className="text-[10px] text-[#756366]">Completed</span>
          </div>

          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Hackathons</span>
            <p className="font-serif text-2xl font-bold text-[#FFA686]">{stats.hackathonsCount}</p>
            <span className="text-[10px] text-[#756366]">Built</span>
          </div>
        </div>
      </div>

      {/* Earned Badges Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#2D1F23]">
              Earned Badges ({badges.length})
            </h2>
            <p className="text-xs text-[#756366]">
              Permanent badges issued directly by event directors.
            </p>
          </div>
          <Link to={`/profile/${user.id}`}>
            <span className="text-xs font-semibold text-[#63474D] hover:underline flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" /> Share Profile
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.map((b) => (
            <Link
              key={b.id}
              to={`/badge/${b.id}`}
              className="bg-white p-5 rounded-2xl border border-[#E8DDD7] hover:border-[#63474D] transition-all shadow-xs space-y-3 block group"
            >
              <div className="flex items-start justify-between">
                <Badge
                  variant={
                    b.badgeCode === 'winner'
                      ? 'accent'
                      : b.badgeCode === 'speaker'
                      ? 'tertiary'
                      : b.badgeCode === 'participant'
                      ? 'secondary'
                      : 'primary'
                  }
                  icon={<Award className="w-3.5 h-3.5" />}
                >
                  {b.badgeLabel}
                </Badge>
                <ExternalLink className="w-4 h-4 text-[#756366] group-hover:text-[#63474D] transition-colors" />
              </div>

              <div>
                <h3 className="font-serif font-bold text-sm text-[#2D1F23] group-hover:text-[#63474D]">
                  {b.eventTitle}
                </h3>
                <p className="text-xs font-semibold text-[#AA767C] mt-0.5">
                  Given by {b.issuerName}
                </p>
              </div>

              <div className="text-[11px] text-[#756366] pt-1 border-t border-[#E8DDD7] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <img src="/calendar.webp" alt="Calendar" className="w-3 h-3 object-contain shrink-0" /> {b.eventDate}
                </span>
                <span className="flex items-center gap-1">
                  <img src="/location.webp" alt="Location" className="w-3 h-3 object-contain shrink-0" /> {b.eventLocation.split(',')[0]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
