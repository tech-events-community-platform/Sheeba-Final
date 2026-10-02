import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2, Building2 } from 'lucide-react';

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
        className={`bg-white rounded-2xl border border-[#E8DDD7] p-4 sm:p-5 shadow-xs relative overflow-hidden ${className}`}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#63474D] uppercase tracking-wider mb-3">
          <Building2 className="w-3.5 h-3.5 text-[#FFA686]" />
          <span>Who We Worked With</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-44 shrink-0 rounded-xl overflow-hidden border border-[#E8DDD7] bg-[#1a1215] shadow-xs">
            <img
              src="/stride-poster.jpg"
              alt="STRIDE Ethiopia 2.0 - Ministry of Innovation and Technology"
              className="w-full h-auto aspect-[1280/589] object-contain block"
              loading="lazy"
            />
          </div>

          <div className="space-y-1 flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-[#2D1F23]">STRIDE Ethiopia 2.0</span>
              <span className="text-[10px] font-semibold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                MInT Official Partner
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-normal">
              Official event infrastructure and QR check-ins for Ethiopia&apos;s Ministry of Innovation and Technology.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      {/* "Who We Worked With" Eyebrow & Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5 text-[#63474D]" />
          <span>Who We Worked With</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D1F23] tracking-tight">
          Trusted by Ethiopia&apos;s Flagship Summits
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto">
          Delivering secure, verifiable event infrastructure and live door check-ins for national institutions and premier gatherings.
        </p>
      </div>

      {/* Featured Partner Card */}
      <div className="bg-gradient-to-br from-white via-[#FAF7F5] to-[#F4EFEB] rounded-2xl sm:rounded-3xl border border-[#E8DDD7] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-6">
          {/* Uncropped STRIDE Official Banner */}
          <div className="w-full md:w-[46%] shrink-0">
            <div className="rounded-xl overflow-hidden border border-[#E8DDD7] bg-[#1a1215] shadow-xs">
              <img
                src="/stride-poster.jpg"
                alt="STRIDE Ethiopia 2.0 - Ministry of Innovation and Technology"
                className="w-full h-auto aspect-[1280/589] object-contain block hover:scale-[1.01] transition-transform duration-300"
                loading="eager"
              />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5 flex-1 min-w-0 w-full text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#63474D]/10 text-[#63474D] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-[#63474D]/20">
                <span>🏛️</span>
                <span>Ministry of Innovation & Technology (MInT)</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Verified Infrastructure Partner
              </span>
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2D1F23] tracking-tight">
              STRIDE Ethiopia 2.0 Summit
            </h3>

            <p className="font-sans text-xs sm:text-sm text-gray-700 leading-relaxed font-normal">
              Sheeba proudly delivered the official event infrastructure, verified QR attendee accreditation, and live check-in management for Ethiopia&apos;s <strong className="text-[#2D1F23] font-semibold">Ministry of Innovation and Technology</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#756366]">
              <span className="inline-flex items-center gap-1 text-[#2A7B5F] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live QR Accreditation
              </span>
              <span>•</span>
              <span className="font-medium text-[#63474D]">Addis Ababa, Ethiopia</span>
            </div>

            <div className="pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#63474D] hover:bg-[#523a3f] text-white text-xs font-bold shadow-xs transition-all cursor-pointer group"
              >
                <span>Host Your Next Event With Sheeba</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
