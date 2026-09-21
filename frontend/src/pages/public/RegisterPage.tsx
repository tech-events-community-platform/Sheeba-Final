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
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import type { UserRole } from '../../types/user';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const roleParam = searchParams.get('role');
  const { user, isAuthenticated, loginWithGoogle, register } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    roleParam?.toUpperCase() === 'ORGANIZER' ? 'ORGANIZER' : 'ATTENDEE'
  );

  // Common fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Organizer-specific fields
  const [organization, setOrganization] = useState('');
  const [bio, setBio] = useState('');

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedRole === 'ORGANIZER' && !organization.trim()) {
      setErrorMsg('Please specify your organization or community name.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role: selectedRole,
        organization: selectedRole === 'ORGANIZER' ? organization.trim() : undefined,
        phone: phone.trim() || undefined,
        bio: selectedRole === 'ORGANIZER' ? bio.trim() : undefined,
      });

      if (res.isPendingApproval || selectedRole === 'ORGANIZER') {
        // Redirect to pending approval page with 1-hour wait notice
        navigate('/pending-approval', {
          state: {
            email: email.trim(),
            name: fullName.trim(),
            organization: organization.trim(),
          },
        });
      } else {
        // Attendee: context preserved across signup
        if (redirectTarget) {
          navigate(redirectTarget);
        } else {
          navigate('/app');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[430px] mx-auto px-4 py-2 sm:py-3 space-y-2.5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="font-serif text-2xl sm:text-[26px] font-extrabold text-[#2D1F23] tracking-tight leading-tight">
          Create Your Account
        </h1>
        <p className="text-xs text-[#756366] max-w-xs mx-auto leading-snug">
          Join Ethiopia&apos;s premier event community and earn verifiable credentials.
        </p>
      </div>

      {/* Navigation Links at top (Blue line position) */}
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
        {/* Account Type Switcher in top position (Yellow circle position) */}
        <div className="grid grid-cols-2 bg-[#FAF7F5] p-1 rounded-xl border border-[#E8DDD7] gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedRole('ATTENDEE')}
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
            onClick={() => setSelectedRole('ORGANIZER')}
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

        {/* Organizer approval notification note */}
        {selectedRole === 'ORGANIZER' && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-snug">
              Admin verification required for organizers before hosting events.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-2.5">
          <div>
            <label className="block text-xs font-semibold text-[#2D1F23] mb-1">Full Name</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366]" />
              <input
                type="text"
                required
                placeholder="e.g. Abebe Kebede"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          {selectedRole === 'ORGANIZER' && (
            <div>
              <label className="block text-xs font-semibold text-[#2D1F23] mb-1">
                Community or Organization Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366]" />
                <input
                  type="text"
                  required
                  placeholder="e.g. GDG Addis, ALX Tech Community"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#2D1F23] mb-1">Email Address</label>
            <div className="relative">
              <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2D1F23] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756366]" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2D1F23] mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+2519..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
              />
            </div>
          </div>

          {selectedRole === 'ORGANIZER' && (
            <div>
              <label className="block text-xs font-semibold text-[#2D1F23] mb-1">Organizer Bio (Optional)</label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#756366]" />
                <textarea
                  rows={2}
                  placeholder="Tell attendees about your tech community..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs sm:text-sm text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Red box: Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="primary"
            isLoading={isLoading}
            className="mt-1.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            {selectedRole === 'ORGANIZER'
              ? 'Submit Organizer Registration'
              : 'Register as Attendee'}
          </Button>
        </form>

        {/* Green line position: Continue with Google */}
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
                    if (redirectTarget) {
                      navigate(redirectTarget);
                    } else if (loggedUser.role === 'ORGANIZER') {
                      navigate('/organizer');
                    } else if (loggedUser.role === 'ADMIN') {
                      navigate('/admin');
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
