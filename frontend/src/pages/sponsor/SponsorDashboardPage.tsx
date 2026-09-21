import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Building2,
  Users,
  Award,
  BarChart3,
  Sparkles,
  CalendarCheck,
  ShieldCheck,
  Globe,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SponsorDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* 1. Welcome Banner Card */}
      <div className="bg-gradient-to-br from-[#63474D] via-[#523A3F] to-[#2D1F23] text-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-lg relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-[#FFA686]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[#FFA686] text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Corporate Partner</span>
              </span>
              <span className="text-xs text-white/70 font-mono">
                ID: {user?.id?.slice(0, 8) || 'SHB-SPN'}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Welcome, {user?.companyName || user?.organization || 'Partner'}
            </h1>

            <p className="text-sm text-white/85 max-w-2xl leading-relaxed font-light">
              Connect your brand with Ethiopia&apos;s fastest-growing developer communities. Your approved sponsor account grants you direct visibility into genuine attendee turnout and verified tech credentials.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-white/80 pt-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#FFA686]" />
                <span>Lead Contact: {user?.name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
                <span>{user?.email}</span>
              </span>
              {user?.industryCategory && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#FFA686]" />
                  <span>{user?.industryCategory}</span>
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
            <Link to="/search">
              <Button size="md" variant="accent" icon={<Sparkles className="w-4 h-4" />}>
                Explore Tech Events
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Overview Metrics Cards (Placeholder Structure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Active Sponsorships',
            value: '0',
            subtitle: 'Campaigns live right now',
            icon: CalendarCheck,
            change: 'Ready to launch',
          },
          {
            title: 'Attendees Reached',
            value: '0',
            subtitle: 'Checked-in tech talent',
            icon: Users,
            change: '+100% verified',
          },
          {
            title: 'Badges Backed',
            value: '0',
            subtitle: 'Winner & speaker honors',
            icon: Award,
            change: 'Tamper-proof proof',
          },
          {
            title: 'Brand Impressions',
            value: '0',
            subtitle: 'Ticket & badge views',
            icon: TrendingUp,
            change: 'Targeted developers',
          },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-[#E8DDD7] shadow-xs space-y-3 hover:border-[#63474D]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">{m.title}</span>
                <div className="w-8 h-8 rounded-xl bg-[#FAF7F5] flex items-center justify-center text-[#63474D]">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-serif text-3xl font-bold text-[#2D1F23]">{m.value}</div>
                <p className="text-[11px] text-gray-500">{m.subtitle}</p>
              </div>
              <div className="pt-2 border-t border-[#E8DDD7]/60 text-[10.5px] font-medium text-[#2A7B5F]">
                {m.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Placeholder Content Area */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
            Sponsorship Workspace Ready
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your corporate sponsor profile is active. You can now browse single-day tech events, connect directly with organizing teams, and sponsor genuine developer communities in Ethiopia.
          </p>
        </div>
        <div className="pt-3">
          <Link to="/search">
            <Button size="sm" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
              Browse Events Seeking Sponsors
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
