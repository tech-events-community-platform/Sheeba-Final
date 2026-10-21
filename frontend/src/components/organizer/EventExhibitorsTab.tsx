import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type {
  IExhibitorCall,
  IEventVendor,
  IExhibitorCallUpsertPayload,
  IManualVendorPayload,
  VendorSource,
} from '../../types/exhibitor';
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
  const [totalSpaceSqm, setTotalSpaceSqm] = useState<number>(0);
  const [pricePerSqm, setPricePerSqm] = useState<number>(0);
  const [sheebaCutPercent] = useState<number>(30); // 30% tentative default
  const [maxExhibitors, setMaxExhibitors] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [hasBoothNumbers, setHasBoothNumbers] = useState(true);
  const [hasVendorCheckin, setHasVendorCheckin] = useState(false);
  const [isSavingCall, setIsSavingCall] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      setIsEnabled(callData.isEnabled);
      setCallStatus(callData.status);
      setTotalSpaceSqm(callData.totalSpaceSqm || 0);
      setPricePerSqm(callData.pricePerSqm || 0);
      setMaxExhibitors(callData.maxExhibitors || 10);
      setDescription(callData.description || '');
      setSpecifications(callData.specifications || '');
      setApplicationDeadline(
        callData.applicationDeadline
          ? new Date(callData.applicationDeadline).toISOString().split('T')[0]
          : ''
      );
      setHasBoothNumbers(callData.hasBoothNumbers);
      setHasVendorCheckin(callData.hasVendorCheckin);

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
    setIsEnabled(enableState);
    try {
      await api.exhibitors.saveCall(eventId, {
        isEnabled: enableState,
        status: callStatus,
        totalSpaceSqm,
        pricePerSqm,
        maxExhibitors,
        description,
        specifications,
        applicationDeadline: applicationDeadline || undefined,
        hasBoothNumbers,
        hasVendorCheckin,
      });
      showNotification('success', enableState ? 'Exhibitors turned ON for this event.' : 'Exhibitors turned OFF for this event.');
      fetchData();
    } catch (err: any) {
      setIsEnabled(!enableState);
      showNotification('error', err.message || 'Failed to update exhibitor status.');
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
        totalSpaceSqm: Number(totalSpaceSqm) || 0,
        pricePerSqm: Number(pricePerSqm) || 0,
        maxExhibitors: Number(maxExhibitors) || 10,
        description: description.trim() || undefined,
        specifications: specifications.trim() || undefined,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline).toISOString() : undefined,
        hasBoothNumbers,
        hasVendorCheckin,
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

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    const q = vendorSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.businessName.toLowerCase().includes(q) ||
      v.contactName.toLowerCase().includes(q) ||
      v.contactEmail.toLowerCase().includes(q) ||
      (v.boothNumber && v.boothNumber.toLowerCase().includes(q));

    const matchesSource = sourceFilter === 'all' || v.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  // Calculate pricing breakdown
  const cutAmountPerSqm = (pricePerSqm * (sheebaCutPercent / 100));
  const finalPricePerSqm = pricePerSqm + cutAmountPerSqm;

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
              onClick={() => handleToggleEnable(!isEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Base Price per m²</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif font-bold text-2xl text-[#2D1F23]">{pricePerSqm.toLocaleString()}</span>
                <span className="text-xs text-gray-500 font-semibold">ETB</span>
              </div>
              <p className="text-[10px] text-gray-400 pt-1">
                Exhibitors pay {Math.round(finalPricePerSqm).toLocaleString()} ETB (+30% cut)
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
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
                  <span className="text-[10px] uppercase font-bold text-gray-400">Application Deadline</span>
                  <p className="font-bold text-[#2D1F23]">
                    {applicationDeadline ? new Date(applicationDeadline).toLocaleDateString() : 'No deadline set'}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF7F5] rounded-2xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Specifications & Power</span>
                  <p className="text-[#2D1F23] truncate">
                    {specifications || 'Standard booth power, Wi-Fi, and badge pass included.'}
                  </p>
                </div>
              </div>
            ) : (
              /* Edit Call Settings Form */
              <form onSubmit={handleSaveCall} className="space-y-5 animate-fade-in pt-2">
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
                    <p className="text-[10px] text-gray-400 mt-1">What you as the organizer receive per m².</p>
                  </div>
                </div>

                {/* Pricing & Cut Breakdown Helper Card */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    <span>Pricing Breakdown (with Sheeba 30% Platform Cut)</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

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

                <div className="flex flex-wrap items-center gap-6 pt-1">
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
                    <span>Enable Vendor Check-in at Door</span>
                  </label>
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

            {/* Search & Source Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
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
                              <strong className="font-bold text-[#2D1F23] block text-xs">
                                {vendor.businessName}
                              </strong>
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
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Applied via Sheeba
                              </span>
                            ) : vendor.source === 'sponsorship' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Via Sponsorship
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Added Manually
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                vendor.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : vendor.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : vendor.status === 'accepted_awaiting_payment'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {vendor.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
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
                  <option value="confirmed">Confirmed (Paid / Approved)</option>
                  <option value="pending">Pending</option>
                  <option value="accepted_awaiting_payment">Accepted - Awaiting Payment</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
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
    </div>
  );
};

