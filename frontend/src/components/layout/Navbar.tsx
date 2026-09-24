import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Award,
  Menu,
  X,
  Settings,
  Ticket,
  Home,
  ArrowLeft,
  LogIn,
} from 'lucide-react';

interface NavbarProps {
  onOpenAttendeeDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAttendeeDrawer: _onOpenAttendeeDrawer }) => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigate(`/#${sectionId}`);
  };

  return (
    <header className="sticky top-0 z-30 px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pointer-events-none transition-all duration-300">
      <div className="pointer-events-auto max-w-7xl mx-auto rounded-full bg-white/15 backdrop-blur-xl border border-white/25 shadow-md shadow-black/5 px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.webp"
              alt="Sheeba Logo"
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl tracking-tight text-sheeba-dark leading-none">
                Sheeba
              </span>
              <span className="text-[8.5px] font-sans font-bold text-sheeba-rose tracking-[0.18em] uppercase mt-0.5">
                EVENT INFRASTRUCTURE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-3">
            {!isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer rounded-lg hover:bg-black/5"
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer rounded-lg hover:bg-black/5"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('interactive-demo')}
                  className="px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer rounded-lg hover:bg-black/5"
                >
                  Interactive Demo
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('audiences')}
                  className="px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer rounded-lg hover:bg-black/5"
                >
                  Audiences
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('team')}
                  className="px-3 py-1.5 text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer rounded-lg hover:bg-black/5"
                >
                  Team
                </button>
              </>
            )}

            {isAuthenticated && role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${isActive('/admin')
                    ? 'bg-sheeba-purple/10 text-sheeba-purple'
                    : 'text-gray-600 hover:text-sheeba-dark hover:bg-gray-100'
                  }`}
              >
                Admin Oversight
              </Link>
            )}
          </nav>

          {/* Right User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {role === 'ADMIN' && (
                  <Badge
                    variant="primary"
                    className="font-semibold px-3 py-1 text-xs"
                  >
                    Admin
                  </Badge>
                )}

                <Link
                  to={role === 'ORGANIZER' ? '/organizer/settings' : role === 'ADMIN' ? '/admin/profile' : '/app/profile'}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full hover:bg-gray-50 transition-colors border border-gray-200/80"
                  title="My Profile & Settings"
                >
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                    alt={user?.name}
                    className="w-7 h-7 rounded-full object-cover border border-[#FFA686]/60"
                  />
                  <span className="text-xs font-semibold text-[#2D1F23]">
                    {user?.name}
                  </span>
                  <Settings className="w-3.5 h-3.5 text-gray-500" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : !['/login', '/register', '/pending-approval'].includes(location.pathname) ? (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button size="sm" variant="outline">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="primary" icon={<LogIn className="w-3.5 h-3.5" />}>
                    Register
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center">
                <Link to="/">
                  <Button size="sm" variant="outline" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
                    Back to Home
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#2D1F23] rounded-lg hover:bg-[#E8DDD7]/40 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="pointer-events-auto md:hidden mt-2 mx-auto max-w-lg w-full rounded-3xl border border-[#E8DDD7] bg-[#FAF7F5]/98 backdrop-blur-xl px-5 pt-4 pb-6 space-y-3 animate-fade-in shadow-2xl">
          <nav className="flex flex-col space-y-1">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="px-3 py-2 text-left rounded-lg text-sm font-medium text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                >
                  Features
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-3 py-2 text-left rounded-lg text-sm font-medium text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('interactive-demo')}
                  className="px-3 py-2 text-left rounded-lg text-sm font-medium text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                >
                  Interactive Demo
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('audiences')}
                  className="px-3 py-2 text-left rounded-lg text-sm font-medium text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                >
                  Audiences
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('team')}
                  className="px-3 py-2 text-left rounded-lg text-sm font-medium text-[#4B5563] hover:text-[#111827] hover:bg-white transition-colors"
                >
                  Team
                </button>
              </>
            ) : (
              <>
                {role === 'ATTENDEE' && (
                  <>
                    <Link
                      to="/app"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-[#2D1F23] hover:bg-white flex items-center gap-2"
                    >
                      <Home className="w-4 h-4 text-[#63474D]" />
                      Attendee Hub
                    </Link>
                    <Link
                      to="/app/events"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-[#2D1F23] hover:bg-white flex items-center gap-2"
                    >
                      <Ticket className="w-4 h-4 text-[#63474D]" />
                      My Events
                    </Link>
                    <Link
                      to="/app/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-[#2D1F23] hover:bg-white flex items-center gap-2"
                    >
                      <Award className="w-4 h-4 text-[#63474D]" />
                      My Badges & Profile
                    </Link>
                    <Link
                      to="/app/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-[#2D1F23] hover:bg-white flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-[#63474D]" />
                      Account Settings
                    </Link>
                  </>
                )}
                {role === 'ORGANIZER' && (
                  <>
                    <Link
                      to="/organizer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-[#63474D] bg-[#63474D]/10"
                    >
                      Organizer Dashboard
                    </Link>
                    <Link
                      to="/organizer/events/create"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-[#2D1F23] hover:bg-white"
                    >
                      Create New Event
                    </Link>
                    <Link
                      to="/organizer/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-[#2D1F23] hover:bg-white"
                    >
                      Account & Export Data
                    </Link>
                  </>
                )}
                {role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-[#2D1F23] bg-white"
                  >
                    Admin Oversight Panel
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="pt-3 border-t border-[#E8DDD7]">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={user?.avatarUrl}
                    alt={user?.name}
                    className="w-8 h-8 rounded-full border border-[#D6A184]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#2D1F23]">{user?.name}</p>
                    <p className="text-[10px] text-[#756366]">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-xs text-[#B91C1C] font-semibold"
                >
                  Sign out
                </button>
              </div>
            ) : !['/login', '/register', '/pending-approval'].includes(location.pathname) ? (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button fullWidth variant="outline">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button fullWidth variant="primary" icon={<LogIn className="w-4 h-4" />}>
                    Register
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button fullWidth variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                    Back to Home
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
