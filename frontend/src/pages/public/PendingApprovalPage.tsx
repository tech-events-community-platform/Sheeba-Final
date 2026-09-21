import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Clock,
  ShieldAlert,
  Building,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../services/api';

export const PendingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; name?: string; organization?: string } | undefined;

  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const me = await api.auth.getMe();
      if (me && me.approvalStatus === 'approved' && me.role === 'ORGANIZER') {
        setStatusMessage('Your account is approved! Redirecting to your Organizer Workspace...');
        setTimeout(() => navigate('/organizer'), 1200);
      } else {
        setStatusMessage('Your registration is still under review. You will be using this system in 1 hour.');
      }
    } catch {
      setStatusMessage('Your registration is still awaiting Admin approval. You will be using this system in 1 hour.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-xl mx-auto pt-28 sm:pt-32 pb-20 px-4 space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-[#E8DDD7] shadow-sm text-center space-y-6">
        {/* Animated Clock / Status Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-[#FFA686]/20 border border-[#FFA686]/40 flex items-center justify-center text-[#63474D] shadow-inner">
            <Clock className="w-10 h-10 animate-pulse text-[#63474D]" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white rounded-full p-1.5 shadow-md">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Primary Notice */}
        <div className="space-y-2">
          <Badge variant="tertiary" className="px-3 py-1 font-bold text-xs uppercase tracking-wider">
            Organizer Approval Pending
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#2D1F23]">
            you will be using this sytem in 1 hour
          </h1>
          <p className="text-sm text-[#756366] max-w-md mx-auto">
            Your organizer registration has been received and forwarded to the <strong>Platform Admin</strong> for approval.
          </p>
        </div>

        {/* Registered Details Summary */}
        <div className="bg-[#FAF7F5] p-5 rounded-2xl border border-[#E8DDD7] text-left space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-[#E8DDD7] pb-2.5">
            <span className="font-semibold text-[#756366]">Role Applied</span>
            <span className="font-bold text-[#63474D]">Event Organizer / Host</span>
          </div>
          {state?.organization && (
            <div className="flex items-center justify-between text-xs border-b border-[#E8DDD7] pb-2.5">
              <span className="font-semibold text-[#756366] flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Organization
              </span>
              <span className="font-bold text-[#2D1F23]">{state.organization}</span>
            </div>
          )}
          {state?.email && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#756366] flex items-center gap-1">
                <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" /> Email
              </span>
              <span className="font-bold text-[#2D1F23]">{state.email}</span>
            </div>
          )}
        </div>

        {/* Live Status Message */}
        {statusMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleCheckStatus}
            isLoading={isChecking}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            Check Approval Status
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2"
          >
            Back to Sign In
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="pt-4 border-t border-[#E8DDD7] text-xs text-[#756366] space-y-2">
          <p>
            Are you the Platform Administrator?{' '}
            <Link to="/login" className="font-bold text-[#63474D] hover:underline">
              Sign in as Admin
            </Link>{' '}
            to approve pending organizer requests.
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
