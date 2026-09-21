import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  QrCode,
  Award,
  BarChart3,
  Settings,
  HandCoins,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const OrganizerSidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
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

  // Organizer tabs
  const navItems = [
    { label: 'Dashboard', path: '/organizer', icon: LayoutDashboard },
    { label: 'Create Event', path: '/organizer/events/create', icon: PlusCircle },
    { label: 'Apply to Sponsors', path: '/organizer/apply-sponsors', icon: HandCoins },
    { label: 'Check-in', path: '/organizer/check-in', icon: QrCode },
    { label: 'Badges', path: '/organizer/badges', icon: Award },
    { label: 'Reports', path: '/organizer/reports', icon: BarChart3 },
    { label: 'Settings', path: '/organizer/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/organizer') return location.pathname === '/organizer';
    if (path === '/organizer/events/create') return location.pathname === '/organizer/events/create';
    if (path === '/organizer/apply-sponsors') return location.pathname.startsWith('/organizer/apply-sponsors');
    if (path === '/organizer/check-in') {
      return location.pathname.startsWith('/organizer/check-in') || location.pathname.includes('/scanner');
    }
    if (path === '/organizer/badges') {
      return location.pathname.startsWith('/organizer/badges') || location.pathname.includes('/attendees');
    }
    if (path === '/organizer/reports') {
      return location.pathname.startsWith('/organizer/reports') || location.pathname.includes('/report');
    }
    if (path === '/organizer/settings') {
      return location.pathname.startsWith('/organizer/settings');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-[#63474D] text-white flex flex-col hidden md:flex sticky top-0 h-screen shrink-0 self-start border-r border-[#AA767C]/40 overflow-y-auto transition-all duration-300 z-20`}
    >
      <div className={`${isCollapsed ? 'p-2 pt-3' : 'p-4 pt-3.5'} space-y-4`}>
        {/* Organizer Header & Minimizer */}
        {!isCollapsed ? (
          <div className="px-3 py-2 border-b border-[#AA767C]/40 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <h2 className="font-serif font-bold text-base text-white tracking-tight truncate">
                {user?.organization || 'GDG Addis'}
              </h2>
              <p className="text-[10px] text-[#FFA686] font-medium truncate">Verified Community Organizer</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-[#E8DDD7] hover:text-white hover:bg-[#523a3f] transition-colors cursor-pointer shrink-0 ml-1"
              title="Minimize sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-2 border-b border-[#AA767C]/40 flex justify-center">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-2 rounded-xl bg-[#523a3f] text-[#FFA686] hover:bg-[#432f33] transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
                } rounded-xl text-sm font-medium transition-all ${
                  active
                    ? `bg-[#AA767C] text-white font-semibold ${isCollapsed ? '' : 'border-l-4'} border-[#FFA686] shadow-xs`
                    : 'text-[#E8DDD7] hover:bg-[#523a3f] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#FFA686]' : 'text-[#D6A184]'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Avatar */}
        <div className="pt-4 border-t border-[#AA767C]/40">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 px-1'} min-w-0`}>
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'}
              alt="Organizer"
              title={isCollapsed ? user?.name || 'Organizer' : undefined}
              className="w-8 h-8 rounded-full object-cover border border-[#FFA686] shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Sara Tesfaye'}</p>
                <p className="text-[10px] text-[#D6A184] truncate">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
