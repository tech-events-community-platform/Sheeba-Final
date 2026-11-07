import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Calendar,
  MapPin,
  Users,
  Building2,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorEventItem, ISponsorCheckedInAttendeeItem } from '../../types/sponsorship';
import { SponsorCheckedInAttendeesModal } from '../../components/sponsor/SponsorCheckedInAttendeesModal';

export const SponsorEventsPage: React.FC = () => {
  const [events, setEvents] = useState<ISponsorEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'SHARING_GRANTED' | 'DEAL_ACCEPTED' | 'PENDING'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<ISponsorEventItem | null>(null);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [actionLoadingDealId, setActionLoadingDealId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadEvents = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await api.sponsorship.getSponsorMyEvents();
      setEvents(data);
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

  const handleWithdraw = async (dealId: string) => {
    if (!window.confirm('Are you sure you want to withdraw your interest in this event?')) return;
    setActionLoadingDealId(dealId);
    try {
      await api.sponsorship.withdrawDeal(dealId);
      setEvents((prev) =>
        prev.map((e) => (e.deal_id === dealId ? { ...e, deal_status: 'WITHDRAWN' } : e))
      );
      setFeedbackMessage('Interest withdrawn successfully.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to withdraw interest.');
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
  const totalCheckedIn = events.reduce((sum, e) => sum + (e.checked_in_count || 0), 0);

  // Filtered Events
  const filteredEvents = events.filter((e) => {
    if (filter === 'SHARING_GRANTED' && (!e.allow_attendee_sharing || e.deal_status !== 'DEAL_ACCEPTED')) {
      return false;
    }
    if (filter === 'DEAL_ACCEPTED' && e.deal_status !== 'DEAL_ACCEPTED') {
      return false;
    }
    if (filter === 'PENDING' && e.deal_status !== 'INTERESTED') {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = e.event_title.toLowerCase().includes(q);
      const matchLocation = e.location?.toLowerCase().includes(q);
      const matchOrganizer = e.organizer?.name.toLowerCase().includes(q);
      const matchCategory = e.category?.toLowerCase().includes(q);
      return matchTitle || matchLocation || matchOrganizer || matchCategory;
    }

    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
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

        <div className="absolute top-6 right-6 z-10 hidden sm:block">
          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() => loadEvents(true)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">Attendee Access Granted</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{sharingGrantedCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">Deals Accepted</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{activeDealsCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">Pending Review</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{pendingCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">Verified Checked-In</p>
            <h3 className="font-serif font-bold text-2xl text-stone-900">{totalCheckedIn}</h3>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'ALL'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('SHARING_GRANTED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'SHARING_GRANTED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Attendee Sharing Active ({sharingGrantedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('DEAL_ACCEPTED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'DEAL_ACCEPTED'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Deals Accepted ({activeDealsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            Pending Review ({pendingCount})
          </button>
        </div>

        <div className="relative min-w-[240px] md:min-w-[280px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by name, location..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#AA767C]"
          />
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-stone-200 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-medium">Loading your sponsored activations...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 sm:p-16 border border-stone-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-serif font-bold text-lg text-stone-900">No sponsored events yet</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              When you express interest in event pitches on the marketplace and formalize deals with organizers, your granted events and verified attendees will appear here.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/sponsor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white text-xs font-bold shadow-md transition-all"
            >
              <span>Explore Sponsorship Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
          <p className="text-xs text-stone-500">
            No events found matching your filter criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilter('ALL');
              setSearch('');
            }}
            className="text-xs text-[#AA767C] font-semibold underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((item) => {
            const isDealt = item.deal_status === 'DEAL_ACCEPTED';
            const isInterested = item.deal_status === 'INTERESTED';
            const isRejected = item.deal_status === 'REJECTED';
            const isWithdrawn = item.deal_status === 'WITHDRAWN';
            const isSharingActive = isDealt && item.allow_attendee_sharing;

            return (
              <div
                key={item.deal_id}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs hover:shadow-md transition-shadow space-y-5"
              >
                {/* Event Card Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-stone-100 text-stone-700">
                        {item.category || 'General'}
                      </span>
                      {item.event_type && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                          {item.event_type}
                        </span>
                      )}

                      {/* Relationship Status Badge */}
                      {isDealt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Deal Accepted
                        </span>
                      )}
                      {isInterested && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                          Declined by Organizer
                        </span>
                      )}
                      {isWithdrawn && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          Withdrawn
                        </span>
                      )}

                      {/* Attendee Sharing Status Badge */}
                      {isSharingActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Attendee Sharing Active
                        </span>
                      ) : isDealt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-stone-400" />
                          Sharing Not Enabled
                        </span>
                      ) : null}
                    </div>

                    <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900 tracking-tight">
                      {item.event_title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{item.expected_date || 'Date TBD'}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{item.location || 'Location TBD'}</span>
                      </span>
                      {item.organizer?.name && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            Organizer: <strong className="text-stone-700">{item.organizer.name}</strong>
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sponsorship Package / Financials */}
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 shrink-0 text-left md:text-right min-w-[200px]">
                    <span className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block">
                      Package Tier
                    </span>
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {item.package_name || 'Standard Sponsorship'}
                    </p>
                    {item.pledged_amount ? (
                      <p className="text-sm font-bold text-emerald-700 mt-1">
                        {item.pledged_amount.toLocaleString()} {item.currency || 'ETB'}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Bottom Bar: Access state & Action buttons */}
                <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-stone-500">
                    {isSharingActive ? (
                      <p className="flex items-center gap-1.5 text-emerald-800 font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Organizer granted access to checked-in attendees ({item.checked_in_count || 0} checked in).
                        </span>
                      </p>
                    ) : isDealt ? (
                      <p className="text-stone-500">
                        Sponsorship formalized. Attendee-information sharing is awaiting organizer activation.
                      </p>
                    ) : isInterested ? (
                      <p className="text-amber-800">
                        Interest submitted to organizer. Awaiting deal confirmation.
                      </p>
                    ) : (
                      <p className="text-stone-400">
                        This sponsorship relationship is inactive.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* View Checked-In Attendees (Strictly gated to Deal Accepted + Sharing Active) */}
                    {isSharingActive && (
                      <button
                        type="button"
                        onClick={() => handleOpenAttendees(item)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        title="View checked-in attendees for this event"
                      >
                        <Users className="w-4 h-4" />
                        <span>View Checked-In Attendees ({item.checked_in_count || 0})</span>
                      </button>
                    )}

                    {/* Withdraw Interest if still pending */}
                    {isInterested && (
                      <button
                        type="button"
                        disabled={actionLoadingDealId === item.deal_id}
                        onClick={() => handleWithdraw(item.deal_id)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Withdraw your interest in this event"
                      >
                        Withdraw Interest
                      </button>
                    )}

                    <Link
                      to={`/sponsor/explore/${item.application_id}`}
                      className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold transition-colors flex items-center gap-1"
                      title="View full event pitch details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checked-In Attendees Modal */}
      <SponsorCheckedInAttendeesModal
        isOpen={isAttendeesModalOpen}
        onClose={() => setIsAttendeesModalOpen(false)}
        eventItem={selectedEventForAttendees}
      />
    </div>
  );
};

