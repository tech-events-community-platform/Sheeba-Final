import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { ScannerStaffItem } from '../../types/event';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  QrCode,
  Plus,
  Trash2,
  Mail,
  UserCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
} from 'lucide-react';

interface EventScannersTabProps {
  eventId: string;
  eventTitle: string;
  initialRequiresScanners?: boolean;
  onScannersToggled?: (enabled: boolean) => void;
}

export const EventScannersTab: React.FC<EventScannersTabProps> = ({
  eventId,
  eventTitle,
  initialRequiresScanners = false,
  onScannersToggled,
}) => {
  const [loading, setLoading] = useState(true);
  const [requiresScanners, setRequiresScanners] = useState<boolean>(initialRequiresScanners);
  const [scanners, setScanners] = useState<ScannerStaffItem[]>([]);

  // Adding new scanners state
  const [newEmails, setNewEmails] = useState<string[]>(['']);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Deactivation confirmation modal state
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Individual action states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadScanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.scanners.getEventScanners(eventId);
      setRequiresScanners(Boolean(data?.requiresScanners));
      setScanners(data?.scanners || []);
    } catch (err) {
      console.error('Failed to load event scanners:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadScanners();
  }, [loadScanners]);

  const handleToggleClick = () => {
    if (requiresScanners && scanners.length > 0) {
      // Disabling with active scanners assigned: show confirmation modal
      setIsDisableModalOpen(true);
    } else {
      // Enabling or disabling with 0 scanners: toggle directly
      executeToggle(!requiresScanners);
    }
  };

  const executeToggle = async (targetState: boolean) => {
    setIsToggling(true);
    setAssignError(null);
    try {
      const res = await api.scanners.toggleScanners(eventId, targetState);
      setRequiresScanners(targetState);
      if (onScannersToggled) onScannersToggled(targetState);
      setIsDisableModalOpen(false);

      if (!targetState) {
        // Disabling: Fresh empty list as per Specification v2.1
        setScanners([]);
        setActionSuccessMsg('Scanner access has been deactivated for all staff members.');
      } else {
        setActionSuccessMsg('Scanner functionality enabled. You can now assign staff members.');
      }
    } catch (err: any) {
      setAssignError(err?.message || 'Failed to update scanner status.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleAddEmailRow = () => {
    setNewEmails((prev) => [...prev, '']);
  };

  const handleUpdateEmail = (index: number, value: string) => {
    setNewEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setAssignError(null);
  };

  const handleRemoveEmailRow = (index: number) => {
    setNewEmails((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
    setAssignError(null);
  };

  const handleAssignScanners = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);
    setActionSuccessMsg(null);

    const clean = newEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (clean.length === 0) {
      setAssignError('Please enter at least one valid scanner email address.');
      return;
    }

    // Duplicate prevention
    const unique = new Set(clean);
    if (unique.size !== clean.length) {
      setAssignError('Duplicate email addresses detected. Please enter unique emails.');
      return;
    }

    const invalid = clean.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalid) {
      setAssignError(`"${invalid}" is not a valid email address.`);
      return;
    }

    setIsAssigning(true);
    try {
      const res = await api.scanners.assignScanners(eventId, clean);
      setActionSuccessMsg(res.message || 'Scanners assigned and invitations dispatched!');
      setNewEmails(['']);
      setRequiresScanners(true);
      await loadScanners();
    } catch (err: any) {
      setAssignError(err?.message || 'Failed to assign scanners.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveScanner = async (scannerUserId: string) => {
    setRemovingId(scannerUserId);
    setAssignError(null);
    try {
      await api.scanners.removeScanner(eventId, scannerUserId);
      setScanners((prev) => prev.filter((s) => s.scannerUserId !== scannerUserId));
      setActionSuccessMsg('Scanner access immediately revoked.');
    } catch (err: any) {
      setAssignError(err?.message || 'Failed to remove scanner.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleResendInvite = async (scannerUserId: string) => {
    setResendingId(scannerUserId);
    setAssignError(null);
    try {
      await api.scanners.resendInvite(eventId, scannerUserId);
      setActionSuccessMsg('Invitation email resent successfully.');
    } catch (err: any) {
      setAssignError(err?.message || 'Failed to resend invitation email.');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header Card with Requirement Toggle */}
      <div className="bg-[#FAF7F5] border border-[#E8DDD7] rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif font-bold text-xl text-[#2D1F23] flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-[#63474D]" />
              Do you need event scanners?
            </h2>
            <p className="text-xs text-[#756366] max-w-xl leading-relaxed">
              Enable this option if you want to assign people to manage QR code scanning and attendee check-in at your event.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 self-start sm:self-center">
            <input
              type="checkbox"
              checked={requiresScanners}
              onChange={handleToggleClick}
              disabled={isToggling}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#63474D]"></div>
          </label>
        </div>

        {/* Status indicator banner */}
        <div className="pt-4 border-t border-[#E8DDD7]/70 flex items-center justify-between text-xs text-[#756366]">
          <span>
            Status:{' '}
            <strong className={requiresScanners ? 'text-emerald-700' : 'text-gray-500'}>
              {requiresScanners ? 'Active (Scanners Allowed)' : 'Disabled (Only Organizer Can Scan)'}
            </strong>
          </span>
          {requiresScanners && (
            <span className="font-bold text-[#63474D]">
              {scanners.length} assigned gatekeeper{scanners.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {/* Success & Error notices */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1 font-semibold">{actionSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {assignError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-2.5 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="flex-1">{assignError}</span>
          <button
            type="button"
            onClick={() => setAssignError(null)}
            className="text-red-500 hover:text-red-800 cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Body Section: Visible only when toggle is ON */}
      {requiresScanners ? (
        <div className="space-y-8 animate-fade-in">
          {/* Section: Assign New Scanners */}
          <div className="bg-white border border-[#E8DDD7] rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#63474D]" />
                  Assign Gate Scanners
                </h3>
                <p className="text-xs text-[#756366] mt-0.5">
                  Enter email addresses of volunteers or staff. New users will receive login credentials; existing users will receive a direct invitation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddEmailRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DDD7] text-xs font-bold text-[#63474D] hover:bg-[#FAF7F5] transition cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another
              </button>
            </div>

            <form onSubmit={handleAssignScanners} className="space-y-3 pt-2">
              <div className="space-y-2.5 max-w-xl">
                {newEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="w-3.5 h-3.5 text-[#AA767C] absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleUpdateEmail(idx, e.target.value)}
                        placeholder={`scanner${idx + 1}@example.com`}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-[#2D1F23] focus:outline-none focus:border-[#63474D] focus:bg-white transition"
                      />
                    </div>
                    {newEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmailRow(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition cursor-pointer"
                        title="Remove email field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isAssigning}
                  className="bg-[#63474D] text-white hover:bg-[#523A3F] text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-2"
                >
                  {isAssigning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Dispatching Invitations...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Save & Send Invitations
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Section: Currently Assigned Scanners Table */}
          <div className="bg-white border border-[#E8DDD7] rounded-3xl overflow-hidden space-y-4 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#63474D]" />
                  Active Scanners ({scanners.length})
                </h3>
                <p className="text-xs text-[#756366] mt-0.5">
                  Staff members authorized to scan attendee passes at the door.
                </p>
              </div>

              <button
                type="button"
                onClick={loadScanners}
                disabled={loading}
                className="p-2 text-[#756366] hover:text-[#2D1F23] rounded-xl hover:bg-[#FAF7F5] transition cursor-pointer"
                title="Refresh scanner list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {scanners.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF7F5] rounded-2xl border border-dashed border-[#E8DDD7] space-y-2">
                <QrCode className="w-8 h-8 text-[#AA767C] mx-auto opacity-70" />
                <p className="text-xs font-bold text-[#2D1F23]">No scanners assigned yet</p>
                <p className="text-[11px] text-[#756366] max-w-sm mx-auto">
                  Add staff email addresses above to delegate door scanning and check-in for this event.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F5] text-[#756366] font-semibold border-b border-[#E8DDD7]">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Scanner Staff</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Attendees Scanned</th>
                      <th className="py-3 px-4">Assigned On</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DDD7]/60">
                    {scanners.map((staff) => (
                      <tr key={staff.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#63474D] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {staff.avatarUrl ? (
                                <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
                              ) : (
                                staff.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#2D1F23] truncate">{staff.name}</p>
                              <p className="text-[11px] text-[#756366] truncate">{staff.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#2D1F23]">
                          {staff.scannedCount} attendee{staff.scannedCount === 1 ? '' : 's'}
                        </td>
                        <td className="py-3.5 px-4 text-[#756366]">
                          {new Date(staff.assignedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleResendInvite(staff.scannerUserId)}
                              disabled={resendingId === staff.scannerUserId}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#63474D] hover:bg-[#FAF7F5] border border-[#E8DDD7] rounded-lg transition cursor-pointer"
                              title="Resend invitation email"
                            >
                              {resendingId === staff.scannerUserId ? 'Resending...' : 'Resend Invite'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveScanner(staff.scannerUserId)}
                              disabled={removingId === staff.scannerUserId}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              title="Revoke scanner access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      ) : (
        <div className="p-8 text-center bg-[#FAF7F5] rounded-3xl border border-[#E8DDD7] space-y-3">
          <QrCode className="w-10 h-10 text-[#AA767C] mx-auto opacity-70" />
          <h3 className="font-serif font-bold text-base text-[#2D1F23]">Event Scanners are Currently Disabled</h3>
          <p className="text-xs text-[#756366] max-w-md mx-auto leading-relaxed">
            Only you (the event organizer) can verify attendee passes. Turn on the toggle above whenever you want to delegate gate check-ins to volunteers or staff members.
          </p>
        </div>
      )}

      {/* Confirmation Modal on Disabling Toggle (Confirmed Specification v2.1 Rule) */}
      <Modal
        isOpen={isDisableModalOpen}
        onClose={() => !isToggling && setIsDisableModalOpen(false)}
        title="Disable Scanner Functionality?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-bold">Important Security & Access Notice:</p>
              <p>
                Disabling scanners will <strong>immediately revoke gate scanning access</strong> for all {scanners.length} assigned staff members.
              </p>
              <p>
                If you enable scanners again later, you will start with a <strong>fresh, clean list</strong> and must re-assign staff members explicitly.
              </p>
              <p className="text-amber-800/80 pt-1">
                Existing attendee registrations and attendance check-in records will <strong>NOT</strong> be affected.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDisableModalOpen(false)}
              disabled={isToggling}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => executeToggle(false)}
              disabled={isToggling}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-xl"
            >
              {isToggling ? 'Deactivating...' : 'Confirm & Disable Scanners'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

