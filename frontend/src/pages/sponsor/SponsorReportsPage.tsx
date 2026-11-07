import React from 'react';
import { BarChart3, Clock, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SponsorReportsPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#402A30] to-[#24171A] text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#FFA686] text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Sponsor Workspace • Reporting</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
            Consolidated post-event sponsorship intelligence, attendee questionnaire summaries, and ROI performance metrics.
          </p>
        </div>
      </div>

      {/* Honest Empty Shell / Roadmap Notice */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 md:p-16 border border-stone-200 text-center space-y-6 shadow-xs">
        <div className="w-20 h-20 rounded-3xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto border border-[#63474D]/15">
          <Clock className="w-10 h-10" />
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Upcoming Phase</span>
          </div>
          <h2 className="font-serif font-bold text-xl sm:text-2xl text-stone-900">
            Reporting Functionality In Preparation
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
            Sponsorship reporting, analytics generation, and questionnaire export features will become available here once attendee recording is established. No simulated data is rendered.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/sponsor/events"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to My Events</span>
          </Link>
          <Link
            to="/sponsor/deals"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-all"
          >
            <span>View Deals & Pipeline</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

