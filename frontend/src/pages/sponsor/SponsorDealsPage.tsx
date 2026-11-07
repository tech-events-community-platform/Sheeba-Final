import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HandCoins,
  CheckCircle2,
  XCircle,
  Send,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Layers,
  Building2,
  ExternalLink,
  Edit3,
  Save,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  FileText,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorshipDeal, SponsorshipDealStatus } from '../../types/sponsorship';
import { sponsorDealNotesSchema, validateForm } from '../../schemas';

type TabType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'INTERESTED' | 'DECLINED';

export const SponsorDealsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [deals, setDeals] = useState<ISponsorshipDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const filter = activeTab === 'ALL' ? undefined : activeTab;
      const data = await api.sponsorship.getMyDeals(filter);
      setDeals(data);
    } catch (err: any) {
      console.error('Failed to load deals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, [activeTab]);

  const handleUpdateStatus = async (dealId: string, newStatus: 'INTERESTED' | 'DECLINED') => {
    try {
      setUpdatingId(dealId);
      await api.sponsorship.updateDeal(dealId, { status: newStatus });
      // Update local state
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d))
      );
      if (activeTab !== 'ALL' && activeTab !== newStatus) {
        setDeals((prev) => prev.filter((d) => d.id !== dealId));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update deal status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (dealId: string, currentStatus: SponsorshipDealStatus) => {
    const validation = validateForm(sponsorDealNotesSchema, {
      status: currentStatus,
      sponsor_notes: notesDraft,
    });
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0] || 'Invalid notes.';
      alert(firstError);
      return;
    }

    try {
      setUpdatingId(dealId);
      await api.sponsorship.updateDeal(dealId, {
        sponsor_notes: notesDraft,
      });
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, sponsor_notes: notesDraft } : d))
      );
      setEditingNotesId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save notes.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Pipeline metrics
  const pendingCount = deals.filter((d) => d.status === 'PENDING').length;
  const approvedCount = deals.filter((d) => d.status === 'APPROVED').length;
  const rejectedCount = deals.filter((d) => d.status === 'REJECTED').length;
  const totalPledged = deals
    .filter((d) => d.status === 'APPROVED' || d.status === 'PENDING' || d.status === 'INTERESTED')
    .reduce((acc, deal) => acc + (deal.pledged_amount || 0), 0);

  const getStatusBadge = (status: SponsorshipDealStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Under Admin Review
          </span>
        );
      case 'APPROVED':
      case 'DEAL_ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Deal Accepted ✓
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
            Withdrawn
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Declined by Admin
          </span>
        );
      case 'INTERESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300">
            <Bookmark className="w-3.5 h-3.5 text-stone-500" />
            Saved Interest
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            Archived / Passed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D1F23] via-[#4A3238] to-[#63474D] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[#FFA686] text-xs font-semibold uppercase tracking-wider mb-3">
            <HandCoins className="w-3.5 h-3.5" />
            Deal Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Sponsorship Applications & Pipeline
          </h1>
          <p className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Track your formal applications, review feedback from Sheeba Administration, and connect directly with organizers once approved.
          </p>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-6">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-[#2D1F23] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <span>All Deals</span>
            </button>

            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-white text-[#2D1F23] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Under Review</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'APPROVED'
                  ? 'bg-white text-[#2D1F23] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Approved</span>
              {approvedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white">
                  {approvedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('REJECTED')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'REJECTED'
                  ? 'bg-white text-[#2D1F23] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Declined by Admin</span>
              {rejectedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
                  {rejectedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('INTERESTED')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'INTERESTED'
                  ? 'bg-white text-[#2D1F23] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-gray-300" />
              <span>Saved Interest</span>
            </button>

            <button
              onClick={() => setActiveTab('DECLINED')}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'DECLINED'
                  ? 'bg-white text-[#2D1F23] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <span>Archived</span>
            </button>

            <div className="ml-auto px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-xs hidden lg:block">
              <span className="text-white/70">Pledged in Pipeline: </span>
              <span className="font-serif font-bold text-[#FFA686] text-sm ml-1">
                {totalPledged.toLocaleString()} ETB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deals List */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <div className="animate-spin w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Loading your applications & deals...</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-300">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <HandCoins className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            No deals found {activeTab !== 'ALL' ? `under ${activeTab.toLowerCase()}` : ''}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Browse the Explore marketplace to discover upcoming events and submit formal sponsorship proposals.
          </p>
          <div className="mt-5">
            <Link
              to="/sponsor/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#63474D] text-white text-xs font-bold hover:bg-[#4E373C] transition-colors"
            >
              <span>Explore Sponsorship Pitches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {deals.map((deal) => {
            const app = deal.application || (deal as any);
            const pitchId = deal.application_id || app.id;
            const isEditingNotes = editingNotesId === deal.id;

            return (
              <div
                key={deal.id}
                className="bg-white rounded-3xl p-6 border border-[#AA767C]/15 shadow-sm space-y-5 transition-shadow hover:shadow-md"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {app.category && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30">
                          {app.category}
                        </span>
                      )}
                      {app.event_type && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                          {app.event_type}
                        </span>
                      )}
                      {getStatusBadge(deal.status)}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900">
                      {app.event_title || 'Sponsorship Application'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Organized by {app.organizer_organization || app.organizer_name || 'Event Host'}
                    </p>
                  </div>

                  {/* Actions based on status */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                    {(deal.status === 'DEAL_ACCEPTED' || deal.status === 'APPROVED') && (
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Deal Confirmed</span>
                        </div>
                        <Link
                          to="/sponsor/events"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                          title="Open My Events to view granted activations and attendees"
                        >
                          <span>Go to My Events</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}

                    {deal.status === 'REJECTED' && (
                      <Link
                        to={`/sponsor/applications/${pitchId}`}
                        className="px-4 py-2 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#FFA686]" />
                        <span>Re-apply / Revise Proposal</span>
                      </Link>
                    )}

                    {deal.status === 'INTERESTED' && (
                      <>
                        <Link
                          to={`/sponsor/applications/${pitchId}`}
                          className="px-4 py-2 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#FFA686]" />
                          <span>Submit Formal Proposal</span>
                        </Link>
                        <button
                          type="button"
                          disabled={updatingId === deal.id}
                          onClick={() => handleUpdateStatus(deal.id, 'DECLINED')}
                          className="px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 text-gray-400" />
                          <span>Archive</span>
                        </button>
                      </>
                    )}

                    {deal.status === 'DECLINED' && (
                      <button
                        type="button"
                        disabled={updatingId === deal.id}
                        onClick={() => handleUpdateStatus(deal.id, 'INTERESTED')}
                        className="px-3.5 py-2 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#FFA686]" />
                        <span>Restore to Saved</span>
                      </button>
                    )}

                    {pitchId && (
                      <Link
                        to={`/sponsor/applications/${pitchId}`}
                        className="p-2 text-gray-400 hover:text-[#63474D] rounded-xl hover:bg-[#FAF7F5] transition-colors"
                        title="View pitch details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Event Specs */}
                {(app.expected_date || app.location || app.expected_attendees) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
                    {app.expected_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#63474D]" />
                        <span>{app.expected_date}</span>
                      </div>
                    )}
                    {app.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#63474D]" />
                        <span>{app.location}</span>
                      </div>
                    )}
                    {app.expected_attendees !== undefined && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#63474D]" />
                        <span>{app.expected_attendees.toLocaleString()} Estimated Attendees</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Package & Pledged Amount Banner */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">Selected Tier</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {deal.package_name || 'Custom Sponsorship Tier'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">Pledged / Budget</span>
                    <span className="font-serif font-bold text-[#63474D] text-base">
                      {(deal.pledged_amount || app.funding_goal || 0).toLocaleString()} {app.currency || 'ETB'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">Application Date</span>
                    <span className="text-gray-700 font-medium">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Proposal Message (if submitted) */}
                {deal.proposal_message && (
                  <div className="p-4 bg-[#FAF7F5] rounded-2xl border border-[#63474D]/15 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D] block">
                      Submitted Proposal Message
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed italic">
                      "{deal.proposal_message}"
                    </p>
                  </div>
                )}

                {/* Status-Specific Notification Banners */}
                {deal.status === 'PENDING' && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-900">
                        Under Admin Review
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Your sponsorship application has been received and is currently being evaluated by the Sheeba team. Admin decisions are typically communicated within 1-2 business days.
                      </p>
                    </div>
                  </div>
                )}

                {deal.status === 'REJECTED' && (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-rose-900">
                          Feedback from Sheeba Administration
                        </p>
                        <p className="text-xs text-rose-800 leading-relaxed">
                          {deal.rejection_reason || 'This application was not approved by Sheeba Administration. You can review requirements and re-apply.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-end">
                      <Link
                        to={`/sponsor/applications/${pitchId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revise & Re-apply</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Approved: Direct Organizer Contact Box */}
                {deal.status === 'APPROVED' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Official Sponsorship Approved — Direct Organizer Contact
                      </p>
                      <span className="text-[11px] text-emerald-800 font-semibold">{app.contact_name}</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Your application has been vetted and officially approved by Sheeba Administration. Connect directly with the organizer to finalize event logistics:
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {app.contact_phone && (
                        <a
                          href={`tel:${app.contact_phone}`}
                          className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:border-emerald-500 text-xs font-semibold text-emerald-900 flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                          <span>{app.contact_phone}</span>
                        </a>
                      )}

                      {app.contact_email && (
                        <a
                          href={`mailto:${app.contact_email}?subject=Approved%20Sponsorship%20Coordination%20-%20${encodeURIComponent(app.event_title || '')}`}
                          className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:border-emerald-500 text-xs font-semibold text-emerald-900 flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
                          <span>{app.contact_email}</span>
                        </a>
                      )}

                      {app.contact_telegram && (
                        <a
                          href={
                            app.contact_telegram.startsWith('http')
                              ? app.contact_telegram
                              : `https://t.me/${app.contact_telegram.replace('@', '')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:border-emerald-500 text-xs font-semibold text-emerald-900 flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-500" />
                          <span>Telegram: {app.contact_telegram}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Legacy Interested Contact Box */}
                {deal.status === 'INTERESTED' && (
                  <div className="bg-[#FAF7F5] border border-[#63474D]/20 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                        Organizer Contact Information
                      </p>
                      <span className="text-[11px] text-gray-500 font-medium">{app.contact_name}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {app.contact_phone && (
                        <a
                          href={`tel:${app.contact_phone}`}
                          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#63474D] text-xs font-semibold text-gray-800 flex items-center gap-1.5 transition-colors"
                        >
                          <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                          <span>{app.contact_phone}</span>
                        </a>
                      )}

                      {app.contact_email && (
                        <a
                          href={`mailto:${app.contact_email}?subject=Sponsorship%20Inquiry%20-%20${encodeURIComponent(app.event_title || '')}`}
                          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#63474D] text-xs font-semibold text-gray-800 flex items-center gap-1.5 transition-colors"
                        >
                          <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
                          <span>{app.contact_email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Internal Sponsor Notes (Private)
                    </span>
                    {!isEditingNotes && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotesId(deal.id);
                          setNotesDraft(deal.sponsor_notes || '');
                        }}
                        className="text-xs font-bold text-[#63474D] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Notes</span>
                      </button>
                    )}
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Add private deal notes, agreements, next meeting date..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:border-[#63474D] outline-none"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingNotesId(null)}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === deal.id}
                          onClick={() => handleSaveNotes(deal.id, deal.status)}
                          className="px-3 py-1 bg-[#63474D] text-white text-xs font-bold rounded-lg hover:bg-[#4E373C] flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      {deal.sponsor_notes || 'No private notes added yet.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
