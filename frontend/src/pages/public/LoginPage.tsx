import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { GoogleLogin } from '@react-oauth/google';
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
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
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

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

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
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.');
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
        } else if (redirectTarget) {
          navigate(redirectTarget);
        } else {
          navigate('/app');
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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotSuccess(null);
    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim());
      setForgotSuccess(res.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setForgotSuccess(err.message || 'If an account exists, a reset link has been dispatched.');
    } finally {
      setForgotLoading(false);
    }
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
          className={`pb-1 cursor-pointer transition-all ${
            authMode === 'login'
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
          className={`pb-1 cursor-pointer transition-all ${
            authMode === 'signup'
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
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              loginRole === 'ATTENDEE'
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
            className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              loginRole === 'ORGANIZER'
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setShowForgotModal(false)}
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
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#756366]">
              Enter your registered email address to receive password reset instructions.
            </p>

            {forgotSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
                <p>{forgotSuccess}</p>
                <Button
                  size="sm"
                  fullWidth
                  variant="outline"
                  onClick={() => setShowForgotModal(false)}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
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
                  Send Reset Link
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


