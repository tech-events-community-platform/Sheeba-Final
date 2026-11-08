import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, LogOut, ArrowLeft, User } from 'lucide-react';

export const ScannerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (user?.role === 'ORGANIZER') return '/organizer';
    if (user?.role === 'ADMIN') return '/admin';
    return '/app';
  };

  return (
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col font-sans text-[#2D1F23]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8DDD7] px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand & Portal Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/logo.webp"
                alt="Sheeba Logo"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-serif font-bold text-lg text-[#2D1F23]">Sheeba</span>
            </Link>

            <span className="text-[#AA767C]/60 text-sm font-light">|</span>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#63474D] text-white text-xs font-bold shadow-2xs">
              <QrCode className="w-3.5 h-3.5" />
              <span>Gate Portal</span>
            </div>
          </div>

          {/* Right User & Actions */}
          <div className="flex items-center gap-3">
            <Link
              to={getDashboardLink()}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#756366] hover:text-[#2D1F23] px-3 py-1.5 rounded-xl hover:bg-[#FAF7F5] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>My Dashboard</span>
            </Link>

            <div className="flex items-center gap-2 pl-3 border-l border-[#E8DDD7]">
              <div className="w-7 h-7 rounded-full bg-[#63474D] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="hidden md:inline text-xs font-bold text-[#2D1F23] truncate max-w-[120px]">
                {user?.name}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};

