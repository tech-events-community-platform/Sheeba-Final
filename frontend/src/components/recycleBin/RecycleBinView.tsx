import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  Ticket,
  HandCoins,
  Store,
  User as UserIcon,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
  Flame,
  FileText,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import type { RecycleBinItem, RecycleBinStats, RecycleBinAuditLog, RecycleBinEntityType } from '../../types/recycleBin';

export interface RecycleBinViewProps {
  role: 'ORGANIZER' | 'ATTENDEE' | 'SPONSOR' | 'EXHIBITOR' | 'ADMIN';
  title?: string;
  subtitle?: string;
  allowedEntityTypes?: { type: RecycleBinEntityType; label: string; icon: React.ElementType }[];
}

export const RecycleBinView: React.FC<RecycleBinViewProps> = ({
  role,
  title,
  subtitle,
  allowedEntityTypes,
}) => {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [stats, setStats] = useState<RecycleBinStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'days_asc' | 'days_desc' | 'deleted_desc' | 'title'>('days_asc');

  // Modals state
  const [restoreItemModal, setRestoreItemModal] = useState<RecycleBinItem | null>(null);
  const [permanentDeleteItemModal, setPermanentDeleteItemModal] = useState<RecycleBinItem | null>(null);
  const [purgeModalOpen, setPurgeModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin audit trail state
  const [adminActiveTab, setAdminActiveTab] = useState<'items' | 'audit'>('items');
  const [auditLogs, setAuditLogs] = useState<RecycleBinAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Default entity types per role if not provided
  const entityTypeOptions = useMemo(() => {
    if (allowedEntityTypes) return allowedEntityTypes;
    switch (role) {
      case 'ORGANIZER':
        return [
          { type: 'event' as RecycleBinEntityType, label: 'Events', icon: Calendar },
          { type: 'registration' as RecycleBinEntityType, label: 'Attendee Roster', icon: Ticket },
          { type: 'sponsorship_application' as RecycleBinEntityType, label: 'Sponsorship Pitches', icon: HandCoins },
          { type: 'event_vendor' as RecycleBinEntityType, label: 'Exhibitor Booths', icon: Store },
        ];
      case 'ATTENDEE':
        return [
          { type: 'registration' as RecycleBinEntityType, label: 'Registrations & Tickets', icon: Ticket },
          { type: 'review' as RecycleBinEntityType, label: 'Event Reviews', icon: MessageSquare },
        ];
      case 'SPONSOR':
        return [
          { type: 'sponsorship_deal' as RecycleBinEntityType, label: 'Deals & Pledges', icon: HandCoins },
        ];
      case 'EXHIBITOR':
        return [
          { type: 'event_vendor' as RecycleBinEntityType, label: 'Booth Bookings', icon: Store },
        ];
      case 'ADMIN':
      default:
        return [
          { type: 'event' as RecycleBinEntityType, label: 'Events', icon: Calendar },
          { type: 'user' as RecycleBinEntityType, label: 'User Accounts', icon: UserIcon },
          { type: 'registration' as RecycleBinEntityType, label: 'Registrations', icon: Ticket },
          { type: 'sponsorship_application' as RecycleBinEntityType, label: 'Sponsorships', icon: HandCoins },
          { type: 'sponsorship_deal' as RecycleBinEntityType, label: 'Sponsor Deals', icon: HandCoins },
          { type: 'event_vendor' as RecycleBinEntityType, label: 'Exhibitor Vendors', icon: Store },
          { type: 'review' as RecycleBinEntityType, label: 'Reviews', icon: MessageSquare },
        ];
    }
  }, [role, allowedEntityTypes]);

  // Load items and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsData, statsData] = await Promise.all([
        api.recycleBin.getItems(selectedType, searchQuery),
        api.recycleBin.getStats(),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load recycle bin:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch Recycle Bin items.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedType, searchQuery]);

  // Load audit logs for admin
  const fetchAuditLogs = async () => {
    if (role !== 'ADMIN') return;
    setAuditLoading(true);
    try {
      const logs = await api.recycleBin.getAuditLogs(100, 0);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (adminActiveTab === 'audit' && role === 'ADMIN') {
      fetchAuditLogs();
    }
  }, [adminActiveTab]);

  // Filtered and sorted items
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'days_asc') return a.daysRemaining - b.daysRemaining;
      if (sortBy === 'days_desc') return b.daysRemaining - a.daysRemaining;
      if (sortBy === 'deleted_desc') return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [items, sortBy]);

  // Handle Restore
  const handleConfirmRestore = async () => {
    if (!restoreItemModal) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await api.recycleBin.restore(restoreItemModal.entityType, restoreItemModal.id);
      setStatusMessage({
        type: 'success',
        text: `"${restoreItemModal.title}" has been restored successfully.`,
      });
      setRestoreItemModal(null);
      await fetchData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to restore item.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Permanent Delete
  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteItemModal) return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      await api.recycleBin.deletePermanent(permanentDeleteItemModal.entityType, permanentDeleteItemModal.id);
      setStatusMessage({
        type: 'success',
        text: `"${permanentDeleteItemModal.title}" was permanently deleted.`,
      });
      setPermanentDeleteItemModal(null);
      await fetchData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Permanent deletion failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Purge (Admin Only)
  const handleConfirmPurge = async () => {
    if (role !== 'ADMIN') return;
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.recycleBin.purgeExpired();
      setStatusMessage({
        type: 'success',
        text: `Retention purge complete. Removed ${res.purgedCount} expired record(s).`,
      });
      setPurgeModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Purge failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Entity Type Label & Icon Helper
  const getEntityMeta = (type: RecycleBinEntityType) => {
    const found = entityTypeOptions.find((o) => o.type === type);
    if (found) return found;
    switch (type) {
      case 'event':
        return { label: 'Event', icon: Calendar };
      case 'registration':
        return { label: 'Registration', icon: Ticket };
      case 'sponsorship_application':
        return { label: 'Sponsorship Pitch', icon: HandCoins };
      case 'sponsorship_deal':
        return { label: 'Sponsor Deal', icon: HandCoins };
      case 'event_vendor':
        return { label: 'Exhibitor Booth', icon: Store };
      case 'user':
        return { label: 'User Account', icon: UserIcon };
      case 'review':
        return { label: 'Review', icon: MessageSquare };
      default:
        return { label: 'Record', icon: FileText };
    }
  };

  // Dynamic header titles
  const resolvedTitle =
    title ||
    (role === 'ORGANIZER'
      ? 'Organizer Recycle Bin'
      : role === 'ATTENDEE'
      ? 'My Deleted Records'
      : role === 'SPONSOR'
      ? 'Sponsorship Recycle Bin'
      : role === 'EXHIBITOR'
      ? 'Exhibitor Recycle Bin'
      : 'System Recycle Bin & Data Governance');

  const resolvedSubtitle =
    subtitle ||
    (role === 'ORGANIZER'
      ? 'Manage and restore deleted events, attendee registrations, and vendor placements.'
      : role === 'ATTENDEE'
      ? 'Safely recover your cancelled registrations, tickets, and reviews within 30 days.'
      : role === 'SPONSOR'
      ? 'Recover deleted sponsorship deals, pitches, and agreements within the retention period.'
      : role === 'EXHIBITOR'
      ? 'Manage and restore your deleted booth booking requests and applications.'
      : 'Central governance for soft-deleted platform entities, retention policy enforcement, and audit logs.');

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16 font-sans">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-[#63474D] via-[#523A3F] to-[#432F33] text-white p-6 sm:p-8 rounded-2xl shadow-md border border-[#AA767C]/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 text-[#FFA686] backdrop-blur-xs">
                <Trash2 className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#FFA686]">
                30-Day Retention Guarantee
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              {resolvedTitle}
            </h1>
            <p className="text-sm text-[#E8DDD7] leading-relaxed">
              {resolvedSubtitle}
            </p>
          </div>

          {/* Admin Header Actions */}
          {role === 'ADMIN' && (
            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setAdminActiveTab(adminActiveTab === 'items' ? 'audit' : 'items')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  adminActiveTab === 'audit'
                    ? 'bg-[#FFA686] text-[#2D1F23] border-[#FFA686]'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {adminActiveTab === 'audit' ? 'View Deleted Records' : 'Audit Trail Logs'}
              </button>

              <button
                type="button"
                onClick={() => setPurgeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/20 text-red-200 border border-red-400/40 hover:bg-red-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                Purge Expired (&gt;30 Days)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Retention Policy Notice */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
        <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          <span className="font-semibold text-amber-950">How Sheeba Recycle Bin Works: </span>
          Supported records remain recoverable for exactly <strong>30 days</strong> from deletion. Restoring an item
          reconstructs all relationships, configurations, and allocations without generating duplicates. Records tied
          to completed financial payments are permanently protected from erasure.
        </div>
      </div>

      {/* Feedback Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between shadow-xs transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold underline hover:opacity-80 cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 border border-[#E8DDD7] shadow-xs">
            <span className="text-xs font-medium text-gray-500 block">Total In Bin</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-serif text-[#2D1F23]">
                {stats.totalItems}
              </span>
              <span className="text-xs text-gray-500">items</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#E8DDD7] shadow-xs">
            <span className="text-xs font-medium text-gray-500 block">Expiring Soon (≤ 7 Days)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold font-serif ${stats.expiringSoonCount > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                {stats.expiringSoonCount}
              </span>
              <span className="text-xs text-gray-500">records</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#E8DDD7] shadow-xs">
            <span className="text-xs font-medium text-gray-500 block">Retention Window</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-serif text-[#63474D]">30</span>
              <span className="text-xs text-gray-500">calendar days</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#E8DDD7] shadow-xs">
            <span className="text-xs font-medium text-gray-500 block">Financial Safeguard</span>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Settled Records Protected</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Audit Trail View */}
      {role === 'ADMIN' && adminActiveTab === 'audit' ? (
        <div className="bg-white rounded-2xl border border-[#E8DDD7] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E8DDD7] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#2D1F23] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#AA767C]" />
                Recycle Bin Audit Trail Logs
              </h2>
              <p className="text-xs text-gray-500">
                Immutable ledger of all soft deletions, restorations, permanent purges, and automated retention cleanups.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAuditLogs}
              disabled={auditLoading}
              className="text-xs font-medium text-[#63474D] hover:underline cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          {auditLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              <div className="w-6 h-6 border-2 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading audit logs...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F5] text-gray-600 font-semibold uppercase tracking-wider border-b border-[#E8DDD7]">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Entity Title / ID</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DDD7]">
                  {auditLogs.map((log) => {
                    const actionBadge =
                      log.action === 'restore'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.action === 'soft_delete'
                        ? 'bg-amber-100 text-amber-800'
                        : log.action === 'permanent_delete'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-indigo-100 text-indigo-800';

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${actionBadge}`}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-700 capitalize">
                          {log.entityType.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#2D1F23]">
                          {log.entityTitle || log.entityId}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {log.performedByName ? (
                            <span>
                              {log.performedByName}{' '}
                              {log.performedByEmail && (
                                <span className="text-gray-400">({log.performedByEmail})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400">System Routine</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Items View */
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-[#E8DDD7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Entity Type Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-[#63474D] text-white'
                    : 'bg-[#FAF7F5] text-gray-700 hover:bg-[#E8DDD7]'
                }`}
              >
                All ({stats?.totalItems || 0})
              </button>

              {entityTypeOptions.map((opt) => {
                const Icon = opt.icon;
                const count = stats?.byType?.[opt.type] || 0;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedType === opt.type
                        ? 'bg-[#63474D] text-white'
                        : 'bg-[#FAF7F5] text-gray-700 hover:bg-[#E8DDD7]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                    {count > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-current">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search deleted items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#AA767C]"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort deleted items"
                className="text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-lg px-2.5 py-1.5 text-gray-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#AA767C] cursor-pointer"
              >
                <option value="days_asc">Expiring Soonest</option>
                <option value="days_desc">Most Days Left</option>
                <option value="deleted_desc">Recently Deleted</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Items Listing */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-[#E8DDD7] p-16 text-center shadow-xs">
              <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Retrieving authorized Recycle Bin items...</p>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8DDD7] p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F5] text-gray-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-[#2D1F23]">Recycle Bin is Empty</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                {searchQuery || selectedType !== 'all'
                  ? 'No items matched your current filter or search criteria.'
                  : 'You have no deleted items in your Recycle Bin. Items soft-deleted in this workspace will appear here for 30 days.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item) => {
                const meta = getEntityMeta(item.entityType);
                const Icon = meta.icon;

                // Color code for days remaining
                const daysBadgeClass =
                  item.daysRemaining <= 3
                    ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                    : item.daysRemaining <= 10
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                return (
                  <div
                    key={`${item.entityType}-${item.id}`}
                    className="bg-white rounded-xl border border-[#E8DDD7] p-4 sm:p-5 shadow-xs hover:border-[#AA767C]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Item Details */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="p-2.5 rounded-xl bg-[#FAF7F5] text-[#63474D] shrink-0 border border-[#E8DDD7]">
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#63474D]/10 text-[#63474D]">
                            {meta.label}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${daysBadgeClass}`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {item.daysRemaining === 0
                                ? 'Expires Today'
                                : `${item.daysRemaining} ${item.daysRemaining === 1 ? 'day' : 'days'} left`}
                            </span>
                          </span>

                          {!item.canPermanentDelete && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1"
                              title={item.permanentDeleteBlockReason || 'Record is permanently preserved for audit and financial integrity'}
                            >
                              <Lock className="w-3 h-3 text-gray-500" />
                              <span>Protected Record</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-[#2D1F23] truncate">
                          {item.title}
                        </h3>

                        {item.subtitle && (
                          <p className="text-xs text-gray-600 line-clamp-1">{item.subtitle}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 pt-1">
                          <span>
                            Deleted:{' '}
                            <strong className="text-gray-700">
                              {new Date(item.deletedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </strong>
                          </span>

                          {item.deletedByName && (
                            <span>
                              By: <strong className="text-gray-700">{item.deletedByName}</strong>
                            </span>
                          )}

                          {item.ownerName && role === 'ADMIN' && (
                            <span>
                              Owner: <strong className="text-gray-700">{item.ownerName}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                      {/* Restore Button */}
                      <button
                        type="button"
                        onClick={() => setRestoreItemModal(item)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#63474D] text-white hover:bg-[#523A3F] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>

                      {/* Permanent Delete Button */}
                      <button
                        type="button"
                        onClick={() => setPermanentDeleteItemModal(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                          item.canPermanentDelete
                            ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                            : 'text-gray-400 border-gray-200 hover:bg-gray-50'
                        }`}
                        title={
                          item.canPermanentDelete
                            ? 'Permanently delete this record'
                            : item.permanentDeleteBlockReason || 'Record cannot be permanently deleted due to financial history'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete Permanently</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. RESTORE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {restoreItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E8DDD7] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#2D1F23]">
                  Restore {getEntityMeta(restoreItemModal.entityType).label}?
                </h3>
                <p className="text-xs text-gray-500">
                  Confirm restoration for <span className="font-semibold text-gray-800">"{restoreItemModal.title}"</span>.
                </p>
              </div>
            </div>

            <div className="bg-[#FAF7F5] rounded-xl p-3.5 border border-[#E8DDD7] text-xs text-gray-700 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#63474D]">
                <ShieldCheck className="w-4 h-4 text-[#AA767C]" />
                <span>Safe Restoration Guarantees</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                {restoreItemModal.entityType === 'event' && (
                  <>
                    <li>Preserves original registrations, ticket allocations, and vendor records.</li>
                    <li>Restored into draft status so you can review details before publishing.</li>
                    <li>Immediately reappears in your active Organizer Events dashboard.</li>
                  </>
                )}
                {restoreItemModal.entityType === 'registration' && (
                  <>
                    <li>Restores your active attendee pass and check-in QR code credentials.</li>
                    <li>Re-links ticket to your profile without altering payment history.</li>
                  </>
                )}
                {restoreItemModal.entityType === 'sponsorship_application' && (
                  <>
                    <li>Re-opens your sponsorship pitch for organizer review.</li>
                    <li>Retains all proposal packages and tier requirements.</li>
                  </>
                )}
                {restoreItemModal.entityType === 'sponsorship_deal' && (
                  <>
                    <li>Restores deal tracking into your active pipeline.</li>
                    <li>Restores tier deliverables and contact assignments.</li>
                  </>
                )}
                {restoreItemModal.entityType === 'event_vendor' && (
                  <>
                    <li>Restores your booth booking application and placement.</li>
                    <li>Preserves vendor receipts and booth staff allocations.</li>
                  </>
                )}
                {restoreItemModal.entityType === 'user' && (
                  <>
                    <li>Restores user account credentials and profile data.</li>
                    <li>Reactivates login access across Sheeba.</li>
                  </>
                )}
                {restoreItemModal.entityType === 'review' && (
                  <>
                    <li>Restores rating and review comment to the event profile.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoreItemModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#63474D] text-white hover:bg-[#523A3F] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PERMANENT DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {permanentDeleteItemModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-rose-50 text-rose-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-rose-950">
                  Permanently Delete {getEntityMeta(permanentDeleteItemModal.entityType).label}?
                </h3>
                <p className="text-xs text-rose-700">
                  This action is irreversible and cannot be undone through the Recycle Bin.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700">
              Target Item: <strong className="text-gray-900">{permanentDeleteItemModal.title}</strong>
            </div>

            {!permanentDeleteItemModal.canPermanentDelete ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1 text-amber-950">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Permanent Deletion Blocked</span>
                </div>
                <p>
                  {permanentDeleteItemModal.permanentDeleteBlockReason ||
                    'This record is linked to settled financial payments or invoices. To protect financial audit trails and tax reporting, it must remain in the Recycle Bin rather than being erased from the database.'}
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 space-y-1">
                <div className="font-semibold">⚠️ Irreversible Action</div>
                <p>
                  All associated records, metadata, and dependencies will be permanently deleted from the database.
                  You will not be able to recover this data.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPermanentDeleteItemModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {permanentDeleteItemModal.canPermanentDelete ? (
                <button
                  type="button"
                  onClick={handleConfirmPermanentDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {actionLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Delete Permanently</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPermanentDeleteItemModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 text-gray-700 cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ADMIN RETENTION PURGE MODAL */}
      {/* ======================================================== */}
      {purgeModalOpen && role === 'ADMIN' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-red-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-red-50 text-red-700 shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Execute 30-Day Retention Purge?
                </h3>
                <p className="text-xs text-gray-500">
                  This will scan and permanently purge records across the platform that have exceeded the 30-day retention window.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1 text-amber-950">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Financial Safety Preserved</span>
              </div>
              <p>
                Any expired item tied to settled payments will be automatically skipped and preserved in accordance
                with Sheeba financial compliance policies.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPurgeModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurge}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Run Retention Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
