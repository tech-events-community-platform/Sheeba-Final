import React from 'react';
import FadeIn from '../FadeIn';
import { Award, Users, CalendarCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RoleSpotlightSection: React.FC = () => {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 lg:space-y-20 scroll-mt-28">
      {/* Section Header */}
      <FadeIn direction="up">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold uppercase tracking-wider">
            <span>Three-Sided Ecosystem</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D1F23] tracking-tight">
            How Sheeba Powers Every Role
          </h2>
          <p className="text-sm sm:text-base text-[#2D1F23] leading-relaxed font-medium">
            A unified, tamper-proof platform connecting attendees, organizers, and corporate sponsors with verified data and zero friction.
          </p>
        </div>
      </FadeIn>

      {/* Alternating Layout: Matching Screenshot 1 */}
      <div className="space-y-16 lg:space-y-24">
        {/* ROW 1: Attendees (Text Left, Image Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
          <FadeIn direction="right">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFA686]/20 text-[#63474D] text-xs font-bold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                <span>For Attendees</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D1F23]">
                Verifiable Proof of Attendance & Digital Badges
              </h3>
              <p className="text-sm sm:text-base text-[#2D1F23] leading-relaxed font-medium">
                Every time you attend a gathering that matters, your participation is preserved as authentic, tamper-proof proof. No more digging through inbox clutter for paper tickets or lost confirmation emails. Attendees carry a permanent digital pass wallet and earn official participation badges (from Attended and Participant to Speaker and Winner) recognized by organizations and peers across Ethiopia.
              </p>
              <div className="pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#63474D] hover:text-[#4E373C] group"
                >
                  <span>Create your attendee profile</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </FadeIn>

          <FadeIn direction="left">
            <div className="flex justify-center md:justify-end">
              <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 max-w-lg w-full bg-white">
                <img
                  src="/landing-attendee.webp"
                  alt="Attendees collecting verified digital credentials"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ROW 2: Organizers (Image Left, Text Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
          <FadeIn direction="right" className="order-2 md:order-1">
            <div className="flex justify-center md:justify-start">
              <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 max-w-lg w-full bg-white">
                <img
                  src="/landing-organizers.webp"
                  alt="Organizers managing door check-in and attendee lists"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </FadeIn>

          <FadeIn direction="left" className="order-1 md:order-2">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold uppercase tracking-wider">
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>For Organizers</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D1F23]">
                Effortless Door Check-In & Sponsor Pitching
              </h3>
              <p className="text-sm sm:text-base text-[#2D1F23] leading-relaxed font-medium">
                Organizing events should never be bottlenecked by manual spreadsheets or long entrance queues. Sheeba equips organizers with instant registration links, camera-based QR door scanners that verify tickets in under half a second, and automated badge issuance. Furthermore, organizers can pitch upcoming, uncreated events on the marketplace to secure funding from sponsors before opening doors.
              </p>
              <div className="pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#63474D] hover:text-[#4E373C] group"
                >
                  <span>Start hosting with Sheeba</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ROW 3: Sponsors (Text Left, Image Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
          <FadeIn direction="right">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFA686]/20 text-[#63474D] text-xs font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" />
                <span>For Sponsors</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D1F23]">
                Marketplace Discovery & Transparent Turnout Metrics
              </h3>
              <p className="text-sm sm:text-base text-[#2D1F23] leading-relaxed font-medium">
                Fund premier community organizers and get your products, goods, and services directly promoted to engaged audiences. Through the Sheeba Marketplace, corporate sponsors discover upcoming gatherings, back organizers with financial sponsorship, and secure tangible brand promotion including dedicated product booths, on-stage spotlights, live product demos, and official co-branding. Track every pledge transparently in Deals and Pledges, coordinate custom deliverables, and receive verifiable post-event turnout proof backed by real door scans.
              </p>
              <div className="pt-2">
                <Link
                  to="/sponsor/auth"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#63474D] hover:text-[#4E373C] group"
                >
                  <span>Explore sponsor marketplace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </FadeIn>

          <FadeIn direction="left">
            <div className="flex justify-center md:justify-end">
              <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-lg hover:shadow-2xl transition-all duration-300 max-w-lg w-full bg-white">
                <img
                  src="/landing-sponsor.webp"
                  alt="Sponsors promoting products and discovering upcoming event pitches"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};
