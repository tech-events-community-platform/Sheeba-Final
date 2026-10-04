import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { GoogleLogin } from '@react-oauth/google';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  forgotOtpStep1Schema,
  forgotOtpStep2Schema,
  resetPasswordStep3Schema,
  validateForm,
} from '../../schemas';
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  Clock,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  X,
  Briefcase,
  UserCheck,
  RotateCw,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const isRegisterRoute = location.pathname === '/register';
  const initialMode = (searchParams.get('mode') === 'signup' || isRegisterRoute) ? 'signup' : 'login';
  const initialRole = (searchParams.get('role')?.toUpperCase() === 'ORGANIZER' || searchParams.get('portal') === 'organizer') ? 'ORGANIZER' : 'ATTENDEE';

  const { user, isAuthenticated, login, loginWithGoogle, register } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);
  const [loginRole, setLoginRole] = useState<'ATTENDEE' | 'ORGANIZER'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPendingNotice, setIsPendingNotice] = useState(false);

  // Sync mode and role with URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup' || location.pathname === '/register') {
      setAuthMode('signup');
    } else if (mode === 'login') {
      setAuthMode('login');
    }
    const roleParam = searchParams.get('role');
    if (roleParam?.toUpperCase() === 'ORGANIZER' || searchParams.get('portal') === 'organizer') {
      setLoginRole('ORGANIZER');
    }
  }, [searchParams, location.pathname]);

  // 3-Step Forgot password modal state (Brevo OTP)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotTimeLeft, setForgotTimeLeft] = useState<number>(180); // 3-minute OTP countdown
  const [forgotResendCooldown, setForgotResendCooldown] = useState<number>(0);

  // Forgot password OTP timer
  useEffect(() => {
    let timer: any = null;
    if (showForgotModal && forgotStep === 2 && forgotTimeLeft > 0) {
      timer = setInterval(() => {
        setForgotTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showForgotModal, forgotStep, forgotTimeLeft]);

  // Forgot password Resend cooldown timer
  useEffect(() => {
    let cooldownTimer: any = null;
    if (forgotResendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setForgotResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (cooldownTimer) clearInterval(cooldownTimer);
    };
  }, [forgotResendCooldown]);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
      } else if (user.role === 'ORGANIZER') {
        navigate('/organizer', { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsPendingNotice(false);
    setIsLoading(true);

    try {
      if (authMode === 'login') {
        const validation = validateForm(loginSchema, { email, password, role: loginRole });
        if (!validation.success) {
          const firstError = Object.values(validation.errors || {})[0] || 'Invalid credentials.';
          setErrorMsg(firstError);
          setIsLoading(false);
          return;
        }

        const loggedUser = await login(email.trim(), password, loginRole);
        if (redirectTarget) {
          navigate(redirectTarget);
        } else if (loggedUser.role === 'ORGANIZER') {
          navigate('/organizer');
        } else if (loggedUser.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/app');
        }
      } else {
        const validation = validateForm(registerSchema, {
          email,
          password,
          fullName,
          full_name: fullName,
          role: loginRole,
          organization: loginRole === 'ORGANIZER' ? organization.trim() || undefined : undefined,
        });
        if (!validation.success) {
          const firstError = Object.values(validation.errors || {})[0] || 'Please complete all required fields.';
          setErrorMsg(firstError);
          setIsLoading(false);
          return;
        }

        const res = await register({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role: loginRole,
          organization: loginRole === 'ORGANIZER' ? organization.trim() || undefined : undefined,
        });

        if (res?.isPendingApproval || loginRole === 'ORGANIZER') {
          navigate('/pending-approval', {
            state: {
              email: email.trim(),
              name: fullName.trim(),
              organization: organization.trim(),
            },
          });
        } else {
          // Attendee registration: ALWAYS navigate to OTP verification page
          sessionStorage.setItem('sheeba_pending_otp_email', email.trim());
          if (redirectTarget) {
            sessionStorage.setItem('sheeba_pending_otp_redirect', redirectTarget);
          }
          navigate('/verify-otp', {
            state: {
              email: email.trim(),
              redirect: redirectTarget,
            },
          });
        }
      }
    } catch (err: any) {
      const message = err.message || 'Authentication failed. Please verify your credentials.';

      if (
        err.isPendingApproval ||
        message.toLowerCase().includes('1 hour') ||
        message.toLowerCase().includes('pending')
      ) {
        setIsPendingNotice(true);
        setErrorMsg('Your organizer registration is pending admin approval.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    const validation = validateForm(forgotOtpStep1Schema, { email: forgotEmail });
    if (!validation.success) {
      setForgotError(validation.errors.email || 'Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim());
      setForgotSuccess(res.message || 'A 6-digit verification code has been dispatched to your email.');
      setForgotStep(2);
      setForgotTimeLeft(180);
      setForgotResendCooldown(60);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    if (forgotTimeLeft <= 0) {
      setForgotError('Verification code has expired (3-minute limit). Please click Resend Code.');
      return;
    }
    const validation = validateForm(forgotOtpStep2Schema, { otp: forgotOtp });
    if (!validation.success) {
      setForgotError(validation.errors.otp || 'Please enter the complete 6-digit verification code.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.auth.verifyOtp(forgotEmail.trim(), forgotOtp.trim());
      setForgotSuccess(res.message || 'Code verified successfully! Enter your new password below.');
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.message || 'Invalid or expired verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResend = async () => {
    if (forgotResendCooldown > 0 || forgotLoading) return;
    setForgotError(null);
    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim());
      setForgotSuccess(res.message || 'A fresh 6-digit verification code has been dispatched.');
      setForgotTimeLeft(180);
      setForgotResendCooldown(60);
      setForgotOtp('');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to resend code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    const validation = validateForm(resetPasswordStep3Schema, {
      newPassword: forgotNewPassword,
      confirmPassword: forgotConfirmPassword,
    });
    if (!validation.success) {
      setForgotError(validation.errors.confirmPassword || validation.errors.newPassword || 'Please verify your password inputs.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await api.auth.resetPasswordWithOtp({
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      setForgotSuccess(res.message || 'Your password has been successfully reset! You may now sign in.');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError(null);
    setForgotSuccess(null);
    setForgotTimeLeft(180);
    setForgotResendCooldown(0);
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-2 sm:py-3 space-y-2.5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="font-serif text-2xl sm:text-[26px] font-extrabold text-[#2D1F23] tracking-tight leading-tight">
          {authMode === 'login'
            ? loginRole === 'ORGANIZER'
              ? 'Organizer Portal'
              : 'Attendee Portal'
            : loginRole === 'ORGANIZER'
              ? 'Create Organizer Account'
              : 'Create Attendee Account'}
        </h1>
        <p className="text-xs text-[#756366] max-w-xs mx-auto leading-snug">
          {redirectTarget
            ? 'Sign in or create your account to proceed with your registration.'
            : authMode === 'login'
              ? loginRole === 'ORGANIZER'
                ? 'Sign in to access your event dashboard and check-ins.'
                : 'Sign in to view your events and verifiable badges.'
              : loginRole === 'ORGANIZER'
                ? 'Host community events and issue tamper-proof badges in Ethiopia.'
                : 'Verifiable credentials and tech events in Ethiopia.'}
        </p>
      </div>

      {/* Blue lines position: Sign In / Create Account Navigation Links */}
      <div className="flex items-center justify-center gap-8 text-xs sm:text-sm font-semibold pt-0.5">
        <button
          type="button"
          onClick={() => {
            setAuthMode('login');
            setErrorMsg(null);
          }}
          className={`pb-1 cursor-pointer transition-all ${authMode === 'login'
              ? 'text-[#63474D] font-bold border-b-2 border-[#63474D]'
              : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('signup');
            setErrorMsg(null);
          }}
          className={`pb-1 cursor-pointer transition-all ${authMode === 'signup'
              ? 'text-[#63474D] font-bold border-b-2 border-[#63474D]'
              : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
        >
          Create Account
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8DDD7] shadow-sm space-y-3 sm:space-y-3.5">
        {/* Yellow circle position: Attendee / Organizer Role Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF7F5] rounded-xl border border-[#E8DDD7]">
          <button
            type="button"
            onClick={() => {
              setLoginRole('ATTENDEE');
              setErrorMsg(null);
              setIsPendingNotice(false);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${loginRole === 'ATTENDEE'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
              }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Attendee</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginRole('ORGANIZER');
              setErrorMsg(null);
              setIsPendingNotice(false);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${loginRole === 'ORGANIZER'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
              }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Organizer</span>
          </button>
        </div>

        {/* Pending Approval Notice Banner */}
        {isPendingNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              <span>Organizer Approval Pending</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-snug">
              Your application has been submitted and is currently in review.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => {
                setLoginRole('ATTENDEE');
                setIsPendingNotice(false);
                setErrorMsg(null);
              }}
              className="py-1.5 text-xs font-bold"
            >
              Sign In as Attendee Instead
            </Button>
          </div>
        )}

        {errorMsg && !isPendingNotice && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
              {loginRole === 'ORGANIZER' && errorMsg.includes('Settings') && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('ATTENDEE');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-bold text-[#63474D] underline hover:text-[#2D1F23]"
                  >
                    Switch to Attendee Portal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Red lines: Form Inputs (Email & Password, with Full Name on signup) */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#2D1F23] mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366]" />
                <input
                  type="text"
                  required
                  placeholder="Abebe Bikila"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {authMode === 'signup' && loginRole === 'ORGANIZER' && (
            <div>
              <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                Organization / Community Name
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366]" />
                <input
                  type="text"
                  placeholder="e.g. GDG Addis, ALX Tech Community"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#2D1F23] mb-1">Email Address</label>
            <div className="relative">
              <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete={authMode === 'signup' ? 'off' : 'email'}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#2D1F23]">Password</label>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-[#63474D] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366]" />
              <input
                type="password"
                required
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Red box: Sign In Button */}
          <Button
            type="submit"
            fullWidth
            variant="primary"
            isLoading={isLoading}
            className="mt-1.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            {authMode === 'login'
              ? 'Sign In'
              : loginRole === 'ORGANIZER'
                ? 'Register as Organizer'
                : 'Create Attendee Account'}
          </Button>
        </form>

        {/* Green line position: Continue with Google */}
        <div className="space-y-2.5 pt-1">
          <div className="relative text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8DDD7]" />
            </div>
            <span className="relative bg-white px-2.5 text-[11px] text-[#756366] uppercase font-bold tracking-wider">
              Or continue with
            </span>
          </div>

          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  try {
                    setIsLoading(true);
                    setErrorMsg(null);
                    const loggedUser = await loginWithGoogle(
                      credentialResponse.credential,
                      loginRole,
                      authMode === 'signup' ? 'register' : 'login'
                    );
                    if (redirectTarget) {
                      navigate(redirectTarget);
                    } else if (loggedUser.role === 'ORGANIZER') {
                      navigate('/organizer');
                    } else if (loggedUser.role === 'ADMIN') {
                      navigate('/admin');
                    } else {
                      navigate('/app');
                    }
                  } catch (err: any) {
                    console.error('Google Auth Error:', err);
                    setErrorMsg(err.message || 'Google authentication failed.');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              onError={() => {
                setErrorMsg('Google login was cancelled or failed.');
              }}
              text={authMode === 'login' ? 'signin_with' : 'signup_with'}
              shape="pill"
              width="100%"
            />
          </div>
        </div>

        {/* Footer: Register as Organizer / Sign In and Back to Home */}
        <div className="pt-3 text-center border-t border-[#E8DDD7] space-y-1.5">
          <p className="text-xs text-[#756366]">
            {authMode === 'login' ? (
              <>
                Organizing an event?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setLoginRole('ORGANIZER');
                    setErrorMsg(null);
                  }}
                  className="font-bold text-[#63474D] hover:underline cursor-pointer"
                >
                  Register as Organizer
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                  }}
                  className="font-bold text-[#63474D] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-[#756366] hover:text-[#2D1F23] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3-Step Brevo OTP Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={resetForgotModal}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#63474D]" />
                <h3 className="font-serif font-bold text-base text-[#2D1F23]">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={resetForgotModal}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#756366] pb-1 border-b border-gray-50">
              <span className={forgotStep === 1 ? 'text-[#63474D] font-bold' : ''}>1. Request Code</span>
              <span className={forgotStep === 2 ? 'text-[#63474D] font-bold' : ''}>2. Enter OTP</span>
              <span className={forgotStep === 3 ? 'text-[#63474D] font-bold' : ''}>3. New Password</span>
            </div>

            {/* Error & Success Alerts */}
            {forgotError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{forgotError}</span>
              </div>
            )}

            {forgotSuccess && forgotStep !== 3 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{forgotSuccess}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1} className="space-y-3">
                <p className="text-xs text-[#756366]">
                  Enter your registered email address to receive a 6-digit verification code.
                </p>
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
                <Button
                  type="submit"
                  fullWidth
                  variant="primary"
                  size="sm"
                  isLoading={forgotLoading}
                >
                  Send Verification Code
                </Button>
              </form>
            )}

            {/* STEP 2: Enter 6-digit OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotStep2} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#756366]">
                    Sent to: <strong className="text-[#2D1F23]">{forgotEmail}</strong>
                  </span>
                  <div className={`inline-flex items-center gap-1 text-[11px] font-semibold ${forgotTimeLeft <= 30 ? 'text-red-600' : 'text-[#756366]'}`}>
                    <Clock className="w-3 h-3" />
                    <span>{Math.floor(forgotTimeLeft / 60)}:{(forgotTimeLeft % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center tracking-[0.3em] font-mono font-bold text-lg py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>

                <Button
                  type="submit"
                  fullWidth
                  variant="primary"
                  size="sm"
                  isLoading={forgotLoading}
                  disabled={forgotOtp.length !== 6 || forgotTimeLeft <= 0}
                >
                  Verify Code
                </Button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotResend}
                    disabled={forgotResendCooldown > 0 || forgotLoading}
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      forgotResendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#63474D] hover:underline'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" />
                    {forgotResendCooldown > 0 ? `Resend (${forgotResendCooldown}s)` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {forgotStep === 3 && (
              forgotSuccess && !forgotError && forgotLoading === false && forgotSuccess.includes('successfully') ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold">{forgotSuccess}</p>
                  <Button
                    size="sm"
                    fullWidth
                    variant="primary"
                    onClick={resetForgotModal}
                  >
                    Sign In with New Password
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotStep3} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-9 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    variant="primary"
                    size="sm"
                    isLoading={forgotLoading}
                  >
                    Reset Password
                  </Button>
                </form>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};


