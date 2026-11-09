import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import {
  Search,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Globe,
  ExternalLink,
  XCircle,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Eye,
  Send,
  HelpCircle,
  Target,
  DollarSign,
  Tag,
  Briefcase,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';

export interface AttendeeRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  eventsRegistered: number;
  eventsAttended: number;
  status: string;
  approvalStatus: string;
  registeredAt: string;
}

export interface OrganizerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  applicantType?: string;
  organization: string;
  organizationType?: string;
  applicantPosition?: string;
  organizationDescription?: string;
  organizationWebsite?: string;
  organizationLogo?: string;
  personalIntroduction?: string;
  bio?: string;
  eventsCount: number;
  totalCheckIns: number;
  status: string;
  approvalStatus: string;
  isActive: boolean;
  rejectionReason?: string;
  infoRequestedNotes?: string;
  appliedAt?: string;
  registeredAt: string;
}

export interface SponsorRecord {
  id: string;
  name: string;
  email: string;
  companyName: string;
  industryCategory: string;
  phone?: string;
  website?: string;
  companyWebsite?: string;
  companyPhone?: string;
  bio?: string;
  avatarUrl?: string;
  sponsorPreferences?: {
    sponsorshipObjectives?: string[];
    targetAudience?: string[];
    targetSkills?: string[];
    targetInterests?: string[];
    preferredEventCategories?: string[];
    preferredEventTypes?: string[];
    preferredLocations?: string[];
    minBudget?: number | null;
    maxBudget?: number | null;
    preferredBenefits?: string[];
    additionalPreferences?: Record<string, any>;
  };
  status: string;
  approvalStatus: string;
  isActive: boolean;
  registeredAt: string;
  updatedAt?: string;
}

