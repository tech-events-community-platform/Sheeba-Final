import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Calendar,
  MapPin,
  Users,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  XCircle,
  Sliders,
  Handshake,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorEventItem } from '../../types/sponsorship';
import { SponsorCheckedInAttendeesModal } from '../../components/sponsor/SponsorCheckedInAttendeesModal';
import { SponsorQuestionnaireBuilderModal } from '../../components/sponsor/SponsorQuestionnaireBuilderModal';

const getPackageBadgeClasses = (pkgName?: string | null) => {
  const name = (pkgName || '').toLowerCase();
  if (name.includes('plat') || name.includes('pl')) {
    return {
      container: 'bg-[#F4F6F8] border border-[#E1E5EA]',
      nameText: 'text-[#334155]',
      amountText: 'text-[#0F172A]',
    };
  }
  if (name.includes('gold')) {
    return {
      container: 'bg-[#FEF9EE] border border-[#FBEAC4]',
      nameText: 'text-[#7D5413]',
      amountText: 'text-[#92400E]',
    };
  }
  if (name.includes('silver')) {
    return {
      container: 'bg-[#F8F9FA] border border-[#E5E7EB]',
      nameText: 'text-[#4B5563]',
      amountText: 'text-[#1F2937]',
    };
  }
  if (name.includes('bronz')) {
    return {
      container: 'bg-[#FAF5F0] border border-[#EEDBCA]',
      nameText: 'text-[#7C4A27]',
      amountText: 'text-[#5C3214]',
    };
  }
  return {
    container: 'bg-stone-50 border border-stone-200',
    nameText: 'text-stone-700',
    amountText: 'text-[#63474D]',
  };
};

