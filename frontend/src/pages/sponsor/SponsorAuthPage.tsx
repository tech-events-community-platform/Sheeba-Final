import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { GoogleLogin } from '@react-oauth/google';
import {
  Building2,
  Lock,
  User as UserIcon,
  Globe,
  Tag,
  AlertCircle,
  Clock,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

const INDUSTRY_OPTIONS = [
  'Fintech & Financial Services',
  'Software & Cloud Infrastructure',
  'AI, Data & Machine Learning',
  'Edtech & Youth Skills',
  'Telecom & Connectivity',
  'Venture Capital & Innovation Funds',
  'Healthtech & Biotech',
  'Agritech & Supply Chain',
  'Creative Agency & Media',
  'Other',
];

export const SponsorAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const { user, isAuthenticated, loginSponsor, registerSponsor, loginSponsorWithGoogle } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industryCategory, setIndustryCategory] = useState(INDUSTRY_OPTIONS[0]);
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPendingReview, setIsPendingReview] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SPONSOR') {
        navigate('/sponsor', { replace: true });
      } else if (user.role === 'ORGANIZER') {
        navigate('/organizer', { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsPendingReview(false);
    setIsLoading(true);

    try {
      if (authMode === 'login') {
        const loggedUser = await loginSponsor(email.trim(), password);
        if (loggedUser.role === 'SPONSOR') {
          navigate('/sponsor');
        } else {
          navigate('/app');
        }
      } else {
        // Register Sponsor
        if (!fullName.trim() || !companyName.trim() || !companyPhone.trim()) {
          setErrorMsg('Please complete all required company and representative fields.');
          setIsLoading(false);
          return;
        }

        await registerSponsor({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          company_name: companyName.trim(),
          industry_category: industryCategory,
          company_phone: companyPhone.trim(),
          company_website: companyWebsite.trim() || undefined,
        });

        setIsPendingReview(true);
      }
    } catch (err: any) {
      const message = err.message || 'Authentication failed. Please verify your credentials.';
      if (
        err.isPendingApproval ||
        message.toLowerCase().includes('reviewed shortly') ||
        message.toLowerCase().includes('pending')
      ) {
        setIsPendingReview(true);
      } else {
        setErrorMsg(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-lg mx-auto pt-24 sm:pt-28 pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <img
          src="/logo.webp"
          alt="Sheeba Logo"
          className="h-14 sm:h-16 w-auto object-contain mx-auto"
        />
        <h1 className="font-serif text-3xl font-extrabold text-[#2D1F23]">
          {authMode === 'login' ? 'Sponsor Sign In' : 'Partner with Tech Events'}
        </h1>
        <p className="text-xs text-[#756366] max-w-sm mx-auto">
          {authMode === 'login'
            ? 'Sign in to access your corporate sponsorship dashboard, audience analytics, and perk deliverables.'
            : 'Register your organization to sponsor verified hackathons, developer workshops, and tech meetups in Ethiopia.'}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8DDD7] shadow-sm space-y-5">
        {/* Toggle Switch between Sign In and Register */}
        <div className="flex bg-[#FAF7F5] p-1.5 rounded-2xl border border-[#E8DDD7]">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg(null);
              setIsPendingReview(false);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              authMode === 'login'
                ? 'bg-white text-[#2D1F23] shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            Sponsor Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMsg(null);
              setIsPendingReview(false);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              authMode === 'signup'
                ? 'bg-white text-[#2D1F23] shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            Apply to Sponsor
          </button>
        </div>

        {/* Pending Review Notice State */}
        {isPendingReview ? (
          <div className="p-6 bg-[#FAF7F5] border border-[#FFA686]/40 rounded-2xl text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse text-[#63474D]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-lg text-[#2D1F23]">Application Under Review</h3>
              <p className="text-xs text-[#756366] leading-relaxed">
                Your application will be reviewed shortly. Wait a few moments until Sheeba Administration approves you...
              </p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-[#E8DDD7] text-left text-xs space-y-1.5 text-gray-600">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Credentials submitted successfully</span>
              </div>
              <p className="text-[11px] text-gray-500">
                You will receive a confirmation email when your account is verified by our team.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => {
                setIsPendingReview(false);
                setAuthMode('login');
              }}
            >
              Return to Sponsor Sign In
            </Button>
          </div>
        ) : (
          <>
            {/* Error Message Banner */}
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 space-y-1">
                  <span className="font-medium">{errorMsg}</span>
                  {errorMsg.includes('Attendee or Organizer') && (
                    <div className="pt-1">
                      <Link to="/login" className="text-xs font-bold text-[#63474D] underline hover:text-[#2D1F23]">
                        Switch to Attendee / Organizer Login →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Google Sign-In for Sponsors */}
            <div className="space-y-2">
              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      try {
                        setIsLoading(true);
                        setErrorMsg(null);
                        const loggedUser = await loginSponsorWithGoogle(
                          credentialResponse.credential,
                          authMode === 'signup' ? 'register' : 'login',
                          {
                            company_name: companyName || fullName || 'Corporate Sponsor',
                            industry_category: industryCategory,
                            company_phone: companyPhone || undefined,
                            company_website: companyWebsite || undefined,
                          }
                        );
                        if (loggedUser.role === 'SPONSOR') {
                          navigate('/sponsor');
                        }
                      } catch (err: any) {
                        if (err.isPendingApproval || err.message?.includes('reviewed shortly')) {
                          setIsPendingReview(true);
                        } else {
                          setErrorMsg(err.message || 'Google authentication failed.');
                        }
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
              <p className="text-[10.5px] text-center text-gray-500">
                Corporate Google accounts supported
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8DDD7]" />
              </div>
              <span className="relative bg-white px-3 text-[11px] text-[#756366] uppercase font-bold tracking-wider">
                Or with work credentials
              </span>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Representative Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Representative Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Sara Tadesse"
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                        />
                      </div>
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Company / Brand Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Telebirr / Chapa"
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Industry Category */}
                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Industry / Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                        <select
                          value={industryCategory}
                          onChange={(e) => setIndustryCategory(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                        >
                          {INDUSTRY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Company Phone */}
                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Company Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <img src="/phone-icon.webp" alt="Phone" className="w-4 h-4 object-contain absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="+251 9..."
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Website */}
                  <div>
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                      Company Website <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="url"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Work Email */}
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Corporate Work Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <img src="/mail-icon.webp" alt="Email" className="w-4 h-4 object-contain absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@company.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#2D1F23]">
                    Password <span className="text-red-500">*</span>
                  </label>
                  {authMode === 'login' && (
                    <Link
                      to="/sponsor/forgot-password"
                      className="text-[11px] font-semibold text-[#63474D] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                size="md"
                variant="primary"
                disabled={isLoading}
                className="mt-2 font-bold py-3"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : authMode === 'login' ? (
                  <span>Sign In to Sponsor Dashboard</span>
                ) : (
                  <span>Submit Sponsor Application</span>
                )}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Footer Navigation Back to Main Site */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-2">
        <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[#63474D] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sheeba Landing Page</span>
        </Link>
        <Link to="/login" className="hover:text-[#63474D] transition-colors">
          Attendee / Organizer Login →
        </Link>
      </div>
    </div>
  );
};
