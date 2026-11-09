import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Globe,
  HandCoins,
  Eye,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Building2,
  Mail,
  Phone,
  Layers,
  FileText,
  Clock,
  Sparkles,
  History,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Event } from '../../types/event';
import type { ISponsorshipApplication, IContentModerationLog } from '../../types/sponsorship';

export const AdminModerationPage: React.FC = () => {
  // Main Navigation Tabs
  const [activeTab, setActiveTab] = useState<'events' | 'pitches' | 'history'>('events');

  // Success / Error Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  // ==========================================
  // SECTION 1: PUBLICIZED EVENTS STATE
  // ==========================================
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('ALL');
  const [eventSearch, setEventSearch] = useState<string>('');
  const [previewEvent, setPreviewEvent] = useState<any | null>(null);

  // Event Takedown Modal State
  const [takedownEventTarget, setTakedownEventTarget] = useState<any | null>(null);
  const [eventTakedownReason, setEventTakedownReason] = useState<string>('');
  const [eventActionLoading, setEventActionLoading] = useState<boolean>(false);

  // Event Restore Modal State
  const [restoreEventTarget, setRestoreEventTarget] = useState<any | null>(null);
  const [eventRestoreReason, setEventRestoreReason] = useState<string>('');

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const res = await api.admin.getPublicizedEventsForModeration({
        status: eventStatusFilter,
        search: eventSearch.trim() || undefined,
        limit: 50,
      });
      setEvents(res.events || []);
    } catch (err: any) {
      console.error('Failed to load events for moderation:', err);
      showToast(err.message || 'Failed to load publicized events.', 'error');
    } finally {
      setEventsLoading(false);
    }
  };

  // ==========================================
  // SECTION 2: ORGANIZER PITCHES STATE
  // ==========================================
  const [pitches, setPitches] = useState<ISponsorshipApplication[]>([]);
  const [pitchesLoading, setPitchesLoading] = useState<boolean>(true);
  const [pitchStatusFilter, setPitchStatusFilter] = useState<string>('ALL');
  const [pitchSearch, setPitchSearch] = useState<string>('');
  const [previewPitch, setPreviewPitch] = useState<ISponsorshipApplication | null>(null);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  // Pitch Takedown Modal State
  const [takedownPitchTarget, setTakedownPitchTarget] = useState<ISponsorshipApplication | null>(null);
  const [pitchTakedownReason, setPitchTakedownReason] = useState<string>('');
  const [pitchActionLoading, setPitchActionLoading] = useState<boolean>(false);

  // Pitch Restore Modal State
  const [restorePitchTarget, setRestorePitchTarget] = useState<ISponsorshipApplication | null>(null);
  const [pitchRestoreReason, setPitchRestoreReason] = useState<string>('');

  const fetchPitches = async () => {
    try {
      setPitchesLoading(true);
      const res = await api.admin.getOrganizerPitchesForModeration({
        status: pitchStatusFilter,
        search: pitchSearch.trim() || undefined,
        limit: 50,
      });
      setPitches(res.pitches || []);
    } catch (err: any) {
      console.error('Failed to load pitches for moderation:', err);
      showToast(err.message || 'Failed to load organizer pitches.', 'error');
    } finally {
      setPitchesLoading(false);
    }
  };

  // ==========================================
  // SECTION 3: MODERATION HISTORY STATE
  // ==========================================
  const [historyLogs, setHistoryLogs] = useState<IContentModerationLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.admin.getContentModerationHistory({
        contentType: historyFilter === 'ALL' ? undefined : historyFilter,
        limit: 100,
      });
      setHistoryLogs(res || []);
    } catch (err: any) {
      console.error('Failed to load moderation history:', err);
      showToast(err.message || 'Failed to load moderation history.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initial and reactive data fetching
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    } else if (activeTab === 'pitches') {
      fetchPitches();
    } else if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, eventStatusFilter, pitchStatusFilter, historyFilter]);

  // Event Handlers
  const handleConfirmEventTakedown = async () => {
    if (!takedownEventTarget) return;
    if (!eventTakedownReason.trim() || eventTakedownReason.trim().length < 5) {
      showToast('A clear takedown reason (at least 5 characters) is required.', 'error');
      return;
    }

    try {
      setEventActionLoading(true);
      await api.admin.takedownEventPublicity(takedownEventTarget.id, eventTakedownReason.trim());
      showToast(`Event "${takedownEventTarget.title}" taken down from Community Discovery. Organizer notified.`);
      setTakedownEventTarget(null);
      setEventTakedownReason('');
      fetchEvents();
    } catch (err: any) {
      showToast(err.message || 'Failed to take down event from discovery.', 'error');
    } finally {
      setEventActionLoading(false);
    }
  };

  const handleConfirmEventRestore = async () => {
    if (!restoreEventTarget) return;
    try {
      setEventActionLoading(true);
      await api.admin.restoreEventPublicity(restoreEventTarget.id, eventRestoreReason.trim() || undefined);
      showToast(`Public discovery restored for "${restoreEventTarget.title}".`);
      setRestoreEventTarget(null);
      setEventRestoreReason('');
      fetchEvents();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore event discovery.', 'error');
    } finally {
      setEventActionLoading(false);
    }
  };

  // Pitch Handlers
  const handleConfirmPitchTakedown = async () => {
    if (!takedownPitchTarget) return;
    if (!pitchTakedownReason.trim() || pitchTakedownReason.trim().length < 5) {
      showToast('A clear reason (at least 5 characters) is required for pitch takedown.', 'error');
      return;
    }

    try {
      setPitchActionLoading(true);
      await api.admin.takedownOrganizerPitch(takedownPitchTarget.id, pitchTakedownReason.trim());
      showToast(`Sponsorship pitch "${takedownPitchTarget.event_title}" taken down. Organizer notified.`);
      setTakedownPitchTarget(null);
      setPitchTakedownReason('');
      fetchPitches();
    } catch (err: any) {
      showToast(err.message || 'Failed to take down pitch.', 'error');
    } finally {
      setPitchActionLoading(false);
    }
  };

  const handleConfirmPitchRestore = async () => {
    if (!restorePitchTarget) return;
    try {
      setPitchActionLoading(true);
      await api.admin.restoreOrganizerPitch(restorePitchTarget.id, pitchRestoreReason.trim() || undefined);
      showToast(`Sponsorship pitch "${restorePitchTarget.event_title}" reinstated to marketplace.`);
      setRestorePitchTarget(null);
      setPitchRestoreReason('');
      fetchPitches();
    } catch (err: any) {
      showToast(err.message || 'Failed to reinstate pitch.', 'error');
    } finally {
      setPitchActionLoading(false);
    }
  };

  // Safe file link helper
  const extractDeckUrls = (pitchDeckUrl?: string): string[] => {
    if (!pitchDeckUrl) return [];
    return pitchDeckUrl
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));
  };

  const handleCopyLink = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkIndex(index);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notice */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-6 z-50 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-900 border-emerald-700'
              : 'bg-red-900 border-red-700'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DDD7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold uppercase tracking-wider mb-2.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Platform Integrity & Trust
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2D1F23]">
            Content Moderation Console
          </h1>
          <p className="text-xs sm:text-sm text-[#756366] mt-1 max-w-2xl">
            Supervise publicly discoverable events and organizer sponsorship pitches. Enforce Sheeba Community Code of Conduct and take down non-compliant listings while safeguarding existing registrations and transactions.
          </p>
        </div>

        {/* Console Mode Selector */}
        <div className="flex bg-[#FAF7F5] p-1.5 rounded-2xl border border-[#E8DDD7] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Publicized Events</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pitches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pitches'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Sponsorship Pitches</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#63474D] text-white shadow-xs'
                : 'text-[#756366] hover:text-[#2D1F23]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PUBLICIZED EVENTS TAB                                         */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'All Platform Events' },
                { id: 'PUBLICIZED', label: 'Public in Discovery' },
                { id: 'MODERATED', label: 'Taken Down / Moderated' },
                { id: 'DIRECT_LINK_ONLY', label: 'Direct Share Link Only' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEventStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    eventStatusFilter === tab.id
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#756366] hover:bg-stone-100 hover:text-[#2D1F23]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchEvents();
              }}
              className="relative w-full sm:w-72"
            >
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search event title, organizer, city..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
              />
            </form>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs">
            {eventsLoading ? (
              <div className="p-12 text-center text-[#756366] space-y-3">
                <Clock className="w-8 h-8 text-[#63474D] animate-spin mx-auto" />
                <p className="text-xs font-semibold">Loading events for discovery oversight...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-[#756366] space-y-3">
                <CheckCircle2 className="w-10 h-10 text-stone-300 mx-auto" />
                <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No Events Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  No events match the selected discovery status filter or search query.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                      <th className="py-3 px-4">Event & Organizer</th>
                      <th className="py-3 px-4">Type & Date</th>
                      <th className="py-3 px-4">Turnout</th>
                      <th className="py-3 px-4">Discovery Status</th>
                      <th className="py-3 px-4 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
                    {events.map((evt) => {
                      const isPublic = Boolean(evt.is_publicized);
                      const isModerated = Boolean(evt.is_publicity_moderated);

                      return (
                        <tr key={evt.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {evt.banner_url || evt.poster_image_url ? (
                                <img
                                  src={evt.banner_url || evt.poster_image_url}
                                  alt=""
                                  className="w-10 h-10 rounded-xl object-cover border border-[#E8DDD7] shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-stone-100 border border-[#E8DDD7] flex items-center justify-center text-stone-400 shrink-0">
                                  <Globe className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-[#2D1F23] truncate max-w-xs sm:max-w-md">
                                  {evt.title}
                                </div>
                                <div className="text-[11px] text-[#756366] flex items-center gap-1.5 flex-wrap">
                                  <span>{evt.organizer_organization || evt.organizer_name}</span>
                                  <span className="text-stone-300">•</span>
                                  <span>{evt.location}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold">{evt.event_date ? new Date(evt.event_date).toLocaleDateString() : 'N/A'}</div>
                            <div className="text-[10px] text-[#756366] font-mono uppercase">{evt.event_type}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold">
                              {evt.checked_in_count || 0} / {evt.registered_count || 0}
                            </div>
                            <div className="text-[10px] text-[#756366]">Cap: {evt.capacity}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isModerated ? (
                              <div className="space-y-1">
                                <Badge variant="error">Publicity Taken Down</Badge>
                                {evt.publicity_takedown_reason && (
                                  <p className="text-[10px] text-rose-700 italic max-w-xs truncate" title={evt.publicity_takedown_reason}>
                                    "{evt.publicity_takedown_reason}"
                                  </p>
                                )}
                              </div>
                            ) : isPublic ? (
                              <Badge variant="success">Public in Community Feed</Badge>
                            ) : (
                              <Badge variant="gray">Direct Share Link Only</Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewEvent(evt)}
                                className="text-xs px-2.5 py-1 flex items-center gap-1 border-[#E8DDD7] text-[#63474D] hover:bg-[#FAF7F5]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Review
                              </Button>

                              {isModerated ? (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => setRestoreEventTarget(evt)}
                                  className="text-xs px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 font-bold"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Restore
                                </Button>
                              ) : isPublic ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setTakedownEventTarget(evt)}
                                  className="text-xs px-2.5 py-1 border-rose-300 text-rose-700 hover:bg-rose-50 flex items-center gap-1 font-bold"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  Take Down
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ORGANIZER SPONSORSHIP PITCHES TAB                             */}
      {/* ========================================================================= */}
      {activeTab === 'pitches' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'All Organizer Pitches' },
                { id: 'ACTIVE', label: 'Active in Marketplace' },
                { id: 'TAKEN_DOWN', label: 'Taken Down (Code of Conduct)' },
                { id: 'CLOSED', label: 'Closed by Organizer' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPitchStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    pitchStatusFilter === tab.id
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#756366] hover:bg-stone-100 hover:text-[#2D1F23]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPitches();
              }}
              className="relative w-full sm:w-72"
            >
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={pitchSearch}
                onChange={(e) => setPitchSearch(e.target.value)}
                placeholder="Search pitch, organizer, category..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D] focus:bg-white text-[#2D1F23]"
              />
            </form>
          </div>

          {/* Pitches Cards Grid */}
          {pitchesLoading ? (
            <div className="bg-white rounded-3xl border border-[#E8DDD7] p-12 text-center text-[#756366] space-y-3">
              <Clock className="w-8 h-8 text-[#63474D] animate-spin mx-auto" />
              <p className="text-xs font-semibold">Loading sponsorship pitches for moderation oversight...</p>
            </div>
          ) : pitches.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E8DDD7] p-12 text-center text-[#756366] space-y-3">
              <CheckCircle2 className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No Pitches Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No sponsorship pitches match the selected filter or search parameters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pitches.map((pitch) => {
                const isTakenDown = Boolean(pitch.is_taken_down);

                return (
                  <div
                    key={pitch.id}
                    className={`bg-white rounded-3xl border p-5 shadow-2xs transition-all duration-200 flex flex-col justify-between space-y-4 ${
                      isTakenDown
                        ? 'border-rose-300 bg-rose-50/20'
                        : 'border-[#E8DDD7] hover:border-[#63474D]/40'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header Tags & Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30">
                            {pitch.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-stone-100 text-stone-700">
                            {pitch.event_type}
                          </span>
                        </div>

                        {isTakenDown ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Taken Down
                          </span>
                        ) : pitch.status === 'CLOSED' ? (
                          <Badge variant="gray">Closed</Badge>
                        ) : (
                          <Badge variant="success">Active Marketplace</Badge>
                        )}
                      </div>

                      {/* Title & Organizer Info */}
                      <div>
                        <h3 className="font-serif font-bold text-base text-[#2D1F23] line-clamp-1">
                          {pitch.event_title}
                        </h3>
                        <p className="text-[11px] text-[#756366] mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-stone-400" />
                          <span>{pitch.organizer_organization || pitch.organizer_name}</span>
                        </p>
                      </div>

                      {/* Funding & Event Snapshot */}
                      <div className="grid grid-cols-2 gap-2 bg-[#FAF7F5] p-3 rounded-2xl border border-[#E8DDD7]/70 text-xs">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[#756366]">Funding Goal</p>
                          <p className="font-serif font-bold text-[#63474D]">
                            {Number(pitch.funding_goal).toLocaleString()} {pitch.currency || 'ETB'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[#756366]">Audience</p>
                          <p className="font-semibold text-[#2D1F23] truncate">
                            {pitch.expected_attendees?.toLocaleString()} Attendees
                          </p>
                        </div>
                      </div>

                      {/* Brief Description */}
                      <p className="text-xs text-[#756366] line-clamp-2 leading-relaxed">
                        "{pitch.description}"
                      </p>

                      {/* Takedown Notice box if taken down */}
                      {isTakenDown && pitch.takedown_reason && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900">
                          <p className="font-bold text-rose-800 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Code of Conduct Takedown Reason:
                          </p>
                          <p className="mt-0.5 text-rose-700 italic">"{pitch.takedown_reason}"</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-3 border-t border-[#E8DDD7] flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewPitch(pitch)}
                        className="text-xs px-2.5 py-1 flex items-center gap-1 border-[#E8DDD7] text-[#63474D] hover:bg-[#FAF7F5]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Pitch
                      </Button>

                      {isTakenDown ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setRestorePitchTarget(pitch)}
                          className="text-xs px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 font-bold"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reinstate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTakedownPitchTarget(pitch)}
                          className="text-xs px-2.5 py-1 border-rose-300 text-rose-700 hover:bg-rose-50 flex items-center gap-1 font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Take Down
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: IMMUTABLE AUDIT HISTORY TAB                                   */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E8DDD7] shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#756366] uppercase tracking-wider">Filter Log Type:</span>
              {[
                { id: 'ALL', label: 'All History' },
                { id: 'publicized_event', label: 'Event Discovery Logs' },
                { id: 'sponsorship_pitch', label: 'Pitch Moderation Logs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    historyFilter === tab.id
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'text-[#756366] hover:bg-stone-100 hover:text-[#2D1F23]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button size="sm" variant="outline" onClick={fetchHistory} className="text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
              Refresh Logs
            </Button>
          </div>

          <div className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs">
            {historyLoading ? (
              <div className="p-12 text-center text-[#756366] space-y-3">
                <Clock className="w-8 h-8 text-[#63474D] animate-spin mx-auto" />
                <p className="text-xs font-semibold">Loading permanent moderation audit logs...</p>
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="p-12 text-center text-[#756366] space-y-3">
                <CheckCircle2 className="w-10 h-10 text-stone-300 mx-auto" />
                <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No Moderation Records Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  All administrative takedowns and restorations are recorded here with immutable audit trails.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Content Type</th>
                      <th className="py-3 px-4">Affected Content</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Admin Performer</th>
                      <th className="py-3 px-4">Moderation Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
                    {historyLogs.map((log) => {
                      const isTakedown = log.action === 'takedown';

                      return (
                        <tr key={log.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#756366]">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 uppercase font-mono text-[10px]">
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                              {log.content_type === 'publicized_event' ? 'Public Event' : 'Sponsor Pitch'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold max-w-xs truncate">
                            {log.content_title || 'Untitled Item'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isTakedown ? (
                              <Badge variant="error">Takedown</Badge>
                            ) : (
                              <Badge variant="success">Restoration</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold">{log.performer_name || 'Admin'}</div>
                            <div className="text-[10px] text-[#756366]">{log.performer_email}</div>
                          </td>
                          <td className="py-3.5 px-4 max-w-sm">
                            <p className="text-xs text-[#2D1F23] whitespace-pre-wrap">{log.reason}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EVENT REVIEW & PREVIEW MATERIALS                                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!previewEvent}
        onClose={() => setPreviewEvent(null)}
        title="Event Oversight & Materials Inspection"
        maxWidth="2xl"
      >
        {previewEvent && (
          <div className="space-y-5 text-xs text-[#2D1F23]">
            {/* Header / Banner Preview */}
            {previewEvent.banner_url || previewEvent.poster_image_url ? (
              <div className="rounded-2xl overflow-hidden border border-[#E8DDD7] bg-stone-900 relative group">
                <img
                  src={previewEvent.banner_url || previewEvent.poster_image_url}
                  alt={previewEvent.title}
                  className="w-full h-48 sm:h-56 object-cover"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <a
                    href={previewEvent.banner_url || previewEvent.poster_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md backdrop-blur-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Original Asset
                  </a>
                </div>
              </div>
            ) : null}

            {/* Event Basic Details */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-[#2D1F23]">{previewEvent.title}</span>
                  <Badge variant={previewEvent.is_publicized ? 'success' : 'gray'}>
                    {previewEvent.is_publicized ? 'Public Discovery' : 'Direct Link Only'}
                  </Badge>
                </div>
                <div className="text-[11px] text-[#756366]">
                  Organizer: <strong>{previewEvent.organizer_name}</strong> ({previewEvent.organizer_organization || 'Individual'})
                </div>
                <div className="text-[11px] text-[#756366] flex items-center gap-3 pt-1">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#63474D]" />{previewEvent.organizer_email}</span>
                  {previewEvent.organizer_phone && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#63474D]" />{previewEvent.organizer_phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Event Description</label>
              <div className="p-3.5 rounded-xl bg-white border border-[#E8DDD7] text-xs leading-relaxed whitespace-pre-wrap">
                {previewEvent.description}
              </div>
            </div>

            {/* Direct Share Link & Registration Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Public Registration URL</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono text-[11px] text-[#63474D] truncate">
                    /e/{previewEvent.share_link_token}
                  </span>
                  <a
                    href={`/e/${previewEvent.share_link_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#63474D] hover:underline flex items-center gap-1 text-[11px] font-bold"
                  >
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Turnout & Capacity</p>
                <p className="font-bold text-xs text-[#2D1F23] mt-1">
                  {previewEvent.checked_in_count || 0} checked in / {previewEvent.registered_count || 0} registered (Cap: {previewEvent.capacity})
                </p>
              </div>
            </div>

            {/* Moderation Status / Actions */}
            {previewEvent.is_publicity_moderated && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                <p className="font-bold flex items-center gap-1 text-rose-800">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Public Discovery Taken Down By Administration:
                </p>
                <p className="mt-1 text-rose-700 whitespace-pre-wrap">"{previewEvent.publicity_takedown_reason}"</p>
              </div>
            )}

            <div className="pt-3 border-t border-[#E8DDD7] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewEvent(null)}>
                Close
              </Button>
              {previewEvent.is_publicity_moderated ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setRestoreEventTarget(previewEvent);
                    setPreviewEvent(null);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore to Discovery
                </Button>
              ) : previewEvent.is_publicized ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTakedownEventTarget(previewEvent);
                    setPreviewEvent(null);
                  }}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  Take Down from Discovery
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: EVENT TAKEDOWN CONFIRMATION                                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!takedownEventTarget}
        onClose={() => {
          setTakedownEventTarget(null);
          setEventTakedownReason('');
        }}
        title="Take Down Event from Community Discovery"
      >
        {takedownEventTarget && (
          <div className="space-y-4 text-xs text-[#2D1F23]">
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <p className="font-bold flex items-center gap-1 text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Administrative Action: Public Discovery Removal
              </p>
              <p className="text-[11px] leading-relaxed text-rose-700">
                Taking down <strong>"{takedownEventTarget.title}"</strong> will immediately remove it from the Sheeba community discovery feed and public listings.
              </p>
              <p className="text-[10px] text-rose-600 pt-1">
                ℹ️ The event will <em>not</em> be cancelled. Existing attendee tickets and the private direct registration link remain fully functional.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#2D1F23] flex items-center gap-1">
                Specify Reason for Takedown <span className="text-red-500">*</span>
              </label>
              <textarea
                value={eventTakedownReason}
                onChange={(e) => setEventTakedownReason(e.target.value)}
                placeholder="Explain clearly why this event does not meet community guidelines (e.g. misleading content, inappropriate material)..."
                rows={4}
                className="w-full p-2.5 text-xs bg-white border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-red-500 text-[#2D1F23]"
              />
              <p className="text-[10px] text-[#756366]">
                This reason will be recorded in the audit log and emailed to <strong>{takedownEventTarget.organizer_email}</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTakedownEventTarget(null);
                  setEventTakedownReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={eventActionLoading}
                onClick={handleConfirmEventTakedown}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Confirm Takedown & Notify
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: EVENT RESTORE CONFIRMATION                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!restoreEventTarget}
        onClose={() => {
          setRestoreEventTarget(null);
          setEventRestoreReason('');
        }}
        title="Restore Event to Public Discovery"
      >
        {restoreEventTarget && (
          <div className="space-y-4 text-xs text-[#2D1F23]">
            <p>
              Are you sure you want to restore <strong>"{restoreEventTarget.title}"</strong> to the Sheeba Community Discovery feed?
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                Restoration Note (Optional)
              </label>
              <input
                type="text"
                value={eventRestoreReason}
                onChange={(e) => setEventRestoreReason(e.target.value)}
                placeholder="e.g. Content updated and approved by administration"
                className="w-full p-2 text-xs bg-white border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRestoreEventTarget(null);
                  setEventRestoreReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={eventActionLoading}
                onClick={handleConfirmEventRestore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Restore Public Discovery
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: PITCH REVIEW & DECK INSPECTION                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!previewPitch}
        onClose={() => setPreviewPitch(null)}
        title="Organizer Sponsorship Pitch Inspection"
        maxWidth="2xl"
      >
        {previewPitch && (
          <div className="space-y-5 text-xs text-[#2D1F23]">
            {/* Header / Identity */}
            <div className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-[#2D1F23]">{previewPitch.event_title}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30">
                    {previewPitch.category}
                  </span>
                </div>
                <div className="text-[11px] text-[#756366]">
                  Organizer: <strong>{previewPitch.organizer_name}</strong> ({previewPitch.organizer_organization || 'Community Host'})
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#756366]">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#63474D]" />{previewPitch.contact_email}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-[#63474D]" />{previewPitch.contact_phone}</span>
                </div>
              </div>

              {previewPitch.is_taken_down ? (
                <Badge variant="error">Moderated / Taken Down</Badge>
              ) : (
                <Badge variant="success">Live in Marketplace</Badge>
              )}
            </div>

            {/* Pitch Overview & Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Pitch Overview</label>
              <div className="p-3.5 rounded-xl bg-white border border-[#E8DDD7] text-xs leading-relaxed whitespace-pre-wrap">
                {previewPitch.description}
              </div>
            </div>

            {/* Target Audience & Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Funding Goal</p>
                <p className="font-bold text-xs text-[#63474D] mt-1">
                  {Number(previewPitch.funding_goal).toLocaleString()} {previewPitch.currency || 'ETB'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Expected Attendees</p>
                <p className="font-bold text-xs text-[#2D1F23] mt-1">
                  {previewPitch.expected_attendees?.toLocaleString()} attendees
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E8DDD7]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Event Location</p>
                <p className="font-semibold text-xs text-[#2D1F23] mt-1 truncate">
                  {previewPitch.location}
                </p>
              </div>
            </div>

            {/* Configured Sponsorship Packages */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">Configured Packages & Perks</label>
              <div className="space-y-2">
                {previewPitch.packages && previewPitch.packages.length > 0 ? (
                  previewPitch.packages.map((pkg, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#FAF7F5] border border-[#E8DDD7] flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-xs text-[#2D1F23]">{pkg.name}</span>
                        <p className="text-[11px] text-[#756366] mt-0.5">{pkg.perks || 'No perks specified'}</p>
                      </div>
                      <span className="font-serif font-bold text-xs text-[#63474D] shrink-0">
                        {Number(pkg.amount).toLocaleString()} {previewPitch.currency || 'ETB'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-500 italic">No packages specified.</p>
                )}
              </div>
            </div>

            {/* Pitch Decks & Available Reports */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#756366] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#63474D]" />
                Event Materials, Reports & Pitch Decks
              </label>

              {extractDeckUrls(previewPitch.pitch_deck_url).length > 0 ? (
                <div className="space-y-2">
                  {extractDeckUrls(previewPitch.pitch_deck_url).map((url, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-[#E8DDD7] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#63474D] shrink-0" />
                        <span className="font-mono text-xs text-[#2D1F23] truncate max-w-sm sm:max-w-md">
                          {url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(url, idx)}
                          className="p-1.5 rounded-lg border border-[#E8DDD7] hover:bg-[#FAF7F5] text-[#63474D] transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedLinkIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-lg bg-[#63474D] hover:bg-[#523a3f] text-white text-xs font-bold inline-flex items-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Safe Preview / Open
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FAF7F5] border border-[#E8DDD7] text-xs text-[#756366] italic">
                  No pitch deck or event reports attached to this submission.
                </div>
              )}
            </div>

            {/* Takedown Notice Box if taken down */}
            {previewPitch.is_taken_down && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-rose-800">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Code of Conduct Takedown Notice:
                </p>
                <p className="text-rose-700 whitespace-pre-wrap">"{previewPitch.takedown_reason}"</p>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-3 border-t border-[#E8DDD7] flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewPitch(null)}>
                Close
              </Button>
              {previewPitch.is_taken_down ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setRestorePitchTarget(previewPitch);
                    setPreviewPitch(null);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reinstate Pitch
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTakedownPitchTarget(previewPitch);
                    setPreviewPitch(null);
                  }}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  Take Down Pitch
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: PITCH TAKEDOWN CONFIRMATION                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!takedownPitchTarget}
        onClose={() => {
          setTakedownPitchTarget(null);
          setPitchTakedownReason('');
        }}
        title="Take Down Sponsorship Pitch (Code of Conduct)"
      >
        {takedownPitchTarget && (
          <div className="space-y-4 text-xs text-[#2D1F23]">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Administrative Policy Enforcement
              </p>
              <p className="text-[11px] leading-relaxed text-rose-700">
                Taking down <strong>"{takedownPitchTarget.event_title}"</strong> will immediately remove this pitch from the Sponsor Marketplace and discovery feed. Sponsors will not be able to submit new proposals.
              </p>
              <p className="text-[10px] text-rose-600 font-medium pt-1">
                🛡️ Safeguard: Existing confirmed sponsor deals and historical financial pledges are preserved without alteration.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#2D1F23] flex items-center gap-1">
                Specify Code of Conduct / Violation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={pitchTakedownReason}
                onChange={(e) => setPitchTakedownReason(e.target.value)}
                placeholder="Explain the specific Code of Conduct or policy violation (e.g. misleading funding statements, unauthorized affiliations, improper promotional material)..."
                rows={4}
                className="w-full p-2.5 text-xs bg-white border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-red-500 text-[#2D1F23]"
              />
              <p className="text-[10px] text-[#756366]">
                This reason will be recorded in the immutable audit log and emailed to the organizer at <strong>{takedownPitchTarget.contact_email}</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTakedownPitchTarget(null);
                  setPitchTakedownReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={pitchActionLoading}
                onClick={handleConfirmPitchTakedown}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Confirm Takedown & Notify
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: PITCH REINSTATE CONFIRMATION                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!restorePitchTarget}
        onClose={() => {
          setRestorePitchTarget(null);
          setPitchRestoreReason('');
        }}
        title="Reinstate Sponsorship Pitch"
      >
        {restorePitchTarget && (
          <div className="space-y-4 text-xs text-[#2D1F23]">
            <p>
              Are you sure you want to reinstate <strong>"{restorePitchTarget.event_title}"</strong> to the Sheeba Sponsorship Marketplace? Corporate sponsors will once again be able to explore and apply to this pitch.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                Reinstatement Reason / Compliance Note (Optional)
              </label>
              <input
                type="text"
                value={pitchRestoreReason}
                onChange={(e) => setPitchRestoreReason(e.target.value)}
                placeholder="e.g. Content reviewed and verified compliant with Sheeba Code of Conduct"
                className="w-full p-2 text-xs bg-white border border-[#E8DDD7] rounded-xl focus:outline-none focus:border-[#63474D]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRestorePitchTarget(null);
                  setPitchRestoreReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={pitchActionLoading}
                onClick={handleConfirmPitchRestore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Reinstate Pitch to Marketplace
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

