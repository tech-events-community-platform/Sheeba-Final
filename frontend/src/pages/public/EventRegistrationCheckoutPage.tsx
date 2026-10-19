import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
import type { User } from '../../types/user';
import type { Ticket } from '../../types/ticket';
import { TicketCard } from '../../components/ticket/TicketCard';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  ShieldCheck,
  Lock,
  X,
  Check,
  Copy,
  UploadCloud,
  CreditCard,
  Sparkles,
  FileText,
  CheckCircle2,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import type { PaymentDestination } from '../../types/event';
import { fileToDataUrl, uploadToCloudinary } from '../../utils/cloudinary';
import { getCalendarTile, isEventPassed } from '../../utils/date';
import { validateForm } from '../../utils/validation';
import { eventRegistrationCheckoutSchema } from '../../schemas/event.schema';
import { switchRoleSchema } from '../../schemas/auth.schema';

export const SHEEBA_ROLES = [
  'Student',
  'Professional',
  'Entrepreneur / Business Owner',
  'Researcher / Academic',
  'Job Seeker',
  'Other',
];

export const SHEEBA_GOALS = [
  'Learn new skills & practical knowledge',
  'Network with peers & industry professionals',
  'Explore career & job opportunities',
  'Gain hands-on experience / projects',
  'Discover new tools & technologies',
  'Explore business partnerships & collaborations',
  'Other',
];

