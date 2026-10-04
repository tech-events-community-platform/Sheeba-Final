import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import {
  forgotOtpStep1Schema,
  forgotOtpStep2Schema,
  resetPasswordStep3Schema,
  validateForm,
} from '../../schemas';
import {
  KeyRound,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = (location.state as any)?.email || '';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState<string>(initialEmail);
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 3-minute OTP countdown (180s)
  const [timeLeft, setTimeLeft] = useState<number>(180);
  // 60-second Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Step 2 timer countdown
  useEffect(() => {
    let timer: any = null;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    let cooldownTimer: any = null;
    if (resendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (cooldownTimer) clearInterval(cooldownTimer);
    };
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // STEP 1: Request 6-digit verification code to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = validateForm(forgotOtpStep1Schema, { email });
    if (!validation.success) {
      setErrorMsg(validation.errors.email || 'Please enter a valid email address.');
      return;
    }

    const cleanEmail = email.trim();
    setIsLoading(true);
    try {
      const res = await api.auth.forgotPassword(cleanEmail);
      setSuccessMsg(res.message || `A 6-digit verification code has been dispatched to ${cleanEmail}.`);
      setStep(2);
      setTimeLeft(180);
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please check your email and try again.');
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
      const res = await api.auth.forgotPassword(email.trim());
      setSuccessMsg(res.message || 'A fresh 6-digit verification code has been dispatched.');
      setTimeLeft(180);
      setResendCooldown(60);
      setOtp('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Authenticate 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (timeLeft <= 0) {
      setErrorMsg('Verification code has expired (3-minute limit). Please click "Resend Code".');
      return;
    }

    const validation = validateForm(forgotOtpStep2Schema, { otp });
    if (!validation.success) {
      setErrorMsg(validation.errors.otp || 'Please enter the complete 6-digit verification code.');
      return;
    }

    const cleanOtp = otp.trim();
    setIsLoading(true);
    try {
      const res = await api.auth.verifyOtp(email.trim(), cleanOtp);
      setSuccessMsg(res.message || 'Code verified successfully! Enter your new password below.');
      // Transition to Step 3: Write new password and confirm it
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Write New Password and Confirm It
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = validateForm(resetPasswordStep3Schema, { newPassword, confirmPassword });
    if (!validation.success) {
      setErrorMsg(validation.errors.newPassword || validation.errors.confirmPassword || 'Invalid password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.resetPasswordWithOtp({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      setSuccessMsg(res.message || 'Your password has been changed successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login', {
          state: {
            successMessage: 'Your password has been changed successfully. You may now sign in with your new password.',
          },
        });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[430px] mx-auto px-4 py-8 space-y-4">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#63474D]/10 text-[#63474D] mb-1">
          {step === 3 ? (
            <Lock className="w-6 h-6" />
          ) : step === 2 ? (
            <KeyRound className="w-6 h-6" />
          ) : (
            <Mail className="w-6 h-6" />
          )}
        </div>
        <h1 className="font-serif text-2xl font-extrabold text-[#2D1F23] tracking-tight">
          {step === 1 && 'Reset Your Password'}
          {step === 2 && 'Enter Verification Code'}
          {step === 3 && 'Set New Password'}
        </h1>
        <p className="text-xs text-[#756366] max-w-xs mx-auto leading-relaxed">
          {step === 1 && 'Enter your account email to receive a 6-digit verification code.'}
          {step === 2 && `Enter the 6-digit code dispatched to ${email}.`}
          {step === 3 && 'Choose a strong new password for your Sheeba account.'}
        </p>
      </div>

      {/* Step Progress Dots */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <span
          className={`h-1.5 rounded-full transition-all duration-300 ${
            step >= 1 ? 'w-8 bg-[#63474D]' : 'w-2 bg-[#E8DDD7]'
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all duration-300 ${
            step >= 2 ? 'w-8 bg-[#63474D]' : 'w-2 bg-[#E8DDD7]'
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all duration-300 ${
            step === 3 ? 'w-8 bg-[#63474D]' : 'w-2 bg-[#E8DDD7]'
          }`}
        />
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E8DDD7] rounded-3xl p-6 shadow-sm space-y-4">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{errorMsg}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{successMsg}</p>
          </div>
        )}

        {/* STEP 1: Email Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                Account Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="py-2.5 text-xs font-bold rounded-xl"
            >
              Send 6-Digit Code
            </Button>
          </form>
        )}

        {/* STEP 2: OTP Verification Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#2D1F23]">
                  6-Digit Verification Code
                </label>
                <div
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                    timeLeft <= 30 ? 'text-red-600' : 'text-[#756366]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in {formatTime(timeLeft)}</span>
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                className="w-full px-4 py-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-center text-2xl font-mono font-bold tracking-[0.3em] text-[#63474D] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
              <p className="text-[11px] text-[#756366] text-center mt-1.5">
                Check your inbox and spam folder for the code from Sheeba.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              disabled={otp.length !== 6 || timeLeft <= 0}
              className="py-2.5 text-xs font-bold rounded-xl"
            >
              Verify Code & Continue
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-medium text-[#756366] hover:text-[#2D1F23] transition-colors"
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className={`inline-flex items-center gap-1 text-xs font-bold transition-colors ${
                  resendCooldown > 0 || isLoading
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-[#63474D] hover:underline cursor-pointer'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Write New Password and Confirm It */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  minLength={6}
                  className="w-full pl-9 pr-9 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#756366] mt-1">Must be at least 6 characters long.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">
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
                  className="w-full pl-9 pr-9 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="py-2.5 text-xs font-bold rounded-xl"
            >
              Reset Password
            </Button>
          </form>
        )}

        {/* Back to Sign In Link */}
        <div className="pt-2 text-center border-t border-[#E8DDD7]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
