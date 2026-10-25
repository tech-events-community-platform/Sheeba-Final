import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { Footer } from '../components/layout/Footer';
import {
  Store,
  Compass,
  Layers,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export const ExhibitorLayout: React.FC = () => {
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
    navigate('/exhibitor/auth');
  };

  const isExploreRoute =
    location.pathname === '/exhibitor/explore' || location.pathname === '/exhibitor';

  // If user is not authenticated and browsing explore, render clean public layout without dashboard sidebar
  if (!user && isExploreRoute) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] flex flex-col font-sans">
        <Header />
        <main className="flex-1 pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
        <Footer />
      </div>
    );
  }

  // If user is not authenticated and trying to access protected exhibitor routes (booths, settings)
  if (!user) {
    return <Navigate to="/exhibitor/auth" state={{ from: location }} replace />;
  }

  const navItems = [
    {
      name: 'Explore Events',
      path: '/exhibitor/explore',
      icon: Compass,
      subtitle: 'Open Booth Calls',
    },
    {
      name: 'My Booths & Applications',
      path: '/exhibitor/booths',
      icon: Layers,
      subtitle: 'Bookings & Pipeline',
    },
    {
      name: 'Settings & Profile',
      path: '/exhibitor/settings',
      icon: Settings,
      subtitle: 'Company Details',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-[#E8DDD7] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Link to="/exhibitor" className="flex items-center gap-2">
            <span className="font-serif font-black text-xl text-[#2D1F23] tracking-tight">SHEEBA</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#63474D]/10 text-[#63474D] uppercase">
              Exhibitor
            </span>
          </Link>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-[#2D1F23] hover:bg-gray-100"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-[#E8DDD7] sticky top-0 h-screen transition-all duration-200 z-30 shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand & Portal Badge */}
        <div className="p-5 border-b border-[#E8DDD7] flex items-center justify-between">
          <Link to="/exhibitor" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#63474D] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-serif font-black text-lg text-[#2D1F23] tracking-tight block">
                  SHEEBA
                </span>
                <span className="text-[10px] uppercase font-bold text-[#63474D] tracking-wider block">
                  Exhibitors Portal
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={toggleCollapsed}
            className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Company Header */}
        {!isCollapsed && (
          <div className="px-5 py-4 border-b border-gray-100 bg-[#FAF7F5]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
                <Building2 className="w-4 h-4 text-[#63474D]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#2D1F23] truncate">
                  {user?.companyName || user?.organization || user?.name || 'Exhibitor Company'}
                </p>
                <span className="text-[10px] text-gray-400 block truncate">
                  {user?.industryCategory || 'Registered Exhibitor'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/exhibitor/explore' && location.pathname === '/exhibitor');

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#63474D] text-white shadow-2xs'
                    : 'text-[#756366] hover:bg-[#FAF7F5] hover:text-[#2D1F23]'
                }`}
                title={item.name}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <div className="min-w-0">
                    <span className="block truncate">{item.name}</span>
                    <span
                      className={`text-[10px] font-normal block truncate ${
                        isActive ? 'text-white/70' : 'text-gray-400'
                      }`}
                    >
                      {item.subtitle}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-[#E8DDD7] space-y-1">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-72 bg-white h-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#63474D]" />
                <span className="font-serif font-black text-lg text-[#2D1F23]">SHEEBA</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-[#756366] hover:bg-[#FAF7F5]"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