export const AdminUsersPage: React.FC = () => {
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRecord[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ORGANIZERS' | 'ATTENDEES' | 'SPONSORS'>('ORGANIZERS');
  const [organizerSubTab, setOrganizerSubTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [sponsorSubTab, setSponsorSubTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Independent pagination state per role/status
  const [pages, setPages] = useState<Record<string, number>>({
    organizer_pending: 1,
    organizer_approved: 1,
    organizer_rejected: 1,
    sponsor_pending: 1,
    sponsor_approved: 1,
    sponsor_rejected: 1,
    attendee_all: 1,
  });
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusCounts, setStatusCounts] = useState<{
    pending: number;
    approved: number;
    rejected: number;
    more_info_needed?: number;
    total: number;
  }>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [summaryStats, setSummaryStats] = useState<{
    organizersTotal: number;
    organizersPending: number;
    organizersApproved: number;
    organizersRejected: number;
    sponsorsTotal: number;
    sponsorsPending: number;
    sponsorsApproved: number;
    sponsorsRejected: number;
    attendeesTotal: number;
  }>({
    organizersTotal: 0,
    organizersPending: 0,
    organizersApproved: 0,
    organizersRejected: 0,
    sponsorsTotal: 0,
    sponsorsPending: 0,
    sponsorsApproved: 0,
    sponsorsRejected: 0,
    attendeesTotal: 0,
  });

  const getCurrentKey = () => {
    if (activeTab === 'ORGANIZERS') return `organizer_${organizerSubTab}`;
    if (activeTab === 'SPONSORS') return `sponsor_${sponsorSubTab}`;
    return 'attendee_all';
  };
  const currentPage = pages[getCurrentKey()] || 1;

  const handlePageChange = (newPage: number) => {
    const key = getCurrentKey();
    setPages((prev) => ({ ...prev, [key]: newPage }));
  };

  const [statusModalUser, setStatusModalUser] = useState<AttendeeRecord | OrganizerRecord | SponsorRecord | null>(null);

  // Organizer Review Modal state
  const [reviewOrganizer, setReviewOrganizer] = useState<OrganizerRecord | null>(null);
  const [reviewOrganizerLoading, setReviewOrganizerLoading] = useState<boolean>(false);
  const [orgLogoError, setOrgLogoError] = useState<boolean>(false);
  const [reviewActionTab, setReviewActionTab] = useState<'idle' | 'reject' | 'request_info'>('idle');
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [requestInfoNotesInput, setRequestInfoNotesInput] = useState<string>('');

  // Sponsor Review Modal state
  const [reviewSponsor, setReviewSponsor] = useState<SponsorRecord | null>(null);
  const [reviewSponsorLoading, setReviewSponsorLoading] = useState<boolean>(false);
  const [sponsorLogoError, setSponsorLogoError] = useState<boolean>(false);
  const [reviewSponsorActionTab, setReviewSponsorActionTab] = useState<'idle' | 'reject'>('idle');

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    const key = getCurrentKey();
    setPages((prev) => ({ ...prev, [key]: 1 }));
  }, [debouncedSearch]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const role = activeTab === 'ORGANIZERS' ? 'organizer' : activeTab === 'SPONSORS' ? 'sponsor' : 'attendee';
      const status = activeTab === 'ORGANIZERS' ? organizerSubTab : activeTab === 'SPONSORS' ? sponsorSubTab : 'all';
      const pageToFetch = pages[getCurrentKey()] || 1;

      const data = await api.admin.getUsers({
        role,
        status,
        search: debouncedSearch,
        page: pageToFetch,
        limit: 15,
      });

      if (data) {
        if (role === 'organizer') {
          setOrganizers(data.records || data.organizers || []);
        } else if (role === 'sponsor') {
          setSponsors(data.records || data.sponsors || []);
        } else if (role === 'attendee') {
          setAttendees(data.records || data.attendees || []);
        }
        setTotalRecords(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        if (data.counts) {
          setStatusCounts(data.counts);
        }
        if (data.summary) {
          setSummaryStats(data.summary);
        }
      }
    } catch (err: any) {
      console.error('Failed to load users from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab, organizerSubTab, sponsorSubTab, debouncedSearch, currentPage]);

  const handleOpenOrganizerReview = async (organizer: OrganizerRecord) => {
    setReviewOrganizer(organizer);
    setOrgLogoError(false);
    setReviewActionTab('idle');
    setRejectionReasonInput('');
    setRequestInfoNotesInput('');
    setReviewOrganizerLoading(true);
    try {
      const details = await api.admin.getOrganizerDetails(organizer.id);
      if (details) {
        setReviewOrganizer((prev) => (prev ? { ...prev, ...details } : details));
      }
    } catch (err) {
      console.warn('Could not fetch detailed organizer record, using row data:', err);
    } finally {
      setReviewOrganizerLoading(false);
    }
  };

  const handleApproveOrganizer = async (organizerId: string) => {
    setActionLoadingId(organizerId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await api.admin.approveOrganizer(organizerId);
      setActionSuccessMsg('Organizer approved and activated successfully! An approval notification email has been dispatched.');
      if (reviewOrganizer?.id === organizerId) {
        setReviewOrganizer(null);
      }
      await fetchUsers();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to approve organizer.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectOrganizer = async (organizerId: string) => {
    if (!rejectionReasonInput.trim()) {
      setActionErrorMsg('Please provide a reason for rejection.');
      return;
    }
    setActionLoadingId(organizerId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await api.admin.rejectOrganizer(organizerId, rejectionReasonInput.trim());
      setActionSuccessMsg('Organizer application rejected. A notification email with the specified reason has been dispatched.');
      setReviewOrganizer(null);
      setReviewActionTab('idle');
      setRejectionReasonInput('');
      await fetchUsers();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to reject organizer.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRequestOrganizerInfo = async (organizerId: string) => {
    if (!requestInfoNotesInput.trim()) {
      setActionErrorMsg('Please specify what additional information is requested.');
      return;
    }
    setActionLoadingId(organizerId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await api.admin.requestOrganizerInfo(organizerId, requestInfoNotesInput.trim());
      setActionSuccessMsg('Information request dispatched successfully. The applicant will be prompted to update their submission.');
      setReviewOrganizer(null);
      setReviewActionTab('idle');
      setRequestInfoNotesInput('');
      await fetchUsers();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to request additional information.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenSponsorReview = async (sponsor: SponsorRecord) => {
    setReviewSponsor(sponsor);
    setSponsorLogoError(false);
    setReviewSponsorActionTab('idle');
    setReviewSponsorLoading(true);
    try {
      const details = await api.admin.getSponsorDetails(sponsor.id);
      if (details) {
        setReviewSponsor((prev) => (prev ? { ...prev, ...details } : details));
      }
    } catch (err) {
      console.warn('Could not fetch detailed sponsor record, using row data:', err);
    } finally {
      setReviewSponsorLoading(false);
    }
  };

  const handleApproveSponsor = async (sponsorId: string) => {
    setActionLoadingId(sponsorId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await api.admin.approveSponsor(sponsorId);
      setActionSuccessMsg('Sponsor approved and activated successfully! An approval email has been dispatched.');
      if (reviewSponsor?.id === sponsorId) {
        setReviewSponsor(null);
        setReviewSponsorActionTab('idle');
      }
      await fetchUsers();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to approve sponsor.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSponsor = async (sponsorId: string) => {
    setActionLoadingId(sponsorId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await api.admin.rejectSponsor(sponsorId);
      setActionSuccessMsg('Sponsor application rejected. A notification email has been dispatched.');
      if (reviewSponsor?.id === sponsorId) {
        setReviewSponsor(null);
        setReviewSponsorActionTab('idle');
      }
      await fetchUsers();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to reject sponsor.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusModalUser) return;
    const userId = statusModalUser.id;
    setActionLoadingId(userId);

    try {
      await api.admin.toggleUserStatus(userId);
      setStatusModalUser(null);
      await fetchUsers();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to update user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingOrganizersCount = summaryStats.organizersPending;
  const pendingSponsorsCount = summaryStats.sponsorsPending;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
            Platform Users & Partners
          </h1>
          <p className="text-xs text-[#756366]">
            Review organizer and sponsor verification requests, and manage attendee accounts.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          isLoading={isLoading}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh List
        </Button>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
          <button onClick={() => setActionErrorMsg(null)} className="text-red-700 font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex border-b border-[#E8DDD7] gap-6">
        <button
          onClick={() => {
            setActiveTab('ORGANIZERS');
            setPages((prev) => ({ ...prev, [`organizer_${organizerSubTab}`]: 1 }));
          }}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ORGANIZERS'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Organizers ({summaryStats.organizersTotal})
          {pendingOrganizersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingOrganizersCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('SPONSORS');
            setPages((prev) => ({ ...prev, [`sponsor_${sponsorSubTab}`]: 1 }));
          }}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'SPONSORS'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#FFA686]" />
          Corporate Sponsors ({summaryStats.sponsorsTotal})
          {pendingSponsorsCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingSponsorsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('ATTENDEES');
            setPages((prev) => ({ ...prev, attendee_all: 1 }));
          }}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ATTENDEES'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <Users className="w-4 h-4" />
          Attendees ({summaryStats.attendeesTotal})
        </button>
      </div>

      {/* Sub-Tabs: Pill Switcher for Organizers */}
      {activeTab === 'ORGANIZERS' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setOrganizerSubTab('pending');
              setPages((prev) => ({ ...prev, organizer_pending: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              organizerSubTab === 'pending'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                organizerSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {summaryStats.organizersPending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOrganizerSubTab('approved');
              setPages((prev) => ({ ...prev, organizer_approved: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              organizerSubTab === 'approved'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved Organizers</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                organizerSubTab === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {summaryStats.organizersApproved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOrganizerSubTab('rejected');
              setPages((prev) => ({ ...prev, organizer_rejected: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              organizerSubTab === 'rejected'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5]'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected / More Info</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                organizerSubTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {summaryStats.organizersRejected}
            </span>
          </button>
        </div>
      )}

      {/* Sub-Tabs: Pill Switcher for Sponsors */}
      {activeTab === 'SPONSORS' && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setSponsorSubTab('pending');
              setPages((prev) => ({ ...prev, sponsor_pending: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              sponsorSubTab === 'pending'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                sponsorSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {summaryStats.sponsorsPending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSponsorSubTab('approved');
              setPages((prev) => ({ ...prev, sponsor_approved: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              sponsorSubTab === 'approved'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved Sponsors</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                sponsorSubTab === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {summaryStats.sponsorsApproved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSponsorSubTab('rejected');
              setPages((prev) => ({ ...prev, sponsor_rejected: 1 }));
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              sponsorSubTab === 'rejected'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5]'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                sponsorSubTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {summaryStats.sponsorsRejected}
            </span>
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${
            activeTab === 'ORGANIZERS' ? 'organizers' : activeTab === 'SPONSORS' ? 'sponsors' : 'attendees'
          }...`}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] text-[#2D1F23]"
        />
      </div>

      {/* Tables Card */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl shadow-sm overflow-hidden">
        {activeTab === 'SPONSORS' ? (
          /* SPONSORS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                  <th className="py-3 px-4">Company & Representative</th>
                  <th className="py-3 px-4">Work Email & Phone</th>
                  <th className="py-3 px-4">Industry Category</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
                {sponsors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                      {isLoading
                        ? 'Loading corporate sponsors...'
                        : sponsorSubTab === 'pending'
                        ? 'No pending corporate sponsors awaiting review.'
                        : sponsorSubTab === 'approved'
                        ? 'No approved corporate sponsors found.'
                        : 'No rejected corporate sponsors.'}
                    </td>
                  </tr>
                ) : (
                  sponsors.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#2D1F23] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#63474D]" />
                          <span>{s.companyName}</span>
                        </div>
                        <div className="text-[11px] text-[#756366]">Lead: {s.name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-gray-700">{s.email}</div>
                        {s.phone && <div className="text-[11px] text-[#756366]">{s.phone}</div>}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] text-[11px] font-semibold text-[#63474D]">
                          {s.industryCategory}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {s.website ? (
                          <a
                            href={s.website.startsWith('http') ? s.website : `https://${s.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#63474D] font-medium hover:underline"
                          >
                            <span>Visit</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            s.approvalStatus === 'approved'
                              ? 'success'
                              : s.approvalStatus === 'pending'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {s.approvalStatus === 'pending' ? 'Pending Review' : s.approvalStatus}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenSponsorReview(s)}
                            className="text-xs px-2.5 py-1 flex items-center gap-1 border-[#E8DDD7] text-[#63474D] hover:bg-[#FAF7F5]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </Button>

                          {s.approvalStatus === 'pending' ? (
                            <>
                              <Button
                                size="sm"
                                variant="accent"
                                isLoading={actionLoadingId === s.id}
                                onClick={() => handleApproveSponsor(s.id)}
                                className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                Approve
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleRejectSponsor(s.id)}
                                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline px-2 py-1"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-gray-500 pl-1">
                              {s.approvalStatus === 'approved' ? 'Verified' : 'Archived'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'ORGANIZERS' ? (
          /* ORGANIZERS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                  <th className="py-3 px-4">Organizer / Organization</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Events</th>
                  <th className="py-3 px-4">Check-ins</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
                {organizers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                      {isLoading
                        ? 'Loading organizers...'
                        : organizerSubTab === 'pending'
                        ? 'No pending organizer applications awaiting review.'
                        : organizerSubTab === 'approved'
                        ? 'No approved organizers found.'
                        : 'No rejected or info-requested organizer applications.'}
                    </td>
                  </tr>
                ) : (
                  organizers.map((o) => {
                    const isOrg = o.applicantType === 'Organization / Institution' || (!o.applicantType && o.organization);
                    return (
                      <tr key={o.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              {isOrg && o.organizationLogo ? (
                                <img
                                  src={o.organizationLogo}
                                  alt={`${o.organization} Logo`}
                                  className="w-9 h-9 rounded-full object-cover border border-[#E8DDD7] bg-white shadow-xs"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] flex items-center justify-center text-[#63474D]">
                                  {isOrg ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#2D1F23] truncate">
                                {o.organization || o.name}
                              </div>
                              <div className="text-[11px] text-[#756366] flex items-center gap-1.5 flex-wrap">
                                <span>Lead: {o.name}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[10px] font-semibold text-[#63474D] bg-[#FAF7F5] px-1.5 py-0.5 rounded border border-[#E8DDD7]">
                                  {o.applicantType || (o.organization ? 'Organization' : 'Individual')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-gray-700">{o.email}</div>
                          {o.phone && <div className="text-[11px] text-[#756366]">{o.phone}</div>}
                        </td>

                        <td className="py-3.5 px-4">{o.eventsCount}</td>
                        <td className="py-3.5 px-4 font-bold text-[#63474D]">{o.totalCheckIns}</td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              o.approvalStatus === 'approved'
                                ? 'success'
                                : o.approvalStatus === 'pending'
                                ? 'warning'
                                : o.approvalStatus === 'more_info_needed'
                                ? 'warning'
                                : 'error'
                            }
                          >
                            {o.approvalStatus === 'pending'
                              ? 'Pending Review'
                              : o.approvalStatus === 'more_info_needed'
                              ? 'More Info Needed'
                              : o.approvalStatus === 'approved'
                              ? 'Active'
                              : 'Rejected'}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenOrganizerReview(o)}
                              className="text-xs px-2.5 py-1 flex items-center gap-1 border-[#E8DDD7] text-[#63474D] hover:bg-[#FAF7F5]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review
                            </Button>

                            {o.approvalStatus === 'pending' || o.approvalStatus === 'more_info_needed' ? (
                              <Button
                                size="sm"
                                variant="primary"
                                isLoading={actionLoadingId === o.id}
                                onClick={() => handleApproveOrganizer(o.id)}
                                className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                Approve
                              </Button>
                            ) : (
                              <button
                                onClick={() => setStatusModalUser(o)}
                                className="text-xs font-semibold text-[#63474D] hover:underline px-1 py-1"
                              >
                                {o.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ATTENDEES TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                  <th className="py-3 px-4">Attendee Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Registered Events</th>
                  <th className="py-3 px-4">Attended Events</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Account Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
                {attendees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                      {isLoading ? 'Loading attendees...' : 'No attendees found.'}
                    </td>
                  </tr>
                ) : (
                  attendees.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold">{u.name}</td>
                      <td className="py-3.5 px-4 text-[#756366]">{u.email}</td>
                      <td className="py-3.5 px-4">{u.eventsRegistered}</td>
                      <td className="py-3.5 px-4 font-bold text-[#2A7B5F]">{u.eventsAttended}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.status === 'Active' ? 'success' : 'gray'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setStatusModalUser(u)}
                          className="text-xs font-semibold text-[#63474D] hover:underline"
                        >
                          {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Unified Backend Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalRecords}
          itemsPerPage={15}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      </div>

      {/* Organizer Application Review Modal */}
      <Modal
        isOpen={!!reviewOrganizer}
        onClose={() => {
          setReviewOrganizer(null);
          setReviewActionTab('idle');
        }}
        title="Organizer Application Review"
        maxWidth="2xl"
      >
        {reviewOrganizer && (
          <div className="space-y-5 text-xs text-[#2D1F23]">
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DDD7] gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    reviewOrganizer.approvalStatus === 'approved'
                      ? 'success'
                      : reviewOrganizer.approvalStatus === 'pending'
                      ? 'warning'
                      : reviewOrganizer.approvalStatus === 'more_info_needed'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {reviewOrganizer.approvalStatus === 'pending'
                    ? 'Pending Review'
                    : reviewOrganizer.approvalStatus === 'more_info_needed'
                    ? 'More Info Needed'
                    : reviewOrganizer.approvalStatus === 'approved'
                    ? 'Approved / Active'
                    : 'Rejected'}
                </Badge>
                <span className="text-[11px] font-semibold text-[#756366]">
                  {reviewOrganizer.applicantType ||
                    (reviewOrganizer.organization ? 'Organization / Institution' : 'Individual Organizer')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#756366]">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Applied:{' '}
                  {reviewOrganizer.appliedAt
                    ? new Date(reviewOrganizer.appliedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>

            {reviewOrganizerLoading ? (
              <div className="py-8 text-center text-[#756366] flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#63474D]" />
                <span>Loading application details...</span>
              </div>
            ) : (
              <>
                {/* Applicant & Organization Card */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7]">
                  {/* Logo or Avatar */}
                  <div className="shrink-0">
                    {reviewOrganizer.applicantType === 'Organization / Institution' ||
                    (!reviewOrganizer.applicantType && reviewOrganizer.organization) ? (
                      reviewOrganizer.organizationLogo && !orgLogoError ? (
                        <img
                          src={reviewOrganizer.organizationLogo}
                          alt={`${reviewOrganizer.organization} Logo`}
                          onError={() => setOrgLogoError(true)}
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#E8DDD7] shadow-sm bg-white"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-[#E8DDD7] flex items-center justify-center text-[#63474D] shadow-sm">
                          <Building2 className="w-8 h-8" />
                        </div>
                      )
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white border-2 border-[#E8DDD7] flex items-center justify-center text-[#63474D] shadow-sm">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-bold text-sm text-[#2D1F23] truncate">
                        {reviewOrganizer.organization || reviewOrganizer.name}
                      </h4>
                    </div>
                    <div className="text-[11px] text-[#756366]">
                      Applicant:{' '}
                      <strong className="text-[#2D1F23]">{reviewOrganizer.name}</strong>
                      {reviewOrganizer.applicantPosition && (
                        <span> ({reviewOrganizer.applicantPosition})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-[#756366]">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#63474D]" />
                        {reviewOrganizer.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#63474D]" />
                        {reviewOrganizer.phone || 'No phone provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conditional Details: Individual vs Organization */}
                {reviewOrganizer.applicantType === 'Individual Organizer' ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#63474D]" />
                      Personal Introduction
                    </label>
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E8DDD7] text-xs leading-relaxed text-[#2D1F23] whitespace-pre-wrap">
                      {reviewOrganizer.personalIntroduction ||
                        reviewOrganizer.bio ||
                        'No personal introduction provided.'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] block">
                          Organization Type
                        </span>
                        <span className="font-semibold text-xs text-[#2D1F23]">
                          {reviewOrganizer.organizationType || 'Not specified'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] block">
                          Website or Social Link
                        </span>
                        {reviewOrganizer.organizationWebsite ? (
                          <a
                            href={
                              reviewOrganizer.organizationWebsite.startsWith('http')
                                ? reviewOrganizer.organizationWebsite
                                : `https://${reviewOrganizer.organizationWebsite}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#63474D] font-bold hover:underline truncate max-w-full"
                          >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{reviewOrganizer.organizationWebsite}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Not provided</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#756366] block">
                        Organization Description
                      </label>
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E8DDD7] text-xs leading-relaxed text-[#2D1F23] whitespace-pre-wrap">
                        {reviewOrganizer.organizationDescription ||
                          reviewOrganizer.bio ||
                          'No description provided.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Rejection or Info Request Notes */}
                {reviewOrganizer.rejectionReason && (
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800">
                    <span className="font-bold flex items-center gap-1 text-xs mb-1">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      Previous Rejection Reason:
                    </span>
                    <p className="text-xs">{reviewOrganizer.rejectionReason}</p>
                  </div>
                )}

                {reviewOrganizer.infoRequestedNotes && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
                    <span className="font-bold flex items-center gap-1 text-xs mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      Information Requested from Applicant:
                    </span>
                    <p className="text-xs whitespace-pre-wrap">{reviewOrganizer.infoRequestedNotes}</p>
                  </div>
                )}

                {/* Action Panels */}
                {reviewActionTab === 'idle' ? (
                  <div className="pt-3 border-t border-[#E8DDD7] flex flex-wrap items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewOrganizer(null)}
                    >
                      Close
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewActionTab('request_info')}
                        className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs"
                      >
                        Request Info
                      </Button>

                      {reviewOrganizer.approvalStatus !== 'approved' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewActionTab('reject')}
                            className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                          >
                            Reject
                          </Button>

                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={actionLoadingId === reviewOrganizer.id}
                            onClick={() => handleApproveOrganizer(reviewOrganizer.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Approve Application
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewOrganizer(null);
                            setStatusModalUser(reviewOrganizer);
                          }}
                          className={`text-xs ${
                            reviewOrganizer.isActive
                              ? 'border-red-300 text-red-700 hover:bg-red-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {reviewOrganizer.isActive ? 'Deactivate Account' : 'Activate Account'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : reviewActionTab === 'reject' ? (
                  <div className="pt-3 border-t border-[#E8DDD7] space-y-3 bg-red-50/50 p-4 rounded-2xl border border-red-200">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-red-800 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Specify Reason for Rejection
                      </h5>
                      <button
                        type="button"
                        onClick={() => setReviewActionTab('idle')}
                        className="text-xs text-[#756366] hover:text-[#2D1F23]"
                      >
                        Cancel
                      </button>
                    </div>
                    <textarea
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      placeholder="Explain clearly to the applicant why their organizer application cannot be approved at this time..."
                      rows={3}
                      className="w-full p-2.5 text-xs bg-white border border-red-300 rounded-xl focus:outline-none focus:border-red-500 text-[#2D1F23]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewActionTab('idle')}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        isLoading={actionLoadingId === reviewOrganizer.id}
                        onClick={() => handleRejectOrganizer(reviewOrganizer.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                      >
                        Confirm Rejection & Notify
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#E8DDD7] space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-amber-700" />
                        Request Additional Information
                      </h5>
                      <button
                        type="button"
                        onClick={() => setReviewActionTab('idle')}
                        className="text-xs text-[#756366] hover:text-[#2D1F23]"
                      >
                        Cancel
                      </button>
                    </div>
                    <textarea
                      value={requestInfoNotesInput}
                      onChange={(e) => setRequestInfoNotesInput(e.target.value)}
                      placeholder="Specify what additional details or corrections are needed before this application can be approved..."
                      rows={3}
                      className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:border-amber-500 text-[#2D1F23]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewActionTab('idle')}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        isLoading={actionLoadingId === reviewOrganizer.id}
                        onClick={() => handleRequestOrganizerInfo(reviewOrganizer.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                      >
                        Send Request to Applicant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Corporate Sponsor Application Review Modal */}
      <Modal
        isOpen={!!reviewSponsor}
        onClose={() => {
          setReviewSponsor(null);
          setReviewSponsorActionTab('idle');
        }}
        title="Corporate Sponsor Application Review"
        maxWidth="2xl"
      >
        {reviewSponsor && (
          <div className="space-y-5 text-xs text-[#2D1F23]">
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DDD7] gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    reviewSponsor.approvalStatus === 'approved'
                      ? 'success'
                      : reviewSponsor.approvalStatus === 'pending'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {reviewSponsor.approvalStatus === 'pending'
                    ? 'Pending Review'
                    : reviewSponsor.approvalStatus === 'approved'
                    ? 'Approved / Active'
                    : 'Rejected'}
                </Badge>
                <span className="text-[11px] font-semibold text-[#63474D] bg-[#FAF7F5] border border-[#E8DDD7] px-2.5 py-0.5 rounded-full">
                  {reviewSponsor.industryCategory || 'Technology & Digital'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#756366]">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Registered:{' '}
                  {reviewSponsor.registeredAt
                    ? new Date(reviewSponsor.registeredAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>

            {reviewSponsorLoading ? (
              <div className="py-8 text-center text-[#756366] flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#63474D]" />
                <span>Loading sponsor profile & questionnaire answers...</span>
              </div>
            ) : (
              <>
                {/* Corporate & Representative Identity Card */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7]">
                  {/* Logo or Placeholder */}
                  <div className="shrink-0">
                    {reviewSponsor.avatarUrl && !sponsorLogoError ? (
                      <img
                        src={reviewSponsor.avatarUrl}
                        alt={`${reviewSponsor.companyName} Logo`}
                        onError={() => setSponsorLogoError(true)}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E8DDD7] shadow-sm bg-white p-1"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#E8DDD7] flex items-center justify-center text-[#63474D] shadow-sm">
                        <Building2 className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-bold text-base text-[#2D1F23] truncate">
                        {reviewSponsor.companyName}
                      </h4>
                    </div>
                    <div className="text-[11px] text-[#756366]">
                      Representative / Lead Contact:{' '}
                      <strong className="text-[#2D1F23]">{reviewSponsor.name}</strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[11px] text-[#756366]">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#63474D]" />
                        {reviewSponsor.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#63474D]" />
                        {reviewSponsor.phone || reviewSponsor.companyPhone || 'No phone provided'}
                      </span>
                      {(reviewSponsor.website || reviewSponsor.companyWebsite) && (
                        <a
                          href={
                            (reviewSponsor.website || reviewSponsor.companyWebsite)!.startsWith('http')
                              ? (reviewSponsor.website || reviewSponsor.companyWebsite)
                              : `https://${reviewSponsor.website || reviewSponsor.companyWebsite}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#63474D] font-bold hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          <span>{reviewSponsor.website || reviewSponsor.companyWebsite}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Overview & Background */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#63474D]" />
                    Company Overview & Background
                  </label>
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E8DDD7] text-xs leading-relaxed text-[#2D1F23] whitespace-pre-wrap">
                    {reviewSponsor.bio || 'No company bio provided during registration.'}
                  </div>
                </div>

                {/* Sponsorship Questionnaire & Preferences */}
                <div className="space-y-3 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFA686]" />
                    Sponsorship Questionnaire & Targeting Preferences
                  </label>

                  <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-4">
                    {/* Objectives */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Target className="w-3 h-3 text-[#63474D]" />
                        Sponsorship Objectives
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {reviewSponsor.sponsorPreferences?.sponsorshipObjectives &&
                        reviewSponsor.sponsorPreferences.sponsorshipObjectives.length > 0 ? (
                          reviewSponsor.sponsorPreferences.sponsorshipObjectives.map((obj, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#2D1F23]"
                            >
                              {obj}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">None specified</span>
                        )}
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#63474D]" />
                        Target Audience
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {reviewSponsor.sponsorPreferences?.targetAudience &&
                        reviewSponsor.sponsorPreferences.targetAudience.length > 0 ? (
                          reviewSponsor.sponsorPreferences.targetAudience.map((aud, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#2D1F23]"
                            >
                              {aud}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">General audience</span>
                        )}
                      </div>
                    </div>

                    {/* Target Skills & Interests */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#63474D]" />
                        Target Skills & Technologies
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(reviewSponsor.sponsorPreferences?.targetSkills?.length ||
                          reviewSponsor.sponsorPreferences?.targetInterests?.length) ? (
                          [
                            ...(reviewSponsor.sponsorPreferences?.targetSkills || []),
                            ...(reviewSponsor.sponsorPreferences?.targetInterests || []),
                          ].map((skill, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#63474D]"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">All tech domains</span>
                        )}
                      </div>
                    </div>

                    {/* Preferred Event Categories */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#63474D]" />
                        Preferred Event Formats & Categories
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(reviewSponsor.sponsorPreferences?.preferredEventCategories?.length ||
                          reviewSponsor.sponsorPreferences?.preferredEventTypes?.length) ? (
                          [
                            ...(reviewSponsor.sponsorPreferences?.preferredEventCategories || []),
                            ...(reviewSponsor.sponsorPreferences?.preferredEventTypes || []),
                          ].map((cat, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#2D1F23]"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">Any event format</span>
                        )}
                      </div>
                    </div>

                    {/* Budget & Additional Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1 mb-1">
                          <DollarSign className="w-3 h-3 text-[#63474D]" />
                          Target Budget Range
                        </span>
                        <span className="font-bold text-xs text-[#2D1F23]">
                          {reviewSponsor.sponsorPreferences?.maxBudget
                            ? `Up to ETB ${reviewSponsor.sponsorPreferences.maxBudget.toLocaleString()}`
                            : reviewSponsor.sponsorPreferences?.minBudget
                            ? `From ETB ${reviewSponsor.sponsorPreferences.minBudget.toLocaleString()}`
                            : 'Flexible / Negotiable'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1 mb-1">
                          <Briefcase className="w-3 h-3 text-[#63474D]" />
                          Preferred Locations
                        </span>
                        <span className="font-semibold text-xs text-[#2D1F23]">
                          {reviewSponsor.sponsorPreferences?.preferredLocations &&
                          reviewSponsor.sponsorPreferences.preferredLocations.length > 0
                            ? reviewSponsor.sponsorPreferences.preferredLocations.join(', ')
                            : 'Addis Ababa / All Ethiopia'}
                        </span>
                      </div>
                    </div>

                    {reviewSponsor.sponsorPreferences?.additionalPreferences && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] block">
                          Additional Requirements / Custom Notes
                        </span>
                        <div className="p-3 rounded-xl bg-white border border-[#E8DDD7] text-xs text-[#2D1F23] whitespace-pre-wrap">
                          {typeof reviewSponsor.sponsorPreferences.additionalPreferences === 'string'
                            ? reviewSponsor.sponsorPreferences.additionalPreferences
                            : (reviewSponsor.sponsorPreferences.additionalPreferences as any).notes ||
                              JSON.stringify(reviewSponsor.sponsorPreferences.additionalPreferences, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Action Controls */}
                {reviewSponsorActionTab === 'idle' ? (
                  <div className="pt-3 border-t border-[#E8DDD7] flex flex-wrap items-center justify-between gap-3">
                    <Button variant="outline" size="sm" onClick={() => setReviewSponsor(null)}>
                      Close
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                      {reviewSponsor.approvalStatus === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewSponsorActionTab('reject')}
                            className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                          >
                            Reject Application
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={actionLoadingId === reviewSponsor.id}
                            onClick={() => handleApproveSponsor(reviewSponsor.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Approve Corporate Sponsor
                          </Button>
                        </>
                      ) : reviewSponsor.approvalStatus === 'approved' ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Corporate Partner
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewSponsor(null);
                              setStatusModalUser(reviewSponsor);
                            }}
                            className={`text-xs ${
                              reviewSponsor.isActive
                                ? 'border-red-300 text-red-700 hover:bg-red-50'
                                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {reviewSponsor.isActive ? 'Deactivate Account' : 'Activate Account'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Rejected Application
                          </span>
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={actionLoadingId === reviewSponsor.id}
                            onClick={() => handleApproveSponsor(reviewSponsor.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Reconsider & Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#E8DDD7] space-y-3 bg-red-50/50 p-4 rounded-2xl border border-red-200">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-red-800 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Confirm Rejection of Corporate Sponsor
                      </h5>
                      <button
                        type="button"
                        onClick={() => setReviewSponsorActionTab('idle')}
                        className="text-xs text-[#756366] hover:text-[#2D1F23]"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-red-700">
                      Are you sure you want to reject the application for <strong>{reviewSponsor.companyName}</strong>? A rejection notice will be emailed to <strong>{reviewSponsor.email}</strong>.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewSponsorActionTab('idle')}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        isLoading={actionLoadingId === reviewSponsor.id}
                        onClick={() => handleRejectSponsor(reviewSponsor.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                      >
                        Confirm Rejection & Notify
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!statusModalUser}
        onClose={() => setStatusModalUser(null)}
        title="Update User Account Status"
      >
        <div className="space-y-4 text-xs text-[#2D1F23]">
          <p>
            Are you sure you want to change the status of{' '}
            <strong>{statusModalUser?.name}</strong> ({statusModalUser?.email})?
          </p>
          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setStatusModalUser(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={!!actionLoadingId}
              onClick={handleToggleStatus}
            >
              Confirm Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Corporate Sponsor Application Review Modal */}
      <Modal
        isOpen={!!reviewSponsor}
        onClose={() => {
          setReviewSponsor(null);
          setReviewSponsorActionTab('idle');
        }}
        title="Corporate Sponsor Application Review"
        maxWidth="2xl"
      >
        {reviewSponsor && (
          <div className="space-y-5 text-xs text-[#2D1F23]">
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DDD7] gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    reviewSponsor.approvalStatus === 'approved'
                      ? 'success'
                      : reviewSponsor.approvalStatus === 'pending'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {reviewSponsor.approvalStatus === 'pending'
                    ? 'Pending Review'
                    : reviewSponsor.approvalStatus === 'approved'
                    ? 'Approved / Active'
                    : 'Rejected'}
                </Badge>
                <span className="text-[11px] font-semibold text-[#63474D] bg-[#FAF7F5] border border-[#E8DDD7] px-2.5 py-0.5 rounded-full">
                  {reviewSponsor.industryCategory || 'Technology & Digital'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#756366]">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Registered:{' '}
                  {reviewSponsor.registeredAt
                    ? new Date(reviewSponsor.registeredAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>

            {reviewSponsorLoading ? (
              <div className="py-8 text-center text-[#756366] flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#63474D]" />
                <span>Loading sponsor profile & questionnaire answers...</span>
              </div>
            ) : (
              <>
                {/* Corporate & Representative Identity Card */}
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7]">
                  {/* Logo or Placeholder */}
                  <div className="shrink-0">
                    {reviewSponsor.avatarUrl && !sponsorLogoError ? (
                      <img
                        src={reviewSponsor.avatarUrl}
                        alt={`${reviewSponsor.companyName} Logo`}
                        onError={() => setSponsorLogoError(true)}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E8DDD7] shadow-sm bg-white p-1"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#E8DDD7] flex items-center justify-center text-[#63474D] shadow-sm">
                        <Building2 className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="font-bold text-base text-[#2D1F23] truncate">
                        {reviewSponsor.companyName}
                      </h4>
                    </div>
                    <div className="text-[11px] text-[#756366]">
                      Representative / Lead Contact:{' '}
                      <strong className="text-[#2D1F23]">{reviewSponsor.name}</strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[11px] text-[#756366]">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#63474D]" />
                        {reviewSponsor.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#63474D]" />
                        {reviewSponsor.phone || reviewSponsor.companyPhone || 'No phone provided'}
                      </span>
                      {(reviewSponsor.website || reviewSponsor.companyWebsite) && (
                        <a
                          href={
                            (reviewSponsor.website || reviewSponsor.companyWebsite)!.startsWith('http')
                              ? (reviewSponsor.website || reviewSponsor.companyWebsite)
                              : `https://${reviewSponsor.website || reviewSponsor.companyWebsite}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#63474D] font-bold hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          <span>{reviewSponsor.website || reviewSponsor.companyWebsite}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Overview & Background */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#63474D]" />
                    Company Overview & Background
                  </label>
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E8DDD7] text-xs leading-relaxed text-[#2D1F23] whitespace-pre-wrap">
                    {reviewSponsor.bio || 'No company bio provided during registration.'}
                  </div>
                </div>

                {/* Sponsorship Questionnaire & Preferences */}
                <div className="space-y-3 pt-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFA686]" />
                    Sponsorship Questionnaire & Targeting Preferences
                  </label>

                  <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-4">
                    {/* Objectives */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Target className="w-3 h-3 text-[#63474D]" />
                        Sponsorship Objectives
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {reviewSponsor.sponsorPreferences?.sponsorshipObjectives &&
                        reviewSponsor.sponsorPreferences.sponsorshipObjectives.length > 0 ? (
                          reviewSponsor.sponsorPreferences.sponsorshipObjectives.map((obj, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#2D1F23]"
                            >
                              {obj}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">None specified</span>
                        )}
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#63474D]" />
                        Target Audience
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {reviewSponsor.sponsorPreferences?.targetAudience &&
                        reviewSponsor.sponsorPreferences.targetAudience.length > 0 ? (
                          reviewSponsor.sponsorPreferences.targetAudience.map((aud, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#2D1F23]"
                            >
                              {aud}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">General audience</span>
                        )}
                      </div>
                    </div>

                    {/* Target Skills & Interests */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#63474D]" />
                        Target Skills & Technologies
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(reviewSponsor.sponsorPreferences?.targetSkills?.length ||
                          reviewSponsor.sponsorPreferences?.targetInterests?.length) ? (
                          [
                            ...(reviewSponsor.sponsorPreferences?.targetSkills || []),
                            ...(reviewSponsor.sponsorPreferences?.targetInterests || []),
                          ].map((skill, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#63474D]"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">All tech domains</span>
                        )}
                      </div>
                    </div>

                    {/* Preferred Event Categories */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#63474D]" />
                        Preferred Event Formats & Categories
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(reviewSponsor.sponsorPreferences?.preferredEventCategories?.length ||
                          reviewSponsor.sponsorPreferences?.preferredEventTypes?.length) ? (
                          [
                            ...(reviewSponsor.sponsorPreferences?.preferredEventCategories || []),
                            ...(reviewSponsor.sponsorPreferences?.preferredEventTypes || []),
                          ].map((cat, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E8DDD7] text-[11px] font-semibold text-[#2D1F23]"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[#756366] italic">Any event format</span>
                        )}
                      </div>
                    </div>

                    {/* Budget & Additional Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1 mb-1">
                          <DollarSign className="w-3 h-3 text-[#63474D]" />
                          Target Budget Range
                        </span>
                        <span className="font-bold text-xs text-[#2D1F23]">
                          {reviewSponsor.sponsorPreferences?.maxBudget
                            ? `Up to ETB ${reviewSponsor.sponsorPreferences.maxBudget.toLocaleString()}`
                            : reviewSponsor.sponsorPreferences?.minBudget
                            ? `From ETB ${reviewSponsor.sponsorPreferences.minBudget.toLocaleString()}`
                            : 'Flexible / Negotiable'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1 mb-1">
                          <Briefcase className="w-3 h-3 text-[#63474D]" />
                          Preferred Locations
                        </span>
                        <span className="font-semibold text-xs text-[#2D1F23]">
                          {reviewSponsor.sponsorPreferences?.preferredLocations &&
                          reviewSponsor.sponsorPreferences.preferredLocations.length > 0
                            ? reviewSponsor.sponsorPreferences.preferredLocations.join(', ')
                            : 'Addis Ababa / All Ethiopia'}
                        </span>
                      </div>
                    </div>

                    {reviewSponsor.sponsorPreferences?.additionalPreferences && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#756366] block">
                          Additional Requirements / Custom Notes
                        </span>
                        <div className="p-3 rounded-xl bg-white border border-[#E8DDD7] text-xs text-[#2D1F23] whitespace-pre-wrap">
                          {typeof reviewSponsor.sponsorPreferences.additionalPreferences === 'string'
                            ? reviewSponsor.sponsorPreferences.additionalPreferences
                            : (reviewSponsor.sponsorPreferences.additionalPreferences as any).notes ||
                              JSON.stringify(reviewSponsor.sponsorPreferences.additionalPreferences, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Action Controls */}
                {reviewSponsorActionTab === 'idle' ? (
                  <div className="pt-3 border-t border-[#E8DDD7] flex flex-wrap items-center justify-between gap-3">
                    <Button variant="outline" size="sm" onClick={() => setReviewSponsor(null)}>
                      Close
                    </Button>

                    <div className="flex flex-wrap items-center gap-2">
                      {reviewSponsor.approvalStatus === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewSponsorActionTab('reject')}
                            className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                          >
                            Reject Application
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={actionLoadingId === reviewSponsor.id}
                            onClick={() => handleApproveSponsor(reviewSponsor.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Approve Corporate Sponsor
                          </Button>
                        </>
                      ) : reviewSponsor.approvalStatus === 'approved' ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Corporate Partner
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewSponsor(null);
                              setStatusModalUser(reviewSponsor);
                            }}
                            className={`text-xs ${
                              reviewSponsor.isActive
                                ? 'border-red-300 text-red-700 hover:bg-red-50'
                                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {reviewSponsor.isActive ? 'Deactivate Account' : 'Activate Account'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Rejected Application
                          </span>
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={actionLoadingId === reviewSponsor.id}
                            onClick={() => handleApproveSponsor(reviewSponsor.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                          >
                            Reconsider & Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#E8DDD7] space-y-3 bg-red-50/50 p-4 rounded-2xl border border-red-200">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-red-800 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Confirm Rejection of Corporate Sponsor
                      </h5>
                      <button
                        type="button"
                        onClick={() => setReviewSponsorActionTab('idle')}
                        className="text-xs text-[#756366] hover:text-[#2D1F23]"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-red-700">
                      Are you sure you want to reject the application for <strong>{reviewSponsor.companyName}</strong>? A rejection notice will be emailed to <strong>{reviewSponsor.email}</strong>.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewSponsorActionTab('idle')}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        isLoading={actionLoadingId === reviewSponsor.id}
                        onClick={() => handleRejectSponsor(reviewSponsor.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                      >
                        Confirm Rejection & Notify
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
