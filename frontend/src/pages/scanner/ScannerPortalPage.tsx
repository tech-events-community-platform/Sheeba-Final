import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { AssignedScannerEvent } from '../../types/event';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  Camera,
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  ShieldCheck,
  Calendar,
  MapPin,
  Lock,
  User,
  Users,
  ChevronDown,
} from 'lucide-react';

interface VerifiedScannerResult {
  ticket: {
    id: string;
    ticketCode: string;
    status: string;
    rawStatus: string;
    expiresAt?: string;
    isPaid: boolean;
    ticketPrice: number;
    currency: string;
  };
  attendee: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    organization?: string;
    registrationDate: string;
    answers: Record<string, string>;
  };
  checkIn: {
    id: string;
    approvedAt: string;
    approvedBy: string;
  } | null;
  hasAttendedBadge: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  canCheckIn: boolean;
  canUndo: boolean;
  message?: string;
}

interface ScannedAttendeeItem {
  id: string;
  attendeeName: string;
  attendeeEmail?: string;
  ticketCode?: string;
  approvedAt: string;
}

export function extractTicketTokenOrCode(scannedText: string): string {
  const text = (scannedText || '').trim();
  if (!text) return '';

  const tokenParamMatch = text.match(/token=([^&\s\n\r]+)/i);
  if (tokenParamMatch) return decodeURIComponent(tokenParamMatch[1]);

  const tokenLabelMatch = text.match(/Token:\s*([^\s\n\r]+)/i);
  if (tokenLabelMatch) return tokenLabelMatch[1].trim();

  const codeParamMatch = text.match(/code=([^&\s\n\r]+)/i);
  if (codeParamMatch) return decodeURIComponent(codeParamMatch[1]);

  const codeLabelMatch = text.match(/(?:Ticket Code|Ticket|Code|Pass Code):\s*([^\s\n\r]+)/i);
  if (codeLabelMatch) return codeLabelMatch[1].trim();

  const shbMatch = text.match(/SHB-[A-Z0-9]+-[0-9]{4}/i);
  if (shbMatch) return shbMatch[0].trim();

  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      const parsedUrl = new URL(text);
      const token = parsedUrl.searchParams.get('token');
      const code = parsedUrl.searchParams.get('code');
      if (token) return token;
      if (code) return code;
    } catch {}
  }
  return text;
}

