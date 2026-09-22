import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import {
  Trash2,
  AlertTriangle,
  User,
  Building,
  AlertCircle,
  LogOut,
  ChevronDown,
  UserCheck,
  Lock,
  X,
} from 'lucide-react';
import { TelegramIcon, XIcon, TikTokIcon, YouTubeIcon } from '../../components/ui/SocialIcons';
import { OrganizerDefaultQuestionsSettings } from '../../components/organizer/OrganizerDefaultQuestionsSettings';

export const AccountSettingsPage: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [email] = useState(user?.email || '');
  const [telegram, setTelegram] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Switch to Attendee state
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchPassword, setSwitchPassword] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const handleSwitchToAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchPassword) {
      setSwitchError('Please enter your account password.');
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);

    try {
      await switchRole('ATTENDEE', switchPassword);
      setShowSwitchModal(false);
      navigate('/app');
    } catch (err: any) {
      setSwitchError(err.message || 'Authentication failed. Please verify your password.');
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setOrganization(user.organization || '');
      try {
        const stored =
          localStorage.getItem(`sheeba_organizer_socials_${user.id}`) ||
          localStorage.getItem('sheeba_organizer_socials');
        if (stored) {
          const parsed = JSON.parse(stored);
          setTelegram(parsed.telegram || '');
          setXHandle(parsed.x || '');
          setTiktok(parsed.tiktok || '');
          setYoutube(parsed.youtube || '');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await api.account.updateProfile(user.id, {
        name,
        organization,
      });

      const socialsData = {
        telegram: telegram.trim(),
        x: xHandle.trim(),
        tiktok: tiktok.trim(),
        youtube: youtube.trim(),
      };
      localStorage.setItem(`sheeba_organizer_socials_${user.id}`, JSON.stringify(socialsData));
      localStorage.setItem('sheeba_organizer_socials', JSON.stringify(socialsData));

      setSaveMsg('Profile & socials updated successfully.');
      setTimeout(() => setSaveMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteError(null);
    try {
      await api.account.deleteAccount(user.id);
      logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(
        err.message ||
          'Cannot delete account: You have upcoming or ongoing events. Complete or cancel them first.'
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isSponsor = user?.role === 'SPONSOR';
  const isAdmin = user?.role === 'ADMIN';

  const roleTitle = isSponsor
    ? 'Sponsor Workspace Settings'
    : isAdmin
    ? 'Administrator System Settings'
    : 'Organizer Account Settings';

  const roleSubtitle = isSponsor
    ? 'Manage your corporate sponsor profile, company representative, and preferences.'
    : isAdmin
    ? 'Manage your administrative identity, supervisory profile, and platform controls.'
    : 'Manage your organizer community profile, socials, and account.';

  const profileSectionTitle = isSponsor
    ? 'Corporate Sponsor Profile'
    : isAdmin
    ? 'Administrator Profile Information'
    : 'Organizer Profile Information';

  const profileSectionSubtitle = isSponsor
    ? 'Your company name and official website appear to event organizers on sponsorship deals.'
    : isAdmin
    ? 'Your supervisory credentials and governance identity on the Sheeba platform.'
    : 'Your name, community organization, and social channels appear on public event pages.';

  const orgLabel = isSponsor
    ? 'Company / Enterprise Name'
    : isAdmin
    ? 'Administrative Department / Unit'
    : 'Organization / Community Name';

  const orgPlaceholder = isSponsor
    ? 'e.g. Telebirr, Safaricom, Chapa'
    : isAdmin
    ? 'e.g. Sheeba Executive Platform Administration'
    : 'e.g. GDG Addis, ALX Tech Community';

  const socialsSubtitle = isSponsor
    ? 'Provide your brand official social channels (LinkedIn, X, Telegram) for event listings.'
    : isAdmin
    ? 'Official administrative and platform communication links.'
    : 'Provide your community social links. These will appear beside your organizer name below event posters on public registration pages.';

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-2 sm:px-4 space-y-8 pb-20">
      {/* Page Heading (Unboxed, expanded to left & right) */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
          {roleTitle}
        </h1>
        <p className="text-xs text-[#756366]">
          {roleSubtitle}
        </p>
      </div>

      {saveMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-fade-in max-w-xl">
          <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* 1. Profile Information (Unboxed, no rectangle box background) */}
      <div className="space-y-6">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <User className="w-4 h-4 text-[#63474D]" />
            {profileSectionTitle}
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            {profileSectionSubtitle}
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#63474D]" />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#63474D]" />
                {orgLabel}
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder={orgPlaceholder}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>

          {/* Email input brought halfway to the left */}
          <div className="max-w-xs sm:max-w-sm">
            <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
              <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
              Contact Email
            </label>
            <input
              type="email"
              readOnly
              value={email}
              className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 mt-1">Contact support to modify primary login email.</p>
          </div>

          {/* Social Accounts */}
          <div className="pt-4 border-t border-[#E8DDD7]/70 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[#2D1F23]">Social Accounts</h3>
              <p className="text-[11px] text-[#756366]">
                {socialsSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <TelegramIcon className="w-3.5 h-3.5 text-[#0088cc]" />
                  Telegram
                </label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@channel or https://t.me/..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <XIcon className="w-3.5 h-3.5 text-[#2D1F23]" />
                  X (Twitter)
                </label>
                <input
                  type="text"
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  placeholder="@handle or https://x.com/..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <TikTokIcon className="w-3.5 h-3.5 text-black" />
                  TikTok
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@account or https://tiktok.com/@..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <YouTubeIcon className="w-3.5 h-3.5 text-[#ff0000]" />
                  YouTube
                </label>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="@channel or https://youtube.com/..."
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isSavingProfile}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Organizer Default Registration Questions */}
      {!isSponsor && !isAdmin && user?.role === 'ORGANIZER' && (
        <OrganizerDefaultQuestionsSettings user={user} />
      )}

      {/* 2. Personal Attendee Account */}
      <div className="pt-6 border-t border-[#E8DDD7] space-y-4 max-w-3xl">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#63474D]" />
            Personal Attendee Account
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            {isSponsor
              ? 'Your single account includes corporate sponsor capabilities and a personal Attendee profile.'
              : isAdmin
              ? 'Your single account includes supervisory administration privileges and an Attendee profile.'
              : 'Your single account includes both Organizer capabilities and a personal Attendee profile.'}
          </p>
        </div>

        <div className="p-5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#2D1F23]">Personal Attendee Profile</span>
              <span className="text-[10px] font-bold text-[#2A7B5F] bg-[#2A7B5F]/10 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[11px] text-[#756366] leading-relaxed max-w-lg">
              {isSponsor
                ? 'Want to browse events as a regular attendee, view your registered tickets, or earn attendance badges? Switch your active session to Attendee Workspace.'
                : isAdmin
                ? 'Audit ticket purchases, badge issuing, and live attendee check-in experience firsthand by switching to the Attendee Workspace.'
                : 'Want to attend community meetups, view your registered tickets, or earn verifiable attendance badges? Switch your active session to your Attendee Workspace.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowSwitchModal(true);
              setSwitchPassword('');
              setSwitchError(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#63474D] hover:bg-[#4E373C] text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#FFA686]" />
            <span>Launch Attendee Workspace</span>
          </button>
        </div>
      </div>

      {/* 3. Danger Zone as a Dropdown (Logout and Do an account deletion) */}
      <div className="pt-6 border-t border-red-200/80 space-y-4 max-w-3xl">
        <button
          type="button"
          onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
          className="w-full flex items-center justify-between text-left group cursor-pointer py-1"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <h2 className="font-serif font-bold text-base text-red-900 group-hover:text-red-700 transition-colors">
                Danger Zone
              </h2>
              <p className="text-xs text-[#756366]">
                Manage session logout or perform permanent account deletion.
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-red-700 transition-transform duration-200 ${
              isDangerZoneOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isDangerZoneOpen && (
          <div className="space-y-4 pt-1 animate-fade-in">
            {deleteError && (
              <div className="p-3.5 bg-red-100/80 border border-red-300 rounded-2xl text-xs text-red-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              {/* Logout Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                icon={<LogOut className="w-4 h-4 text-[#63474D]" />}
              >
                Log Out
              </Button>

              {/* Do an account deletion Button */}
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteConfirm(true);
                }}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Do an account deletion
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal Pop-up (In front of the user) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-red-900">
                  Are you sure?
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {isSponsor
                    ? 'This action is permanent. This will permanently erase your sponsor profile and preferences. Deletion is blocked if you have active sponsorship deals.'
                    : isAdmin
                    ? 'Administrative account deletion is restricted. Please contact super-admin for permission.'
                    : 'This action is permanent. This will permanently erase your organizer profile and data. Deletion is blocked if you have ongoing or upcoming events.'}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteAccount}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Yes, Delete My Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Switch to Attendee Credential Verification Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setShowSwitchModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E8DDD7] z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DDD7]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#63474D]" />
                <h3 className="font-serif font-bold text-base text-[#2D1F23]">Attendee Workspace</h3>
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
              Enter your account password to authenticate and enter your personal Attendee Workspace.
            </p>

            {switchError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{switchError}</span>
              </div>
            )}

            <form onSubmit={handleSwitchToAttendee} className="space-y-3.5">
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

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  fullWidth
                  variant="primary"
                  size="sm"
                  disabled={isSwitching}
                >
                  {isSwitching ? 'Authenticating...' : 'Authenticate & Enter'}
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
