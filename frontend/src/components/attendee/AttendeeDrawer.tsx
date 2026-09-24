import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  User,
  Settings,
  LogOut,
  Award,
  ExternalLink,
  ChevronRight,
  Minimize2,
  Maximize2,
  Menu,
} from 'lucide-react';

interface AttendeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendeeDrawer: React.FC<AttendeeDrawerProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
      />

      {/* Drawer Panel - Positioned to the Left with Rose Petal Background */}
      <div
        className={`absolute inset-y-0 left-0 max-w-full flex transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-full sm:w-[480px]' : 'w-full sm:w-96'
        }`}
      >
        <div className="w-full bg-[#fdf7f8] shadow-2xl flex flex-col justify-between border-r border-[#f4e6e8]">
          {/* Drawer Top Header */}
          <div className="p-6 border-b border-[#f4e6e8] flex items-center justify-between">
            <div className="flex items-center gap-2 text-sheeba-dark">
              <Menu className="w-4 h-4 text-sheeba-purple" />
              <span className="font-serif font-bold text-lg">Tools</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-[#f6eaec] transition-colors hidden sm:inline-flex cursor-pointer"
                title={isExpanded ? 'Minimize drawer' : 'Expand drawer'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-[#f6eaec] transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* User Profile - Unboxed, Pure Info */}
            <div className="flex items-center gap-3.5 pb-2">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt={user?.name}
                className="w-12 h-12 rounded-full object-cover border border-sheeba-rose/30 shadow-2xs"
              />
              <div className="space-y-0.5">
                <h3 className="font-serif font-bold text-base text-sheeba-dark">{user?.name}</h3>
                <p className="text-xs text-gray-500 font-light">{user?.email}</p>
              </div>
            </div>

            {/* Quick Actions & Links */}
            <div className="space-y-1.5 pt-2 border-t border-[#f4e6e8]">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-sheeba-rose px-1">
                Attendee Navigation & Profile
              </span>

              <Link
                to="/app/profile"
                onClick={onClose}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/80 text-gray-700 hover:text-sheeba-dark transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sheeba-purple/10 text-sheeba-purple flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">Public Profile & Credentials</span>
                    <span className="text-[11px] text-gray-500 font-light">Share your verified badges publicly</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/app/settings"
                onClick={onClose}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/80 text-gray-700 hover:text-sheeba-dark transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sheeba-rose/10 text-sheeba-rose flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">Account Settings</span>
                    <span className="text-[11px] text-gray-500 font-light">Privacy, email, and password controls</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {user?.id && (
                <Link
                  to={`/profile/${user.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/80 text-gray-700 hover:text-sheeba-dark transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sheeba-coral/20 text-sheeba-purple flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold block">View as Public Visitor</span>
                      <span className="text-[11px] text-gray-500 font-light">Preview your external shareable link</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          </div>

          {/* Drawer Bottom Footer */}
          <div className="p-6 border-t border-[#f4e6e8] bg-[#faeff1]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
