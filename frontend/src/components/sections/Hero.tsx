import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import FadeIn from '../FadeIn';

export default function Hero() {
  return (
    <section className="relative pt-36 pb-20 lg:pt-44 lg:pb-32 overflow-hidden min-h-[82vh] flex items-center">
      {/*Background Image Layer with Tapered Gradient Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/hero.webp"
          alt="Ethiopian Community Ecosystem"
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-right lg:object-[82%_center] opacity-85"
        />
        {/* Soft Horizontal Fade: Leaves the middle and right wide open and clear */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#ffffff]/85 from-0% via-[#ffffff]/45 via-30% via-transparent via-90% to-transparent"></div>
        {/* Subtle Top Line and Bottom Line Edge Blend */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#ffffff]/40 from-0% via-transparent via-25% via-transparent via-70% to-[#ffffff] to-100%"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl space-y-6">
          <FadeIn delay={100}>
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-sheeba-dark leading-[1.12]">
              Event infrastructure built for Ethiopia&apos;s{' '}
              <span className="text-gradient">event & community ecosystem.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="font-sans text-sm sm:text-base text-gray-900 leading-relaxed max-w-2xl font-normal">
              Sheeba turns every attendance that matters into lasting proof. Attendees collect verified credentials of
              everywhere they show up. Organizers publish events with simple registration links, instant QR door check-in,
              and tamper-proof badges. Sponsors discover impactful upcoming gatherings to back with transparent, verified data.
            </p>
          </FadeIn>

          {/* CTAs */}
          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#63474D] text-white font-bold hover:bg-[#523a3f] shadow-md hover:shadow-lg transition-all duration-200 text-sm sm:text-base group"
              >
                <span>Register</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </FadeIn>

          {/* Sponsor Portal Entry - Transparent / Glassmorphic */}
          <FadeIn delay={400}>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-900">
              <span className="font-normal">Looking to sponsor premier gatherings & back upcoming initiatives?</span>
              <Link
                to="/sponsor/auth"
                className="inline-flex items-center gap-1.5 font-bold text-[#63474D] hover:text-[#2D1F23] bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/40 hover:border-[#63474D]/40 px-4 py-2 rounded-full shadow-sm transition-all duration-200"
              >
                <span>Are you a sponsor?</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FFA686]" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
