import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type {
  IExhibitorCall,
  IEventVendor,
  IExhibitorCallUpsertPayload,
  IManualVendorPayload,
  VendorSource,
  ExhibitorPricingMode,
  IExhibitorPaymentConfig,
  IBoothReceipt,
} from '../../types/exhibitor';
import type { RegistrationQuestion, PaymentDestination } from '../../types/event';
import { EditExhibitorQuestionsModal } from './EditExhibitorQuestionsModal';
import { Button } from '../ui/Button';
import {
  Store,
  Plus,
  Search,
  Check,
  X,
  AlertCircle,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Building,
  User,
  Phone,
  Mail,
  Eye,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  HelpCircle,
  Wallet,
  ShieldCheck,
  File,
} from 'lucide-react';

interface EventExhibitorsTabProps {
  eventId: string;
  eventTitle: string;
}

export const EventExhibitorsTab: React.FC<EventExhibitorsTabProps> = ({ eventId, eventTitle }) => {
  const [loading, setLoading] = useState(true);
  const [call, setCall] = useState<(IExhibitorCall & { stats?: { confirmedCount: number; totalSpaceAllocated: number; totalSpaceRemaining: number } }) | null>(null);
  const [vendors, setVendors] = useState<IEventVendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Call Settings Form State
  const [isEnabled, setIsEnabled] = useState(false);
  const [callStatus, setCallStatus] = useState<'draft' | 'open' | 'closed'>('draft');
  const [pricingMode, setPricingMode] = useState<ExhibitorPricingMode>('per_sqm');
  const [totalSpaceSqm, setTotalSpaceSqm] = useState<number>(0);
  const [pricePerSqm, setPricePerSqm] = useState<number>(0);
  const [fixedFee, setFixedFee] = useState<number>(0);
  const [sheebaCutPercent] = useState<number>(30); // 30% tentative default
  const [maxExhibitors, setMaxExhibitors] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [hasBoothNumbers, setHasBoothNumbers] = useState(true);
  const [hasVendorCheckin, setHasVendorCheckin] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<RegistrationQuestion[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<IExhibitorPaymentConfig>({
    allowChapa: true,
    allowManual: false,
    instructions: '',
    destinations: [],
  });
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [isTogglingEnable, setIsTogglingEnable] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);

  // Manual Vendor Modal
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [vendorModalError, setVendorModalError] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState<IManualVendorPayload>({
    businessName: '',
    category: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    showcaseDescription: '',
    specialRequirements: '',
    spaceSqm: 1,
    boothNumber: '',
    source: 'manual',
    logoUrl: '',
    websiteUrl: '',
  });

  // Edit Vendor State
  const [editingVendor, setEditingVendor] = useState<IEventVendor | null>(null);
  const [isUpdatingVendor, setIsUpdatingVendor] = useState(false);

  // Delete Vendor State
  const [deletingVendor, setDeletingVendor] = useState<IEventVendor | null>(null);
  const [isDeletingVendor, setIsDeletingVendor] = useState(false);

  // Review Application Modal State
  const [reviewingVendor, setReviewingVendor] = useState<IEventVendor | null>(null);

  // Accept / Reject Application Decision State
  const [acceptingVendorId, setAcceptingVendorId] = useState<string | null>(null);
  const [confirmingVendor, setConfirmingVendor] = useState<IEventVendor | null>(null);
  const [rejectingVendor, setRejectingVendor] = useState<IEventVendor | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Organizer Receipt Review Modal State
  const [reviewingReceiptVendor, setReviewingReceiptVendor] = useState<IEventVendor | null>(null);
  const [vendorReceipts, setVendorReceipts] = useState<IBoothReceipt[]>([]);
  const [isLoadingVendorReceipts, setIsLoadingVendorReceipts] = useState(false);
  const [receiptFeedback, setReceiptFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Verification state
  const [confirmedCleared, setConfirmedCleared] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false);

  // Rejection state
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [receiptRejectionReason, setReceiptRejectionReason] = useState('');
  const [isRejectingReceipt, setIsRejectingReceipt] = useState(false);

  // Success Notification
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [callData, vendorsData] = await Promise.all([
        api.exhibitors.getCall(eventId),
        api.exhibitors.getVendors(eventId),
      ]);

      setCall(callData);
      const isCallEnabled = Boolean(callData.isEnabled ?? (callData as any).is_enabled);
      setIsEnabled(isCallEnabled);
      setCallStatus(callData.status || 'draft');
      setPricingMode(callData.pricingMode || (callData as any).pricing_mode || 'per_sqm');
      setTotalSpaceSqm(Number(callData.totalSpaceSqm ?? (callData as any).total_space_sqm) || 0);
      setPricePerSqm(Number(callData.pricePerSqm ?? (callData as any).price_per_sqm) || 0);
      setFixedFee(Number(callData.fixedFee ?? (callData as any).fixed_fee) || 0);
      setMaxExhibitors(Number(callData.maxExhibitors ?? (callData as any).max_exhibitors) || 10);
      setDescription(callData.description || '');
      setSpecifications(callData.specifications || '');
      const rawDeadline = callData.applicationDeadline || (callData as any).application_deadline;
      setApplicationDeadline(
        rawDeadline
          ? new Date(rawDeadline).toISOString().split('T')[0]
          : ''
      );
      setHasBoothNumbers(Boolean(callData.hasBoothNumbers ?? (callData as any).has_booth_numbers ?? true));
      setHasVendorCheckin(Boolean(callData.hasVendorCheckin ?? (callData as any).has_vendor_checkin ?? false));
      setCustomQuestions(callData.customQuestions || (callData as any).custom_questions || []);
      setPaymentConfig(
        callData.paymentConfig || (callData as any).payment_config || {
          allowChapa: true,
          allowManual: false,
          instructions: '',
          destinations: [],
        }
      );

      setVendors(vendorsData.vendors || []);
    } catch (err: any) {
      console.error('Failed to load exhibitor settings:', err);
      showNotification('error', err.message || 'Failed to load exhibitor information.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle Exhibitors Enablement
  const handleToggleEnable = async (enableState: boolean) => {
    setIsTogglingEnable(true);
    try {
      await api.exhibitors.saveCall(eventId, {
        isEnabled: enableState,
        status: callStatus,
        pricingMode,
        totalSpaceSqm: Number(totalSpaceSqm) || 0,
        pricePerSqm: Number(pricePerSqm) || 0,
        fixedFee: Number(fixedFee) || 0,
        maxExhibitors: Number(maxExhibitors) || 10,
        description: description.trim() || undefined,
        specifications: specifications.trim() || undefined,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : undefined,
        hasBoothNumbers,
        hasVendorCheckin,
        customQuestions,
        paymentConfig,
      });
      await fetchData();
      showNotification('success', enableState ? 'Exhibitors turned ON for this event.' : 'Exhibitors turned OFF for this event.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update exhibitor status.');
    } finally {
      setIsTogglingEnable(false);
    }
  };

  // Save Call Settings
  const handleSaveCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCall(true);
    try {
      const payload: IExhibitorCallUpsertPayload = {
        isEnabled: true,
        status: callStatus,
        pricingMode,
        totalSpaceSqm: Number(totalSpaceSqm) || 0,
        pricePerSqm: Number(pricePerSqm) || 0,
        fixedFee: Number(fixedFee) || 0,
        maxExhibitors: Number(maxExhibitors) || 10,
        description: description.trim() || undefined,
        specifications: specifications.trim() || undefined,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : undefined,
        hasBoothNumbers,
        hasVendorCheckin,
        customQuestions,
        paymentConfig,
      };

      await api.exhibitors.saveCall(eventId, payload);
      showNotification('success', 'Exhibitor call specifications saved successfully!');
      setIsSettingsOpen(false);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save exhibitor call settings.');
    } finally {
      setIsSavingCall(false);
    }
  };

  // Destination management helpers for paymentConfig
  const handleAddDestination = () => {
    const newDest: PaymentDestination = {
      provider: 'telebirr',
      accountNumber: '',
      accountHolder: '',
      label: 'Main Receiving Account',
    };
    setPaymentConfig((prev) => ({
      ...prev,
      destinations: [...(prev.destinations || []), newDest],
    }));
  };

  const handleRemoveDestination = (idx: number) => {
    setPaymentConfig((prev) => ({
      ...prev,
      destinations: (prev.destinations || []).filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateDestination = (idx: number, field: keyof PaymentDestination, val: string) => {
    setPaymentConfig((prev) => {
      const list = [...(prev.destinations || [])];
      list[idx] = { ...list[idx], [field]: val };
      return { ...prev, destinations: list };
    });
  };

  // Add Manual Vendor
  const handleAddManualVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorModalError(null);
    setIsSubmittingVendor(true);
    try {
      await api.exhibitors.addManualVendor(eventId, manualForm);
      showNotification('success', `Added "${manualForm.businessName}" to event vendors!`);
      setIsAddVendorModalOpen(false);
      setManualForm({
        businessName: '',
        category: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        showcaseDescription: '',
        specialRequirements: '',
        spaceSqm: 1,
        boothNumber: '',
        source: 'manual',
        logoUrl: '',
        websiteUrl: '',
      });
      fetchData();
    } catch (err: any) {
      setVendorModalError(err.message || 'Failed to add vendor.');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  // Update Vendor
  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;
    setIsUpdatingVendor(true);
    try {
      await api.exhibitors.updateVendor(eventId, editingVendor.id, {
        businessName: editingVendor.businessName,
        category: editingVendor.category || undefined,
        contactName: editingVendor.contactName,
        contactEmail: editingVendor.contactEmail,
        contactPhone: editingVendor.contactPhone || undefined,
        showcaseDescription: editingVendor.showcaseDescription || undefined,
        specialRequirements: editingVendor.specialRequirements || undefined,
        spaceSqm: editingVendor.spaceSqm,
        boothNumber: editingVendor.boothNumber || undefined,
        status: editingVendor.status,
      });
      showNotification('success', `Vendor "${editingVendor.businessName}" updated successfully.`);
      setEditingVendor(null);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update vendor.');
    } finally {
      setIsUpdatingVendor(false);
    }
  };

  // Accept Application (transitions pending -> accepted_awaiting_payment or confirmed for free applications)
  const handleAcceptVendor = async (vendor: IEventVendor) => {
    if (acceptingVendorId || isSubmittingDecision) return;
    setAcceptingVendorId(vendor.id);
    const isFree = (vendor.totalFinalAmount || 0) <= 0;
    try {
      const updated = await api.exhibitors.updateVendor(eventId, vendor.id, {
        status: isFree ? 'confirmed' : 'accepted_awaiting_payment',
      });
      await fetchData();
      showNotification(
        'success',
        isFree
          ? `Application for "${vendor.businessName}" approved! Booth confirmed (free application).`
          : `Application for "${vendor.businessName}" approved! Status moved to "Accepted — Awaiting Payment" and space reserved.`
      );
      if (reviewingVendor && reviewingVendor.id === vendor.id) {
        setReviewingVendor(updated);
      }
      setConfirmingVendor(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to accept application.');
    } finally {
      setAcceptingVendorId(null);
    }
  };

  // Reject Application (transitions pending -> rejected)
  const handleRejectVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingVendor || isSubmittingDecision) return;
    setIsSubmittingDecision(true);
    try {
      const updated = await api.exhibitors.updateVendor(eventId, rejectingVendor.id, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim() || undefined,
      });
      showNotification('success', `Application for "${rejectingVendor.businessName}" rejected.`);
      if (reviewingVendor && reviewingVendor.id === rejectingVendor.id) {
        setReviewingVendor(updated);
      }
      setRejectingVendor(null);
      setRejectionReason('');
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reject application.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Delete Vendor
  const handleDeleteVendor = async () => {
    if (!deletingVendor) return;
    setIsDeletingVendor(true);
    try {
      await api.exhibitors.deleteVendor(eventId, deletingVendor.id);
      showNotification('success', `Removed "${deletingVendor.businessName}" from vendors.`);
      setDeletingVendor(null);
      fetchData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to remove vendor.');
    } finally {
      setIsDeletingVendor(false);
    }
  };

  // Open Receipt Review Modal
  const handleOpenReceiptReview = async (vendor: IEventVendor) => {
    setReviewingReceiptVendor(vendor);
    setConfirmedCleared(false);
    setVerifyNotes('');
    setIsRejectMode(false);
    setReceiptRejectionReason('');
    setReceiptFeedback(null);
    setIsLoadingVendorReceipts(true);
    try {
      const history = await api.exhibitors.getVendorReceipts(eventId, vendor.id);
      setVendorReceipts(history);
    } catch (err: any) {
      setVendorReceipts([]);
      setReceiptFeedback({ type: 'error', text: err.message || 'Failed to load receipt history.' });
    } finally {
      setIsLoadingVendorReceipts(false);
    }
  };

  // Verify Receipt
  const handleVerifyReceipt = async (paymentId?: string) => {
    if (!reviewingReceiptVendor) return;
    if (!confirmedCleared) {
      setReceiptFeedback({
        type: 'error',
        text: 'You must explicitly confirm that you independently verified funds cleared in your account.',
      });
      return;
    }

    setIsVerifyingReceipt(true);
    setReceiptFeedback(null);
    try {
      await api.exhibitors.verifyBoothReceipt(eventId, reviewingReceiptVendor.id, {
        confirmedCleared: true,
        paymentId,
        notes: verifyNotes.trim() || undefined,
      });

      setReceiptFeedback({
        type: 'success',
        text: 'Receipt successfully verified! Payment recorded as SETTLED and booth confirmed.',
      });
      showNotification('success', `Payment verified and booth confirmed for "${reviewingReceiptVendor.businessName}".`);

      const updatedHistory = await api.exhibitors.getVendorReceipts(eventId, reviewingReceiptVendor.id);
      setVendorReceipts(updatedHistory);
      fetchData();
    } catch (err: any) {
      setReceiptFeedback({
        type: 'error',
        text: err.message || 'Failed to verify receipt.',
      });
    } finally {
      setIsVerifyingReceipt(false);
    }
  };

  // Reject Receipt
  const handleRejectReceipt = async (paymentId?: string) => {
    if (!reviewingReceiptVendor) return;
    if (!receiptRejectionReason.trim() || receiptRejectionReason.trim().length < 3) {
      setReceiptFeedback({
        type: 'error',
        text: 'A rejection reason of at least 3 characters is required.',
      });
      return;
    }

    setIsRejectingReceipt(true);
    setReceiptFeedback(null);
    try {
      await api.exhibitors.rejectBoothReceipt(eventId, reviewingReceiptVendor.id, {
        rejectionReason: receiptRejectionReason.trim(),
        paymentId,
      });

      setReceiptFeedback({
        type: 'success',
        text: 'Receipt rejected. Payment marked as FAILED. The applicant may now resubmit a corrected receipt.',
      });
      showNotification('success', `Receipt rejected for "${reviewingReceiptVendor.businessName}".`);
      setIsRejectMode(false);
      setReceiptRejectionReason('');

      const updatedHistory = await api.exhibitors.getVendorReceipts(eventId, reviewingReceiptVendor.id);
      setVendorReceipts(updatedHistory);
      fetchData();
    } catch (err: any) {
      setReceiptFeedback({
        type: 'error',
        text: err.message || 'Failed to reject receipt.',
      });
    } finally {
      setIsRejectingReceipt(false);
    }
  };

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    const q = vendorSearch.toLowerCase().trim();
    const bName = (v.businessName || (v as any).business_name || '').toLowerCase();
    const cName = (v.contactName || (v as any).contact_name || '').toLowerCase();
    const cEmail = (v.contactEmail || (v as any).contact_email || '').toLowerCase();
    const booth = (v.boothNumber || (v as any).booth_number || '').toLowerCase();

    const matchesSearch =
      !q ||
      bName.includes(q) ||
      cName.includes(q) ||
      cEmail.includes(q) ||
      booth.includes(q);

    const matchesSource = sourceFilter === 'all' || v.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  // Calculate pricing breakdown
  const cutAmountPerSqm = (pricePerSqm * (sheebaCutPercent / 100));
  const finalPricePerSqm = pricePerSqm + cutAmountPerSqm;
  const cutAmountFixed = (fixedFee * (sheebaCutPercent / 100));
  const finalFixedFee = fixedFee + cutAmountFixed;

  // Space stats
  const allocatedSpace = call?.stats?.totalSpaceAllocated || 0;
  const remainingSpace = Math.max(0, totalSpaceSqm - allocatedSpace);
  const spaceUtilPercent = totalSpaceSqm > 0 ? Math.min(100, Math.round((allocatedSpace / totalSpaceSqm) * 100)) : 0;

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-7 h-7 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400 font-medium">Loading exhibitor management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-fade-in">
          <div
            className={`text-white px-4.5 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 ${
              feedbackMsg.type === 'success' ? 'bg-[#2D1F23] border border-emerald-500/40' : 'bg-red-900 border border-red-500/40'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
              {feedbackMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner: Enable / Disable Toggle & Overview */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 ${isEnabled ? 'bg-[#63474D]/10 text-[#63474D]' : 'bg-gray-100 text-gray-400'}`}>
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-[#2D1F23]">Event Exhibitors & Booths</h3>
                {isEnabled && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      callStatus === 'open'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : callStatus === 'closed'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    Call {callStatus.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                Offer physical booth space to vendors and businesses. Review applications, collect payments via Sheeba, and showcase confirmed vendors on your public event page.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-semibold text-[#2D1F23]">
              {isEnabled ? 'Exhibitors Enabled' : 'Exhibitors Disabled'}
            </span>
            <button
              type="button"
              disabled={isTogglingEnable}
              onClick={() => handleToggleEnable(!isEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isTogglingEnable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isEnabled ? 'bg-emerald-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* If Exhibitors Disabled: Friendly Guidance */}
        {!isEnabled && (
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-500 bg-[#FAF7F5] p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#63474D] shrink-0" />
              <span>
                Exhibitors are currently turned off. No exhibitor call is published, and nothing exhibitor-related appears on your public registration page.
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={isTogglingEnable}
              isLoading={isTogglingEnable}
              onClick={() => handleToggleEnable(true)}
              icon={<Store className="w-3.5 h-3.5" />}
              className="shrink-0"
            >
              Turn On Exhibitors
            </Button>
          </div>
        )}
      </div>

      {/* Main Exhibitors Workspace (Only when enabled) */}
      {isEnabled && (
        <>
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="bg-white border border-[#E8DDD7] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Booth Space</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-bold text-2xl text-[#2D1F23]">{totalSpaceSqm}</span>
                <span className="text-xs text-gray-500 font-semibold">m²</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-[#63474D] h-full transition-all" style={{ width: `${spaceUtilPercent}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-medium pt-1">
                <span>{allocatedSpace} m² taken</span>
                <span>{remainingSpace} m² free</span>
              </div>
            </div>

            <div className="bg-white border border-[#E8DDD7] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Confirmed Vendors</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-bold text-2xl text-emerald-700">
                  {vendors.filter((v) => v.status === 'confirmed').length}
                </span>
                <span className="text-xs text-gray-400 font-medium">/ {maxExhibitors} max</span>
              </div>
              <p className="text-[10px] text-gray-400 pt-1">Shown publicly on event page</p>
            </div>

            <div className="bg-white border border-[#E8DDD7] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Review</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-bold text-2xl text-amber-700">
                  {vendors.filter((v) => v.status === 'pending').length}
                </span>
                <span className="text-xs text-gray-400 font-medium">applications</span>
              </div>
              <p className="text-[10px] text-gray-400 pt-1">Awaiting organizer approval</p>
            </div>

            <div className="bg-white border border-[#E8DDD7] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {pricingMode === 'fixed' ? 'Organizer Fixed Fee' : 'Base Price per m²'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-bold text-2xl text-[#2D1F23]">
                  {pricingMode === 'fixed' ? fixedFee.toLocaleString() : pricePerSqm.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 font-semibold">ETB</span>
              </div>
              <p className="text-[10px] text-gray-400 pt-1">
                {pricingMode === 'fixed'
                  ? `Exhibitors pay ${Math.round(finalFixedFee).toLocaleString()} ETB (+30% cut)`
                  : `Exhibitors pay ${Math.round(finalPricePerSqm).toLocaleString()} ETB (+30% cut)`}
              </p>
            </div>
          </div>

          {/* Call Specifications & Configuration (Accordion / Collapsible Card) */}
          <div className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h4 className="font-serif font-bold text-base text-[#2D1F23]">Exhibitor Call Configuration</h4>
                <p className="text-xs text-gray-500">
                  Define your booth space parameters, pricing, and guidelines for exhibitors.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  {isSettingsOpen ? 'Hide Form' : 'Edit Specifications'}
                </Button>
              </div>
            </div>

            {/* Quick summary view when form is collapsed */}
            {!isSettingsOpen ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 bg-[#FAF7F5] rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Call Status</span>
                  <p className="font-bold text-[#2D1F23] capitalize flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        callStatus === 'open' ? 'bg-emerald-500' : callStatus === 'closed' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                    {callStatus} ({callStatus === 'open' ? 'Visible to exhibitors' : 'Hidden from explore marketplace'})
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF7F5] rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Pricing Model</span>
                  <p className="font-bold text-[#2D1F23]">
                    {pricingMode === 'fixed'
                      ? `Fixed Fee: ${fixedFee.toLocaleString()} ETB`
                      : `Per m²: ${pricePerSqm.toLocaleString()} ETB/m²`}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF7F5] rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Application Deadline</span>
                  <p className="font-bold text-[#2D1F23]">
                    {applicationDeadline ? new Date(applicationDeadline).toLocaleDateString() : 'No deadline set'}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF7F5] rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Questions Configured</span>
                  <p className="font-bold text-[#2D1F23] flex items-center justify-between">
                    <span>{customQuestions.length} Questions</span>
                    <button
                      type="button"
                      onClick={() => setIsQuestionsModalOpen(true)}
                      className="text-[11px] text-[#63474D] underline font-semibold hover:text-[#2D1F23] cursor-pointer"
                    >
                      View
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              /* Edit Call Settings Form */
              <form onSubmit={handleSaveCall} className="space-y-6 animate-fade-in pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Call Status *
                    </label>
                    <select
                      value={callStatus}
                      onChange={(e) => setCallStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs font-semibold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    >
                      <option value="draft">Draft (Hidden from exhibitors)</option>
                      <option value="open">Open (Publicly open to applications)</option>
                      <option value="closed">Closed (No new applications accepted)</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">Only "Open" calls appear in the exhibitor marketplace.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Total Space Available (m²) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      required
                      value={totalSpaceSqm}
                      onChange={(e) => setTotalSpaceSqm(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Floor area in square meters for all booths.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Pricing Mode *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPricingMode('per_sqm')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pricingMode === 'per_sqm'
                            ? 'bg-[#63474D] text-white shadow-xs'
                            : 'text-gray-600 hover:text-[#2D1F23]'
                        }`}
                      >
                        Per m²
                      </button>
                      <button
                        type="button"
                        onClick={() => setPricingMode('fixed')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pricingMode === 'fixed'
                            ? 'bg-[#63474D] text-white shadow-xs'
                            : 'text-gray-600 hover:text-[#2D1F23]'
                        }`}
                      >
                        Fixed Fee
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {pricingMode === 'per_sqm' ? 'Rate scales with requested m²' : 'Flat rate for any booth'}
                    </p>
                  </div>
                </div>

                {/* Pricing Fields - Only display the relevant field based on pricingMode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pricingMode === 'per_sqm' ? (
                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Organizer Price per m² (ETB) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="10"
                        required
                        value={pricePerSqm}
                        onChange={(e) => setPricePerSqm(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Base rate you receive per m² before platform fee.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Organizer Flat Exhibitor Fee (ETB) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="100"
                        required
                        value={fixedFee}
                        onChange={(e) => setFixedFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Flat base rate you receive per booth booking.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Maximum Exhibitors Wanted
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={maxExhibitors}
                      onChange={(e) => setMaxExhibitors(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Cap on total accepted and confirmed exhibitors.</p>
                  </div>
                </div>

                {/* Adaptive Pricing & Platform Cut Breakdown Helper Card */}
                {pricingMode === 'per_sqm' ? (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <DollarSign className="w-4 h-4 text-emerald-700" />
                      <span>Per-m² Pricing Breakdown (with Sheeba 30% Platform Cut)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-emerald-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Organizer Receives</span>
                        <strong className="text-sm">{pricePerSqm.toLocaleString()} ETB</strong> / m²
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Sheeba Cut (+30%)</span>
                        <strong className="text-sm">{Math.round(cutAmountPerSqm).toLocaleString()} ETB</strong> / m²
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Exhibitor Pays (Final)</span>
                        <strong className="text-sm text-emerald-950 font-serif">{Math.round(finalPricePerSqm).toLocaleString()} ETB</strong> / m²
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <DollarSign className="w-4 h-4 text-emerald-700" />
                      <span>Fixed Fee Pricing Breakdown (with Sheeba 30% Platform Cut)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-emerald-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Organizer Receives</span>
                        <strong className="text-sm">{fixedFee.toLocaleString()} ETB</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Sheeba Cut (+30%)</span>
                        <strong className="text-sm">{Math.round(cutAmountFixed).toLocaleString()} ETB</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Exhibitor Pays (Final)</span>
                        <strong className="text-sm text-emerald-950 font-serif">{Math.round(finalFixedFee).toLocaleString()} ETB</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Application Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={applicationDeadline}
                      onChange={(e) => setApplicationDeadline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold text-[#2D1F23] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasBoothNumbers}
                          onChange={(e) => setHasBoothNumbers(e.target.checked)}
                          className="w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D]"
                        />
                        <span>Enable Booth Numbering</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-[#2D1F23] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasVendorCheckin}
                          onChange={(e) => setHasVendorCheckin(e.target.checked)}
                          className="w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D]"
                        />
                        <span>Enable Vendor Check-in</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Space & Venue Layout Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Ground floor main hall perimeter, high foot-traffic zone right next to the registration area..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Exhibitor Specifications & Guidelines
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 220V power outlet provided per booth. Tech and education companies preferred. Set-up begins 2 hours before kickoff."
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                  />
                </div>

                {/* Section: Application Questionnaire Quick Summary & Trigger */}
                <div className="p-4 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#2D1F23]">
                        <HelpCircle className="w-4 h-4 text-[#63474D]" />
                        <span>Exhibitor Application Questionnaire</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Includes standard default questions (Showcase Description, Power Requirements, Retail Sales Intent) and custom questions.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsQuestionsModalOpen(true)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Configure Questions ({customQuestions.length})
                    </Button>
                  </div>

                  {customQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200/60">
                      {customQuestions.map((q, idx) => (
                        <span
                          key={q.id || idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E8DDD7] rounded-lg text-[11px] text-[#2D1F23] font-medium"
                        >
                          <span className="font-bold text-[#63474D]">{idx + 1}.</span>
                          <span className="max-w-[200px] truncate">{q.questionText}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-semibold">
                            {q.type}
                          </span>
                          {q.isRequired && (
                            <span className="text-[9px] text-red-500 font-bold">*</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Payment Configuration & Settlement Accounts */}
                <div className="p-4 bg-white border border-[#E8DDD7] rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2D1F23]">
                    <Wallet className="w-4 h-4 text-[#63474D]" />
                    <span>Exhibitor Payment Methods & Bank Settlement Accounts</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#2D1F23] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentConfig.allowChapa ?? true}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({ ...prev, allowChapa: e.target.checked }))
                        }
                        className="w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D]"
                      />
                      <span>Enable Chapa Online Checkout</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-[#2D1F23] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentConfig.allowManual ?? false}
                        onChange={(e) =>
                          setPaymentConfig((prev) => ({ ...prev, allowManual: e.target.checked }))
                        }
                        className="w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D]"
                      />
                      <span>Allow Offline / Manual Payment (Direct Bank Transfer)</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Payment Instructions for Exhibitors (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Please transfer the total amount within 3 business days of application approval and send reference slip."
                      value={paymentConfig.instructions || ''}
                      onChange={(e) =>
                        setPaymentConfig((prev) => ({ ...prev, instructions: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                    />
                  </div>

                  {/* Payment Destinations list */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[#2D1F23]">
                        Receiving Bank & Mobile Money Accounts
                      </label>
                      <button
                        type="button"
                        onClick={handleAddDestination}
                        className="text-xs text-[#63474D] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Account</span>
                      </button>
                    </div>

                    {(paymentConfig.destinations || []).length === 0 ? (
                      <p className="text-[11px] text-gray-400">
                        No direct receiving bank accounts added.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(paymentConfig.destinations || []).map((dest, dIdx) => (
                          <div
                            key={dIdx}
                            className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs"
                          >
                            <input
                              type="text"
                              placeholder="Provider (e.g. telebirr, CBE)"
                              value={dest.provider}
                              onChange={(e) =>
                                handleUpdateDestination(dIdx, 'provider', e.target.value)
                              }
                              className="px-2.5 py-1.5 bg-white border border-[#E8DDD7] rounded-lg text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Account / Phone Number"
                              value={dest.accountNumber}
                              onChange={(e) =>
                                handleUpdateDestination(dIdx, 'accountNumber', e.target.value)
                              }
                              className="px-2.5 py-1.5 bg-white border border-[#E8DDD7] rounded-lg text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Account Holder Name"
                              value={dest.accountHolder || ''}
                              onChange={(e) =>
                                handleUpdateDestination(dIdx, 'accountHolder', e.target.value)
                              }
                              className="px-2.5 py-1.5 bg-white border border-[#E8DDD7] rounded-lg text-xs"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Label (e.g. Primary)"
                                value={dest.label || ''}
                                onChange={(e) =>
                                  handleUpdateDestination(dIdx, 'label', e.target.value)
                                }
                                className="flex-1 px-2.5 py-1.5 bg-white border border-[#E8DDD7] rounded-lg text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveDestination(dIdx)}
                                className="p-1 text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                                title="Remove Destination"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingCall}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    Save Specifications
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Vendors Management Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  Event Vendors ({vendors.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Manage vendors who applied on Sheeba, entered via sponsorship, or were added manually.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddVendorModalOpen(true)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Add Vendor Manually
                </Button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="space-y-2.5 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search vendors by business name, contact, or booth #..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'All Sources' },
                    { id: 'applied', label: 'Applied on Sheeba' },
                    { id: 'manual', label: 'Manual' },
                    { id: 'sponsorship', label: 'Via Sponsorship' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSourceFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        sourceFilter === tab.id
                          ? 'bg-[#63474D] text-white shadow-2xs'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `All Statuses (${vendors.length})` },
                  {
                    id: 'pending',
                    label: `Pending Review (${vendors.filter((v) => v.status === 'pending').length})`,
                    highlight: vendors.some((v) => v.status === 'pending'),
                  },
                  {
                    id: 'accepted_awaiting_payment',
                    label: `Awaiting Payment (${vendors.filter((v) => v.status === 'accepted_awaiting_payment').length})`,
                  },
                  {
                    id: 'confirmed',
                    label: `Confirmed (${vendors.filter((v) => v.status === 'confirmed').length})`,
                  },
                  {
                    id: 'rejected',
                    label: `Rejected (${vendors.filter((v) => v.status === 'rejected').length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === tab.id
                        ? 'bg-[#2D1F23] text-white shadow-2xs'
                        : tab.highlight
                        ? 'bg-amber-50 text-amber-900 border border-amber-300 font-bold hover:bg-amber-100'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.highlight && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vendors Table */}
            {filteredVendors.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-10 text-center space-y-3">
                <div className="w-12 h-12 bg-[#FAF7F5] rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                  <Store className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-sm text-[#2D1F23]">No vendors found</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {vendors.length === 0
                    ? 'No vendors have registered or applied yet. You can click "+ Add Vendor Manually" to list an exhibitor right away.'
                    : 'No vendors match your current search and filter criteria.'}
                </p>
                {vendors.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddVendorModalOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add First Vendor
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-[#FAF7F5] text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Business & Contact</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Space (m²)</th>
                        <th className="py-3 px-4">Price & Payment</th>
                        <th className="py-3 px-4">Special Reqs</th>
                        <th className="py-3 px-4">Booth #</th>
                        <th className="py-3 px-4">Source</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <button
                                type="button"
                                onClick={() => setReviewingVendor(vendor)}
                                className="font-bold text-[#2D1F23] hover:text-[#63474D] hover:underline text-left block text-xs cursor-pointer"
                                title="Click to view full application details"
                              >
                                {vendor.businessName}
                              </button>
                              <span className="text-[11px] text-gray-400 block">
                                {vendor.contactName} • {vendor.contactEmail}
                              </span>
                              {vendor.contactPhone && (
                                <span className="text-[10px] text-gray-400 block">
                                  {vendor.contactPhone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600">
                            {vendor.category || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#2D1F23]">
                            {vendor.spaceSqm} m²
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[#2D1F23] block">
                                {vendor.totalFinalAmount ? `${Number(vendor.totalFinalAmount).toLocaleString()} ETB` : '—'}
                              </span>
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold capitalize ${
                                  vendor.paymentStatus === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {vendor.paymentStatus || 'unpaid'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {vendor.specialRequirements?.trim() ? (
                              <button
                                type="button"
                                onClick={() => setReviewingVendor(vendor)}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 hover:bg-amber-100 cursor-pointer max-w-[130px]"
                                title={vendor.specialRequirements}
                              >
                                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">{vendor.specialRequirements}</span>
                              </button>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {vendor.boothNumber ? (
                              <span className="px-2 py-0.5 rounded-lg bg-gray-100 font-mono text-[11px] font-bold text-gray-700">
                                {vendor.boothNumber}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {vendor.source === 'applied' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Applied via Sheeba</span>
                              </span>
                            ) : vendor.source === 'sponsorship' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 w-max inline-block">
                                Via Sponsorship
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 w-max inline-block">
                                Added Manually
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {vendor.status === 'pending' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-max">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span>Pending Review</span>
                              </span>
                            ) : vendor.status === 'accepted_awaiting_payment' ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 w-max">
                                  <CreditCard className="w-2.5 h-2.5 text-indigo-600" />
                                  <span>Awaiting Payment</span>
                                </span>
                                {vendor.latestReceipt?.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReceiptReview(vendor)}
                                    className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                    title="Exhibitor has submitted a receipt. Click to review."
                                  >
                                    <Clock className="w-2.5 h-2.5 text-amber-700 animate-pulse" />
                                    <span>Receipt Pending Review</span>
                                  </button>
                                )}
                                {vendor.latestReceipt?.status === 'FAILED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReceiptReview(vendor)}
                                    className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Previous receipt was rejected. Click to view history."
                                  >
                                    <X className="w-2.5 h-2.5 text-red-600" />
                                    <span>Receipt Rejected</span>
                                  </button>
                                )}
                              </div>
                            ) : vendor.status === 'confirmed' ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max">
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Confirmed (Paid)</span>
                                </span>
                                {(vendor.latestReceipt?.screenshotUrl || vendor.latestReceipt?.status === 'SETTLED') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReceiptReview(vendor)}
                                    className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="View uploaded payment receipt"
                                  >
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>View Receipt</span>
                                  </button>
                                )}
                              </div>
                            ) : vendor.status === 'rejected' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-max">
                                <X className="w-2.5 h-2.5 text-red-600" />
                                <span>Rejected</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 capitalize w-max inline-block">
                                {vendor.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Application button */}
                              <button
                                type="button"
                                onClick={() => setReviewingVendor(vendor)}
                                className="px-2.5 py-1 text-xs font-semibold text-[#63474D] bg-[#FAF7F5] hover:bg-[#63474D] hover:text-white border border-[#E8DDD7] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                                title="View full application and submitted answers"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Application</span>
                              </button>

                              {/* Receipt Review button */}
                              {(vendor.status === 'accepted_awaiting_payment' || vendor.status === 'confirmed' || vendor.latestReceipt) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReceiptReview(vendor)}
                                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                    vendor.latestReceipt?.status === 'PENDING'
                                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300'
                                      : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                                  }`}
                                  title={
                                    vendor.latestReceipt?.status === 'PENDING'
                                      ? 'Review pending payment receipt'
                                      : 'View payment receipt history'
                                  }
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Quick Accept/Reject for Pending applications */}
                              {vendor.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingVendor(vendor)}
                                    disabled={acceptingVendorId === vendor.id || isSubmittingDecision}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                                    title={(vendor.totalFinalAmount || 0) <= 0 ? 'Accept and confirm free application' : 'Approve application (move to Awaiting Payment)'}
                                  >
                                    {acceptingVendorId === vendor.id ? (
                                      <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingVendor(vendor);
                                      setRejectionReason('');
                                    }}
                                    disabled={acceptingVendorId === vendor.id || isSubmittingDecision}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                    title="Reject application"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => setEditingVendor(vendor)}
                                className="p-1.5 text-gray-400 hover:text-[#63474D] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                title="Edit vendor & booth number"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingVendor(vendor)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="Remove vendor"
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
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Manual Vendor Modal */}
      {isAddVendorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingVendor && setIsAddVendorModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Vendor Roster
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  Add Vendor Manually
                </h3>
                <p className="text-xs text-gray-500">
                  Add an existing exhibitor or a sponsor with booth allocation (no Sheeba platform fee).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVendorModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {vendorModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{vendorModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddManualVendor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Innovations"
                    value={manualForm.businessName}
                    onChange={(e) => setManualForm({ ...manualForm, businessName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hardware, EdTech, SaaS"
                    value={manualForm.category || ''}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Helen Tadesse"
                    value={manualForm.contactName}
                    onChange={(e) => setManualForm({ ...manualForm, contactName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. contact@acme.et"
                    value={manualForm.contactEmail}
                    onChange={(e) => setManualForm({ ...manualForm, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+251 91 123 4567"
                    value={manualForm.contactPhone || ''}
                    onChange={(e) => setManualForm({ ...manualForm, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Space (m²) *
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    required
                    value={manualForm.spaceSqm}
                    onChange={(e) => setManualForm({ ...manualForm, spaceSqm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Booth Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B-04"
                    value={manualForm.boothNumber || ''}
                    onChange={(e) => setManualForm({ ...manualForm, boothNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Source Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-2xl border text-xs font-semibold cursor-pointer flex items-center gap-2 ${
                      manualForm.source === 'manual'
                        ? 'border-[#63474D] bg-[#63474D]/10 text-[#63474D]'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vendor_source"
                      checked={manualForm.source === 'manual'}
                      onChange={() => setManualForm({ ...manualForm, source: 'manual' })}
                      className="sr-only"
                    />
                    <span>Added Manually (Direct)</span>
                  </label>

                  <label
                    className={`p-3 rounded-2xl border text-xs font-semibold cursor-pointer flex items-center gap-2 ${
                      manualForm.source === 'sponsorship'
                        ? 'border-purple-600 bg-purple-50 text-purple-800'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vendor_source"
                      checked={manualForm.source === 'sponsorship'}
                      onChange={() => setManualForm({ ...manualForm, source: 'sponsorship' })}
                      className="sr-only"
                    />
                    <span>Via Sponsorship Package</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Showcase Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What will they be demonstrating or selling at their booth?"
                  value={manualForm.showcaseDescription || ''}
                  onChange={(e) => setManualForm({ ...manualForm, showcaseDescription: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Special Requirements
                </label>
                <textarea
                  rows={2}
                  placeholder="Any power, equipment, or booth location requirements..."
                  value={manualForm.specialRequirements || ''}
                  onChange={(e) => setManualForm({ ...manualForm, specialRequirements: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddVendorModalOpen(false)}
                  disabled={isSubmittingVendor}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={isSubmittingVendor}
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                >
                  Add to Roster
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isUpdatingVendor && setEditingVendor(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Edit Vendor
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {editingVendor.businessName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingVendor(null)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateVendor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={editingVendor.businessName}
                    onChange={(e) => setEditingVendor({ ...editingVendor, businessName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingVendor.category || ''}
                    onChange={(e) => setEditingVendor({ ...editingVendor, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Booth Number
                  </label>
                  <input
                    type="text"
                    value={editingVendor.boothNumber || ''}
                    placeholder="e.g. A-12"
                    onChange={(e) => setEditingVendor({ ...editingVendor, boothNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Allocated Space (m²)
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={editingVendor.spaceSqm}
                    onChange={(e) => setEditingVendor({ ...editingVendor, spaceSqm: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Status
                </label>
                <select
                  value={editingVendor.status}
                  onChange={(e) => setEditingVendor({ ...editingVendor, status: e.target.value as any })}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                >
                  <option value="pending">Pending Review (Awaiting Organizer Decision)</option>
                  <option value="accepted_awaiting_payment">Accepted - Awaiting Payment</option>
                  <option
                    value="confirmed"
                    disabled={editingVendor.source === 'applied' && editingVendor.status === 'pending'}
                  >
                    Confirmed (Paid / Approved)
                  </option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {editingVendor.source === 'applied' && editingVendor.status === 'pending' && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    * Applications submitted via Sheeba cannot be marked confirmed directly without payment. Accept them first so they can pay.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Showcase Description
                </label>
                <textarea
                  rows={2}
                  value={editingVendor.showcaseDescription || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, showcaseDescription: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Special Requirements
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 220V power, corner booth, high-traffic aisle"
                  value={editingVendor.specialRequirements || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, specialRequirements: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVendor(null)}
                  disabled={isUpdatingVendor}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={isUpdatingVendor}
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      {deletingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#2D1F23] text-white p-6 rounded-3xl max-w-md w-full shadow-2xl border border-red-500/30 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-2xl shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-white">Remove Vendor?</h4>
                <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                  Are you sure you want to remove <strong className="text-white">"{deletingVendor.businessName}"</strong> from this event? If they paid through Sheeba, their space will be released.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeletingVendor(null)}
                disabled={isDeletingVendor}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVendor}
                disabled={isDeletingVendor}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingVendor ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingVendor ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Review Modal */}
      {reviewingVendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingDecision && !acceptingVendorId && setReviewingVendor(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                    Exhibitor Application Review
                  </span>
                  {reviewingVendor.source === 'applied' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Applied via Sheeba</span>
                    </span>
                  ) : reviewingVendor.source === 'sponsorship' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      Via Sponsorship
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Added Manually
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-bold text-2xl text-[#2D1F23]">
                  {reviewingVendor.businessName}
                </h3>
                {reviewingVendor.category && (
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-[#FAF7F5] text-gray-600 text-[11px] font-medium border border-[#E8DDD7]">
                    {reviewingVendor.category}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReviewingVendor(null)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Application Status Banner */}
            {reviewingVendor.status === 'pending' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="block font-bold text-amber-900 text-sm">
                    Pending Organizer Review
                  </strong>
                  <p className="text-amber-800 leading-relaxed">
                    This application has been submitted by the exhibitor and is awaiting your decision. It is <strong>not approved and not paid</strong>. Review the details below to accept (reserve space & request payment) or reject.
                  </p>
                </div>
              </div>
            )}

            {reviewingVendor.status === 'accepted_awaiting_payment' && (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3 text-indigo-900">
                <CreditCard className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="block font-bold text-indigo-900 text-sm">
                    Accepted — Awaiting Payment
                  </strong>
                  <p className="text-indigo-800 leading-relaxed">
                    You have accepted this application and booth space ({reviewingVendor.spaceSqm} m²) is committed. The exhibitor has been notified to complete payment. Status moves to Confirmed once paid.
                  </p>
                </div>
              </div>
            )}

            {reviewingVendor.status === 'confirmed' && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="block font-bold text-emerald-900 text-sm">
                    Confirmed Exhibitor
                  </strong>
                  <p className="text-emerald-800 leading-relaxed">
                    This exhibitor is confirmed, payment is completed, and they are listed in the public event registration page.
                  </p>
                </div>
              </div>
            )}

            {reviewingVendor.status === 'rejected' && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="block font-bold text-red-900 text-sm">
                    Application Rejected
                  </strong>
                  <p className="text-red-800 leading-relaxed">
                    This application was declined. Reserved space was released.
                    {reviewingVendor.rejectionReason && (
                      <span className="block mt-1 font-medium italic">
                        Reason: "{reviewingVendor.rejectionReason}"
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Key Review Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Contact Person */}
              <div className="p-3.5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-1">
                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-[#63474D]" />
                  <span>Contact Representative</span>
                </div>
                <strong className="text-xs text-[#2D1F23] block font-bold">
                  {reviewingVendor.contactName}
                </strong>
                <a
                  href={`mailto:${reviewingVendor.contactEmail}`}
                  className="text-xs text-[#63474D] hover:underline flex items-center gap-1"
                >
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span>{reviewingVendor.contactEmail}</span>
                </a>
                {reviewingVendor.contactPhone && (
                  <a
                    href={`tel:${reviewingVendor.contactPhone}`}
                    className="text-xs text-gray-600 hover:text-black flex items-center gap-1 pt-0.5"
                  >
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>{reviewingVendor.contactPhone}</span>
                  </a>
                )}
              </div>

              {/* Space & Booth Details */}
              <div className="p-3.5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-1">
                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-[#63474D]" />
                  <span>Requested Space & Booth</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <strong className="text-lg text-[#2D1F23] font-bold">
                    {reviewingVendor.spaceSqm} m²
                  </strong>
                  <span className="text-[11px] text-gray-500">floor space</span>
                </div>
                <div className="text-xs text-gray-600 pt-0.5 flex items-center gap-1.5">
                  <span className="text-gray-400">Assigned Booth:</span>
                  {reviewingVendor.boothNumber ? (
                    <span className="px-2 py-0.5 bg-white border border-gray-200 rounded font-mono font-bold text-gray-800">
                      {reviewingVendor.boothNumber}
                    </span>
                  ) : (
                    <span className="italic text-gray-400">Not assigned yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5 text-[#63474D]" />
                  <span>Pricing & Payment Status</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                    reviewingVendor.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Payment: {reviewingVendor.paymentStatus || 'unpaid'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Organizer Amount</span>
                  <strong className="text-[#2D1F23] font-bold text-xs block">
                    {Number(reviewingVendor.totalOrganizerAmount || 0).toLocaleString()} ETB
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">
                    Sheeba Cut ({reviewingVendor.sheebaCutPercent || 30}%)
                  </span>
                  <strong className="text-gray-600 font-bold text-xs block">
                    {Number(reviewingVendor.totalCutAmount || 0).toLocaleString()} ETB
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Total Final Price</span>
                  <strong className="text-[#63474D] font-bold text-sm block">
                    {Number(reviewingVendor.totalFinalAmount || 0).toLocaleString()} ETB
                  </strong>
                </div>
              </div>
            </div>

            {/* Showcase Pitch */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Showcase & Product Pitch
              </label>
              <div className="p-3.5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-xs text-[#2D1F23] leading-relaxed whitespace-pre-wrap">
                {reviewingVendor.showcaseDescription || (
                  <span className="italic text-gray-400">No showcase description provided.</span>
                )}
              </div>
            </div>

            {/* Special Requirements */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Special Requirements (Power, Rigging, Proximity, etc.)</span>
              </label>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  reviewingVendor.specialRequirements?.trim()
                    ? 'bg-amber-50/80 border border-amber-200 text-amber-950 font-medium whitespace-pre-wrap'
                    : 'bg-[#FAF7F5] border border-[#E8DDD7] text-gray-400 italic'
                }`}
              >
                {reviewingVendor.specialRequirements?.trim()
                  ? reviewingVendor.specialRequirements
                  : 'None specified'}
              </div>
            </div>

              {/* Submitted Custom Questions & Answers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#63474D]" />
                    <span>Submitted Application Questions & Answers</span>
                  </label>
                  {customQuestions.length > 0 && (
                    <span className="text-[10px] text-gray-400 font-medium">
                      {customQuestions.length} question(s) configured
                    </span>
                  )}
                </div>

                {(() => {
                  const submittedAnswers = reviewingVendor.questionAnswers || (reviewingVendor as any).custom_answers || (reviewingVendor as any).customAnswers || {};
                  const answeredKeys = Object.keys(submittedAnswers);

                  const allQuestionItems: Array<{ id: string; questionText: string; isRequired?: boolean; value: any }> = [];

                  // First add from customQuestions
                  (customQuestions || []).forEach((q) => {
                    const qId = String(q.id);
                    const val = submittedAnswers[qId] ?? submittedAnswers[q.questionText];
                    allQuestionItems.push({
                      id: qId,
                      questionText: q.questionText,
                      isRequired: q.isRequired ?? (q as any).required,
                      value: val,
                    });
                  });

                  // Then add any answers in submittedAnswers that weren't in customQuestions
                  answeredKeys.forEach((key) => {
                    const alreadyAdded = allQuestionItems.some(
                      (item) => item.id === key || item.questionText === key
                    );
                    if (!alreadyAdded) {
                      allQuestionItems.push({
                        id: key,
                        questionText: key.replace(/^sheeba_/, '').replace(/_/g, ' '),
                        value: submittedAnswers[key],
                      });
                    }
                  });

                  if (allQuestionItems.length === 0) {
                    return (
                      <div className="p-3 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-xs text-gray-400 italic">
                        No custom questions were required or submitted for this application.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {allQuestionItems.map((item, idx) => {
                        const val = item.value;
                        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
                        const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                        const isImg = isUrl && (val.match(/\.(jpeg|jpg|png|webp|gif)/i) || val.includes('/image/upload/'));

                        return (
                          <div
                            key={item.id || idx}
                            className="p-3.5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#2D1F23] block text-xs capitalize">
                                {item.questionText}
                              </span>
                              {item.isRequired && (
                                <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                                  Required
                                </span>
                              )}
                            </div>

                            {!hasVal ? (
                              <p className="text-gray-400 italic text-[11px]">Not provided</p>
                            ) : isImg ? (
                              <div className="pt-1 space-y-1.5">
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block relative group rounded-xl overflow-hidden border border-gray-200"
                                >
                                  <img
                                    src={val}
                                    alt={item.questionText}
                                    className="max-h-36 max-w-full rounded-xl object-contain bg-white"
                                  />
                                  <span className="absolute inset-0 bg-black/40 text-white text-[10px] font-bold flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink className="w-3 h-3" /> View Full Image
                                  </span>
                                </a>
                              </div>
                            ) : isUrl ? (
                              <div className="pt-1">
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#63474D] font-bold hover:bg-[#FAF7F5] transition-colors shadow-2xs"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-[#63474D]" />
                                  <span>View Uploaded Document / Link</span>
                                </a>
                              </div>
                            ) : Array.isArray(val) ? (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {val.length > 0 ? (
                                  val.map((tag, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-2 py-0.5 bg-white border border-[#E8DDD7] rounded-lg text-[11px] font-semibold text-[#2D1F23]"
                                    >
                                      {String(tag)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400 italic">None selected</span>
                                )}
                              </div>
                            ) : typeof val === 'boolean' ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  val ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {val ? 'Yes' : 'No'}
                              </span>
                            ) : (
                              <p className="text-gray-800 bg-white p-2.5 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-wrap">
                                {String(val)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Links if available */}
              {reviewingVendor.websiteUrl && (
                <div className="pt-1 text-xs">
                  <a
                    href={reviewingVendor.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#63474D] hover:underline font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Visit Company Website</span>
                  </a>
                </div>
              )}

              {/* Receipt / Payment Verification Section in Application Review Modal */}
              {(reviewingVendor.status === 'accepted_awaiting_payment' || reviewingVendor.status === 'confirmed' || reviewingVendor.latestReceipt) && (
                <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-indigo-700" />
                      <span>{reviewingVendor.status === 'confirmed' ? 'Verified Payment & Receipt' : 'Payment Receipt Review Desk'}</span>
                    </div>
                    {reviewingVendor.latestReceipt?.status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        Receipt Awaiting Verification
                      </span>
                    )}
                    {(reviewingVendor.latestReceipt?.status === 'SETTLED' || reviewingVendor.status === 'confirmed') && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Payment Settled
                      </span>
                    )}
                    {reviewingVendor.latestReceipt?.status === 'FAILED' && reviewingVendor.status !== 'confirmed' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        Previous Receipt Rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-900/80 leading-relaxed">
                    {reviewingVendor.latestReceipt?.status === 'PENDING'
                      ? 'The applicant has submitted an offline bank transfer receipt for verification. Open the receipt review desk to inspect the document and verify cleared funds.'
                      : reviewingVendor.status === 'confirmed'
                      ? 'Payment has been cleared and verified. Click below to inspect the uploaded payment receipt and transaction evidence.'
                      : reviewingVendor.latestReceipt
                      ? `Receipt history is available (latest status: ${reviewingVendor.latestReceipt.status}).`
                      : 'This exhibitor has been approved and is awaiting payment settlement. Once they submit an offline receipt, you can inspect and verify it here.'}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const target = reviewingVendor;
                        setReviewingVendor(null);
                        handleOpenReceiptReview(target);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{reviewingVendor.status === 'confirmed' ? 'View Uploaded Receipt' : 'Open Receipt Verification Desk'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setReviewingVendor(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>

                {reviewingVendor.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingVendor(reviewingVendor);
                        setRejectionReason('');
                      }}
                      disabled={acceptingVendorId === reviewingVendor.id || isSubmittingDecision}
                      className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Application</span>
                    </button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmingVendor(reviewingVendor)}
                      isLoading={acceptingVendorId === reviewingVendor.id}
                      icon={<Check className="w-4 h-4" />}
                    >
                      {(reviewingVendor.totalFinalAmount || 0) <= 0 ? 'Accept & Confirm Free Application' : 'Approve Application'}
                    </Button>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}

      {/* Approve Application Confirmation Modal */}
      {confirmingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base text-[#2D1F23]">
                  {(confirmingVendor.totalFinalAmount || 0) <= 0
                    ? 'Confirm Free Application Approval'
                    : 'Approve Exhibitor Application?'}
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  You are approving the booth application from{' '}
                  <strong className="text-[#2D1F23]">"{confirmingVendor.businessName}"</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Allocated Space:</span>
                <span className="font-bold text-[#2D1F23]">{confirmingVendor.spaceSqm} m²</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Total Booth Fee:</span>
                <span className="font-bold text-[#2D1F23]">
                  {(confirmingVendor.totalFinalAmount || 0) <= 0
                    ? 'Free (0 ETB)'
                    : `${Number(confirmingVendor.totalFinalAmount).toLocaleString()} ETB`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Next Status:</span>
                <span className="font-bold text-indigo-700">
                  {(confirmingVendor.totalFinalAmount || 0) <= 0
                    ? 'Confirmed'
                    : 'Accepted — Awaiting Payment'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-normal">
              {(confirmingVendor.totalFinalAmount || 0) <= 0
                ? 'Because this booth is free, approving it will immediately mark the booth as confirmed.'
                : 'Approving reserves the requested floor space. The applicant will be instructed to submit payment and offline receipt for your verification before the booth is confirmed.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmingVendor(null)}
                disabled={acceptingVendorId === confirmingVendor.id}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAcceptVendor(confirmingVendor)}
                disabled={acceptingVendorId === confirmingVendor.id}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {acceptingVendorId === confirmingVendor.id ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>
                  {acceptingVendorId === confirmingVendor.id
                    ? 'Approving...'
                    : (confirmingVendor.totalFinalAmount || 0) <= 0
                    ? 'Confirm Free Application'
                    : 'Approve & Request Payment'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-[#2D1F23]">
                  Reject Application?
                </h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Are you sure you want to decline the booth application from <strong className="text-[#2D1F23]">"{rejectingVendor.businessName}"</strong>? This will update their status to Rejected.
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectVendor} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Space fully booked for this business category, or requirements could not be accommodated."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingVendor(null);
                    setRejectionReason('');
                  }}
                  disabled={isSubmittingDecision}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecision}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingDecision ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmittingDecision ? 'Declining...' : 'Confirm Rejection'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organizer Receipt Review Modal */}
      {reviewingReceiptVendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => {
              if (!isVerifyingReceipt && !isRejectingReceipt) {
                setReviewingReceiptVendor(null);
                setReceiptFeedback(null);
              }
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Offline Receipt Verification Desk
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      reviewingReceiptVendor.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : reviewingReceiptVendor.status === 'accepted_awaiting_payment'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Booth: {reviewingReceiptVendor.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-2xl text-[#2D1F23] mt-1">
                  {reviewingReceiptVendor.businessName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Requested Floor Space: <strong className="text-gray-700">{reviewingReceiptVendor.spaceSqm} m²</strong> • Total Due:{' '}
                  <strong className="text-[#63474D]">
                    {Number(reviewingReceiptVendor.totalFinalAmount || 0).toLocaleString()} ETB
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewingReceiptVendor(null);
                  setReceiptFeedback(null);
                }}
                disabled={isVerifyingReceipt || isRejectingReceipt}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-Modal Feedback Alert */}
            {receiptFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                  receiptFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}
              >
                {receiptFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium leading-relaxed">{receiptFeedback.text}</div>
                <button
                  type="button"
                  onClick={() => setReceiptFeedback(null)}
                  className="text-gray-400 hover:text-black text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoadingVendorReceipts ? (
              <div className="py-12 text-center space-y-3">
                <span className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs font-semibold text-gray-500">Loading submitted receipts...</p>
              </div>
            ) : vendorReceipts.length === 0 ? (
              /* Empty Receipts State */
              <div className="p-8 text-center bg-[#FAF7F5] rounded-3xl border border-[#E8DDD7] space-y-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-xs text-gray-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#2D1F23]">No Receipts Submitted Yet</h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
                    This exhibitor has not yet submitted an offline bank transfer or telebirr receipt. Once they upload proof of payment, it will appear here for verification.
                  </p>
                </div>
              </div>
            ) : (
              /* Receipts Content */
              <div className="space-y-5">
                {(() => {
                  const latestReceipt = vendorReceipts[0];
                  const receiptDocUrl = latestReceipt.screenshotUrl || latestReceipt.receiptUrl || '';
                  const receiptAmount = latestReceipt.amount ?? reviewingReceiptVendor.totalFinalAmount ?? 0;
                  const receiptFailure = latestReceipt.failureReason || latestReceipt.rejectionReason;
                  const isPdf =
                    receiptDocUrl.toLowerCase().endsWith('.pdf') ||
                    receiptDocUrl.toLowerCase().includes('.pdf');

                  return (
                    <div className="space-y-4">
                      {/* Latest Receipt Card */}
                      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                              Latest Receipt Submission
                            </span>
                            <span className="text-xs text-gray-500">
                              Submitted {new Date(latestReceipt.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            {latestReceipt.status === 'PENDING' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                                <span>Awaiting Organizer Verification</span>
                              </span>
                            ) : latestReceipt.status === 'SETTLED' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verified & Payment Settled</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submission Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-[#FAF7F5] rounded-xl border border-[#E8DDD7]">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">
                              Claimed Transaction Reference
                            </span>
                            <span className="font-mono font-bold text-sm text-[#2D1F23] block mt-0.5 select-all">
                              {latestReceipt.transactionReference}
                            </span>
                          </div>

                          <div className="p-3 bg-[#FAF7F5] rounded-xl border border-[#E8DDD7]">
                            <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">
                              Amount & Payment Method
                            </span>
                            <span className="font-bold text-sm text-[#63474D] block mt-0.5">
                              {Number(receiptAmount).toLocaleString()} ETB
                            </span>
                            <span className="text-[10px] text-gray-500 capitalize">
                              Method: {latestReceipt.paymentMethod || 'Manual transfer'}
                            </span>
                          </div>
                        </div>

                        {/* Notes if provided */}
                        {latestReceipt.notes && (
                          <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-0.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Exhibitor Notes
                            </span>
                            <p className="text-gray-700 italic">"{latestReceipt.notes}"</p>
                          </div>
                        )}

                        {/* Receipt Document Display (Image preview or PDF link) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              Receipt Document
                            </span>
                            <a
                              href={receiptDocUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#63474D] hover:underline flex items-center gap-1 font-semibold text-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Document in New Tab</span>
                            </a>
                          </div>

                          {isPdf ? (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-100 text-red-700 rounded-xl">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                  <strong className="text-xs text-gray-900 block font-bold">
                                    Payment Receipt (PDF Document)
                                  </strong>
                                  <span className="text-[11px] text-gray-500">
                                    Click to view receipt in a secure browser tab
                                  </span>
                                </div>
                              </div>
                              <a
                                href={receiptDocUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-400 text-xs font-bold text-gray-800 transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View PDF</span>
                              </a>
                            </div>
                          ) : (
                            <div className="p-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl flex justify-center items-center overflow-hidden">
                              <a
                                href={receiptDocUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Click to open original image in high resolution"
                                className="cursor-zoom-in"
                              >
                                <img
                                  src={receiptDocUrl}
                                  alt={`Receipt from ${reviewingReceiptVendor.businessName}`}
                                  className="max-h-72 w-auto object-contain rounded-xl shadow-xs hover:opacity-95 transition-opacity"
                                />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* If already VERIFIED */}
                        {latestReceipt.status === 'SETTLED' && (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-900 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <strong>Payment verified and booth confirmed.</strong>
                              <p className="text-emerald-800 leading-relaxed">
                                {latestReceipt.verifiedAt
                                  ? `Verified on ${new Date(latestReceipt.verifiedAt).toLocaleString()}.`
                                  : 'Verified by event organizer.'}
                                {latestReceipt.notes && ` Reviewer note: "${latestReceipt.notes}"`}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* If already REJECTED */}
                        {latestReceipt.status === 'FAILED' && (
                          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-900 text-xs">
                            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <strong>Receipt was rejected.</strong>
                              <p className="text-red-800 leading-relaxed">
                                Reason provided to exhibitor: "{receiptFailure || 'No reason specified'}"
                              </p>
                              <span className="block text-[11px] text-red-700/80 pt-1">
                                The exhibitor may upload a new receipt to address this rejection.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Organizer Decision Actions for PENDING receipt */}
                        {latestReceipt.status === 'PENDING' && (
                          <div className="pt-3 border-t border-gray-100 space-y-4">
                            {/* Verification Block */}
                            {!isRejectMode ? (
                              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3.5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                    <span>Verify Payment & Settle Booth</span>
                                  </div>
                                  <p className="text-[11px] text-amber-900 font-medium bg-amber-50 p-2 rounded-xl border border-amber-200 leading-relaxed">
                                    ⚠️ <strong>Warning:</strong> Verifying this receipt immediately marks payment settlement as <strong>SETTLED</strong> in the database and advances this booth to <strong>CONFIRMED</strong>. Ensure funds are physically deposited in your account.
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={confirmedCleared}
                                      onChange={(e) => setConfirmedCleared(e.target.checked)}
                                      disabled={isVerifyingReceipt}
                                      className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-semibold text-gray-800 leading-snug">
                                      I have independently verified this receipt against our receiving account and confirm that{' '}
                                      <span className="text-[#63474D] font-bold">
                                        {Number(receiptAmount).toLocaleString()} ETB
                                      </span>{' '}
                                      cleared with reference{' '}
                                      <span className="font-mono font-bold text-gray-900">{latestReceipt.transactionReference}</span>.
                                    </span>
                                  </label>

                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                      Verification Note (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Confirmed on Commercial Bank of Ethiopia statement"
                                      value={verifyNotes}
                                      onChange={(e) => setVerifyNotes(e.target.value)}
                                      disabled={isVerifyingReceipt}
                                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsRejectMode(true);
                                      setReceiptRejectionReason('');
                                    }}
                                    disabled={isVerifyingReceipt}
                                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors font-semibold cursor-pointer"
                                  >
                                    Reject receipt instead...
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleVerifyReceipt(latestReceipt.id)}
                                    disabled={!confirmedCleared || isVerifyingReceipt}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                                  >
                                    {isVerifyingReceipt ? (
                                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    <span>{isVerifyingReceipt ? 'Verifying...' : 'Verify Payment & Confirm Booth'}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Rejection Form Block */
                              <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl space-y-3 animate-fade-in">
                                <div className="flex items-start gap-2">
                                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="text-xs text-red-900 block font-bold">Reject Receipt Submission</strong>
                                    <p className="text-[11px] text-red-800 leading-relaxed">
                                      The payment will be marked as FAILED. The exhibitor will see your rejection reason and will be allowed to submit a new receipt.
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                                    Rejection Reason *
                                  </label>
                                  <textarea
                                    rows={2}
                                    required
                                    placeholder="e.g. Reference number not found in bank statement, amount does not match, or receipt image is unreadable."
                                    value={receiptRejectionReason}
                                    onChange={(e) => setReceiptRejectionReason(e.target.value)}
                                    disabled={isRejectingReceipt}
                                    className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                  />
                                  <p className="text-[10px] text-gray-500 mt-0.5">Minimum 3 characters required.</p>
                                </div>

                                <div className="flex items-center justify-end gap-2.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsRejectMode(false);
                                      setReceiptRejectionReason('');
                                    }}
                                    disabled={isRejectingReceipt}
                                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                                  >
                                    Back to Verification
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectReceipt(latestReceipt.id)}
                                    disabled={!receiptRejectionReason.trim() || receiptRejectionReason.trim().length < 3 || isRejectingReceipt}
                                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                                  >
                                    {isRejectingReceipt ? (
                                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <X className="w-3.5 h-3.5" />
                                    )}
                                    <span>{isRejectingReceipt ? 'Rejecting...' : 'Confirm Rejection'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Full Submission History Section */}
                      {vendorReceipts.length > 1 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                            Receipt Submission History ({vendorReceipts.length} Total)
                          </span>
                          <div className="space-y-2">
                            {vendorReceipts.slice(1).map((r, idx) => (
                              <div
                                key={r.id || idx}
                                className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between gap-3"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-gray-800">{r.transactionReference}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold capitalize ${
                                        r.status === 'SETTLED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : r.status === 'FAILED'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {r.status === 'SETTLED' ? 'Verified' : r.status === 'FAILED' ? 'Rejected' : 'Pending'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-500">
                                    {new Date(r.createdAt).toLocaleDateString()} • {Number(r.amount ?? reviewingReceiptVendor.totalFinalAmount ?? 0).toLocaleString()} ETB
                                    {(r.failureReason || r.rejectionReason) && ` • Reason: "${r.failureReason || r.rejectionReason}"`}
                                    {r.notes && ` • Note: "${r.notes}"`}
                                  </p>
                                </div>
                                <a
                                  href={r.screenshotUrl || r.receiptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-[#63474D] hover:underline font-semibold flex items-center gap-1 shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View</span>
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setReviewingReceiptVendor(null);
                  setReceiptFeedback(null);
                }}
                disabled={isVerifyingReceipt || isRejectingReceipt}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Close Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exhibitor Questions Modal */}
      <EditExhibitorQuestionsModal
        isOpen={isQuestionsModalOpen}
        onClose={() => setIsQuestionsModalOpen(false)}
        questions={customQuestions}
        onQuestionsUpdated={(updated) => setCustomQuestions(updated)}
      />
    </div>
  );
};

