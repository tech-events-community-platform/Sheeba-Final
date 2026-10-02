import React from 'react';
import { Link } from 'react-router-dom';
import Hero from '../../components/sections/Hero';
import { RoleSpotlightSection } from '../../components/sections/RoleSpotlightSection';
import { HowItWorksSection } from '../../components/sections/HowItWorksSection';
import { LiveTicketSimulatorSection } from '../../components/sections/LiveTicketSimulatorSection';
import { StrideMilestoneCard } from '../../components/sections/StrideMilestoneCard';
import FadeIn from '../../components/FadeIn';
import { ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 sm:space-y-28 pb-24 overflow-hidden">
      {/* 1. HERO SECTION */}
      <Hero />

      {/* STRIDE 2.0 × MInT NATIONAL SUMMIT SHOWCASE */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-20">
        <FadeIn direction="up">
          <StrideMilestoneCard />
        </FadeIn>
      </section>

      {/* 2. ROLE SPOTLIGHT (FEATURES SECTION - SCREENSHOT 1 ALTERNATING LAYOUT) */}
      <RoleSpotlightSection />

      {/* 3. HOW IT WORKS (SCREENSHOT 2 PC MONITOR STANDS FLOW) */}
      <HowItWorksSection />

      {/* 4. LIVE TICKET & BADGE DASHBOARD SIMULATOR */}
      <LiveTicketSimulatorSection />

      {/* 5. MINIMALISTIC CLOSING CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <FadeIn direction="up">
          <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] text-white rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#FFA686]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[#FFA686] text-xs font-bold uppercase tracking-wider">
                <span>Proof You Showed Up</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Ready to elevate your event experience?
              </h2>
              <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto leading-relaxed font-medium">
                Join organizers, attendees, and sponsors building authentic, verifiable gatherings on Sheeba infrastructure.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#2D1F23] font-bold text-sm shadow-md hover:bg-stone-100 transition-all cursor-pointer"
                >
                  <span>Get Started / Register</span>
                  <ArrowRight className="w-4 h-4 text-[#63474D]" />
                </Link>
                <Link
                  to="/sponsor/auth"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm transition-all cursor-pointer"
                >
                  <span>Partner as a Sponsor</span>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
};
