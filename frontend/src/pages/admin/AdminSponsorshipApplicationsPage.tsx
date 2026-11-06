import React, { useState, useEffect } from 'react';
import {
  HandCoins,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  Mail,
  Phone,
  Sparkles,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorshipDeal } from '../../types/sponsorship';

export const AdminSponsorshipApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Review Actions State
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getSponsorshipApplications({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setApplications(res.applications || []);
    } catch (err: any) {
      console.error('Failed to load sponsorship applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  const openDetail = async (dealId: string) => {
    try {
      setDetailLoading(true);
      setActionError(null);
      const detail = await api.admin.getSponsorshipApplicationDetail(dealId);
      setSelectedApp(detail);
    } catch (err: any) {
      console.error('Failed to load application detail:', err);
      alert(err.message || 'Unable to load application detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      setActionSubmitting(true);
      setActionError(null);
      await api.admin.approveSponsorshipApplication(selectedApp.id, approvalNotes.trim() || undefined);
      setSuccessToast(`Application for ${selectedApp.pitch.eventTitle} approved! Notifications dispatched.`);
      setIsApproving(false);
      setApprovalNotes('');
      setSelectedApp(null);
      fetchApplications();
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve application.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setActionError('A clear rejection reason of at least 5 characters is required.');
      return;
    }
    try {
      setActionSubmitting(true);
      setActionError(null);
      await api.admin.rejectSponsorshipApplication(selectedApp.id, rejectionReason.trim());
      setSuccessToast(`Application rejected. Feedback sent to ${selectedApp.sponsor.companyName}.`);
      setIsRejecting(false);
      setRejectionReason('');
      setSelectedApp(null);
      fetchApplications();
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject application.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Stats calculation
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notice */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in border border-emerald-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDD7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold uppercase tracking-wider mb-2.5">
            <HandCoins className="w-3.5 h-3.5" />
            Sponsorship Marketplace Review
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2D1F23]">
            Sponsorship Applications
          </h1>
          <p className="text-xs sm:text-sm text-[#756366] mt-1 max-w-2xl">
            Review corporate sponsorship proposals submitted by verified sponsors to organizers' pitches. Admins have final approval authority.
          </p>
        </div>

        {/* Quick Counts */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-3 text-center min-w-[90px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Pending
            </p>
            <p className="text-xl font-serif font-bold text-amber-900 mt-0.5">
              {statusFilter === 'PENDING' ? applications.length : pendingCount}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl px-4 py-3 text-center min-w-[90px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Approved
            </p>
            <p className="text-xl font-serif font-bold text-emerald-900 mt-0.5">
              {statusFilter === 'APPROVED' ? applications.length : approvedCount}
            </p>
          </div>
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl px-4 py-3 text-center min-w-[90px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Rejected
            </p>
            <p className="text-xl font-serif font-bold text-rose-900 mt-0.5">
              {statusFilter === 'REJECTED' ? applications.length : rejectedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'ALL', label: 'All History' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#63474D] text-white shadow-xs'
                  : 'text-[#756366] hover:bg-stone-100 hover:text-[#2D1F23]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pitch, company, or sponsor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
          />
        </form>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-[#E8DDD7] p-12 text-center text-[#756366] space-y-3">
          <Clock className="w-8 h-8 text-[#63474D] animate-spin mx-auto" />
          <p className="text-xs font-semibold">Loading sponsorship applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8DDD7] p-12 text-center text-[#756366] space-y-3">
          <CheckCircle2 className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No Applications Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {statusFilter === 'PENDING'
              ? 'All caught up! There are no pending sponsorship applications awaiting review.'
              : 'No applications match the current status filter or search parameters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app) => {
            const isPending = app.status === 'PENDING';
            const isApproved = app.status === 'APPROVED';
            const isRejected = app.status === 'REJECTED';

            return (
              <div
                key={app.id}
                className="bg-white rounded-3xl border border-[#E8DDD7] hover:border-[#63474D]/40 p-5 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D] bg-[#63474D]/10 px-2.5 py-1 rounded-lg">
                      {app.pitch?.category || 'Tech'} • {app.pitch?.eventType || 'Hackathon'}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : isRejected
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Pitch Event Title */}
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#2D1F23] line-clamp-1">
                      {app.pitch?.eventTitle}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                      <span>Organized by:</span>
                      <strong className="text-gray-700 font-semibold truncate">
                        {app.organizer?.organization || app.organizer?.name}
                      </strong>
                    </p>
                  </div>

                  {/* Sponsor & Package Card Box */}
                  <div className="bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#E8DDD7] overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#63474D] text-xs">
                        {app.sponsor?.logo ? (
                          <img src={app.sponsor.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          app.sponsor?.companyName?.[0] || 'S'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#2D1F23] truncate">{app.sponsor?.companyName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{app.sponsor?.representative}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E8DDD7]/70 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-medium">Selected Tier:</span>
                      <span className="font-bold text-gray-900">{app.packageName || 'Standard'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-medium">Proposed Amount:</span>
                      <span className="font-bold text-[#63474D]">
                        {app.pledgedAmount?.toLocaleString()} {app.pitch?.currency || 'ETB'}
                      </span>
                    </div>
                  </div>

                  {/* Proposal Snippet */}
                  {app.proposalMessage && (
                    <div className="text-xs text-gray-600 line-clamp-2 italic bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60">
                      "{app.proposalMessage}"
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => openDetail(app.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#63474D] hover:bg-[#4A3238] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isPending ? 'Review Proposal' : 'View Decision'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL & DECISION MODAL / DRAWER */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E8DDD7] shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-[#63474D] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFA686] bg-white/10 px-2 py-0.5 rounded">
                  Application Review
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
                  {selectedApp.pitch?.eventTitle}
                </h2>
                <p className="text-xs text-[#E8DDD7]">
                  Pitch Host: {selectedApp.organizer?.organization || selectedApp.organizer?.name} ({selectedApp.organizer?.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedApp(null);
                  setIsApproving(false);
                  setIsRejecting(false);
                  setActionError(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Alert error */}
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* SECTION: Sponsor Overview */}
              <div className="bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                    Sponsor Organization
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500">
                    Industry: {selectedApp.sponsor?.industryCategory || 'Technology'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E8DDD7] overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold text-[#63474D]">
                    {selectedApp.sponsor?.logo ? (
                      <img src={selectedApp.sponsor.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedApp.sponsor?.companyName?.[0] || 'S'
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-bold text-sm text-[#2D1F23]">
                      {selectedApp.sponsor?.companyName}
                    </h4>
                    <p className="text-xs text-gray-600">
                      Lead Rep: <strong>{selectedApp.sponsor?.representative}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <a href={`mailto:${selectedApp.sponsor?.email}`} className="text-[#63474D] underline">
                          {selectedApp.sponsor?.email}
                        </a>
                      </span>
                      {selectedApp.sponsor?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{selectedApp.sponsor.phone}</span>
                        </span>
                      )}
                      {selectedApp.sponsor?.companyWebsite && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                          <a href={selectedApp.sponsor.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-[#63474D] underline">
                            Website
                          </a>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedApp.sponsor?.companyDescription && (
                  <p className="text-xs text-gray-600 pt-2 border-t border-[#E8DDD7] leading-relaxed">
                    {selectedApp.sponsor.companyDescription}
                  </p>
                )}
              </div>

              {/* SECTION: Proposed Package & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Selected Package
                  </p>
                  <p className="text-base font-bold text-[#2D1F23] mt-1">
                    {selectedApp.packageName || 'Custom Tier'}
                  </p>
                </div>
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Proposed Pledged Amount
                  </p>
                  <p className="text-base font-serif font-bold text-[#63474D] mt-1">
                    {selectedApp.pledgedAmount?.toLocaleString()} {selectedApp.pitch?.currency || 'ETB'}
                  </p>
                </div>
              </div>

              {/* SECTION: Proposal Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D1F23] uppercase tracking-wider">
                  Sponsor Proposal Message
                </label>
                <div className="p-4 bg-white border border-[#E8DDD7] rounded-2xl text-xs sm:text-sm text-gray-800 leading-relaxed font-sans shadow-2xs">
                  {selectedApp.proposalMessage || (
                    <span className="text-gray-400 italic">No custom message submitted.</span>
                  )}
                </div>
              </div>

              {/* SECTION: Resubmission / Previous Attempts History */}
              {selectedApp.previousAttempts && selectedApp.previousAttempts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Previous Application Attempts ({selectedApp.previousAttempts.length})</span>
                  </p>
                  <div className="space-y-2">
                    {selectedApp.previousAttempts.map((attempt: any) => (
                      <div
                        key={attempt.id}
                        className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">
                            Tier: {attempt.packageName} ({attempt.pledgedAmount?.toLocaleString()} ETB)
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            {attempt.status}
                          </span>
                        </div>
                        {attempt.rejectionReason && (
                          <p className="text-rose-700 italic text-[11px]">
                            Prior rejection reason: "{attempt.rejectionReason}"
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400">
                          Reviewed: {new Date(attempt.reviewedAt || attempt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: Current Status Info if already decided */}
              {selectedApp.status !== 'PENDING' && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                    selectedApp.status === 'APPROVED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {selectedApp.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>Application Decision: {selectedApp.status}</span>
                  </div>
                  {selectedApp.rejectionReason && (
                    <p className="italic">Reason: "{selectedApp.rejectionReason}"</p>
                  )}
                  {selectedApp.reviewer && (
                    <p className="text-[11px] text-gray-500">
                      Reviewed by {selectedApp.reviewer.name} on{' '}
                      {new Date(selectedApp.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* REVIEW ACTION PANELS (Only when PENDING) */}
              {selectedApp.status === 'PENDING' && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  {/* Approve View */}
                  {isApproving && (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3 animate-fade-in">
                      <h4 className="font-serif font-bold text-sm text-emerald-900">
                        Confirm Application Approval
                      </h4>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Approving this application will notify both <strong>{selectedApp.sponsor?.companyName}</strong> and the event organizer <strong>{selectedApp.organizer?.organization}</strong>. The organizer will be granted access to the approved sponsor's contact information.
                      </p>
                      <textarea
                        rows={2}
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        placeholder="Optional internal administration notes..."
                        className="w-full p-2.5 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none text-gray-900"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionSubmitting}
                          onClick={handleApprove}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {actionSubmitting ? 'Approving...' : 'Confirm Approval & Notify'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsApproving(false)}
                          className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reject View */}
                  {isRejecting && (
                    <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-3 animate-fade-in">
                      <h4 className="font-serif font-bold text-sm text-rose-900">
                        Reject Application with Reason
                      </h4>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        A mandatory rejection reason will be dispatched to <strong>{selectedApp.sponsor?.companyName}</strong> so they understand why their application was declined. They may submit a revised application for this pitch.
                      </p>
                      <textarea
                        required
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide feedback (e.g. Package is sold out, proposed budget does not meet tier requirements, conflicting sponsor category)..."
                        className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-xl focus:outline-none text-gray-900"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionSubmitting}
                          onClick={handleReject}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {actionSubmitting ? 'Rejecting...' : 'Confirm Rejection & Send Feedback'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRejecting(false)}
                          className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Trigger Buttons */}
                  {!isApproving && !isRejecting && (
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRejecting(true);
                          setIsApproving(false);
                          setActionError(null);
                        }}
                        className="px-5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Application</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsApproving(true);
                          setIsRejecting(false);
                          setActionError(null);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Application</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

