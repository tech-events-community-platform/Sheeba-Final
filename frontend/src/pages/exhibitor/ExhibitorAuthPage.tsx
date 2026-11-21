import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import {
  Store,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
  Upload,
  X,
  Loader2,
} from 'lucide-react';
import { formatPhoneInput } from '../../utils/phone';
import { uploadToCloudinary } from '../../utils/cloudinary';

export const ExhibitorAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, register, user, addExhibitorRole } = useAuth();
  const initialMode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(initialMode !== 'register' && initialMode !== 'signup');
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Safely compute the post-auth return destination, preventing open redirects.
   * Preserves applyEventId if the user arrived from an event discovery card.
   */
  const getSafeReturnDestination = (): string => {
    const rawReturn = (location.state as any)?.returnTo || searchParams.get('returnTo');
    const rawEventId = (location.state as any)?.eventId || searchParams.get('eventId');

    // Only allow internal relative paths starting with '/' and not '//'
    let targetPath = '/exhibitor';
    if (rawReturn && typeof rawReturn === 'string' && rawReturn.startsWith('/') && !rawReturn.startsWith('//')) {
      targetPath = rawReturn;
    }

    if (rawEventId && typeof rawEventId === 'string' && /^[a-zA-Z0-9_-]+$/.test(rawEventId)) {
      const separator = targetPath.includes('?') ? '&' : '?';
      return `${targetPath}${separator}applyEventId=${encodeURIComponent(rawEventId)}`;
    }

    return targetPath;
  };

  // Redirect already-authenticated users who already have exhibitor role
  useEffect(() => {
    if (user && (user.isExhibitor || user.roles?.includes('EXHIBITOR'))) {
      navigate(getSafeReturnDestination(), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  React.useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register' || mode === 'signup') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [searchParams]);

  // Form fields
  const [companyName, setCompanyName] = useState(user?.companyName || user?.organization || '');
  const [category, setCategory] = useState(user?.industryCategory || 'Tech & Software');
  const [contactName, setContactName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || user?.companyPhone || '');
  const [password, setPassword] = useState('');
  const [companyLogo, setCompanyLogo] = useState(user?.avatarUrl || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for existing-account exhibitor role addition flow
  const [showAddRoleFlow, setShowAddRoleFlow] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo file size must not exceed 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);
    try {
      const url = await uploadToCloudinary(file, { folder: 'sheeba_exhibitor_logos' });
      setCompanyLogo(url);
    } catch (err: any) {
      setLogoUploadError(err.message || 'Failed to upload company logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleAddExhibitorRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!companyName.trim()) {
        setError('Company / Organization name is required.');
        return;
      }
      if (!companyLogo && !user?.avatarUrl) {
        setError('Company logo is required. Please upload your company logo.');
        return;
      }
      if (user?.hasPassword !== false && (!password || password.length < 6)) {
        setError('Password must be at least 6 characters.');
        return;
      }
      // If user is not authenticated, log in with attendee/existing role first
      if (!user) {
        await login(email.trim().toLowerCase(), password, 'attendee');
      }

      await addExhibitorRole({
        companyName: companyName.trim(),
        industryCategory: category,
        companyPhone: phone.trim() || undefined,
        password: password || undefined,
        companyLogo: companyLogo || user?.avatarUrl,
        logoUrl: companyLogo || user?.avatarUrl,
      });

      // Switch session to exhibitor role
      if (password) {
        try {
          await login(email.trim().toLowerCase(), password, 'exhibitor');
        } catch (_) {
          // If already authenticated via session, token will update on next refresh
        }
      }

      setSuccessMessage('Exhibitor role successfully activated! Redirecting to Exhibitor Workspace...');
      setTimeout(() => navigate(getSafeReturnDestination(), { replace: true }), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to add exhibitor role. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (isLogin) {
        await login(email.trim(), password, 'exhibitor');
        navigate(getSafeReturnDestination(), { replace: true });
      } else {
        if (!companyName.trim()) {
          setError('Company / Organization name is required.');
          return;
        }
        if (!contactName.trim()) {
          setError('Representative contact name is required.');
          return;
        }
        if (!companyLogo) {
          setError('Company logo is required. Please upload your company logo.');
          return;
        }
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters.');
          return;
        }

        const res = await register({
          email: email.trim().toLowerCase(),
          password,
          full_name: contactName.trim(),
          organization: companyName.trim(),
          phone: phone.trim() || undefined,
          role: 'EXHIBITOR',
          industry_category: category,
          avatar_url: companyLogo,
          companyLogo: companyLogo,
          company_logo: companyLogo,
          organization_logo: companyLogo,
        } as any);

        if (res.requireOtp) {
          sessionStorage.setItem('sheeba_pending_otp_email', email.trim().toLowerCase());
          sessionStorage.setItem('sheeba_pending_otp_redirect', getSafeReturnDestination());
          navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
          return;
        }

        if (res.isPendingApproval) {
          navigate('/pending-approval');
          return;
        }

        navigate(getSafeReturnDestination(), { replace: true });
      }
    } catch (err: any) {
      const errCode = err.code || err.data?.code || err.data?.error;
      const requiresAdd = err.requiresExhibitorRoleAdd || err.data?.requiresExhibitorRoleAdd;
      const requiresReg = err.requiresExhibitorRegistration || err.data?.requiresExhibitorRegistration;

      // Handle: existing account trying to register as exhibitor
      if (errCode === 'EXHIBITOR_EMAIL_EXISTS' || requiresAdd) {
        setShowAddRoleFlow(true);
        setError(null);
        return;
      }
      // Handle: account exists but not an exhibitor trying to log in as exhibitor
      if (errCode === 'EXHIBITOR_ROLE_NOT_ACTIVATED' || requiresReg) {
        setError(
          'Your account is not currently registered as an exhibitor. Please add the Exhibitor role to access the Exhibitor Workspace.'
        );
        return;
      }
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Render: add-exhibitor-role flow for existing users
  if (showAddRoleFlow || (user && !user.isExhibitor && !user.roles?.includes('EXHIBITOR'))) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-4">
          <button
            type="button"
            onClick={() => { setShowAddRoleFlow(false); setError(null); }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-[#63474D] rounded-2xl flex items-center justify-center text-white mx-auto shadow-md">
              <UserPlus className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#2D1F23]">
              Add Exhibitor Role
            </h2>
            <p className="text-xs text-gray-500">
              An account with this email already exists. Confirm your password below to add the Exhibitor role without losing your existing permissions.
            </p>
          </div>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-white py-8 px-6 sm:px-10 border border-[#E8DDD7] rounded-3xl shadow-xl space-y-6">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddExhibitorRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Company / Organization Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Tech Solutions"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Industry Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                >
                  <option value="Tech & Software">Tech & Software</option>
                  <option value="AI & Robotics">AI & Robotics</option>
                  <option value="Fintech & Banking">Fintech & Banking</option>
                  <option value="Education & Training">Education & Training</option>
                  <option value="Retail & Hardware">Retail & Hardware</option>
                  <option value="Creative Agency & Media">Creative Agency & Media</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Your Account Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!user}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Company Logo Upload (via Cloudinary) */}
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Company Logo <span className="text-red-500 font-bold">*</span> <span className="text-gray-400 font-normal">(PNG, JPG, WebP up to 5MB)</span>
                </label>
                {companyLogo ? (
                  <div className="flex items-center gap-3 p-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl">
                    <img
                      src={companyLogo}
                      alt="Company Logo"
                      className="w-10 h-10 rounded-xl object-contain bg-white border border-[#E8DDD7] p-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#2D1F23] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">Logo uploaded successfully</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="p-1 text-[#756366] hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove logo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-center gap-2 p-2.5 bg-[#FAF7F5] hover:bg-[#F2ECE9] border border-dashed border-[#E8DDD7] rounded-xl cursor-pointer transition-all">
                      {isUploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#63474D]" />
                      ) : (
                        <Upload className="w-4 h-4 text-[#756366]" />
                      )}
                      <span className="text-xs font-medium text-[#756366]">
                        {isUploadingLogo ? 'Uploading logo to Cloudinary...' : 'Upload company logo *'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        disabled={isUploadingLogo}
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {logoUploadError && (
                      <p className="text-[11px] text-red-600">{logoUploadError}</p>
                    )}
                  </div>
                )}
              </div>

              {user?.hasPassword !== false ? (
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Account Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Your existing password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Enter your existing account password to authorize adding the Exhibitor role.</p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  You are authenticated via Google OAuth. Confirm below to activate your Exhibitor role without a separate password.
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full py-3 text-xs font-bold rounded-xl shadow-md cursor-pointer mt-2"
              >
                Add Exhibitor Role to My Account
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand & Back Button */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sheeba</span>
        </Link>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-[#63474D] rounded-2xl flex items-center justify-center text-white mx-auto shadow-md">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#2D1F23]">
            {isLogin ? 'Sign In as Exhibitor' : 'Register Exhibitor Account'}
          </h2>
          <p className="text-xs text-gray-500">
            {isLogin
              ? 'Access your booth bookings, applications, and lead capture tools.'
              : 'Join Sheeba as an exhibitor to book physical booth spaces at top events.'}
          </p>
        </div>
      </div>

      {/* Card Form */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-[#E8DDD7] rounded-3xl shadow-xl space-y-6">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#FAF7F5] rounded-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isLogin ? 'bg-[#63474D] text-white shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setShowAddRoleFlow(true); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isLogin ? 'bg-[#63474D] text-white shadow-2xs' : 'text-gray-500 hover:text-black'
              }`}
            >
              Register Company
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span>{error}</span>
                {(error.includes('not currently registered as an exhibitor') || error.includes('EXHIBITOR_ROLE_NOT_ACTIVATED')) && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(false); setError(null); }}
                      className="text-[#63474D] font-bold hover:underline cursor-pointer"
                    >
                      Add Exhibitor Role to this Account →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Company / Organization Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Tech Solutions"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Industry Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  >
                    <option value="Tech & Software">Tech & Software</option>
                    <option value="AI & Robotics">AI & Robotics</option>
                    <option value="Fintech & Banking">Fintech & Banking</option>
                    <option value="Education & Training">Education & Training</option>
                    <option value="Retail & Hardware">Retail & Hardware</option>
                    <option value="Creative Agency & Media">Creative Agency & Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Contact Person Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dawit Kebede"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="0912345678"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>

                {/* Company Logo Upload (via Cloudinary) */}
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Company Logo <span className="text-red-500 font-bold">*</span> <span className="text-gray-400 font-normal">(PNG, JPG, WebP up to 5MB)</span>
                  </label>
                  {companyLogo ? (
                    <div className="flex items-center gap-3 p-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl">
                      <img
                        src={companyLogo}
                        alt="Company Logo"
                        className="w-10 h-10 rounded-xl object-contain bg-white border border-[#E8DDD7] p-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-[#2D1F23] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate">Logo uploaded successfully</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="p-1 text-[#756366] hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove logo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-center gap-2 p-2.5 bg-[#FAF7F5] hover:bg-[#F2ECE9] border border-dashed border-[#E8DDD7] rounded-xl cursor-pointer transition-all">
                        {isUploadingLogo ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#63474D]" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#756366]" />
                        )}
                        <span className="text-xs font-medium text-[#756366]">
                          {isUploadingLogo ? 'Uploading logo to Cloudinary...' : 'Upload company logo *'}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {logoUploadError && (
                        <p className="text-[11px] text-red-600">{logoUploadError}</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                Corporate Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full py-3 text-xs font-bold rounded-xl shadow-md cursor-pointer mt-2"
            >
              {isLogin ? 'Enter Exhibitor Portal' : 'Create Exhibitor Account'}
            </Button>
          </form>

          {/* Quick Demo Help */}
          <div className="pt-2 text-center text-[11px] text-gray-500 border-t border-gray-100">
            <span>Want to preview without typing? Click </span>
            <button
              type="button"
              onClick={() => navigate('/exhibitor')}
              className="text-[#63474D] font-bold hover:underline cursor-pointer"
            >
              Direct Demo Preview →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
