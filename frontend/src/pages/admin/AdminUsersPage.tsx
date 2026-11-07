import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
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
  status: string;
  approvalStatus: string;
  isActive: boolean;
  registeredAt: string;
}

export const AdminUsersPage: React.FC = () => {
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerRecord[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ORGANIZERS' | 'ATTENDEES' | 'SPONSORS'>('ORGANIZERS');
  const [searchQuery, setSearchQuery] = useState('');

  const [statusModalUser, setStatusModalUser] = useState<AttendeeRecord | OrganizerRecord | SponsorRecord | null>(null);

  // Organizer Review Modal state
  const [reviewOrganizer, setReviewOrganizer] = useState<OrganizerRecord | null>(null);
  const [reviewOrganizerLoading, setReviewOrganizerLoading] = useState<boolean>(false);
  const [orgLogoError, setOrgLogoError] = useState<boolean>(false);
  const [reviewActionTab, setReviewActionTab] = useState<'idle' | 'reject' | 'request_info'>('idle');
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [requestInfoNotesInput, setRequestInfoNotesInput] = useState<string>('');

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.getUsers();
      if (data) {
        setAttendees(data.attendees || []);
        setOrganizers(data.organizers || []);
        setSponsors(data.sponsors || []);
      }
    } catch (err: any) {
      console.error('Failed to load users from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleApproveSponsor = async (sponsorId: string) => {
    setActionLoadingId(sponsorId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await api.admin.approveSponsor(sponsorId);
      setActionSuccessMsg('Sponsor approved and activated successfully! An approval email has been dispatched.');
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

  const pendingOrganizersCount = organizers.filter(
    (o) => o.approvalStatus === 'pending' || o.approvalStatus === 'more_info_needed'
  ).length;
  const pendingSponsorsCount = sponsors.filter((s) => s.approvalStatus === 'pending').length;

  const filteredAttendees = attendees.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrganizers = organizers.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSponsors = sponsors.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.industryCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Tabs */}
      <div className="flex border-b border-[#E8DDD7] gap-6">
        <button
          onClick={() => setActiveTab('ORGANIZERS')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ORGANIZERS'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Organizers ({organizers.length})
          {pendingOrganizersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingOrganizersCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SPONSORS')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'SPONSORS'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#FFA686]" />
          Corporate Sponsors ({sponsors.length})
          {pendingSponsorsCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
              {pendingSponsorsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ATTENDEES')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ATTENDEES'
              ? 'border-[#63474D] text-[#63474D]'
              : 'border-transparent text-[#756366] hover:text-[#2D1F23]'
          }`}
        >
          <Users className="w-4 h-4" />
          Attendees ({attendees.length})
        </button>
      </div>

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
                {filteredSponsors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                      No corporate sponsors registered yet.
                    </td>
                  </tr>
                ) : (
                  filteredSponsors.map((s) => (
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
                        {s.approvalStatus === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
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
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-gray-500">
                            {s.approvalStatus === 'approved' ? 'Verified' : 'Archived'}
                          </span>
                        )}
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
                {filteredOrganizers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                      No organizers registered yet.
                    </td>
                  </tr>
                ) : (
                  filteredOrganizers.map((o) => {
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
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                      No attendees registered yet.
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((u) => (
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
    </div>
  );
};
