import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface StrideMilestoneCardProps {
  className?: string;
  compact?: boolean;
}

export const StrideMilestoneCard: React.FC<StrideMilestoneCardProps> = ({
  className = '',
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className={`bg-gradient-to-r from-white via-[#FAF7F5] to-[#F4EFEB] rounded-2xl border border-[#E8DDD7] p-4 sm:p-5 shadow-xs relative overflow-hidden ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Uncropped Banner Thumbnail */}
          <div className="w-full sm:w-44 shrink-0 rounded-xl overflow-hidden border border-[#E8DDD7] shadow-xs bg-[#24171A]">
            <img
              src="/stride-poster.jpg"
              alt="STRIDE Ethiopia 2.0 Summit"
              className="w-full h-auto aspect-[1280/589] object-contain block"
              loading="lazy"
            />
          </div>

          <div className="space-y-1.5 flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#63474D]/10 text-[#63474D] text-[10px] font-bold uppercase tracking-wider border border-[#63474D]/20">
                <span>🏛️</span>
                <span>STRIDE 2.0 × MInT</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Proven Infrastructure
              </span>
            </div>

            <h4 className="font-serif text-base sm:text-lg font-bold text-[#2D1F23] tracking-tight">
              Trusted by Ethiopia&apos;s National Summits
            </h4>

            <p className="font-sans text-xs text-gray-700 leading-relaxed font-normal">
              Sheeba powered official door check-ins for STRIDE 2.0 hosted by the Ministry of Innovation & Technology (MInT).
            </p>

            <div className="pt-1">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#63474D] hover:text-[#2D1F23] transition-colors"
              >
                <span>Host your event with Sheeba</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-white via-[#FAF7F5] to-[#F4EFEB] rounded-2xl sm:rounded-3xl border border-[#E8DDD7] p-5 sm:p-6 md:p-7 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden ${className}`}
    >
      {/* Soft Ambient Accents */}
      <div className="absolute -right-14 -top-14 w-48 h-48 bg-[#FFA686]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-14 -bottom-14 w-48 h-48 bg-[#63474D]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 sm:gap-6">
        {/* Uncropped Official Poster */}
        <div className="w-full md:w-[45%] shrink-0">
          <div className="rounded-xl overflow-hidden border border-[#E8DDD7] shadow-sm bg-[#1e1416]">
            <img
              src="/stride-poster.jpg"
              alt="STRIDE Ethiopia 2.0 - Ministry of Innovation and Technology"
              className="w-full h-auto aspect-[1280/589] object-contain block hover:scale-[1.01] transition-transform duration-300"
              loading="eager"
            />
          </div>
        </div>

        {/* Client-Attracting Advertisement Pitch */}
        <div className="space-y-2.5 flex-1 min-w-0 w-full text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#63474D]/10 text-[#63474D] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-[#63474D]/20">
              <span>🏛️</span>
              <span>TRUSTED BY MInT • STRIDE 2.0</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              Verified Event
            </span>
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23] tracking-tight leading-snug">
            Powering Ethiopia&apos;s Flagship Gatherings
          </h3>

          <p className="font-sans text-xs sm:text-sm text-gray-700 leading-relaxed font-normal">
            Ethiopia&apos;s <strong className="text-[#2D1F23] font-semibold">Ministry of Innovation and Technology (MInT)</strong> chose Sheeba for official event infrastructure and live QR door check-ins at <strong className="text-[#2D1F23] font-semibold">STRIDE 2.0</strong>.
          </p>

          <p className="font-sans text-xs sm:text-sm text-gray-600 font-normal">
            Planning a summit, conference, or community event? Get seamless accreditation, instant check-ins, and sponsor-ready reports.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#63474D] hover:bg-[#523a3f] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer group"
            >
              <span>Host Your Event With Us</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <span className="inline-flex items-center gap-1 text-[11px] text-[#2A7B5F] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              Fast Setup & QR Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
