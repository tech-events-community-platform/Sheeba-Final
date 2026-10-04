import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HandCoins,
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  Target,
  DollarSign,
  Send,
  Trash2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  Mic,
  Handshake,
  Trophy,
  Globe,
} from 'lucide-react';
import {
  LinkedInIcon,
  XIcon,
  TikTokIcon,
  YouTubeIcon,
  InstagramIcon,
  TelegramIcon,
  GlobeIcon,
} from '../../components/ui/SocialIcons';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type {
  ISponsorshipApplication,
  ISponsorshipPackage,
  IEventSpeaker,
  IEventCoOrganizer,
  IEventPastSponsor,
  IEventPartner,
  IApplicationAffiliations,
} from '../../types/sponsorship';

interface SocialPlatformDef {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: (className?: string) => React.ReactNode;
  placeholder: string;
}

const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  {
    id: 'Website',
    name: 'Website',
    color: '#2563EB',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: (cls = 'w-5 h-5') => <GlobeIcon className={cls} />,
    placeholder: 'https://yourwebsite.com',
  },
  {
    id: 'LinkedIn',
    name: 'LinkedIn',
    color: '#0A66C2',
    bgColor: 'bg-sky-50',
    borderColor: 'border-[#0A66C2]/30',
    icon: (cls = 'w-5 h-5') => <LinkedInIcon className={cls} />,
    placeholder: 'https://linkedin.com/in/... or company page',
  },
  {
    id: 'X',
    name: 'X',
    color: '#000000',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-300',
    icon: (cls = 'w-5 h-5') => <XIcon className={cls} />,
    placeholder: 'https://x.com/... or @handle',
  },
  {
    id: 'TikTok',
    name: 'TikTok',
    color: '#000000',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-300',
    icon: (cls = 'w-5 h-5') => <TikTokIcon className={cls} />,
    placeholder: 'https://tiktok.com/@... or @handle',
  },
  {
    id: 'YouTube',
    name: 'YouTube',
    color: '#FF0000',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: (cls = 'w-5 h-5') => <YouTubeIcon className={cls} />,
    placeholder: 'https://youtube.com/@channel',
  },
  {
    id: 'Instagram',
    name: 'Instagram',
    color: '#E4405F',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    icon: (cls = 'w-5 h-5') => <InstagramIcon className={cls} />,
    placeholder: 'https://instagram.com/... or @handle',
  },
  {
    id: 'Telegram',
    name: 'Telegram',
    color: '#24A1DE',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    icon: (cls = 'w-5 h-5') => <TelegramIcon className={cls} />,
    placeholder: 'https://t.me/... or @username',
  },
];

const getSocialConfig = (platform: string): SocialPlatformDef => {
  const p = (platform || '').toLowerCase();
  if (p.includes('linkedin')) return SOCIAL_PLATFORMS[1];
  if (p === 'x' || p.includes('twitter')) return SOCIAL_PLATFORMS[2];
  if (p.includes('tiktok')) return SOCIAL_PLATFORMS[3];
  if (p.includes('youtube')) return SOCIAL_PLATFORMS[4];
  if (p.includes('instagram')) return SOCIAL_PLATFORMS[5];
  if (p.includes('telegram')) return SOCIAL_PLATFORMS[6];
  return SOCIAL_PLATFORMS[0]; // Website
};

const getPackageBadgeClasses = (pkgName: string) => {
  const name = (pkgName || '').toLowerCase();
  if (name.includes('plat') || name.includes('pl')) {
    // Very light platinum (clean subtle metallic slate/platinum tint)
    return {
      container: 'bg-[#F4F6F8] border border-[#E1E5EA]',
      nameText: 'text-[#334155]',
      amountText: 'text-[#0F172A]',
    };
  }
  if (name.includes('gold')) {
    // Very light gold (clean subtle pale champagne gold tint)
    return {
      container: 'bg-[#FEF9EE] border border-[#FBEAC4]',
      nameText: 'text-[#7D5413]',
      amountText: 'text-[#92400E]',
    };
  }
  if (name.includes('silver')) {
    // Very light silver (clean subtle silvery zinc tint)
    return {
      container: 'bg-[#F8F9FA] border border-[#E5E7EB]',
      nameText: 'text-[#4B5563]',
      amountText: 'text-[#1F2937]',
    };
  }
  if (name.includes('bronz')) {
    // Very light bronze (clean subtle warm bronze tint)
    return {
      container: 'bg-[#FAF5F0] border border-[#EEDBCA]',
      nameText: 'text-[#7C4A27]',
      amountText: 'text-[#5C3214]',
    };
  }
  return {
    container: 'bg-stone-50 border border-stone-200',
    nameText: 'text-stone-700',
    amountText: 'text-[#63474D]',
  };
};


