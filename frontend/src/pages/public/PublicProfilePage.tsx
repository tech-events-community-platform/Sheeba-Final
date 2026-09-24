import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { User } from '../../types/user';
import type { BadgeAward } from '../../types/attendance';
import { requestApi } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Award,
  ShieldCheck,
  Download,
  ArrowLeft,
  ExternalLink,
  Lock,
  Eye,
} from 'lucide-react';

export const PublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportedMsg, setExportedMsg] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [isOwnerPreview, setIsOwnerPreview] = useState(false);
  const [privateMessage, setPrivateMessage] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (id) {
          const res = await requestApi(`/users/${id}/public`);
          if (res.data) {
            const isPrivate = Boolean(res.data.isPrivate);
            setIsPrivateProfile(isPrivate);
            setIsOwnerPreview(Boolean(res.data.isOwnerPreview));
            setPrivateMessage(res.data.message || null);

            const userObj = res.data.user || res.data;
            setProfileUser(userObj);

            if (isPrivate) {
              setBadges([]);
            } else {
              setBadges(res.data.badges || []);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const handleExportCard = () => {
    // Generate a clean branded canvas credential export for social media sharing
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (ctx && profileUser) {
      ctx.fillStyle = '#63474D';
      ctx.fillRect(0, 0, 800, 450);

      // Card Inner
      ctx.fillStyle = '#FAF7F5';
      ctx.roundRect(30, 30, 740, 390, 20);
      ctx.fill();

      // Card Header
      ctx.fillStyle = '#2D1F23';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.fillText(profileUser.name, 60, 90);

      ctx.fillStyle = '#756366';
      ctx.font = '16px sans-serif';
      ctx.fillText('Sheba Verified Tech Credential Record', 60, 120);

      // Stats
      ctx.fillStyle = '#63474D';
      ctx.font = 'bold 20px sans-serif';
      const stats = profileUser.stats || { meetupsCount: 8, workshopsCount: 4, hackathonsCount: 2, totalEventsAttended: 14 };
      ctx.fillText(`Verified Events Attended: ${stats.totalEventsAttended}`, 60, 180);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#2D1F23';
      ctx.fillText(`• ${stats.meetupsCount} Meetups  • ${stats.workshopsCount} Workshops  • ${stats.hackathonsCount} Hackathons`, 60, 215);

      // Badges
      ctx.fillText(`Total Badges Earned: ${badges.length}`, 60, 270);
      badges.slice(0, 3).forEach((b, i) => {
        ctx.fillStyle = '#AA767C';
        ctx.font = 'italic 14px Georgia, serif';
        ctx.fillText(`[${b.badgeLabel}] ${b.eventTitle} (${b.issuerName})`, 60, 310 + i * 26);
      });

      // Footer brand
      ctx.fillStyle = '#63474D';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('SHEEBA.ET • Attendance, verified.', 60, 400);

      const link = document.createElement('a');
      link.download = `sheba-verified-profile-${profileUser.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setExportedMsg(true);
      setTimeout(() => setExportedMsg(false), 4000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 animate-pulse space-y-4">
        <div className="h-44 bg-[#E8DDD7]/50 rounded-3xl"></div>
        <div className="h-64 bg-[#E8DDD7]/50 rounded-3xl"></div>
      </div>
    );
  }

  if (isPrivateProfile && profileUser) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 space-y-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="bg-white rounded-3xl p-8 border border-[#E8DDD7] shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] flex items-center justify-center mx-auto text-[#63474D]">
            <Lock className="w-8 h-8 text-[#63474D]" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-bold text-[#2D1F23]">{profileUser.name}</h1>
            <div className="inline-flex items-center gap-1 text-xs font-medium text-[#756366]">
              <span>Private Profile</span>
              {profileUser.memberSince && <span>• Member Since {profileUser.memberSince}</span>}
            </div>
          </div>
          <p className="text-sm text-[#756366] max-w-md mx-auto">
            {privateMessage || 'This attendee has configured their profile and credentials to be private.'}
          </p>
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  const stats = profileUser.stats || {
    meetupsCount: 8,
    workshopsCount: 4,
    hackathonsCount: 2,
    totalEventsAttended: 14,
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 pb-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {isOwnerPreview && (
        <div className="p-4 bg-[#FAF7F5] border border-[#63474D]/30 rounded-2xl flex items-center gap-3 text-xs text-[#63474D]">
          <Eye className="w-4 h-4 shrink-0 text-[#63474D]" />
          <span>
            <strong>Owner Preview:</strong> Your profile visibility is currently set to <strong>Private</strong> in Settings. Only you can view this full credential dossier; anonymous visitors will see a restricted private card.
          </span>
        </div>
      )}

      {/* Profile Header Block */}
      <div ref={cardRef} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDD7] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <img
            src={profileUser.avatarUrl}
            alt={profileUser.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-[#FFA686]/60 shadow-xs"
          />

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
                {profileUser.name}
              </h1>
              <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Verified Sheba Record
              </Badge>
            </div>

            <p className="text-xs text-[#756366] leading-relaxed max-w-xl">
              {profileUser.bio || 'Active developer & builder in the Ethiopian technology ecosystem.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] text-[#756366]">Member Since {profileUser.memberSince}</span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] text-[#2A7B5F] font-semibold">Profile Status: Public</span>
            </div>
          </div>
        </div>

        {/* Stats Grid: Meetups, Workshops, Hackathons */}
        <div className="pt-4 border-t border-[#E8DDD7] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Total Turnout</span>
            <p className="font-serif text-2xl font-extrabold text-[#63474D]">{stats.totalEventsAttended}</p>
            <span className="text-[10px] text-[#756366]">Events</span>
          </div>

          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Meetups</span>
            <p className="font-serif text-2xl font-extrabold text-[#AA767C]">{stats.meetupsCount}</p>
            <span className="text-[10px] text-[#756366]">Attended</span>
          </div>

          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Workshops</span>
            <p className="font-serif text-2xl font-extrabold text-[#D6A184]">{stats.workshopsCount}</p>
            <span className="text-[10px] text-[#756366]">Completed</span>
          </div>

          <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-center">
            <span className="text-[10px] uppercase font-bold text-[#756366]">Hackathons</span>
            <p className="font-serif text-2xl font-extrabold text-[#FFA686]">{stats.hackathonsCount}</p>
            <span className="text-[10px] text-[#756366]">Built</span>
          </div>
        </div>

        {/* Actions: Export Image Card */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#756366]">
            Export this verified profile as a shareable credential card for LinkedIn/Socials.
          </p>
          <Button
            onClick={handleExportCard}
            variant="accent"
            size="sm"
            icon={<Download className="w-4 h-4" />}
          >
            Export Branded Card (PNG)
          </Button>
        </div>

        {exportedMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 animate-fade-in">
            <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
            <span>Profile credential image generated and saved to your device.</span>
          </div>
        )}
      </div>

      {/* Verified Badges Collection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#2D1F23]">
              Organizer-Issued Badges ({badges.length})
            </h2>
            <p className="text-xs text-[#756366]">
              Permanent verifiable achievements awarded by event directors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.map((b) => (
            <Link
              key={b.id}
              to={`/badge/${b.id}`}
              className="bg-white p-5 rounded-2xl border border-[#E8DDD7] hover:border-[#63474D] transition-all shadow-xs space-y-3 group"
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
