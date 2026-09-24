import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ArrowRight,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Award,
  ChevronDown,
  Ticket,
  PlusCircle,
  BarChart3,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isAuthPage = ['/login', '/register', '/pending-approval', '/sponsor/auth', '/sponsor/forgot-password'].includes(location.pathname);
  const isExternalRegistration =
    location.pathname.startsWith('/e/') ||
    (location.pathname.startsWith('/events/') && location.pathname.includes('/register'));

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setUserDropdownOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const getDashboardPath = () => {
    if (!user) return '/app';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'ORGANIZER') return '/organizer';
    return '/app';
  };

  const getProfilePath = () => {
    if (!user) return '/app/profile';
    if (user.role === 'ORGANIZER') return '/organizer/events';
    if (user.role === 'ADMIN') return '/admin';
    return '/app/profile';
  };

  const publicNavLinks = isHome
    ? [
        { name: 'Features', href: '#features', isInternal: true },
        { name: 'How It Works', href: '#how-it-works', isInternal: true },
        { name: 'Live Simulator', href: '#simulator', isInternal: true },
      ]
    : [
        { name: 'Home', href: '/', isInternal: false },
      ];

  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-3.5 pointer-events-none transition-all duration-300">
      {/* Top Navbar Row: Floating Circular Pill */}
      <div
        className={`pointer-events-auto mx-auto max-w-7xl rounded-full transition-all duration-300 px-4 sm:px-7 py-2 sm:py-2.5 ${
          isExternalRegistration
            ? 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/5'
            : scrolled
            ? 'bg-white/15 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/5'
            : 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-md shadow-black/5'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src="/logo.webp"
              alt="Sheeba Logo"
              className="h-8 sm:h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
            />
            <div className="flex flex-col">
              <span
                className={`font-serif text-xl sm:text-2xl font-bold tracking-tight transition-colors leading-none ${
                  isExternalRegistration ? 'text-white' : 'text-[#2D1F23] group-hover:text-[#63474D]'
                }`}
              >
                Sheeba
              </span>
              <span
                className={`text-[8px] uppercase font-bold tracking-widest mt-0.5 ${
                  isExternalRegistration ? 'text-white/80' : 'text-[#AA767C]'
                }`}
              >
                Event Infrastructure
              </span>
            </div>
          </Link>

          {/* Desktop Navigation for Logged Out Guests (Hidden on External Registration) */}
          {!isAuthenticated && !isAuthPage && !isExternalRegistration && (
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              {publicNavLinks.map((link) =>
                link.isInternal ? (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-xs sm:text-sm font-medium text-gray-700 hover:text-[#63474D] transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#63474D] hover:after:w-full after:transition-all after:duration-200"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-xs sm:text-sm font-medium text-gray-700 hover:text-[#63474D] transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#63474D] hover:after:w-full after:transition-all after:duration-200"
                  >
                    {link.name}
                  </Link>
                )
              )}
            </nav>
          )}

          {/* Desktop Right: Profile / Auth Actions (NO name displayed) */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              /* Logged In User Avatar Pill & Dropdown (No name displayed) */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`flex items-center gap-1.5 rounded-full transition-all cursor-pointer ${
                    isExternalRegistration
                      ? 'p-1.5 bg-white/20 border border-white/40 hover:bg-white/30'
                      : 'p-1.5 bg-white/60 border border-[#E8DDD7] hover:border-[#63474D]/40 hover:shadow-xs'
                  }`}
                >
                  <img
                    src={user.avatarUrl || defaultAvatar}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-[#FFA686]/60 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultAvatar;
                    }}
                  />
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isExternalRegistration ? 'text-white' : 'text-gray-500'
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-[#E8DDD7] py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-[#E8DDD7]/60">
                      <p className="text-xs font-bold text-[#2D1F23] truncate">{user.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to={getDashboardPath()}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-[#FAF7F5] hover:text-[#63474D] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#AA767C]" />
                        <span>Go to Dashboard</span>
                      </Link>

                      {user.role === 'ATTENDEE' && (
                        <Link
                          to={getProfilePath()}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-[#FAF7F5] hover:text-[#63474D] transition-colors"
                        >
                          <Award className="w-4 h-4 text-[#FFA686]" />
                          <span>My Profile & Badges</span>
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-[#E8DDD7]/60">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isAuthPage ? (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors"
              >
                <span>Back to Home</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to={isExternalRegistration ? `/login?redirect=${encodeURIComponent(location.pathname + location.search)}` : "/login"}
                  className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isExternalRegistration
                      ? 'text-white hover:text-white/80 hover:bg-white/10'
                      : 'text-gray-700 hover:text-[#63474D] hover:bg-gray-100'
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to={isExternalRegistration ? `/login?mode=signup&redirect=${encodeURIComponent(location.pathname + location.search)}` : "/login?mode=signup"}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#63474D] text-white text-xs font-bold hover:bg-[#523a3f] shadow-xs hover:shadow-sm transition-all duration-200"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full border border-[#E8DDD7]"
              >
                <img
                  src={user.avatarUrl || defaultAvatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover"
                />
              </button>
            ) : null}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#63474D] cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 1-LINE QUICK NAVIGATION SUBNAV (Visible When Logged In, Hidden on External Registration) */}
      {isAuthenticated && user && !isExternalRegistration && (
        <div className="pointer-events-auto mt-2 mx-auto max-w-5xl rounded-full bg-[#FAF7F5]/95 backdrop-blur-md border border-[#E8DDD7] py-1.5 px-4 sm:px-6 shadow-sm overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center gap-2 sm:gap-4 whitespace-nowrap min-w-max text-xs">
            {user.role === 'ATTENDEE' && (
              <>
                <Link
                  to="/app"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    location.pathname === '/app'
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>📊 Dashboard</span>
                </Link>

                <Link
                  to="/app/events"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/app/events') || isTabActive('/app/ticket')
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>🎟️ My Tickets & Passes</span>
                </Link>

                <Link
                  to="/app/record"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/app/record')
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>🏆 My Badges & Records</span>
                </Link>

                <Link
                  to="/app/profile"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/app/profile') && location.pathname !== '/app/profile/attendance'
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>👤 My Profile</span>
                </Link>
              </>
            )}

            {user.role === 'ORGANIZER' && (
              <>
                <Link
                  to="/organizer/events"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/organizer/events') && location.pathname !== '/organizer/events/create'
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain" />
                  <span>My Events</span>
                </Link>

                <Link
                  to="/organizer/events/create"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/organizer/events/create')
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>➕ Create Event</span>
                </Link>

                <Link
                  to="/organizer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    location.pathname === '/organizer'
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>📊 Organizer Studio</span>
                </Link>

                <Link
                  to="/organizer/reports"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/organizer/reports')
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>📈 Reports & Badges</span>
                </Link>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <Link
                  to="/admin"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    location.pathname === '/admin'
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>🛡️ Admin Portal</span>
                </Link>

                <Link
                  to="/admin/users"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/admin/users')
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>👥 Users Management</span>
                </Link>

                <Link
                  to="/admin/events"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    isTabActive('/admin/events')
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#63474D] hover:bg-[#63474D]/10'
                  }`}
                >
                  <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain" />
                  <span>Events Moderation</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="pointer-events-auto md:hidden mt-2 mx-auto max-w-lg w-full rounded-3xl bg-white/98 backdrop-blur-xl border border-gray-200 shadow-2xl px-6 py-6 transition-all duration-300 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col gap-4">
            {isAuthenticated && user ? (
              /* Mobile Logged-in User Card */
              <div className="pb-3 border-b border-gray-100 space-y-2">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl || defaultAvatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#FFA686]/60"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#2D1F23]">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  {user.role === 'ATTENDEE' && (
                    <>
                      <Link
                        to="/app/events"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#FAF7F5] text-xs font-semibold text-[#63474D]"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>🎟️ My Tickets & Passes</span>
                      </Link>

                      <Link
                        to="/app/record"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-gray-50 text-xs font-medium text-gray-700"
                      >
                        <Award className="w-4 h-4 text-[#FFA686]" />
                        <span>🏆 My Badges & Records</span>
                      </Link>

                      <Link
                        to="/app"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-gray-50 text-xs font-medium text-gray-700"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#AA767C]" />
                        <span>📊 Dashboard</span>
                      </Link>
                    </>
                  )}

                  {user.role === 'ORGANIZER' && (
                    <>
                      <Link
                        to="/organizer/events"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#FAF7F5] text-xs font-semibold text-[#63474D]"
                      >
                        <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain" />
                        <span>My Events</span>
                      </Link>
                      <Link
                        to="/organizer/events/create"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-gray-50 text-xs font-medium text-gray-700"
                      >
                        <PlusCircle className="w-4 h-4 text-[#FFA686]" />
                        <span>➕ Create Event</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {/* Public Navigation links for guests (Hidden on external registration link) */}
            {!isAuthenticated && !isExternalRegistration && (
              <div className="flex flex-col gap-2">
                {publicNavLinks.map((link) =>
                  link.isInternal ? (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-medium text-gray-800 hover:text-[#63474D] py-1.5 transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-medium text-gray-800 hover:text-[#63474D] py-1.5 transition-colors"
                    >
                      {link.name}
                    </Link>
                  )
                )}
              </div>
            )}

            {/* Mobile Auth Actions */}
            <div className="pt-4 border-t border-gray-100">
              {isAuthenticated && user ? (
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 bg-red-50/50 text-red-600 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={isExternalRegistration ? `/login?redirect=${encodeURIComponent(location.pathname + location.search)}` : "/login"}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center py-2.5 rounded-xl border border-gray-300 text-gray-800 font-semibold text-xs hover:bg-gray-50 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to={isExternalRegistration ? `/login?mode=signup&redirect=${encodeURIComponent(location.pathname + location.search)}` : "/login?mode=signup"}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-1 py-2.5 rounded-xl bg-[#63474D] text-white font-bold text-xs shadow-xs hover:bg-[#523a3f] transition-colors"
                  >
                    <span>Sign Up</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
