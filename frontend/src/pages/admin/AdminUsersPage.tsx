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
  organization: string;
  eventsCount: number;
  totalCheckIns: number;
  status: string;
  approvalStatus: string;
  isActive: boolean;
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
  const [reviewSponsor, setReviewSponsor] = useState<SponsorRecord | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  const handleOpenReview = async (sponsor: SponsorRecord) => {
    setReviewSponsor(sponsor);
    setImgError(false);
    setReviewLoading(true);
    try {
      const details = await api.admin.getSponsorDetails(sponsor.id);
      if (details) {
        setReviewSponsor((prev) => (prev ? { ...prev, ...details } : details));
      }
    } catch (err) {
      console.warn('Could not fetch detailed sponsor record, using row data:', err);
    } finally {
      setReviewLoading(false);
    }
  };
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

  const handleApproveOrganizer = async (organizerId: string) => {
    setActionLoadingId(organizerId);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      await api.admin.approveOrganizer(organizerId);
      setActionSuccessMsg('Organizer approved and activated successfully! They can now log in.');
      await fetchUsers();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to approve organizer.');
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

  const pendingOrganizersCount = organizers.filter((o) => o.approvalStatus === 'pending').length;
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
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Events Hosted</th>
                  <th className="py-3 px-4">Check-ins Validated</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                  filteredOrganizers.map((o) => (
                    <tr key={o.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold">{o.organization}</div>
                        <div className="text-[11px] text-[#756366]">{o.name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#756366]">{o.email}</td>
                      <td className="py-3.5 px-4">{o.eventsCount}</td>
                      <td className="py-3.5 px-4 font-bold text-[#63474D]">{o.totalCheckIns}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            o.approvalStatus === 'approved'
                              ? 'success'
                              : o.approvalStatus === 'pending'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {o.approvalStatus === 'pending' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={actionLoadingId === o.id}
                            onClick={() => handleApproveOrganizer(o.id)}
                            className="text-xs px-3 py-1"
                          >
                            Approve
                          </Button>
                        ) : (
                          <button
                            onClick={() => setStatusModalUser(o)}
                            className="text-xs font-semibold text-[#63474D] hover:underline"
                          >
                            {o.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
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
