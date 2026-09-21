import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Award,
  CreditCard,
  User,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const location = useLocation();

  const isTabActive = (path: string) => {
    if (path.includes('#')) {
      return location.pathname + location.hash === path;
    }
    if (path === '/admin') return location.pathname === '/admin' && !location.hash;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-[#F7F8F5]">
      {/* Left: Full-Height Sidebar starting at top-0 */}
      <AdminSidebar />

      {/* Right: Content column (Navbar sits inside here so it NEVER overlaps with the sidebar!) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Navbar />

        {/* Mobile Top Sub-bar for Admin */}
        <div className="md:hidden bg-[#63474D] text-white py-2.5 px-4 border-b border-[#AA767C]/40 overflow-x-auto scrollbar-none flex gap-2 shrink-0 text-xs">
          {[
            { label: 'Overview', path: '/admin', icon: LayoutDashboard },
            { label: 'Events', path: '/admin/events', icon: Calendar },
            { label: 'Users', path: '/admin/users', icon: Users },
            { label: 'Badge Queue', path: '/admin#badges', icon: Award },
            { label: 'Payments', path: '/admin#payments', icon: CreditCard },
            { label: 'Profile', path: '/admin/profile', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const active = isTabActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  active ? 'bg-[#AA767C] text-[#FFA686] border-b-2 border-[#FFA686]' : 'text-gray-200 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
