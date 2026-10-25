import React from 'react';
import FadeIn from '../FadeIn';
import { Link } from 'react-router-dom';
import {
  Store,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers,
  Building2,
  Calendar,
  Check,
} from 'lucide-react';

export const ExhibitorSpotlightSection: React.FC = () => {
  return (
    <section id="exhibitors" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-28">
      {/* Section Header */}
      <FadeIn direction="up">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold uppercase tracking-wider">
            <Store className="w-3.5 h-3.5 text-[#FFA686]" />
            <span>Exhibitors & Product Showcases</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D1F23] tracking-tight">
            Put Your Product on the Exhibition Floor
          </h2>
          <p className="text-sm sm:text-base text-[#2D1F23]/80 leading-relaxed font-medium">
            Take center stage at Ethiopia&apos;s most influential gatherings. Connect face-to-face with attendees, demo software, and turn physical foot traffic into lasting business partnerships.
          </p>
        </div>
      </FadeIn>

      {/* Main 2-Column Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Value Prop & Explanation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <FadeIn direction="right">
            <div className="space-y-4">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D1F23]">
                What Exhibiting on Sheeba Means
              </h3>
              <p className="text-sm sm:text-base text-[#2D1F23]/80 leading-relaxed font-medium">
                Exhibiting gives your company a dedicated physical booth footprint at live conferences, summits, and hackathons. Rather than being lost in generic sponsor slides, your team meets developers, executives, and buyers face-to-face.
              </p>
            </div>
          </FadeIn>

          {/* 3 Core Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <FadeIn direction="up" delay={0.1}>
              <div className="p-4 rounded-2xl bg-white border border-[#E8DDD7] shadow-xs space-y-2 hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-xl bg-[#FFA686]/20 flex items-center justify-center text-[#63474D]">
                  <Users className="w-4 h-4 text-[#63474D]" />
                </div>
                <h4 className="font-bold text-sm text-[#2D1F23]">High-Intent Exposure</h4>
                <p className="text-xs text-[#2D1F23]/70 leading-relaxed">
                  Engage directly with pre-verified attendees eager to test solutions and meet founders.
                </p>
              </div>
            </FadeIn>

            <FadeIn direction="up" delay={0.2}>
              <div className="p-4 rounded-2xl bg-white border border-[#E8DDD7] shadow-xs space-y-2 hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                  <Layers className="w-4 h-4 text-emerald-700" />
                </div>
                <h4 className="font-bold text-sm text-[#2D1F23]">Organizer Configured</h4>
                <p className="text-xs text-[#2D1F23]/70 leading-relaxed">
                  Clear booth dimensions, transparent pricing (fixed or per-m²), and custom requirements.
                </p>
              </div>
            </FadeIn>

            <FadeIn direction="up" delay={0.3}>
              <div className="p-4 rounded-2xl bg-white border border-[#E8DDD7] shadow-xs space-y-2 hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-xl bg-[#63474D]/10 flex items-center justify-center text-[#63474D]">
                  <Sparkles className="w-4 h-4 text-[#63474D]" />
                </div>
                <h4 className="font-bold text-sm text-[#2D1F23]">Live Discovery</h4>
                <p className="text-xs text-[#2D1F23]/70 leading-relaxed">
                  Browse open calls with real-time remaining booth capacity and confirmed deadlines.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* CTA Row */}
          <FadeIn direction="up" delay={0.35}>
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/exhibitors"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-sm shadow-md transition-all group"
              >
                <span>Explore Exhibitor Opportunities</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/exhibitor/auth"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-gray-50 border border-[#E8DDD7] text-[#2D1F23] font-bold text-sm transition-all"
              >
                <span>Exhibitor Portal Login</span>
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Right Column: Visual Mockup of an Active Booth Call Card (5 cols) */}
        <div className="lg:col-span-5">
          <FadeIn direction="left">
            <div className="relative">
              {/* Decorative Blur Accent */}
              <div className="absolute -top-6 -right-6 w-56 h-56 bg-[#FFA686]/20 rounded-full blur-3xl pointer-events-none" />

              {/* Interactive Visual Card Container */}
              <div className="relative bg-white border border-[#E8DDD7] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#63474D] flex items-center justify-center text-white">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-sm text-[#2D1F23] block leading-tight">
                        Exhibition Space Call
                      </span>
                      <span className="text-[10px] text-gray-500 block">
                        Verified Event Marketplace
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Accepting Applications
                  </span>
                </div>

                {/* Sample Event Info */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                    Tech & Enterprise Summit 2026
                  </span>
                  <h4 className="font-serif font-bold text-lg text-[#2D1F23] leading-snug">
                    Main Exhibition Floor • Addis Ababa
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Nov 14–16, 2026
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      Millennium Hall
                    </span>
                  </div>
                </div>

                {/* Pricing & Terms Pill Box */}
                <div className="p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Pricing Mode</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#63474D]/10 text-[#63474D]">
                      Per m² or Fixed Fee
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Available Floor Space</span>
                    <span className="font-bold text-[#2D1F23]">34 m² remaining</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60">
                    <span className="text-gray-500 font-medium">Booth Setup Includes</span>
                    <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Power, Table, 2 Passes
                    </span>
                  </div>
                </div>

                {/* Notice & Trust Indicator */}
                <div className="flex items-start gap-2.5 text-xs text-gray-500 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Organizers review each showcase application before payment is requested. No upfront risk.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};
