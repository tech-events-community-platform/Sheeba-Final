import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { GoogleLogin } from '@react-oauth/google';
import {
  loginSchema,
  sponsorRegisterSchema,
  validateForm,
  SPONSORSHIP_OBJECTIVES,
  TARGET_AUDIENCES,
  PREFERRED_EVENT_CATEGORIES,
  PREDEFINED_SKILLS_INTERESTS,
} from '../../schemas';
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
  Eye,
  EyeOff,
  Sparkles,
  Plus,
  X,
  Target,
  Users,
  Calendar,
  Code2,
  MapPin,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Upload,
  Loader2,
} from 'lucide-react';
import { uploadToCloudinary } from '../../utils/cloudinary';

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

const PREDEFINED_LOCATIONS = [
  'Addis Ababa',
  'Hawassa',
  'Dire Dawa',
  'Bahir Dar',
  'Mekelle',
  'Adama',
  'Remote / Virtual',
];

export const SponsorAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const { user, isAuthenticated, loginSponsor, registerSponsor, loginSponsorWithGoogle } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);

  // Core Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industryCategory, setIndustryCategory] = useState(INDUSTRY_OPTIONS[0]);
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');

  // Stage 1: Extended Company & Preference Fields
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

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
      const url = await uploadToCloudinary(file, { folder: 'sheeba_sponsor_logos' });
      setCompanyLogo(url);
    } catch (err: any) {
      setLogoUploadError(err.message || 'Failed to upload company logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };
  const [sponsorshipObjectives, setSponsorshipObjectives] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [preferredEventCategories, setPreferredEventCategories] = useState<string[]>([]);
  const [skillsAndInterests, setSkillsAndInterests] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');

  // Optional Preferences
  const [showOptionalPreferences, setShowOptionalPreferences] = useState(false);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState('');

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

  const toggleSelection = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddCustomSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customSkillInput.trim();
    if (!clean) return;
    if (clean.length > 50) {
      setErrorMsg('Skill tag must not exceed 50 characters.');
      return;
    }
    if (!skillsAndInterests.includes(clean)) {
      setSkillsAndInterests((prev) => [...prev, clean]);
    }
    setCustomSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsAndInterests((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsPendingReview(false);
    setIsLoading(true);

    try {
      if (authMode === 'login') {
        const validation = validateForm(loginSchema, { email, password, role: 'SPONSOR' });
        if (!validation.success) {
          const firstError = Object.values(validation.errors || {})[0] || 'Invalid credentials.';
          setErrorMsg(firstError);
          setIsLoading(false);
          return;
        }

        const loggedUser = await loginSponsor(email.trim(), password);
        if (loggedUser.role === 'SPONSOR') {
          navigate('/sponsor');
        } else {
          navigate('/app');
        }
      } else {
        const payload = {
          fullName,
          email,
          password,
          companyName,
          industryCategory,
          companyPhone,
          companyWebsite: companyWebsite.trim() || undefined,
          companyDescription: companyDescription.trim(),
          companyLogo: companyLogo.trim() || undefined,
          sponsorshipObjectives,
          targetAudience,
          preferredEventCategories,
          skillsAndInterests,
          preferredLocations: preferredLocations.length > 0 ? preferredLocations : undefined,
          budgetRange: budgetRange ? Number(budgetRange) : undefined,
        };

        const validation = validateForm(sponsorRegisterSchema, payload);

        if (!validation.success) {
          const firstError =
            Object.values(validation.errors || {})[0] ||
            'Please complete all required company and sponsorship preference fields.';
          setErrorMsg(firstError);
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
          company_description: companyDescription.trim(),
          company_logo: companyLogo.trim() || undefined,
          sponsorship_objectives: sponsorshipObjectives,
          target_audience: targetAudience,
          preferred_event_categories: preferredEventCategories,
          skills_and_interests: skillsAndInterests,
          preferred_locations: preferredLocations,
          budget_range: budgetRange ? Number(budgetRange) : undefined,
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
    <div className={`min-h-[85vh] flex flex-col justify-center ${authMode === 'signup' ? 'max-w-2xl' : 'max-w-lg'} mx-auto pt-24 sm:pt-28 pb-20 px-4 space-y-6 transition-all duration-300`}>
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
        <p className="text-xs text-[#756366] max-w-md mx-auto">
          {authMode === 'login'
            ? 'Sign in to access your corporate sponsorship dashboard, audience analytics, and perk deliverables.'
            : 'Register your organization to sponsor verified hackathons, developer workshops, and tech meetups in Ethiopia.'}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8DDD7] shadow-sm space-y-6">
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
                <span>Credentials & Matching Preferences Submitted</span>
              </div>
              <p className="text-[11px] text-gray-500">
                You will receive an email notification when your corporate account is approved.
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
                            company_description: companyDescription || undefined,
                            sponsorship_objectives: sponsorshipObjectives.length > 0 ? sponsorshipObjectives : undefined,
                            target_audience: targetAudience.length > 0 ? targetAudience : undefined,
                            preferred_event_categories: preferredEventCategories.length > 0 ? preferredEventCategories : undefined,
                            skills_and_interests: skillsAndInterests.length > 0 ? skillsAndInterests : undefined,
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  {/* SECTION 1: Representative & Company Identity */}
                  <div className="pt-1 pb-1 border-b border-gray-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#63474D] mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Company & Contact Details</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
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
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
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
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
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
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
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
                            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                          />
                        </div>
                      </div>

                      {/* Company Logo Upload (via Cloudinary) */}
                      <div>
                        <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                          Company Logo <span className="text-gray-400 font-normal">(Optional - PNG, JPG, WebP up to 5MB)</span>
                        </label>
                        {companyLogo ? (
                          <div className="flex items-center gap-3 p-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl">
                            <img
                              src={companyLogo}
                              alt="Company Logo"
                              className="w-10 h-10 rounded-xl object-contain bg-white border border-[#E8DDD7] p-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#2D1F23] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span>Logo uploaded</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCompanyLogo('')}
                              className="p-1 text-[#756366] hover:text-red-600 transition-colors cursor-pointer"
                              title="Remove logo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-2.5 bg-[#FAF7F5] hover:bg-[#F2ECE9] border border-dashed border-[#E8DDD7] rounded-xl cursor-pointer transition-all">
                            {isUploadingLogo ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#63474D]" />
                            ) : (
                              <Upload className="w-4 h-4 text-[#756366]" />
                            )}
                            <span className="text-xs font-medium text-[#756366]">
                              {isUploadingLogo ? 'Uploading logo...' : 'Click to upload company logo'}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              className="hidden"
                              disabled={isUploadingLogo}
                              onChange={handleLogoUpload}
                            />
                          </label>
                        )}
                        {logoUploadError && (
                          <p className="text-[11px] text-red-600 mt-1">{logoUploadError}</p>
                        )}
                      </div>
                    </div>

                    {/* Company Description (Required) */}
                    <div className="mt-3 mb-2">
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Company Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={companyDescription}
                        onChange={(e) => setCompanyDescription(e.target.value)}
                        placeholder="Tell organizers and attendees about your company mission, technology focus, and sponsorship goals..."
                        className="w-full p-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                      />
                    </div>
                  </div>

                  {/* SECTION 2: AI-Matching Preferences */}
                  <div className="pt-1 pb-1 border-b border-gray-100 space-y-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#63474D] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFA686]" />
                      <span>Sponsorship Objectives & AI Matching</span>
                    </p>

                    {/* Sponsorship Objectives (Multi-select) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#2D1F23] flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-gray-400" />
                          <span>Sponsorship Objectives <span className="text-red-500">*</span></span>
                        </label>
                        <span className="text-[10px] text-gray-500 font-medium">Select all that apply</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SPONSORSHIP_OBJECTIVES.map((obj) => {
                          const active = sponsorshipObjectives.includes(obj);
                          return (
                            <button
                              key={obj}
                              type="button"
                              onClick={() => toggleSelection(sponsorshipObjectives, setSponsorshipObjectives, obj)}
                              className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                active
                                  ? 'bg-[#63474D] text-white border-[#63474D] shadow-2xs font-bold'
                                  : 'bg-[#FAF7F5] text-gray-700 border-[#E8DDD7] hover:border-gray-400'
                              }`}
                            >
                              {active && <CheckCircle2 className="w-3 h-3 text-[#FFA686]" />}
                              <span>{obj}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Target Audience (Multi-select) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#2D1F23] flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>Target Audience <span className="text-red-500">*</span></span>
                        </label>
                        <span className="text-[10px] text-gray-500 font-medium">Select all that apply</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TARGET_AUDIENCES.map((aud) => {
                          const active = targetAudience.includes(aud);
                          return (
                            <button
                              key={aud}
                              type="button"
                              onClick={() => toggleSelection(targetAudience, setTargetAudience, aud)}
                              className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                active
                                  ? 'bg-[#63474D] text-white border-[#63474D] shadow-2xs font-bold'
                                  : 'bg-[#FAF7F5] text-gray-700 border-[#E8DDD7] hover:border-gray-400'
                              }`}
                            >
                              {active && <CheckCircle2 className="w-3 h-3 text-[#FFA686]" />}
                              <span>{aud}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preferred Event Categories (Multi-select) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#2D1F23] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>Preferred Event Categories <span className="text-red-500">*</span></span>
                        </label>
                        <span className="text-[10px] text-gray-500 font-medium">Select formats</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {PREFERRED_EVENT_CATEGORIES.map((cat) => {
                          const active = preferredEventCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleSelection(preferredEventCategories, setPreferredEventCategories, cat)}
                              className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                active
                                  ? 'bg-[#63474D] text-white border-[#63474D] shadow-2xs font-bold'
                                  : 'bg-[#FAF7F5] text-gray-700 border-[#E8DDD7] hover:border-gray-400'
                              }`}
                            >
                              {active && <CheckCircle2 className="w-3 h-3 text-[#FFA686]" />}
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Skills & Interests (Predefined + Custom) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#2D1F23] flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5 text-gray-400" />
                          <span>Skills and Interests <span className="text-red-500">*</span></span>
                        </label>
                        <span className="text-[10px] text-gray-500 font-medium">Select or add custom</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {PREDEFINED_SKILLS_INTERESTS.map((skill) => {
                          const active = skillsAndInterests.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => toggleSelection(skillsAndInterests, setSkillsAndInterests, skill)}
                              className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                active
                                  ? 'bg-[#63474D] text-white border-[#63474D] shadow-2xs font-bold'
                                  : 'bg-[#FAF7F5] text-gray-700 border-[#E8DDD7] hover:border-gray-400'
                              }`}
                            >
                              {active && <CheckCircle2 className="w-3 h-3 text-[#FFA686]" />}
                              <span>{skill}</span>
                            </button>
                          );
                        })}

                        {/* Custom added skills */}
                        {skillsAndInterests
                          .filter((s) => !PREDEFINED_SKILLS_INTERESTS.includes(s as any))
                          .map((customSkill) => (
                            <span
                              key={customSkill}
                              className="px-2.5 py-1 text-xs rounded-lg bg-[#63474D] text-white border border-[#63474D] font-bold flex items-center gap-1"
                            >
                              <span>{customSkill}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(customSkill)}
                                className="text-white/70 hover:text-white cursor-pointer ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                      </div>

                      {/* Custom Skill Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customSkillInput}
                          onChange={(e) => setCustomSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomSkill();
                            }
                          }}
                          placeholder="Add custom skill (e.g. Flutter, Rust)..."
                          className="flex-1 px-3 py-1.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCustomSkill()}
                          className="px-3 py-1.5 text-xs font-bold bg-[#FAF7F5] hover:bg-gray-200 text-[#2D1F23] border border-[#E8DDD7] rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    {/* Optional Preferences Accordion */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowOptionalPreferences(!showOptionalPreferences)}
                        className="text-xs font-semibold text-[#63474D] hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        {showOptionalPreferences ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{showOptionalPreferences ? 'Hide optional preferences' : 'Add preferred locations & budget range (Optional)'}</span>
                      </button>

                      {showOptionalPreferences && (
                        <div className="mt-3 p-3.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl space-y-3 animate-fade-in">
                          <div>
                            <label className="block text-xs font-bold text-[#2D1F23] mb-1.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span>Preferred Event Locations</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {PREDEFINED_LOCATIONS.map((loc) => {
                                const active = preferredLocations.includes(loc);
                                return (
                                  <button
                                    key={loc}
                                    type="button"
                                    onClick={() => toggleSelection(preferredLocations, setPreferredLocations, loc)}
                                    className={`px-2 py-0.5 text-xs rounded-lg border transition-all cursor-pointer ${
                                      active
                                        ? 'bg-[#63474D] text-white border-[#63474D] font-bold'
                                        : 'bg-white text-gray-700 border-[#E8DDD7] hover:border-gray-400'
                                    }`}
                                  >
                                    {loc}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                              <span>Approximate Sponsorship Budget (ETB)</span>
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              value={budgetRange}
                              onChange={(e) => setBudgetRange(e.target.value)}
                              placeholder="e.g. 100000"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] text-[#2D1F23]"
                            />
                            <p className="text-[10.5px] text-gray-500 mt-1">
                              You can always tune these preferences later from your Sponsor Settings.
                            </p>
                          </div>
                        </div>
                      )}
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
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
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
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                size="md"
                variant="primary"
                disabled={isLoading || isUploadingLogo}
                className="mt-2 font-bold py-3 shadow-md"
              >
                {isLoading || isUploadingLogo ? (
                  <span>{isUploadingLogo ? 'Uploading Logo...' : 'Processing...'}</span>
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
