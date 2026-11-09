import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import {
  Lock,
  User,
  Building,
  FileText,
  AlertCircle,
  Users,
  Briefcase,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  Upload,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import type { UserRole } from '../../types/user';
import { registerSchema, validateForm, ORGANIZATION_TYPES } from '../../schemas';
import { uploadToCloudinary } from '../../utils/cloudinary';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const roleParam = searchParams.get('role');
  const { user, isAuthenticated, loginWithGoogle, register } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    roleParam?.toUpperCase() === 'ORGANIZER' ? 'ORGANIZER' : 'ATTENDEE'
  );

  // Common account fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Organizer Formalization fields
  const [applicantType, setApplicantType] = useState<'Individual Organizer' | 'Organization / Institution'>('Individual Organizer');
  // Individual Organizer
  const [personalIntroduction, setPersonalIntroduction] = useState('');
  // Organization / Institution
  const [organization, setOrganization] = useState('');
  const [organizationType, setOrganizationType] = useState<string>('University / Educational Institution');
  const [applicantPosition, setApplicantPosition] = useState('');
  const [organizationDescription, setOrganizationDescription] = useState('');
  const [organizationWebsite, setOrganizationWebsite] = useState('');
  const [organizationLogo, setOrganizationLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const url = await uploadToCloudinary(file, { folder: 'sheeba_organization_logos' });
      setOrganizationLogo(url);
    } catch (err: any) {
      setLogoUploadError(err.message || 'Failed to upload organization logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationPayload = {
      fullName,
      full_name: fullName,
      email,
      password,
      confirmPassword,
      confirm_password: confirmPassword,
      role: selectedRole,
      phone: phone.trim() || undefined,
      applicantType,
      applicant_type: applicantType,
      personalIntroduction: applicantType === 'Individual Organizer' ? personalIntroduction.trim() : undefined,
      personal_introduction: applicantType === 'Individual Organizer' ? personalIntroduction.trim() : undefined,
      organization: applicantType === 'Organization / Institution' ? organization.trim() : undefined,
      organization_name: applicantType === 'Organization / Institution' ? organization.trim() : undefined,
      organizationType: applicantType === 'Organization / Institution' ? organizationType : undefined,
      organization_type: applicantType === 'Organization / Institution' ? organizationType : undefined,
      applicantPosition: applicantType === 'Organization / Institution' ? applicantPosition.trim() : undefined,
      applicant_position: applicantType === 'Organization / Institution' ? applicantPosition.trim() : undefined,
      organizationDescription: applicantType === 'Organization / Institution' ? organizationDescription.trim() : undefined,
      organization_description: applicantType === 'Organization / Institution' ? organizationDescription.trim() : undefined,
      organizationWebsite: applicantType === 'Organization / Institution' ? (organizationWebsite.trim() || undefined) : undefined,
      organization_website: applicantType === 'Organization / Institution' ? (organizationWebsite.trim() || undefined) : undefined,
      organizationLogo: applicantType === 'Organization / Institution' ? (organizationLogo || undefined) : undefined,
      organization_logo: applicantType === 'Organization / Institution' ? (organizationLogo || undefined) : undefined,
      bio: applicantType === 'Individual Organizer' ? personalIntroduction.trim() : (organizationDescription.trim() || undefined),
    };

    const validation = validateForm(registerSchema, validationPayload);

    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0] || 'Please complete all required fields.';
      setErrorMsg(firstError);
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        full_name: fullName.trim(),
        role: selectedRole,
        phone: phone.trim() || undefined,
        applicant_type: applicantType,
        applicantType,
        personal_introduction: applicantType === 'Individual Organizer' ? personalIntroduction.trim() : undefined,
        personalIntroduction: applicantType === 'Individual Organizer' ? personalIntroduction.trim() : undefined,
        organization: applicantType === 'Organization / Institution' ? organization.trim() : (fullName.trim() || undefined),
        organization_type: applicantType === 'Organization / Institution' ? organizationType : undefined,
        organizationType: applicantType === 'Organization / Institution' ? organizationType : undefined,
        applicant_position: applicantType === 'Organization / Institution' ? applicantPosition.trim() : undefined,
        applicantPosition: applicantType === 'Organization / Institution' ? applicantPosition.trim() : undefined,
        organization_description: applicantType === 'Organization / Institution' ? organizationDescription.trim() : undefined,
        organizationDescription: applicantType === 'Organization / Institution' ? organizationDescription.trim() : undefined,
        organization_website: applicantType === 'Organization / Institution' ? (organizationWebsite.trim() || undefined) : undefined,
        organizationWebsite: applicantType === 'Organization / Institution' ? (organizationWebsite.trim() || undefined) : undefined,
        organization_logo: applicantType === 'Organization / Institution' ? (organizationLogo || undefined) : undefined,
        organizationLogo: applicantType === 'Organization / Institution' ? (organizationLogo || undefined) : undefined,
        bio: applicantType === 'Individual Organizer' ? personalIntroduction.trim() : (organizationDescription.trim() || undefined),
      });

      if (res.isPendingApproval || selectedRole === 'ORGANIZER') {
        // Redirect to pending approval page with 1-hour review notice
        navigate('/pending-approval', {
          state: {
            email: email.trim(),
            name: fullName.trim(),
            organization: applicantType === 'Organization / Institution' ? organization.trim() : fullName.trim(),
          },
        });
      } else {
        // Attendee registration: Navigate to OTP verification page
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-2 sm:py-3 space-y-2.5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="font-serif text-2xl sm:text-[26px] font-extrabold text-[#2D1F23] tracking-tight leading-tight">
          Create Your Account
        </h1>
        <p className="text-xs text-[#756366] max-w-xs mx-auto leading-snug">
          Join Ethiopia&apos;s premier event community and earn verifiable credentials.
        </p>
      </div>

      {/* Navigation Links at top */}
      <div className="flex items-center justify-center gap-8 text-xs sm:text-sm font-semibold pt-0.5">
        <Link
          to={`/login${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
          className="pb-1 text-[#756366] hover:text-[#2D1F23] transition-all"
        >
          Sign In
        </Link>
        <span className="pb-1 text-[#63474D] font-bold border-b-2 border-[#63474D]">
          Create Account
        </span>
      </div>

      {/* Registration Form Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8DDD7] shadow-sm space-y-3 sm:space-y-3.5">
        {/* Account Type Switcher */}
        <div className="grid grid-cols-2 bg-[#FAF7F5] p-1 rounded-xl border border-[#E8DDD7] gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('ATTENDEE');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'ATTENDEE'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Attendee</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('ORGANIZER');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'ORGANIZER'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Organizer</span>
          </button>
        </div>

        {/* Organizer Notice */}
        {selectedRole === 'ORGANIZER' && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-snug">
              Admin verification is required for organizers before hosting events. Pending applicants retain full attendee capabilities.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3">
          {/* Common Field: Full Name */}
          <div>
            <label htmlFor="reg-fullname" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none select-none" />
              <input
                id="reg-fullname"
                name="fullName"
                type="text"
                required
                tabIndex={1}
                placeholder="e.g. Abebe Kebede"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Common Field: Email */}
          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <img
                src="/mail-icon.webp"
                alt="Email"
                className="w-3.5 h-3.5 object-contain absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none"
              />
              <input
                id="reg-email"
                name="email"
                type="email"
                required
                tabIndex={2}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Common Field: Phone */}
          <div>
            <label htmlFor="reg-phone" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
              Phone Number {selectedRole === 'ORGANIZER' ? <span className="text-red-500">*</span> : <span className="text-[#756366] font-normal">(Optional)</span>}
            </label>
            <div className="relative">
              <img
                src="/phone-icon.webp"
                alt="Phone"
                className="w-3.5 h-3.5 object-contain absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none"
              />
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                required={selectedRole === 'ORGANIZER'}
                tabIndex={3}
                placeholder="+251 9..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Organizer Formalization Section */}
          {selectedRole === 'ORGANIZER' && (
            <div className="pt-2 border-t border-[#E8DDD7] space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2D1F23] mb-1.5">
                  Applicant Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApplicantType('Individual Organizer')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      applicantType === 'Individual Organizer'
                        ? 'bg-[#63474D]/10 border-[#63474D] text-[#63474D] font-bold shadow-xs'
                        : 'bg-[#FAF7F5] border-[#E8DDD7] text-[#756366] hover:text-[#2D1F23]'
                    }`}
                  >
                    Individual Organizer
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicantType('Organization / Institution')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      applicantType === 'Organization / Institution'
                        ? 'bg-[#63474D]/10 border-[#63474D] text-[#63474D] font-bold shadow-xs'
                        : 'bg-[#FAF7F5] border-[#E8DDD7] text-[#756366] hover:text-[#2D1F23]'
                    }`}
                  >
                    Organization / Institution
                  </button>
                </div>
              </div>

              {/* Individual Organizer Form */}
              {applicantType === 'Individual Organizer' ? (
                <div>
                  <label htmlFor="reg-personal-intro" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
                    Short Personal Introduction <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756366] pointer-events-none select-none" />
                    <textarea
                      id="reg-personal-intro"
                      name="personalIntroduction"
                      rows={3}
                      required
                      placeholder="Briefly describe your event organizing background and interest..."
                      value={personalIntroduction}
                      onChange={(e) => setPersonalIntroduction(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all resize-none"
                    />
                  </div>
                  <p className="text-[11px] text-[#756366] mt-0.5">Minimum 10 characters.</p>
                </div>
              ) : (
                /* Organization / Institution Form */
                <div className="space-y-2.5">
                  <div>
                    <label htmlFor="reg-org-name" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
                      Organization Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none select-none" />
                      <input
                        id="reg-org-name"
                        name="organization"
                        type="text"
                        required
                        placeholder="e.g. Addis Tech Community"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-org-type" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
                      Organization Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="reg-org-type"
                      name="organizationType"
                      value={organizationType}
                      onChange={(e) => setOrganizationType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all cursor-pointer"
                    >
                      {ORGANIZATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="reg-applicant-pos" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
                      Your Position / Role in Organization <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none select-none" />
                      <input
                        id="reg-applicant-pos"
                        name="applicantPosition"
                        type="text"
                        required
                        placeholder="e.g. Lead Organizer, Community Manager, Director"
                        value={applicantPosition}
                        onChange={(e) => setApplicantPosition(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-org-desc" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
                      Short Organization Description <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756366] pointer-events-none select-none" />
                      <textarea
                        id="reg-org-desc"
                        name="organizationDescription"
                        rows={2}
                        required
                        placeholder="Describe your organization's mission and event focus..."
                        value={organizationDescription}
                        onChange={(e) => setOrganizationDescription(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all resize-none"
                      />
                    </div>
                    <p className="text-[11px] text-[#756366] mt-0.5">Minimum 10 characters.</p>
                  </div>

                  <div>
                    <label htmlFor="reg-org-website" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
                      Website or Social Link <span className="text-[#756366] font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none select-none" />
                      <input
                        id="reg-org-website"
                        name="organizationWebsite"
                        type="url"
                        placeholder="https://example.org or LinkedIn/X profile"
                        value={organizationWebsite}
                        onChange={(e) => setOrganizationWebsite(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Organizer Logo / Profile Photo Upload (Optional for all organizers) */}
              <div>
                <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                  {applicantType === 'Individual Organizer' ? 'Organizer Logo / Profile Photo' : 'Organization Logo'}{' '}
                  <span className="text-[#756366] font-normal">(Optional - PNG, JPG, WebP up to 5MB)</span>
                </label>
                {organizationLogo ? (
                  <div className="flex items-center gap-3 p-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl">
                    <img
                      src={organizationLogo}
                      alt={applicantType === 'Individual Organizer' ? 'Organizer Logo' : 'Organization Logo'}
                      className="w-10 h-10 rounded-full object-cover border border-[#E8DDD7]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#2D1F23] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Logo uploaded</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrganizationLogo('')}
                      className="p-1 text-[#756366] hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 bg-[#FAF7F5] hover:bg-[#F2ECE9] border border-dashed border-[#E8DDD7] rounded-xl cursor-pointer transition-all">
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#63474D]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#756366]" />
                    )}
                    <span className="text-xs font-medium text-[#756366]">
                      {isUploadingLogo ? 'Uploading logo to Cloudinary...' : 'Click to upload logo from computer'}
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
          )}

          {/* Common Field: Password */}
          <div>
            <label htmlFor="reg-password" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none select-none" />
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                tabIndex={4}
                minLength={6}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#756366] hover:text-[#2D1F23] transition-colors p-1 focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Common Field: Confirm Password */}
          <div>
            <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-[#2D1F23] mb-1 cursor-pointer">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366] pointer-events-none select-none" />
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                tabIndex={5}
                minLength={6}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#756366] hover:text-[#2D1F23] transition-colors p-1 focus:outline-none cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="primary"
            isLoading={isLoading}
            className="mt-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            {selectedRole === 'ORGANIZER'
              ? 'Submit Organizer Registration'
              : 'Register as Attendee'}
          </Button>
        </form>

        {/* Continue with Google */}
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
                    const loggedUser = await loginWithGoogle(credentialResponse.credential, selectedRole, 'register');
                    if (selectedRole === 'ORGANIZER') {
                      // Google sign-up creates an active attendee base account.
                      // Direct user to Settings to complete the organizer formalization application.
                      navigate('/app/settings', {
                        state: {
                          infoMessage: 'Welcome to Sheeba! Your account is active. To become an Event Organizer, please complete the Organizer Application below.',
                        },
                      });
                    } else if (redirectTarget) {
                      navigate(redirectTarget);
                    } else {
                      navigate('/app');
                    }
                  } catch (err: any) {
                    console.error('Google Registration Error:', err);
                    setErrorMsg(err.message || 'Google registration failed.');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              onError={() => {
                setErrorMsg('Google registration was cancelled or failed.');
              }}
              text="signup_with"
              shape="pill"
              width="100%"
            />
          </div>
        </div>

        <div className="pt-3 text-center border-t border-[#E8DDD7] space-y-1.5">
          <p className="text-xs text-[#756366]">
            Already have an account?{' '}
            <Link
              to={`/login${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
              className="font-bold text-[#63474D] hover:underline"
            >
              Sign in here
            </Link>
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
    </div>
  );
};
