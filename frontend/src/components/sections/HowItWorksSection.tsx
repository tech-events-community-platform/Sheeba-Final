import React from 'react';
import FadeIn from '../FadeIn';
import { ArrowRight, QrCode, ShieldCheck, Award, CheckCircle2, Zap } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Publish or Pitch',
      subtitle: 'Create & Discover',
      desc: 'Organizers publish live events or pitch upcoming concepts to verified sponsors. Attendees register in one click to get digital passes.',
      screenHeader: 'sheeba.et/events/create',
      badgeText: 'Registration & Pitch',
      mockContent: (
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>Pass #SHB-2026</span>
            <span className="text-emerald-700 font-bold">OPEN</span>
          </div>
          <div className="p-2.5 bg-[#FAF7F5] rounded-xl border border-gray-200/80 space-y-1">
            <p className="font-serif font-bold text-xs text-gray-900 truncate">Sheeba Annual Summit</p>
            <p className="text-[10px] text-gray-500">Millennium Hall • Nov 2026</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] bg-[#FFA686]/20 text-[#63474D] font-bold px-2 py-0.5 rounded-full">
              Sponsor Funded
            </span>
            <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Live Pass
            </span>
          </div>
        </div>
      ),
    },
    {
      step: '02',
      title: 'Scan at the Door',
      subtitle: 'Instant Door Check-In',
      desc: 'Attendees present dynamic QR passes at venue entry. Staff verify tickets in under 0.5 seconds with any camera phone. Zero duplicate entries.',
      screenHeader: 'sheeba.et/organizer/scanner',
      badgeText: 'Dynamic QR Scanner',
      mockContent: (
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono text-left">
            <span>Scanner: Camera 01</span>
            <span className="text-emerald-700 font-bold">&lt; 0.5s</span>
          </div>
          <div className="p-2 bg-[#2D1F23] rounded-xl border border-[#FFA686]/30 text-white flex items-center justify-center gap-2.5 shadow-xs">
            <QrCode className="w-8 h-8 text-[#FFA686] shrink-0" />
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Verified Entry</span>
              </div>
              <p className="text-[10px] text-white/80 truncate">Sara Tesfaye</p>
            </div>
          </div>
          <p className="text-[9px] text-gray-500 font-mono">Dynamic Signed Token Auth</p>
        </div>
      ),
    },
    {
      step: '03',
      title: 'Proof & Pledges',
      subtitle: 'Verified Badges & Reports',
      desc: 'Attendees automatically receive tamper-proof badges in their public profile. Organizers and sponsors access 100% verified attendance reports.',
      screenHeader: 'sheeba.et/app/record',
      badgeText: 'Tamper-Proof Proof',
      mockContent: (
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>Credential ID: #BADGE-91</span>
            <span className="text-emerald-700 font-bold">ISSUED</span>
          </div>
          <div className="p-2 bg-gradient-to-r from-emerald-50 to-stone-50 rounded-xl border border-emerald-200/80 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#63474D] text-[#FFA686] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900">Attended Badge</p>
              <p className="text-[10px] text-gray-500">Verified Turnout: 94.2%</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
            <span>Sponsor Report CSV Ready</span>
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 scroll-mt-28">
      {/* Section Header */}
      <FadeIn direction="up">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D1F23] tracking-tight">
            How Sheeba Works Step by Step
          </h2>
          <p className="text-sm sm:text-base text-[#2D1F23] leading-relaxed font-medium">
            A seamless three-phase lifecycle connecting organizers, attendees, and sponsors through verified attendance.
          </p>
        </div>
      </FadeIn>

      {/* PC Monitors Flow (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 items-start relative">
        {steps.map((item, idx) => (
          <FadeIn key={item.step} delay={idx * 150} className="relative flex flex-col items-center">
            {/* PC Monitor Container */}
            <div className="w-full max-w-sm mx-auto flex flex-col items-center group">
              {/* Monitor Screen Frame */}
              <div className="w-full bg-[#1F171A] rounded-2xl p-2.5 shadow-2xl border-2 border-[#4A3238] transition-transform duration-300 group-hover:-translate-y-1">
                {/* Top Bezel Camera Dot */}
                <div className="flex items-center justify-center gap-1.5 pb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  <div className="w-1 h-1 rounded-full bg-gray-700" />
                </div>

                {/* Inner Display Area */}
                <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-inner flex flex-col">
                  {/* Browser Bar */}
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[9px] font-mono text-gray-400 truncate max-w-[140px]">
                      {item.screenHeader}
                    </span>
                    <div className="w-2" />
                  </div>

                  {/* Screen Content Body */}
                  <div className="p-4 bg-gradient-to-b from-white to-stone-50 h-[210px] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-[#63474D] uppercase tracking-wider bg-[#FFA686]/20 px-2 py-0.5 rounded">
                          Step {item.step}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {item.badgeText}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-base text-gray-900">
                        {item.title}
                      </h4>
                    </div>

                    {/* Step Visual Interactive Card */}
                    <div className="py-1">
                      {item.mockContent}
                    </div>
                  </div>
                </div>

                {/* Monitor Bottom Chin Bar */}
                <div className="pt-2 pb-0.5 flex justify-center">
                  <div className="w-6 h-1 rounded-full bg-gray-700" />
                </div>
              </div>

              {/* Monitor Stand Neck */}
              <div className="w-6 h-8 bg-gradient-to-b from-gray-700 via-gray-600 to-gray-500 shadow-md" />

              {/* Monitor Stand Base / Leg */}
              <div className="w-32 sm:w-40 h-2.5 bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600 rounded-full shadow-lg border-t border-white/20" />

              {/* Step Description Below PC (Strictly Aligned) */}
              <div className="mt-5 text-center px-2 flex flex-col items-center w-full">
                <div className="h-7 flex items-center justify-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
                    {item.subtitle}
                  </p>
                </div>
                <div className="mt-1 min-h-[4.5rem] flex items-start justify-center">
                  <p className="text-xs sm:text-sm text-[#2D1F23] leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Connecting Arrow for Desktop (between 1 -> 2 and 2 -> 3) */}
            {idx < steps.length - 1 && (
              <div className="hidden lg:flex absolute top-28 -right-4 z-20 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center text-[#63474D]">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </FadeIn>
        ))}
      </div>
    </section>
  );
};
