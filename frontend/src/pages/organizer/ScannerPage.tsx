import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
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
  Award,
  ArrowLeft,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  HelpCircle,
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

interface SearchAttendeeItem {
  id: string;
  attendeeId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  ticketCode?: string;
  ticketStatus?: string;
  isCheckedIn: boolean;
  checkInTime?: string;
  registrationDate: string;
  hasAttendedBadge: boolean;
  answers: Record<string, string>;
}

// Helper to extract clean token or short code from URLs, queries, or raw strings
export function extractTicketTokenOrCode(scannedText: string): string {
  const text = (scannedText || '').trim();
  if (!text) return '';
  if (text.includes('token=')) {
    const match = text.match(/token=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  if (text.includes('code=')) {
    const match = text.match(/code=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
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

export const ScannerPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Core event state
  const [event, setEvent] = useState<Event | null>(null);

  // Active input mode: camera | paste | search
  const [activeTab, setActiveTab] = useState<'camera' | 'paste' | 'search'>('camera');

  // Audio & Haptics preferences
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera scanner states
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTokenRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  // Paste / Manual code states
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Search by name/email states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchAttendeeItem[]>([]);
  const [isSearchingAttendees, setIsSearchingAttendees] = useState(false);

  // Verification result & action states
  const [verifiedResult, setVerifiedResult] = useState<VerifiedScannerResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Soft-Void Confirmation Modal
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('Accidental check-in scan');

  // Audio synthesis helper for feedback
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
        // High pleasant ding
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'duplicate') {
        // Double warning tone
        osc.frequency.setValueAtTime(554.37, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        // Low error buzz
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

  // Load Event Details
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) return;
      try {
        const ev = await api.events.getById(eventId);
        setEvent(ev || null);
      } catch (err) {
        console.error('Failed to load event details:', err);
      }
    };
    loadEvent();
  }, [eventId]);

  // Discover available video cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment (back) camera if available
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras:', err);
      });
  }, []);

  // Verify a token or short code
  const handleVerify = useCallback(async (tokenOrCode: string) => {
    const cleanTarget = extractTicketTokenOrCode(tokenOrCode);
    if (!eventId || !cleanTarget) return;

    setIsVerifying(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const data = await api.checkin.verifyTicket(eventId, cleanTarget);
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
      const msg = err.data?.message || err.message || 'Ticket verification failed.';
      setErrorNotice(msg);
      setVerifiedResult(null);
    } finally {
      setIsVerifying(false);
    }
  }, [eventId, playAudioFeedback]);

  // Camera Scanner lifecycle
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsCameraActive(false);
  }, []);

  const startScanner = useCallback(async (camId?: string) => {
    if (!eventId) return;
    setCameraError(null);

    // Stop any existing scanner
    await stopScanner();

    const targetCameraId = camId || selectedCameraId;

    try {
      const qrScanner = new Html5Qrcode('sheba-qr-reader');
      html5QrCodeRef.current = qrScanner;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      const cameraParam = targetCameraId
        ? { deviceId: { exact: targetCameraId } }
        : { facingMode: 'environment' };

      await qrScanner.start(
        cameraParam,
        config,
        (decodedText) => {
          const now = Date.now();
          // Avoid duplicate triggers within 2 seconds for same string
          if (
            decodedText === lastScannedTokenRef.current &&
            now - lastScanTimestampRef.current < 2000
          ) {
            return;
          }
          lastScannedTokenRef.current = decodedText;
          lastScanTimestampRef.current = now;
          handleVerify(decodedText);
        },
        () => {
          // Ignore individual frame recognition misses
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      setCameraError(
        err.message || 'Camera permission denied or camera not accessible on this device.'
      );
      setIsCameraActive(false);
    }
  }, [eventId, selectedCameraId, handleVerify, stopScanner]);

  // Auto-start or stop camera when tab changes
  useEffect(() => {
    if (activeTab === 'camera') {
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [activeTab, selectedCameraId, startScanner, stopScanner]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Perform Atomic Check-In
  const handleConfirmCheckIn = async () => {
    if (!verifiedResult || !eventId) return;

    setIsCheckingIn(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const res = await api.checkin.markAttended({
        eventId,
        attendeeId: verifiedResult.attendee.id,
      });

      playAudioFeedback('success');
      setSuccessNotice(`Check-in confirmed! Attended badge awarded to ${verifiedResult.attendee.name}.`);

      // Update result card state locally
      const now = new Date();
      setVerifiedResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ticket: {
            ...prev.ticket,
            status: 'CHECKED_IN',
            rawStatus: 'CHECKED_IN',
          },
          checkIn: {
            id: res.checkInId || res.data?.checkInId || 'ci-new',
            approvedAt: now.toISOString(),
            approvedBy: user?.name || 'Organizer',
          },
          hasAttendedBadge: true,
          canCheckIn: false,
          canUndo: true,
        };
      });

      // Refresh event count
      if (event) {
        setEvent({
          ...event,
          checkedInCount: (event.checkedInCount || 0) + 1,
        });
      }
    } catch (err: any) {
      playAudioFeedback('error');
      const msg = err.data?.message || err.message || 'Failed to complete check-in.';
      setErrorNotice(msg);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Perform Soft-Void Undo Check-In
  const handleConfirmSoftVoid = async () => {
    if (!verifiedResult || !eventId) return;

    setIsUndoing(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      await api.checkin.undo({
        eventId,
        attendeeId: verifiedResult.attendee.id,
        reason: voidReason,
      });

      playAudioFeedback('success');
      setSuccessNotice(`Check-in soft-voided for ${verifiedResult.attendee.name}. Ticket status reset to ISSUED.`);
      setIsVoidModalOpen(false);

      // Update result card state locally
      setVerifiedResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ticket: {
            ...prev.ticket,
            status: 'ISSUED',
            rawStatus: 'ISSUED',
          },
          checkIn: null,
          hasAttendedBadge: false,
          canCheckIn: !prev.isExpired && !prev.isCancelled,
          canUndo: false,
        };
      });

      // Refresh event count
      if (event && (event.checkedInCount || 0) > 0) {
        setEvent({
          ...event,
          checkedInCount: (event.checkedInCount || 1) - 1,
        });
      }
    } catch (err: any) {
      playAudioFeedback('error');
      const msg = err.data?.message || err.message || 'Failed to undo check-in.';
      setErrorNotice(msg);
    } finally {
      setIsUndoing(false);
    }
  };

  // Reset to scan next attendee
  const handleResetForNext = () => {
    setVerifiedResult(null);
    setErrorNotice(null);
    setSuccessNotice(null);
    setManualCodeInput('');
    lastScannedTokenRef.current = '';
  };

  // Live Attendee Search query
  useEffect(() => {
    if (activeTab !== 'search' || !searchQuery.trim() || !eventId) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAttendees(true);
      try {
        const results = await api.checkin.searchAttendees(eventId, searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Failed to search attendees:', err);
      } finally {
        setIsSearchingAttendees(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, eventId]);

  return (
    <div className="min-h-screen bg-[#FAF7F5] py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Event Navigation */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to={eventId ? `/organizer/events/${eventId}` : '/organizer/events'}
              className="p-2 text-[#756366] hover:text-[#2D1F23] hover:bg-[#FAF7F5] rounded-xl transition-colors"
              title="Back to Event"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A2666F] bg-[#F4EFEB] px-2.5 py-0.5 rounded-full">
                  Door Duty Scanner
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[#2A7B5F] font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  HMAC Verified
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-[#2D1F23] mt-1">
                {event ? event.title : 'Event Scanner'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[#756366] mt-1">
                {event && (
                  <>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#A2666F]" />
                      {event.date} • {event.time}
                    </span>
                    <span>•</span>
                    <span>{event.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {event && (
              <div className="bg-[#FAF7F5] px-4 py-2 rounded-xl border border-[#E8DDD7] text-right">
                <div className="text-xs text-[#756366] font-medium">Turnout</div>
                <div className="text-lg font-bold text-[#631A86]">
                  {event.checkedInCount || 0}{' '}
                  <span className="text-xs font-normal text-[#756366]">/ {event.registeredCount || 0}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}
              title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <Link to={`/organizer/check-in/${eventId}`}>
              <Button variant="outline" size="sm">
                Roster Table
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Scanner / Inputs, Right Verification Card */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3 Input Methods */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Method Selection Tabs */}
          <div className="bg-white p-1.5 rounded-2xl border border-[#E8DDD7] shadow-xs flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('camera');
                setErrorNotice(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'camera'
                  ? 'bg-[#631A86] text-white shadow-xs'
                  : 'text-[#756366] hover:text-[#2D1F23] hover:bg-[#FAF7F5]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('paste');
                setErrorNotice(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'paste'
                  ? 'bg-[#631A86] text-white shadow-xs'
                  : 'text-[#756366] hover:text-[#2D1F23] hover:bg-[#FAF7F5]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Code / Token</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('search');
                setErrorNotice(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'search'
                  ? 'bg-[#631A86] text-white shadow-xs'
                  : 'text-[#756366] hover:text-[#2D1F23] hover:bg-[#FAF7F5]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Attendee</span>
            </button>
          </div>

          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col gap-4">
              {cameras.length > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#756366]">Switch Camera:</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      startScanner(e.target.value);
                    }}
                    className="text-xs py-1.5 px-3 rounded-xl border border-[#E8DDD7] bg-[#FAF7F5] text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#631A86]"
                  >
                    {cameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Camera ${cam.id.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Viewfinder Target Container */}
              <div className="relative w-full aspect-square bg-[#0E0622] rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-[#E8DDD7]">
                <div id="sheba-qr-reader" className="w-full h-full object-cover"></div>

                {/* Pulsing Scanning Reticle Overlay */}
                {isCameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-dashed border-[#F45866] rounded-2xl relative animate-pulse flex items-center justify-center">
                      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                      <span className="text-xs font-bold text-white/80 bg-black/60 px-3 py-1 rounded-full shadow-xs">
                        Align Attendee QR Here
                      </span>
                    </div>
                  </div>
                )}

                {/* Camera Permission / Error Overlay */}
                {cameraError && (
                  <div className="absolute inset-0 bg-[#0E0622]/90 flex flex-col items-center justify-center p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-[#F45866] mb-3" />
                    <h4 className="text-white font-bold text-sm mb-1">Camera Access Issue</h4>
                    <p className="text-xs text-gray-300 max-w-xs mb-4">{cameraError}</p>
                    <Button
                      size="sm"
                      onClick={() => startScanner()}
                      className="bg-[#631A86] hover:bg-[#521370] text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Loading / Verifying indicator over camera */}
                {isVerifying && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#F45866] mb-2" />
                    <span className="text-sm font-bold">Verifying Signature...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-[#756366] px-1">
                <span>⚡ Auto-reads upon alignment</span>
                {isCameraActive ? (
                  <button
                    onClick={stopScanner}
                    className="text-amber-700 hover:text-amber-900 font-semibold"
                  >
                    Pause Camera
                  </button>
                ) : (
                  <button
                    onClick={() => startScanner()}
                    className="text-[#631A86] hover:text-[#521370] font-semibold"
                  >
                    Resume Camera
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Paste / Short Code */}
          {activeTab === 'paste' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#756366] mb-1.5">
                  Ticket Code or Signed Token
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerify(manualCodeInput);
                    }}
                    placeholder="e.g. SHB-8921-2026 or paste signed JWT"
                    className="w-full py-3 pl-4 pr-10 text-sm bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-[#2D1F23] font-mono focus:outline-none focus:ring-2 focus:ring-[#631A86]"
                  />
                  {manualCodeInput && (
                    <button
                      onClick={() => setManualCodeInput('')}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#756366] mt-1.5">
                  Accepts short ticket code (e.g. <code>SHB-A7K2-2026</code>) or full signed QR payload.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleVerify(manualCodeInput)}
                  disabled={!manualCodeInput.trim() || isVerifying}
                  className="flex-1 bg-[#631A86] hover:bg-[#521370] text-white"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Verify Ticket
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setManualCodeInput(text);
                        handleVerify(text);
                      }
                    } catch {
                      alert('Please grant clipboard permission or paste manually.');
                    }
                  }}
                  title="Paste from clipboard"
                >
                  Paste
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: Search by Name or Email */}
          {activeTab === 'search' && (
            <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#756366] mb-1.5">
                  Search Registered Attendees
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#756366] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type attendee full name or email..."
                    className="w-full py-3 pl-10 pr-4 text-sm bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#631A86]"
                  />
                  {isSearchingAttendees && (
                    <RefreshCw className="w-4 h-4 text-[#A2666F] absolute right-3.5 top-3.5 animate-spin" />
                  )}
                </div>
              </div>

              {/* Autocomplete Search Results */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleVerify(item.ticketCode || item.name)}
                      className="p-3 bg-[#FAF7F5] hover:bg-[#F4EFEB] rounded-xl border border-[#E8DDD7] cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#631A86] text-white flex items-center justify-center font-bold text-xs">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#2D1F23]">{item.name}</div>
                          <div className="text-xs text-[#756366]">{item.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.isCheckedIn ? (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            Checked In
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                            {item.ticketCode || 'Registered'}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                ) : searchQuery.trim() && !isSearchingAttendees ? (
                  <div className="text-center py-6 text-xs text-[#756366]">
                    No registered attendee found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[#756366]">
                    Start typing to search registered attendees for this event.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Result Card & Inspection */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Notifications / Alerts */}
          {errorNotice && (
            <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-800 animate-fade-in">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold">Scan Rejection</div>
                <div>{errorNotice}</div>
              </div>
            </div>
          )}

          {successNotice && (
            <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl flex items-start gap-3 text-emerald-800 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold">Check-In Successful</div>
                <div>{successNotice}</div>
              </div>
            </div>
          )}

          {/* RESULT CARD */}
          {verifiedResult ? (
            <div className="bg-white rounded-2xl border-2 border-[#E8DDD7] shadow-lg overflow-hidden transition-all animate-fade-in">
              {/* Card Header Status Banner */}
              <div
                className={`px-6 py-4 flex items-center justify-between text-white ${
                  verifiedResult.isExpired || verifiedResult.isCancelled
                    ? 'bg-[#B91C1C]'
                    : verifiedResult.ticket.status === 'CHECKED_IN'
                    ? 'bg-amber-600'
                    : 'bg-emerald-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                  {verifiedResult.isExpired ? (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      <span>EXPIRED TICKET</span>
                    </>
                  ) : verifiedResult.isCancelled ? (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>CANCELLED TICKET</span>
                    </>
                  ) : verifiedResult.ticket.status === 'CHECKED_IN' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>ALREADY CHECKED IN</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>VALID PASS • READY TO CHECK IN</span>
                    </>
                  )}
                </div>

                <span className="text-xs font-mono bg-black/20 px-2.5 py-1 rounded-lg">
                  {verifiedResult.ticket.ticketCode}
                </span>
              </div>

              {/* TOP ACTION & STATUS BAR (Organizer Quick Check-In) */}
              <div className="px-6 py-3.5 bg-white border-b border-[#E8DDD7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {verifiedResult.ticket.status === 'CHECKED_IN' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Attended • Verified
                    </span>
                  ) : verifiedResult.canCheckIn ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#631A86] bg-[#631A86]/10 px-3 py-1.5 rounded-full border border-[#631A86]/20">
                      <Sparkles className="w-3.5 h-3.5" />
                      Ready for Organizer Check-In
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-100 px-3 py-1.5 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Cannot Check In
                    </span>
                  )}
                </div>

                {verifiedResult.canCheckIn && (
                  <Button
                    onClick={handleConfirmCheckIn}
                    disabled={isCheckingIn}
                    size="md"
                    className="bg-[#2A7B5F] hover:bg-[#20634c] text-white font-bold px-5 py-2.5 shadow-sm shrink-0 cursor-pointer"
                  >
                    {isCheckingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Mark as Attended
                      </>
                    )}
                  </Button>
                )}

                {verifiedResult.canUndo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVoidModalOpen(true)}
                    disabled={isUndoing}
                    className="text-amber-800 border-amber-300 hover:bg-amber-100 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Soft-Void
                  </Button>
                )}
              </div>

              {/* Attendee Profile Section */}
              <div className="p-6 border-b border-[#E8DDD7] bg-[#FAF7F5]">
                <div className="flex items-center gap-4">
                  {verifiedResult.attendee.avatarUrl ? (
                    <img
                      src={verifiedResult.attendee.avatarUrl}
                      alt={verifiedResult.attendee.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#631A86] text-white font-serif font-bold text-xl flex items-center justify-center shadow-xs">
                      {verifiedResult.attendee.name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold font-serif text-[#2D1F23] truncate">
                      {verifiedResult.attendee.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#756366] truncate">{verifiedResult.attendee.email}</p>
                    {verifiedResult.attendee.organization && (
                      <p className="text-xs text-[#A2666F] font-semibold mt-0.5">
                        {verifiedResult.attendee.organization}
                      </p>
                    )}
                  </div>
                </div>

                {/* Badge Status Row */}
                <div className="mt-4 pt-3 border-t border-[#E8DDD7] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#756366]">
                    Registered on{' '}
                    <strong className="text-[#2D1F23]">
                      {new Date(verifiedResult.attendee.registrationDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>

                  {verifiedResult.hasAttendedBadge ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <Award className="w-3.5 h-3.5" />
                      Attended Badge Awarded
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">Badge unlocks on check-in</span>
                  )}
                </div>
              </div>

              {/* Registration Answers Section */}
              {Object.keys(verifiedResult.attendee.answers || {}).length > 0 && (
                <div className="p-6 border-b border-[#E8DDD7] bg-white">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#756366] mb-3 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#A2666F]" />
                    Registration Answers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(verifiedResult.attendee.answers).map(([key, val]) => (
                      <div
                        key={key}
                        className="bg-[#FAF7F5] p-2.5 rounded-xl border border-[#E8DDD7] text-xs"
                      >
                        <div className="text-[#756366] font-medium">{key}</div>
                        <div className="text-[#2D1F23] font-bold mt-0.5">{String(val || 'N/A')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Already Checked-In Warning / Details */}
              {verifiedResult.ticket.status === 'CHECKED_IN' && (
                <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Verified at{' '}
                    {verifiedResult.checkIn?.approvedAt
                      ? new Date(verifiedResult.checkIn.approvedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }) + ' EAT'
                      : 'Earlier Today'}
                  </div>
                  <p className="mt-1 text-amber-800">
                    This ticket has already been used for entry. If this was a mistake, you can soft-void this
                    check-in below.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-6 bg-[#FAF7F5] flex flex-col sm:flex-row items-center gap-3">
                {verifiedResult.canCheckIn && (
                  <Button
                    onClick={handleConfirmCheckIn}
                    disabled={isCheckingIn}
                    size="lg"
                    className="w-full sm:flex-1 bg-[#2A7B5F] hover:bg-[#20634c] text-white font-bold text-base py-3 shadow-md"
                  >
                    {isCheckingIn ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Recording Check-In...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Check In Attendee
                      </>
                    )}
                  </Button>
                )}

                {verifiedResult.canUndo && (
                  <Button
                    variant="outline"
                    onClick={() => setIsVoidModalOpen(true)}
                    disabled={isUndoing}
                    className="w-full sm:w-auto text-amber-800 border-amber-300 hover:bg-amber-100 font-bold"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Soft-Void
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleResetForNext}
                  className="w-full sm:w-auto text-[#756366]"
                >
                  Scan Next
                </Button>
              </div>
            </div>
          ) : (
            /* Standby / Empty Inspection Placeholder */
            <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-[#E8DDD7] text-center flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] flex items-center justify-center text-[#A2666F] mb-4">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-serif font-bold text-[#2D1F23]">Ready to Verify Tickets</h3>
              <p className="text-xs text-[#756366] max-w-sm mt-1 mb-4">
                Scan attendee QR code with your camera, paste the signed token, or search by name to view verification
                details and grant verified attendance badges.
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs text-[#631A86] font-semibold bg-[#FAF7F5] px-3 py-1.5 rounded-full border border-[#E8DDD7]">
                <ShieldCheck className="w-4 h-4" />
                End-of-day automatic token expiry enforced
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SOFT-VOID CONFIRMATION MODAL */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        title="Soft-Void Check-In Record"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Audit-Safe Undo:</strong> The check-in record will be marked as voided with your organizer ID
              and timestamp. The attendee's ticket will return to <code>ISSUED</code> status, and their "Attended" badge
              will be revoked.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#756366] mb-1">
              Reason for Void:
            </label>
            <input
              type="text"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full text-sm py-2 px-3 border border-[#E8DDD7] rounded-xl bg-[#FAF7F5]"
              placeholder="e.g. Accidental scan, wrong session, testing"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DDD7]">
            <Button variant="outline" onClick={() => setIsVoidModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSoftVoid}
              disabled={isUndoing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isUndoing ? 'Undoing...' : 'Confirm Soft-Void'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
