import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { IExhibitorBooth, IExhibitorBoothVisitor, IBoothReceipt } from '../../types/exhibitor';
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
} from 'lucide-react';
import { uploadToCloudinary, fileToDataUrl } from '../../utils/cloudinary';

export const ExhibitorBoothsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [booths, setBooths] = useState<IExhibitorBooth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'confirmed' | 'pending' | 'awaiting_payment' | 'rejected'>('all');

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

  // Auto-open payment modal if navigated with payBoothId
  useEffect(() => {
    if (!loading && booths.length > 0) {
      const payBoothId = searchParams.get('payBoothId');
      if (payBoothId) {
        const target = booths.find((b) => b.id === payBoothId);
        if (target && target.status === 'accepted_awaiting_payment') {
          setPayingBooth(target);
          setFilterTab('awaiting_payment');
        }
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('payBoothId');
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [loading, booths, searchParams, setSearchParams]);

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
      // Refresh count
      fetchBooths();
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

  const filteredBooths = booths.filter((b) => {
    if (filterTab === 'confirmed') return b.status === 'confirmed';
    if (filterTab === 'pending') return b.status === 'pending';
    if (filterTab === 'awaiting_payment') return b.status === 'accepted_awaiting_payment';
    if (filterTab === 'rejected') return b.status === 'rejected' || b.status === 'cancelled';
    return true;
  });

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

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'all', label: 'All Bookings', count: booths.length },
          { id: 'confirmed', label: 'Confirmed (Paid)', count: booths.filter((b) => b.status === 'confirmed').length },
          { id: 'awaiting_payment', label: 'Awaiting Payment', count: booths.filter((b) => b.status === 'accepted_awaiting_payment').length },
          { id: 'pending', label: 'Under Review', count: booths.filter((b) => b.status === 'pending').length },
          { id: 'rejected', label: 'Rejected / Cancelled', count: booths.filter((b) => b.status === 'rejected' || b.status === 'cancelled').length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id as any)}
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

      {/* Loading Skeleton */}
      {loading && booths.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-3xl border border-gray-200" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredBooths.length === 0 && (
        <div className="bg-white border border-[#E8DDD7] rounded-3xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F5] flex items-center justify-center mx-auto text-[#63474D]">
            <Store className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No booth bookings found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {filterTab === 'all'
                ? "You haven't submitted any exhibitor booth applications yet. Browse open events and apply to showcase your products."
                : `No booth records matching filter "${filterTab}".`}
            </p>
          </div>
          <Link to="/exhibitor/explore">
            <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              Explore Open Events
            </Button>
          </Link>
        </div>
      )}

      {/* Booth Cards */}
      <div className="space-y-4">
        {filteredBooths.map((booth) => (
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
                  {booth.status === 'confirmed' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Confirmed & Active
                    </span>
                  ) : booth.status === 'accepted_awaiting_payment' ? (
                    booth.latestReceipt?.status === 'PENDING' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Receipt Under Review
                      </span>
                    ) : booth.latestReceipt?.status === 'FAILED' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-600" /> Receipt Rejected • Resubmit
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Accepted • Awaiting Payment
                      </span>
                    )
                  ) : booth.status === 'pending' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Under Review
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1">
                      <X className="w-3 h-3" /> {booth.status === 'rejected' ? 'Rejected' : 'Cancelled'}
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
                <div className="w-px h-6 bg-gray-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Total</span>
                  <strong className="text-xs text-emerald-700 font-bold">
                    {(booth.totalFinalAmount || 0).toLocaleString()} ETB
                  </strong>
                </div>
              </div>
            </div>

            {/* Dedicated Applicant Status Banners */}
            {booth.status === 'accepted_awaiting_payment' && (
              <div className="p-4 bg-indigo-50/90 border border-indigo-200 rounded-2xl space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
                    <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Application approved — payment required</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/80 text-indigo-900 border border-indigo-300 w-max">
                    {booth.spaceSqm} m² Floor Space Allocated
                  </span>
                </div>
                <p className="text-indigo-900 text-xs leading-relaxed">
                  Your application has been approved by the event organizer. The total booth fee due from the server is{' '}
                  <strong className="text-emerald-700 text-sm font-serif">
                    {(booth.totalFinalAmount || 0).toLocaleString()} ETB
                  </strong>.
                </p>
                <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Next step:</strong> Click <strong>"Continue to Payment"</strong> below to review the organizer's payment accounts and submit your bank receipt for verification. Your booth will become <strong>Confirmed</strong> only after payment is verified.
                  </div>
                </div>
                {booth.latestReceipt?.status === 'PENDING' && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Receipt submitted (Ref: {booth.latestReceipt.transactionReference || 'N/A'}). Currently awaiting organizer review.</span>
                  </div>
                )}
                {booth.latestReceipt?.status === 'FAILED' && (
                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-900 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Previous receipt was rejected: {booth.latestReceipt.failureReason || 'Please resubmit a valid receipt.'}</span>
                  </div>
                )}
              </div>
            )}

            {booth.status === 'pending' && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Application Pending Organizer Review</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Your application has been received and is currently under review by the organizer. Your floor space is not yet confirmed and no payment is due at this time.
                </p>
              </div>
            )}

            {booth.status === 'confirmed' && (
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-1 text-xs text-emerald-950">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Booth confirmed</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Your booth space is fully settled and confirmed! Booth #{booth.boothNumber || 'Assigned'} ({booth.spaceSqm} m²).
                </p>
              </div>
            )}

            {booth.status === 'rejected' && (
              <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl space-y-1 text-xs text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-900">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Application Declined</span>
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  {booth.rejectionReason
                    ? `Reason: "${booth.rejectionReason}"`
                    : 'Your booth application was declined by the organizer.'}
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
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Space & Pricing Tier</span>
                      <strong className="text-[#2D1F23] block">{booth.spaceSqm} m² floor space</strong>
                      <span className="text-gray-500 text-[11px] block capitalize">Mode: {booth.pricingMode?.replace('_', ' ') || 'per sqm'}</span>
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
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                Applied on {new Date(booth.createdAt).toLocaleDateString()}
                {booth.paidAt && ` • Paid on ${new Date(booth.paidAt).toLocaleDateString()}`}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                {booth.status === 'accepted_awaiting_payment' && (
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
        ))}
      </div>

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
                    placeholder="+251 9..."
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
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
              <div className="overflow-y-auto space-y-2.5 pr-1 divide-y divide-gray-100 flex-1">
                {visitorsList.map((v) => (
                  <div key={v.id} className="pt-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-[#2D1F23] font-bold">{v.visitorName}</strong>
                        <span className="text-[10px] text-gray-400">
                          {new Date(v.createdAt).toLocaleDateString()} at {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-gray-500 text-[11px] flex flex-wrap gap-2">
                        {v.visitorEmail && <span>📧 {v.visitorEmail}</span>}
                        {v.visitorPhone && <span>📞 {v.visitorPhone}</span>}
                      </div>
                      {v.notes && (
                        <p className="text-gray-700 text-[11px] bg-[#FAF7F5] p-2 rounded-xl border border-gray-100 mt-1">
                          {v.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteVisitor(v.id)}
                      disabled={deletingVisitorId === v.id}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer shrink-0"
                      title="Delete visitor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
