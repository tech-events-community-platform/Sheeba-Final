import React, { useState, useEffect } from 'react';
import {
  Award,
  Globe,
  CheckCircle2,
  Save,
  Link as LinkIcon,
  ShieldCheck,
  Building2,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { ISponsorshipDeal, ISponsorDeliverable } from '../../types/sponsorship';

export const SponsorDeliverablesPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Deals and saved deliverables from PostgreSQL
  const [deals, setDeals] = useState<ISponsorshipDeal[]>([]);
  const [deliverablesList, setDeliverablesList] = useState<ISponsorDeliverable[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string>(''); // '' = Default Brand Profile Template

  const mapDeliverableToForm = (del?: Partial<ISponsorDeliverable> | null) => ({
    companyName: del?.companyName || user?.companyName || user?.name || '',
    website: del?.website || (user as any)?.companyWebsite || (user as any)?.website || '',
    tagline: del?.tagline || '',
    primaryColor: del?.primaryColor || '#63474D',
    secondaryColor: del?.secondaryColor || '#FFA686',
    mediaKitUrl: del?.mediaKitUrl || '',
    bio: del?.bio || user?.bio || '',
    repName: del?.repName || user?.name || '',
    repTitle: del?.repTitle || 'Head of Sponsorships',
    repPhone: del?.repPhone || user?.phone || '',
    repEmail: del?.repEmail || user?.email || '',
    boothPreference: del?.boothPreference || 'Standard 3x3m Corner Exhibition Booth',
    avRequirements: del?.avRequirements || '1x 55-inch LED Display screen, 2x Roll-up Banner stands, 1x 220V power strip',
    ticketVouchersNeeded: del?.ticketVouchersNeeded || '5 VIP Passes + 10 Standard Attendee Badges',
    status: (del?.status || 'SUBMITTED') as string,
  });

  // Form state
  const [form, setForm] = useState(mapDeliverableToForm(null));

  // Load deals and persistent deliverables from backend
  const loadDeliverablesData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [dealsData, deliverablesData] = await Promise.all([
        api.sponsorship.getMyDeals().catch(() => []),
        api.sponsorship.getMyDeliverables().catch(() => []),
      ]);

      setDeals(dealsData);
      setDeliverablesList(deliverablesData);

      // Find default template (dealId is null or undefined)
      const defaultDel = deliverablesData.find((d: any) => !d.dealId);

      if (defaultDel) {
        setForm(mapDeliverableToForm(defaultDel));
      } else {
        // Fallback to localStorage data if user had previous offline drafts
        const localSaved = localStorage.getItem('sheeba_sponsor_deliverables');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            setForm((prev) => ({ ...prev, ...parsed }));
          } catch {}
        }
      }
    } catch (err: any) {
      console.error('Failed to load deliverables:', err);
      setErrorMessage(err.message || 'Failed to load deliverables from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliverablesData();
  }, []);

  // When selectedDealId changes, update form values
  const handleDealSelectionChange = (dealId: string) => {
    setSelectedDealId(dealId);
    setErrorMessage(null);

    if (!dealId) {
      // Switched to Default Brand Template
      const defaultDel = deliverablesList.find((d: any) => !d.dealId);
      if (defaultDel) {
        setForm(mapDeliverableToForm(defaultDel));
      }
    } else {
      // Switched to specific Deal
      const dealDel = deliverablesList.find((d: any) => d.dealId === dealId);
      const selectedDeal = deals.find((d) => d.id === dealId);

      if (dealDel) {
        setForm(mapDeliverableToForm(dealDel));
      } else {
        // Pre-fill from default template for seamless customization
        const defaultDel = deliverablesList.find((d: any) => !d.dealId);
        const base = mapDeliverableToForm(defaultDel);
        if (selectedDeal?.package_name?.toLowerCase().includes('platinum') || selectedDeal?.package_name?.toLowerCase().includes('gold')) {
          base.boothPreference = 'Premium 6x4m Central Exhibition Space';
        }
        setForm(base);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        dealId: selectedDealId || null,
        companyName: form.companyName,
        website: form.website || null,
        tagline: form.tagline || null,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        mediaKitUrl: form.mediaKitUrl || null,
        bio: form.bio || null,
        boothPreference: form.boothPreference || null,
        avRequirements: form.avRequirements || null,
        ticketVouchersNeeded: form.ticketVouchersNeeded || null,
        repName: form.repName,
        repTitle: form.repTitle,
        repPhone: form.repPhone,
        repEmail: form.repEmail,
        status: form.status || 'SUBMITTED',
      };

      await api.sponsorship.saveDeliverable(payload);

      // Keep localStorage synchronized for offline hydration
      localStorage.setItem('sheeba_sponsor_deliverables', JSON.stringify(form));

      // Refresh list
      const freshList = await api.sponsorship.getMyDeliverables().catch(() => []);
      setDeliverablesList(freshList);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to save deliverable:', err);
      setErrorMessage(err.message || 'Failed to persist deliverables to PostgreSQL.');
    } finally {
      setSaving(false);
    }
  };

  const currentDeal = deals.find((d) => d.id === selectedDealId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[#FFA686] text-xs font-semibold uppercase tracking-wider mb-3">
            <Award className="w-3.5 h-3.5" />
            Brand Assets & Partnership Profile
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Brand Deliverables and Contact
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-2 leading-relaxed">
            Provide your official brand identity assets, booth requirements, and authorized representative contact. Saved deliverables are persisted in PostgreSQL and automatically shared with event organizers upon sponsorship approval.
          </p>
        </div>
      </div>

      {/* Target Sponsorship Context / Deal Selector */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#70383D]" />
              <h3 className="text-sm font-bold text-gray-900">Deliverables Scope & Assignment</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose whether to manage your master default brand template or deliverables specific to a confirmed sponsorship deal.
            </p>
          </div>

          <div className="w-full sm:w-80">
            <select
              value={selectedDealId}
              onChange={(e) => handleDealSelectionChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-xs sm:text-sm font-medium text-gray-800 focus:border-[#70383D] focus:ring-2 focus:ring-[#70383D]/20 outline-none"
            >
              <option value="">⭐ Master Brand Deliverables Template</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.status}] {d.application?.event_title || 'Event Pitch'} — {d.package_name || 'Package'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedDealId && currentDeal && (
          <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="font-semibold text-gray-800">Target Pitch:</span>{' '}
            {currentDeal.application?.event_title || 'Pitch Application'}
            <span className="text-stone-300">•</span>
            <span className="font-semibold text-gray-800">Package:</span> {currentDeal.package_name || 'Custom'}
            <span className="text-stone-300">•</span>
            <span className="font-semibold text-gray-800">Status:</span>
            <span
              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                currentDeal.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentDeal.status === 'PENDING'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-stone-100 text-gray-700'
              }`}
            >
              {currentDeal.status}
            </span>
          </div>
        )}
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-sm font-bold">Deliverables Saved & Persisted Successfully!</div>
            <div className="text-xs text-emerald-700">
              Your assets and representative profile are stored in PostgreSQL and linked to{' '}
              {selectedDealId ? 'this sponsorship deal' : 'your default sponsor profile'}.
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="text-sm font-semibold">{errorMessage}</div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white border border-stone-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-[#70383D] animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Loading deliverables from database...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1: Brand Visual Identity & Media Kit */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="pb-3 border-b border-stone-200">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23]">
                1. Brand Visual Identity & Media Kit
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                High-resolution vectors and brand colors for event displays, web listings, and printed badges.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Company / Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Telebirr / Chapa Technologies"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  Corporate Website
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://yourcompany.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Official Brand Tagline
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. Empowering Next-Gen Ethiopian Innovation"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Primary Brand Color HEX
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-stone-300"
                    />
                    <input
                      type="text"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-xl border border-stone-300 text-sm font-mono bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Secondary Accent Color HEX
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-stone-300"
                    />
                    <input
                      type="text"
                      value={form.secondaryColor}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-xl border border-stone-300 text-sm font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                  Press Kit / High-Res Vector Logos URL (Google Drive / Dropbox)
                </label>
                <input
                  type="url"
                  value={form.mediaKitUrl}
                  onChange={(e) => setForm({ ...form, mediaKitUrl: e.target.value })}
                  placeholder="https://drive.google.com/your-brand-assets"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Short Company Boilerplate / About
                </label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Official company description for event handbooks and partner banners..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] focus:ring-2 focus:ring-[#63474D]/20 outline-none text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: On-Site Booth & Event Logistics Preferences */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="pb-3 border-b border-stone-200">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23]">
                2. On-Site Booth & Event Logistics Preferences
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Specify your company's space and technical requirements for physical events you sponsor.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Booth Space Preference
                </label>
                <input
                  type="text"
                  value={form.boothPreference}
                  onChange={(e) => setForm({ ...form, boothPreference: e.target.value })}
                  placeholder="e.g. Standard 3x3m Corner Exhibition Booth"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Expected Ticket Passes / Badges
                </label>
                <input
                  type="text"
                  value={form.ticketVouchersNeeded}
                  onChange={(e) => setForm({ ...form, ticketVouchersNeeded: e.target.value })}
                  placeholder="e.g. 5 VIP Passes + 10 Standard Attendee Badges"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Power & AV Specifications
                </label>
                <textarea
                  rows={2}
                  value={form.avRequirements}
                  onChange={(e) => setForm({ ...form, avRequirements: e.target.value })}
                  placeholder="e.g. 1x 55-inch LED Display screen, 2x Roll-up Banner stands, 1x 220V power strip"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] outline-none text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Authorized Representative Contact Info */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="pb-3 border-b border-stone-200">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23]">
                3. Authorized Representative Contact Info
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                The primary contact person organizers will communicate with regarding sponsorships and event day coordination.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Representative Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.repName}
                  onChange={(e) => setForm({ ...form, repName: e.target.value })}
                  placeholder="e.g. Dawit Haile"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Job Title / Corporate Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.repTitle}
                  onChange={(e) => setForm({ ...form, repTitle: e.target.value })}
                  placeholder="e.g. Head of Brand Sponsorships & Public Relations"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Direct Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.repPhone}
                  onChange={(e) => setForm({ ...form, repPhone: e.target.value })}
                  placeholder="+251 9..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] outline-none text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Official Work Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.repEmail}
                  onChange={(e) => setForm({ ...form, repEmail: e.target.value })}
                  placeholder="partnerships@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#63474D] outline-none text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-100 p-5 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {selectedDealId
                  ? 'Persisting deliverables for selected sponsorship deal in PostgreSQL.'
                  : 'Saving master brand deliverables template in PostgreSQL.'}
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] disabled:bg-[#63474D]/70 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Persisting to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Deliverables & Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
