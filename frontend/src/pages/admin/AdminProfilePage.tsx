import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, LogOut, Lock, Settings } from 'lucide-react';

export const AdminProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDD7] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'}
            alt="Admin Profile"
            className="w-24 h-24 rounded-full object-cover border-4 border-[#FFA686]/60 shadow-xs"
          />

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
                {user?.name || 'Hanan Admin'}
              </h1>
              <Badge variant="primary" icon={<Lock className="w-3.5 h-3.5" />}>
                Administrator
              </Badge>
            </div>

            <p className="text-xs text-[#756366] flex items-center justify-center sm:justify-start gap-1">
              <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
              {user?.email || 'admin@sheeba.et'}
            </p>

            <p className="text-xs text-[#756366] leading-relaxed">
              Sheba Platform System Administrator. Overseeing event verification nodes, community organizers, and infrastructure telemetry.
            </p>

            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3 text-xs">
              <Badge variant="success">Account Status: Active</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8DDD7] space-y-4 shadow-xs">
        <h3 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#63474D]" />
          Platform Session Management
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link to="/admin">
            <Button variant="outline" size="sm" icon={<ShieldCheck className="w-4 h-4" />}>
              Back to Admin Dashboard
            </Button>
          </Link>
          <Button
            onClick={handleLogout}
            variant="danger"
            size="sm"
            icon={<LogOut className="w-4 h-4" />}
          >
            Log out of Admin Console
          </Button>
        </div>
      </div>
    </div>
  );
};
