import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import {
  KeyRound,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Building2,
  Eye,
  EyeOff,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export const SponsorForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 60-second Resend countdown timer
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  // STEP 1: Request OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your corporate work email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.sponsor.sendOtp(cleanEmail);
      setSuccessMsg(res.message || `A 6-digit verification code has been dispatched to ${cleanEmail}.`);
      setStep(2);
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please check the email and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await api.auth.sponsor.sendOtp(email.trim());
      setSuccessMsg(res.message || 'A fresh 6-digit verification code has been sent.');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Authenticate 6-Digit OTP standalone
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.sponsor.verifyOtp(email.trim(), cleanOtp);
      setSuccessMsg(res.message || 'Code verified successfully! Please enter your new password.');
      // Gracefully transition to step 3
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Set New Password & Confirm Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.sponsor.resetPassword(email.trim(), otp.trim(), newPassword);
      setSuccessMsg(res.message || 'Your password has been reset successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/sponsor/auth');
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please check the code or request a fresh OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-md mx-auto pt-24 sm:pt-28 pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-[#63474D] flex items-center justify-center text-[#FFA686] mx-auto shadow-md border border-[#FFA686]/30">
          <KeyRound className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#63474D]/10 text-[#63474D] text-xs font-bold">
          <Building2 className="w-3.5 h-3.5 text-[#FFA686]" />
          <span>Sponsor Account Security</span>
        </div>
        <h1 className="font-serif text-3xl font-extrabold text-[#2D1F23]">
          {step === 3 ? 'Set New Password' : 'Reset Password'}
        </h1>
        <p className="text-xs text-[#756366]">
          {step === 1 && 'Enter your registered corporate work email to receive a 6-digit OTP code.'}
          {step === 2 && `Enter the 6-digit verification code sent to ${email}.`}
          {step === 3 && 'OTP authenticated! Choose a strong new password for your sponsor account.'}
        </p>
      </div>

      {/* Progress Stepper Indicator */}
      <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step >= 1 ? 'bg-[#63474D] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step > 1 ? '✓' : '1'}
          </span>
          <span className={step === 1 ? 'text-[#63474D] font-bold' : 'text-gray-400 font-normal'}>
            Email
          </span>
        </div>
        <div className={`h-0.5 w-6 ${step >= 2 ? 'bg-[#63474D]' : 'bg-gray-200'}`} />
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step >= 2 ? 'bg-[#63474D] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step > 2 ? '✓' : '2'}
          </span>
          <span className={step === 2 ? 'text-[#63474D] font-bold' : 'text-gray-400 font-normal'}>
            Verify OTP
          </span>
        </div>
        <div className={`h-0.5 w-6 ${step >= 3 ? 'bg-[#63474D]' : 'bg-gray-200'}`} />
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step === 3 ? 'bg-[#63474D] text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            3
          </span>
          <span className={step === 3 ? 'text-[#63474D] font-bold' : 'text-gray-400 font-normal'}>
            New Password
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8DDD7] shadow-sm space-y-4">
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Corporate Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4 animate-fade-in">
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
              <p className="text-[11px] text-gray-500 mt-1">
                Must be an existing registered sponsor account.
              </p>
            </div>

            <Button
              type="submit"
              fullWidth
              size="md"
              variant="primary"
              disabled={isLoading}
              className="font-bold py-3"
            >
              {isLoading ? 'Checking Account & Generating OTP...' : 'Send 6-Digit OTP Code'}
            </Button>

            {/* Local dev notice */}
            <div className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl flex items-start gap-2 text-[11px] text-gray-600">
              <Terminal className="w-3.5 h-3.5 text-[#63474D] flex-shrink-0 mt-0.5" />
              <p>
                <strong>Local Dev Note:</strong> If live SMTP/Resend is not yet connected in <code className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">.env</code>, your 6-digit OTP is also logged in real-time to the backend terminal!
              </p>
            </div>
          </form>
        )}

        {/* STEP 2: Authenticate 6-Digit OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#2D1F23]">
                  Enter 6-Digit Verification Code
                </label>
                <span className="text-[11px] text-gray-500 font-mono inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FFA686]" />
                  <span>15 min expiry</span>
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full py-3.5 text-center tracking-[10px] font-mono text-2xl font-extrabold bg-[#FAF7F5] border-2 border-[#E8DDD7] focus:border-[#63474D] rounded-xl focus:outline-none text-[#63474D] shadow-inner"
              />
              <p className="text-[11px] text-gray-500 mt-1 text-center">
                Dispatched to <strong className="text-[#2D1F23]">{email}</strong>
              </p>
            </div>

            {/* Resend OTP and Change Email Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-gray-500 hover:text-gray-800 underline decoration-dotted"
              >
                Change email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#63474D] hover:underline'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'text-[#FFA686]'}`} />
                <span>
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              size="md"
              variant="primary"
              disabled={isLoading || otp.trim().length !== 6}
              className="font-bold py-3"
            >
              {isLoading ? 'Authenticating Code...' : 'Verify Code & Proceed →'}
            </Button>

            {/* Dev hint */}
            <div className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl flex items-start gap-2 text-[11px] text-gray-600">
              <Terminal className="w-3.5 h-3.5 text-[#63474D] flex-shrink-0 mt-0.5" />
              <p>
                Check your terminal running backend <code className="font-mono bg-white px-1 py-0.5 rounded border border-gray-200">npm run dev</code> to copy the printed 6-digit code.
              </p>
            </div>
          </form>
        )}

        {/* STEP 3: Set New Password (gracefully appears after OTP authentication) */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
            {/* Verified Badge */}
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Identity Authenticated</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-700">{email}</span>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                New Corporate Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="md"
              variant="primary"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="font-bold py-3 mt-2"
            >
              {isLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
            </Button>
          </form>
        )}
      </div>

      {/* Back to Login */}
      <div className="text-center text-xs">
        <Link
          to="/sponsor/auth"
          className="inline-flex items-center gap-1.5 text-gray-600 hover:text-[#63474D] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sponsor Sign In</span>
        </Link>
      </div>
    </div>
  );
};
