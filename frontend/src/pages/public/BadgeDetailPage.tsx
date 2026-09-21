import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { BadgeAward } from '../../types/attendance';
import { ArrowLeft, Download } from 'lucide-react';

export const BadgeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [badge, setBadge] = useState<BadgeAward | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadge = async () => {
      setLoading(true);
      if (id) {
        const b = await api.badges.getBadgeById(id);
        setBadge(b);
      }
      setLoading(false);
    };
    fetchBadge();
  }, [id]);

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

  const handleExport = () => {
    if (!badge) return;
    const badgeImgSrc = getBadgeImage(badge.eventType);
    const link = document.createElement('a');
    link.href = badgeImgSrc;
    link.download = `sheba-${badge.badgeCode || 'verified'}-badge.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 animate-pulse space-y-6">
        <div className="w-56 h-56 bg-gray-200 rounded-3xl mx-auto"></div>
        <div className="h-8 bg-gray-200 rounded-xl w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded-lg w-1/2 mx-auto"></div>
        <div className="space-y-3 pt-6">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">Badge Not Found</h2>
        <p className="text-xs text-[#756366]">
          This badge may have been revoked or the identifier is invalid.
        </p>
        <Link
          to="/search"
          className="inline-block px-4 py-2 text-xs font-semibold text-[#63474D] border border-[#63474D]/30 rounded-xl"
        >
          Search Other Credentials
        </Link>
      </div>
    );
  }

  const badgeImg = getBadgeImage(badge.eventType);
  const statusLabel = getStatusLabel(badge.badgeCode);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8 pb-24">
      {/* Top Navigation & Lower-Top Right Export Button */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/app/badges"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Badges</span>
        </Link>

        {/* Small Grey Export Button on the lower-top right of the page - STRICTLY NO HOVER EFFECTS */}
        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-1.5 text-xs rounded-lg bg-gray-200 text-gray-700 border border-gray-300 font-medium inline-flex items-center gap-1.5 cursor-pointer active:scale-98"
          title="Export Badge Image"
        >
          <Download className="w-3.5 h-3.5 text-gray-600" />
          <span>Export</span>
        </button>
      </div>

      {/* Badge Placed in the Top Middle of the Page */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <img
          src={badgeImg}
          alt={`${statusLabel} Badge`}
          className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-2xl drop-shadow-md"
        />
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#63474D] uppercase tracking-wider">
          <img src="/tick.webp" alt="Verified" className="w-4 h-4 object-contain" />
          <span>{statusLabel} • Verified Official Credential</span>
        </div>
      </div>

      {/* Descriptions in Plain Paragraphs Under the Badge (NO BOXES BEHIND TEXTS, NO HOVER EFFECTS) */}
      <div className="space-y-6 text-[#2D1F23]">
        {/* Title & Issuer Header */}
        <div className="space-y-1 text-center sm:text-left border-b border-gray-200/80 pb-4">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D1F23] leading-tight">
            {badge.eventTitle}
          </h1>
          <p className="text-sm font-semibold text-[#63474D]">
            Given by {badge.givenBy || badge.issuerName || badge.organizerName || 'Organizer'}
          </p>
        </div>

        {/* Organizer's Note */}
        {badge.organizerNote && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
              Organizer&apos;s Note
            </h2>
            <p className="text-base text-[#2D1F23] leading-relaxed italic font-serif">
              &ldquo;{badge.organizerNote}&rdquo;
            </p>
          </div>
        )}

        {/* Event's Description */}
        {badge.eventDescription && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
              Event Description
            </h2>
            <p className="text-sm text-[#756366] leading-relaxed">
              {badge.eventDescription}
            </p>
          </div>
        )}

        {/* When & Where */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
            When &amp; Where It Took Place
          </h2>
          <p className="text-sm text-[#2D1F23] flex items-center gap-2">
            <img src="/calendar.webp" alt="When" className="w-4 h-4 object-contain shrink-0" />
            <span>
              {badge.eventDate}
              {badge.eventTime ? ` • ${badge.eventTime}` : ''}
            </span>
          </p>
          <p className="text-sm text-[#2D1F23] flex items-center gap-2">
            <img src="/location.webp" alt="Where" className="w-4 h-4 object-contain shrink-0" />
            <span>{badge.eventLocation}</span>
          </p>
        </div>

        {/* To Who It Was Given */}
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
            Awarded Recipient
          </h2>
          <p className="text-sm text-[#2D1F23]">
            This badge was officially awarded to{' '}
            <strong className="font-semibold text-[#2D1F23]">{badge.attendeeName}</strong>{' '}
            (<span className="text-[#756366]">{badge.attendeeEmail}</span>) for verified turnout and active engagement.
          </p>
          <p className="text-xs text-gray-400 font-mono pt-1">
            Credential ID: {badge.id} • Issued on {new Date(badge.awardedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Attestation paragraph */}
        <div className="pt-4 border-t border-gray-200/80">
          <p className="text-xs text-[#756366] leading-relaxed">
            Sheeba verified badges are issued directly through door verification and organizer attestation.
            They serve as authentic, permanent proof of presence and accomplishment within the technology and innovation community.
          </p>
        </div>
      </div>
    </div>
  );
};
