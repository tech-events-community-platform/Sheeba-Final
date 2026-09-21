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
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { ISponsorshipApplication, ISponsorshipPackage } from '../../types/sponsorship';

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
  const [formData, setFormData] = useState({
    event_title: '',
    event_type: 'Conference',
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
    pitch_deck_url: '',
  });

  // Dynamic sponsor packages
  const [packages, setPackages] = useState<ISponsorshipPackage[]>([
    { name: 'Title / Headline Sponsor', amount: 30000, perks: 'Keynote speaking slot, prime booth space, logo on all event banners and badges, 10 VIP passes' },
    { name: 'Gold Partner', amount: 15000, perks: 'Standard exhibition booth, logo on attendee badges, 5 VIP passes, social media mentions' },
    { name: 'Community Supporter', amount: 5000, perks: 'Logo on digital backdrop, 2 passes, mention during opening remarks' },
  ]);

  // Dynamic organizer socials
  const [socials, setSocials] = useState<{ platform: string; url: string }[]>([
    { platform: 'LinkedIn', url: '' },
    { platform: 'X (Twitter)', url: '' },
    { platform: 'Website', url: '' },
  ]);

  const handleAddSocial = () => {
    setSocials((prev) => [...prev, { platform: '', url: '' }]);
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

      const payload = {
        ...formData,
        packages,
        socials: socialsMap,
      };

      await api.sponsorship.createApplication(payload);
      setSuccessMessage('Your pitch has been published to the Sponsor Marketplace! Verified sponsors can now discover your event and reach out directly.');
      
      // Reload applications and switch tab
      await loadMyApplications();
      setActiveTab('my-pitches');

      // Reset form
      setFormData({
        event_title: '',
        event_type: 'Conference',
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
        pitch_deck_url: '',
      });
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[#FFA686] text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Organizer Funding Hub
          </div>
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AA767C]/15 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#63474D]" />
                1. Upcoming Event Details
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
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all bg-white"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
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
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
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
                  value={formData.expected_attendees}
                  onChange={(e) => setFormData({ ...formData, expected_attendees: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
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

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Pitch & Concept Overview *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe your event objective, why sponsors should back it, and what value or exposure attendees and brands will gain..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sponsorship Packages & Financials */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AA767C]/15 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#63474D]" />
                  2. Sponsorship Packages & Tiers
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AA767C]/15 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <img src="/phone-icon.webp" alt="Phone" className="w-5 h-5 object-contain" />
                3. Direct Organizer Contact Channels
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

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  Pitch Deck / PDF Link (Google Drive, Dropbox, Notion - Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/your-pitch-deck.pdf"
                  value={formData.pitch_deck_url}
                  onChange={(e) => setFormData({ ...formData, pitch_deck_url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm transition-all"
                />
              </div>

              {/* Organizer Socials for Sponsors */}
              <div className="md:col-span-2 pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Organizer Social Media Links (Displayed to Sponsors)
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Add any social platforms you want displayed on your proposal card for sponsors (LinkedIn, X, TikTok, Website, etc.).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSocial}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#63474D]/10 hover:bg-[#63474D]/20 text-[#63474D] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Social</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {socials.map((soc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Platform (e.g. LinkedIn, X, TikTok)"
                        value={soc.platform}
                        onChange={(e) => handleSocialChange(idx, 'platform', e.target.value)}
                        className="w-1/3 px-3 py-2 rounded-xl border border-gray-200 focus:border-[#63474D] outline-none text-xs font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Link or Handle (e.g. https://linkedin.com/in/... or @handle)"
                        value={soc.url}
                        onChange={(e) => handleSocialChange(idx, 'url', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-[#63474D] outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSocial(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between bg-stone-100 p-5 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Visible instantly on verified sponsors' Explore feed.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Publishing Pitch...' : 'Publish Pitch to Sponsors'}
            </button>
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
            <div className="grid grid-cols-1 gap-5">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-3xl p-6 border border-[#AA767C]/15 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
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
                      <h3 className="text-xl font-bold text-gray-900">{app.event_title}</h3>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium">Funding Goal</p>
                        <p className="text-lg font-serif font-bold text-[#63474D]">
                          {app.funding_goal.toLocaleString()} {app.currency}
                        </p>
                      </div>

                      <div className="bg-[#FFA686]/15 border border-[#FFA686]/30 px-3 py-1.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-[#63474D]">Interested Sponsors</p>
                        <p className="text-base font-bold text-[#63474D]">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#63474D]" />
                      <span>{app.expected_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#63474D]" />
                      <span>{app.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#63474D]" />
                      <span>{app.expected_attendees.toLocaleString()} Estimated Attendees</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 line-clamp-2 mb-4 bg-gray-50 p-3 rounded-xl">
                    {app.description}
                  </p>

                  {/* Packages chips */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-gray-500 uppercase">Configured Packages:</p>
                    <div className="flex flex-wrap gap-2">
                      {app.packages?.map((p, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs flex items-center gap-2"
                        >
                          <span className="font-semibold text-gray-900">{p.name}:</span>
                          <span className="font-bold text-[#63474D]">
                            {p.amount.toLocaleString()} {app.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct Contact reminder banner */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span>Direct Contact: <strong>{app.contact_name}</strong></span>
                      <span>📞 {app.contact_phone}</span>
                      <span>✉️ {app.contact_email}</span>
                      {app.contact_telegram && <span>💬 {app.contact_telegram}</span>}
                    </div>

                    <Link
                      to="/organizer/events/create"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#63474D] hover:underline"
                    >
                      <span>Create Official Event Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
