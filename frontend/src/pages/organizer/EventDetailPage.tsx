import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import type { AttendeeRosterItem, BadgeCode } from '../../types/attendance';
import { Button } from '../../components/ui/Button';
import {
  Clock,
  Award,
  QrCode,
  BarChart3,
  Copy,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Image,
  UserPlus,
  User,
  AlertCircle,
  X,
} from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [roster, setRoster] = useState<AttendeeRosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search queries for both independent lists (Section 3)
  const [registeredSearch, setRegisteredSearch] = useState('');
  const [attendedSearch, setAttendedSearch] = useState('');

  // Badge award modal / action state
  const [awardingAttendee, setAwardingAttendee] = useState<AttendeeRosterItem | null>(null);
  const [selectedBadgeCode, setSelectedBadgeCode] = useState<BadgeCode>('participant');
  const [isSubmittingAward, setIsSubmittingAward] = useState(false);
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Manual Add Attendee Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', email: '', phone: '' });
  const [isSubmittingManualUser, setIsSubmittingManualUser] = useState(false);
  const [manualUserError, setManualUserError] = useState<string | null>(null);

  // Registration Answers Modal State
  const [selectedAnswersAttendee, setSelectedAnswersAttendee] = useState<AttendeeRosterItem | null>(null);

  const fetchEventData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const evt = await api.events.getById(id);
      setEvent(evt || null);
      const rosterData = await api.roster.getByEventId(id);
      setRoster(rosterData);
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const handleCopyLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.shareLinkToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Manual Attendee Creation (Walk-in check-in)
  const handleAddManualAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if (!manualForm.name.trim() || !manualForm.email.trim()) {
      setManualUserError('Please provide both full name and email address.');
      return;
    }
    setIsSubmittingManualUser(true);
    setManualUserError(null);
    try {
      await api.checkIn.addManualAttendee({
        eventId: event.id,
        name: manualForm.name.trim(),
        email: manualForm.email.trim(),
        phone: manualForm.phone.trim() || undefined,
      });

      setAwardSuccessMsg(
        `Successfully added "${manualForm.name}" as an attended participant with verified badge!`
      );
      setTimeout(() => setAwardSuccessMsg(null), 5000);
      setIsAddUserModalOpen(false);
      setManualForm({ name: '', email: '', phone: '' });
      await fetchEventData();
    } catch (err: any) {
      setManualUserError(err.message || 'Failed to add attendee.');
    } finally {
      setIsSubmittingManualUser(false);
    }
  };

  // Section 7: Shared badge-award action
  const handleAwardBadge = async () => {
    if (!event || !awardingAttendee) return;
    setIsSubmittingAward(true);
    try {
      await api.badges.awardBadge({
        eventId: event.id,
        attendeeId: awardingAttendee.attendeeId || awardingAttendee.id,
        badgeCode: selectedBadgeCode,
      });

      setAwardSuccessMsg(
        `Successfully awarded "${selectedBadgeCode.toUpperCase()}" badge to ${awardingAttendee.name}!`
      );
      setTimeout(() => setAwardSuccessMsg(null), 4000);
      setAwardingAttendee(null);
      await fetchEventData();
    } catch (err: any) {
      alert(err.message || 'Failed to award badge.');
    } finally {
      setIsSubmittingAward(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-8 bg-gray-200 rounded-xl w-48"></div>
        <div className="h-64 bg-gray-100 rounded-3xl"></div>
        <div className="h-96 bg-gray-100 rounded-3xl"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">Event Not Found</h2>
        <p className="text-xs text-gray-500">The requested event could not be located.</p>
        <Link to="/organizer">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const timeState = api.getEventTimeStatus(event);

  // Section 3: Registered list (everyone with registration row)
  const registeredList = roster.filter((item) => {
    const q = registeredSearch.toLowerCase().trim();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
  });

  // Section 3: Attended list (non-voided check-in only)
  const attendedList = roster.filter((item) => {
    const isAttended = item.status === 'Checked in' || item.badges?.includes('attended');
    if (!isAttended) return false;
    const q = attendedSearch.toLowerCase().trim();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);
  });

  const totalAttendedCount = roster.filter((r) => r.status === 'Checked in' || r.badges?.includes('attended')).length;

  return (
    <div className="w-full space-y-8 pb-24">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/organizer/check-in/${event.id}`}>
            <Button variant="accent" size="sm" icon={<QrCode className="w-4 h-4" />}>
              Door Check-in
            </Button>
          </Link>
          <Link to={`/organizer/reports/${event.id}`}>
            <Button variant="outline" size="sm" icon={<BarChart3 className="w-4 h-4" />}>
              View Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Banner */}
      {awardSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
            <span>{awardSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Event Details Section (Unboxed) */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Poster Image */}
          {event.posterImageUrl || event.bannerUrl ? (
            <img
              src={event.posterImageUrl || event.bannerUrl}
              alt={event.title}
              className="w-full md:w-64 h-44 object-cover rounded-2xl shrink-0"
            />
          ) : (
            <div className="w-full md:w-64 h-44 bg-[#FAF7F5] rounded-2xl flex items-center justify-center text-gray-400 shrink-0">
              <Image className="w-8 h-8" />
            </div>
          )}

          {/* Core Info */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#63474D]">
                {event.type}
              </span>
              <span className="text-gray-300">•</span>
              <span
                className={`font-semibold uppercase text-[11px] tracking-wider ${
                  timeState === 'ongoing'
                    ? 'text-amber-700 font-bold'
                    : timeState === 'upcoming'
                    ? 'text-emerald-700 font-bold'
                    : 'text-gray-500'
                }`}
              >
                {timeState === 'ongoing' ? 'Ongoing Today' : timeState === 'upcoming' ? 'Upcoming' : 'Past Event'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="font-bold text-[#2D1F23]">
                {event.isPaid ? `${event.ticketPrice} ETB` : 'FREE ADMISSION'}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D1F23]">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[#756366]">
              <span className="flex items-center gap-1.5">
                <img src="/calendar.webp" alt="Calendar" className="w-4 h-4 object-contain shrink-0" />
                {event.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#AA767C]" />
                {event.time || `${event.startTime} - ${event.endTime}`}
              </span>
              <span className="flex items-center gap-1.5">
                <img src="/location.webp" alt="Location" className="w-4 h-4 object-contain shrink-0" />
                {event.location} {event.venueName && `(${event.venueName})`}
              </span>
            </div>

            {/* Turnout Statistics */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Registered</span>
                <span className="font-bold text-lg text-[#2D1F23]">{event.registeredCount || roster.length}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Checked In</span>
                <span className="font-bold text-lg text-[#2A7B5F]">{totalAttendedCount}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Capacity</span>
                <span className="font-bold text-lg text-[#63474D]">{event.capacity}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <h3 className="font-serif font-bold text-sm text-[#2D1F23]">Description</h3>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {/* Public Registration Link (Brought close to the left) */}
        <div className="pt-3 border-t border-gray-100 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-[#756366] block">Public Registration Link</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-[#2D1F23] bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl select-all">
              {window.location.origin}/e/{event.shareLinkToken}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-[#2D1F23] transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <img src="/tick.webp" alt="Copied" className="w-3.5 h-3.5 object-contain shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#AA767C]" />
              )}
              <span>{copiedLink ? 'Copied' : 'link'}</span>
            </button>
            <Link
              to={`/e/${event.shareLinkToken}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#63474D] text-white rounded-xl text-xs font-semibold hover:bg-[#523a3f] transition-colors"
            >
              <span>Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Section: Attended List (Unboxed) */}
      <div className="space-y-4 pt-8 border-t border-gray-100">
        {/* Attended List Header: Heading, Search Bar in Middle, Add User Manually on Right */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="font-serif font-bold text-xl text-[#2D1F23] shrink-0">
            Attended List ({attendedList.length})
          </h2>

          <div className="w-full sm:max-w-md flex-1">
            <input
              type="text"
              placeholder="Search attended by name or email..."
              value={attendedSearch}
              onChange={(e) => setAttendedSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          <Button
            onClick={() => {
              setManualUserError(null);
              setIsAddUserModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="shrink-0"
          >
            Add User Manually
          </Button>
        </div>

        {attendedList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {roster.filter((r) => r.status === 'Checked in').length === 0
              ? 'No attendees checked in at the door yet.'
              : 'No attended records match your search filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-2">Attendee</th>
                  <th className="py-3 px-2">Check-in Time</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Current Badges</th>
                  <th className="py-3 px-2 text-right">Award Higher Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendedList.map((att) => (
                  <tr key={att.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-2">
                      <p className="font-bold text-[#2D1F23]">{att.name}</p>
                      <p className="text-[11px] text-gray-500">{att.email}</p>
                    </td>
                    <td className="py-3.5 px-2 text-gray-600 font-mono text-[11px]">
                      {att.checkInTime || 'Checked in'}
                    </td>
                    <td className="py-3.5 px-2">
                      {/* Unboxed status, NOT clickable on attended list */}
                      <span className="text-[#2A7B5F] font-semibold text-xs">
                        Checked in
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex flex-wrap gap-1.5 text-xs text-gray-700">
                        {att.badges && att.badges.length > 0 ? (
                          att.badges.map((b) => (
                            <span key={b} className="font-medium text-[#63474D]">
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">Attended</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => setAwardingAttendee(att)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#63474D] hover:bg-[#523a3f] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5 text-[#FFA686]" />
                        <span>Award Badge</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Thick separating line between Attended List and Registered List, stopping before left & right edges */}
      <div className="px-6 sm:px-12 my-10">
        <div className="h-1 bg-gray-300/90 rounded-full w-full" />
      </div>

      {/* Section: Registered List (Unboxed) */}
      <div className="space-y-4">
        {/* Registered List Header: Heading, Search Bar in Middle, Add User Manually on Right */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="font-serif font-bold text-xl text-[#2D1F23] shrink-0">
            Registered List ({registeredList.length})
          </h2>

          <div className="w-full sm:max-w-md flex-1">
            <input
              type="text"
              placeholder="Search registrants by name or email..."
              value={registeredSearch}
              onChange={(e) => setRegisteredSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
            />
          </div>

          <Button
            onClick={() => {
              setManualUserError(null);
              setIsAddUserModalOpen(true);
            }}
            variant="primary"
            size="sm"
            className="shrink-0"
          >
            Add User Manually
          </Button>
        </div>

        {registeredList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {roster.length === 0 ? 'No registrations received yet.' : 'No registrants match your search filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-2">Attendee Name & Email</th>
                  <th className="py-3 px-2">Registration Date</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Registration Answers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registeredList.map((att) => {
                  const isCheckedIn = att.status === 'Checked in' || att.badges?.includes('attended');
                  return (
                    <tr key={att.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-2">
                        <p className="font-bold text-[#2D1F23]">{att.name}</p>
                        <p className="text-[11px] text-gray-500">{att.email}</p>
                      </td>
                      <td className="py-3.5 px-2 text-gray-600 font-mono text-[11px]">
                        {att.registrationDate}
                      </td>
                      <td className="py-3.5 px-2">
                        {/* Unboxed status, CLICKABLE to view attendee answers */}
                        <button
                          type="button"
                          onClick={() => setSelectedAnswersAttendee(att)}
                          className="text-left cursor-pointer hover:underline focus:outline-none transition-colors"
                          title="Click to view answers to questions"
                        >
                          <span className={`font-semibold ${isCheckedIn ? 'text-[#2A7B5F]' : 'text-[#63474D]'}`}>
                            {isCheckedIn ? 'Checked in' : 'Registered'}
                          </span>
                        </button>
                      </td>
                      <td className="py-3.5 px-2 max-w-xs truncate text-gray-600">
                        {att.answers && Object.keys(att.answers).length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAnswersAttendee(att)}
                            className="text-left text-gray-600 hover:text-[#63474D] hover:underline truncate block max-w-xs cursor-pointer"
                            title="Click to view all answers"
                          >
                            {Object.entries(att.answers)
                              .map(([, a], qIdx) => `Q${qIdx + 1}: ${a}`)
                              .join('; ')}
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Award Badge Modal (Shared action offering Participant / Winner / Speaker) */}
      {awardingAttendee && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingAward && setAwardingAttendee(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Award Verified Badge
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {awardingAttendee.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {event.title} • Floor status: Attended (Verified)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#2D1F23] block">
                Select Higher-Tier Badge Type:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { code: 'participant' as BadgeCode, label: 'Participant', icon: '🎖️' },
                  { code: 'winner' as BadgeCode, label: 'Winner', icon: '🏆' },
                  { code: 'speaker' as BadgeCode, label: 'Speaker', icon: '🎤' },
                ].map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => setSelectedBadgeCode(b.code)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      selectedBadgeCode === b.code
                        ? 'border-[#63474D] bg-[#63474D]/10 text-[#63474D] font-bold shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <span className="text-xs">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAwardingAttendee(null)}
                disabled={isSubmittingAward}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                onClick={handleAwardBadge}
                isLoading={isSubmittingAward}
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-4 h-4" />}
              >
                Confirm & Issue Badge
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add User Modal (Name, Email, Phone -> Automatically Marked as Attended) */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingManualUser && setIsAddUserModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Walk-in Check-in
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  Add User Manually
                </h3>
                <p className="text-xs text-gray-500">
                  {event.title} • Automatically registered & marked as Attended
                </p>
              </div>
            </div>

            {manualUserError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{manualUserError}</span>
              </div>
            )}

            <form onSubmit={handleAddManualAttendee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#63474D]" />
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe Bikila"
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
                  placeholder="e.g. abebe@example.com"
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
                  placeholder="e.g. +251 91 234 5678"
                  value={manualForm.phone}
                  onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
                <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                <span>
                  Adding this attendee will instantly create their registration, record their door check-in, and award them the official <strong>Attended</strong> badge.
                </span>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  disabled={isSubmittingManualUser}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={isSubmittingManualUser}
                  variant="primary"
                  size="sm"
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Add & Mark Attended
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Answers Modal */}
      {selectedAnswersAttendee && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedAnswersAttendee(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  Registration Answers
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {selectedAnswersAttendee.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedAnswersAttendee.email} • {selectedAnswersAttendee.status || 'Registered'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnswersAttendee(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {selectedAnswersAttendee.answers && Object.keys(selectedAnswersAttendee.answers).length > 0 ? (
                Object.entries(selectedAnswersAttendee.answers).map(([questionKey, answer], idx) => {
                  const matchedQuestion = event?.customQuestions?.find((q) => q.id === questionKey);
                  const qNum = `Q${idx + 1}`;
                  const questionText = matchedQuestion?.questionText;

                  return (
                    <div key={idx} className="p-3.5 bg-[#FAF7F5] rounded-xl border border-[#E8DDD7] space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs font-bold text-[#63474D] bg-[#63474D]/10 px-1.5 py-0.5 rounded shrink-0">
                          {qNum}
                        </span>
                        {questionText && (
                          <span className="text-xs font-bold text-[#2D1F23] pt-0.5 leading-snug">
                            {questionText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#63474D] font-medium leading-relaxed pl-1">
                        {answer || <span className="italic text-gray-400">No answer provided</span>}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 space-y-1">
                  <p className="font-medium text-gray-600">No Custom Answers</p>
                  <p className="text-[11px] text-gray-400">
                    No custom questionnaire responses were required or provided during registration.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
              <Button
                onClick={() => setSelectedAnswersAttendee(null)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
