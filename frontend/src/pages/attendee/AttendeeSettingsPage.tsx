import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import {
  User,
  FileText,
  ShieldCheck,
  Globe,
  Lock,
  ExternalLink,
  Bell,
  Download,
  Trash2,
  AlertTriangle,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  Clock,
  Upload,
  Phone,
  Mail,
  X,
  KeyRound,
  Store,
} from 'lucide-react';
import type { ProfileVisibility } from '../../types/user';
import {
  attendeeProfileFormSchema,
  updateVisibilityFormSchema,
  applyOrganizerSchema,
  switchRoleSchema,
  validateForm,
} from '../../schemas';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { ORGANIZATION_TYPES, ORGANIZER_APPLICANT_TYPES } from '../../schemas/auth.schema';

export const AttendeeSettingsPage: React.FC = () => {
  const { user, logout, refreshUser, applyForOrganizer, switchRole, addExhibitorRole } = useAuth();
  const [targetSwitchRole, setTargetSwitchRole] = useState<'ORGANIZER' | 'EXHIBITOR'>('ORGANIZER');
  const [showAddExhibitorModal, setShowAddExhibitorModal] = useState(false);
  const [exhibitorCompanyName, setExhibitorCompanyName] = useState('');
  const [exhibitorCategory, setExhibitorCategory] = useState('Tech & Software');
  const [exhibitorPhone, setExhibitorPhone] = useState('');
  const [exhibitorPassword, setExhibitorPassword] = useState('');
  const [isAddingExhibitor, setIsAddingExhibitor] = useState(false);
  const [addExhibitorError, setAddExhibitorError] = useState<string | null>(null);
  const [addExhibitorSuccess, setAddExhibitorSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [visibility, setVisibility] = useState<ProfileVisibility>(user?.visibility || 'public');

  // Organizer Application & Credentials State
  const [applicantType, setApplicantType] = useState<'Individual Organizer' | 'Organization / Institution'>(
    user?.applicantType || (user?.organization ? 'Organization / Institution' : 'Individual Organizer')
  );
  const [personalIntro, setPersonalIntro] = useState(user?.personalIntroduction || user?.bio || '');
  const [orgName, setOrgName] = useState(user?.organization || '');
  const [orgType, setOrgType] = useState(user?.organizationType || 'Community / Student Club');
  const [applicantPosition, setApplicantPosition] = useState(user?.applicantPosition || '');
  const [orgDescription, setOrgDescription] = useState(user?.organizationDescription || user?.bio || '');
  const [orgWebsite, setOrgWebsite] = useState(user?.organizationWebsite || user?.socials?.x || '');
  const [orgLogo, setOrgLogo] = useState(user?.organizationLogo || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [orgPhone, setOrgPhone] = useState(user?.phone || '');
  const [applyPassword, setApplyPassword] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);

  // Switch Role State
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchPassword, setSwitchPassword] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Preferences
  const [emailReminders, setEmailReminders] = useState(true);
  const [badgeAlerts, setBadgeAlerts] = useState(true);

  // States
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      if (user.phone) setOrgPhone(user.phone);
      setBio(user.bio || '');
      setVisibility(user.visibility || 'public');
      if (user.organization) setOrgName(user.organization);
      if (user.applicantType) setApplicantType(user.applicantType);
      if (user.personalIntroduction) setPersonalIntro(user.personalIntroduction);
      if (user.organizationType) setOrgType(user.organizationType);
      if (user.applicantPosition) setApplicantPosition(user.applicantPosition);
      if (user.organizationDescription) setOrgDescription(user.organizationDescription);
      if (user.organizationWebsite) setOrgWebsite(user.organizationWebsite);
      if (user.organizationLogo) setOrgLogo(user.organizationLogo);
    }

    if ((location.state as any)?.successMessage) {
      setSaveMsg((location.state as any).successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [user, location.state]);

  
  const handleAddExhibitorRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exhibitorCompanyName.trim()) {
      setAddExhibitorError('Company / Organization name is required.');
      return;
    }
    if (user?.hasPassword !== false && (!exhibitorPassword || exhibitorPassword.length < 6)) {
      setAddExhibitorError('Please enter your account password (at least 6 characters).');
      return;
    }
    setIsAddingExhibitor(true);
    setAddExhibitorError(null);
    try {
      await addExhibitorRole({
        companyName: exhibitorCompanyName.trim(),
        industryCategory: exhibitorCategory,
        companyPhone: exhibitorPhone.trim() || undefined,
        password: exhibitorPassword,
      });
      setAddExhibitorSuccess('Exhibitor role activated successfully! You can now access the Exhibitor Workspace.');
      setTimeout(() => {
        setShowAddExhibitorModal(false);
        setAddExhibitorSuccess(null);
        if (refreshUser) refreshUser();
      }, 1500);
    } catch (err: any) {
      setAddExhibitorError(err.message || 'Failed to activate Exhibitor role. Please verify your password.');
    } finally {
      setIsAddingExhibitor(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError('Please select an image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Logo file size must not exceed 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);
    try {
      const uploadedUrl = await uploadToCloudinary(file, { folder: 'sheeba_organization_logos' });
      setOrgLogo(uploadedUrl);
    } catch (err: any) {
      setLogoUploadError(err.message || 'Failed to upload organization logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleApplyOrganizer = async (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (user?.hasPassword !== false && !applyPassword) {
      setApplyError('Please enter your account password to authorize your application.');
      return;
    }

    const validation = validateForm(applyOrganizerSchema, {
      applicantType,
      phone: orgPhone,
      applyPassword: applyPassword || undefined,
      personalIntroduction: personalIntro,
      organization: orgName,
      organizationType: orgType,
      applicantPosition,
      organizationDescription: orgDescription,
      organizationWebsite: orgWebsite,
      organizationLogo: orgLogo,
    });

    if (!validation.success) {
      const firstError = Object.values(validation.errors || {})[0] || 'Please complete all required application fields.';
      setApplyError(firstError);
      return;
    }

    setIsApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      const res = await applyForOrganizer({
        applicantType,
        phone: orgPhone.trim(),
        personalIntroduction: personalIntro.trim(),
        organization: orgName.trim(),
        organizationType: orgType.trim(),
        applicantPosition: applicantPosition.trim(),
        organizationDescription: orgDescription.trim(),
        organizationWebsite: orgWebsite.trim() || undefined,
        organizationLogo: orgLogo.trim() || undefined,
        password: applyPassword || undefined,
        socials: orgWebsite ? { website: orgWebsite.trim() } : {},
      });

      setApplySuccess(res.message || 'Organizer application submitted for administrative review.');
      setApplyPassword('');
      setShowApplyForm(false);
      if (refreshUser) await refreshUser();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit organizer application.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSwitchToOrganizer = async (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (user?.hasPassword !== false && !switchPassword) {
      setSwitchError('Please enter your account password.');
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);

    try {
      await switchRole(targetSwitchRole, switchPassword || undefined);
      setShowSwitchModal(false);
      setSwitchPassword('');
      navigate(targetSwitchRole === 'EXHIBITOR' ? '/exhibitor' : '/organizer');
    } catch (err: any) {
      setSwitchError(err.message || 'Failed to authenticate and switch workspace.');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const profileData = {
      name: name.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
      visibility,
    };

    const validation = validateForm(attendeeProfileFormSchema, profileData);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0] || 'Invalid profile data.';
      alert(firstError);
      return;
    }

    setIsSavingProfile(true);
    setSaveMsg(null);
    try {
      await api.userAccount.updateProfile(user.id, profileData);

      if (refreshUser) {
        await refreshUser();
      }

      setSaveMsg('Your attendee profile has been updated successfully.');
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleVisibilityChange = async (newVisibility: ProfileVisibility) => {
    const validation = validateForm(updateVisibilityFormSchema, { visibility: newVisibility });
    if (!validation.success) {
      console.warn('Invalid visibility:', validation.errors);
      return;
    }

    setVisibility(newVisibility);
    if (!user) return;
    try {
      await api.userAccount.updateVisibility(user.id, newVisibility);
      if (refreshUser) {
        await refreshUser();
      }
      setSaveMsg(`Profile visibility set to ${newVisibility}.`);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to update visibility:', err);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!user) return;
    setIsExporting(true);
    try {
      await api.userAccount.exportFullUserData(user.id, format);
      setSaveMsg(`Downloaded your attendance and badge data (${format.toUpperCase()}).`);
      setTimeout(() => setSaveMsg(null), 3500);
    } catch (err: any) {
      alert('Failed to export data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account removal.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.userAccount.deleteAccount(user.id);
      await logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4 space-y-8 pb-20">
      {/* Page Heading */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
          Attendee Account Settings
        </h1>
        <p className="text-xs text-[#756366]">
          Manage your personal attendee profile, verifiable credentials, and account preferences.
        </p>
      </div>

      {saveMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-fade-in max-w-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* 1. Attendee Profile Information */}
      <div className="space-y-5">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <User className="w-4 h-4 text-[#63474D]" />
            Personal Profile Information
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            Your name and bio appear on your verified attendee profile and certificates.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
          {/* Avatar Preview */}
          <div className="flex items-center gap-4 p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7]">
            <img
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=63474D&color=fff`}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#FFA686] shadow-xs"
            />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[#2D1F23]">{user.name}</p>
              <p className="text-[11px] text-[#756366]">Member Since {user.memberSince || '2026'}</p>
              <div className="inline-flex items-center gap-1 text-[10px] text-[#2A7B5F] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Attendee Account</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#63474D]" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abebe Kebede"
                className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 9... (optional)"
                className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
              <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
              Email Address
            </label>
            <input
              type="email"
              readOnly
              value={email}
              className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed max-w-sm"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Your registered login email. Ticket confirmations and event passes are sent here.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#63474D]" />
              Bio / About Me
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell communities and organizers a little about yourself (e.g., Software engineer, student, UI/UX enthusiast)..."
              className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSavingProfile}
          >
            {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
          </Button>
        </form>
      </div>

      {/* 2. Organizer Credentials & Community Application */}
      <div className="pt-6 border-t border-[#E8DDD7] space-y-4 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DDD7] pb-4">
          <div>
            <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#63474D]" />
              Event Organizer Workspace &amp; Verification
            </h2>
            <p className="text-xs text-[#756366] mt-0.5">
              Apply using your existing Sheeba account. Manage door check-ins, issue verifiable credentials, and host events.
            </p>
          </div>
          {user.isOrganizer && (
            <span className="self-start sm:self-auto text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              Approved Organizer
            </span>
          )}
        </div>

        {/* Status: Approved */}
        {user.isOrganizer && (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-emerald-950">Organizer Access Activated</h3>
                  <p className="text-[11px] text-emerald-800">
                    {user.organization ? `Official profile: ${user.organization}` : 'You have full organizer access.'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                Approved
              </span>
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed">
              Your account has full administrative access to create events, configure check-in scanners, and award verifiable credentials. Switch to your Organizer Workspace below.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchModal(true);
                  setSwitchPassword('');
                  setSwitchError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#63474D] hover:bg-[#4E373C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-[#FFA686]" />
                <span>Launch Organizer Workspace</span>
              </button>
            </div>
          </div>
        )}

        {/* Status: Additional Information Requested */}
        {user.organizerApprovalStatus === 'more_info_needed' && !user.isOrganizer && !showApplyForm && (
          <div className="p-5 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-700 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-amber-950">Additional Information Requested</h3>
                  <p className="text-[11px] text-amber-800">
                    The Sheeba administration requested more information to finalize your organizer application.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                Action Required
              </span>
            </div>

            {user.organizerInfoRequestedNotes && (
              <div className="p-3 bg-white/80 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900">Admin Note:</span>
                <p className="text-xs leading-relaxed">{user.organizerInfoRequestedNotes}</p>
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowApplyForm(true);
                  setApplyError(null);
                  setApplySuccess(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Update Application Details</span>
              </button>
            </div>
          </div>
        )}

        {/* Status: Pending Approval */}
        {user.organizerApprovalStatus === 'pending' && !user.isOrganizer && !showApplyForm && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-700 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-amber-950">Organizer Application Under Review</h3>
                  <p className="text-[11px] text-amber-800">
                    {user.applicantType ? `Applicant Type: ${user.applicantType}` : 'Awaiting administrative verification'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                Pending
              </span>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              Your application was submitted and is currently in the Sheeba Admin queue for manual review. Your attendee and exhibitor permissions remain active. Once approved, you will be able to access the Organizer Workspace.
            </p>

            {user.organizerAppliedAt && (
              <p className="text-[11px] text-amber-700 font-medium">
                Submitted on: {new Date(user.organizerAppliedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            )}
          </div>
        )}

        {/* Status: Rejected */}
        {user.organizerApprovalStatus === 'rejected' && !user.isOrganizer && !showApplyForm && (
          <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-rose-950">Organizer Application Declined</h3>
                  <p className="text-[11px] text-rose-800">
                    Your previous application was not approved by the admin team.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full border border-rose-200">
                Rejected
              </span>
            </div>

            {user.organizerRejectionReason && (
              <div className="p-3 bg-white/80 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-rose-900">Reason for decision:</span>
                <p className="text-xs leading-relaxed">{user.organizerRejectionReason}</p>
              </div>
            )}

            <p className="text-xs text-rose-900 leading-relaxed">
              <strong>Your attendee account remains fully active.</strong> Rejection does not deactivate your account. You can review and update your application details to submit an updated application.
            </p>

            <div>
              <button
                type="button"
                onClick={() => {
                  setShowApplyForm(true);
                  setApplyError(null);
                  setApplySuccess(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Update &amp; Re-apply</span>
              </button>
            </div>
          </div>
        )}

        {/* Status: None (or Re-applying) */}
        {(!user.organizerApprovalStatus || user.organizerApprovalStatus === 'none' || showApplyForm) && !user.isOrganizer && (
          <div className="p-5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl space-y-4">
            {!showApplyForm ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#2D1F23] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#63474D]" />
                    Apply to Become an Event Organizer
                  </h3>
                  <p className="text-[11px] text-[#756366] leading-relaxed max-w-lg">
                    Host tech meetups, hackathons, or workshops. Apply using your existing account as an Individual Organizer or an Organization / Institution.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyForm(true);
                    setApplyError(null);
                    setApplySuccess(null);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#63474D] hover:bg-[#4E373C] text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#FFA686]" />
                  <span>Start Application</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyOrganizer} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8DDD7]">
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#63474D]" />
                      Organizer Application Form
                    </h3>
                    <p className="text-[11px] text-[#756366]">
                      Applying with your existing Sheeba account ({user.email}). No duplicate account created.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="text-xs text-[#756366] hover:text-[#2D1F23] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {user.organizerInfoRequestedNotes && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                      Information Requested by Admin:
                    </span>
                    <p className="text-xs font-medium leading-relaxed">{user.organizerInfoRequestedNotes}</p>
                  </div>
                )}

                {applyError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{applyError}</span>
                  </div>
                )}

                {applySuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{applySuccess}</span>
                  </div>
                )}

                {/* Common Information */}
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#63474D] block">
                    1. Common Information
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Full Name (From Account)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user.name}
                        className="w-full px-3.5 py-2 bg-gray-100 border border-[#E8DDD7] rounded-xl text-xs text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Email Address (From Account)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        className="w-full px-3.5 py-2 bg-gray-100 border border-[#E8DDD7] rounded-xl text-xs text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+251 9... or 09..."
                        value={orgPhone}
                        onChange={(e) => setOrgPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Applicant Type *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {ORGANIZER_APPLICANT_TYPES.map((type) => (
                          <label
                            key={type}
                            className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                              applicantType === type
                                ? 'bg-[#63474D]/5 border-[#63474D] ring-1 ring-[#63474D]'
                                : 'bg-white border-[#E8DDD7] hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="applicantType"
                              value={type}
                              checked={applicantType === type}
                              onChange={() => setApplicantType(type)}
                              className="w-4 h-4 text-[#63474D] focus:ring-[#63474D]"
                            />
                            <div>
                              <div className="font-bold text-xs text-[#2D1F23]">{type}</div>
                              <div className="text-[10px] text-[#756366]">
                                {type === 'Individual Organizer'
                                  ? 'Solo community leader or independent host'
                                  : 'University, business, student club, or NGO'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Fields: Individual Organizer */}
                {applicantType === 'Individual Organizer' && (
                  <div className="space-y-3 pt-2 border-t border-[#E8DDD7]">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#63474D] block">
                      2. Individual Organizer Details
                    </span>

                    <div>
                      <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                        Short Personal Introduction *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Introduce yourself, your background in the community, and what kind of gatherings you plan to organize..."
                        value={personalIntro}
                        onChange={(e) => setPersonalIntro(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      />
                      <p className="text-[11px] text-[#756366] mt-1">
                        As an individual applicant, you are not required to provide organization information.
                      </p>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: Organization / Institution */}
                {applicantType === 'Organization / Institution' && (
                  <div className="space-y-3 pt-2 border-t border-[#E8DDD7]">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#63474D] block">
                      2. Organization / Institution Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                          Organization Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Addis Tech Hub, GDG Addis, Sheba Labs"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                          Organization Type *
                        </label>
                        <select
                          required
                          value={orgType}
                          onChange={(e) => setOrgType(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        >
                          {ORGANIZATION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                          Applicant's Position or Role *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. President, Community Lead, Program Coordinator, Director"
                          value={applicantPosition}
                          onChange={(e) => setApplicantPosition(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                          Short Organization Description *
                        </label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Briefly describe your organization's mission, focus area, and community activities..."
                          value={orgDescription}
                          onChange={(e) => setOrgDescription(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                          Organization Website or Social Media Link (Optional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://yourorganization.org or https://t.me/yourcommunity"
                          value={orgWebsite}
                          onChange={(e) => setOrgWebsite(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                        />
                      </div>

                      {/* Organization Logo Upload */}
                      <div className="sm:col-span-2 pt-1">
                        <label className="block text-xs font-bold text-[#2D1F23] mb-2">
                          Organization Logo (Optional)
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-[#E8DDD7] rounded-2xl">
                          {/* Circular Logo Preview / Default Placeholder */}
                          <div className="w-16 h-16 rounded-full border-2 border-[#E8DDD7] overflow-hidden bg-[#FAF7F5] flex items-center justify-center shrink-0 shadow-xs relative">
                            {orgLogo ? (
                              <img
                                src={orgLogo}
                                alt="Organization Logo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-8 h-8 text-[#63474D]/40" />
                            )}
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#63474D]/10 hover:bg-[#63474D]/20 text-[#63474D] text-xs font-bold cursor-pointer transition-all">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{isUploadingLogo ? 'Uploading...' : orgLogo ? 'Change Logo' : 'Upload Logo'}</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={handleLogoUpload}
                                  disabled={isUploadingLogo}
                                  className="hidden"
                                />
                              </label>

                              {orgLogo && (
                                <button
                                  type="button"
                                  onClick={() => setOrgLogo('')}
                                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {logoUploadError && (
                              <p className="text-[11px] text-red-600 font-medium">{logoUploadError}</p>
                            )}

                            <p className="text-[11px] text-[#756366] leading-relaxed">
                              PNG, JPG, or WebP up to 5MB. Displayed as the organization's circular profile image. Never replaces your personal account profile picture.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Password Verification */}
                {user?.hasPassword !== false && (
                  <div className="pt-2 border-t border-[#E8DDD7]">
                    <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#63474D]" />
                      Account Password Verification *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={applyPassword}
                      onChange={(e) => setApplyPassword(e.target.value)}
                      className="w-full sm:w-1/2 px-3.5 py-2.5 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                    <p className="text-[11px] text-[#756366] mt-1">
                      Confirming your password verifies your identity before submitting your organizer application.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isApplying || isUploadingLogo}
                  >
                    {isApplying
                      ? 'Submitting Application...'
                      : user.organizerApprovalStatus === 'more_info_needed'
                      ? 'Update & Resubmit Application'
                      : 'Submit Application for Admin Review'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApplyForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* 2b. Exhibitor Portals & Multi-Role Privileges */}
      <div className="pt-6 border-t border-[#E8DDD7] space-y-4 max-w-2xl">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <Store className="w-4 h-4 text-[#AA767C]" />
            Exhibitor Workspace & Booth Management
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            Participate in major events as a company or brand with physical booth space. Add the Exhibitor role to this account without losing your attendee data.
          </p>
        </div>

        {(user?.isExhibitor || user?.roles?.includes('EXHIBITOR')) ? (
          <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-700 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-purple-950">Activated Exhibitor Account</h3>
                  <p className="text-[11px] text-purple-800">
                    {user?.companyName ? `Company: ${user.companyName}` : 'Authorized to book booths and capture visitor leads'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full border border-purple-200">
                Activated
              </span>
            </div>

            <p className="text-xs text-purple-900 leading-relaxed">
              Your Exhibitor Workspace is active. Switch contexts to apply for event booth floor space, track confirmations, and capture badge leads.
            </p>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetSwitchRole('EXHIBITOR');
                  setShowSwitchModal(true);
                  setSwitchPassword('');
                  setSwitchError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#63474D] hover:bg-[#4E373C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Store className="w-4 h-4 text-[#FFA686]" />
                <span>Launch Exhibitor Workspace</span>
              </button>
              <Link
                to="/exhibitor/explore"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#63474D] text-[#63474D] text-xs font-semibold hover:bg-[#63474D]/10 transition-colors"
              >
                <span>Browse Booth Calls</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-white border border-[#E8DDD7] rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#2D1F23]">Register as an Exhibitor</h3>
                <p className="text-[11px] text-gray-500">
                  Add the Exhibitor capability to your current Sheeba profile. No second account or alternate email required.
                </p>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAddExhibitorModal(true);
                  setAddExhibitorError(null);
                  setAddExhibitorSuccess(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#63474D] text-white rounded-xl text-xs font-bold hover:bg-[#523A3F] transition-all cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-[#FFA686]" />
                <span>Register as Exhibitor</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Public Profile Verifiability & Privacy */}
      <div className="pt-6 border-t border-[#E8DDD7] space-y-4 max-w-2xl">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#63474D]" />
            Public Verifiable Profile & Badges
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            Control whether your earned attendance credentials and hackathon badges can be publicly verified.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleVisibilityChange('public')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${visibility === 'public'
                ? 'bg-[#FAF7F5] border-[#63474D] ring-2 ring-[#63474D]/20 shadow-xs'
                : 'bg-white border-[#E8DDD7] hover:border-[#63474D]/50'
              }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Globe className={`w-4 h-4 ${visibility === 'public' ? 'text-[#63474D]' : 'text-gray-400'}`} />
              <span className="text-xs font-bold text-[#2D1F23]">Public Profile</span>
              {visibility === 'public' && (
                <span className="ml-auto text-[10px] font-bold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#756366] leading-relaxed">
              Anyone with your profile link can see your verified event attendance, earned badges, and turnout statistics.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleVisibilityChange('private')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${visibility === 'private'
                ? 'bg-[#FAF7F5] border-[#63474D] ring-2 ring-[#63474D]/20 shadow-xs'
                : 'bg-white border-[#E8DDD7] hover:border-[#63474D]/50'
              }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Lock className={`w-4 h-4 ${visibility === 'private' ? 'text-[#63474D]' : 'text-gray-400'}`} />
              <span className="text-xs font-bold text-[#2D1F23]">Private Profile</span>
              {visibility === 'private' && (
                <span className="ml-auto text-[10px] font-bold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#756366] leading-relaxed">
              Only you and the organizers of events you attend can see your tickets and participation records.
            </p>
          </button>
        </div>

        <div className="pt-1">
          <Link
            to={`/profile/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#63474D] hover:text-[#FFA686] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview Public Verifiable Profile (/profile/{user.id.slice(0, 8)}...)</span>
          </Link>
        </div>
      </div>

      {/* 3. Notifications & Event Alerts */}
      <div className="pt-6 border-t border-[#E8DDD7] space-y-4 max-w-2xl">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#63474D]" />
            Event Alerts & Reminders
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            Configure how Sheeba notifies you about upcoming registered events and badges.
          </p>
        </div>

        <div className="space-y-3 bg-[#FAF7F5] p-4 rounded-2xl border border-[#E8DDD7]">
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#2D1F23] block">Upcoming Event Reminders</span>
              <span className="text-[11px] text-[#756366] block">
                Receive an email 24 hours prior to registered events with your QR entry pass.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D] cursor-pointer"
            />
          </label>

          <div className="border-t border-[#E8DDD7]" />

          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#2D1F23] block">Badge Claim Notifications</span>
              <span className="text-[11px] text-[#756366] block">
                Get notified as soon as an organizer awards you an attendance or achievement badge.
              </span>
            </div>
            <input
              type="checkbox"
              checked={badgeAlerts}
              onChange={(e) => setBadgeAlerts(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D] cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 4. Data & Self-Service Export */}
      <div className="pt-6 border-t border-[#E8DDD7] space-y-4 max-w-2xl">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#63474D]" />
            Export My Attendance Data
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            Download a portable copy of your registered tickets, verified passes, and earned badges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => handleExport('json')}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export as JSON
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => handleExport('csv')}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export as CSV
          </Button>
        </div>
      </div>

      {/* Password & Security */}
      <div className="pt-6 border-t border-[#E8DDD7] space-y-4 max-w-2xl">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#63474D]" />
            Password & Security
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            Manage your account credentials and login security.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7]">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#2D1F23] block">Account Password</span>
            <span className="text-[11px] text-[#756366] block">
              Change your password anytime to keep your Sheeba account secure.
            </span>
          </div>
          <Link
            to="/app/change-password"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#63474D] text-white rounded-xl text-xs font-bold hover:bg-[#52393F] transition-all cursor-pointer shadow-xs hover:shadow-sm shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </Link>
        </div>
      </div>

      {/* 5. Danger Zone */}
      <div className="pt-6 border-t border-red-200 space-y-4 max-w-2xl">
        <button
          type="button"
          onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
          className="w-full flex items-center justify-between text-left py-2 text-red-700 hover:text-red-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-serif font-bold text-sm">Account Danger Zone</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-red-600 transition-transform duration-200 ${isDangerZoneOpen ? 'rotate-180' : ''
              }`}
          />
        </button>

        {isDangerZoneOpen && (
          <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl space-y-4 animate-fade-in">
            <div>
              <h3 className="text-xs font-bold text-red-900">Delete Attendee Account</h3>
              <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                Permanently deletes your attendee account, registered event tickets, dynamic QR passes, and verified badge records. This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete My Account</span>
              </button>
            ) : (
              <div className="p-4 bg-white border border-red-300 rounded-xl space-y-3">
                <p className="text-xs font-bold text-red-900">
                  Are you sure? Type <span className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-800">DELETE</span> below to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3 py-2 border border-red-300 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteAccount}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Confirm Permanently Delete'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                      setDeleteError(null);
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logout button at bottom */}
      <div className="pt-4 border-t border-[#E8DDD7] flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#756366] hover:text-[#63474D] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out of Attendee Account</span>
        </button>
      </div>


      {/* Add Exhibitor Role Modal */}
      {showAddExhibitorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setShowAddExhibitorModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E8DDD7] z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DDD7]">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#63474D]" />
                <h3 className="font-serif font-bold text-base text-[#2D1F23]">Activate Exhibitor Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExhibitorModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#756366] leading-relaxed">
              Add the Exhibitor capability to your account. Your attendee profile and ticket passes will remain completely intact.
            </p>

            {addExhibitorError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {addExhibitorError}
              </div>
            )}
            {addExhibitorSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                {addExhibitorSuccess}
              </div>
            )}

            <form onSubmit={handleAddExhibitorRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Solutions"
                  value={exhibitorCompanyName}
                  onChange={(e) => setExhibitorCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                  Industry Category *
                </label>
                <select
                  value={exhibitorCategory}
                  onChange={(e) => setExhibitorCategory(e.target.value)}
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
                  Company Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+251 9... (optional)"
                  value={exhibitorPhone}
                  onChange={(e) => setExhibitorPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              {user?.hasPassword !== false ? (
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Account Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your existing account password"
                    value={exhibitorPassword}
                    onChange={(e) => setExhibitorPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Confirm with your password to activate the Exhibitor role.</p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  You are signed in via Google OAuth. Confirm below to activate your Exhibitor role without a password.
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  fullWidth
                  variant="primary"
                  size="sm"
                  disabled={isAddingExhibitor}
                >
                  {isAddingExhibitor ? 'Activating...' : 'Activate Exhibitor Role'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddExhibitorModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Switch to Organizer Credential Verification Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setShowSwitchModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E8DDD7] z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DDD7]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#63474D]" />
                <h3 className="font-serif font-bold text-base text-[#2D1F23]">{targetSwitchRole === "EXHIBITOR" ? "Exhibitor Workspace" : "Organizer Workspace"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#756366] leading-relaxed">
              {user?.hasPassword === false
                ? 'Launch your approved Organizer Workspace.'
                : 'Enter your account password to securely authenticate and launch your Organizer Workspace.'}
            </p>

            {switchError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{switchError}</span>
              </div>
            )}

            <form onSubmit={handleSwitchToOrganizer} className="space-y-3.5">
              {user?.hasPassword !== false && (
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756366]" />
                    <input
                      type="password"
                      required
                      autoFocus
                      placeholder="••••••••"
                      value={switchPassword}
                      onChange={(e) => setSwitchPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  fullWidth
                  variant="primary"
                  size="sm"
                  disabled={isSwitching}
                >
                  {isSwitching ? 'Authenticating...' : (user?.hasPassword === false ? 'Launch Workspace' : 'Authenticate & Enter')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSwitchModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
