import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import type { BadgeAward } from '../../types/attendance';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import {
  Award,
  ShieldCheck,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const location = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [badges, setBadges] = useState<BadgeAward[]>([]);
  const [badgePage, setBadgePage] = useState<number>(1);
  const [badgeTotalPages, setBadgeTotalPages] = useState<number>(1);
  const [badgeTotal, setBadgeTotal] = useState<number>(0);
  const [badgeSearch, setBadgeSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [badgeStatus, setBadgeStatus] = useState<'all' | 'active' | 'revoked'>('all');
  const [badgesLoading, setBadgesLoading] = useState<boolean>(false);
  const [activeBadgeCount, setActiveBadgeCount] = useState<number>(0);

  const [revokedNotice, setRevokedNotice] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(badgeSearch);
      setBadgePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [badgeSearch]);

  const fetchBadges = async (page: number, status: string, search: string) => {
    setBadgesLoading(true);
    try {
      const res = await api.badges.getAllBadgeAwards({
        page,
        limit: 15,
        status,
        search,
      });
      if (res && res.badges && res.pagination) {
        setBadges(res.badges);
        setBadgeTotal(res.pagination.total);
        setBadgeTotalPages(res.pagination.totalPages);
      } else if (Array.isArray(res)) {
        setBadges(res);
        setBadgeTotal(res.length);
        setBadgeTotalPages(Math.ceil(res.length / 15) || 1);
      }
    } catch (err) {
      console.error('Failed to fetch badges:', err);
    } finally {
      setBadgesLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [evts, allBadges] = await Promise.all([
          api.events.getAll(),
          api.badges.getAllBadgeAwards(),
        ]);
        setEvents(evts);
        if (Array.isArray(allBadges)) {
          setActiveBadgeCount(allBadges.filter((b) => !b.revokedAt).length);
        } else if (allBadges && (allBadges as any).badges) {
          setActiveBadgeCount((allBadges as any).badges.filter((b: any) => !b.revokedAt).length);
        }
      } catch (err) {
        console.error('Initial data fetch error:', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBadges(badgePage, badgeStatus, debouncedSearch);
  }, [badgePage, badgeStatus, debouncedSearch]);

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const elem = document.querySelector(location.hash);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location.hash, location.pathname]);

  const handleRevokeBadge = async (badge: BadgeAward) => {
    setActionLoadingId(badge.id);
    try {
      await api.badges.adminRevokeBadge(badge.id);
      setRevokedNotice(`"${badge.badgeLabel}" badge for ${badge.attendeeName} was successfully revoked.`);
      setTimeout(() => setRevokedNotice(null), 4000);
      setActiveBadgeCount((prev) => Math.max(0, prev - 1));
      await fetchBadges(badgePage, badgeStatus, debouncedSearch);
    } catch (e: any) {
      alert(e.message || 'Revocation failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGrantBadge = async (badge: BadgeAward) => {
    setActionLoadingId(badge.id);
    try {
      await api.badges.adminReinstateBadge(badge.id);
      setRevokedNotice(`"${badge.badgeLabel}" badge for ${badge.attendeeName} was successfully granted again.`);
      setTimeout(() => setRevokedNotice(null), 4000);
      setActiveBadgeCount((prev) => prev + 1);
      await fetchBadges(badgePage, badgeStatus, debouncedSearch);
    } catch (e: any) {
      alert(e.message || 'Granting badge failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalRegistrations = events.reduce((acc, curr) => acc + curr.registeredCount, 0);
  const totalCheckIns = events.reduce((acc, curr) => acc + curr.checkedInCount, 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Platform Administration & Oversight
          </Badge>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23] mt-1">
            Sheba Admin Panel
          </h1>
          <p className="text-xs text-[#756366]">
            Global metrics, badge revocation requests, and Chapa ETB settlement operations.
          </p>
        </div>

        <Link to="/admin/events">
          <Button variant="primary" size="sm">
            Event Oversight Queue
          </Button>
        </Link>
      </div>

      {revokedNotice && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>{revokedNotice}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#756366]">Platform Events</span>
          <p className="font-serif text-3xl font-extrabold text-[#63474D]">{events.length}</p>
          <p className="text-[10px] text-[#756366]">Single-day tech events</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#756366]">Total Registrations</span>
          <p className="font-serif text-3xl font-extrabold text-[#AA767C]">{totalRegistrations}</p>
          <p className="text-[10px] text-[#756366]">Across all organizers</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#756366]">Turnout Rate</span>
          <p className="font-serif text-3xl font-extrabold text-[#2A7B5F]">
            {totalRegistrations > 0 ? ((totalCheckIns / totalRegistrations) * 100).toFixed(1) : 85.3}%
          </p>
          <p className="text-[10px] text-[#2A7B5F] font-semibold">{totalCheckIns} door check-ins</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#756366]">Active Badge Awards</span>
          <p className="font-serif text-3xl font-extrabold text-[#FFA686]">
            {activeBadgeCount}
          </p>
          <p className="text-[10px] text-[#756366]">Organizer credential issuances</p>
        </div>
      </div>

      {/* Badge Revocation Queue (SRS Section 7.3 & 11.1) */}
      <div id="badges" className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDD7] shadow-xs space-y-4 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8DDD7] gap-3">
          <div>
            <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#63474D]" />
              Badge Oversight & Admin Revocation Queue
            </h2>
            <p className="text-xs text-[#756366] mt-0.5">
              Organizers request badge revocations directly with admin. Revoking erases credential from public profile immediately.
            </p>
          </div>
          <Badge variant="primary">{badgeTotal} Records</Badge>
        </div>

        {/* Filter Controls: Search and Status Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Sub-tab Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl self-start">
            <button
              type="button"
              onClick={() => {
                setBadgeStatus('all');
                setBadgePage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                badgeStatus === 'all'
                  ? 'bg-white text-[#2D1F23] shadow-xs border border-[#E8DDD7]'
                  : 'text-[#756366] hover:text-[#2D1F23]'
              }`}
            >
              All Badges
            </button>
            <button
              type="button"
              onClick={() => {
                setBadgeStatus('active');
                setBadgePage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                badgeStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200'
                  : 'text-[#756366] hover:text-[#2D1F23]'
              }`}
            >
              Active Badges
            </button>
            <button
              type="button"
              onClick={() => {
                setBadgeStatus('revoked');
                setBadgePage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                badgeStatus === 'revoked'
                  ? 'bg-red-50 text-red-800 shadow-xs border border-red-200'
                  : 'text-[#756366] hover:text-[#2D1F23]'
              }`}
            >
              Revoked Badges
            </button>
          </div>

          {/* Backend Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#756366] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search attendee, event, or badge..."
              value={badgeSearch}
              onChange={(e) => setBadgeSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:bg-white focus:border-[#63474D]"
            />
          </div>
        </div>

        {/* Badges Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                <th className="py-3 px-4">Badge</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Issuing Organizer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
              {badgesLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#63474D] border-t-transparent rounded-full animate-spin" />
                      <span>Loading badges...</span>
                    </div>
                  </td>
                </tr>
              ) : badges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#756366]">
                    No badges found matching your filter.
                  </td>
                </tr>
              ) : (
                badges.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                    <td className="py-3 px-4 font-bold">
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {b.badgeLabel}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold">{b.attendeeName}</p>
                      <p className="text-[10px] text-[#756366]">{b.attendeeEmail}</p>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">{b.eventTitle}</td>
                    <td className="py-3 px-4">{b.issuerName}</td>
                    <td className="py-3 px-4">
                      {b.revokedAt ? (
                        <Badge variant="error">REVOKED</Badge>
                      ) : (
                        <Badge variant="success">ACTIVE</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!b.revokedAt ? (
                        <button
                          type="button"
                          disabled={actionLoadingId === b.id}
                          onClick={() => handleRevokeBadge(b)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === b.id ? 'Revoking...' : 'Revoke Badge'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoadingId === b.id}
                          onClick={() => handleGrantBadge(b)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === b.id ? 'Granting...' : 'Grant Badge'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Backend Pagination for Badges */}
        <Pagination
          currentPage={badgePage}
          totalPages={badgeTotalPages}
          onPageChange={setBadgePage}
          totalItems={badgeTotal}
          itemsPerPage={15}
        />
      </div>
    </div>
  );
};