export const EventRegistrationCheckoutPage: React.FC = () => {
  const { token, id } = useParams<{ token?: string; id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, register, switchRole } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Guest attendee fields (if not authenticated)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState('');

  // Organizer role switch states
  const [organizerSwitchPassword, setOrganizerSwitchPassword] = useState('');
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Form states
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedPayment, setSelectedPayment] = useState<'telebirr' | 'cbe' | 'awash'>('telebirr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  // Payment evidence and verification states
  const [paymentOption, setPaymentOption] = useState<'reference' | 'screenshot'>('reference');
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedDestinationIndex, setSelectedDestinationIndex] = useState(0);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [verificationStatusText, setVerificationStatusText] = useState<string | null>(null);

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Screenshot file size must be less than 5MB.');
      return;
    }

    setErrorMsg(null);
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
      setErrorMsg('Failed to process image file: ' + err.message);
    }
  };

  const handleCopyAccount = (accountNum: string, index: number) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex((prev) => (prev === index ? null : prev));
    }, 2000);
  };

  const effectiveQuestions = React.useMemo(() => {
    if (!event) return [];
    if (event.customQuestions && event.customQuestions.length > 0) {
      return event.customQuestions;
    }
    if (event.includeDefaultQuestions === false) {
      return [];
    }
    return [];
  }, [event]);

  useEffect(() => {
    const fetchEventAndStatus = async () => {
      setLoading(true);
      try {
        let fetched: Event | null = null;
        if (token) {
          fetched = await api.events.getByShareToken(token);
        } else if (id) {
          fetched = await api.events.getById(id);
        }
        setEvent(fetched);

        if (fetched && user) {
          try {
            const userTicket = await api.registration.getTicketByEvent(fetched.id, user.id);
            if (userTicket) {
              setConfirmedEmail(user.email);
              if (userTicket.isPending || userTicket.approvalStatus === 'pending') {
                setIsPendingApproval(true);
                setIsAlreadyRegistered(true);
              } else if (userTicket.approvalStatus === 'rejected') {
                setIsRejected(true);
                setIsAlreadyRegistered(true);
              } else {
                setTicket(userTicket);
                setIsAlreadyRegistered(true);
              }
            }
          } catch {
            // Not registered yet
          }
        }
      } catch (e) {
        console.error('Failed to load event:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndStatus();
  }, [token, id, user]);

  const handleOrganizerSwitchToAttendee = async () => {
    const roleValidation = validateForm(switchRoleSchema, { switchPassword: organizerSwitchPassword });
    if (!roleValidation.success) {
      setSwitchError(roleValidation.error);
      return;
    }

    setIsSwitchingRole(true);
    setSwitchError(null);
    try {
      await switchRole('ATTENDEE', organizerSwitchPassword);
      setOrganizerSwitchPassword('');
    } catch (err: any) {
      setSwitchError(err.message || 'Authentication failed. Please verify your password.');
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleToggleGoal = (goal: string) => {
    setAnswers((prev) => {
      const currentGoals: string[] = Array.isArray(prev.sheba_goals)
        ? prev.sheba_goals
        : typeof prev.sheba_goals === 'string' && prev.sheba_goals
        ? prev.sheba_goals.split(', ')
        : [];
      const updated = currentGoals.includes(goal)
        ? currentGoals.filter((g) => g !== goal)
        : [...currentGoals, goal];
      return { ...prev, sheba_goals: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!event) return;

    // Validate guest fields if logged out
    let attendeeToRegister: User;
    if (isAuthenticated && user) {
      if (user.role === 'ORGANIZER') {
        setErrorMsg('Please confirm your password above to switch to your Attendee profile before submitting registration.');
        return;
      }
      attendeeToRegister = user;
    } else {
      const guestValidation = validateForm(eventRegistrationCheckoutSchema, {
        isAuthenticated,
        guestName,
        guestEmail,
        guestPassword,
      });

      if (!guestValidation.success) {
        setErrorMsg(guestValidation.error);
        return;
      }

      try {
        await register({
          email: guestEmail.trim(),
          password: guestPassword,
          full_name: guestName.trim(),
          role: 'ATTENDEE',
        });
        sessionStorage.setItem('sheeba_pending_otp_email', guestEmail.trim());
        sessionStorage.setItem('sheeba_pending_otp_redirect', window.location.pathname);
        navigate('/verify-otp', {
          state: {
            email: guestEmail.trim(),
            redirect: window.location.pathname,
          },
        });
        return;
      } catch (regErr: any) {
        if (regErr.message?.includes('already registered') || regErr.status === 409 || regErr.statusCode === 409) {
          setErrorMsg('An account with this email already exists. Please sign in to register for this event.');
        } else {
          setErrorMsg(regErr.message || 'Failed to create attendee account.');
        }
        return;
      }
    }

    // Validate required questions dynamically from effectiveQuestions
    for (const q of effectiveQuestions) {
      const qVal = answers[q.id];
      const isFilled =
        typeof qVal === 'string'
          ? qVal.trim().length > 0
          : Array.isArray(qVal)
          ? qVal.length > 0
          : Boolean(qVal);
      if (q.isRequired && !isFilled) {
        setErrorMsg(`Please answer required question: "${q.questionText}"`);
        return;
      }
    }

    // Populate backward-compatible keys for analytics/reports if matching questions exist
    for (const q of effectiveQuestions) {
      const val = answers[q.id];
      if (val) {
        const text = q.questionText.toLowerCase();
        if (text.includes('best describes you') || text.includes('role')) {
          answers.sheba_role = val;
        } else if (text.includes('interest') || text.includes('expertise')) {
          answers.sheba_interests = val;
        } else if (
          text.includes('organization') ||
          text.includes('institution') ||
          text.includes('affiliated')
        ) {
          answers.sheba_organization = val;
        } else if (text.includes('hoping to gain') || text.includes('goals')) {
          answers.sheba_goals = val;
        }
      }
    }

    if (event.isPaid && !event.requiresApproval) {
      if (paymentOption === 'reference' && !paymentReference.trim()) {
        setErrorMsg('Please enter your transaction reference code or bank confirmation URL.');
        return;
      }
      if (paymentOption === 'screenshot' && !screenshotBase64 && !screenshotFile) {
        setErrorMsg('Please upload a clear screenshot of your bank transfer receipt.');
        return;
      }
    }

    setIsSubmitting(true);
    if (event.isPaid && !event.requiresApproval) {
      setVerificationStatusText('Verifying payment with bank network via Links.et...');
    }

    try {
      let finalScreenshotUrl = screenshotUrl;
      if (event.isPaid && !event.requiresApproval && paymentOption === 'screenshot' && screenshotFile && !finalScreenshotUrl) {
        try {
          finalScreenshotUrl = await uploadToCloudinary(screenshotFile);
          setScreenshotUrl(finalScreenshotUrl);
        } catch {
          // Cloudinary backup failed; direct base64 will be verified by Links.et
        }
      }

      const destinations: PaymentDestination[] =
        event.paymentMethods && event.paymentMethods.length > 0 ? event.paymentMethods : [];
      const selectedDest = destinations[selectedDestinationIndex];
      const effectiveProvider = selectedDest?.provider || selectedPayment;

      const res = await api.registration.registerForEvent({
        eventId: event.id,
        attendee: attendeeToRegister,
        answers,
        paymentReference:
          event.isPaid && !event.requiresApproval && paymentOption === 'reference'
            ? paymentReference.trim()
            : undefined,
        paymentMethod: effectiveProvider,
        screenshotUrl:
          event.isPaid && !event.requiresApproval && paymentOption === 'screenshot'
            ? finalScreenshotUrl || undefined
            : undefined,
        screenshotBase64:
          event.isPaid && !event.requiresApproval && paymentOption === 'screenshot'
            ? screenshotBase64 || undefined
            : undefined,
      });

      if (res.ticket) {
        setConfirmedEmail(attendeeToRegister.email);
        setTicket(res.ticket);
        setIsAlreadyRegistered(true);
        setIsConfirmed(true);
      } else if (res.isPendingApproval || res.approvalStatus === 'pending') {
        setConfirmedEmail(attendeeToRegister.email);
        setIsPendingApproval(true);
        setIsAlreadyRegistered(true);
        setIsConfirmed(true);
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed.';
      setErrorMsg(msg);
      if (msg.includes('already registered')) {
        setConfirmedEmail(attendeeToRegister.email);
        setIsAlreadyRegistered(true);
        setIsConfirmed(true);
        try {
          const userTicket = await api.registration.getTicketByEvent(event.id, attendeeToRegister.id);
          if (userTicket) {
            if (userTicket.isPending || userTicket.approvalStatus === 'pending') {
              setIsPendingApproval(true);
            } else if (userTicket.approvalStatus === 'rejected') {
              setIsRejected(true);
            } else {
              setTicket(userTicket);
            }
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setIsSubmitting(false);
      setVerificationStatusText(null);
    }
  };



  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-black/10 w-1/3 rounded-xl"></div>
          <div className="h-64 bg-black/5 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4 text-black">
        <AlertCircle className="w-12 h-12 text-[#AA767C] mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-black">Event Not Found</h2>
        <p className="text-xs text-gray-700">
          This event link may be invalid or no longer accepting registrations.
        </p>
        <Link to="/login">
          <Button variant="primary" size="sm">
            Back to Sheeba
          </Button>
        </Link>
      </div>
    );
  }

  const cal = getCalendarTile(event.date);
  const backUrl = `/e/${token || event.shareLinkToken || event.id}`;
  const isPassed = Boolean(event.isPassed || isEventPassed(event.date || (event as any).rawDate));

  // If event has passed and user is not registered, block registration form entirely
  if (!isAlreadyRegistered && isPassed) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-[#63474D]/10 flex items-center justify-center mx-auto text-[#63474D]">
          <Clock className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-black">This Event Has Passed</h2>
        <p className="text-xs text-gray-700 leading-relaxed">
          This event took place on {cal.weekday ? `${cal.weekday}, ${cal.fullDate}` : event.date}. Registration has closed and new registrations can no longer be processed.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          <Link to={backUrl}>
            <Button variant="outline" size="sm">
              Back to Event
            </Button>
          </Link>
          <Link to="/events">
            <Button variant="primary" size="sm">
              Explore Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Application Rejected View
  if (isRejected) {
    return (
      <div className="w-full py-16 px-4 flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full mx-auto space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-700">
            <X className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-red-700 block">
              Application Status
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-black">
              Application Not Approved
            </h1>
            <p className="text-xs text-gray-700 leading-relaxed">
              We regret to inform you that your registration application for <strong className="text-black">{event.title}</strong> was not approved by the event organizer.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/events">
              <Button variant="primary" size="sm">Explore Events</Button>
            </Link>
            <Link to={backUrl}>
              <Button variant="outline" size="sm">Back to Event</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Application Pending Review View
  if (isPendingApproval) {
    return (
      <div className="w-full py-16 px-4 flex items-center justify-center animate-fade-in">
        <div className="max-w-xl w-full mx-auto space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-800 shadow-inner">
            <Clock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-800 block">
              Application Under Review
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-black">
              Application Submitted!
            </h1>
            <p className="text-xs sm:text-sm text-black max-w-md mx-auto leading-relaxed">
              Your registration application for <strong className="text-black">{event.title}</strong> has been received and is currently under review by the event organizer.
            </p>
          </div>

          {/* Logistics Line */}
          <div className="pt-2 space-y-1 text-xs sm:text-sm text-black max-w-sm mx-auto">
            <p className="font-semibold text-black flex items-center justify-center gap-1.5">
              <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain shrink-0" />
              <span>{cal.weekday ? `${cal.weekday}, ${cal.fullDate}` : event.date} • {event.time || `${event.startTime} - ${event.endTime}`}</span>
            </p>
            <p className="flex items-center justify-center gap-1.5 text-black">
              <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain shrink-0" />
              <span>{event.venueName ? `${event.venueName}, ` : ''}{event.location}</span>
            </p>
          </div>

          {/* Review Status Info Box */}
          <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-3xl max-w-md mx-auto text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-amber-200/80 text-amber-900 rounded-xl mt-0.5 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950">What happens next?</h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  The event organizer is reviewing applicant questionnaire responses. Once your application is approved:
                </p>
              </div>
            </div>
            <ul className="text-[11px] text-amber-900 space-y-1.5 pl-8 list-disc">
              <li>
                You will receive an approval confirmation email at <strong className="text-black">{confirmedEmail || user?.email || 'your email'}</strong>.
              </li>
              <li>
                {event.isPaid && (event.ticketPrice || 0) > 0
                  ? 'Your approval email will contain a checkout link to complete your ticket fee payment and unlock your entry pass.'
                  : 'Your official digital ticket and dynamic QR entry pass will be generated and available in your account.'}
              </li>
              <li>You can check your application status at any time in your account.</li>
            </ul>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link to="/app/events">
              <Button variant="primary" size="sm">
                View in My Events
              </Button>
            </Link>
            <Link to={backUrl}>
              <Button variant="outline" size="sm" className="border-gray-400 text-black hover:bg-black/5">
                Back to Event
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success / Confirmed Registration View (Uses tick.png, text black)
  if (isConfirmed || isAlreadyRegistered) {
    return (
      <div className="w-full py-16 px-4 flex items-center justify-center animate-fade-in">
        <div className="max-w-xl w-full mx-auto space-y-6 text-center">
          <img
            src="/tick.webp"
            alt="Success"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto"
          />

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2A7B5F] block">
              Registration Confirmed
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-black">
              You have registered for this event!
            </h1>
            <p className="text-xs sm:text-sm text-black max-w-md mx-auto leading-relaxed">
              A confirmation email has been dispatched to <strong className="text-black">{confirmedEmail || user?.email || 'your email'}</strong>.
            </p>
          </div>

          {/* Logistics Line (Unboxed, location icon uses location.png, text black) */}
          <div className="pt-2 space-y-1 text-xs sm:text-sm text-black max-w-sm mx-auto">
            <p className="font-semibold text-black flex items-center justify-center gap-1.5">
              <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain shrink-0" />
              <span>{cal.weekday ? `${cal.weekday}, ${cal.fullDate}` : event.date} • {event.time || `${event.startTime} - ${event.endTime}`}</span>
            </p>
            <p className="flex items-center justify-center gap-1.5 text-black">
              <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain shrink-0" />
              <span>{event.venueName ? `${event.venueName}, ` : ''}{event.location}</span>
            </p>
          </div>

          {/* Direct Scannable Ticket QR Pass */}
          {ticket && (
            <div className="pt-4 max-w-sm mx-auto text-left animate-fade-in">
              <div className="text-center pb-2">
                <span className="text-xs font-bold text-[#63474D] uppercase tracking-wider">Your Digital Entry Pass</span>
              </div>
              <TicketCard ticket={ticket} />
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link to="/app/events">
              <Button variant="primary" size="sm">
                View in My Events
              </Button>
            </Link>
            <Link to={`/app/ticket/${event.id}`}>
              <Button variant="outline" size="sm" className="border-gray-400 text-black hover:bg-black/5">
                Full Ticket Pass
              </Button>
            </Link>
            <Link to={backUrl}>
              <Button variant="outline" size="sm" className="border-gray-400 text-black hover:bg-black/5">
                Back to Event
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration Page (No white card backgrounds, text black, unboxed clarity)
  return (
    <div className="w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Navigation & Event Overview Header */}
      <div className="space-y-3">
        <Link
          to={backUrl}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-black" />
          <span>Back to Event Details</span>
        </Link>

        <div className="space-y-1 pt-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-black">
            Event Registration
          </h1>
          <p className="text-sm font-medium text-black">
            {event.title}
          </p>
          <p className="text-xs text-gray-700 flex items-center gap-2 pt-0.5">
            <span className="flex items-center gap-1">
              <img src="/calendar.webp" alt="Date" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span>{cal.weekday ? `${cal.weekday}, ${cal.fullDate}` : event.date}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#AA767C]" />
              <span>{event.time || `${event.startTime} - ${event.endTime}`}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain" />
              <span>{event.venueName || event.location}</span>
            </span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* User Identity Info */}
        <div className="space-y-2 pb-4 border-b border-gray-300">
          <span className="text-[11px] uppercase font-bold tracking-wider text-gray-600 block">
            Attendee Information
          </span>

          {isAuthenticated && user ? (
            user.role === 'ORGANIZER' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-amber-950">Organizer Account Active</h3>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      You are currently signed in with your Organizer account (<strong>{user.organization || user.name}</strong>). Event tickets and verifiable badges attach to personal <strong>Attendee profiles</strong>. Confirm your password to authenticate as Attendee.
                    </p>
                  </div>
                </div>

                <div className="pt-1 space-y-1.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="password"
                        placeholder="Enter your account password"
                        value={organizerSwitchPassword}
                        onChange={(e) => setOrganizerSwitchPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={isSwitchingRole || !organizerSwitchPassword}
                      onClick={handleOrganizerSwitchToAttendee}
                    >
                      {isSwitchingRole ? 'Authenticating...' : 'Authenticate as Attendee'}
                    </Button>
                  </div>
                  {switchError && (
                    <p className="text-xs text-red-600 font-semibold">{switchError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-1">
                <img
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=63474D&color=fff`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#E8DDD7]"
                />
                <div>
                  <p className="text-sm font-bold text-black">{user.name}</p>
                  <p className="text-xs text-gray-600">{user.email} • Personal Attendee Profile</p>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                <p className="text-xs text-gray-600">
                  Create your attendee account to receive your event pass and earn verifiable badges.
                </p>
                <Link
                  to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                  className="text-xs font-bold text-[#63474D] hover:underline shrink-0"
                >
                  Already have an account? Sign In
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-black">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-300 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-black">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-300 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-black">
                    Create Attendee Password <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={guestPassword}
                    onChange={(e) => setGuestPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-300 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                  <p className="text-[10px] text-gray-500">
                    Your password enables you to log in anytime to access your attendance badges and event history.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Registration Questions Section */}
        {effectiveQuestions.length > 0 ? (
          <div className="space-y-6 pt-2 pb-6 border-b border-gray-300">
            <div>
              <h2 className="font-serif font-bold text-lg text-black">
                Registration Questions
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Please complete the questions required for this event registration.
              </p>
            </div>

            <div className="space-y-5">
              {effectiveQuestions.map((q, index) => {
                const qType = q.type || 'text';
                const isAffiliationQ =
                  q.questionText.toLowerCase().includes('organization') ||
                  q.questionText.toLowerCase().includes('institution') ||
                  q.questionText.toLowerCase().includes('affiliated');
                const isInterestsQ =
                  q.questionText.toLowerCase().includes('interest') ||
                  q.questionText.toLowerCase().includes('expertise');

                return (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-black">
                        {index + 1}. {q.questionText}{' '}
                        {q.isRequired && <span className="text-red-600">*</span>}
                      </label>
                      {isInterestsQ && (
                        <span className="text-[10px] text-gray-500">
                          e.g., AI, Product Design, FinTech
                        </span>
                      )}
                    </div>

                    {qType === 'choice' && q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, i) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <label
                              key={i}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#63474D] bg-[#63474D]/5 shadow-xs'
                                  : 'border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                value={opt}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(q.id, opt)}
                                className="w-4 h-4 text-[#63474D] focus:ring-[#63474D] cursor-pointer"
                              />
                              <span className="text-xs font-medium text-black">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : qType === 'multi_choice' && q.options && q.options.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[11px] text-gray-500">Select all that apply:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          {q.options.map((opt, i) => {
                            const currentVal = answers[q.id] || '';
                            const currentList = Array.isArray(currentVal)
                              ? currentVal
                              : currentVal.split(', ').filter(Boolean);
                            const isChecked = currentList.includes(opt);
                            return (
                              <label
                                key={i}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                  isChecked
                                    ? 'border-[#63474D] bg-[#63474D]/5 shadow-xs'
                                    : 'border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  value={opt}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let updated: string[];
                                    if (e.target.checked) {
                                      updated = [...currentList, opt];
                                    } else {
                                      updated = currentList.filter((x: string) => x !== opt);
                                    }
                                    handleAnswerChange(q.id, updated.join(', '));
                                  }}
                                  className="w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D] cursor-pointer"
                                />
                                <span className="text-xs font-medium text-black">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : isInterestsQ ? (
                      <textarea
                        rows={2}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="List topics, technologies, or skills you specialize in or want to explore..."
                        className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-300 rounded-xl text-xs text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] shadow-xs resize-none"
                      />
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          required={q.isRequired}
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder={
                            isAffiliationQ
                              ? 'e.g., Addis Ababa University, Gebeya, Commercial Bank of Ethiopia...'
                              : 'Your answer'
                          }
                          className="w-full px-3.5 py-2.5 bg-white/70 border border-gray-300 rounded-xl text-xs text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] shadow-xs"
                        />
                        {isAffiliationQ && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-gray-500 mr-1">Quick fill:</span>
                            {['Independent / Freelancer', 'Student (No affiliation)', 'Seeking Opportunities'].map(
                              (tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleAnswerChange(q.id, tag)}
                                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                                    answers[q.id] === tag
                                      ? 'border-[#63474D] bg-[#63474D] text-white font-medium'
                                      : 'border-gray-200 bg-white/60 text-gray-700 hover:border-gray-300 hover:bg-white'
                                  }`}
                                >
                                  {tag}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Payment Section */}
        {event.isPaid && (event.ticketPrice || 0) > 0 && (
          <div className="space-y-6 pt-4 border-t border-gray-300">
            {event.requiresApproval ? (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Ticket Price: {event.ticketPrice} ETB (Payable upon approval)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This event requires organizer approval. You do not need to pay upfront now. Once your application is reviewed and approved, you will receive an approval email with a payment link to complete your ticket purchase.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Header & Price Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/70 border border-gray-200 rounded-2xl">
                  <div>
                    <h2 className="font-serif font-bold text-lg text-black flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#63474D]" />
                      Payment & Ticket Admission
                    </h2>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Send payment to the organizer's account below and submit your reference or screenshot.
                    </p>
                  </div>
                  <div className="bg-[#63474D] text-white px-4 py-2 rounded-xl text-center self-start sm:self-auto shrink-0 shadow-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Total Due</span>
                    <span className="text-lg font-extrabold">{event.ticketPrice} ETB</span>
                  </div>
                </div>

                {/* Step 1: Receiving Accounts */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-black">
                      Step 1: Transfer fee to Organizer Account
                    </label>
                    <span className="text-[11px] text-gray-500">Tap to select destination</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {((event.paymentMethods && event.paymentMethods.length > 0)
                      ? event.paymentMethods
                      : [
                          {
                            id: 'default_cbe',
                            provider: 'cbe',
                            accountNumber: '100098765432',
                            accountHolder: 'Event Organizer',
                            label: 'CBE Official Account',
                          },
                          {
                            id: 'default_telebirr',
                            provider: 'telebirr',
                            accountNumber: '0911000000',
                            accountHolder: 'Event Organizer',
                            label: 'Telebirr Wallet',
                          },
                        ]
                    ).map((pm, idx) => {
                      const isSelected = selectedDestinationIndex === idx;
                      const providerNames: Record<string, string> = {
                        cbe: 'Commercial Bank of Ethiopia (CBE)',
                        telebirr: 'Telebirr (Ethio Telecom)',
                        awash: 'Awash Bank',
                        boa: 'Bank of Abyssinia',
                        dashen: 'Dashen Bank',
                        zemen: 'Zemen Bank',
                        other: 'Bank / Wallet',
                      };
                      return (
                        <div
                          key={pm.id || idx}
                          onClick={() => setSelectedDestinationIndex(idx)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-white border-[#63474D] shadow-sm ring-2 ring-[#63474D]/25'
                              : 'bg-white/50 border-gray-200 hover:bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block px-2 py-0.5 bg-[#63474D]/10 text-[#63474D] text-[10px] font-bold rounded-md uppercase tracking-wider mb-1">
                                {pm.provider.toUpperCase()}
                              </span>
                              <p className="text-xs font-bold text-black">{pm.label || providerNames[pm.provider] || pm.provider}</p>
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
                            <span className="font-mono text-xs font-bold text-black tracking-wide">
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
                </div>

                {/* Step 2: Verification Evidence */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-black">
                      Step 2: Submit Payment Evidence for Verification
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium">Links.et Real-time Bank Verification</span>
                  </div>

                  {/* Option Switcher Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-2xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setPaymentOption('reference')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        paymentOption === 'reference'
                          ? 'bg-white text-black shadow-xs'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-[#63474D]" />
                      <span>Option A: Reference / URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption('screenshot')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        paymentOption === 'screenshot'
                          ? 'bg-white text-black shadow-xs'
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      <UploadCloud className="w-4 h-4 text-[#63474D]" />
                      <span>Option B: Screenshot</span>
                    </button>
                  </div>

                  {/* Option A Pane */}
                  {paymentOption === 'reference' ? (
                    <div className="p-4 bg-white/70 border border-gray-200 rounded-2xl space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-black">
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
                        💡 <strong>Supported formats:</strong> Telebirr 10-character transaction reference code, or full bank web confirmation URL for CBE, Telebirr, Awash, or BOA. Links.et verifies the transaction amount ({event.ticketPrice} ETB) directly with the bank ledger.
                      </p>
                    </div>
                  ) : (
                    /* Option B Pane */
                    <div className="p-4 bg-white/70 border border-gray-200 rounded-2xl space-y-3 animate-fade-in">
                      <label className="block text-xs font-bold text-black">
                        Upload Payment Receipt Screenshot <span className="text-red-600">*</span>
                      </label>

                      <div className="space-y-2">
                        <label className="border-2 border-dashed border-gray-300 hover:border-[#63474D] rounded-2xl p-4 text-center block cursor-pointer bg-white transition-colors">
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
                              <span className="font-semibold text-black truncate max-w-xs">
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
                                alt="Receipt Screenshot Preview"
                                className="max-h-48 w-auto object-contain"
                              />
                            </div>
                          </div>
                        )}

                        <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                          🛡️ <strong>Automated OCR & Bank Validation:</strong> Links.et scans this receipt image to extract the banking reference token and validates the transaction with the bank network. Unconfirmed or manipulated screenshots are rejected automatically.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Verification Loading Banner */}
        {verificationStatusText && (
          <div className="p-4 bg-[#63474D]/10 border border-[#63474D]/30 rounded-2xl flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-5 h-5 text-[#63474D] animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#63474D]">{verificationStatusText}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                Connecting with bank infrastructure. Please do not close or navigate away from this page.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner right above submit action */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2.5 shadow-2xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-4 border-t border-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="px-8 py-3 text-xs font-bold rounded-xl shadow-md cursor-pointer min-w-[200px]"
          >
            {isSubmitting
              ? 'Verifying with Bank Network...'
              : event.requiresApproval
              ? 'Submit Application for Approval'
              : event.isPaid && (event.ticketPrice || 0) > 0
              ? `Verify & Complete Registration (${event.ticketPrice} ETB)`
              : 'Submit Free Registration'}
          </Button>

          {event.requiresApproval && (
            <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Organizer will review your responses before issuing your ticket pass.</span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