const CATEGORIES = [
  'Technology & AI',
  'Finance & Fintech',
  'Startup & Entrepreneurship',
  'Creative & Media',
  'Education & Youth',
  'Health & Wellness',
  'Cultural & Arts',
  'Other',
];

const EVENT_TYPES = [
  'Conference',
  'Hackathon',
  'Summit / Expo',
  'Workshop / Masterclass',
  'Community Meetup',
  'Festival / Cultural',
  'Networking Gala',
  'Other',
];

export const ApplyToSponsorsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'my-pitches'>('create');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [myApplications, setMyApplications] = useState<ISponsorshipApplication[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state for pitch
  const [selectedEventType, setSelectedEventType] = useState('Conference');
  const [customEventType, setCustomEventType] = useState('');
  const [reportUrls, setReportUrls] = useState<string[]>(['']);
  const [showMaxReportsMsg, setShowMaxReportsMsg] = useState(false);

  const [formData, setFormData] = useState({
    event_title: '',
    category: 'Technology & AI',
    expected_date: '',
    location: '',
    expected_attendees: 250,
    target_audience: '',
    funding_goal: 50000,
    currency: 'ETB',
    description: '',
    contact_name: user?.name || '',
    contact_phone: user?.phone || '',
    contact_email: user?.email || '',
    contact_telegram: '',
  });

  const handleAddReportUrl = () => {
    if (reportUrls.length < 2) {
      setReportUrls((prev) => [...prev, '']);
      setShowMaxReportsMsg(false);
    } else {
      setShowMaxReportsMsg(true);
    }
  };

  const handleRemoveReportUrl = (index: number) => {
    setReportUrls((prev) => prev.filter((_, i) => i !== index));
    setShowMaxReportsMsg(false);
  };

  const handleReportUrlChange = (index: number, val: string) => {
    setReportUrls((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  // Dynamic sponsor packages
  const [packages, setPackages] = useState<ISponsorshipPackage[]>([
    { name: 'Title / Headline Sponsor', amount: 30000, perks: 'Keynote speaking slot, prime booth space, logo on all event banners and badges, 10 VIP passes' },
    { name: 'Gold Partner', amount: 15000, perks: 'Standard exhibition booth, logo on attendee badges, 5 VIP passes, social media mentions' },
    { name: 'Community Supporter', amount: 5000, perks: 'Logo on digital backdrop, 2 passes, mention during opening remarks' },
  ]);

  // Dynamic organizer socials (2 by default)
  const [socials, setSocials] = useState<{ platform: string; url: string }[]>([
    { platform: 'LinkedIn', url: '' },
    { platform: 'Website', url: '' },
  ]);
  const [isAddSocialOpen, setIsAddSocialOpen] = useState(false);

  const handleAddSocial = () => {
    setIsAddSocialOpen(true);
  };

  const handleSelectPlatformToAdd = (platformId: string) => {
    setSocials((prev) => [...prev, { platform: platformId, url: '' }]);
    setIsAddSocialOpen(false);
  };

  const isPlatformAdded = (platformId: string) => {
    const target = platformId.toLowerCase();
    return socials.some((s) => {
      const p = s.platform.toLowerCase();
      if (target === 'x') return p === 'x' || p.includes('twitter');
      return p.includes(target);
    });
  };

  const handleRemoveSocial = (index: number) => {
    setSocials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSocialChange = (index: number, field: 'platform' | 'url', val: string) => {
    setSocials((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Helper to format social / website links
  const formatLink = (url?: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('@')) return `https://t.me/${trimmed.substring(1)}`;
    return `https://${trimmed}`;
  };

  // Affiliations (Lineup, Co-Organizers, Past Sponsors & Partners)
  const [affiliationsTab, setAffiliationsTab] = useState<'past_sponsors' | 'partners' | 'co_organizers' | 'speakers'>('past_sponsors');
  const [speakers, setSpeakers] = useState<IEventSpeaker[]>([]);
  const [coOrganizers, setCoOrganizers] = useState<IEventCoOrganizer[]>([]);
  const [pastSponsors, setPastSponsors] = useState<IEventPastSponsor[]>([]);
  const [partners, setPartners] = useState<IEventPartner[]>([]);

  const [speakerDraft, setSpeakerDraft] = useState({ name: '', role: '', social: '' });
  const [coOrganizerDraft, setCoOrganizerDraft] = useState({ name: '', social: '' });
  const [pastSponsorDraft, setPastSponsorDraft] = useState({ name: '', website: '' });
  const [partnerDraft, setPartnerDraft] = useState({ name: '', social: '' });

  const handleAddSpeaker = () => {
    if (!speakerDraft.name.trim()) return;
    setSpeakers((prev) => [
      ...prev,
      {
        name: speakerDraft.name.trim(),
        role: speakerDraft.role.trim() || undefined,
        social: speakerDraft.social.trim() || undefined,
      },
    ]);
    setSpeakerDraft({ name: '', role: '', social: '' });
  };

  const handleRemoveSpeaker = (idx: number) => {
    setSpeakers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCoOrganizer = () => {
    if (!coOrganizerDraft.name.trim()) return;
    setCoOrganizers((prev) => [
      ...prev,
      {
        name: coOrganizerDraft.name.trim(),
        social: coOrganizerDraft.social.trim() || undefined,
      },
    ]);
    setCoOrganizerDraft({ name: '', social: '' });
  };

  const handleRemoveCoOrganizer = (idx: number) => {
    setCoOrganizers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPastSponsor = () => {
    if (!pastSponsorDraft.name.trim()) return;
    setPastSponsors((prev) => [
      ...prev,
      {
        name: pastSponsorDraft.name.trim(),
        website: pastSponsorDraft.website.trim() || undefined,
      },
    ]);
    setPastSponsorDraft({ name: '', website: '' });
  };

  const handleRemovePastSponsor = (idx: number) => {
    setPastSponsors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPartner = () => {
    if (!partnerDraft.name.trim()) return;
    setPartners((prev) => [
      ...prev,
      {
        name: partnerDraft.name.trim(),
        social: partnerDraft.social.trim() || undefined,
      },
    ]);
    setPartnerDraft({ name: '', social: '' });
  };

  const handleRemovePartner = (idx: number) => {
    setPartners((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadMyApplications = async () => {
    try {
      setFetchLoading(true);
      const apps = await api.sponsorship.getMyApplications();
      setMyApplications(apps);
    } catch (err: any) {
      console.error('Failed to load organizer applications', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    loadMyApplications();
  }, []);

  const handleAddPackage = () => {
    setPackages((prev) => [
      ...prev,
      { name: 'Custom Tier', amount: 10000, perks: 'Custom branding and mentions' },
    ]);
  };

  const handleRemovePackage = (index: number) => {
    setPackages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePackageChange = (index: number, field: keyof ISponsorshipPackage, value: any) => {
    setPackages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.event_title.trim()) {
      setErrorMessage('Please provide an event title.');
      setLoading(false);
      return;
    }

    if (!formData.contact_phone.trim() || !formData.contact_email.trim()) {
      setErrorMessage('Direct phone and email are required so sponsors can contact you.');
      setLoading(false);
      return;
    }

    try {
      const socialsMap: Record<string, string> = {};
      socials.forEach((s) => {
        if (s.platform.trim() && s.url.trim()) {
          socialsMap[s.platform.trim()] = s.url.trim();
        }
      });

      const finalEventType =
        selectedEventType === 'Other'
          ? customEventType.trim() || 'Other'
          : selectedEventType;

      const validReportUrls = reportUrls.map((u) => u.trim()).filter(Boolean);
      const combinedReportUrl = validReportUrls.join(', ');

      const affiliationsPayload: IApplicationAffiliations = {
        speakers: speakers.filter((s) => s.name.trim()),
        co_organizers: coOrganizers.filter((c) => c.name.trim()),
        past_sponsors: pastSponsors.filter((p) => p.name.trim()),
        partners: partners.filter((p) => p.name.trim()),
      };

      const payload = {
        ...formData,
        event_type: finalEventType,
        pitch_deck_url: combinedReportUrl,
        packages,
        socials: socialsMap,
        affiliations: affiliationsPayload,
      };

      await api.sponsorship.createApplication(payload);
      setSuccessMessage('Your pitch has been published to the Sponsor Marketplace! Verified sponsors can now discover your event and reach out directly.');
      
      // Reload applications and switch tab
      await loadMyApplications();
      setActiveTab('my-pitches');

      // Reset form
      setFormData({
        event_title: '',
        category: 'Technology & AI',
        expected_date: '',
        location: '',
        expected_attendees: 250,
        target_audience: '',
        funding_goal: 50000,
        currency: 'ETB',
        description: '',
        contact_name: user?.name || '',
        contact_phone: user?.phone || '',
        contact_email: user?.email || '',
        contact_telegram: '',
      });
      setSelectedEventType('Conference');
      setCustomEventType('');
      setReportUrls(['']);
      setShowMaxReportsMsg(false);
      setSocials([
        { platform: 'LinkedIn', url: '' },
        { platform: 'Website', url: '' },
      ]);
      setSpeakers([]);
      setCoOrganizers([]);
      setPastSponsors([]);
      setPartners([]);
      setSpeakerDraft({ name: '', role: '', social: '' });
      setCoOrganizerDraft({ name: '', social: '' });
      setPastSponsorDraft({ name: '', website: '' });
      setPartnerDraft({ name: '', social: '' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to withdraw this pitch from the marketplace?')) return;
    try {
      await api.sponsorship.deleteApplication(id);
      setMyApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete application.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#63474D] via-[#755259] to-[#8C6067] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
            Apply to Sponsors & Get Funded
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Pitch your upcoming, uncreated events directly to verified corporate sponsors. Once you secure the funding you need, head over to Create Event to publish your live ticketing link.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white text-[#63474D] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Submit New Event Pitch
            </button>

            <button
              onClick={() => setActiveTab('my-pitches')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'my-pitches'
                  ? 'bg-white text-[#63474D] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <HandCoins className="w-4 h-4" />
              My Published Pitches ({myApplications.length})
            </button>

            <Link
              to="/organizer/events/create"
              className="ml-auto text-xs font-semibold text-white/90 hover:text-white flex items-center gap-1.5 underline underline-offset-4 decoration-[#FFA686]"
            >
              <span>Ready with funds? Create Event</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {/* TAB 1: Submit Event Pitch Form */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Event Identity & Vision */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AA767C]/15 shadow-xl shadow-stone-900/10 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
                <img src="/upcoming-details-icon.webp" alt="Upcoming Event Details" className="w-10 h-10 object-contain shrink-0" />
                <span>1. Upcoming Event Details</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Tell sponsors what event you plan to host. You don't need to have created the event yet!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Upcoming Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Addis AI & Cloud Summit 2026"
                  value={formData.event_title}
                  onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Event Format / Type *
                </label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all bg-white"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {selectedEventType === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Specify your event format / type"
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value)}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all bg-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Industry Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <img src="/calendar.webp" alt="Date" className="w-3.5 h-3.5 object-contain shrink-0" />
                  Expected Date or Month *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. November 2026 or Nov 14-16, 2026"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                  Planned Location / City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Millennium Hall, Addis Ababa"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  Expected Turnout (Attendees) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 250"
                  value={formData.expected_attendees || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, expected_attendees: val === '' ? ('' as any) : Number(val) });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-gray-400" />
                  Target Audience / Demographics *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software engineers, FinTech founders, University graduates"
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              {/* Pitch Overview (Left) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Pitch & Concept Overview *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Describe your event objective, why sponsors should back it, and what value or exposure attendees and brands will gain..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              {/* Past Sheeba Event Reports Space (Right) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Past Sheeba Event Report (PDF)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddReportUrl}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#63474D]/10 hover:bg-[#63474D]/20 text-[#63474D] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add +</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Add your Sheeba report of a successful event. Paste the Google Drive URL of your verified PDF report:
                </p>

                <div className="space-y-2.5 pt-1">
                  {reportUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder={idx === 0 ? "Google Drive URL for Report #1" : "Google Drive URL for Report #2"}
                        value={url}
                        onChange={(e) => handleReportUrlChange(idx, e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm transition-all"
                      />
                      {reportUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveReportUrl(idx)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          title="Remove report URL"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {showMaxReportsMsg && (
                  <p className="text-xs font-semibold text-red-600 mt-1">
                    You can only put maximum 2 reports for sponsorships
                  </p>
                )}
              </div>

              {/* Past Sponsors, Partners, Co-Organizers, and Speakers on your previous events */}
              <div className="md:col-span-2 pt-5 border-t border-gray-100 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900">
                    Past Sponsors, Partners, Co-Organizers, and Speakers on your previous events
                  </label>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                    Sponsors want to know who they are associating with. Showcase previous sponsors, partners, co-organizers, and notable speakers to demonstrate your event track record and credibility.
                  </p>
                </div>

                {/* Category Tabs: Clean Segmented Bar */}
                <div className="bg-[#FAF8F5] p-2 rounded-2xl border border-stone-200 flex items-center gap-2 overflow-x-auto">
                  {/* 1. Past Sponsors */}
                  <button
                    type="button"
                    onClick={() => setAffiliationsTab('past_sponsors')}
                    className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                      affiliationsTab === 'past_sponsors'
                        ? 'bg-white text-[#63474D] shadow-xs border border-stone-200/90'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                  >
                    <img src="/sponsor-icon.webp" alt="Past Sponsors" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
                    <span>Past Sponsors</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      affiliationsTab === 'past_sponsors' ? 'bg-[#63474D]/10 text-[#63474D]' : 'bg-stone-200/70 text-stone-600'
                    }`}>
                      {pastSponsors.length}
                    </span>
                  </button>

                  {/* 2. Partners */}
                  <button
                    type="button"
                    onClick={() => setAffiliationsTab('partners')}
                    className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                      affiliationsTab === 'partners'
                        ? 'bg-white text-[#63474D] shadow-xs border border-stone-200/90'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                  >
                    <img src="/partner-icon.webp" alt="Partners" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
                    <span>Partners</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      affiliationsTab === 'partners' ? 'bg-[#63474D]/10 text-[#63474D]' : 'bg-stone-200/70 text-stone-600'
                    }`}>
                      {partners.length}
                    </span>
                  </button>

                  {/* 3. Co-Organizers */}
                  <button
                    type="button"
                    onClick={() => setAffiliationsTab('co_organizers')}
                    className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                      affiliationsTab === 'co_organizers'
                        ? 'bg-white text-[#63474D] shadow-xs border border-stone-200/90'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                  >
                    <img src="/co-organizer-icon.webp" alt="Co-Organizers" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
                    <span>Co-Organizers</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      affiliationsTab === 'co_organizers' ? 'bg-[#63474D]/10 text-[#63474D]' : 'bg-stone-200/70 text-stone-600'
                    }`}>
                      {coOrganizers.length}
                    </span>
                  </button>

                  {/* 4. Speakers */}
                  <button
                    type="button"
                    onClick={() => setAffiliationsTab('speakers')}
                    className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs sm:text-[13px] font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                      affiliationsTab === 'speakers'
                        ? 'bg-white text-[#63474D] shadow-xs border border-stone-200/90'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                  >
                    <img src="/speaker-icon.webp" alt="Speakers" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
                    <span>Speakers</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      affiliationsTab === 'speakers' ? 'bg-[#63474D]/10 text-[#63474D]' : 'bg-stone-200/70 text-stone-600'
                    }`}>
                      {speakers.length}
                    </span>
                  </button>
                </div>

                {/* Active Tab Input Area */}
                <div className="bg-stone-50/70 rounded-2xl p-4 border border-stone-200/80 space-y-3">
                  {/* 1. PAST SPONSORS PANEL */}
                  {affiliationsTab === 'past_sponsors' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            placeholder="Past Sponsor Brand Name (e.g. Telebirr, Safaricom, Dashen Bank)"
                            value={pastSponsorDraft.name}
                            onChange={(e) => setPastSponsorDraft({ ...pastSponsorDraft, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPastSponsor();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="Brand Website / Social URL (e.g. https://telebirr.et)"
                            value={pastSponsorDraft.website}
                            onChange={(e) => setPastSponsorDraft({ ...pastSponsorDraft, website: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPastSponsor();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <button
                            type="button"
                            onClick={handleAddPastSponsor}
                            disabled={!pastSponsorDraft.name.trim()}
                            className="w-full h-full min-h-[38px] px-3 rounded-xl bg-[#63474D] text-white hover:bg-[#4E373C] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            Add +
                          </button>
                        </div>
                      </div>

                      {pastSponsors.length === 0 ? (
                        <p className="text-xs text-stone-500 italic pt-1">
                          No past sponsors added yet. List companies who sponsored your previous events to prove corporate trust!
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {pastSponsors.map((ps, idx) => (
                            <div
                              key={idx}
                              className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs text-xs"
                            >
                              <img src="/sponsor-icon.webp" alt="Sponsor" className="w-4 h-4 object-contain shrink-0" />
                              <span className="font-semibold text-gray-900">{ps.name}</span>
                              {ps.website && (
                                <a
                                  href={formatLink(ps.website)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={ps.website}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePastSponsor(idx)}
                                className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. PARTNERS PANEL */}
                  {affiliationsTab === 'partners' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            placeholder="Partner Organization Name (e.g. ALX Ethiopia, MInT)"
                            value={partnerDraft.name}
                            onChange={(e) => setPartnerDraft({ ...partnerDraft, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPartner();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="Partner Website / Social Link"
                            value={partnerDraft.social}
                            onChange={(e) => setPartnerDraft({ ...partnerDraft, social: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPartner();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <button
                            type="button"
                            onClick={handleAddPartner}
                            disabled={!partnerDraft.name.trim()}
                            className="w-full h-full min-h-[38px] px-3 rounded-xl bg-[#63474D] text-white hover:bg-[#4E373C] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            Add +
                          </button>
                        </div>
                      </div>

                      {partners.length === 0 ? (
                        <p className="text-xs text-stone-500 italic pt-1">
                          No strategic partners added yet. Feature ecosystem partners or institutional collaborators.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {partners.map((pt, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs text-xs"
                            >
                              <img src="/partner-icon.webp" alt="Partner" className="w-4 h-4 object-contain shrink-0" />
                              <span className="font-semibold text-gray-900">{pt.name}</span>
                              {pt.social && (
                                <a
                                  href={formatLink(pt.social)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={pt.social}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePartner(idx)}
                                className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. CO-ORGANIZERS PANEL */}
                  {affiliationsTab === 'co_organizers' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            placeholder="Co-Organizer Organization / Individual Name (e.g. GDG Addis)"
                            value={coOrganizerDraft.name}
                            onChange={(e) => setCoOrganizerDraft({ ...coOrganizerDraft, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCoOrganizer();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="Social / Website / Telegram Link"
                            value={coOrganizerDraft.social}
                            onChange={(e) => setCoOrganizerDraft({ ...coOrganizerDraft, social: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCoOrganizer();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <button
                            type="button"
                            onClick={handleAddCoOrganizer}
                            disabled={!coOrganizerDraft.name.trim()}
                            className="w-full h-full min-h-[38px] px-3 rounded-xl bg-[#63474D] text-white hover:bg-[#4E373C] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            Add +
                          </button>
                        </div>
                      </div>

                      {coOrganizers.length === 0 ? (
                        <p className="text-xs text-stone-500 italic pt-1">
                          No co-organizers added yet. Let sponsors know if you are partnering with another entity or community to co-host.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {coOrganizers.map((co, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs text-xs"
                            >
                              <img src="/co-organizer-icon.webp" alt="Co-Organizer" className="w-4 h-4 object-contain shrink-0" />
                              <span className="font-semibold text-gray-900">{co.name}</span>
                              {co.social && (
                                <a
                                  href={formatLink(co.social)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={co.social}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveCoOrganizer(idx)}
                                className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. SPEAKERS PANEL */}
                  {affiliationsTab === 'speakers' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Speaker Full Name (e.g. Dr. Abebe)"
                            value={speakerDraft.name}
                            onChange={(e) => setSpeakerDraft({ ...speakerDraft, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSpeaker();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Role / Bio (e.g. Keynote, AI Lead)"
                            value={speakerDraft.role}
                            onChange={(e) => setSpeakerDraft({ ...speakerDraft, role: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSpeaker();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Social / Profile URL"
                            value={speakerDraft.social}
                            onChange={(e) => setSpeakerDraft({ ...speakerDraft, social: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSpeaker();
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <button
                            type="button"
                            onClick={handleAddSpeaker}
                            disabled={!speakerDraft.name.trim()}
                            className="w-full h-full min-h-[38px] px-3 rounded-xl bg-[#63474D] text-white hover:bg-[#4E373C] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            Add +
                          </button>
                        </div>
                      </div>

                      {speakers.length === 0 ? (
                        <p className="text-xs text-stone-500 italic pt-1">
                          No speakers added yet. Add keynote speakers, panelists, or presenters to highlight event caliber.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {speakers.map((spk, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs text-xs"
                            >
                              <img src="/speaker-icon.webp" alt="Speaker" className="w-4 h-4 object-contain shrink-0" />
                              <div>
                                <span className="font-semibold text-gray-900">{spk.name}</span>
                                {spk.role && <span className="text-gray-500 text-[11px] ml-1.5">({spk.role})</span>}
                              </div>
                              {spk.social && (
                                <a
                                  href={formatLink(spk.social)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={spk.social}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveSpeaker(idx)}
                                className="text-gray-400 hover:text-red-500 ml-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sponsorship Packages & Financials */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AA767C]/15 shadow-xl shadow-stone-900/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
                  <img src="/packages-icon.webp" alt="Sponsorship Packages" className="w-10 h-10 object-contain shrink-0" />
                  <span>2. Sponsorship Packages & Tiers</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Define tiered contribution options so sponsors know what deliverables they will receive.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-gray-600">Total Goal:</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.funding_goal}
                    onChange={(e) => setFormData({ ...formData, funding_goal: Number(e.target.value) })}
                    className="w-24 bg-white px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:border-[#63474D]"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="text-xs font-bold bg-transparent border-none focus:outline-none cursor-pointer text-[#63474D]"
                  >
                    <option value="ETB">ETB</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddPackage}
                  className="px-3 py-1.5 rounded-xl bg-[#63474D]/10 hover:bg-[#63474D]/20 text-[#63474D] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Tier
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {packages.map((pkg, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 hover:border-[#AA767C]/40 transition-colors relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Package Tier Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gold Partner"
                        value={pkg.name}
                        onChange={(e) => handlePackageChange(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-medium focus:border-[#63474D] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Amount ({formData.currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={pkg.amount}
                        onChange={(e) => handlePackageChange(idx, 'amount', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-medium focus:border-[#63474D] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                        Key Perks & Deliverables
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Booth, logo, 5 VIP passes"
                        value={pkg.perks}
                        onChange={(e) => handlePackageChange(idx, 'perks', e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-medium focus:border-[#63474D] outline-none"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end pt-5">
                      {packages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePackage(idx)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove package"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Direct Organizer Contacts */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AA767C]/15 shadow-xl shadow-stone-900/10 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-3">
                <img src="/phone-icon.webp" alt="Phone" className="w-10 h-10 object-contain shrink-0" />
                <span>3. Direct Organizer Contact Channels</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Sponsors will communicate with you directly off-platform via phone, email, and telegram once interested!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Contact Person / Representative *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sara Tesfaye"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                  Direct Phone Number (Callable) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+251 911 234 567"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
                  Official Contact Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="sponsor-relations@event.org"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-gray-400" />
                  Telegram Username or Channel (Optional)
                </label>
                <input
                  type="text"
                  placeholder="@saratesfaye or https://t.me/yourchannel"
                  value={formData.contact_telegram}
                  onChange={(e) => setFormData({ ...formData, contact_telegram: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              {/* Organizer Socials for Sponsors (Left-aligned, comfortable width) */}
              <div className="md:col-span-2 pt-6 border-t border-gray-100">
                <div className="w-full max-w-xl space-y-3.5">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                        Organizer Social Media Links (Displayed to Sponsors)
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Add any social platforms you want displayed on your proposal card
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSocial}
                      disabled={socials.length >= SOCIAL_PLATFORMS.length}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#63474D]/10 hover:bg-[#63474D]/20 text-[#63474D] text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Social</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {socials.map((soc, idx) => {
                      const config = getSocialConfig(soc.platform);
                      return (
                        <div key={idx} className="flex items-center gap-2.5">
                          {/* Communicating only through icon */}
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${config.borderColor} ${config.bgColor} shadow-2xs transition-transform hover:scale-105`}
                            style={{ color: config.color }}
                            title={config.name}
                          >
                            {config.icon('w-5 h-5')}
                          </div>
                          <input
                            type="text"
                            placeholder={config.placeholder}
                            value={soc.url}
                            onChange={(e) => handleSocialChange(idx, 'url', e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-xs sm:text-sm transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSocial(idx)}
                            className="p-2.5 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                            title={`Remove ${config.name} link`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal / Popup for Adding Social Media */}
          {isAddSocialOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
              onClick={() => setIsAddSocialOpen(false)}
            >
              <div
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                      Add Social Media
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Select a platform to add to your pitch
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddSocialOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {SOCIAL_PLATFORMS.map((plat) => {
                    const isAdded = isPlatformAdded(plat.id);
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleSelectPlatformToAdd(plat.id)}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                          isAdded
                            ? 'opacity-40 bg-gray-50 border-gray-200 cursor-not-allowed'
                            : 'bg-white hover:bg-stone-50 border-gray-200 hover:border-[#63474D] hover:shadow-xs cursor-pointer group'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${plat.bgColor} transition-transform ${isAdded ? '' : 'group-hover:scale-110'}`}
                          style={{ color: plat.color }}
                        >
                          {plat.icon('w-5 h-5')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-gray-900 truncate">
                            {plat.name}
                          </span>
                          <span className={`block text-[10px] ${isAdded ? 'text-gray-400 font-medium' : 'text-[#63474D] font-semibold'}`}>
                            {isAdded ? 'Added' : 'Select'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Submit Action: Centered, Green, Text Below, No Background Card */}
          <div className="flex flex-col items-center justify-center text-center pt-4 pb-2 space-y-2.5">
            <button
              type="submit"
              disabled={loading}
              className="px-9 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg hover:shadow-emerald-600/25 transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Publishing Pitch...' : 'Publish Pitch to Sponsors'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Visible instantly on verified sponsors' Explore feed.</span>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: My Pitches List */}
      {activeTab === 'my-pitches' && (
        <div className="space-y-6">
          {fetchLoading ? (
            <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
              <div className="animate-spin w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium">Loading your sponsorship pitches...</p>
            </div>
          ) : myApplications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-300">
              <div className="w-14 h-14 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto mb-4">
                <HandCoins className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No event pitches yet</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                Submit details about your upcoming event idea to start receiving interest from corporate sponsors.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#63474D] text-white text-xs font-bold hover:bg-[#4E373C] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Submit Your First Pitch
              </button>
            </div>
          ) : (
            <div className="divide-y-2 sm:divide-y-[3px] divide-gray-300">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="py-8 first:pt-2 last:pb-2 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30">
                          {app.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                          {app.event_type}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'FUNDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{app.event_title}</h3>
                    </div>

                    <div className="flex items-center gap-5 sm:gap-8 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium">Funding Goal</p>
                        <p className="text-lg sm:text-xl font-serif font-bold text-[#63474D]">
                          {app.funding_goal.toLocaleString()} {app.currency}
                        </p>
                      </div>

                      {/* Interested Sponsors: No red background box, text on its own */}
                      <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          Interested Sponsors
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {app.interested_sponsors_count || 0}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(app.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                        title="Withdraw pitch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata with substituted webp icons */}
                  <div className="flex flex-wrap items-center gap-6 my-2 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <img src="/calendar.webp" alt="Date" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                      <span className="font-medium">{app.expected_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src="/location.webp" alt="Location" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                      <span className="font-medium">{app.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="font-medium">{app.expected_attendees.toLocaleString()} Estimated Attendees</span>
                    </div>
                  </div>

                  {/* Description: text standing on its own, no card box */}
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-4xl">
                    "{app.description}"
                  </p>

                  {/* Configured Packages: subtle light tier colors */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Configured Packages:</p>
                    <div className="flex flex-wrap gap-2">
                      {app.packages?.map((p, i) => {
                        const badgeStyle = getPackageBadgeClasses(p.name);
                        return (
                          <div
                            key={i}
                            className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 ${badgeStyle.container}`}
                          >
                            <span className={`font-semibold ${badgeStyle.nameText}`}>{p.name}:</span>
                            <span className={`font-bold ${badgeStyle.amountText}`}>
                              {p.amount.toLocaleString()} {app.currency}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Two-Column Section: Track Record & Associations (Col 1) and Direct Contact (Col 2) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 pt-3">
                    {/* Column 1: Track Record & Associations */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Track Record & Associations:
                      </p>

                      {app.affiliations && (
                        (app.affiliations.past_sponsors && app.affiliations.past_sponsors.length > 0) ||
                        (app.affiliations.partners && app.affiliations.partners.length > 0) ||
                        (app.affiliations.co_organizers && app.affiliations.co_organizers.length > 0) ||
                        (app.affiliations.speakers && app.affiliations.speakers.length > 0)
                      ) ? (
                        <div className="flex flex-col gap-2.5">
                          {/* Past Sponsors */}
                          {app.affiliations.past_sponsors?.map((p, idx) => (
                            <div key={`ps-${idx}`} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-800">
                              <img src="/sponsor-icon.webp" alt="Sponsor" className="w-7 h-7 object-contain shrink-0" />
                              <span className="font-semibold text-gray-900">{p.name}</span>
                              {p.website && (
                                <a
                                  href={formatLink(p.website)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={p.website}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}

                          {/* Partners */}
                          {app.affiliations.partners?.map((pt, idx) => (
                            <div key={`pt-${idx}`} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-800">
                              <img src="/partner-icon.webp" alt="Partner" className="w-7 h-7 object-contain shrink-0" />
                              <span className="font-semibold text-gray-900">{pt.name}</span>
                              {pt.social && (
                                <a
                                  href={formatLink(pt.social)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={pt.social}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}

                          {/* Co-Organizers */}
                          {app.affiliations.co_organizers?.map((c, idx) => (
                            <div key={`co-${idx}`} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-800">
                              <img src="/co-organizer-icon.webp" alt="Co-Organizer" className="w-7 h-7 object-contain shrink-0" />
                              <span className="font-semibold text-gray-900">{c.name}</span>
                              {c.social && (
                                <a
                                  href={formatLink(c.social)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={c.social}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}

                          {/* Speakers */}
                          {app.affiliations.speakers?.map((s, idx) => (
                            <div key={`spk-${idx}`} className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-800">
                              <img src="/speaker-icon.webp" alt="Speaker" className="w-7 h-7 object-contain shrink-0" />
                              <span className="font-semibold text-gray-900">{s.name}</span>
                              {s.role && <span className="text-gray-500 text-xs">({s.role})</span>}
                              {s.social && (
                                <a
                                  href={formatLink(s.social)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#63474D] hover:underline"
                                  title={s.social}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No affiliations listed</p>
                      )}
                    </div>

                    {/* Column 2: Direct Contact */}
                    <div className="space-y-2.5">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Direct Contact:
                      </p>
                      <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{app.contact_name}</span>
                        </div>
                        {app.contact_phone && (
                          <div className="flex items-center gap-2.5">
                            <img src="/phone-icon.webp" alt="Phone" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                            <a href={`tel:${app.contact_phone}`} className="hover:underline">{app.contact_phone}</a>
                          </div>
                        )}
                        {app.contact_email && (
                          <div className="flex items-center gap-2.5">
                            <img src="/mail-icon.webp" alt="Email" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
                            <a href={`mailto:${app.contact_email}`} className="hover:underline">{app.contact_email}</a>
                          </div>
                        )}
                        {app.contact_telegram && (
                          <div className="flex items-center gap-2.5">
                            <span className="text-base leading-none">💬</span>
                            <span>{app.contact_telegram}</span>
                          </div>
                        )}

                        <div className="pt-2">
                          <Link
                            to="/organizer/events/create"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#63474D] hover:underline"
                          >
                            <span>Create Official Event Link</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
