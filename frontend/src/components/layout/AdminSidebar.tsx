import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Award,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
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

  const navItems = [
    { label: 'Platform Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Event Oversight', path: '/admin/events', icon: Calendar },
    { label: 'Users & Organizers', path: '/admin/users', icon: Users },
    { label: 'Badge Revocation Queue', path: '/admin#badges', icon: Award },
    { label: 'Payment Issues Log', path: '/admin#payments', icon: CreditCard },
    { label: 'Admin Profile', path: '/admin/profile', icon: User },
  ];

  const isActive = (path: string) => {
    if (path.includes('#')) {
      return location.pathname + location.hash === path;
    }
    if (path === '/admin') {
      return location.pathname === '/admin' && !location.hash;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-[#63474D] text-white flex flex-col hidden md:flex sticky top-0 h-screen border-r border-[#AA767C]/40 shrink-0 self-start overflow-y-auto transition-all duration-300 z-20`}
    >
      <div className={`${isCollapsed ? 'p-2 pt-3' : 'p-4 pt-3.5'} space-y-4`}>
        {/* Console Header & Minimizer */}
        {!isCollapsed ? (
          <div className="bg-[#523a3f] rounded-xl p-3 border border-[#FFA686]/30 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFA686] animate-pulse"></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#FFA686]">
                  Platform Admin
                </span>
              </div>
              <p className="text-xs font-medium text-white truncate">Sheba Operations</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-[#E8DDD7] hover:text-white hover:bg-[#432f33] transition-colors cursor-pointer shrink-0 ml-1"
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
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
              alt="Admin"
              title={isCollapsed ? user?.name || 'Admin' : undefined}
              className="w-8 h-8 rounded-full object-cover border border-[#FFA686] shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Hanan Admin'}</p>
                <p className="text-[10px] text-[#FFA686] truncate">Platform Ops</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
