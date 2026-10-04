import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { changePasswordSchema, validateForm } from '../../schemas';
import {
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Determine back navigation path based on user role
  const getSettingsPath = () => {
    switch (user?.role) {
      case 'ORGANIZER':
        return '/organizer/settings';
      case 'ADMIN':
        return '/admin/profile';
      case 'SPONSOR':
        return '/sponsor/settings';
      case 'ATTENDEE':
      default:
        return '/app/settings';
    }
  };

  const settingsPath = getSettingsPath();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = validateForm(changePasswordSchema, {
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const firstError =
        validation.errors.confirmPassword ||
        validation.errors.newPassword ||
        validation.errors.currentPassword ||
        'Please verify your password inputs.';
      setErrorMsg(firstError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccessMsg(
        res.message ||
          'Your password has been changed successfully! A confirmation email has been sent. Returning to settings...'
      );

      setTimeout(() => {
        navigate(settingsPath, {
          state: {
            successMessage:
              'Your password has been changed successfully. A confirmation email has been sent to your address.',
          },
        });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={settingsPath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Settings</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#63474D]/10 text-[#63474D] mb-2">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23] tracking-tight">
          Change Password
        </h1>
        <p className="text-xs sm:text-sm text-[#756366] leading-relaxed">
          Update your account password below. Once changed, a confirmation email will be delivered to{' '}
          <span className="font-semibold text-[#2D1F23]">{user?.email || 'your email'}</span>.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-red-700 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1 font-medium">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Toggle current password visibility"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
              <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Toggle new password visibility"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#756366] mt-1">Must be at least 6 characters long.</p>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-[#2D1F23] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
              <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-xs"
            >
              Change Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
