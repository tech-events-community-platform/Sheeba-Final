import React, { useEffect, useState } from 'react';
import {
  X,
  Building2,
  Globe,
  Phone,
  Mail,
  User,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Handshake,
  XCircle,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorPublicProfile, ISponsorRelationshipItem } from '../../types/sponsorship';

interface SponsorProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sponsorId: string | null;
  dealItem?: ISponsorRelationshipItem | null;
  onAcceptDeal?: (dealId: string) => Promise<void>;
  onRejectDeal?: (dealId: string) => Promise<void>;
  onToggleSharing?: (dealId: string, allowSharing: boolean) => Promise<void>;
}

export const SponsorProfileDrawer: React.FC<SponsorProfileDrawerProps> = ({
  isOpen,
  onClose,
  sponsorId,
  dealItem,
  onAcceptDeal,
  onRejectDeal,
  onToggleSharing,
}) => {
  const [profile, setProfile] = useState<ISponsorPublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !sponsorId) {
      setProfile(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.sponsorship
      .getSponsorProfile(sponsorId)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.warn('Could not fetch sponsor profile, falling back to dealItem data:', err);
          // Fallback to dealItem details if already available
          if (dealItem?.sponsor) {
            setProfile({
              id: dealItem.sponsor.id,
              name: dealItem.sponsor.company_name || dealItem.sponsor.name,
              representativeName: dealItem.sponsor.representative_name,
              email: dealItem.sponsor.email,
              companyName: dealItem.sponsor.company_name,
              industryCategory: dealItem.sponsor.industry_category,
              website: dealItem.sponsor.company_website,
              phone: dealItem.sponsor.company_phone || dealItem.sponsor.phone,
              avatarUrl: dealItem.sponsor.avatar_url,
              bio: dealItem.sponsor.bio,
              memberSince: 'Verified Partner',
            });
          } else {
            setError(err?.message || 'Unable to load sponsor profile.');
          }
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sponsorId, dealItem]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!dealItem || !onAcceptDeal) return;
    setActionLoading(true);
    try {
      await onAcceptDeal(dealItem.deal_id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!dealItem || !onRejectDeal) return;
    setActionLoading(true);
    try {
      await onRejectDeal(dealItem.deal_id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSharingClick = async (allow: boolean) => {
    if (!dealItem || !onToggleSharing) return;
    setActionLoading(true);
    try {
      await onToggleSharing(dealItem.deal_id, allow);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-100">
          {/* Header */}
          <div className="px-6 py-5 bg-[#FAF7F5] border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-[#63474D]/10 text-[#63474D] rounded-xl">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-serif font-bold text-base text-[#2D1F23]">Sponsor Profile</h3>
                <p className="text-[11px] text-[#756366]">Official verified partner credentials</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-all cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500 font-medium">Loading sponsor profile...</p>
              </div>
            ) : error ? (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-center space-y-2">
                <p className="text-xs font-semibold text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            ) : profile ? (
              <>
                {/* Profile Card Header */}
                <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#63474D] to-[#8C656C] text-white flex items-center justify-center font-serif text-2xl font-bold shadow-md shrink-0 overflow-hidden">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (profile.name || 'S')[0].toUpperCase()
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-serif font-bold text-lg text-[#2D1F23] truncate">
                        {profile.name}
                      </h4>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        title="Verified Sheeba Sponsor"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </div>

                    {profile.industryCategory ? (
                      <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#63474D]/10 text-[#63474D]">
                        {profile.industryCategory}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Industry category not specified</span>
                    )}

                    {profile.memberSince && (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 pt-1">
                        <Calendar className="w-3 h-3" /> Member since {profile.memberSince}
                      </p>
                    )}
                  </div>
                </div>

                {/* Associated Pitch / Relationship Badge */}
                {dealItem && (
                  <div className="p-4 bg-[#FAF7F5] rounded-2xl border border-[#AA767C]/15 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-[#756366]">
                      Interested In Event Pitch
                    </p>
                    <p className="font-serif font-bold text-sm text-[#2D1F23]">
                      {dealItem.application.event_title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-600 pt-1">
                      {dealItem.package_name && (
                        <span>
                          Package:{' '}
                          <strong className="text-gray-900">{dealItem.package_name}</strong>
                        </span>
                      )}
                      {dealItem.pledged_amount ? (
                        <span>
                          Pledged:{' '}
                          <strong className="text-emerald-700">
                            {dealItem.pledged_amount.toLocaleString()} {dealItem.application.currency || 'ETB'}
                          </strong>
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* About / Bio */}
                <div className="space-y-2">
                  <h5 className="text-xs uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#63474D]" /> About Organization
                  </h5>
                  {profile.bio ? (
                    <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic bg-gray-50/50 p-3 rounded-xl border border-dashed border-gray-200">
                      No corporate biography provided yet.
                    </p>
                  )}
                </div>

                {/* Representative Contact Details */}
                <div className="space-y-3">
                  <h5 className="text-xs uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#63474D]" /> Primary Representative
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-gray-500">Contact Person</span>
                      <span className="font-semibold text-gray-900">{profile.representativeName}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" /> Email
                      </span>
                      <a
                        href={`mailto:${profile.email}`}
                        className="font-semibold text-[#63474D] hover:underline"
                      >
                        {profile.email}
                      </a>
                    </div>

                    {profile.phone && (
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone
                        </span>
                        <a
                          href={`tel:${profile.phone}`}
                          className="font-semibold text-gray-900 hover:underline"
                        >
                          {profile.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Company Web Presence */}
                <div className="space-y-3">
                  <h5 className="text-xs uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#63474D]" /> Web & Channels
                  </h5>
                  <div className="space-y-2 text-xs">
                    {profile.website ? (
                      <a
                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[240px]">{profile.website}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400 italic text-center">
                        Website not provided
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Drawer Footer / Quick Actions */}
          {dealItem && dealItem.deal_status === 'DEAL_ACCEPTED' && onToggleSharing && (
            <div className="p-5 bg-emerald-50/50 border-t border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Attendee Sharing Permission
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    dealItem.allow_attendee_sharing
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {dealItem.allow_attendee_sharing ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {dealItem.allow_attendee_sharing
                  ? 'This sponsor is currently authorized to view verified checked-in attendee names for this event. You can revoke this at any time.'
                  : 'Attendee sharing is currently withheld. The sponsor cannot view check-in records until you explicitly allow it.'}
              </p>
              {dealItem.allow_attendee_sharing ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleToggleSharingClick(false)}
                  className="w-full py-2.5 px-4 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Revoke Attendee Sharing</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleToggleSharingClick(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Allow Sharing Attendee Info</span>
                </button>
              )}
            </div>
          )}

          {dealItem && dealItem.deal_status === 'INTERESTED' && onAcceptDeal && (
            <div className="p-5 bg-white border-t border-gray-100 flex items-center gap-3">
              {onRejectDeal && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReject}
                  className="flex-1 py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              )}
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAccept}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Handshake className="w-4 h-4" />
                <span>Deal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

