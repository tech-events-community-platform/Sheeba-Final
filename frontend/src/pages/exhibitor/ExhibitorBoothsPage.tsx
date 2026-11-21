import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { IExhibitorBooth, IExhibitorBoothVisitor, IBoothReceipt } from '../../types/exhibitor';
import { formatPhoneInput } from '../../utils/phone';
import { Button } from '../../components/ui/Button';
import {
  Calendar,
  MapPin,
  Check,
  Clock,
  AlertCircle,
  CreditCard,
  Plus,
  Users,
  Download,
  Trash2,
  X,
  Store,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  Activity,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  ExternalLink,
  Eye,
  File,
  XCircle,
  Info,
  Copy,
  Sparkles,
  UploadCloud,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { uploadToCloudinary, fileToDataUrl } from '../../utils/cloudinary';

// Helper to determine if an event is upcoming or past
const isEventUpcoming = (dateStr?: string): boolean => {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
};

export const ExhibitorBoothsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [booths, setBooths] = useState<IExhibitorBooth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'dealt' | 'awaiting' | 'rejected'>('dealt');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);

  // Modal states
  const [payingBooth, setPayingBooth] = useState<IExhibitorBooth | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Evidence and accounts for Links.et verification
  const [selectedDestinationIndex, setSelectedDestinationIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [paymentOption, setPaymentOption] = useState<'screenshot' | 'reference'>('screenshot');
  const [paymentReference, setPaymentReference] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  // Receipt submission and review state
  const [boothReceipts, setBoothReceipts] = useState<IBoothReceipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptTxRef, setReceiptTxRef] = useState('');
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState('telebirr');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [receiptSubmitError, setReceiptSubmitError] = useState<string | null>(null);
  const [receiptSubmitSuccess, setReceiptSubmitSuccess] = useState<string | null>(null);
  const [isReceiptHistoryExpanded, setIsReceiptHistoryExpanded] = useState(false);

  // Expandable booth details state
  const [expandedBoothIds, setExpandedBoothIds] = useState<Record<string, boolean>>({});
  const toggleBoothExpand = (boothId: string) => {
    setExpandedBoothIds((prev) => ({
      ...prev,
      [boothId]: !prev[boothId],
    }));
  };

  // Visitor logging modal
  const [loggingVisitorBooth, setLoggingVisitorBooth] = useState<IExhibitorBooth | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);
  const [visitorError, setVisitorError] = useState<string | null>(null);
  const [visitorSuccess, setVisitorSuccess] = useState<string | null>(null);

  // Visitors list drawer / modal
  const [viewingVisitorsBooth, setViewingVisitorsBooth] = useState<IExhibitorBooth | null>(null);
  const [visitorsList, setVisitorsList] = useState<IExhibitorBoothVisitor[]>([]);
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(false);
  const [deletingVisitorId, setDeletingVisitorId] = useState<string | null>(null);

  // Inline visitors table states
  const [inlineVisitors, setInlineVisitors] = useState<Record<string, IExhibitorBoothVisitor[]>>({});
  const [loadingInlineVisitors, setLoadingInlineVisitors] = useState<Record<string, boolean>>({});

  const loadInlineVisitors = useCallback(async (boothId: string) => {
    setLoadingInlineVisitors((prev) => ({ ...prev, [boothId]: true }));
    try {
      const list = await api.exhibitors.getBoothVisitors(boothId);
      setInlineVisitors((prev) => ({ ...prev, [boothId]: list }));
    } catch {
      setInlineVisitors((prev) => ({ ...prev, [boothId]: [] }));
    } finally {
      setLoadingInlineVisitors((prev) => ({ ...prev, [boothId]: false }));
    }
  }, []);

  const handleDeleteInlineVisitor = async (boothId: string, visitorId: string) => {
    setDeletingVisitorId(visitorId);
    try {
      await api.exhibitors.deleteBoothVisitor(boothId, visitorId);
      setInlineVisitors((prev) => ({
        ...prev,
        [boothId]: (prev[boothId] || []).filter((v) => v.id !== visitorId),
      }));
      setVisitorsList((prev) => prev.filter((v) => v.id !== visitorId));
      fetchBooths();
    } catch (err: any) {
      alert(err.message || 'Failed to delete visitor record.');
    } finally {
      setDeletingVisitorId(null);
    }
  };

  const handleExportInlineCSV = (booth: IExhibitorBooth) => {
    const list = inlineVisitors[booth.id] || visitorsList;
    if (!list || list.length === 0) return;
    const header = ['Visitor Name', 'Email', 'Phone', 'Notes', 'Date Logged'];
    const rows = list.map((v) => [
      `"${v.visitorName.replace(/"/g, '""')}"`,
      `"${(v.visitorEmail || '').replace(/"/g, '""')}"`,
      `"${(v.visitorPhone || '').replace(/"/g, '""')}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`,
      `"${new Date(v.createdAt).toLocaleString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `booth_visitors_${(booth.businessName || 'export').toLowerCase().replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchBooths = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.exhibitors.getMyBooths();
      setBooths(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your booth applications and bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooths();
  }, [fetchBooths]);

  // Auto-load visitors for confirmed booths
  useEffect(() => {
    if (booths.length > 0) {
      booths.forEach((b) => {
        if (b.status === 'confirmed' && (b.turnout?.totalVisitorsLogged || 0) > 0) {
          loadInlineVisitors(b.id);
        }
      });
    }
  }, [booths, loadInlineVisitors]);

  // Auto-open payment modal if navigated with payBoothId
  useEffect(() => {
    if (!loading && booths.length > 0) {
      const payBoothId = searchParams.get('payBoothId');
      if (payBoothId) {
        const target = booths.find((b) => b.id === payBoothId);
        if (target && target.status === 'accepted_awaiting_payment') {
          setPayingBooth(target);
          setSelectedBoothId(target.id);
          setFilterTab('dealt');
        }
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('payBoothId');
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [loading, booths, searchParams, setSearchParams]);

  // Auto-load inline visitors when viewing a specific confirmed booth
  useEffect(() => {
    if (selectedBoothId) {
      const target = booths.find((b) => b.id === selectedBoothId);
      if (target && target.status === 'confirmed') {
        loadInlineVisitors(target.id);
      }
    }
  }, [selectedBoothId, booths, loadInlineVisitors]);

  // Fetch Receipt History for Active Booth
  const fetchReceipts = useCallback(async (vendorId: string) => {
    setIsLoadingReceipts(true);
    try {
      const history = await api.exhibitors.getBoothReceipts(vendorId);
      setBoothReceipts(history);
    } catch {
      setBoothReceipts([]);
    } finally {
      setIsLoadingReceipts(false);
    }
  }, []);

  useEffect(() => {
    if (payingBooth) {
      fetchReceipts(payingBooth.id);
      setReceiptFile(null);
      setReceiptPreview(null);
      setReceiptTxRef('');
      setReceiptNotes('');
      setReceiptSubmitError(null);
      setReceiptSubmitSuccess(null);
      setIsReceiptHistoryExpanded(false);
    } else {
      setBoothReceipts([]);
    }
  }, [payingBooth, fetchReceipts]);

  // Handle Receipt File Picker
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      setReceiptSubmitError('Please select a valid image (PNG, JPG, WEBP) or PDF document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceiptSubmitError('File size exceeds 10MB limit.');
      return;
    }

    setReceiptSubmitError(null);
    setReceiptFile(file);
    if (isImage) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  };

  // Submit Offline Payment Receipt
  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBooth) return;

    if (!receiptFile) {
      setReceiptSubmitError('Please select a payment receipt image or PDF document to upload.');
      return;
    }

    if (!receiptTxRef.trim() || receiptTxRef.trim().length < 2) {
      setReceiptSubmitError('Please enter a valid bank transaction reference or slip number (min 2 characters).');
      return;
    }

    setIsSubmittingReceipt(true);
    setReceiptSubmitError(null);
    setReceiptSubmitSuccess(null);

    try {
      const uploadedUrl = await uploadToCloudinary(receiptFile, { allowPdf: true, folder: 'sheeba_receipts' });

      await api.exhibitors.submitBoothReceipt(payingBooth.id, {
        receiptUrl: uploadedUrl,
        transactionReference: receiptTxRef.trim(),
        paymentMethod: receiptPaymentMethod || 'manual_bank_transfer',
        notes: receiptNotes.trim() || undefined,
      });

      setReceiptSubmitSuccess('Payment receipt submitted successfully! It is now pending organizer verification.');
      setReceiptFile(null);
      setReceiptPreview(null);
      setReceiptTxRef('');
      setReceiptNotes('');
      fetchReceipts(payingBooth.id);
      fetchBooths();
    } catch (err: any) {
      setReceiptSubmitError(err.message || 'Failed to submit payment receipt. Please try again.');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPaymentError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPaymentError('Screenshot file size must be less than 5MB.');
      return;
    }

    setPaymentError(null);
    setScreenshotFile(file);
    try {
      const dataUrl = await fileToDataUrl(file);
      setScreenshotPreview(dataUrl);
      setScreenshotBase64(dataUrl);

      setIsUploadingScreenshot(true);
      try {
        const uploadedUrl = await uploadToCloudinary(file);
        setScreenshotUrl(uploadedUrl);
      } catch (uploadErr) {
        console.warn('Screenshot cloud backup failed, continuing with direct image base64:', uploadErr);
      } finally {
        setIsUploadingScreenshot(false);
      }
    } catch (err: any) {
      setPaymentError('Failed to process image file: ' + err.message);
    }
  };

  const handleCopyAccount = (accountNum: string, index: number) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex((prev) => (prev === index ? null : prev));
    }, 2000);
  };

  // Handle Links.et Payment Verification & Confirmation
  const handleConfirmPayment = async () => {
    if (!payingBooth) return;

    if (paymentOption === 'reference' && (!paymentReference.trim() || paymentReference.trim().length < 2)) {
      setPaymentError('Please enter a valid bank transaction reference code or web confirmation URL.');
      return;
    }

    if (paymentOption === 'screenshot' && !screenshotFile && !screenshotBase64) {
      setPaymentError('Please select and upload a payment receipt screenshot.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      let finalScreenshotUrl = screenshotUrl;
      if (screenshotFile && !finalScreenshotUrl) {
        try {
          finalScreenshotUrl = await uploadToCloudinary(screenshotFile);
          setScreenshotUrl(finalScreenshotUrl);
        } catch (uploadErr) {
          console.warn('Could not upload to Cloudinary, sending base64 to server verifier:', uploadErr);
        }
      }

      const destinations = payingBooth.paymentConfig?.destinations || [];
      const selectedDest = destinations[selectedDestinationIndex];
      const detectedProvider = selectedDest?.provider || 'cbe';

      await api.exhibitors.payForBooth(payingBooth.id, {
        paymentMethod: detectedProvider,
        paymentReference: paymentOption === 'reference' ? paymentReference.trim() : undefined,
        screenshotUrl: finalScreenshotUrl || undefined,
        screenshotBase64: paymentOption === 'screenshot' ? (screenshotBase64 || undefined) : undefined,
      });

      setPaymentSuccess(`Payment verified with Links.et! Your booth reservation is confirmed.`);
      setTimeout(() => {
        setPayingBooth(null);
        setPaymentSuccess(null);
        setScreenshotFile(null);
        setScreenshotPreview(null);
        setScreenshotBase64(null);
        setScreenshotUrl(null);
        setPaymentReference('');
        fetchBooths();
      }, 2000);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment verification failed. Please check the receipt details and try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Log Visitor Submission
  const handleLogVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingVisitorBooth) return;
    if (!visitorName.trim()) {
      setVisitorError('Visitor name is required.');
      return;
    }
    setIsSubmittingVisitor(true);
    setVisitorError(null);
    try {
      await api.exhibitors.addBoothVisitor(loggingVisitorBooth.id, {
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail.trim() || undefined,
        visitorPhone: visitorPhone.trim() || undefined,
        notes: visitorNotes.trim() || undefined,
      });
      setVisitorSuccess(`Visitor "${visitorName.trim()}" logged successfully!`);
      setVisitorName('');
      setVisitorEmail('');
      setVisitorPhone('');
      setVisitorNotes('');
      // Refresh count and inline table
      fetchBooths();
      loadInlineVisitors(loggingVisitorBooth.id);
      setTimeout(() => {
        setLoggingVisitorBooth(null);
        setVisitorSuccess(null);
      }, 1500);
    } catch (err: any) {
      setVisitorError(err.message || 'Failed to log booth visitor.');
    } finally {
      setIsSubmittingVisitor(false);
    }
  };

  // Load Visitors for Viewing Modal
  const handleOpenVisitorsList = async (booth: IExhibitorBooth) => {
    setViewingVisitorsBooth(booth);
    setIsLoadingVisitors(true);
    try {
      const list = await api.exhibitors.getBoothVisitors(booth.id);
      setVisitorsList(list);
    } catch {
      setVisitorsList([]);
    } finally {
      setIsLoadingVisitors(false);
    }
  };

  // Delete a Visitor Record
  const handleDeleteVisitor = async (visitorId: string) => {
    if (!viewingVisitorsBooth) return;
    setDeletingVisitorId(visitorId);
    try {
      await api.exhibitors.deleteBoothVisitor(viewingVisitorsBooth.id, visitorId);
      setVisitorsList((prev) => prev.filter((v) => v.id !== visitorId));
      fetchBooths();
    } catch (err: any) {
      alert(err.message || 'Failed to delete visitor record.');
    } finally {
      setDeletingVisitorId(null);
    }
  };

  // Export Visitors to CSV
  const handleExportCSV = () => {
    if (!viewingVisitorsBooth || visitorsList.length === 0) return;
    const header = ['Visitor Name', 'Email', 'Phone', 'Notes', 'Date Logged'];
    const rows = visitorsList.map((v) => [
      `"${v.visitorName.replace(/"/g, '""')}"`,
      `"${(v.visitorEmail || '').replace(/"/g, '""')}"`,
      `"${(v.visitorPhone || '').replace(/"/g, '""')}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`,
      `"${new Date(v.createdAt).toLocaleString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `booth_visitors_${(viewingVisitorsBooth.businessName || 'export').toLowerCase().replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dealtBooths = booths.filter((b) => b.status === 'confirmed' || b.status === 'accepted_awaiting_payment');
  const awaitingBooths = booths.filter((b) => b.status === 'pending');
  const rejectedBooths = booths.filter((b) => b.status === 'rejected' || b.status === 'cancelled');

  const currentCategoryBooths =
    filterTab === 'dealt'
      ? dealtBooths
      : filterTab === 'awaiting'
      ? awaitingBooths
      : rejectedBooths;

  const upcomingCount = currentCategoryBooths.filter((b) => isEventUpcoming(b.eventDate)).length;
  const pastCount = currentCategoryBooths.filter((b) => !isEventUpcoming(b.eventDate)).length;

  const displayedBooths = currentCategoryBooths.filter((b) => {
    const isUpcoming = isEventUpcoming(b.eventDate);
    return timeFilter === 'upcoming' ? isUpcoming : !isUpcoming;
  });

  const selectedBooth = selectedBoothId ? booths.find((b) => b.id === selectedBoothId) || null : null;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
            Exhibitor Dashboard
          </span>
          <h1 className="font-serif font-black text-2xl sm:text-3xl text-[#2D1F23]">
            My Booths & Applications
          </h1>
          <p className="text-xs text-gray-500">
            Track your booth applications, payment approvals, and allocated floor spaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBooths}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Link to="/exhibitor/explore">
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              Explore More Events
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW 1: Detail View (when an event is selected) */}
      {selectedBooth ? (
        <div className="space-y-4 animate-fade-in">
          {/* Breadcrumb / Back Navigation Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E8DDD7] rounded-3xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedBoothId(null)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold text-[#63474D] bg-[#FAF7F5] hover:bg-[#F3ECE8] border border-[#E8DDD7] shadow-2xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to My Booths & Applications</span>
              </button>

              <div className="hidden sm:block w-px h-5 bg-gray-200" />

              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span className="text-[#63474D] font-bold">
                  {filterTab === 'dealt'
                    ? 'Dealt Events'
                    : filterTab === 'awaiting'
                    ? 'Awaiting Organizer Approval'
                    : 'Rejected Events'}
                </span>
                <span>/</span>
                <span className="font-semibold text-[#2D1F23] truncate max-w-xs">
                  {selectedBooth.eventTitle || 'Exhibition Space'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  isEventUpcoming(selectedBooth.eventDate)
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {isEventUpcoming(selectedBooth.eventDate) ? 'Upcoming Event' : 'Past Event'}
              </span>
            </div>
          </div>

          {/* Current Detailed Booth Card Content */}
          {(() => {
            const booth = selectedBooth;
            return (
              <div
                key={booth.id}
                className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4 hover:shadow-md transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-[#2D1F23]">
                    {booth.eventTitle || 'Event Exhibition Space'}
                  </h3>
                  {booth.status === 'confirmed' || booth.status === 'accepted_awaiting_payment' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Dealt
                    </span>
                  ) : booth.status === 'pending' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Awaiting Organizer Approval
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1">
                      <X className="w-3 h-3 text-red-600" /> {booth.status === 'rejected' ? 'Rejected' : 'Cancelled'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {booth.eventDate ? new Date(booth.eventDate).toLocaleDateString() : 'Date TBD'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {booth.eventLocation || booth.venueName || 'Venue TBD'}
                  </span>
                </div>
              </div>

              {/* Booth Number & Space */}
              <div className="flex items-center gap-3 bg-[#FAF7F5] px-4 py-2 rounded-2xl border border-gray-100 self-start sm:self-auto">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Booth</span>
                  <strong className="text-xs text-[#2D1F23] font-mono">{booth.boothNumber || 'Pending'}</strong>
                </div>
                <div className="w-px h-6 bg-gray-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Space</span>
                  <strong className="text-xs text-[#2D1F23]">{booth.spaceSqm} m²</strong>
                </div>
                {booth.isPaid !== false && booth.pricingMode !== 'free' && (
                  <>
                    <div className="w-px h-6 bg-gray-200" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Total</span>
                      <strong className="text-xs text-emerald-700 font-bold">
                        {(booth.totalFinalAmount || 0).toLocaleString()} ETB
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dedicated Applicant Status Banners */}
            {(booth.status === 'confirmed' || booth.status === 'accepted_awaiting_payment') && (
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-1 text-xs text-emerald-950">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dealt with Organizer</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  The organizer has approved and confirmed the deal for your exhibition space ({booth.spaceSqm} m²). {booth.boothNumber ? `Booth #${booth.boothNumber}` : ''}
                </p>
              </div>
            )}

            {booth.status === 'pending' && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Awaiting Organizer Approval</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Your exhibition request has been submitted and is currently awaiting approval from the organizer.
                </p>
              </div>
            )}

            {(booth.status === 'rejected' || booth.status === 'cancelled') && (
              <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl space-y-1 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-900">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Request Declined</span>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  {booth.rejectionReason
                    ? `Reason: "${booth.rejectionReason}"`
                    : 'The organizer has declined this exhibition request.'}
                </p>
              </div>
            )}

            {/* Showcase Notes */}
            <div className="space-y-2 text-xs">
              {booth.showcaseDescription && (
                <p className="text-gray-600">
                  <strong className="text-[#2D1F23]">Showcase:</strong> {booth.showcaseDescription}
                </p>
              )}
              {booth.specialRequirements && (
                <p className="text-gray-600">
                  <strong className="text-[#2D1F23]">Special Requirements:</strong> {booth.specialRequirements}
                </p>
              )}
            </div>

            {/* Expandable Submitted Application Details */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => toggleBoothExpand(booth.id)}
                className="flex items-center justify-between w-full text-left py-1 text-xs font-bold text-[#63474D] hover:text-[#2D1F23] cursor-pointer group"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submitted Application Details</span>
                  {booth.questionAnswers && Object.keys(booth.questionAnswers).length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] text-[10px] text-gray-600 font-normal">
                      {Object.keys(booth.questionAnswers).length} Q&A
                    </span>
                  )}
                </span>
                <span className="text-gray-400 group-hover:text-gray-600">
                  {expandedBoothIds[booth.id] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {expandedBoothIds[booth.id] && (
                <div className="mt-3 p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-3.5 text-xs animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Contact Representative</span>
                      <strong className="text-[#2D1F23] block">{booth.contactName || '—'}</strong>
                      <span className="text-gray-500 text-[11px] block">{booth.contactEmail || ''}</span>
                      {booth.contactPhone && (
                        <span className="text-gray-500 text-[11px] block">{booth.contactPhone}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">
                        {booth.isPaid !== false && booth.pricingMode !== 'free' ? 'Space & Pricing Tier' : 'Allocated Space'}
                      </span>
                      <strong className="text-[#2D1F23] block">{booth.spaceSqm} m² floor space</strong>
                      {booth.isPaid !== false && booth.pricingMode !== 'free' ? (
                        <span className="text-gray-500 text-[11px] block capitalize">Mode: {booth.pricingMode?.replace('_', ' ') || 'per sqm'}</span>
                      ) : (
                        <span className="text-emerald-700 text-[11px] font-semibold block">Complimentary Exhibition</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Showcase Pitch</span>
                    <p className="text-gray-700 bg-white p-2.5 rounded-xl border border-gray-100 whitespace-pre-wrap">
                      {booth.showcaseDescription || <span className="italic text-gray-400">None provided</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Special Setup Requirements</span>
                    <p className="text-gray-700 bg-white p-2.5 rounded-xl border border-gray-100 whitespace-pre-wrap">
                      {booth.specialRequirements || <span className="italic text-gray-400">None requested</span>}
                    </p>
                  </div>

                  {/* Custom Questions & Answers */}
                  <div className="space-y-2 pt-2 border-t border-gray-200/60">
                    <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
                      Custom Application Questions & Answers
                    </span>
                    {(!booth.questionAnswers || Object.keys(booth.questionAnswers).length === 0) ? (
                      <p className="text-gray-400 italic text-[11px]">
                        No additional custom questions were required for this event.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(booth.questionAnswers).map(([key, val]) => {
                          const displayVal = Array.isArray(val)
                            ? val.length > 0 ? val.join(', ') : 'None'
                            : typeof val === 'boolean'
                            ? val ? 'Yes' : 'No'
                            : val !== undefined && val !== null && String(val).trim() !== ''
                            ? String(val)
                            : '—';

                          const readableKey = key.replace(/^sheeba_/, '').replace(/_/g, ' ');

                          return (
                            <div key={key} className="bg-white p-2.5 rounded-xl border border-gray-100 text-xs space-y-0.5">
                              <span className="font-bold text-[#2D1F23] block text-[11px] capitalize">{readableKey}</span>
                              <p className="text-gray-700 whitespace-pre-wrap">{displayVal}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Post-Event Turnout Numbers for Confirmed Booths */}
            {booth.status === 'confirmed' && (
              <div className="p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#63474D] flex items-center gap-1.5 uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-[#63474D]" />
                    Event Turnout & Booth Metrics
                  </span>
                  <span className="text-[10px] text-gray-400">Exhibitor View (attendee PII protected)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Registered Attendees</span>
                    <strong className="text-base text-[#2D1F23] font-serif">
                      {(booth.turnout?.totalRegistered || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Verified Check-Ins</span>
                    <strong className="text-base text-emerald-700 font-serif">
                      {(booth.turnout?.totalCheckedIn || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Booth Visitors Logged</span>
                    <strong className="text-base text-[#63474D] font-serif">
                      {(booth.turnout?.totalVisitorsLogged || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Embedded Logged Booth Visitors Table */}
                {(booth.turnout?.totalVisitorsLogged || 0) > 0 && (
                  <div className="pt-3 border-t border-[#E8DDD7]/70 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[#63474D]" />
                        <h4 className="text-xs font-bold text-[#2D1F23]">
                          Logged Booth Visitors ({inlineVisitors[booth.id]?.length ?? booth.turnout?.totalVisitorsLogged ?? 0})
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExportInlineCSV(booth)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Export CSV
                        </button>
                      </div>
                    </div>

                    {loadingInlineVisitors[booth.id] && !inlineVisitors[booth.id] ? (
                      <div className="py-4 text-center text-xs text-gray-400">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#63474D] mb-1" />
                        Loading visitors table...
                      </div>
                    ) : inlineVisitors[booth.id] && inlineVisitors[booth.id].length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#FAF7F5] border-b border-gray-200 text-[#63474D] text-[11px] font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-3">Visitor Name</th>
                              <th className="py-2.5 px-3">Contact Email</th>
                              <th className="py-2.5 px-3">Contact Phone</th>
                              <th className="py-2.5 px-3">Logged Date</th>
                              <th className="py-2.5 px-3">Notes</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {inlineVisitors[booth.id].map((v) => (
                              <tr key={v.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#2D1F23]">
                                  {v.visitorName}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600">
                                  {v.visitorEmail ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span>📧</span> {v.visitorEmail}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600">
                                  {v.visitorPhone ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span>📞</span> {v.visitorPhone}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap text-[11px]">
                                  {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-2.5 px-3 text-gray-700 max-w-xs break-words" title={v.notes || undefined}>
                                  {v.notes ? (
                                    <span className="bg-[#FAF7F5] px-2 py-1 rounded-md border border-gray-100 inline-block">
                                      {v.notes}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">No notes</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInlineVisitor(booth.id, v.id)}
                                    disabled={deletingVisitorId === v.id}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete visitor"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                Applied on {new Date(booth.createdAt).toLocaleDateString()}
                {booth.isPaid !== false && booth.pricingMode !== 'free' && booth.paidAt && ` • Paid on ${new Date(booth.paidAt).toLocaleDateString()}`}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                {booth.status === 'accepted_awaiting_payment' && booth.isPaid !== false && booth.pricingMode !== 'free' && (
                  <Button
                    variant={booth.latestReceipt?.status === 'PENDING' ? 'outline' : 'primary'}
                    size="sm"
                    icon={<CreditCard className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setPayingBooth(booth);
                      setPaymentError(null);
                      setPaymentSuccess(null);
                    }}
                    className={
                      booth.latestReceipt?.status === 'PENDING'
                        ? ''
                        : 'font-bold bg-indigo-600 hover:bg-indigo-700 text-white'
                    }
                  >
                    {booth.latestReceipt?.status === 'PENDING'
                      ? 'Receipt Pending (View Status)'
                      : booth.latestReceipt?.status === 'FAILED'
                      ? `Resubmit Receipt (${(booth.totalFinalAmount || 0).toLocaleString()} ETB)`
                      : `Continue to Payment (${(booth.totalFinalAmount || 0).toLocaleString()} ETB)`}
                  </Button>
                )}

                {booth.status === 'confirmed' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Users className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenVisitorsList(booth)}
                    >
                      View Visitors ({booth.turnout?.totalVisitorsLogged || 0})
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setLoggingVisitorBooth(booth);
                        setVisitorError(null);
                        setVisitorSuccess(null);
                      }}
                    >
                      Log Booth Visitor
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  ) : (
    /* VIEW 2: CARDS LIST VIEW */
    <div className="space-y-5 animate-fade-in">
      {/* Main Filter Tabs (Removed 'On Booking') */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'dealt' as const, label: 'Dealt Events', count: dealtBooths.length },
          { id: 'awaiting' as const, label: 'Awaiting Organizer Approval', count: awaitingBooths.length },
          { id: 'rejected' as const, label: 'Rejected Events', count: rejectedBooths.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setFilterTab(tab.id);
              setTimeFilter('upcoming');
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === tab.id
                ? 'bg-[#63474D] text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Sub-Filters: Upcoming and Past */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-white border border-[#E8DDD7] rounded-2xl w-fit shadow-2xs">
          <button
            type="button"
            onClick={() => setTimeFilter('upcoming')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeFilter === 'upcoming'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-gray-500 hover:text-[#2D1F23] hover:bg-gray-50'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${timeFilter === 'upcoming' ? 'text-emerald-300' : 'text-gray-400'}`} />
            <span>Upcoming</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                timeFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {upcomingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeFilter('past')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeFilter === 'past'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-gray-500 hover:text-[#2D1F23] hover:bg-gray-50'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${timeFilter === 'past' ? 'text-amber-200' : 'text-gray-400'}`} />
            <span>Past</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                timeFilter === 'past' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {pastCount}
            </span>
          </button>
        </div>

        <span className="text-xs text-gray-400">
          Showing {displayedBooths.length} {timeFilter} {filterTab === 'dealt' ? 'dealt event(s)' : filterTab === 'awaiting' ? 'application(s)' : 'rejected event(s)'}
        </span>
      </div>

      {/* Loading Skeleton */}
      {loading && booths.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-3xl border border-gray-200" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedBooths.length === 0 && (
        <div className="bg-white border border-[#E8DDD7] rounded-3xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F5] flex items-center justify-center mx-auto text-[#63474D]">
            <Store className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-[#2D1F23]">
              {filterTab === 'dealt'
                ? (timeFilter === 'upcoming' ? 'No Upcoming Dealt Events' : 'No Past Dealt Events')
                : filterTab === 'awaiting'
                ? (timeFilter === 'upcoming' ? 'No Upcoming Applications Awaiting Approval' : 'No Past Applications Awaiting Approval')
                : (timeFilter === 'upcoming' ? 'No Upcoming Rejected Applications' : 'No Past Rejected Applications')}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {filterTab === 'dealt' && timeFilter === 'upcoming'
                ? "You don't have any upcoming confirmed booth deals. Browse open events and apply to showcase your products."
                : `No records found in this category.`}
            </p>
          </div>
          <Link to="/exhibitor/explore">
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              Explore Open Events
            </Button>
          </Link>
        </div>
      )}

      {/* Grid of Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedBooths.map((booth) => {
          const isUpcoming = isEventUpcoming(booth.eventDate);
          return (
            <div
              key={booth.id}
              onClick={() => setSelectedBoothId(booth.id)}
              className="bg-white border border-[#E8DDD7] rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer space-y-4"
            >
              <div className="space-y-3.5">
                {/* Event Banner / Poster Header */}
                <div className="relative h-32 rounded-2xl overflow-hidden bg-gray-100">
                  {booth.bannerUrl ? (
                    <img
                      src={booth.bannerUrl}
                      alt={booth.eventTitle || 'Event banner'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#63474D]/15 via-[#AA767C]/10 to-[#FAF7F5] flex items-center justify-center">
                      <Store className="w-9 h-9 text-[#63474D]/40" />
                    </div>
                  )}

                  {/* Time status badge (Upcoming / Past) */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-xs shadow-xs ${
                        isUpcoming
                          ? 'bg-emerald-600/90 text-white'
                          : 'bg-gray-700/85 text-gray-100'
                      }`}
                    >
                      {isUpcoming ? 'Upcoming' : 'Past Event'}
                    </span>
                  </div>

                  {/* Application status badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {booth.status === 'confirmed' || booth.status === 'accepted_awaiting_payment' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 shadow-xs flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Dealt
                      </span>
                    ) : booth.status === 'pending' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-amber-800 shadow-xs flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Awaiting Approval
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-red-800 shadow-xs flex items-center gap-1">
                        <X className="w-3 h-3 text-red-600" /> {booth.status === 'rejected' ? 'Rejected' : 'Cancelled'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Metadata */}
                <div className="space-y-1.5">
                  <h3 className="font-serif font-bold text-base text-[#2D1F23] group-hover:text-[#63474D] transition-colors line-clamp-1">
                    {booth.eventTitle || 'Event Exhibition Space'}
                  </h3>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#AA767C] shrink-0" />
                      <span className="truncate">
                        {booth.eventDate ? new Date(booth.eventDate).toLocaleDateString() : 'Date TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#AA767C] shrink-0" />
                      <span className="truncate">
                        {booth.eventLocation || booth.venueName || 'Venue TBD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booth Quick Meta Pill */}
                <div className="bg-[#FAF7F5] rounded-2xl p-2.5 border border-[#E8DDD7]/70 grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Space</span>
                    <strong className="text-xs text-[#2D1F23] font-semibold">{booth.spaceSqm} m²</strong>
                  </div>
                  <div className="border-x border-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Booth</span>
                    <strong className="text-xs text-[#2D1F23] font-mono">{booth.boothNumber || 'Pending'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Fee</span>
                    <strong className="text-xs text-emerald-700 font-bold">
                      {booth.isPaid === false || booth.pricingMode === 'free'
                        ? 'Free'
                        : `${(booth.totalFinalAmount || 0).toLocaleString()} ETB`}
                    </strong>
                  </div>
                </div>

                {/* Showcase Pitch snippet if any */}
                {booth.showcaseDescription && (
                  <p className="text-[11px] text-gray-500 line-clamp-1 italic">
                    "{booth.showcaseDescription}"
                  </p>
                )}
              </div>

              {/* Card Footer: Applied date + View Details Button */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <span className="text-[10px] text-gray-400">
                  Applied: {new Date(booth.createdAt).toLocaleDateString()}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBoothId(booth.id);
                  }}
                  icon={<Eye className="w-3.5 h-3.5" />}
                  className="text-xs group-hover:bg-[#63474D] group-hover:text-white transition-colors"
                >
                  View Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

      {/* MODAL 1: Payment Modal */}
      {payingBooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setPayingBooth(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 uppercase tracking-wider">
                <CreditCard className="w-3 h-3 text-indigo-600" />
                <span>Application approved — payment required</span>
              </span>
              <h3 className="font-serif font-black text-xl text-[#2D1F23]">
                Booth Payment & Receipt Verification
              </h3>
              <p className="text-xs text-gray-500">
                <strong className="text-[#2D1F23]">{payingBooth.eventTitle}</strong> • {payingBooth.spaceSqm} m² Approved Space
              </p>
            </div>

            {/* Price breakdown according to Section 4 & 5 */}
            <div className="bg-[#FAF7F5] p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Requested Space:</span>
                <span className="font-bold text-[#2D1F23]">{payingBooth.spaceSqm} m²</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Organizer Base Rate:</span>
                <span>{(payingBooth.organizerPricePerSqm || 0).toLocaleString()} ETB / m²</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Organizer Amount:</span>
                <span>{(payingBooth.totalOrganizerAmount || 0).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Sheeba Platform Cut ({payingBooth.sheebaCutPercent || 30}%):</span>
                <span>{(payingBooth.totalCutAmount || 0).toLocaleString()} ETB</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold text-[#2D1F23]">
                <span>Total Amount to Pay:</span>
                <span className="text-emerald-700">{(payingBooth.totalFinalAmount || 0).toLocaleString()} ETB</span>
              </div>
            </div>

            {/* Step 1: Receiving Bank & Mobile Money Accounts */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2D1F23]">
                  Step 1: Transfer fee to Organizer Account
                </label>
                <span className="text-[11px] text-gray-500">Tap account to select destination</span>
              </div>

              {payingBooth.paymentConfig?.instructions && (
                <div className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Organizer Payment Instructions</span>
                  <p className="text-gray-700 whitespace-pre-wrap text-[11px] leading-relaxed">
                    {payingBooth.paymentConfig.instructions}
                  </p>
                </div>
              )}

              {payingBooth.paymentConfig?.destinations && payingBooth.paymentConfig.destinations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {payingBooth.paymentConfig.destinations.map((pm, idx) => {
                    const isSelected = selectedDestinationIndex === idx;
                    const providerNames: Record<string, string> = {
                      cbe: 'Commercial Bank of Ethiopia (CBE)',
                      telebirr: 'Telebirr (Ethio Telecom)',
                      awash: 'Awash Bank',
                      boa: 'Bank of Abyssinia',
                      dashen: 'Dashen Bank',
                      zemen: 'Zemen Bank',
                      other: 'Bank / Mobile Money',
                    };

                    return (
                      <div
                        key={pm.id || idx}
                        onClick={() => setSelectedDestinationIndex(idx)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-white border-[#63474D] shadow-sm ring-2 ring-[#63474D]/25'
                            : 'bg-white/70 border-gray-200 hover:bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-[#63474D]/10 text-[#63474D] text-[10px] font-bold rounded-md uppercase tracking-wider mb-1">
                              {pm.provider.toUpperCase()}
                            </span>
                            <p className="text-xs font-bold text-[#2D1F23]">
                              {pm.label || providerNames[pm.provider.toLowerCase()] || pm.provider}
                            </p>
                            {pm.accountHolder && (
                              <p className="text-[11px] text-gray-500 mt-0.5">Holder: {pm.accountHolder}</p>
                            )}
                          </div>

                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#63474D] text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[#2D1F23] tracking-wide">
                            {pm.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAccount(pm.accountNumber, idx);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 transition cursor-pointer"
                            title="Copy account number"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-gray-500" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-900">
                  <span className="font-bold block">No Direct Accounts Listed</span>
                  <p className="text-[11px] text-amber-800">
                    The organizer has not added specific receiving bank accounts yet. Please contact the event organizer for account details.
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: Verification Evidence */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2D1F23]">
                  Step 2: Submit Payment Evidence for Verification
                </label>
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Links.et Real-time Verification
                </span>
              </div>

              {/* Option Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setPaymentOption('screenshot')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    paymentOption === 'screenshot'
                      ? 'bg-white text-[#2D1F23] shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <UploadCloud className="w-4 h-4 text-[#63474D]" />
                  <span>Option A: Upload Screenshot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOption('reference')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    paymentOption === 'reference'
                      ? 'bg-white text-[#2D1F23] shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#63474D]" />
                  <span>Option B: Reference / URL</span>
                </button>
              </div>

              {/* Option A: Screenshot Upload */}
              {paymentOption === 'screenshot' ? (
                <div className="p-4 bg-white/70 border border-gray-200 rounded-2xl space-y-3 animate-fade-in">
                  <label className="block text-xs font-bold text-[#2D1F23]">
                    Upload Payment Receipt Screenshot <span className="text-red-600">*</span>
                  </label>

                  <div className="space-y-2">
                    <label className="border-2 border-dashed border-gray-300 hover:border-[#63474D] rounded-2xl p-4 text-center block cursor-pointer bg-[#FAF7F5] transition-colors">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleScreenshotSelect}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className="w-9 h-9 rounded-full bg-[#63474D]/10 text-[#63474D] flex items-center justify-center">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-[#63474D]">
                          {screenshotFile ? 'Change receipt screenshot' : 'Click to upload receipt screenshot'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          PNG, JPG, or WEBP (Max 5MB)
                        </span>
                      </div>
                    </label>

                    {isUploadingScreenshot && (
                      <div className="flex items-center gap-2 text-[11px] text-[#63474D] font-semibold py-1">
                        <span className="w-3.5 h-3.5 border-2 border-[#63474D] border-t-transparent rounded-full animate-spin" />
                        <span>Optimizing image and preparing verification payload...</span>
                      </div>
                    )}

                    {screenshotPreview && (
                      <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#2D1F23] truncate max-w-xs">
                            📎 {screenshotFile?.name || 'receipt_screenshot'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setScreenshotFile(null);
                              setScreenshotPreview(null);
                              setScreenshotBase64(null);
                              setScreenshotUrl(null);
                            }}
                            className="text-red-500 hover:text-red-700 text-[11px] font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="w-full max-h-48 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-gray-50">
                          <img
                            src={screenshotPreview}
                            alt="Receipt preview"
                            className="max-h-48 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      💡 <strong>Links.et Automated Bank Verification:</strong> Links.et extracts the transfer reference, recipient account, and amount ({payingBooth.totalFinalAmount.toLocaleString()} ETB) from the screenshot and confirms clearance directly with the bank ledger.
                    </p>
                  </div>
                </div>
              ) : (
                /* Option B: Reference or URL */
                <div className="p-4 bg-white/70 border border-gray-200 rounded-2xl space-y-2 animate-fade-in">
                  <label className="block text-xs font-bold text-[#2D1F23]">
                    Transaction Reference Code or Bank Receipt URL <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. 100098765432 or https://telebirr.et/... or https://apps.cbe.com.et:2018/..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono text-black placeholder:font-sans placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    💡 <strong>Supported formats:</strong> Telebirr 10-character transaction reference code, or full bank web confirmation URL for CBE, Telebirr, Awash, or BOA. Links.et verifies the transaction amount ({payingBooth.totalFinalAmount.toLocaleString()} ETB) directly with the bank ledger.
                  </p>
                </div>
              )}
            </div>

            {/* Receipt History Accordion (if previously submitted) */}
            {boothReceipts.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReceiptHistoryExpanded((prev) => !prev)}
                  className="flex items-center justify-between w-full text-xs font-bold text-[#63474D] hover:underline cursor-pointer py-1"
                >
                  <span>Receipt History ({boothReceipts.length} record{boothReceipts.length === 1 ? '' : 's'})</span>
                  {isReceiptHistoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isReceiptHistoryExpanded && (
                  <div className="space-y-2 pt-2">
                    {boothReceipts.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#2D1F23]">
                              Ref: {rec.transactionReference || rec.transactionId}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.status === 'SETTLED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rec.status === 'SETTLED' ? 'Verified' : rec.status === 'FAILED' ? 'Rejected' : 'Pending'}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {rec.failureReason && (
                          <div className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                            <strong>Rejection Reason:</strong> {rec.failureReason}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-gray-500 capitalize">{rec.paymentMethod || 'Manual transfer'}</span>
                          {rec.screenshotUrl && (
                            <a
                              href={rec.screenshotUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#63474D] font-bold hover:underline"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Receipt File</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Verification Status Messages */}
            {paymentError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5 animate-fade-in shadow-2xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{paymentError}</span>
              </div>
            )}

            {paymentSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-fade-in shadow-2xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{paymentSuccess}</span>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayingBooth(null)}
                disabled={isProcessingPayment}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isProcessingPayment}
                disabled={
                  isProcessingPayment ||
                  (paymentOption === 'screenshot' && !screenshotFile && !screenshotBase64) ||
                  (paymentOption === 'reference' && !paymentReference.trim())
                }
                icon={<ShieldCheck className={`w-3.5 h-3.5 ${isProcessingPayment ? 'animate-spin' : ''}`} />}
                onClick={handleConfirmPayment}
              >
                {isProcessingPayment ? 'Verifying with Links.et...' : 'Verify & Confirm Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Log Visitor Modal */}
      {loggingVisitorBooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-100 relative">
            <button
              type="button"
              onClick={() => setLoggingVisitorBooth(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
                Booth Lead Capture
              </span>
              <h3 className="font-serif font-black text-xl text-[#2D1F23]">
                Log Booth Visitor
              </h3>
              <p className="text-xs text-gray-500">
                Record details of attendees who stop by booth {loggingVisitorBooth.boothNumber || ''} at {loggingVisitorBooth.eventTitle}.
              </p>
            </div>

            {visitorError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{visitorError}</span>
              </div>
            )}

            {visitorSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{visitorSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLogVisitor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#2D1F23] mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe Bikila"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2D1F23] mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="visitor@example.com"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2D1F23] mb-1">Phone</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="0912345678"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(formatPhoneInput(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2D1F23] mb-1">Discussion Notes / Product Interests</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Interested in API integration, requested enterprise quote next week."
                  value={visitorNotes}
                  onChange={(e) => setVisitorNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLoggingVisitorBooth(null)}
                  disabled={isSubmittingVisitor}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingVisitor}
                  disabled={isSubmittingVisitor}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Save Visitor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Visitors & CSV Export Drawer */}
      {viewingVisitorsBooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-100 relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setViewingVisitorsBooth(null)}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
                Booth Lead Roster
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-serif font-black text-xl text-[#2D1F23]">
                  Logged Booth Visitors ({visitorsList.length})
                </h3>
                {visitorsList.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />}
                    onClick={handleExportCSV}
                  >
                    Export CSV
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {viewingVisitorsBooth.eventTitle} • Booth {viewingVisitorsBooth.boothNumber || 'Unassigned'}
              </p>
            </div>

            {isLoadingVisitors ? (
              <div className="py-12 text-center space-y-2 text-gray-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#63474D]" />
                <p>Loading booth visitors...</p>
              </div>
            ) : visitorsList.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-gray-400 text-xs bg-[#FAF7F5] rounded-2xl border border-gray-100">
                <Users className="w-8 h-8 mx-auto text-gray-300" />
                <p className="font-bold text-gray-600">No visitors logged yet for this booth.</p>
                <p>Click "Log Booth Visitor" to record attendees who stop by.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF7F5] border-b border-gray-200 text-[#63474D] text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Visitor Name</th>
                      <th className="py-2.5 px-3">Contact Email</th>
                      <th className="py-2.5 px-3">Contact Phone</th>
                      <th className="py-2.5 px-3">Logged Date</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visitorsList.map((v) => (
                      <tr key={v.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#2D1F23]">
                          {v.visitorName}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {v.visitorEmail ? (
                            <span className="inline-flex items-center gap-1">
                              <span>📧</span> {v.visitorEmail}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {v.visitorPhone ? (
                            <span className="inline-flex items-center gap-1">
                              <span>📞</span> {v.visitorPhone}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap text-[11px]">
                          {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 max-w-xs break-words" title={v.notes || undefined}>
                          {v.notes ? (
                            <span className="bg-[#FAF7F5] px-2 py-1 rounded-md border border-gray-100 inline-block">
                              {v.notes}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No notes</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteVisitor(v.id)}
                            disabled={deletingVisitorId === v.id}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete visitor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewingVisitorsBooth(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
