import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { verifyRegistrationOtpSchema, validateForm } from '../../schemas';
import {
  KeyRound,
  RotateCw,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mail,
} from 'lucide-react';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyRegistrationOtp } = useAuth();

  const stateEmail = location.state?.email || (typeof window !== 'undefined' ? sessionStorage.getItem('sheeba_pending_otp_email') || '' : '');
  const redirectTarget = location.state?.redirect || (typeof window !== 'undefined' ? sessionStorage.getItem('sheeba_pending_otp_redirect') || '/app' : '/app');

  const [email, setEmail] = useState<string>(stateEmail);
  const [otp, setOtp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 3-Minute (180s) OTP Expiration Countdown
  const [timeLeft, setTimeLeft] = useState<number>(180);
  // 60-second Resend Cooldown
  const [resendCooldown, setResendCooldown] = useState<number>(60);

  // Timer effects
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (timeLeft <= 0) {
      setErrorMsg('Your verification code has expired (3-minute limit). Please click "Resend Code" to receive a fresh code.');
      return;
    }

    const validation = validateForm(verifyRegistrationOtpSchema, { email, otp });
    if (!validation.success) {
      setErrorMsg(validation.errors.otp || validation.errors.email || 'Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyRegistrationOtp(email.trim(), otp.trim());
      sessionStorage.removeItem('sheeba_pending_otp_email');
      sessionStorage.removeItem('sheeba_pending_otp_redirect');
      setSuccessMsg('Account verified successfully! Redirecting...');
      setTimeout(() => {
        navigate(redirectTarget, { replace: true });
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    if (!email) {
      setErrorMsg('Please provide your email address to resend the code.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await api.auth.resendRegistrationOtp(email.trim());
      setSuccessMsg(res.message || 'A fresh 6-digit verification code has been dispatched to your email.');
      setTimeLeft(180);
      setResendCooldown(60);
      setOtp('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#63474D]/10 text-[#63474D] mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl font-extrabold text-[#2D1F23] tracking-tight">
          Verify Your Account
        </h1>
        <p className="text-xs text-[#756366] max-w-xs mx-auto leading-relaxed">
          We sent a 6-digit verification code to{' '}
          <span className="font-semibold text-[#2D1F23]">{email || 'your email'}</span> via Brevo.
        </p>
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

        <form onSubmit={handleVerify} className="space-y-4">
          {!stateEmail && (
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
                  className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#2D1F23]">
                6-Digit Verification Code
              </label>
              <div className={`inline-flex items-center gap-1 text-[11px] font-semibold ${timeLeft <= 30 ? 'text-red-600' : 'text-[#756366]'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>Expires in {formatTime(timeLeft)}</span>
              </div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoFocus
              className="w-full text-center tracking-[0.4em] font-mono font-bold text-xl py-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            isLoading={isLoading}
            disabled={otp.length !== 6 || timeLeft <= 0}
          >
            Verify & Create Account
          </Button>
        </form>

        {/* Resend Code Section */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-[#756366]">Didn't receive the email?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isLoading}
            className={`inline-flex items-center gap-1 font-semibold ${
              resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#63474D] hover:underline'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'text-[#FFA686]'}`} />
            {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
          </button>
        </div>
      </div>

      {/* Back to sign in */}
      <div className="text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-[#756366] hover:text-[#2D1F23] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
};
