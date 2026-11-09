import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import {
  Activity,
  Search,
  ShieldCheck,
  ShieldAlert,
  Award,
  Users,
  Calendar,
  Ticket,
  HandCoins,
  Trash2,
  Lock,
  RefreshCw,
  Clock,
  Eye,
  FileText,
} from 'lucide-react';

interface AuditLogRecord {
  id: string;
  action: string;
  category: string;
  entityType: string;
  entityId: string;
  entityTitle?: string;
  performedBy?: string;
  performedByName: string;
  performedByEmail?: string;
  performedByRole?: string;
  details?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

const CATEGORIES = [
  { key: 'ALL', label: 'All Categories', icon: Activity },
  { key: 'USER_MANAGEMENT', label: 'Users & Organizers', icon: Users },
  { key: 'BADGES', label: 'Badges & Credentials', icon: Award },
  { key: 'MODERATION', label: 'Content Moderation', icon: ShieldAlert },
  { key: 'EVENTS', label: 'Events', icon: Calendar },
  { key: 'REGISTRATIONS', label: 'Registrations', icon: Ticket },
  { key: 'ORGANIZER_SPONSOR', label: 'Sponsors & Exhibitors', icon: HandCoins },
  { key: 'RECYCLE_BIN', label: 'Recycle Bin', icon: Trash2 },
  { key: 'AUTH_SECURITY', label: 'Auth & Security', icon: Lock },
];

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [viewDetailsLog, setViewDetailsLog] = useState<AuditLogRecord | null>(null);

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchLogs = async (currentPage: number, cat: string, queryText: string) => {
    setLoading(true);
    try {
      const res = await api.admin.getAuditLogs({
        page: currentPage,
        limit: 15,
        category: cat,
        search: queryText,
      });

      if (res) {
        setLogs(res.logs || []);
        if (res.pagination) {
          setPage(res.pagination.page);
          setTotalPages(res.pagination.totalPages);
          setTotalRecords(res.pagination.total);
        }
        if (res.categoryCounts) {
          setCategoryCounts(res.categoryCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load system audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, selectedCategory, debouncedSearch);
  }, [page, selectedCategory, debouncedSearch]);

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('APPROVED') || act.includes('ACTIVATED') || act.includes('RESTORE') || act.includes('REINSTATED') || act.includes('SETTLED')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (act.includes('REJECTED') || act.includes('DEACTIVATED') || act.includes('TAKEDOWN') || act.includes('REVOKED') || act.includes('DELETED')) {
      return 'bg-red-50 text-red-800 border-red-200';
    }
    if (act.includes('PENDING') || act.includes('REQUESTED') || act.includes('SOFT_DELETE')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (act.includes('LOGIN') || act.includes('REGISTERED') || act.includes('PASSWORD')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-stone-50 text-stone-800 border-stone-200';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8DDD7]">
        <div>
          <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Platform Governance & Accountability
          </Badge>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23] mt-1.5 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-[#63474D]" />
            System-Wide Audit Logs
          </h1>
          <p className="text-xs text-[#756366] mt-1">
            Immutable ledger tracking accounts, badge grants & revocations, event publishing, moderation, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(page, selectedCategory, debouncedSearch)}
            isLoading={loading}
            className="text-xs flex items-center gap-1.5 border-[#E8DDD7] text-[#63474D] hover:bg-[#FAF7F5]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </Button>
          <Badge variant="tertiary" className="text-xs py-1 px-3">
            {totalRecords} Total Records
          </Badge>
        </div>
      </div>

      {/* Category Filter Pills Carousel / Scroller */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = categoryCounts[cat.key] ?? (cat.key === 'ALL' ? totalRecords : 0);
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#63474D] text-white border-[#63474D] shadow-xs'
                    : 'bg-white text-[#756366] border-[#E8DDD7] hover:bg-[#FAF7F5] hover:text-[#2D1F23]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#AA767C]'}`} />
                <span>{cat.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF7F5] text-[#756366] border border-[#E8DDD7]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Table Container */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8DDD7] shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#756366] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by action, actor, email, entity, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:bg-white focus:border-[#63474D] transition-all"
            />
          </div>

          <div className="text-xs text-[#756366] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#AA767C]" />
            <span>Strictly 15 records per page (Backend Paginated)</span>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Affected Entity</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Details & Notes</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#756366]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#63474D] border-t-transparent rounded-full animate-spin" />
                      <span>Loading audit trail logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#756366]">
                    No audit log records found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                      {/* Action */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getActionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-[#63474D] bg-[#FAF7F5] px-2 py-0.5 rounded-md border border-[#E8DDD7]">
                          {log.category.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Affected Entity */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-[#2D1F23] truncate">
                          {log.entityTitle || log.entityId}
                        </div>
                        <div className="text-[10px] text-[#756366] capitalize">
                          Type: {log.entityType.replace(/_/g, ' ')}
                        </div>
                      </td>

                      {/* Performed By */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#2D1F23]">{log.performedByName}</p>
                        {log.performedByEmail && (
                          <p className="text-[10px] text-[#756366]">{log.performedByEmail}</p>
                        )}
                        {log.performedByRole && (
                          <span className="inline-block text-[9px] uppercase font-bold text-[#AA767C] mt-0.5">
                            {log.performedByRole}
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <p className="text-xs text-[#2D1F23] line-clamp-2">
                          {log.details || 'System routine execution'}
                        </p>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#756366]">
                        <p className="font-semibold text-[#2D1F23]">
                          {new Date(log.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-[10px] text-[#756366]">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      {/* Inspect Details Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setViewDetailsLog(log)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#63474D] hover:bg-[#FAF7F5] border border-[#E8DDD7] transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Backend Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalRecords}
          itemsPerPage={15}
        />
      </div>

      {/* Log Details Modal */}
      {viewDetailsLog && (
        <Modal
          isOpen={!!viewDetailsLog}
          onClose={() => setViewDetailsLog(null)}
          title="Audit Record Inspection"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-[#2D1F23]">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#E8DDD7] gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${getActionBadgeColor(viewDetailsLog.action)}`}>
                {viewDetailsLog.action.replace(/_/g, ' ')}
              </span>
              <span className="text-[#756366] text-[11px] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(viewDetailsLog.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#756366] block">Category</span>
                <span className="font-semibold text-xs text-[#2D1F23]">{viewDetailsLog.category}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#756366] block">Entity Type & ID</span>
                <span className="font-mono text-[11px] text-[#63474D]">
                  {viewDetailsLog.entityType}: {viewDetailsLog.entityId}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#756366] block">Entity Title</span>
                <span className="font-semibold text-xs text-[#2D1F23]">{viewDetailsLog.entityTitle || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#756366] block">Performed By</span>
                <span className="font-semibold text-xs text-[#2D1F23]">
                  {viewDetailsLog.performedByName} {viewDetailsLog.performedByEmail ? `(${viewDetailsLog.performedByEmail})` : ''}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[#756366] block">Action Details</span>
              <div className="p-3 bg-white rounded-xl border border-[#E8DDD7] text-xs leading-relaxed whitespace-pre-wrap">
                {viewDetailsLog.details || 'No additional details recorded.'}
              </div>
            </div>

            {viewDetailsLog.metadata && Object.keys(viewDetailsLog.metadata).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#756366] block">Sanitized Metadata (Append-Only Audit)</span>
                <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56">
                  {JSON.stringify(viewDetailsLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setViewDetailsLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

