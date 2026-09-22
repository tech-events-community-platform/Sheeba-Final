import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

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
              setIsAlreadyRegistered(true);
              setConfirmedEmail(user.email);
              setTicket(userTicket);
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
    if (!organizerSwitchPassword) {
      setSwitchError('Please enter your account password.');
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
      if (!guestName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!guestEmail.trim() || !guestEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!guestPassword || guestPassword.length < 6) {
        setErrorMsg('Please enter a password with at least 6 characters for your attendee account.');
        return;
      }

      try {
        const regRes = await register({
          email: guestEmail.trim(),
          password: guestPassword,
          full_name: guestName.trim(),
          role: 'ATTENDEE',
        });
        attendeeToRegister = regRes.user;
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

    setIsSubmitting(true);
    try {
      const paymentRef = event.isPaid ? `${selectedPayment}_${Date.now()}` : undefined;
      const res = await api.registration.registerForEvent({
        eventId: event.id,
        attendee: attendeeToRegister,
        answers,
        paymentReference: paymentRef,
      });

      if (res.ticket) {
        setConfirmedEmail(attendeeToRegister.email);
        setTicket(res.ticket);
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
          if (userTicket) setTicket(userTicket);
        } catch {
          // ignore
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCalendarTile = (dateStr?: string) => {
    if (!dateStr) return { month: 'EVENT', day: '•', weekday: '', fullDate: '' };
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const day = d.getDate();
        const weekday = d.toLocaleString('en-US', { weekday: 'long' });
        const fullDate = d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return { month, day, weekday, fullDate };
      }
    } catch {
      // ignore
    }
    return { month: 'EVENT', day: '•', weekday: '', fullDate: dateStr };
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

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

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

        {/* Payment Section (ONLY displayed if the event is NOT free) */}
        {event.isPaid && (event.ticketPrice || 0) > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-300">
            <div>
              <h2 className="font-serif font-bold text-lg text-black">
                Payment Details
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                This is a paid event. Total admission fee: <strong className="text-black font-extrabold">{event.ticketPrice} ETB</strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-black">
                Select your preferred payment method:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {[
                  { id: 'telebirr' as const, name: 'Telebirr', desc: 'Direct USSD or App transfer' },
                  { id: 'cbe' as const, name: 'CBE', desc: 'Commercial Bank of Ethiopia' },
                  { id: 'awash' as const, name: 'Awash', desc: 'Awash Birr / Online Banking' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedPayment(m.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPayment === m.id
                        ? 'bg-[#63474D]/15 border-[#63474D] text-black shadow-sm ring-2 ring-[#63474D]/30'
                        : 'bg-white/40 border-gray-300 text-black hover:bg-white/60'
                    }`}
                  >
                    <p className="font-bold text-sm text-black">{m.name}</p>
                    <p className="text-[11px] text-gray-600 mt-1">{m.desc}</p>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-gray-600 pt-2">
                Upon submission, instructions to finalize your {selectedPayment.toUpperCase()} payment will be verified for your entry pass.
              </p>
            </div>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-4 border-t border-gray-300 flex justify-start">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="px-8 py-3 text-xs font-bold rounded-xl shadow-md cursor-pointer"
          >
            Submit Registration
          </Button>
        </div>
      </form>
    </div>
  );
};
