import React, { useState } from 'react';
import {
  Award,
  Globe,
  CheckCircle2,
  Save,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SponsorDeliverablesPage: React.FC = () => {
  const { user } = useAuth();
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Deliverables & Profile form state with local storage hydration
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('sheeba_sponsor_deliverables');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      companyName: user?.companyName || user?.name || '',
      website: (user as any)?.website || '',
      tagline: '',
      primaryColor: '#63474D',
      secondaryColor: '#FFA686',
      mediaKitUrl: '',
      bio: '',
      repName: user?.name || '',
      repTitle: '',
      repPhone: user?.phone || '',
      repEmail: user?.email || '',
      boothPreference: 'Standard 3x3m Corner Exhibition Booth',
      avRequirements: '1x 55-inch LED Display screen, 2x Roll-up Banner stands, 1x 220V power strip',
      ticketVouchersNeeded: '5 VIP Passes + 10 Standard Attendee Badges',
    };
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sheeba_sponsor_deliverables', JSON.stringify(form));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

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
            Provide your official brand identity assets, booth requirements, and authorized representative contact so event organizers can accurately showcase your brand on event badges, digital backdrops, and promotional materials.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">
            Brand deliverables and representative profile saved successfully!
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-2">
        {/* SECTION 1: Brand Visual Identity & Media Kit (Unboxed, formal, separated by line) */}
        <div className="space-y-5 pt-2">
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
                required
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

        {/* THICK GREY LINE DIVIDER */}
        <div className="w-full h-1 bg-stone-300 rounded-full my-8" />

        {/* SECTION 2: On-Site Booth & Event Logistics Preferences */}
        <div className="space-y-5">
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

        {/* THICK GREY LINE DIVIDER */}
        <div className="w-full h-1 bg-stone-300 rounded-full my-8" />

        {/* SECTION 3: Authorized Representative Contact Info */}
        <div className="space-y-5">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
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
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
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

        {/* Save Button */}
        <div className="pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-100 p-5 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Shared with organizers when you mark interest in their event.</span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Deliverables & Profile</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