const getInitials = (name?: string | null) => {
  if (!name) return 'EV';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const SponsorEventsPage: React.FC = () => {
  const [events, setEvents] = useState<ISponsorEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'INTERESTED' | 'DEAL_ACCEPTED' | 'DECLINED'>('INTERESTED');
  const [search, setSearch] = useState('');
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<ISponsorEventItem | null>(null);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [selectedEventForQuestionnaire, setSelectedEventForQuestionnaire] = useState<ISponsorEventItem | null>(null);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [actionLoadingDealId, setActionLoadingDealId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [eventToWithdraw, setEventToWithdraw] = useState<ISponsorEventItem | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const loadEvents = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await api.sponsorship.getSponsorMyEvents(isManualRefresh);
      setEvents(data || []);
      if (isManualRefresh) {
        setFeedbackMessage('Events list refreshed successfully.');
        setTimeout(() => setFeedbackMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to load sponsor events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleWithdraw = (eventItem: ISponsorEventItem) => {
    setEventToWithdraw(eventItem);
  };

  const confirmWithdraw = async () => {
    if (!eventToWithdraw) return;
    try {
      setIsWithdrawing(true);
      await api.sponsorship.withdrawDeal(eventToWithdraw.deal_id);
      setEvents((prev) =>
        prev.map((e) => (e.deal_id === eventToWithdraw.deal_id ? { ...e, deal_status: 'WITHDRAWN' } : e))
      );
      setEventToWithdraw(null);
      setFeedbackMessage('Interest withdrawn successfully.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to withdraw interest.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleReExpressInterest = async (eventItem: ISponsorEventItem) => {
    try {
      setActionLoadingDealId(eventItem.deal_id);
      await api.sponsorship.expressInterestOrDecline({
        applicationId: eventItem.application_id,
        status: 'INTERESTED',
        package_name: eventItem.package_name || undefined,
        pledged_amount: eventItem.pledged_amount != null ? Number(eventItem.pledged_amount) : undefined,
      });
      setEvents((prev) =>
        prev.map((e) =>
          e.deal_id === eventItem.deal_id ? { ...e, deal_status: 'INTERESTED' } : e
        )
      );
      setFeedbackMessage('Marked as interested! The organizer will review your interest.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to update interest.');
    } finally {
      setActionLoadingDealId(null);
    }
  };

  const handleOpenAttendees = (eventItem: ISponsorEventItem) => {
    setSelectedEventForAttendees(eventItem);
    setIsAttendeesModalOpen(true);
  };

  // Metrics
  const activeDealsCount = events.filter((e) => e.deal_status === 'DEAL_ACCEPTED').length;
  const sharingGrantedCount = events.filter(
    (e) => e.deal_status === 'DEAL_ACCEPTED' && e.allow_attendee_sharing
  ).length;
  const pendingCount = events.filter((e) => e.deal_status === 'INTERESTED').length;
  const declinedCount = events.filter(
    (e) => e.deal_status === 'DECLINED' || e.deal_status === 'REJECTED' || e.deal_status === 'WITHDRAWN'
  ).length;
  const totalCheckedIn = events.reduce((sum, e) => sum + (e.checked_in_count || 0), 0);

  // Filtered Events matching Organizer table structure
  const filteredEvents = events.filter((e) => {
    if (statusFilter === 'DEAL_ACCEPTED' && e.deal_status !== 'DEAL_ACCEPTED') {
      return false;
    }
    if (statusFilter === 'INTERESTED' && e.deal_status !== 'INTERESTED') {
      return false;
    }
    if (statusFilter === 'DECLINED' && e.deal_status !== 'DECLINED' && e.deal_status !== 'REJECTED' && e.deal_status !== 'WITHDRAWN') {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = e.event_title.toLowerCase().includes(q);
      const matchLocation = e.location?.toLowerCase().includes(q);
      const matchOrganizer = e.organizer?.name?.toLowerCase().includes(q);
      const matchCategory = e.category?.toLowerCase().includes(q);
      return matchTitle || matchLocation || matchOrganizer || matchCategory;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#402A30] to-[#24171A] text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#FFA686] text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Sponsor Workspace • Granted Activations</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            My Events
          </h1>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
            Manage your event partnerships, track agreed activation packages, and access verified checked-in attendee lists once authorized by event organizers.
          </p>
        </div>

        {/* Top-right Refresh button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() => loadEvents(true)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            title="Refresh events pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Cards: Clean bare icons without colored square background boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Attendee Access Granted</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{sharingGrantedCount}</h3>
            <p className="text-[11px] text-gray-500">Live attendee access enabled</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-[#63474D] shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Deals Accepted</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{activeDealsCount}</h3>
            <p className="text-[11px] text-gray-500">Formalized partnerships</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <Clock className="w-8 h-8 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Pending Review</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{pendingCount}</h3>
            <p className="text-[11px] text-gray-500">Under organizer review</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <Users className="w-8 h-8 text-blue-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Verified Checked-In</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{totalCheckedIn}</h3>
            <p className="text-[11px] text-gray-500">Across active deals</p>
          </div>
        </div>
      </div>

      {/* Unified Events Table Container (Matching Organizer My Sponsors Table Structure) */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Table Controls Bar: Search on left, Status toggle pills on right */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sponsored events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          {/* Status Toggle: Interested, Deals Accepted, Declined */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setStatusFilter('INTERESTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'INTERESTED'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Interested</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === 'INTERESTED'
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('DEAL_ACCEPTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'DEAL_ACCEPTED'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Deals Accepted</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === 'DEAL_ACCEPTED'
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {activeDealsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('DECLINED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'DECLINED'
                  ? 'bg-white text-red-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Declined</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === 'DECLINED'
                    ? 'bg-red-100 text-red-800 font-bold'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {declinedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Table Column Titles Header Row */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500 select-none">
          <div className="md:col-span-5">Sponsored Event</div>
          <div className="md:col-span-4">Sponsorship Package</div>
          <div className="md:col-span-3 text-right">Access & Actions</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500 font-medium">Loading your sponsored activations...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-bold text-gray-900 font-serif">No sponsored events yet</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                When you express interest in event pitches on the marketplace and formalize deals with organizers, your granted events and verified attendees will appear here.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/sponsor"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <span>Explore Sponsorship Opportunities</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-gray-700">No events found matching current filter.</p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('INTERESTED');
                setSearch('');
              }}
              className="text-xs text-[#AA767C] font-semibold underline cursor-pointer"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEvents.map((item) => {
              const isDealt = item.deal_status === 'DEAL_ACCEPTED';
              const isInterested = item.deal_status === 'INTERESTED';
              const isDeclined = item.deal_status === 'DECLINED' || item.deal_status === 'REJECTED';
              const isWithdrawn = item.deal_status === 'WITHDRAWN';
              const isSharingActive = isDealt && item.allow_attendee_sharing;
              const pkgBadge = getPackageBadgeClasses(item.package_name);

              return (
                <div
                  key={item.deal_id}
                  className="p-5 sm:p-6 hover:bg-stone-50/50 transition-colors grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                >
                  {/* Column 1: Sponsored Event Details (md:col-span-5) */}
                  <div className="md:col-span-5 flex items-start gap-3.5 min-w-0">
                    {/* Circular Organizer Avatar */}
                    {item.organizer?.avatar_url ? (
                      <img
                        src={item.organizer.avatar_url}
                        alt={item.organizer.name}
                        className="w-11 h-11 rounded-full object-cover border border-stone-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#63474D]/10 text-[#63474D] font-bold text-xs flex items-center justify-center shrink-0 border border-[#63474D]/20">
                        {getInitials(item.organizer?.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="font-serif font-bold text-sm sm:text-base text-gray-900 truncate">
                          {item.event_title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <img src="/calendar.webp" alt="Date" className="w-3 h-3 object-contain shrink-0" />
                          <span>{item.expected_date || 'Date TBD'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <img src="/location.webp" alt="Location" className="w-3 h-3 object-contain shrink-0" />
                          <span className="truncate">{item.location || 'Location TBD'}</span>
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 text-[#AA767C] shrink-0" />
                        <span>
                          Organizer: <strong className="text-gray-700">{item.organizer?.name || 'Organizer'}</strong>
                          {item.organizer?.organization && ` (${item.organizer.organization})`}
                        </span>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {isDealt && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Deal Accepted
                          </span>
                        )}
                        {isInterested && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200">
                            <XCircle className="w-3 h-3 text-red-500" />
                            Declined
                          </span>
                        )}
                        {isWithdrawn && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                            Withdrawn
                          </span>
                        )}
                        {isSharingActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Attendee Sharing Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Sponsorship Package (md:col-span-4) */}
                  <div className="md:col-span-4">
                    <div className={`p-3 rounded-2xl ${pkgBadge.container}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Pledged Tier
                      </p>
                      <p className={`text-xs font-bold ${pkgBadge.nameText} truncate mt-0.5`}>
                        {item.package_name || 'Standard Sponsorship'}
                      </p>
                      {item.pledged_amount ? (
                        <p className={`text-sm font-bold ${pkgBadge.amountText} mt-0.5`}>
                          {item.pledged_amount.toLocaleString()} {item.currency || 'ETB'}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Column 3: Access & Actions (md:col-span-3 text-right) */}
                  <div className="md:col-span-3 flex flex-wrap items-center justify-start md:justify-end gap-2">
                    {/* View Checked-In Attendees */}
                    {isSharingActive && (
                      <button
                        type="button"
                        onClick={() => handleOpenAttendees(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        title="View checked-in attendees for this event"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Attendees ({item.checked_in_count || 0})</span>
                      </button>
                    )}

                    {/* Setup Questionnaire */}
                    {isDealt && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventForQuestionnaire(item);
                          setIsQuestionnaireOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Configure custom survey questions"
                      >
                        <Sliders className="w-3.5 h-3.5 text-stone-600" />
                        <span>Survey</span>
                      </button>
                    )}

                    {/* Withdraw Interest if still pending */}
                    {isInterested && (
                      <button
                        type="button"
                        disabled={actionLoadingDealId === item.deal_id}
                        onClick={() => handleWithdraw(item)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Withdraw your interest in this event"
                      >
                        Withdraw
                      </button>
                    )}

                    {/* Re-express interest if declined or withdrawn */}
                    {(isDeclined || isWithdrawn) && (
                      <button
                        type="button"
                        disabled={actionLoadingDealId === item.deal_id}
                        onClick={() => handleReExpressInterest(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Re-express interest"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Interested</span>
                      </button>
                    )}

                    {/* Full Pitch Link */}
                    <Link
                      to={`/sponsor/applications/${item.application_id}`}
                      className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs transition-colors"
                      title="View full event pitch details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdraw Interest Confirmation Modal */}
      {eventToWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-gray-900">Withdraw Interest</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Are you sure you want to withdraw your interest in <strong className="text-gray-800">{eventToWithdraw.event_title}</strong>? The organizer will no longer see your pending pledge.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={() => setEventToWithdraw(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={confirmWithdraw}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-stone-900 hover:bg-black text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isWithdrawing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Withdrawing...</span>
                  </>
                ) : (
                  <span>Confirm Withdraw</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checked-In Attendees Modal */}
      <SponsorCheckedInAttendeesModal
        isOpen={isAttendeesModalOpen}
        onClose={() => setIsAttendeesModalOpen(false)}
        eventItem={selectedEventForAttendees}
      />

      {/* Questionnaire Builder Modal */}
      {selectedEventForQuestionnaire && (
        <SponsorQuestionnaireBuilderModal
          isOpen={isQuestionnaireOpen}
          onClose={() => {
            setIsQuestionnaireOpen(false);
            setSelectedEventForQuestionnaire(null);
          }}
          dealId={selectedEventForQuestionnaire.deal_id}
          eventTitle={selectedEventForQuestionnaire.event_title}
          onSaved={() => {
            loadEvents(true);
          }}
        />
      )}
    </div>
  );
};
