import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import type { BadgeAward } from '../../types/attendance';
import type {
  OrganizerSubscription,
  OrganizerAllowanceHistory,
  PlatformAttendee,
  AttendeeRegistrationRecord,
} from '../../types/subscription';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  CreditCard,
  Key,
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sparkles,
  Plus,
  RefreshCw,
  Clock,
  FileText,
  Mail,
  Phone,
  ExternalLink,
  Eye,
  Award,
  DollarSign,
  TrendingUp,
  History,
  UserCheck,
  Lock,
  Unlock,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'organizers'
  | 'events'
  | 'attendees'
  | 'plans'
  | 'access'
  | 'activity';

export const AdminDashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as AdminTab) || 'overview';

  const setTab = (tab: AdminTab) => {
    setSearchParams({ tab });
  };

  // -------------------------------------------------------------
  // GLOBAL METRICS STATE
  // -------------------------------------------------------------
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<Event[]>([]);

  // -------------------------------------------------------------
  // TAB 2 & 6: ORGANIZERS & SUBSCRIPTIONS STATE
  // -------------------------------------------------------------
  const [subscriptions, setSubscriptions] = useState<OrganizerSubscription[]>([]);
  const [subsLoading, setSubsLoading] = useState<boolean>(false);
  const [subsSearch, setSubsSearch] = useState<string>('');
  const [subsStatusFilter, setSubsStatusFilter] = useState<string>('All');
  const [subsPaymentFilter, setSubsPaymentFilter] = useState<string>('All');
  const [subsPage, setSubsPage] = useState<number>(1);
  const [subsTotalPages, setSubsTotalPages] = useState<number>(1);
  const [subsTotal, setSubsTotal] = useState<number>(0);

  // Allowance Edit Modal State
  const [selectedSubForEdit, setSelectedSubForEdit] = useState<OrganizerSubscription | null>(null);
  const [editMaxEvents, setEditMaxEvents] = useState<number>(1);
  const [editPlanName, setEditPlanName] = useState<string>('Starter (1 Event)');
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('paid');
  const [editSubStatus, setEditSubStatus] = useState<string>('active');
  const [editReason, setEditReason] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editAgreementRef, setEditAgreementRef] = useState<string>('');
  const [savingAllowance, setSavingAllowance] = useState<boolean>(false);
  const [allowanceFeedback, setAllowanceFeedback] = useState<string | null>(null);

  // Allowance History Modal State
  const [selectedSubForHistory, setSelectedSubForHistory] = useState<OrganizerSubscription | null>(null);
  const [allowanceHistory, setAllowanceHistory] = useState<OrganizerAllowanceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // -------------------------------------------------------------
  // TAB 3: PLATFORM-WIDE EVENTS STATE
  // -------------------------------------------------------------
  const [eventsSearch, setEventsSearch] = useState<string>('');
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('All');
  const [eventOrganizerFilter, setEventOrganizerFilter] = useState<string>('All');
  const [selectedEventRoster, setSelectedEventRoster] = useState<{ event: Event; roster: any[] } | null>(null);
  const [rosterLoading, setRosterLoading] = useState<boolean>(false);

  // -------------------------------------------------------------
  // TAB 4: PLATFORM-WIDE ATTENDEES STATE
  // -------------------------------------------------------------
  const [attendees, setAttendees] = useState<PlatformAttendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState<boolean>(false);
  const [attendeesSearch, setAttendeesSearch] = useState<string>('');
  const [attendeesPage, setAttendeesPage] = useState<number>(1);
  const [attendeesTotalPages, setAttendeesTotalPages] = useState<number>(1);
  const [attendeesTotal, setAttendeesTotal] = useState<number>(0);

  // Attendee Event History Modal State
  const [selectedAttendeeForHistory, setSelectedAttendeeForHistory] = useState<PlatformAttendee | null>(null);
  const [attendeeEvents, setAttendeeEvents] = useState<AttendeeRegistrationRecord[]>([]);
  const [loadingAttendeeEvents, setLoadingAttendeeEvents] = useState<boolean>(false);

  // -------------------------------------------------------------
  // TAB 7: ACTIVITY / AUDIT LOGS STATE
  // -------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [logsSearch, setLogsSearch] = useState<string>('');
  const [logsCategory, setLogsCategory] = useState<string>('ALL');
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsTotalPages, setLogsTotalPages] = useState<number>(1);
  const [logsTotal, setLogsTotal] = useState<number>(0);

  // -------------------------------------------------------------
  // DATA FETCHING FUNCTIONS
  // -------------------------------------------------------------
  const fetchDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      const [m, evts] = await Promise.all([
        api.admin.getDashboard(),
        api.events.getAll(),
      ]);
      setDashboardMetrics(m);
      setEvents(evts);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setSubsLoading(true);
      const res = await api.admin.getSubscriptions({
        search: subsSearch,
        status: subsStatusFilter,
        paymentStatus: subsPaymentFilter,
        page: subsPage,
        limit: 15,
      });
      if (res && res.subscriptions) {
        setSubscriptions(res.subscriptions);
        setSubsTotal(res.pagination.total);
        setSubsTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setSubsLoading(false);
    }
  };

  const fetchPlatformAttendees = async () => {
    try {
      setAttendeesLoading(true);
      const res = await api.admin.getPlatformAttendees({
        search: attendeesSearch,
        page: attendeesPage,
        limit: 15,
      });
      if (res && res.attendees) {
        setAttendees(res.attendees);
        setAttendeesTotal(res.pagination.total);
        setAttendeesTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load platform attendees:', err);
    } finally {
      setAttendeesLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await api.admin.getAuditLogs({
        page: logsPage,
        limit: 15,
        search: logsSearch,
        category: logsCategory,
      });
      if (res && res.logs) {
        setAuditLogs(res.logs);
        setLogsTotal(res.pagination.total);
        setLogsTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  useEffect(() => {
    if (currentTab === 'organizers' || currentTab === 'plans' || currentTab === 'access') {
      fetchSubscriptions();
    } else if (currentTab === 'attendees') {
      fetchPlatformAttendees();
    } else if (currentTab === 'activity') {
      fetchAuditLogs();
    }
  }, [
    currentTab,
    subsPage,
    subsStatusFilter,
    subsPaymentFilter,
    attendeesPage,
    logsPage,
    logsCategory,
  ]);

  // Debounced search handlers
  useEffect(() => {
    const t = setTimeout(() => {
      if (currentTab === 'organizers' || currentTab === 'plans' || currentTab === 'access') {
        setSubsPage(1);
        fetchSubscriptions();
      } else if (currentTab === 'attendees') {
        setAttendeesPage(1);
        fetchPlatformAttendees();
      } else if (currentTab === 'activity') {
        setLogsPage(1);
        fetchAuditLogs();
      }
    }, 350);
    return () => clearTimeout(t);
  }, [subsSearch, attendeesSearch, logsSearch]);

  // -------------------------------------------------------------
  // ALLOWANCE & SUBSCRIPTION ACTIONS
  // -------------------------------------------------------------
  const openEditAllowance = (sub: OrganizerSubscription) => {
    setSelectedSubForEdit(sub);
    setEditMaxEvents(sub.maxEvents);
    setEditPlanName(sub.planName || 'Starter (1 Event)');
    setEditPaymentStatus(sub.paymentStatus || 'paid');
    setEditSubStatus(sub.subscriptionStatus || 'active');
    setEditNotes(sub.notes || '');
    setEditAgreementRef(sub.agreementReference || '');
    setEditReason('');
    setAllowanceFeedback(null);
  };

  const handleSaveAllowance = async () => {
    if (!selectedSubForEdit) return;
    try {
      setSavingAllowance(true);
      await api.admin.updateOrganizerAllowance(selectedSubForEdit.organizerId, {
        maxEvents: Number(editMaxEvents),
        planName: editPlanName,
        paymentStatus: editPaymentStatus,
        subscriptionStatus: editSubStatus,
        notes: editNotes,
        agreementReference: editAgreementRef,
        reason: editReason || `Allowance adjusted by administrator to ${editMaxEvents} events (${editPlanName})`,
      });

      setAllowanceFeedback(`Successfully updated event allowance for ${selectedSubForEdit.organizerName}.`);
      setTimeout(() => {
        setSelectedSubForEdit(null);
        setAllowanceFeedback(null);
      }, 1500);

      await fetchSubscriptions();
      await fetchDashboardMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to update event allowance.');
    } finally {
      setSavingAllowance(false);
    }
  };

  const handleQuickGrantCredit = async (sub: OrganizerSubscription, credits: number) => {
    const confirmMsg = `Grant +${credits} additional event credit(s) to ${sub.organization || sub.organizerName}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.admin.updateOrganizerAllowance(sub.organizerId, {
        grantCredits: credits,
        reason: `Administrator granted +${credits} bonus event credit(s)`,
      });
      await fetchSubscriptions();
      await fetchDashboardMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to grant event credits.');
    }
  };

  const openAllowanceHistory = async (sub: OrganizerSubscription) => {
    setSelectedSubForHistory(sub);
    try {
      setLoadingHistory(true);
      const history = await api.admin.getAllowanceHistory(sub.organizerId);
      setAllowanceHistory(history);
    } catch (err) {
      console.error('Failed to load allowance history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleOrganizerAccount = async (sub: OrganizerSubscription) => {
    const action = sub.isActive ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} account access for ${sub.organization}?`)) return;

    try {
      await api.admin.toggleUserStatus(sub.organizerId);
      await fetchSubscriptions();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} organizer.`);
    }
  };

  const handleApproveOrganizer = async (sub: OrganizerSubscription) => {
    try {
      await api.admin.approveOrganizer(sub.organizerId);
      await fetchSubscriptions();
      await fetchDashboardMetrics();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  // -------------------------------------------------------------
  // ATTENDEE HISTORY MODAL ACTION
  // -------------------------------------------------------------
  const openAttendeeHistory = async (attendee: PlatformAttendee) => {
    setSelectedAttendeeForHistory(attendee);
    try {
      setLoadingAttendeeEvents(true);
      const records = await api.admin.getAttendeeRegistrations(attendee.id);
      setAttendeeEvents(records);
    } catch (err) {
      console.error('Failed to load attendee event history:', err);
    } finally {
      setLoadingAttendeeEvents(false);
    }
  };

  // -------------------------------------------------------------
  // EVENT ROSTER MODAL ACTION
  // -------------------------------------------------------------
  const openEventRoster = async (event: Event) => {
    try {
      setRosterLoading(true);
      setSelectedEventRoster({ event, roster: [] });
      const roster = await api.roster.getByEventId(event.id);
      setSelectedEventRoster({ event, roster: roster || [] });
    } catch (err) {
      console.error('Failed to load event roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  // -------------------------------------------------------------
  // FILTERED EVENTS FOR TAB 3
  // -------------------------------------------------------------
  const organizerNames = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.organizerName) set.add(e.organizerName);
    });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !eventsSearch ||
        e.title.toLowerCase().includes(eventsSearch.toLowerCase()) ||
        e.location.toLowerCase().includes(eventsSearch.toLowerCase()) ||
        (e.organizerName && e.organizerName.toLowerCase().includes(eventsSearch.toLowerCase()));

      const matchesStatus =
        eventStatusFilter === 'All' ||
        e.status.toLowerCase() === eventStatusFilter.toLowerCase();

      const matchesOrg =
        eventOrganizerFilter === 'All' || e.organizerName === eventOrganizerFilter;

      return matchesSearch && matchesStatus && matchesOrg;
    });
  }, [events, eventsSearch, eventStatusFilter, eventOrganizerFilter]);

  // Derived KPI calculations
  const totalRegistrations = events.reduce((acc, curr) => acc + curr.registeredCount, 0);
  const totalCheckIns = events.reduce((acc, curr) => acc + curr.checkedInCount, 0);
  const turnoutRate =
    totalRegistrations > 0 ? ((totalCheckIns / totalRegistrations) * 100).toFixed(1) : '0';

  const pendingOrganizersCount = dashboardMetrics?.pendingOrganizers || 0;
  const activeSubscriptionsCount = subscriptions.filter((s) => s.subscriptionStatus === 'active').length;

  return (
    <div className="space-y-8 pb-16">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="primary" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Platform Control Center
          </Badge>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23] mt-1">
            Centralized Admin Dashboard
          </h1>
          <p className="text-xs text-[#756366]">
            Platform-wide governance across organizers, events, attendees, subscriptions, and event allowances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchDashboardMetrics();
              if (currentTab === 'organizers' || currentTab === 'plans' || currentTab === 'access') {
                fetchSubscriptions();
              } else if (currentTab === 'attendees') {
                fetchPlatformAttendees();
              } else if (currentTab === 'activity') {
                fetchAuditLogs();
              }
            }}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Link to="/admin/events">
            <Button variant="primary" size="sm">
              Event Oversight
            </Button>
          </Link>
        </div>
      </div>

      {/* 7 Core Administrative Tabs Bar (Section 7 Specification) */}
      <div className="border-b border-[#E8DDD7] bg-white rounded-2xl p-1.5 shadow-2xs">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            {
              id: 'organizers',
              label: 'Organizers',
              icon: Building2,
              badge: pendingOrganizersCount > 0 ? pendingOrganizersCount : undefined,
            },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'attendees', label: 'Attendees', icon: Users },
            { id: 'plans', label: 'Payments & Plans', icon: CreditCard },
            { id: 'access', label: 'Access & Allowances', icon: Key },
            { id: 'activity', label: 'Activity Logs', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#63474D] text-white shadow-xs'
                    : 'text-[#756366] hover:text-[#2D1F23] hover:bg-[#FAF7F5]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FFA686]' : ''}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFA686] text-[#2D1F23]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: OVERVIEW & PLATFORM STATISTICS */}
      {/* ============================================================= */}
      {currentTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#756366] block">Organizers</span>
              <p className="font-serif text-2xl font-extrabold text-[#63474D]">
                {dashboardMetrics?.totalOrganizers ?? '—'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[#FFA686] font-semibold">
                <span>{pendingOrganizersCount} pending review</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#756366] block">Total Events</span>
              <p className="font-serif text-2xl font-extrabold text-[#63474D]">{events.length}</p>
              <span className="text-[10px] text-[#756366]">Platform-wide</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#756366] block">Attendees</span>
              <p className="font-serif text-2xl font-extrabold text-[#63474D]">
                {dashboardMetrics?.totalAttendees ?? '—'}
              </p>
              <span className="text-[10px] text-[#756366]">Registered users</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#756366] block">Registrations</span>
              <p className="font-serif text-2xl font-extrabold text-[#AA767C]">{totalRegistrations}</p>
              <span className="text-[10px] text-[#756366]">Total passes issued</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#756366] block">Door Check-Ins</span>
              <p className="font-serif text-2xl font-extrabold text-[#2A7B5F]">{totalCheckIns}</p>
              <span className="text-[10px] text-[#2A7B5F] font-semibold">{turnoutRate}% Turnout</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#756366] block">Active Badges</span>
              <p className="font-serif text-2xl font-extrabold text-[#FFA686]">
                {dashboardMetrics?.totalBadges ?? '—'}
              </p>
              <span className="text-[10px] text-[#756366]">Verified awards</span>
            </div>
          </div>

          {/* Quick Action Navigation Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-[#E8DDD7] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23]">Subscription & Allowances</h3>
                  <p className="text-xs text-[#756366]">Configure event limits and assign payment agreements.</p>
                </div>
              </div>
              <div className="pt-2">
                <Button fullWidth variant="outline" size="sm" onClick={() => setTab('access')}>
                  Manage Event Allowances
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#E8DDD7] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2A7B5F]/10 text-[#2A7B5F] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23]">Organizer Approvals</h3>
                  <p className="text-xs text-[#756366]">
                    {pendingOrganizersCount > 0
                      ? `${pendingOrganizersCount} organizer(s) waiting for platform approval.`
                      : 'All organizer accounts reviewed.'}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button fullWidth variant="primary" size="sm" onClick={() => setTab('organizers')}>
                  Review Organizers
                </Button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#E8DDD7] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFA686]/20 text-[#2D1F23] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#2D1F23]">Platform Attendees</h3>
                  <p className="text-xs text-[#756366]">Inspect attendance records and cross-organizer registrations.</p>
                </div>
              </div>
              <div className="pt-2">
                <Button fullWidth variant="outline" size="sm" onClick={() => setTab('attendees')}>
                  Browse Attendees Directory
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Platform Pulse Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDD7] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-base text-[#2D1F23]">Recent Platform Events</h2>
                <p className="text-xs text-[#756366]">Latest events published across all organizations.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTab('events')}>
                View All Events →
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DDD7] text-[#756366] uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-bold">Event Title</th>
                    <th className="pb-3 font-bold">Organization</th>
                    <th className="pb-3 font-bold">Date & Venue</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 font-bold">Capacity</th>
                    <th className="pb-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.slice(0, 5).map((evt) => (
                    <tr key={evt.id} className="hover:bg-[#FAF7F5] transition-colors">
                      <td className="py-3 font-bold text-[#2D1F23]">{evt.title}</td>
                      <td className="py-3 text-[#63474D] font-medium">{evt.organizerName || 'Sheeba Community'}</td>
                      <td className="py-3 text-[#756366]">
                        {evt.date} • {evt.location}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            evt.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#2D1F23]">
                        {evt.registeredCount} / {evt.capacity}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEventRoster(evt)}
                          className="text-[#63474D] hover:text-[#FFA686] font-semibold text-xs cursor-pointer"
                        >
                          Roster
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: ORGANIZERS & SUBSCRIPTION STATUS */}
      {/* ============================================================= */}
      {currentTab === 'organizers' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search organizers by name, email, or organization..."
                value={subsSearch}
                onChange={(e) => setSubsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:border-[#63474D]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={subsStatusFilter}
                onChange={(e) => setSubsStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              >
                <option value="All">All Subscriptions</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
                <option value="depleted">Depleted</option>
              </select>

              <select
                value={subsPaymentFilter}
                onChange={(e) => setSubsPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              >
                <option value="All">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="waived">Waived</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Organizers Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[#756366] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Organization & Contact</th>
                    <th className="py-3 px-4 font-bold">Approval</th>
                    <th className="py-3 px-4 font-bold">Account</th>
                    <th className="py-3 px-4 font-bold">Plan / Agreement</th>
                    <th className="py-3 px-4 font-bold">Event Usage</th>
                    <th className="py-3 px-4 font-bold">Remaining</th>
                    <th className="py-3 px-4 font-bold">Payment</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#756366]">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#63474D] mb-2" />
                        Loading organizer accounts & subscriptions...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#756366]">
                        No organizer subscriptions match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      const isPendingApproval = sub.approvalStatus === 'pending';
                      const isDepleted = sub.remainingEvents <= 0;

                      return (
                        <tr key={sub.id} className="hover:bg-[#FAF7F5]/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#2D1F23]">{sub.organization}</div>
                            <div className="text-[11px] text-[#756366] flex items-center gap-1.5 mt-0.5">
                              <span>{sub.organizerName}</span>
                              <span>•</span>
                              <span>{sub.organizerEmail}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sub.approvalStatus === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : isPendingApproval
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {sub.approvalStatus || 'approved'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sub.isActive && sub.subscriptionStatus === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {sub.isActive && sub.subscriptionStatus === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#63474D]">{sub.planName}</div>
                            {sub.agreementReference && (
                              <div className="text-[10px] text-gray-400 font-mono">Ref: {sub.agreementReference}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-medium text-[#2D1F23]">
                            {sub.eventsUsed} / {sub.maxEvents} created
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDepleted
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {sub.remainingEvents} credit(s)
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sub.paymentStatus === 'paid'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : sub.paymentStatus === 'waived'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {sub.paymentStatus.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPendingApproval && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveOrganizer(sub)}
                                  className="px-2 py-1 bg-green-600 text-white rounded-lg text-[11px] font-bold hover:bg-green-700 cursor-pointer"
                                  title="Approve Organizer"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditAllowance(sub)}
                                className="px-2 py-1 bg-[#63474D] text-white rounded-lg text-[11px] font-semibold hover:bg-[#523a3f] cursor-pointer"
                                title="Edit Event Limits & Plan"
                              >
                                Limits
                              </button>
                              <button
                                type="button"
                                onClick={() => openAllowanceHistory(sub)}
                                className="p-1 text-[#756366] hover:text-[#2D1F23] hover:bg-gray-100 rounded-lg cursor-pointer"
                                title="View Allowance History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleOrganizerAccount(sub)}
                                className={`p-1 rounded-lg cursor-pointer ${
                                  sub.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                                }`}
                                title={sub.isActive ? 'Suspend Account' : 'Reactivate Account'}
                              >
                                {sub.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {subsTotalPages > 1 && (
              <div className="p-4 border-t border-[#E8DDD7] flex justify-end">
                <Pagination
                  currentPage={subsPage}
                  totalPages={subsTotalPages}
                  totalItems={subsTotal}
                  onPageChange={(p) => setSubsPage(p)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: ALL PLATFORM EVENTS & ROSTERS */}
      {/* ============================================================= */}
      {currentTab === 'events' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events by title, location, or organizer..."
                value={eventsSearch}
                onChange={(e) => setEventsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={eventOrganizerFilter}
                onChange={(e) => setEventOrganizerFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none max-w-xs"
              >
                <option value="All">All Organizers</option>
                {organizerNames.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>

              <select
                value={eventStatusFilter}
                onChange={(e) => setEventStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="open">Open</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[#756366] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Event Title</th>
                    <th className="py-3 px-4 font-bold">Organization</th>
                    <th className="py-3 px-4 font-bold">Date & Venue</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Registrations</th>
                    <th className="py-3 px-4 font-bold">Door Turnout</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#756366]">
                        No platform events match your search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-[#FAF7F5]/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#2D1F23]">{evt.title}</td>
                        <td className="py-3.5 px-4 font-medium text-[#63474D]">
                          {evt.organizerName || 'Community Organizer'}
                        </td>
                        <td className="py-3.5 px-4 text-[#756366]">
                          {evt.date} • {evt.location}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              evt.status === 'open'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {evt.registeredCount} / {evt.capacity}
                        </td>
                        <td className="py-3.5 px-4 text-[#2A7B5F] font-semibold">
                          {evt.checkedInCount} checked in
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEventRoster(evt)}
                              className="px-2.5 py-1 bg-[#63474D]/10 text-[#63474D] hover:bg-[#63474D] hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Roster
                            </button>
                            <Link
                              to={`/e/${evt.shareLinkToken || evt.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-[#756366] hover:text-[#63474D] rounded-lg"
                              title="Open public registration page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: PLATFORM-WIDE ATTENDEES DIRECTORY */}
      {/* ============================================================= */}
      {currentTab === 'attendees' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-xs flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search attendees across all organizers by name, email, or school..."
                value={attendeesSearch}
                onChange={(e) => setAttendeesSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              />
            </div>
            <div className="text-xs text-[#756366] font-medium">
              Total Platform Attendees: <strong className="text-[#2D1F23]">{attendeesTotal}</strong>
            </div>
          </div>

          {/* Attendees Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[#756366] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Attendee Name & Email</th>
                    <th className="py-3 px-4 font-bold">Phone</th>
                    <th className="py-3 px-4 font-bold">Organization / University</th>
                    <th className="py-3 px-4 font-bold">Events Registered</th>
                    <th className="py-3 px-4 font-bold">Verified Check-Ins</th>
                    <th className="py-3 px-4 font-bold">Badges</th>
                    <th className="py-3 px-4 font-bold text-right">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendeesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#756366]">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#63474D] mb-2" />
                        Loading platform-wide attendee directory...
                      </td>
                    </tr>
                  ) : attendees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#756366]">
                        No attendees found matching your query.
                      </td>
                    </tr>
                  ) : (
                    attendees.map((att) => (
                      <tr key={att.id} className="hover:bg-[#FAF7F5]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#2D1F23]">{att.name}</div>
                          <div className="text-[11px] text-[#756366]">{att.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#756366]">{att.phone || '—'}</td>
                        <td className="py-3.5 px-4 text-[#63474D] font-medium">{att.organization || 'Independent'}</td>
                        <td className="py-3.5 px-4 font-mono font-medium text-[#2D1F23]">
                          {att.registrationsCount} event(s)
                        </td>
                        <td className="py-3.5 px-4 text-[#2A7B5F] font-semibold">
                          {att.checkInsCount} attended
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFA686]/20 text-[#63474D]">
                            <Award className="w-3 h-3 text-[#FFA686]" />
                            {att.badgesCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAttendeeHistory(att)}
                            icon={<Eye className="w-3 h-3" />}
                          >
                            Registration History
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {attendeesTotalPages > 1 && (
              <div className="p-4 border-t border-[#E8DDD7] flex justify-end">
                <Pagination
                  currentPage={attendeesPage}
                  totalPages={attendeesTotalPages}
                  totalItems={attendeesTotal}
                  onPageChange={(p) => setAttendeesPage(p)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 5: PAYMENTS & SUBSCRIPTION AGREEMENTS */}
      {/* ============================================================= */}
      {currentTab === 'plans' && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#756366]">Active Subscriptions</span>
              <p className="font-serif text-3xl font-extrabold text-[#2A7B5F] mt-1">
                {activeSubscriptionsCount}
              </p>
              <p className="text-[11px] text-[#756366] mt-0.5">Approved & active contracts</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#756366]">Pending Settlements</span>
              <p className="font-serif text-3xl font-extrabold text-amber-600 mt-1">
                {subscriptions.filter((s) => s.paymentStatus === 'pending').length}
              </p>
              <p className="text-[11px] text-[#756366] mt-0.5">Agreements awaiting confirmation</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8DDD7] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#756366]">Total Authorized Events</span>
              <p className="font-serif text-3xl font-extrabold text-[#63474D] mt-1">
                {subscriptions.reduce((acc, curr) => acc + curr.maxEvents, 0)}
              </p>
              <p className="text-[11px] text-[#756366] mt-0.5">Cumulative platform allowance</p>
            </div>
          </div>

          {/* Agreements Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E8DDD7] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#2D1F23]">Organizer Subscription Agreements</h3>
                <p className="text-xs text-[#756366]">
                  Contracted event allowances, payment statuses, and billing references.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[#756366] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Organization</th>
                    <th className="py-3 px-4 font-bold">Assigned Plan</th>
                    <th className="py-3 px-4 font-bold">Event Quota</th>
                    <th className="py-3 px-4 font-bold">Agreement Ref</th>
                    <th className="py-3 px-4 font-bold">Payment Status</th>
                    <th className="py-3 px-4 font-bold">Subscription Status</th>
                    <th className="py-3 px-4 font-bold text-right">Adjust</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#FAF7F5]/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#2D1F23]">
                        {sub.organization}
                        <div className="text-[11px] text-[#756366] font-normal">{sub.organizerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#63474D]">{sub.planName}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-[#2D1F23]">
                        {sub.eventsUsed} / {sub.maxEvents} used
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                        {sub.agreementReference || 'Contract on file'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.subscriptionStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sub.subscriptionStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditAllowance(sub)}
                          icon={<Key className="w-3 h-3" />}
                        >
                          Update Agreement
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 6: ACCESS MANAGEMENT (EVENT ALLOWANCES & LIMIT CONTROL) */}
      {/* ============================================================= */}
      {currentTab === 'access' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Explanation */}
          <div className="p-4 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl space-y-1">
            <h3 className="font-serif font-bold text-sm text-[#2D1F23] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#63474D]" />
              Event Creation Allowance & Permission Management
            </h3>
            <p className="text-xs text-[#756366] leading-relaxed">
              Administrators have centralized authority to increase or decrease event creation quotas, grant additional credits manually, assign customized enterprise plans, and inspect the complete audit trail of modifications.
            </p>
          </div>

          {/* Quick Grant & Quota Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[#756366] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Organization</th>
                    <th className="py-3 px-4 font-bold">Current Plan</th>
                    <th className="py-3 px-4 font-bold">Max Events Allowed</th>
                    <th className="py-3 px-4 font-bold">Events Created</th>
                    <th className="py-3 px-4 font-bold">Remaining Credits</th>
                    <th className="py-3 px-4 font-bold">Quick Grant Credits</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map((sub) => {
                    const isDepleted = sub.remainingEvents <= 0;
                    return (
                      <tr key={sub.id} className="hover:bg-[#FAF7F5]/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#2D1F23]">
                          {sub.organization}
                          <div className="text-[11px] text-[#756366] font-normal">{sub.organizerEmail}</div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#63474D]">{sub.planName}</td>

                        <td className="py-3.5 px-4 font-mono font-bold text-base text-[#2D1F23]">
                          {sub.maxEvents}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-gray-700">{sub.eventsUsed}</td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDepleted
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {sub.remainingEvents} credit(s) left
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickGrantCredit(sub, 1)}
                              className="px-2 py-1 bg-gray-100 hover:bg-[#63474D] hover:text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              title="Grant +1 event credit"
                            >
                              +1 Credit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickGrantCredit(sub, 3)}
                              className="px-2 py-1 bg-gray-100 hover:bg-[#63474D] hover:text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              title="Grant +3 event credits"
                            >
                              +3 Credits
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openEditAllowance(sub)}
                              icon={<Key className="w-3 h-3" />}
                            >
                              Edit Limits
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAllowanceHistory(sub)}
                              icon={<History className="w-3 h-3" />}
                            >
                              History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 7: SYSTEM ACTIVITY & AUDIT LOGS */}
      {/* ============================================================= */}
      {currentTab === 'activity' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit actions, organizer names, or details..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={logsCategory}
                onChange={(e) => setLogsCategory(e.target.value)}
                className="px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="USER_MANAGEMENT">User & Plan Management</option>
                <option value="EVENTS">Events</option>
                <option value="MODERATION">Moderation</option>
                <option value="RECYCLE_BIN">Recycle Bin</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[#756366] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Action & Entity</th>
                    <th className="py-3 px-4 font-bold">Details</th>
                    <th className="py-3 px-4 font-bold">Performed By</th>
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#756366]">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#63474D] mb-2" />
                        Loading activity logs...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#756366]">
                        No activity records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAF7F5]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-[#63474D] block">{log.action}</span>
                          <span className="text-[11px] text-gray-400">{log.entityTitle || log.entityType}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#2D1F23] leading-relaxed max-w-md">
                          {log.details || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-[#756366]">
                          <span className="font-semibold text-[#2D1F23] block">{log.performedByName || 'System'}</span>
                          <span className="text-[10px] text-gray-400">{log.performedByEmail}</span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {logsTotalPages > 1 && (
              <div className="p-4 border-t border-[#E8DDD7] flex justify-end">
                <Pagination
                  currentPage={logsPage}
                  totalPages={logsTotalPages}
                  totalItems={logsTotal}
                  onPageChange={(p) => setLogsPage(p)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: EDIT ALLOWANCE / PLAN (SECTION 5 SPECIFICATION) */}
      {/* ============================================================= */}
      {selectedSubForEdit && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSubForEdit(null)}
          title={`Configure Allowance: ${selectedSubForEdit.organization}`}
        >
          <div className="space-y-4 text-xs">
            {allowanceFeedback && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 font-bold animate-fade-in flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{allowanceFeedback}</span>
              </div>
            )}

            <div className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#756366] block">Current Usage</span>
                <span className="font-bold text-sm text-[#2D1F23]">
                  {selectedSubForEdit.eventsUsed} events created
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#756366] block">Current Limit</span>
                <span className="font-bold text-sm text-[#63474D]">
                  {selectedSubForEdit.maxEvents} events maximum
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#2D1F23] mb-1">Assigned Plan Agreement *</label>
              <select
                value={editPlanName}
                onChange={(e) => {
                  setEditPlanName(e.target.value);
                  if (e.target.value.includes('1 Event')) setEditMaxEvents(1);
                  else if (e.target.value.includes('3 Events')) setEditMaxEvents(3);
                  else if (e.target.value.includes('5 Events')) setEditMaxEvents(5);
                }}
                className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              >
                <option value="Starter (1 Event)">Starter (1 Event)</option>
                <option value="Growth (3 Events)">Growth (3 Events)</option>
                <option value="Enterprise (5 Events)">Enterprise (5 Events)</option>
                <option value="Custom Agreement">Custom Agreement</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#2D1F23] mb-1">
                Maximum Number of Events Allowed *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={editMaxEvents}
                  onChange={(e) => setEditMaxEvents(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="flex-1 px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs font-mono font-bold text-[#2D1F23] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setEditMaxEvents((prev) => prev + 1)}
                  className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold cursor-pointer"
                  title="Add 1 event credit"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setEditMaxEvents((prev) => prev + 2)}
                  className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold cursor-pointer"
                  title="Add 2 event credits"
                >
                  +2
                </button>
              </div>
              <p className="text-[10px] text-[#756366] mt-1">
                Allowance can be increased or decreased at any time. Changes apply immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#2D1F23] mb-1">Payment Status</label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="waived">Waived</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2D1F23] mb-1">Subscription Status</label>
                <select
                  value={editSubStatus}
                  onChange={(e) => setEditSubStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                  <option value="depleted">Depleted</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#2D1F23] mb-1">Agreement / Invoice Reference</label>
              <input
                type="text"
                placeholder="e.g. CHAPA-TX-889912 or CONTRACT-2026-004"
                value={editAgreementRef}
                onChange={(e) => setEditAgreementRef(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2D1F23] mb-1">Reason for Adjustment (Audit Log)</label>
              <input
                type="text"
                placeholder="e.g. Organizer purchased 2 additional event credits via local transfer"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedSubForEdit(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={savingAllowance}
                onClick={handleSaveAllowance}
              >
                Save Allowance Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* MODAL: ALLOWANCE HISTORY AUDIT TRAIL */}
      {/* ============================================================= */}
      {selectedSubForHistory && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSubForHistory(null)}
          title={`Allowance History: ${selectedSubForHistory.organization}`}
        >
          <div className="space-y-4 text-xs max-h-[460px] overflow-y-auto">
            {loadingHistory ? (
              <div className="py-8 text-center text-[#756366]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#63474D] mb-1" />
                Loading audit trail...
              </div>
            ) : allowanceHistory.length === 0 ? (
              <div className="py-8 text-center text-[#756366]">
                No historical allowance modifications recorded for this organizer.
              </div>
            ) : (
              <div className="space-y-2.5">
                {allowanceHistory.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#63474D]">
                        Quota Adjusted: {hist.previousMaxEvents} → {hist.newMaxEvents} Events
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(hist.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#2D1F23]">{hist.reason || 'No description provided'}</div>
                    <div className="text-[10px] text-[#756366] flex items-center gap-1">
                      <span>Authorized by:</span>
                      <strong>{hist.changedByName || 'Administrator'}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-right">
              <Button variant="outline" size="sm" onClick={() => setSelectedSubForHistory(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* MODAL: ATTENDEE EVENT REGISTRATION HISTORY */}
      {/* ============================================================= */}
      {selectedAttendeeForHistory && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAttendeeForHistory(null)}
          title={`Event History: ${selectedAttendeeForHistory.name}`}
        >
          <div className="space-y-4 text-xs max-h-[460px] overflow-y-auto">
            <div className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-[#2D1F23]">{selectedAttendeeForHistory.name}</div>
                <div className="text-[11px] text-[#756366]">{selectedAttendeeForHistory.email}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Check-Ins</span>
                <span className="font-bold text-[#2A7B5F] text-sm">
                  {selectedAttendeeForHistory.checkInsCount} / {selectedAttendeeForHistory.registrationsCount}
                </span>
              </div>
            </div>

            {loadingAttendeeEvents ? (
              <div className="py-8 text-center text-[#756366]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#63474D] mb-1" />
                Loading registration records...
              </div>
            ) : attendeeEvents.length === 0 ? (
              <div className="py-8 text-center text-[#756366]">
                No event registrations recorded for this attendee.
              </div>
            ) : (
              <div className="space-y-2">
                {attendeeEvents.map((rec) => (
                  <div
                    key={rec.registrationId}
                    className="p-3 bg-white border border-[#E8DDD7] rounded-xl space-y-1 hover:border-[#63474D] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2D1F23] text-sm">{rec.eventTitle}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.isCheckedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {rec.isCheckedIn ? 'Checked In' : 'Registered'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#63474D] font-medium">
                      Host: {rec.organizerName} • {rec.eventDate} ({rec.eventType})
                    </div>
                    {rec.ticketCode && (
                      <div className="text-[10px] text-gray-400 font-mono">
                        Ticket Code: {rec.ticketCode} ({rec.ticketStatus || 'Valid'})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-right">
              <Button variant="outline" size="sm" onClick={() => setSelectedAttendeeForHistory(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================= */}
      {/* MODAL: EVENT ATTENDEE ROSTER */}
      {/* ============================================================= */}
      {selectedEventRoster && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEventRoster(null)}
          title={`Attendee Roster: ${selectedEventRoster.event.title}`}
        >
          <div className="space-y-4 text-xs max-h-[500px] overflow-y-auto">
            <div className="p-3 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-[#2D1F23] block">{selectedEventRoster.event.title}</span>
                <span className="text-[11px] text-[#756366]">
                  Host: {selectedEventRoster.event.organizerName} • {selectedEventRoster.event.date}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Capacity</span>
                <span className="font-bold text-[#63474D]">
                  {selectedEventRoster.event.registeredCount} / {selectedEventRoster.event.capacity}
                </span>
              </div>
            </div>

            {rosterLoading ? (
              <div className="py-8 text-center text-[#756366]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#63474D] mb-1" />
                Loading roster...
              </div>
            ) : selectedEventRoster.roster.length === 0 ? (
              <div className="py-8 text-center text-[#756366]">No attendees registered yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[#756366] text-[10px] uppercase font-bold">
                    <th className="pb-2">Attendee</th>
                    <th className="pb-2">Registered</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEventRoster.roster.map((r) => (
                    <tr key={r.id || r.registrationId}>
                      <td className="py-2.5 font-bold text-[#2D1F23]">
                        {r.name}
                        <div className="text-[11px] text-[#756366] font-normal">{r.email}</div>
                      </td>
                      <td className="py-2.5 text-gray-500">{r.registrationDate}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'Checked in'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="pt-2 text-right">
              <Button variant="outline" size="sm" onClick={() => setSelectedEventRoster(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
