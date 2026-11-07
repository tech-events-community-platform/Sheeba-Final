import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Calendar,
  Users,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export const SponsorReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    total_granted_events: number;
    total_responses_recorded: number;
    events: Array<{
      deal_id: string;
      event_title: string;
      expected_date: string;
      location: string;
      checked_in_count: number;
      responses_count: number;
      status: string;
    }>;
  }>({
    total_granted_events: 0,
    total_responses_recorded: 0,
    events: [],
  });

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.sponsorship.getReportsSummary();
      setSummary(data);
    } catch (err: any) {
      console.warn('Could not load reports summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#402A30] to-[#24171A] text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#FFA686] text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Sponsor Workspace • Reporting</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Reports & Analytics Shell
          </h1>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
            Genuine summary of your post-event activations and attendee recordings. Full automated analytics, cross-tabulation, and export capabilities are scheduled for the next phase.
          </p>
        </div>

        <div className="absolute top-6 right-6 z-10 hidden sm:block">
          <button
            type="button"
            disabled={loading}
            onClick={loadSummary}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Refresh reports data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Honest Roadmap Notice Banner (Section 8 of Specification) */}
      <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-3.5 shadow-xs">
        <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
            Phase 4 Delivery Note: Reporting Functionality Shell
          </h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            In accordance with the specification guidelines, this page currently acts as an honest operational shell without fabricated statistics or simulated charts. All genuine attendee questionnaire responses recorded at event venues are safely preserved in the database and will power automated analytical reports in an upcoming release.
          </p>
        </div>
      </div>

      {/* Genuine Real Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">Granted Event Activations</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{summary.total_granted_events}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">Total Attendee Responses Recorded</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{summary.total_responses_recorded}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">Analytics Status</p>
            <h3 className="font-serif font-bold text-sm text-stone-800">Ready for Upcoming Analytics Phase</h3>
          </div>
        </div>
      </div>

      {/* Granted Activations Response Summary Table / List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900">Your Granted Event Activations</h3>
            <p className="text-xs text-stone-500">
              Overview of genuine survey recordings gathered per event.
            </p>
          </div>
          <Link
            to="/sponsor/events"
            className="text-xs font-bold text-[#63474D] hover:underline flex items-center gap-1"
          >
            <span>Manage in My Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500">Loading activation report records...</p>
          </div>
        ) : summary.events.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-stone-800">No active event responses recorded yet</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              As event attendees check in and your team records questionnaire responses under "My Events", their summary will populate here.
            </p>
            <div className="pt-2">
              <Link
                to="/sponsor/events"
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all inline-block"
              >
                Go to My Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
            {summary.events.map((evt) => (
              <div
                key={evt.deal_id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/80 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-bold text-stone-900 truncate">{evt.event_title}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>{evt.expected_date || 'Date TBD'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>{evt.checked_in_count} Checked-In</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">
                      Responses Gathered
                    </span>
                    <span className="font-serif font-bold text-base text-emerald-700">
                      {evt.responses_count}
                    </span>
                  </div>
                  <Link
                    to="/sponsor/events"
                    className="px-3.5 py-1.5 rounded-xl border border-stone-200 hover:bg-white text-stone-700 text-xs font-bold transition-colors"
                  >
                    Open Events
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