export const ScannerPortalPage: React.FC = () => {
  const { user } = useAuth();

  // Multi-event assigned state
  const [assignedEvents, setAssignedEvents] = useState<AssignedScannerEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Active input mode
  const [activeTab, setActiveTab] = useState<'camera' | 'paste' | 'history'>('camera');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera states
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTokenRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  // Manual code input
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Verification result & actions
  const [verifiedResult, setVerifiedResult] = useState<VerifiedScannerResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Undo confirmation modal
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [undoReason, setUndoReason] = useState('Accidental check-in scan');

  // Attendance history & Timezone Privacy states
  const [attendanceData, setAttendanceData] = useState<{
    isEventToday: boolean;
    isEventPassed: boolean;
    totalScannedCount: number;
    attendees: ScannedAttendeeItem[];
    privacyNotice?: string;
  } | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const selectedEvent = assignedEvents.find((e) => e.id === selectedEventId);

  // Audio feedback synthesizer
  const playAudioFeedback = useCallback((type: 'success' | 'duplicate' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'duplicate') {
        osc.frequency.setValueAtTime(554.37, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}

    if (navigator.vibrate) {
      try {
        navigator.vibrate(type === 'success' ? [50] : [100, 50, 100]);
      } catch {}
    }
  }, [soundEnabled]);

  // Load Assigned Events for this Scanner
  const loadMyEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const events: AssignedScannerEvent[] = await api.scanners.getMyAssignedEvents();
      setAssignedEvents(events || []);

      if (events && events.length > 0) {
        // Prefer today's event, or nearest upcoming
        const todayEvt = events.find((e) => e.isEventToday);
        if (todayEvt) {
          setSelectedEventId(todayEvt.id);
        } else {
          setSelectedEventId(events[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load assigned scanner events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadMyEvents();
  }, [loadMyEvents]);

  // Load Attendance data for selected event
  const loadAttendance = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setIsLoadingAttendance(true);
    try {
      const res = await api.scanners.getScannerEventAttendance(eventId);
      setAttendanceData(res);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setIsLoadingAttendance(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadAttendance(selectedEventId);
      setVerifiedResult(null);
      setErrorNotice(null);
      setSuccessNotice(null);
    }
  }, [selectedEventId, loadAttendance]);

  // Discover available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras:', err);
      });
  }, []);

  // Verification
  const handleVerify = useCallback(
    async (tokenOrCode: string) => {
      const cleanTarget = extractTicketTokenOrCode(tokenOrCode);
      if (!selectedEventId || !cleanTarget) return;

      setIsVerifying(true);
      setErrorNotice(null);
      setSuccessNotice(null);

      try {
        const data = await api.checkIn.verifyTicket(selectedEventId, cleanTarget);
        setVerifiedResult(data);

        if (data.canCheckIn) {
          playAudioFeedback('success');
        } else if (data.ticket?.status === 'CHECKED_IN') {
          playAudioFeedback('duplicate');
        } else {
          playAudioFeedback('error');
        }
      } catch (err: any) {
        playAudioFeedback('error');
        setErrorNotice(err?.message || 'Invalid or unrecognizable ticket code.');
        setVerifiedResult(null);
      } finally {
        setIsVerifying(false);
      }
    },
    [selectedEventId, playAudioFeedback]
  );

  // Start Camera Scanning
  const startCamera = useCallback(async () => {
    if (!selectedCameraId) return;
    setCameraError(null);

    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }

      const qrScanner = new Html5Qrcode('scanner-viewport');
      html5QrCodeRef.current = qrScanner;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        selectedCameraId,
        config,
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScannedTokenRef.current && now - lastScanTimestampRef.current < 2500) {
            return;
          }
          lastScannedTokenRef.current = decodedText;
          lastScanTimestampRef.current = now;
          handleVerify(decodedText);
        },
        () => {}
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraError(err?.message || 'Unable to access camera. Please allow camera permissions.');
      setIsCameraActive(false);
    }
  }, [selectedCameraId, handleVerify]);

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      setIsCameraActive(false);
    }
  }, [isCameraActive]);

  useEffect(() => {
    if (activeTab === 'camera' && selectedCameraId && selectedEventId) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, selectedCameraId, selectedEventId, startCamera, stopCamera]);

  // Check-In Attendee
  const handleCheckIn = async () => {
    if (!selectedEventId || !verifiedResult?.attendee?.id) return;
    setIsCheckingIn(true);
    setErrorNotice(null);

    try {
      const res = await api.checkIn.markAttended({
        eventId: selectedEventId,
        attendeeId: verifiedResult.attendee.id,
      });

      playAudioFeedback('success');
      setSuccessNotice(`Checked in ${verifiedResult.attendee.name}!`);

      // Update verified state
      setVerifiedResult((prev) =>
        prev
          ? {
              ...prev,
              canCheckIn: false,
              canUndo: true,
              hasAttendedBadge: true,
              ticket: { ...prev.ticket, status: 'CHECKED_IN' },
              checkIn: {
                id: (res as any)?.checkInId || (res as any)?.checkIn?.id || `ci_${Date.now()}`,
                approvedAt: new Date().toISOString(),
                approvedBy: user?.name || 'Gate Scanner',
              },
            }
          : null
      );

      // Increment event local counts and refetch attendance
      setAssignedEvents((prev) =>
        prev.map((e) =>
          e.id === selectedEventId ? { ...e, myScannedCount: e.myScannedCount + 1 } : e
        )
      );
      loadAttendance(selectedEventId);
    } catch (err: any) {
      playAudioFeedback('error');
      setErrorNotice(err?.message || 'Check-in failed. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Undo Check-In
  const handleUndoCheckIn = async () => {
    if (!selectedEventId || !verifiedResult?.attendee?.id) return;
    setIsUndoing(true);
    setErrorNotice(null);

    try {
      await api.checkIn.undo({
        eventId: selectedEventId,
        attendeeId: verifiedResult.attendee.id,
        reason: undoReason,
      });

      playAudioFeedback('success');
      setSuccessNotice(`Reverted check-in for ${verifiedResult.attendee.name}.`);
      setIsUndoModalOpen(false);

      setVerifiedResult((prev) =>
        prev
          ? {
              ...prev,
              canCheckIn: true,
              canUndo: false,
              hasAttendedBadge: false,
              ticket: { ...prev.ticket, status: 'ISSUED' },
              checkIn: null,
            }
          : null
      );

      setAssignedEvents((prev) =>
        prev.map((e) =>
          e.id === selectedEventId ? { ...e, myScannedCount: Math.max(0, e.myScannedCount - 1) } : e
        )
      );
      loadAttendance(selectedEventId);
    } catch (err: any) {
      playAudioFeedback('error');
      setErrorNotice(err?.message || 'Failed to undo check-in.');
    } finally {
      setIsUndoing(false);
    }
  };

  if (isLoadingEvents) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <RefreshCw className="w-8 h-8 text-[#63474D] animate-spin" />
        <p className="text-xs font-bold text-[#756366]">Loading assigned gate events...</p>
      </div>
    );
  }

  if (assignedEvents.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-white border border-[#E8DDD7] rounded-3xl p-8 shadow-xs">
        <div className="w-14 h-14 rounded-full bg-[#FAF7F5] border border-[#E8DDD7] flex items-center justify-center mx-auto text-[#63474D]">
          <QrCode className="w-7 h-7" />
        </div>
        <h2 className="font-serif font-bold text-xl text-[#2D1F23]">No Active Scanner Assignments</h2>
        <p className="text-xs text-[#756366] leading-relaxed max-w-md mx-auto">
          You are not currently assigned as an active scanner for any events. When an event organizer adds your email address to manage door check-ins, the event will appear here automatically.
        </p>
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={loadMyEvents}
            className="text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Check for Assignments
          </Button>
        </div>
      </div>
    );
  }

  const filteredHistory = (attendanceData?.attendees || []).filter((att) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      att.attendeeName.toLowerCase().includes(q) ||
      (att.ticketCode && att.ticketCode.toLowerCase().includes(q)) ||
      (att.attendeeEmail && att.attendeeEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Event Selector & Door Status Card */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF7F5] text-[#63474D] border border-[#E8DDD7]">
                Assigned Event
              </span>
              {selectedEvent?.isEventToday && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  🔴 Live Today
                </span>
              )}
            </div>

            {/* Event Dropdown Selector */}
            <div className="relative inline-block">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="font-serif font-bold text-lg sm:text-xl text-[#2D1F23] bg-transparent border-b border-[#E8DDD7] pr-8 py-1 focus:outline-none focus:border-[#63474D] cursor-pointer"
              >
                {assignedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} {ev.isEventToday ? '(Today)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#756366] absolute right-0 top-3 pointer-events-none" />
            </div>

            {selectedEvent && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#756366] pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#63474D]" />
                  {selectedEvent.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#63474D]" />
                  {selectedEvent.timeStr || 'All Day'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#63474D]" />
                  {selectedEvent.venueName || selectedEvent.location}
                </span>
                <span className="font-semibold text-[#63474D]">
                  Org: {selectedEvent.organizerName}
                </span>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-[#FAF7F5] border border-[#E8DDD7] px-4 py-2.5 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-[#756366] uppercase">Your Scans</span>
              <span className="font-bold text-base sm:text-lg text-[#63474D]">
                {selectedEvent?.myScannedCount || 0}
              </span>
            </div>

            <div className="bg-[#FAF7F5] border border-[#E8DDD7] px-4 py-2.5 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-[#756366] uppercase">Total Checked In</span>
              <span className="font-bold text-base sm:text-lg text-[#2D1F23]">
                {selectedEvent?.totalAttendeesCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Scanner / Right Verification & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scanner Mode Tabs & Video Viewport (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E8DDD7] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-[#E8DDD7] pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-[#63474D] text-white shadow-2xs'
                    : 'text-[#756366] hover:bg-[#FAF7F5]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-[#63474D] text-white shadow-2xs'
                    : 'text-[#756366] hover:bg-[#FAF7F5]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Manual Code</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-[#63474D] text-white shadow-2xs'
                    : 'text-[#756366] hover:bg-[#FAF7F5]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Scanned List ({attendanceData?.totalScannedCount || 0})</span>
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-[#756366] hover:text-[#2D1F23] rounded-lg hover:bg-[#FAF7F5] transition"
              title={soundEnabled ? 'Mute scan tones' : 'Unmute scan tones'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          {/* Mode 1: Camera Viewport */}
          {activeTab === 'camera' && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-black border-2 border-[#63474D]/20 shadow-inner flex items-center justify-center">
                <div id="scanner-viewport" className="w-full h-full object-cover"></div>

                {!isCameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 p-4 space-y-2 bg-black/60">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <p className="text-xs font-semibold">Starting camera stream...</p>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-red-300 p-6 space-y-2 bg-black/80 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                    <p className="text-xs font-semibold">{cameraError}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={startCamera}
                      className="text-xs text-white border-white/40 mt-2"
                    >
                      Retry Camera
                    </Button>
                  </div>
                )}
              </div>

              {/* Camera selection dropdown */}
              {cameras.length > 1 && (
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="text-[#756366]">Switch Camera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="px-2 py-1 bg-[#FAF7F5] border border-[#E8DDD7] rounded-lg text-[#2D1F23] focus:outline-none"
                  >
                    {cameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Camera ${cam.id.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Manual Code Input */}
          {activeTab === 'paste' && (
            <div className="space-y-4 py-4 animate-fade-in max-w-md mx-auto">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#2D1F23]">
                  Enter Ticket Code or Paste Token
                </label>
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerify(manualCodeInput);
                    }
                  }}
                  placeholder="e.g. SHB-XXXX-XXXX or token"
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white font-mono"
                />
                <p className="text-[11px] text-[#756366]">
                  Supports 12-character short ticket passes and raw JWT token strings.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => handleVerify(manualCodeInput)}
                disabled={isVerifying || !manualCodeInput.trim()}
                className="w-full bg-[#63474D] text-white hover:bg-[#523A3F] text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Verifying Pass...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Lookup Ticket
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Mode 3: Attendance History & Timezone-Gated Privacy View */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fade-in">
              {attendanceData?.isEventToday ? (
                // Live Event Day List
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D1F23]">
                      Attendees Checked In Today ({filteredHistory.length})
                    </span>
                    <input
                      type="text"
                      placeholder="Search scanned attendees..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none max-w-[200px]"
                    />
                  </div>

                  {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center text-[#756366] text-xs bg-[#FAF7F5] rounded-2xl border border-dashed border-[#E8DDD7]">
                      No scanned attendees match your query today.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E8DDD7]/60 max-h-80 overflow-y-auto pr-1">
                      {filteredHistory.map((att) => (
                        <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-[#2D1F23]">{att.attendeeName}</p>
                            <p className="text-[11px] text-[#756366]">
                              {att.ticketCode} • {att.attendeeEmail}
                            </p>
                          </div>
                          <span className="text-[10px] text-[#AA767C] font-semibold">
                            {new Date(att.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Post-Event Privacy Sealed Banner (Specification v2.1)
                <div className="p-6 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-[#2D1F23]">Attendee Data Privacy Sealed</h4>
                  <p className="text-xs text-[#756366] leading-relaxed max-w-sm mx-auto">
                    {attendanceData?.privacyNotice ||
                      'In accordance with attendee data protection rules, individual attendee details are only accessible on the day of the event.'}
                  </p>
                  <div className="pt-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E8DDD7] text-xs">
                      <span className="text-[#756366]">Total Attendees Scanned by You:</span>
                      <strong className="text-[#63474D] font-bold text-sm">
                        {attendanceData?.totalScannedCount || 0}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Verification Results & Check-In Action (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Notifications */}
          {successNotice && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="flex-1 font-semibold">{successNotice}</span>
            </div>
          )}

          {errorNotice && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-2.5 text-xs animate-fade-in">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="flex-1">{errorNotice}</span>
            </div>
          )}

          {/* Verification Inspection Card */}
          {verifiedResult ? (
            <div className="bg-white border border-[#E8DDD7] rounded-3xl p-6 space-y-5 shadow-xs animate-fade-in">
              {/* Status Header Badge */}
              <div className="flex items-center justify-between border-b border-[#E8DDD7] pb-4">
                <span className="text-xs font-bold text-[#756366]">Ticket Inspection</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    verifiedResult.canCheckIn
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : verifiedResult.ticket?.status === 'CHECKED_IN'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {verifiedResult.canCheckIn
                    ? '✓ Valid for Entry'
                    : verifiedResult.ticket?.status === 'CHECKED_IN'
                    ? '⚠️ Already Checked In'
                    : '✕ Invalid / Expired'}
                </span>
              </div>

              {/* Attendee Profile Row */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#63474D] text-white flex items-center justify-center font-bold text-base shrink-0 overflow-hidden">
                  {verifiedResult.attendee.avatarUrl ? (
                    <img
                      src={verifiedResult.attendee.avatarUrl}
                      alt={verifiedResult.attendee.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    verifiedResult.attendee.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-base text-[#2D1F23] truncate">
                    {verifiedResult.attendee.name}
                  </h3>
                  <p className="text-xs text-[#756366] truncate">{verifiedResult.attendee.email}</p>
                  {verifiedResult.attendee.phone && (
                    <p className="text-[11px] text-[#756366]">{verifiedResult.attendee.phone}</p>
                  )}
                </div>
              </div>

              {/* Pass Details Box */}
              <div className="bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#756366]">Pass Code:</span>
                  <span className="font-mono font-bold text-[#63474D]">{verifiedResult.ticket.ticketCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#756366]">Admission:</span>
                  <span className="font-bold text-[#2D1F23]">
                    {verifiedResult.ticket.isPaid ? `${verifiedResult.ticket.ticketPrice} ETB` : 'Free Admission'}
                  </span>
                </div>
                {verifiedResult.checkIn && (
                  <div className="flex justify-between pt-1 border-t border-[#E8DDD7]">
                    <span className="text-[#756366]">Checked In At:</span>
                    <span className="font-semibold text-emerald-800">
                      {new Date(verifiedResult.checkIn.approvedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Registration Answers (if any) */}
              {Object.keys(verifiedResult.attendee.answers || {}).length > 0 && (
                <div className="space-y-1.5 pt-1 text-xs">
                  <span className="text-[11px] font-bold text-[#756366] uppercase">Registration Answers:</span>
                  <div className="bg-[#FAF7F5] rounded-xl p-3 space-y-1.5 border border-[#E8DDD7]">
                    {Object.entries(verifiedResult.attendee.answers).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="text-[#756366] truncate">{key}:</span>
                        <span className="font-bold text-[#2D1F23] text-right truncate">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {verifiedResult.canCheckIn && (
                  <Button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    className="w-full bg-[#2A7B5F] hover:bg-[#236850] text-white text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isCheckingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Confirming Check-In...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Check In Attendee
                      </>
                    )}
                  </Button>
                )}

                {verifiedResult.canUndo && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUndoModalOpen(true)}
                    className="w-full border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Undo Check-In
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E8DDD7] rounded-3xl p-8 text-center space-y-3 shadow-xs">
              <QrCode className="w-10 h-10 text-[#AA767C] mx-auto opacity-60" />
              <h3 className="font-serif font-bold text-base text-[#2D1F23]">Ready to Scan Passes</h3>
              <p className="text-xs text-[#756366] leading-relaxed max-w-xs mx-auto">
                Point your camera at an attendee's QR ticket pass or type their ticket code to verify their admission.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Undo Modal */}
      <Modal
        isOpen={isUndoModalOpen}
        onClose={() => !isUndoing && setIsUndoModalOpen(false)}
        title="Undo Attendee Check-In"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#756366] leading-relaxed">
            Are you sure you want to revert check-in for <strong>{verifiedResult?.attendee.name}</strong>? This will revoke their door admission badge and mark their ticket as unused.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2D1F23]">Reason for Undo:</label>
            <input
              type="text"
              value={undoReason}
              onChange={(e) => setUndoReason(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUndoModalOpen(false)}
              disabled={isUndoing}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUndoCheckIn}
              disabled={isUndoing}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-xl"
            >
              {isUndoing ? 'Reverting...' : 'Confirm Undo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
