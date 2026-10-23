import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import type { AttendeeRosterItem, BadgeCode } from '../../types/attendance';
import { Button } from '../../components/ui/Button';
import {
  Clock,
  Award,
  QrCode,
  BarChart3,
  Copy,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Image,
  UserPlus,
  User,
  AlertCircle,
  X,
  HelpCircle,
  Edit,
  Trash2,
  Globe,
  Check,
  UserCheck,
  Mail,
} from 'lucide-react';
import { EditEventQuestionsModal } from '../../components/organizer/EditEventQuestionsModal';
import { EditEventModal } from '../../components/organizer/EditEventModal';
import { ManualAddAttendeeModal } from '../../components/organizer/ManualAddAttendeeModal';
import { ReviewsSection } from '../../components/reviews/ReviewsSection';
import { getCalendarTile } from '../../utils/date';
import { manualAttendeeFormSchema, awardBadgeFormSchema, validateForm } from '../../schemas';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [roster, setRoster] = useState<AttendeeRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteEventModalOpen, setIsDeleteEventModalOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  // Search queries for both independent lists (Section 3)
  const [registeredSearch, setRegisteredSearch] = useState('');
  const [attendedSearch, setAttendedSearch] = useState('');

  // Delete attendee confirmation toast state
  const [deleteConfirmToast, setDeleteConfirmToast] = useState<AttendeeRosterItem | null>(null);
  const [isDeletingAttendee, setIsDeletingAttendee] = useState(false);

  // Badge award modal / action state
  const [awardingAttendee, setAwardingAttendee] = useState<AttendeeRosterItem | null>(null);
  const [selectedBadgeCode, setSelectedBadgeCode] = useState<BadgeCode>('participant');
  const [isSubmittingAward, setIsSubmittingAward] = useState(false);
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit Questions & Edit Event Modals State
  const [isEditQuestionsOpen, setIsEditQuestionsOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);

  // Manual Add Attendee Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', email: '', phone: '' });
  const [isSubmittingManualUser, setIsSubmittingManualUser] = useState(false);
  const [manualUserError, setManualUserError] = useState<string | null>(null);

  // Registration Answers Modal State
  const [selectedAnswersAttendee, setSelectedAnswersAttendee] = useState<AttendeeRosterItem | null>(null);

  // Approval workflow state
  const [approvalTab, setApprovalTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingAttendee, setRejectingAttendee] = useState<AttendeeRosterItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [approvalActionMsg, setApprovalActionMsg] = useState<string | null>(null);

  // Bulk action state
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<string[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [selectedAttendedIds, setSelectedAttendedIds] = useState<string[]>([]);
  const [isBulkAwarding, setIsBulkAwarding] = useState(false);
  const [bulkBadgeCode, setBulkBadgeCode] = useState<BadgeCode>('participant');

  const fetchEventData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const evt = await api.events.getById(id);
      setEvent(evt || null);
      const rosterData = await api.roster.getByEventId(id);
      setRoster(rosterData);
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const handleCopyLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.shareLinkToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const [togglingPublicize, setTogglingPublicize] = useState(false);

  const handleTogglePublicize = async () => {
    if (!event) return;
    setTogglingPublicize(true);
    try {
      const nextStatus = !event.isPublicized;
      const updated = await api.events.update(event.id, { isPublicized: nextStatus });
      setEvent((prev) => (prev ? { ...prev, isPublicized: nextStatus } : updated));
    } catch (err: any) {
      console.error('Failed to toggle publicize status:', err);
      alert(err.message || 'Failed to update discovery status.');
    } finally {
      setTogglingPublicize(false);
    }
  };

  // Resend registration notification state & handler
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  const handleResendEmail = async (att: AttendeeRosterItem) => {
    const regId = att.registrationId || att.id;
    if (!event || !regId) return;
    setResendingEmailId(regId);
    try {
      const res = await api.checkIn.resendManualNotification({
        eventId: event.id,
        registrationId: regId,
      });
      setAwardSuccessMsg(res.message || `Notification email resent to ${att.email}!`);
      setTimeout(() => setAwardSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to resend email notification.');
    } finally {
      setResendingEmailId(null);
    }
  };

  // Manual Attendee Creation (Walk-in check-in)
  const handleAddManualAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    const validation = validateForm(manualAttendeeFormSchema, manualForm);
    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0] || 'Please provide both full name and a valid email address.';
      setManualUserError(firstError);
      return;
    }
    setIsSubmittingManualUser(true);
    setManualUserError(null);
    try {
      await api.checkIn.addManualAttendee({
        eventId: event.id,
        name: manualForm.name.trim(),
        email: manualForm.email.trim(),
        phone: manualForm.phone.trim() || undefined,
      });

      setAwardSuccessMsg(
        `Successfully registered "${manualForm.name}"! Ticket and QR pass emailed to ${manualForm.email}.`
      );
      setTimeout(() => setAwardSuccessMsg(null), 5000);
      setIsAddUserModalOpen(false);
      setManualForm({ name: '', email: '', phone: '' });
      await fetchEventData();
    } catch (err: any) {
      setManualUserError(err.message || 'Failed to add attendee.');
    } finally {
      setIsSubmittingManualUser(false);
    }
  };

  // Admit / Check-in attendee manually from Registered list
  const [admittingAttendeeId, setAdmittingAttendeeId] = useState<string | null>(null);

  const handleAdmitAttendee = async (attendee: AttendeeRosterItem) => {
    if (!event) return;
    const attendeeId = attendee.attendeeId || attendee.id;
    setAdmittingAttendeeId(attendeeId);
    try {
      await api.checkIn.markAttended({
        eventId: event.id,
        attendeeId,
      });

      setApprovalActionMsg(`✓ "${attendee.name}" has been admitted and marked as attended!`);
      setTimeout(() => setApprovalActionMsg(null), 5000);
      await fetchEventData();
    } catch (err: any) {
      console.error('Failed to admit attendee:', err);
      alert(err.message || 'Failed to admit attendee.');
    } finally {
      setAdmittingAttendeeId(null);
    }
  };

  // Section 7: Shared badge-award action
  const handleAwardBadge = async () => {
    if (!event || !awardingAttendee) return;
    const attendeeId = awardingAttendee.attendeeId || awardingAttendee.id;
    const validation = validateForm(awardBadgeFormSchema, {
      eventId: event.id,
      attendeeId,
      badgeCode: selectedBadgeCode,
    });
    if (!validation.success) return;

    setIsSubmittingAward(true);
    try {
      await api.badges.awardBadge({
        eventId: event.id,
        attendeeId,
        badgeCode: selectedBadgeCode,
      });

      setAwardSuccessMsg(
        `Successfully awarded "${selectedBadgeCode.toUpperCase()}" badge to ${awardingAttendee.name}!`
      );
      setTimeout(() => setAwardSuccessMsg(null), 4000);
      setAwardingAttendee(null);
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to award badge.');
    } finally {
      setIsSubmittingAward(false);
    }
  };

  // Delete attendee handler
  const handleConfirmDeleteAttendee = async (attendee: AttendeeRosterItem) => {
    if (!event) return;
    setIsDeletingAttendee(true);
    try {
      const attendeeId = attendee.registrationId || attendee.id;
      await api.events.removeAttendee(event.id, attendeeId);

      setRoster((prev) =>
        prev.filter((r) => r.id !== attendee.id && r.registrationId !== attendee.registrationId)
      );

      setAwardSuccessMsg(`"${attendee.name}" has been removed from this event.`);
      setTimeout(() => setAwardSuccessMsg(null), 4000);
      setDeleteConfirmToast(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove attendee.');
    } finally {
      setIsDeletingAttendee(false);
    }
  };

  // Approval / Rejection Handlers
  const handleApproveAttendee = async (attendee: AttendeeRosterItem) => {
    if (!event) return;
    const regId = attendee.registrationId || attendee.id;
    setApprovingId(regId);
    try {
      await api.roster.approveRegistration(event.id, regId);
      setApprovalActionMsg(`Approved "${attendee.name}"! Entry pass issued and confirmation emailed.`);
      setTimeout(() => setApprovalActionMsg(null), 5000);
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve attendee.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmRejectAttendee = async () => {
    if (!event || !rejectingAttendee) return;
    const regId = rejectingAttendee.registrationId || rejectingAttendee.id;
    setIsSubmittingReject(true);
    try {
      await api.roster.rejectRegistration(event.id, regId, rejectionReason.trim() || undefined);
      setApprovalActionMsg(`Registration for "${rejectingAttendee.name}" has been declined.`);
      setTimeout(() => setApprovalActionMsg(null), 5000);
      setRejectingAttendee(null);
      setRejectionReason('');
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject attendee.');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Bulk Approval Handlers
  const handleToggleRegistration = (id: string) => {
    setSelectedRegistrationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRegistrations = () => {
    const selectable = displayedRegisteredList.map((item) => item.registrationId || item.id);
    const allSelected = selectable.length > 0 && selectable.every((id) => selectedRegistrationIds.includes(id));
    if (allSelected) {
      setSelectedRegistrationIds([]);
    } else {
      setSelectedRegistrationIds(selectable);
    }
  };

  const handleBulkApprove = async () => {
    if (!event || selectedRegistrationIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      await api.roster.bulkApproveRegistrations(event.id, selectedRegistrationIds);
      setApprovalActionMsg(`Approved ${selectedRegistrationIds.length} applicant(s)! Entry passes issued and emails sent.`);
      setTimeout(() => setApprovalActionMsg(null), 5000);
      setSelectedRegistrationIds([]);
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to bulk approve applicants.');
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleApproveAllPending = async () => {
    if (!event) return;
    const pendingIds = roster.filter((r) => r.approvalStatus === 'pending').map((r) => r.registrationId || r.id);
    if (pendingIds.length === 0) return;
    if (!window.confirm(`Approve all ${pendingIds.length} pending applications and issue their entry passes?`)) return;
    setIsBulkApproving(true);
    try {
      await api.roster.bulkApproveRegistrations(event.id, pendingIds);
      setApprovalActionMsg(`Approved all ${pendingIds.length} pending applicant(s)! Passes issued and emails sent.`);
      setTimeout(() => setApprovalActionMsg(null), 5000);
      setSelectedRegistrationIds([]);
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve all pending applicants.');
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleBulkDeleteRegistrations = async () => {
    if (!event || selectedRegistrationIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to remove ${selectedRegistrationIds.length} registered attendee(s) from this event?`)) return;
    setIsDeletingAttendee(true);
    try {
      for (const regId of selectedRegistrationIds) {
        await api.events.removeAttendee(event.id, regId);
      }
      setAwardSuccessMsg(`Removed ${selectedRegistrationIds.length} attendee(s) from event.`);
      setTimeout(() => setAwardSuccessMsg(null), 4000);
      setSelectedRegistrationIds([]);
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove selected attendees.');
    } finally {
      setIsDeletingAttendee(false);
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!event) return;
    setIsDeletingEvent(true);
    try {
      await api.events.delete(event.id);
      navigate('/organizer');
    } catch (err: any) {
      alert(err.message || 'Failed to delete event.');
      setIsDeletingEvent(false);
    }
  };

  // Bulk Badge Award Handlers
  const handleToggleAttended = (id: string) => {
    setSelectedAttendedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAttended = () => {
    const selectable = attendedList.map((item) => item.attendeeId || item.id);
    const allSelected = selectable.length > 0 && selectable.every((id) => selectedAttendedIds.includes(id));
    if (allSelected) {
      setSelectedAttendedIds([]);
    } else {
      setSelectedAttendedIds(selectable);
    }
  };

  const handleBulkAwardBadges = async () => {
    if (!event || selectedAttendedIds.length === 0) return;
    setIsBulkAwarding(true);
    try {
      await api.badges.bulkAwardBadges({
        eventId: event.id,
        attendeeRosterIds: selectedAttendedIds,
        badgeCode: bulkBadgeCode,
      });
      setAwardSuccessMsg(`Successfully awarded "${bulkBadgeCode.toUpperCase()}" badge to ${selectedAttendedIds.length} attendee(s)!`);
      setTimeout(() => setAwardSuccessMsg(null), 5000);
      setSelectedAttendedIds([]);
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to bulk award badges.');
    } finally {
      setIsBulkAwarding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-8 bg-gray-200 rounded-xl w-48"></div>
        <div className="h-64 bg-gray-100 rounded-3xl"></div>
        <div className="h-96 bg-gray-100 rounded-3xl"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">Event Not Found</h2>
        <p className="text-xs text-gray-500">The requested event could not be located.</p>
        <Link to="/organizer">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const timeState = api.getEventTimeStatus(event);

  // Section 3: Registered list (everyone with registration row)
  const registeredList = roster.filter((item) => {
    const q = registeredSearch.toLowerCase().trim();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
  });

  const pendingCount = roster.filter((r) => r.approvalStatus === 'pending').length;
  const approvedCount = roster.filter((r) => !r.approvalStatus || r.approvalStatus === 'approved').length;
  const rejectedCount = roster.filter((r) => r.approvalStatus === 'rejected').length;

  const displayedRegisteredList = registeredList.filter((item) => {
    if (approvalTab === 'pending') return item.approvalStatus === 'pending';
    if (approvalTab === 'approved') return !item.approvalStatus || item.approvalStatus === 'approved';
    if (approvalTab === 'rejected') return item.approvalStatus === 'rejected';
    return true;
  });

  // Section 3: Attended list (non-voided check-in only)
  const attendedList = roster.filter((item) => {
    const isAttended = item.status === 'Checked in' || item.badges?.includes('attended');
    if (!isAttended) return false;
    const q = attendedSearch.toLowerCase().trim();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
  });

  const totalAttendedCount = roster.filter((r) => r.status === 'Checked in' || r.badges?.includes('attended')).length;

  return (
    <div className="w-full space-y-8 pb-24">
      {/* Action Notification Toast */}
      {approvalActionMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in">
          <div className="bg-[#2D1F23] text-white px-4.5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{approvalActionMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setApprovalActionMsg(null)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Attendee Confirmation Toast */}
      {deleteConfirmToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in">
          <div className="bg-[#2D1F23] text-white p-4.5 rounded-3xl shadow-2xl border border-red-500/30 space-y-3 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-red-500/20 text-red-400 rounded-xl shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-white">Remove Attendee from Event?</h4>
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                    Are you sure you want to remove <strong className="text-white">{deleteConfirmToast.name}</strong> ({deleteConfirmToast.email}) from this event?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmToast(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmToast(null)}
                disabled={isDeletingAttendee}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteAttendee(deleteConfirmToast)}
                disabled={isDeletingAttendee}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingAttendee ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingAttendee ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {isDeleteEventModalOpen && event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#2D1F23] text-white p-6 rounded-3xl max-w-md w-full shadow-2xl border border-red-500/30 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-2xl shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-white">Permanently Delete Event?</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-white">"{event.title}"</strong>? This will permanently remove the event, its roster, passes, and all associated reports.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsDeleteEventModalOpen(false)}
                disabled={isDeletingEvent}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEvent}
                disabled={isDeletingEvent}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingEvent ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingEvent ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditEventOpen(true)}
            icon={<Edit className="w-4 h-4 text-[#63474D]" />}
          >
            Edit Form
          </Button>
          <Link to={`/organizer/check-in/${event.id}`}>
            <Button variant="accent" size="sm" icon={<QrCode className="w-4 h-4" />}>
              Door Check-in
            </Button>
          </Link>
          <Link to={`/organizer/reports/${event.id}`}>
            <Button variant="outline" size="sm" icon={<BarChart3 className="w-4 h-4" />}>
              View Report
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteEventModalOpen(true)}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            icon={<Trash2 className="w-4 h-4 text-red-600" />}
          >
            Delete Event
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {awardSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
            <span>{awardSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Event Details Section (Unboxed) */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Poster / Banner Image Container (Fully utilized, edge-to-edge, uncropped fidelity) */}
          {event.posterImageUrl || event.bannerUrl ? (
            <div className="relative w-auto max-w-full md:max-w-md h-44 sm:h-48 bg-[#FAF7F5] border border-gray-200/80 rounded-2xl shrink-0 overflow-hidden shadow-2xs flex items-center justify-center">
              {/* Ambient blurred backdrop so 100% of the box space is visually utilized */}
              <img
                src={event.posterImageUrl || event.bannerUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-35 select-none pointer-events-none"
              />
              {/* Foreground original image: 100% fully shown, no cut, no distortion */}
              <img
                src={event.posterImageUrl || event.bannerUrl}
                alt={event.title}
                className="relative z-10 h-full w-auto max-w-full object-contain rounded-2xl"
              />
            </div>
          ) : (
            <div className="w-44 sm:w-48 h-44 sm:h-48 bg-[#FAF7F5] border border-gray-200/80 rounded-2xl flex items-center justify-center text-gray-400 shrink-0">
              <Image className="w-8 h-8" />
            </div>
          )}

          {/* Core Info */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#63474D]">
                {event.type}
              </span>
              <span className="text-gray-300">•</span>
              <span
                className={`font-semibold uppercase text-[11px] tracking-wider ${timeState === 'ongoing'
                  ? 'text-amber-700 font-bold'
                  : timeState === 'upcoming'
                    ? 'text-emerald-700 font-bold'
                    : 'text-gray-500'
                  }`}
              >
                {timeState === 'ongoing' ? 'Ongoing Today' : timeState === 'upcoming' ? 'Upcoming' : 'Past Event'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="font-bold text-[#2D1F23]">
                {event.isPaid ? `${event.ticketPrice} ETB` : 'FREE ADMISSION'}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D1F23]">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[#756366]">
              <span className="flex items-center gap-1.5">
                <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain shrink-0" />
                {getCalendarTile(event.date).weekday ? `${getCalendarTile(event.date).weekday}, ${getCalendarTile(event.date).fullDate}` : event.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#AA767C]" />
                {event.time || `${event.startTime} - ${event.endTime}`}
              </span>
              <span className="flex items-center gap-1.5">
                <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain shrink-0" />
                {event.location} {event.venueName && `(${event.venueName})`}
              </span>
            </div>

            {/* Turnout Statistics */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Registered</span>
                <span className="font-bold text-lg text-[#2D1F23]">{event.registeredCount || roster.length}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Checked In</span>
                <span className="font-bold text-lg text-[#2A7B5F]">{totalAttendedCount}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Capacity</span>
                <span className="font-bold text-lg text-[#63474D]">{event.capacity}</span>
              </div>
              {event.requiresApproval && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">Pending Review</span>
                  <span className="font-bold text-lg text-amber-700">{pendingCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approval Notice Banner */}
        {event.requiresApproval && pendingCount > 0 && (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  {pendingCount} Attendee Application{pendingCount === 1 ? '' : 's'} Awaiting Organizer Approval
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Review applicant questionnaire responses and approve or decline registrations before issuing entry passes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setApprovalTab('pending');
                  const el = document.getElementById('registered-list-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-colors"
              >
                Review ({pendingCount})
              </button>
              <button
                type="button"
                disabled={isBulkApproving}
                onClick={handleApproveAllPending}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition-colors inline-flex items-center gap-1.5"
                title="Approve all pending applications and issue passes"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isBulkApproving ? 'Approving...' : `Approve All (${pendingCount})`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <h3 className="font-serif font-bold text-sm text-[#2D1F23]">Description</h3>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {/* Public Registration Link (Brought close to the left) */}
        <div className="pt-3 border-t border-gray-100 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[#756366] block">Public Registration Link</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-[#2D1F23] bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl select-all">
              {window.location.origin}/e/{event.shareLinkToken}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#2D1F23] transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <img src="/tick.webp" alt="Copied" className="w-3.5 h-3.5 object-contain shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#AA767C]" />
              )}
              <span>{copiedLink ? 'Copied' : 'link'}</span>
            </button>
            <Link
              to={`/e/${event.shareLinkToken}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#63474D] text-white rounded-xl text-xs font-semibold hover:bg-[#523a3f] transition-colors"
            >
              <span>Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Sheeba Community Discovery Toggle */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#756366] block">
              Sheeba Community Discovery
            </span>
            <p className="text-xs text-[#2D1F23] font-medium">
              {event.isPublicized
                ? 'Publicized in Sheeba Discovery (Attendees can discover and register from community feed)'
                : 'Direct Share Link Only (Private: only people with your direct URL can register)'}
            </p>
          </div>
          <button
            type="button"
            disabled={togglingPublicize}
            onClick={handleTogglePublicize}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${event.isPublicized
              ? 'bg-[#EAF4EF] text-[#2A7B5F] hover:bg-[#d8ece1] border border-[#2A7B5F]/30'
              : 'bg-gray-100 text-[#63474D] hover:bg-gray-200 border border-gray-200'
              }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>
              {togglingPublicize
                ? 'Updating...'
                : event.isPublicized
                  ? 'Publicized in Discovery (Click to make Private)'
                  : 'Publicize in Sheeba'}
            </span>
          </button>
        </div>

        {/* Registration Form Questions Summary & Quick Access */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#756366] block">
              Registration Form Questions
            </span>
            <p className="text-xs text-[#2D1F23] font-medium">
              {event.customQuestions && event.customQuestions.length > 0
                ? `${event.customQuestions.length} custom question${event.customQuestions.length === 1 ? '' : 's'
                } active on the public registration link`
                : 'No custom questions set (Attendees only provide basic info)'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditQuestionsOpen(true)}
            icon={<HelpCircle className="w-3.5 h-3.5 text-[#63474D]" />}
            className="self-start sm:self-auto cursor-pointer"
          >
            Edit Question
          </Button>
        </div>
      </div>

      {/* Section: Attended List (Unboxed) */}
      <div className="space-y-4 pt-8 border-t border-gray-100">
        {/* Attended List Header: Heading, Search Bar in Middle, Badge Action on Right */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="font-serif font-bold text-xl text-[#2D1F23] shrink-0">
            Attended List ({attendedList.length})
          </h2>

          <div className="w-full sm:max-w-md flex-1">
            <input
              type="text"
              placeholder="Search attended by name or email..."
              value={attendedSearch}
              onChange={(e) => setAttendedSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/organizer/badges/${event.id}`}>
              <Button
                variant="outline"
                size="sm"
                icon={<Award className="w-3.5 h-3.5 text-[#63474D]" />}
              >
                Bulk Approve Badges
              </Button>
            </Link>
          </div>
        </div>

        {/* Bulk Action Bar for Attended Badges */}
        {selectedAttendedIds.length > 0 && (
          <div className="p-3.5 bg-[#FAF7F5] border border-[#63474D]/25 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2D1F23]">
              <Award className="w-4 h-4 text-[#FFA686]" />
              <span>{selectedAttendedIds.length} attendee{selectedAttendedIds.length === 1 ? '' : 's'} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#756366] font-semibold">Award Badge:</span>
              <select
                value={bulkBadgeCode}
                onChange={(e) => setBulkBadgeCode(e.target.value as BadgeCode)}
                className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              >
                <option value="participant">Participant</option>
                <option value="winner">Winner</option>
                <option value="speaker">Speaker</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                disabled={isBulkAwarding}
                onClick={handleBulkAwardBadges}
                icon={<Award className="w-3.5 h-3.5 text-[#FFA686]" />}
              >
                {isBulkAwarding ? 'Awarding...' : `Award to Selected (${selectedAttendedIds.length})`}
              </Button>

              <button
                type="button"
                onClick={() => setSelectedAttendedIds([])}
                className="px-2 py-1 text-xs text-gray-500 hover:text-black cursor-pointer font-medium"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {attendedList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {roster.filter((r) => r.status === 'Checked in').length === 0
              ? 'No attendees checked in at the door yet.'
              : 'No attended records match your search filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-2 w-8">
                    <input
                      type="checkbox"
                      checked={attendedList.length > 0 && attendedList.every((att) => selectedAttendedIds.includes(att.attendeeId || att.id))}
                      onChange={handleSelectAllAttended}
                      className="rounded border-gray-300 text-[#63474D] focus:ring-[#63474D] cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  <th className="py-3 px-2">Attendee</th>
                  <th className="py-3 px-2">Check-in Time</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Current Badges</th>
                  <th className="py-3 px-2 text-right">Award Higher Badge</th>
                  <th className="py-3 px-2 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendedList.map((att) => (
                  <tr key={att.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-2">
                      <input
                        type="checkbox"
                        checked={selectedAttendedIds.includes(att.attendeeId || att.id)}
                        onChange={() => handleToggleAttended(att.attendeeId || att.id)}
                        className="rounded border-gray-300 text-[#63474D] focus:ring-[#63474D] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-2">
                      <p className="font-bold text-[#2D1F23]">{att.name}</p>
                      <p className="text-[11px] text-gray-500">{att.email}</p>
                    </td>
                    <td className="py-3.5 px-2 text-gray-600 font-mono text-[11px]">
                      {att.checkInTime || 'Checked in'}
                    </td>
                    <td className="py-3.5 px-2">
                      {/* Unboxed status, NOT clickable on attended list */}
                      <span className="text-[#2A7B5F] font-semibold text-xs">
                        Checked in
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex flex-wrap gap-1.5 text-xs text-gray-700">
                        {att.badges && att.badges.length > 0 ? (
                          att.badges.map((b) => (
                            <span key={b} className="font-medium text-[#63474D]">
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">Attended</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-right" colSpan={2}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAwardingAttendee(att)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#63474D] hover:bg-[#523a3f] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5 text-[#FFA686]" />
                          <span>Award Badge</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmToast(att)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title={`Remove ${att.name} from event`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Thick separating line between Attended List and Registered List, stopping before left & right edges */}
      <div className="px-6 sm:px-12 my-10">
        <div className="h-1 bg-gray-300/90 rounded-full w-full" />
      </div>

      {/* Section: Registered List (Unboxed) */}
      <div id="registered-list-section" className="space-y-4">
        {/* Registered List Header: Heading, Search Bar in Middle, Add User Manually on Right */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif font-bold text-xl text-[#2D1F23] shrink-0">
              Registered List ({registeredList.length})
            </h2>
            {event.requiresApproval && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                Requires Approval
              </span>
            )}
          </div>

          <div className="w-full sm:max-w-md flex-1">
            <input
              type="text"
              placeholder="Search registrants by name or email..."
              value={registeredSearch}
              onChange={(e) => setRegisteredSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          <Button
            onClick={() => {
              setManualUserError(null);
              setIsAddUserModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="shrink-0"
          >
            Add User Manually
          </Button>
        </div>

        {/* Approval Filter Tabs (if event requires approval) */}
        {event.requiresApproval && (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-2">
            {[
              { id: 'all', label: 'All Registrants', count: registeredList.length },
              { id: 'pending', label: 'Pending Review', count: pendingCount, highlight: pendingCount > 0 },
              { id: 'approved', label: 'Approved', count: approvedCount },
              { id: 'rejected', label: 'Declined', count: rejectedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setApprovalTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${approvalTab === tab.id
                  ? 'bg-[#63474D] text-white shadow-2xs'
                  : tab.highlight
                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    : 'bg-[#FAF7F5] text-[#756366] hover:text-[#2D1F23]'
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${approvalTab === tab.id
                    ? 'bg-white/20 text-white'
                    : tab.highlight
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-black/5 text-[#756366]'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Bulk Action Bar for Registrations */}
        {selectedRegistrationIds.length > 0 && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{selectedRegistrationIds.length} application{selectedRegistrationIds.length === 1 ? '' : 's'} selected</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={isBulkApproving || isDeletingAttendee}
                onClick={handleBulkApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                icon={<Check className="w-3.5 h-3.5" />}
              >
                {isBulkApproving ? 'Approving...' : `Approve Selected (${selectedRegistrationIds.length})`}
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={isBulkApproving || isDeletingAttendee}
                onClick={handleBulkDeleteRegistrations}
                className="border-red-200 text-red-600 hover:bg-red-50 bg-white"
                icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
              >
                {isDeletingAttendee ? 'Deleting...' : `Delete Selected (${selectedRegistrationIds.length})`}
              </Button>

              <button
                type="button"
                onClick={() => setSelectedRegistrationIds([])}
                className="px-2 py-1 text-xs text-gray-500 hover:text-black cursor-pointer font-medium"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {displayedRegisteredList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {roster.length === 0
              ? 'No registrations received yet.'
              : approvalTab === 'pending'
                ? 'No pending applications to review.'
                : 'No registrants match your search filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-2 w-8">
                    <input
                      type="checkbox"
                      checked={displayedRegisteredList.length > 0 && displayedRegisteredList.every((att) => selectedRegistrationIds.includes(att.registrationId || att.id))}
                      onChange={handleSelectAllRegistrations}
                      className="rounded border-gray-300 text-[#63474D] focus:ring-[#63474D] cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  <th className="py-3 px-2">Attendee Name & Email</th>
                  <th className="py-3 px-2">Registration Date</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Registration Answers</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedRegisteredList.map((att) => {
                  const isCheckedIn = att.status === 'Checked in' || att.badges?.includes('attended');
                  const isPending = att.approvalStatus === 'pending';
                  const isRejected = att.approvalStatus === 'rejected';

                  return (
                    <tr key={att.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-2">
                        <input
                          type="checkbox"
                          checked={selectedRegistrationIds.includes(att.registrationId || att.id)}
                          onChange={() => handleToggleRegistration(att.registrationId || att.id)}
                          className="rounded border-gray-300 text-[#63474D] focus:ring-[#63474D] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-2">
                        <p className="font-bold text-[#2D1F23]">{att.name}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[11px] text-gray-500">{att.email}</p>
                          {att.notificationStatus === 'failed' && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded"
                              title={att.notificationError || 'Email delivery failed'}
                            >
                              Email failed
                            </span>
                          )}
                          {att.notificationStatus === 'pending' && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                              title="Email delivery in background queue"
                            >
                              Email queued
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-gray-600 font-mono text-[11px]">
                        {att.registrationDate}
                      </td>
                      <td className="py-3.5 px-2">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAnswersAttendee(att)}
                            className="text-left cursor-pointer hover:underline focus:outline-none transition-colors"
                            title="Click to view submitted questionnaire responses"
                          >
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Review
                            </span>
                          </button>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                            <X className="w-3 h-3 text-red-600" />
                            Declined
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedAnswersAttendee(att)}
                            className="text-left cursor-pointer hover:underline focus:outline-none transition-colors"
                            title="Click to view answers to questions"
                          >
                            <span className={`font-semibold ${isCheckedIn ? 'text-[#2A7B5F]' : 'text-[#63474D]'}`}>
                              {isCheckedIn ? 'Checked in' : 'Approved'}
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-2 max-w-xs truncate text-gray-600">
                        {att.answers && Object.keys(att.answers).length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAnswersAttendee(att)}
                            className="text-left text-gray-600 hover:text-[#63474D] hover:underline truncate block max-w-xs cursor-pointer"
                            title="Click to view all answers"
                          >
                            {Object.entries(att.answers)
                              .map(([, a], qIdx) => `Q${qIdx + 1}: ${a}`)
                              .join('; ')}
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAnswersAttendee(att)}
                              className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium cursor-pointer"
                              title="Review submitted answers"
                            >
                              Answers
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveAttendee(att)}
                              disabled={approvingId === (att.registrationId || att.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title="Approve attendee and issue pass"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{approvingId === (att.registrationId || att.id) ? 'Approving...' : 'Approve'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingAttendee(att);
                                setRejectionReason('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer"
                              title="Decline registration"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmToast(att)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title={`Delete registration for ${att.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isRejected ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveAttendee(att)}
                              disabled={approvingId === (att.registrationId || att.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 text-xs font-medium transition-all cursor-pointer"
                              title="Re-approve application"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Re-approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmToast(att)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title={`Remove record`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {isCheckedIn ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Admitted</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAdmitAttendee(att)}
                                disabled={admittingAttendeeId === (att.attendeeId || att.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                title={`Admit ${att.name} to event and mark as attended`}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{admittingAttendeeId === (att.attendeeId || att.id) ? 'Admitting...' : 'Admit'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleResendEmail(att)}
                              disabled={resendingEmailId === (att.registrationId || att.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:text-[#63474D] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                              title={`Resend registration email to ${att.email}`}
                            >
                              <Mail className="w-3.5 h-3.5 text-[#63474D]" />
                              <span>{resendingEmailId === (att.registrationId || att.id) ? 'Sending...' : 'Resend Email'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmToast(att)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title={`Remove ${att.name} from event`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendee Reviews & Feedback Section */}
      <div className="pt-8 border-t border-gray-100">
        <ReviewsSection
          eventId={event.id}
          eventTitle={event.title}
          isOrganizerView={true}
        />
      </div>

      {/* Award Badge Modal (Shared action offering Participant / Winner / Speaker) */}
      {awardingAttendee && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingAward && setAwardingAttendee(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Award Verified Badge
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {awardingAttendee.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {event.title} • Floor status: Attended (Verified)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#2D1F23] block">
                Select Higher-Tier Badge Type:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { code: 'participant' as BadgeCode, label: 'Participant', icon: '🎖️' },
                  { code: 'winner' as BadgeCode, label: 'Winner', icon: '🏆' },
                  { code: 'speaker' as BadgeCode, label: 'Speaker', icon: '🎤' },
                ].map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => setSelectedBadgeCode(b.code)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${selectedBadgeCode === b.code
                      ? 'border-[#63474D] bg-[#63474D]/10 text-[#63474D] font-bold shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <span className="text-xs">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAwardingAttendee(null)}
                disabled={isSubmittingAward}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                onClick={handleAwardBadge}
                isLoading={isSubmittingAward}
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-4 h-4" />}
              >
                Confirm & Issue Badge
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Manual Add Attendee Modal */}
      {isAddUserModalOpen && event && (
        <ManualAddAttendeeModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          event={event}
          onSuccess={(msg) => {
            setAwardSuccessMsg(msg);
            setTimeout(() => setAwardSuccessMsg(null), 5000);
            fetchEventData();
          }}
        />
      )}

      {/* Registration Answers Modal */}
      {selectedAnswersAttendee && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedAnswersAttendee(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Registration Answers
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {selectedAnswersAttendee.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedAnswersAttendee.email} • {selectedAnswersAttendee.status || 'Registered'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnswersAttendee(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {selectedAnswersAttendee.answers && Object.keys(selectedAnswersAttendee.answers).length > 0 ? (
                Object.entries(selectedAnswersAttendee.answers).map(([questionKey, answer], idx) => {
                  const matchedQuestion = event?.customQuestions?.find((q) => q.id === questionKey);
                  const qNum = `Q${idx + 1}`;
                  const questionText = matchedQuestion?.questionText;

                  return (
                    <div key={idx} className="p-3.5 bg-[#FAF7F5] rounded-xl border border-[#E8DDD7] space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs font-bold text-[#63474D] bg-[#63474D]/10 px-1.5 py-0.5 rounded shrink-0">
                          {qNum}
                        </span>
                        {questionText && (
                          <span className="text-xs font-bold text-[#2D1F23] pt-0.5 leading-snug">
                            {questionText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#63474D] font-medium leading-relaxed pl-1">
                        {answer || <span className="italic text-gray-400">No answer provided</span>}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 space-y-1">
                  <p className="font-medium text-gray-600">No Custom Answers</p>
                  <p className="text-[11px] text-gray-400">
                    No custom questionnaire responses were required or provided during registration.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              {selectedAnswersAttendee.approvalStatus === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const att = selectedAnswersAttendee;
                      setSelectedAnswersAttendee(null);
                      handleApproveAttendee(att);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Application</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const att = selectedAnswersAttendee;
                      setSelectedAnswersAttendee(null);
                      setRejectingAttendee(att);
                      setRejectionReason('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              ) : (
                <div />
              )}
              <Button
                onClick={() => setSelectedAnswersAttendee(null)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decline / Rejection Modal */}
      {rejectingAttendee && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingReject && setRejectingAttendee(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-4 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                  Decline Registration
                </span>
                <h3 className="font-serif font-bold text-lg text-[#2D1F23]">
                  Reject Application
                </h3>
                <p className="text-xs text-gray-500">
                  {rejectingAttendee.name} ({rejectingAttendee.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingAttendee(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to decline this registration? An email notification will be sent to the attendee informing them that their application was not approved.
              </p>
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Reason / Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Prerequisites not met, capacity reached, or duplicate entry..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingAttendee(null)}
                disabled={isSubmittingReject}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectAttendee}
                disabled={isSubmittingReject}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmittingReject ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Registration Questions Modal */}
      <EditEventQuestionsModal
        event={event}
        isOpen={isEditQuestionsOpen}
        onClose={() => setIsEditQuestionsOpen(false)}
        onQuestionsUpdated={(updatedQuestions) => {
          if (event) {
            setEvent({ ...event, customQuestions: updatedQuestions });
          }
        }}
      />

      {/* Edit Form (Event Details & Poster) Modal */}
      <EditEventModal
        event={event}
        isOpen={isEditEventOpen}
        onClose={() => setIsEditEventOpen(false)}
        onEventUpdated={(updatedEvent) => {
          setEvent(updatedEvent);
        }}
      />
    </div>
  );
};
