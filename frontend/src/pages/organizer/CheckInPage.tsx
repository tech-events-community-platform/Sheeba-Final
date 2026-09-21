import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
import type { AttendeeRosterItem } from '../../types/attendance';
import { Badge } from '../../components/ui/Badge';
import {
  Search,
  RotateCcw,
  Users,
  Clock,
  X,
  UserPlus,
  User as UserIcon,
  AlertCircle,
  Camera,
  Calendar,
  MapPin,
} from 'lucide-react';

export const CheckInPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(id || '');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [roster, setRoster] = useState<AttendeeRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Add Attendee State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', email: '', phone: '' });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Processing state for individual attendees
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [lastActionToast, setLastActionToast] = useState<{
    type: 'checkin' | 'undo';
    name: string;
    attendeeId: string;
  } | null>(null);

  // Note Modal State for Mark Attended
  const [noteModalAttendee, setNoteModalAttendee] = useState<AttendeeRosterItem | null>(null);
  const [organizerNoteInput, setOrganizerNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Events and auto-select default (Ongoing first, then nearest upcoming)
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const evts = await api.events.getAll(user?.id);
        const myEvents = user?.role === 'ADMIN' ? evts : evts.filter((e) => e.organizerId === user?.id || !user?.id);
        setEvents(myEvents);

        if (id) {
          setSelectedEventId(id);
        } else if (myEvents.length > 0) {
          // Section 4: Default into whichever event is currently ongoing (per date-derived logic)
          // If no event is ongoing, fall back to the nearest upcoming one
          const ongoing = myEvents.find((e) => api.getEventTimeStatus(e) === 'ongoing');
          if (ongoing) {
            setSelectedEventId(ongoing.id);
          } else {
            const upcoming = myEvents
              .filter((e) => api.getEventTimeStatus(e) === 'upcoming')
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (upcoming.length > 0) {
              setSelectedEventId(upcoming[0].id);
            } else {
              setSelectedEventId(myEvents[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load events for check-in:', err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [id, user?.id, user?.role]);

  // 2. Load Roster for Selected Event
  const loadRoster = async (eventId: string) => {
    if (!eventId) return;
    try {
      const evt = await api.events.getById(eventId);
      setCurrentEvent(evt || null);
      const items = await api.roster.getByEventId(eventId);
      setRoster(items);
    } catch (err) {
      console.error('Failed to load roster:', err);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadRoster(selectedEventId);
    }
  }, [selectedEventId]);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    navigate(`/organizer/check-in/${eventId}`);
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Section 4: Mark Attended (Single atomic write on backend: CheckIn + Attended BadgeAward)
  const handleMarkAttended = async (attendee: AttendeeRosterItem, note?: string) => {
    if (!selectedEventId) return;
    setActionInProgressId(attendee.attendeeId || attendee.id);

    // Optimistic UI update
    setRoster((prev) =>
      prev.map((r) =>
        r.id === attendee.id || r.attendeeId === attendee.attendeeId
          ? {
            ...r,
            status: 'Checked in',
            checkInTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' EAT',
            badges: r.badges?.includes('attended') ? r.badges : [...(r.badges || []), 'attended'],
          }
          : r
      )
    );

    try {
      await api.checkIn.markAttended({
        eventId: selectedEventId,
        attendeeId: attendee.attendeeId || attendee.id,
        notes: note,
      });

      setLastActionToast({
        type: 'checkin',
        name: attendee.name,
        attendeeId: attendee.attendeeId || attendee.id,
      });
      setTimeout(() => setLastActionToast(null), 5000);
    } catch (err: any) {
      console.error('Mark attended error:', err);
      alert(err.message || 'Failed to mark attended. Reverting.');
      loadRoster(selectedEventId);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Section 4: Undo Action (Soft-voids CheckIn + Revokes Attended badge)
  const handleUndoCheckIn = async (attendee: AttendeeRosterItem) => {
    if (!selectedEventId) return;
    setActionInProgressId(attendee.attendeeId || attendee.id);

    // Optimistic UI update
    setRoster((prev) =>
      prev.map((r) =>
        r.id === attendee.id || r.attendeeId === attendee.attendeeId
          ? {
            ...r,
            status: 'Registered',
            checkInTime: undefined,
            badges: (r.badges || []).filter((b) => b !== 'attended'),
          }
          : r
      )
    );

    try {
      await api.checkIn.undo({
        eventId: selectedEventId,
        attendeeId: attendee.attendeeId || attendee.id,
      });

      setLastActionToast({
        type: 'undo',
        name: attendee.name,
        attendeeId: attendee.attendeeId || attendee.id,
      });
      setTimeout(() => setLastActionToast(null), 5000);
    } catch (err: any) {
      console.error('Undo error:', err);
      alert(err.message || 'Failed to undo check-in.');
      loadRoster(selectedEventId);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Manual Add Attendee Handler
  const handleAddManualAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    if (!manualForm.name.trim() || !manualForm.email.trim()) {
      setManualError('Please provide both full name and email address.');
      return;
    }
    setIsSubmittingManual(true);
    setManualError(null);
    try {
      await api.checkIn.addManualAttendee({
        eventId: selectedEventId,
        name: manualForm.name.trim(),
        email: manualForm.email.trim(),
        phone: manualForm.phone.trim() || undefined,
      });

      setLastActionToast({
        type: 'checkin',
        name: manualForm.name,
        attendeeId: 'manual',
      });
      setIsAddModalOpen(false);
      setManualForm({ name: '', email: '', phone: '' });
      await loadRoster(selectedEventId);
    } catch (err: any) {
      setManualError(err.message || 'Failed to add attendee.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Live client-side name search (Section 4)
  const filteredRoster = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return roster;
    return roster.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.registrationId && r.registrationId.toLowerCase().includes(q))
    );
  }, [roster, searchQuery]);

  const checkedInCount = roster.filter((r) => r.status === 'Checked in' || r.badges?.includes('attended')).length;
  const totalCount = roster.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header & Event Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
              Door Duty Screen
            </span>
            <Badge variant="primary" className="text-[10px]">
              Built for Speed
            </Badge>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
            Check-In Console
          </h1>
        </div>

        {/* Action Button & Event Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setManualError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#63474D] hover:bg-[#523a3f] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#FFA686]" />
            <span>+ Add User Manually</span>
          </button>

          {events.length > 0 && (
            <div className="relative min-w-64">
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                Active Door Event:
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs font-bold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] cursor-pointer"
              >
                {events.map((e) => {
                  const status = api.getEventTimeStatus(e);
                  return (
                    <option key={e.id} value={e.id}>
                      {status === 'ongoing' ? '🔴 [ONGOING] ' : status === 'upcoming' ? '⏳ [UPCOMING] ' : '📁 [PAST] '}
                      {e.title} ({e.date})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Selected Event Context Bar */}
      {currentEvent && (() => {
        const timeState = api.getEventTimeStatus(currentEvent);
        return (
          <div className="bg-[#63474D] text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-lg font-bold text-white truncate max-w-lg block">
                  {currentEvent.title}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${timeState === 'ongoing'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                    : timeState === 'upcoming'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                >
                  {timeState === 'ongoing'
                    ? '● Live Today — Check-in Active'
                    : timeState === 'upcoming'
                      ? `⏳ Scheduled for ${currentEvent.date}`
                      : `📁 Past Event (${currentEvent.date})`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#E8DDD7]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#FFA686]" />
                  Event Date: {currentEvent.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#FFA686]" />
                  {currentEvent.time || `${currentEvent.startTime} - ${currentEvent.endTime}`}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FFA686]" />
                  {currentEvent.location}
                </span>
              </div>
            </div>

            {/* Live QR Scanner Link & Turnout Ticker */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={`/organizer/events/${currentEvent.id}/scanner`}
                className="inline-flex items-center gap-2 bg-[#F45866] hover:bg-[#e04553] text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-md transition-all shrink-0 hover:scale-105"
              >
                <Camera className="w-4 h-4" />
                <span>Open QR Scanner</span>
              </Link>

              <div className="bg-white/10 px-5 py-2.5 rounded-2xl border border-white/20 text-center shrink-0">
                <span className="text-[10px] font-bold uppercase text-[#FFA686] block tracking-wider">
                  Door Turnout ({currentEvent.date})
                </span>
                <span className="text-xl font-serif font-black text-white">
                  {checkedInCount} <span className="text-xs font-normal text-[#E8DDD7]">/ {totalCount}</span>
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Action Toast Banner */}
      {lastActionToast && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in ${lastActionToast.type === 'checkin'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
        >
          <div className="flex items-center gap-2">
            <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
            <span>
              {lastActionToast.type === 'checkin'
                ? `✓ Marked "${lastActionToast.name}" Attended for event date (${currentEvent?.date || 'Today'}) & issued verified badge.`
                : `↩ Reverted check-in for "${lastActionToast.name}".`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastActionToast(null)}
            className="p-1 hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Large Live Name Search Bar (Section 4) */}
      <div className="relative">
        <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          autoFocus
          placeholder="Type attendee name or email to filter live..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-13 pr-10 py-3.5 bg-white border-2 border-gray-300 focus:border-[#63474D] rounded-2xl text-base font-medium text-[#2D1F23] focus:outline-none shadow-sm transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Registered Attendees Door List (Section 4) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
          <span>Showing {filteredRoster.length} attendee{filteredRoster.length === 1 ? '' : 's'}</span>
          <span>Click &quot;Mark Attended&quot; upon arrival</span>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-2xl"></div>
            ))}
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] text-center space-y-3">
            <Users className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-[#2D1F23]">No matching attendees found</p>
            <p className="text-xs text-gray-500">
              {searchQuery ? `No registrant matches "${searchQuery}".` : 'No registrants found for this event.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRoster.map((att) => {
              const isCheckedIn = att.status === 'Checked in' || att.badges?.includes('attended');
              const isBusy = actionInProgressId === (att.attendeeId || att.id);

              return (
                <div
                  key={att.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCheckedIn
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
                    }`}
                >
                  {/* Attendee Info */}
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-base text-[#2D1F23] truncate">
                        {att.name}
                      </h3>
                      {isCheckedIn && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2A7B5F] bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          <img src="/tick.webp" alt="Attended" className="w-3.5 h-3.5 object-contain" />
                          Attended
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{att.email}</span>
                      {att.checkInTime && (
                        <span className="font-mono text-[#2A7B5F] font-semibold">
                          • Checked in: {att.checkInTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Single Speed Action: "Mark Attended" or "Undo" */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isCheckedIn ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setOrganizerNoteInput('');
                          setNoteModalAttendee(att);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#2A7B5F] hover:bg-[#236850] active:scale-98 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <img src="/tick.webp" alt="Check In" className="w-4 h-4 object-contain" />
                        <span>{isBusy ? 'Checking in...' : 'Mark Attended'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleUndoCheckIn(att)}
                          className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-gray-600 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Undo check-in mis-click"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-gray-400 hover:text-red-600" />
                          <span>{isBusy ? 'Undoing...' : 'Undo'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Add User Modal (Walk-in door check-in) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingManual && setIsAddModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Walk-in Door Registration
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  Add User Manually
                </h3>
                <p className="text-xs text-gray-500">
                  {currentEvent?.title} • Instantly registers and marks attendee as Attended
                </p>
              </div>
            </div>

            {manualError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleAddManualAttendee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#63474D]" />
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liya Kebede"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <img src="/mail-icon.webp" alt="Email" className="w-3.5 h-3.5 object-contain" />
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. liya@example.com"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <img src="/phone-icon.webp" alt="Phone" className="w-3.5 h-3.5 object-contain" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +251 91 111 2233"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
                <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                <span>
                  Adding this attendee will immediately create their ticket and grant their verified <strong>Attended</strong> badge.
                </span>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingManual}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-4 py-2 rounded-xl bg-[#63474D] hover:bg-[#523a3f] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingManual ? 'Adding...' : 'Add & Mark Attended'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Prompt Modal on Mark Attended */}
      {noteModalAttendee && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingNote && setNoteModalAttendee(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2A7B5F]">
                  Attendance Verification
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  Mark Attended
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confirm attendance for <strong className="text-[#2D1F23]">{noteModalAttendee.name}</strong> ({noteModalAttendee.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingNote && setNoteModalAttendee(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1.5">
                  Organizer's Note <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Participated actively in the design sprint, contributed insightful ideas..."
                  value={organizerNoteInput}
                  onChange={(e) => setOrganizerNoteInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  This note will be permanently attached to the attendee's badge credential page.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingNote}
                onClick={() => setNoteModalAttendee(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingNote}
                onClick={async () => {
                  setIsSubmittingNote(true);
                  try {
                    await handleMarkAttended(noteModalAttendee, organizerNoteInput.trim() || undefined);
                    setNoteModalAttendee(null);
                  } finally {
                    setIsSubmittingNote(false);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#2A7B5F] hover:bg-[#236850] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <img src="/tick.webp" alt="Confirm" className="w-4 h-4 object-contain" />
                <span>{isSubmittingNote ? 'Marking...' : 'Mark Attended'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
