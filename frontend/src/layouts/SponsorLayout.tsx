import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  HandCoins,
  Award,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export const SponsorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sheba_sidebar_minimized') === 'true';
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sheba_sidebar_minimized', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/sponsor/auth');
  };

  const navItems = [
    {
      name: 'Explore',
      path: '/sponsor',
      icon: Compass,
      subtitle: 'Marketplace',
    },
    {
      name: 'Deals & Pledges',
      path: '/sponsor/deals',
      icon: HandCoins,
      subtitle: 'Interested & Pipeline',
    },
    {
      name: 'Brand Deliverables and Contact',
      path: '/sponsor/deliverables',
      icon: Award,
      subtitle: 'Assets & Rep Info',
    },
    {
      name: 'Settings',
      path: '/sponsor/settings',
      icon: Settings,
      subtitle: 'Security & Preferences',
    },
  ];

  const isTabActive = (path: string) => {
    if (path === '/sponsor') {
      return location.pathname === '/sponsor' || location.pathname === '/sponsor/explore';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#FCFAFC] flex flex-col md:flex-row">
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden bg-[#2D1F23] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.webp"
            alt="Sheeba Logo"
            className="h-8 w-auto object-contain shrink-0"
          />
          <div>
            <span className="font-serif font-bold text-sm text-white truncate max-w-[170px] block">
              {user?.companyName || user?.name || 'Sponsor Workspace'}
            </span>
            <p className="text-[10px] text-white/70">
              Sponsor workspace
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white border border-white/15 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Top Scrolling Tabs */}
      <div className="md:hidden bg-[#3b2a2e] text-white py-2 px-3 border-b border-white/10 overflow-x-auto scrollbar-none flex gap-1.5 sticky top-[57px] z-30">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                active ? 'bg-[#AA767C] text-white shadow-xs' : 'text-white/70 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#FFA686]" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Sidebar (Desktop + Mobile Drawer) with custom sponsor-sidebar.webp background */}
      <aside
        style={{
          backgroundImage: "url('/sponsor-sidebar.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        className={`fixed md:sticky top-0 left-0 z-50 h-screen ${
          isCollapsed ? 'md:w-16' : 'md:w-64'
        } w-64 flex flex-col transition-all duration-300 md:translate-x-0 relative shadow-xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Dark Plum Glass Overlay for optimal contrast & aesthetic vibe */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2D1F23]/90 via-[#402a30]/88 to-[#24171a]/95 backdrop-blur-[2px] pointer-events-none" />

        {/* Content Container (Layered above overlay) */}
        <div className="relative z-10 flex flex-col h-full text-white">
          {/* Sidebar Brand Header & Minimizer */}
          {!isCollapsed ? (
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/logo.webp"
                  alt="Sheeba Logo"
                  className="h-9 w-auto object-contain shrink-0 drop-shadow-xs"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-serif font-bold text-sm text-white tracking-tight truncate block">
                    {user?.companyName || user?.name || 'Sponsor Workspace'}
                  </span>
                  <p className="text-[10px] text-white/60">Sponsor workspace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden md:flex p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-1"
                title="Minimize sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-3.5 border-b border-white/10 flex flex-col items-center gap-2">
              <img
                src="/logo.webp"
                alt="Sheeba Logo"
                className="h-8 w-auto object-contain shrink-0 drop-shadow-xs"
              />
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden md:flex p-1.5 rounded-xl bg-white/10 text-[#FFA686] hover:bg-white/20 transition-colors cursor-pointer"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 4 Dedicated Sponsor Navigation Tabs */}
          <nav className="flex-1 px-2 py-2 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/sponsor'}
                  title={isCollapsed ? item.name : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${
                    isCollapsed ? 'md:justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs font-medium transition-all ${
                    active
                      ? `bg-[#AA767C]/90 text-white font-bold shadow-sm ${
                          isCollapsed ? '' : 'border-l-4 border-[#FFA686]'
                        }`
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-[#FFA686]' : 'text-white/70'}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/10 space-y-2 bg-black/20">
            <Link
              to="/search"
              title={isCollapsed ? 'Public Events Site' : undefined}
              className={`flex items-center ${
                isCollapsed ? 'md:justify-center p-2' : 'justify-between px-3 py-2'
              } text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
                <ExternalLink className="w-3.5 h-3.5 text-[#FFA686]" />
                {!isCollapsed && <span>Public Events</span>}
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title={isCollapsed ? 'Sign Out' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'md:justify-center p-2' : 'gap-2.5 px-3 py-2'
              } text-xs font-semibold text-red-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors cursor-pointer`}
            >
              <LogOut className="w-4 h-4 text-red-400" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
