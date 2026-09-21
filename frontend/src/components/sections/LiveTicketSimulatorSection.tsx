import React, { useState } from 'react';
import FadeIn from '../FadeIn';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  RefreshCw,
  Download,
  Calendar,
  MapPin,
  User,
  Briefcase,
  Share2,
  ChevronRight,
  LayoutDashboard,
  Award,
  Settings,
  Ticket,
} from 'lucide-react';

export const LiveTicketSimulatorSection: React.FC = () => {
  const [attendeeName, setAttendeeName] = useState('Sara Tesfaye');
  const [jobTitle, setJobTitle] = useState('Founder & Lead Organizer');
  const [hasSimulated, setHasSimulated] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Popular hardcoded event
  const eventName = 'Sheeba Annual Summit 2026';
  const eventDate = 'Saturday, Nov 14, 2026 • 09:00 AM';
  const eventVenue = 'Millennium Hall, Addis Ababa';

  // Dynamic pass token derived from state
  const cleanName = attendeeName.trim();
  const passCode = `SHB-${(cleanName.replace(/\s+/g, '').slice(0, 3) || 'USR').toUpperCase()}-8921`;
  const qrTokenPayload = `SHEEBA_PASS:${passCode}:${cleanName || 'Attendee'}:${eventName}`;

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setHasSimulated(true);
    }, 350);
  };

  return (
    <section id="simulator" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-28">
      {/* Section Header & Subtitle */}
      <FadeIn direction="up">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D1F23] tracking-tight">
            Your sample ticket and badge
          </h2>
          <p className="text-sm sm:text-base text-[#2D1F23] leading-relaxed font-medium">
            Simulate a live ticket and badge to see what your dashboard looks like.
          </p>
        </div>
      </FadeIn>

      {/* Horizontal Input Row (Full Name, Job Title, and Simulate Button) */}
      <FadeIn direction="up">
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-full p-2 sm:p-2.5 border border-[#AA767C]/30 shadow-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSimulate();
            }}
            className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3"
          >
            {/* Input 1: Full Name */}
            <div className="w-full sm:flex-1 relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[#63474D]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder="Your Full Name (e.g. Sara Tesfaye)"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-gray-200 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold text-[#2D1F23] placeholder-gray-400 focus:border-[#63474D] focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Input 2: Job Title */}
            <div className="w-full sm:flex-1 relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[#63474D]">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Job Title (e.g. Founder & Lead Organizer)"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-gray-200 rounded-xl sm:rounded-full text-xs sm:text-sm font-semibold text-[#2D1F23] placeholder-gray-400 focus:border-[#63474D] focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Simulate Button */}
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full sm:w-auto px-7 py-2.5 bg-[#63474D] hover:bg-[#523a3f] text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-75"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FFA686]" />
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-[#FFA686]" />
                  <span>Simulate</span>
                </>
              )}
            </button>
          </form>
        </div>
      </FadeIn>

      {/* Visibility State: Render Only When Simulated */}
      {!hasSimulated ? (
        <FadeIn direction="up">
          <div className="max-w-2xl mx-auto text-center py-12 px-6 rounded-3xl border-2 border-dashed border-[#AA767C]/30 bg-white/40 backdrop-blur-xs space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#63474D]/10 flex items-center justify-center text-[#63474D]">
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#2D1F23]">Interactive Preview Ready</h3>
            <p className="text-xs sm:text-sm text-[#2D1F23]/80 font-medium max-w-md mx-auto">
              Enter your name and job title above, then click <span className="font-bold text-[#63474D]">&apos;Simulate&apos;</span> to reveal your compact ticket pass and verified badge dashboard.
            </p>
          </div>
        </FadeIn>
      ) : (
        <FadeIn direction="up">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
            {/* Left: Compact, Smaller Sized Ticket */}
            <div className="lg:col-span-4 flex justify-center w-full">
              <div className="w-full max-w-[290px] bg-white rounded-2xl shadow-lg border border-[#AA767C]/25 overflow-hidden transition-all duration-300">
                {/* Plum Header */}
                <div className="bg-[#63474D] text-white px-4 py-3.5 text-center">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <img
                        src="/logo.webp"
                        alt="Sheeba Logo"
                        className="h-6 w-auto object-contain shrink-0 drop-shadow-xs"
                      />
                      <span className="font-serif font-bold text-sm tracking-wider text-white">
                        SHEEBA<span className="text-[#FFA686]">.</span>
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      <span>VALID</span>
                    </span>
                  </div>

                  <h3 className="font-serif text-sm font-bold text-white leading-snug">
                    {eventName}
                  </h3>
                  <p className="text-[9px] text-[#E8DDD7] font-mono tracking-wider mt-0.5">
                    OFFICIAL DIGITAL PASS
                  </p>
                </div>

                {/* Compact Body */}
                <div className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#756366] block">
                        ATTENDEE
                      </span>
                      <p className="font-bold text-[#2D1F23] text-xs truncate">
                        {attendeeName || 'Sara Tesfaye'}
                      </p>
                      <p className="text-[10px] text-[#756366] truncate">
                        {jobTitle || 'Founder & Lead Organizer'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-[#756366] block">
                        PASS NO.
                      </span>
                      <span className="font-mono font-bold text-[10px] text-[#2D1F23] bg-stone-100 px-1.5 py-0.5 rounded border border-gray-200">
                        {passCode}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100 text-[11px] text-[#2D1F23]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#63474D] shrink-0" />
                      <span className="truncate">{eventDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#63474D] shrink-0" />
                      <span className="truncate">{eventVenue}</span>
                    </div>
                  </div>

                  {/* Dotted Tear Line with side notches */}
                  <div className="relative py-1 flex items-center justify-center">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-3 h-6 bg-[#fcfafc] rounded-r-full border-r border-[#AA767C]/30" />
                    <div className="w-full border-t border-dashed border-gray-300" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-3 h-6 bg-[#fcfafc] rounded-l-full border-l border-[#AA767C]/30" />
                  </div>

                  {/* Compact QR Code Display */}
                  <div className="text-center space-y-2">
                    <div className="p-2.5 rounded-xl border border-gray-200 bg-[#FAF7F5] inline-block shadow-inner">
                      <QRCodeSVG
                        value={qrTokenPayload}
                        size={88}
                        bgColor="#FAF7F5"
                        fgColor="#63474D"
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-[10px] text-[#756366] font-medium">
                      Tamper-proof signed entrance credential
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Thin Rectangular Row Dashboard with Minimized Sidebar (Matching Blue Sketch) */}
            <div className="lg:col-span-8 w-full">
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#AA767C]/25 shadow-lg overflow-hidden flex flex-col sm:flex-row items-stretch">
                {/* Minimized Non-Clickable Sidebar (For UI Visual Aesthetic Only) */}
                <div
                  className="w-full sm:w-14 sm:min-w-[56px] bg-[#2D1F23] text-stone-300 flex sm:flex-col items-center justify-between sm:justify-start gap-4 p-3 sm:py-5 select-none shrink-0"
                  title="Sidebar Minimized"
                >
                  {/* Minimized toggle chevron indicator */}
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#FFA686]">
                    <ChevronRight className="w-4 h-4" />
                  </div>

                  {/* UI Mockup Navigation Icons (Non-clickable) */}
                  <div className="flex sm:flex-col items-center gap-3 sm:gap-4 sm:pt-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-[#FFA686]/20 text-[#FFA686] flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hidden sm:flex">
                      <Settings className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Dashboard Main Area (Thin Horizontal Content) */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-4">
                  {/* Top Bar: Event Name & Small Action Buttons */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D] bg-[#63474D]/10 px-2 py-0.5 rounded-full">
                          {eventName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
                          Verified Attendee Space
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm sm:text-base text-[#2D1F23] truncate mt-0.5">
                        Attendee Badges &amp; Turnout Proof
                      </h4>
                    </div>

                    {/* Small Non-Working Export & Share Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="px-2.5 py-1 rounded-lg bg-stone-100 border border-gray-200 text-gray-700 text-[11px] font-bold flex items-center gap-1.5 opacity-80 cursor-not-allowed hover:bg-stone-100 transition-none"
                        title="Export (Simulation preview)"
                      >
                        <Download className="w-3 h-3 text-[#63474D]" />
                        <span>Export</span>
                      </button>

                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="px-2.5 py-1 rounded-lg bg-stone-100 border border-gray-200 text-gray-700 text-[11px] font-bold flex items-center gap-1.5 opacity-80 cursor-not-allowed hover:bg-stone-100 transition-none"
                        title="Share (Simulation preview)"
                      >
                        <Share2 className="w-3 h-3 text-[#63474D]" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>

                  {/* Thin Badge Row */}
                  <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-stone-50 via-white to-stone-50/50 border border-[#AA767C]/20 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
                      {/* Single Badge Display */}
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 shadow-sm ring-2 ring-[#FFA686]/40">
                        <img
                          src="/badges/attended-badge.webp"
                          alt="Attended Badge"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif font-bold text-sm sm:text-base text-[#2D1F23]">
                            Attended Badge
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Verified Proof
                          </span>
                        </div>
                        <p className="text-xs text-[#2D1F23] font-semibold truncate mt-0.5">
                          {attendeeName || 'Sara Tesfaye'}{' '}
                          <span className="text-gray-500 font-normal">
                            • {jobTitle || 'Founder & Lead Organizer'}
                          </span>
                        </p>
                        <p className="text-[10px] text-[#756366] font-mono truncate mt-0.5">
                          Credential ID: {passCode}-VERIFIED • Event: {eventName}
                        </p>
                      </div>
                    </div>

                    {/* Minted Status Indicator */}
                    <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 shrink-0">
                      <span className="text-[9px] uppercase font-bold text-gray-400">
                        Status
                      </span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Sealed &amp; Claimed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      )}
    </section>
  );
};

