import React from 'react';
import Hero from '../../components/sections/Hero';
import { RoleSpotlightSection } from '../../components/sections/RoleSpotlightSection';
import { HowItWorksSection } from '../../components/sections/HowItWorksSection';
import { LiveTicketSimulatorSection } from '../../components/sections/LiveTicketSimulatorSection';
import { StrideMilestoneCard } from '../../components/sections/StrideMilestoneCard';
import { ContactUsSection } from '../../components/sections/ContactUsSection';
import { EventDiscoverySection } from '../../components/events/EventDiscoverySection';
import { FAQSection } from '../../components/sections/FAQSection';
import FadeIn from '../../components/FadeIn';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 sm:space-y-28 pb-24 overflow-hidden">
      {/* 1. HERO SECTION */}
      <Hero />

      {/* TRUSTED BY NATIONAL SUMMIT CAROUSEL */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-20">
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

      {/* 5. EXPLORE COMMUNITY EVENTS (PUBLICIZED IN SHEEBA) */}
      <section id="explore-events" className="max-w-6xl mx-auto px-4 sm:px-6">
        <FadeIn direction="up">
          <EventDiscoverySection limit={6} />
        </FadeIn>
      </section>

      {/* 6. CONTACT US SECTION (BREVO-POWERED INBOX DISPATCH) */}
      <ContactUsSection id="contact" />

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <FAQSection />
    </div>
  );
};
