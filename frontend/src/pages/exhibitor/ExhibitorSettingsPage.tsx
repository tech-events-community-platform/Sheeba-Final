import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Tag,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const ExhibitorSettingsPage: React.FC = () => {
  const { user, refreshUser, switchRole } = useAuth();
  const navigate = useNavigate();
  const [switchTargetRole, setSwitchTargetRole] = useState<'ATTENDEE' | 'ORGANIZER'>('ATTENDEE');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchPassword, setSwitchPassword] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(user?.companyName || user?.organization || '');
  const [industryCategory, setIndustryCategory] = useState(user?.industryCategory || 'Tech & Software');
  const [contactName, setContactName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.companyPhone || user?.phone || '');
  const [website, setWebsite] = useState(user?.companyWebsite || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      if (user.companyName || user.organization) setCompanyName(user.companyName || user.organization || '');
      if (user.industryCategory) setIndustryCategory(user.industryCategory);
      if (user.name) setContactName(user.name);
      if (user.companyPhone || user.phone) setPhone(user.companyPhone || user.phone || '');
      if (user.companyWebsite) setWebsite(user.companyWebsite);
      if (user.bio) setBio(user.bio);
    }
  }, [user]);

  
  const handleSwitchWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (user.hasPassword !== false && !switchPassword) {
      setSwitchError('Please enter your account password.');
      return;
    }
    setIsSwitching(true);
    setSwitchError(null);
    try {
      await switchRole(switchTargetRole, switchPassword || undefined);
      setShowSwitchModal(false);
      if (switchTargetRole === 'ORGANIZER') {
        navigate('/organizer');
      } else {
        navigate('/attendee/events');
      }
    } catch (err: any) {
      setSwitchError(err.message || 'Authentication failed. Please verify your password.');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.users.updateProfile({
        name: contactName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        companyName: companyName.trim(),
        organization: companyName.trim(),
        industryCategory: industryCategory.trim(),
        companyPhone: phone.trim(),
        companyWebsite: website.trim(),
      });
      if (refreshUser) {
        await refreshUser();
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update exhibitor profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl pb-16">
      {/* Header */}
      <div>
        <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
          Company Settings
        </span>
        <h1 className="font-serif font-black text-2xl sm:text-3xl text-[#2D1F23]">
          Exhibitor Profile
        </h1>
        <p className="text-xs text-gray-500">
          This profile information is pre-filled when you apply for event booth floor space.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Exhibitor profile details updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-[#E8DDD7] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1">
              Company Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1">
              Industry Category
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={industryCategory}
                onChange={(e) => setIndustryCategory(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1">
              Contact Representative Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1">
              Contact Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                readOnly
                disabled
                className="w-full pl-9 pr-3.5 py-2.5 bg-gray-100 border border-[#E8DDD7] rounded-xl text-xs text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1">
              Website URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#2D1F23] mb-1">
            Company Overview / Description
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
          />
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={saving}
            disabled={saving}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    
      {/* Account Roles & Workspace Switcher */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div>
          <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
            Multi-Role Account
          </span>
          <h2 className="font-serif font-black text-xl text-[#2D1F23]">
            Account Roles & Workspaces
          </h2>
          <p className="text-xs text-gray-500">
            Switch between your activated workspaces without logging out. One account, one password.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2D1F23]">Exhibitor</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#63474D] text-white rounded-full">
                Current Active
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Managing booths and leads.</p>
          </div>

          <div className="p-3.5 bg-white border border-[#E8DDD7] rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2D1F23]">Attendee</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                Available
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Events, tickets, and badges.</p>
            <button
              type="button"
              onClick={() => {
                setSwitchTargetRole('ATTENDEE');
                setShowSwitchModal(true);
                setSwitchPassword('');
                setSwitchError(null);
              }}
              className="text-[11px] font-bold text-[#63474D] hover:underline block pt-1 cursor-pointer"
            >
              Switch to Workspace →
            </button>
          </div>

          {(user?.isOrganizer || user?.organizerApprovalStatus === 'approved') && (
            <div className="p-3.5 bg-white border border-[#E8DDD7] rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2D1F23]">Organizer</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Available
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Manage community events.</p>
              <button
                type="button"
                onClick={() => {
                  setSwitchTargetRole('ORGANIZER');
                  setShowSwitchModal(true);
                  setSwitchPassword('');
                  setSwitchError(null);
                }}
                className="text-[11px] font-bold text-[#63474D] hover:underline block pt-1 cursor-pointer"
              >
                Switch to Workspace →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Switch Workspace Password Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setShowSwitchModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E8DDD7] z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8DDD7]">
              <h3 className="font-serif font-bold text-base text-[#2D1F23]">
                Switch to {switchTargetRole === 'ORGANIZER' ? 'Organizer' : 'Attendee'} Workspace
              </h3>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Enter your account password to verify your identity and switch workspace context.
            </p>

            {switchError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {switchError}
              </div>
            )}

            <form onSubmit={handleSwitchWorkspace} className="space-y-3.5">
              {user?.hasPassword !== false && (
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Account Password
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="••••••••"
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />
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
                  {isSwitching ? 'Switching...' : 'Authenticate & Switch'}
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