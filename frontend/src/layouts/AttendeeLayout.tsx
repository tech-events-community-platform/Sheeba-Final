import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { AttendeeSidebar } from '../components/layout/AttendeeSidebar';
import {
  Ticket,
  Award,
  User,
} from 'lucide-react';

export const AttendeeLayout: React.FC = () => {
  const location = useLocation();

  const isTabActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app' || location.pathname === '/app/badges';
    if (path === '/app/events') return location.pathname === '/app/events' || location.pathname.startsWith('/app/ticket');
    if (path === '/app/settings') return location.pathname === '/app/settings';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: Full-Height Sidebar starting at top-0 */}
      <AttendeeSidebar />

      {/* Right: Content column (Navbar sits inside here so it NEVER overlaps with the sidebar!) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Navbar />

        {/* Mobile Top Sub-bar for Attendees (Visible on Small Screens) */}
        <div className="md:hidden bg-[#63474D] text-white py-2 px-3 border-b border-[#AA767C]/40 overflow-x-auto scrollbar-none flex gap-1.5 shrink-0 text-xs">
          <Link
            to="/app"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
              isTabActive('/app')
                ? 'bg-[#AA767C] text-white'
                : 'text-[#E8DDD7]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Badges</span>
          </Link>
          <Link
            to="/app/events"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
              isTabActive('/app/events')
                ? 'bg-[#AA767C] text-white'
                : 'text-[#E8DDD7]'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Registrations</span>
          </Link>
          <Link
            to="/app/settings"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
              location.pathname === '/app/settings'
                ? 'bg-[#AA767C] text-white'
                : 'text-[#E8DDD7]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 w-full flex flex-col items-center">
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
