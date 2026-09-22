import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Calendar,
  MapPin,
  Clock,
  User,
  Mail,
  Building,
  Phone,
  HelpCircle,
  Lock,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  QrCode,
} from 'lucide-react';

export const VerifyTicketPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const codeParam = searchParams.get('code') || '';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<any | null>(null);
  const [isMarkingAttended, setIsMarkingAttended] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Audio synthesis helper for pleasant feedback
  const playAudioFeedback = useCallback((type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // High harmonic chime
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Low error buzz
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}

    if (navigator.vibrate) {
      try {
        navigator.vibrate(type === 'success' ? [60] : [120, 60, 120]);
      } catch {}
    }
  }, []);

  const loadTicket = useCallback(async () => {
    const rawTarget = tokenParam || codeParam;
    if (!rawTarget) {
      setError('No ticket token or code provided in the scan URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.checkIn.getTicketVerification(rawTarget);
      setVerificationData(data);
    } catch (err: any) {
      console.error('Failed to verify ticket:', err);
      setError(
        err.data?.message ||
        err.message ||
        'Unable to verify this ticket. It may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  }, [tokenParam, codeParam]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleMarkAttended = async () => {
    if (!verificationData || !verificationData.event || !verificationData.attendee) return;

    setIsMarkingAttended(true);
    setSuccessMessage(null);

    try {
      await api.checkIn.markAttended({
        eventId: verificationData.event.id,
        attendeeId: verificationData.attendee.id,
        notes: 'Verified via QR Code Camera Scan',
      });

      playAudioFeedback('success');
      setSuccessMessage(
        `Attendance confirmed! Verified Attended badge awarded to ${verificationData.attendee.name}.`
      );

      // Re-fetch or update local state immediately
      setVerificationData((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          ticket: {
            ...prev.ticket,
            status: 'CHECKED_IN',
          },
          checkIn: {
            id: 'ci-' + Date.now(),
            approvedAt: new Date().toISOString(),
            approvedByName: user?.name || 'Event Organizer',
          },
          hasAttendedBadge: true,
          isAlreadyCheckedIn: true,
          canCheckIn: false,
        };
      });
    } catch (err: any) {
      playAudioFeedback('error');
      alert(err.data?.message || err.message || 'Failed to mark attendance.');
    } finally {
      setIsMarkingAttended(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] py-12 px-4 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-[#E8DDD7] shadow-sm max-w-md w-full text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-[#631A86] animate-spin mx-auto" />
          <h2 className="font-serif text-xl font-bold text-[#2D1F23]">Verifying Sheeba Pass...</h2>
          <p className="text-xs text-[#756366]">Evaluating cryptographic signature and attendee records...</p>
        </div>
      </div>
    );
  }

  if (error || !verificationData) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] py-12 px-4 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-[#E8DDD7] shadow-sm max-w-md w-full text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">Invalid Ticket Pass</h2>
          <p className="text-sm text-[#756366]">{error || 'This ticket could not be found or verified.'}</p>
          <div className="pt-2 flex flex-col gap-2">
            <Link to="/">
              <Button variant="outline" fullWidth>
                Back to Sheeba Home
              </Button>
            </Link>
            {user?.role?.toUpperCase() === 'ORGANIZER' && (
              <Link to="/organizer/scanner">
                <Button variant="primary" fullWidth icon={<QrCode className="w-4 h-4" />}>
                  Open Organizer Scanner
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { ticket, event, attendee, checkIn, hasAttendedBadge, isOrganizer, canCheckIn, isAlreadyCheckedIn } = verificationData;

  return (
    <div className="min-h-screen bg-[#FAF7F5] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            to={isOrganizer ? `/organizer/events/${event.id}/scanner` : '/'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#756366] hover:text-[#2D1F23]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isOrganizer ? 'Back to Organizer Scanner' : 'Back to Sheeba'}</span>
          </Link>

          <span className="font-mono text-xs font-bold text-[#631A86] bg-[#631A86]/10 px-3 py-1 rounded-full border border-[#631A86]/20">
            {ticket.ticketCode}
          </span>
        </div>

        {/* TOP STATUS & ORGANIZER VERIFICATION ACTION (Prompt Requirement) */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="text-sm font-semibold">{successMessage}</div>
          </div>
        )}

        {isAlreadyCheckedIn ? (
          /* ATTENDED BANNER AT TOP */
          <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200 block">
                  Verified Entrance Status
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
                  ATTENDED / CHECKED IN
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Verified at{' '}
                    {checkIn?.approvedAt
                      ? new Date(checkIn.approvedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) + ' EAT'
                      : 'Today'}
                  </span>
                  {checkIn?.approvedByName && <span>by {checkIn.approvedByName}</span>}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-emerald-800 px-3.5 py-1.5 rounded-full shadow-xs shrink-0">
              <Award className="w-4 h-4 text-emerald-600" />
              Attended Badge Active
            </span>
          </div>
        ) : (
          /* NOT YET CHECKED IN - ORGANIZER CAN CLICK TO VERIFY AT TOP */
          <div className="p-5 bg-white border-2 border-[#E8DDD7] rounded-3xl shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A2666F] block">
                  Ticket Status
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2D1F23]">
                  VALID PASS • READY FOR ENTRY
                </h2>
                <p className="text-xs text-[#756366] mt-0.5">
                  Cryptographically authentic pass for {event.title}.
                </p>
              </div>

              <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Valid
              </Badge>
            </div>

            {/* ORGANIZER-ONLY VERIFICATION BUTTON AT TOP */}
            {isOrganizer ? (
              <div className="pt-2 border-t border-[#E8DDD7]">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#631A86] block">Organizer Verification</span>
                    <span className="text-xs text-[#756366]">
                      Click below to verify attendee entrance and issue the official credential badge.
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleMarkAttended}
                    disabled={isMarkingAttended}
                    className="bg-[#2A7B5F] hover:bg-[#20634c] text-white font-bold text-base py-3 px-6 shadow-md shrink-0 cursor-pointer"
                  >
                    {isMarkingAttended ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Mark as Attended
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : user ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Only the verified organizer of <strong>{event.title}</strong> can confirm attendance and issue badges.
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-purple-50 border border-[#631A86]/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#631A86]">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>Are you the event organizer? Log in to verify and check in this attendee.</span>
                </div>
                <Link
                  to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                  className="shrink-0"
                >
                  <Button variant="primary" size="sm" className="bg-[#631A86] hover:bg-[#521370] text-white">
                    Organizer Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ATTENDEE INFORMATION SECTION ("infos abot the attendes") */}
        <div className="bg-white rounded-3xl border border-[#E8DDD7] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8DDD7] pb-4">
            <h3 className="font-serif text-lg font-bold text-[#2D1F23] flex items-center gap-2">
              <User className="w-5 h-5 text-[#631A86]" />
              <span>Attendee Profile & Information</span>
            </h3>
            <span className="text-xs text-[#756366]">
              Registered {new Date(attendee.registrationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {attendee.avatarUrl ? (
              <img
                src={attendee.avatarUrl}
                alt={attendee.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#631A86] text-white font-serif font-bold text-2xl flex items-center justify-center shadow-xs">
                {attendee.name.charAt(0)}
              </div>
            )}

            <div className="flex-1 text-center sm:text-left space-y-1">
              <h4 className="font-serif text-2xl font-bold text-[#2D1F23]">{attendee.name}</h4>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-[#756366]">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {attendee.email}
                </span>
                {attendee.organization && (
                  <span className="flex items-center gap-1 font-semibold text-[#A2666F]">
                    <Building className="w-3.5 h-3.5" />
                    {attendee.organization}
                  </span>
                )}
                {attendee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {attendee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Registration Questions & Answers */}
          {Object.keys(attendee.answers || {}).length > 0 && (
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#A2666F]" />
                Registration Details & Responses
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(attendee.answers).map(([key, val]) => {
                  // Attempt to match question title if available
                  const matchedQ = (attendee.customQuestions || []).find(
                    (q: any) => String(q.id) === key || q.questionText === key
                  );
                  const label = matchedQ?.questionText || matchedQ?.title || key.replace(/^sheeba_/, '').replace(/_/g, ' ');

                  return (
                    <div
                      key={key}
                      className="bg-[#FAF7F5] p-3 rounded-2xl border border-[#E8DDD7] text-xs space-y-1"
                    >
                      <span className="font-semibold text-[#756366] capitalize block">{label}</span>
                      <p className="font-bold text-[#2D1F23] text-sm break-words">
                        {Array.isArray(val) ? val.join(', ') : String(val || 'N/A')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pass Tier & Event Logistics */}
          <div className="pt-4 border-t border-[#E8DDD7] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-[#756366] uppercase text-[10px] tracking-wider block">
                Event Logistics
              </span>
              <div className="space-y-1 text-[#2D1F23]">
                <p className="font-bold text-sm">{event.title}</p>
                <p className="text-xs text-[#756366] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {event.date} • {event.time}
                </p>
                <p className="text-xs text-[#756366] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.venueName || event.location}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-[#756366] uppercase text-[10px] tracking-wider block">
                Ticket Details
              </span>
              <div className="bg-[#FAF7F5] p-3 rounded-2xl border border-[#E8DDD7] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#756366]">Pass Type:</span>
                  <span className="font-bold text-[#2D1F23]">{ticket.isPaid ? 'Paid Ticket' : 'Free Admission'}</span>
                </div>
                {ticket.isPaid && (
                  <div className="flex justify-between">
                    <span className="text-[#756366]">Price:</span>
                    <span className="font-bold text-[#2D1F23]">{ticket.ticketPrice} {ticket.currency}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#756366]">Badge Status:</span>
                  <span className="font-bold text-emerald-700">
                    {hasAttendedBadge ? 'Attended Credential Awarded' : 'Unlocks upon check-in'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
