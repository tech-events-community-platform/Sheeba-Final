import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types/event';
import type { AttendeeRosterItem, BadgeCode } from '../../types/attendance';
import { Button } from '../../components/ui/Button';
import {
  Award,
  CheckSquare,
  Square,
  Search,
  X,
  Users,
} from 'lucide-react';

export const BadgesPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(id || '');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [attendedAttendees, setAttendedAttendees] = useState<AttendeeRosterItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Award Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'single' | 'bulk'>('single');
  const [targetAttendee, setTargetAttendee] = useState<AttendeeRosterItem | null>(null);
  const [selectedBadgeCode, setSelectedBadgeCode] = useState<BadgeCode>('participant');
  const [isSubmittingAward, setIsSubmittingAward] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Events & Sort (Ongoing → Upcoming → Past)
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const evts = await api.events.getAll(user?.id);
        const myEvents = user?.role === 'ADMIN' ? evts : evts.filter((e) => e.organizerId === user?.id || !user?.id);

        // Section 6: Sort Ongoing first, Upcoming next, Past last
        const sorted = [...myEvents].sort((a, b) => {
          const stateA = api.getEventTimeStatus(a);
          const stateB = api.getEventTimeStatus(b);
          const stateRank = { ongoing: 1, upcoming: 2, past: 3 };
          if (stateRank[stateA] !== stateRank[stateB]) {
            return stateRank[stateA] - stateRank[stateB];
          }
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (stateA === 'upcoming') return dateA - dateB;
          if (stateA === 'past') return dateB - dateA;
          return dateA - dateB;
        });

        setEvents(sorted);

        if (id) {
          setSelectedEventId(id);
        } else if (sorted.length > 0) {
          setSelectedEventId(sorted[0].id);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [id, user?.id, user?.role]);

  // 2. Load only attendees who hold an Attended badge for the selected event (Section 6)
  const loadAttendedHolders = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const evt = await api.events.getById(eventId);
      setCurrentEvent(evt || null);
      const holders = await api.badges.getAttendedHolders(eventId);
      setAttendedAttendees(holders);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load attended holders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadAttendedHolders(selectedEventId);
    }
  }, [selectedEventId]);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    navigate(`/organizer/badges/${eventId}`);
  };

  // Checkbox Selection
  const toggleSelectAttendee = (attendeeId: string) => {
    setSelectedIds((prev) =>
      prev.includes(attendeeId) ? prev.filter((i) => i !== attendeeId) : [...prev, attendeeId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredHolders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHolders.map((h) => h.attendeeId || h.id));
    }
  };

  // Open Award Modal for Single Attendee
  const openSingleAwardModal = (attendee: AttendeeRosterItem) => {
    setTargetAttendee(attendee);
    setModalMode('single');
    // Default to a badge they don't already have
    const held = attendee.badges || [];
    if (!held.includes('participant')) setSelectedBadgeCode('participant');
    else if (!held.includes('winner')) setSelectedBadgeCode('winner');
    else if (!held.includes('speaker')) setSelectedBadgeCode('speaker');
    else setSelectedBadgeCode('participant');
    setIsModalOpen(true);
  };

  // Open Award Modal for Bulk Selection
  const openBulkAwardModal = () => {
    if (selectedIds.length === 0) return;
    setTargetAttendee(null);
    setModalMode('bulk');
    setSelectedBadgeCode('participant');
    setIsModalOpen(true);
  };

  // Shared Award Badge Submission (Section 7: calls shared endpoint)
  const handleConfirmAward = async () => {
    if (!selectedEventId) return;
    setIsSubmittingAward(true);

    try {
      if (modalMode === 'single' && targetAttendee) {
        await api.badges.awardBadge({
          eventId: selectedEventId,
          attendeeId: targetAttendee.attendeeId || targetAttendee.id,
          badgeCode: selectedBadgeCode,
        });
        setSuccessToast(
          `Awarded "${selectedBadgeCode.toUpperCase()}" badge to ${targetAttendee.name}.`
        );
      } else if (modalMode === 'bulk') {
        await api.badges.bulkAwardBadges({
          eventId: selectedEventId,
          attendeeRosterIds: selectedIds,
          badgeCode: selectedBadgeCode,
          awardedByOrganizerId: user?.id || 'current',
        });
        setSuccessToast(
          `Awarded "${selectedBadgeCode.toUpperCase()}" badge to ${selectedIds.length} verified attendees.`
        );
        setSelectedIds([]);
      }

      setIsModalOpen(false);
      await loadAttendedHolders(selectedEventId);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to award badge.');
    } finally {
      setIsSubmittingAward(false);
    }
  };

  const filteredHolders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return attendedAttendees;
    return attendedAttendees.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    );
  }, [attendedAttendees, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header & Event Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#63474D] block mb-0.5">
            Badge Issuance
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">
            Approve Badges
          </h1>
        </div>

        {events.length > 0 && (
          <div className="min-w-64">
            <label className="text-sm font-extrabold uppercase tracking-wider text-[#2D1F23] block mb-1">
              SELECT EVENT
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

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <img src="/tick.webp" alt="Success" className="w-4 h-4 object-contain shrink-0" />
            <span>{successToast}</span>
          </div>
          <button type="button" onClick={() => setSuccessToast(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Event Context Header */}
      {currentEvent && (
        <div className="bg-[#63474D] text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-bold text-white truncate max-w-lg">
              {currentEvent.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#E8DDD7]">
              <span className="flex items-center gap-1">
                <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain shrink-0" />
                {currentEvent.date}
              </span>
              <span className="flex items-center gap-1">
                <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                {currentEvent.location}
              </span>
            </div>
          </div>

          {/* Verified Attendees and Count by themselves without any rectangular box */}
          <div className="text-center sm:text-right shrink-0">
            <span className="text-[11px] font-bold uppercase text-[#FFA686] block tracking-wider">
              Verified Attendees
            </span>
            <span className="text-2xl font-serif font-black text-white">
              {attendedAttendees.length}
            </span>
          </div>
        </div>
      )}

      {/* Action Toolbar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search attended people by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
          />
        </div>

        {/* Bulk Action Control */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              onClick={openBulkAwardModal}
              variant="accent"
              size="sm"
              icon={<Award className="w-4 h-4" />}
            >
              Approve Badges ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Attended Holders List (Only attendees who attended) */}
      <div className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        ) : filteredHolders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-serif font-bold text-base text-[#2D1F23]">No Attended Attendees Found</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Only people who attended this event (marked attended at the door or scanned via QR) appear here to be approved for badges.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F5] border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 text-gray-500 hover:text-[#63474D] cursor-pointer"
                    >
                      {selectedIds.length === filteredHolders.length && filteredHolders.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#63474D]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Attended Person</th>
                  <th className="py-3 px-4">Held Badges</th>
                  <th className="py-3 px-4 text-right">Approve Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHolders.map((att) => {
                  const attendeeId = att.attendeeId || att.id;
                  const isSelected = selectedIds.includes(attendeeId);
                  const heldBadges = att.badges || ['attended'];

                  return (
                    <tr
                      key={att.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectAttendee(attendeeId)}
                          className="p-1 text-gray-500 hover:text-[#63474D] cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#63474D]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#2D1F23]">{att.name}</p>
                        <p className="text-[11px] text-gray-500">{att.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {/* Attended Floor Badge */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <img src="/tick.webp" alt="Attended" className="w-3 h-3 object-contain" />
                            Attended
                          </span>

                          {/* Higher Badges */}
                          {heldBadges.includes('participant') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                              Participant
                            </span>
                          )}
                          {heldBadges.includes('winner') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              Winner
                            </span>
                          )}
                          {heldBadges.includes('speaker') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                              Speaker
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openSingleAwardModal(att)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#63474D] hover:bg-[#523a3f] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5 text-[#FFA686]" />
                          <span>Approve a badge</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Badge Modal (Fixed Set: Winner, Participant, Speaker) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isSubmittingAward && setIsModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D]">
                  {modalMode === 'bulk' ? `Bulk Approve (${selectedIds.length} Attendees)` : 'Approve Badge'}
                </span>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
                  {modalMode === 'bulk' ? `${selectedIds.length} Selected Attendees` : targetAttendee?.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {currentEvent?.title}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#2D1F23] block">
                Choose Badge Type to Approve:
              </label>
              <div className="flex flex-col gap-3">
                {[
                  {
                    code: 'winner' as BadgeCode,
                    label: 'Winner',
                    image: '/badges/hackathon-winner-badge.webp',
                    description: 'Awarded for podium placement and competitive track achievements.',
                  },
                  {
                    code: 'participant' as BadgeCode,
                    label: 'Participant',
                    image: '/badges/participant-badge.webp',
                    description: 'Awarded for active project submission and verified participation.',
                  },
                  {
                    code: 'speaker' as BadgeCode,
                    label: 'Speaker',
                    image: '/badges/speaker-badge.webp',
                    description: 'Awarded to keynote speakers, workshop hosts, and mentors.',
                  },
                ].map((b) => {
                  const isSelected = selectedBadgeCode === b.code;
                  return (
                    <div
                      key={b.code}
                      onClick={() => setSelectedBadgeCode(b.code)}
                      className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#FAF7F5] border-2 border-[#63474D]'
                          : 'border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Badge Image - Unboxed with no rectangle background behind it, taking vertical space */}
                      <img
                        src={b.image}
                        alt={`${b.label} Badge`}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl shrink-0"
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-base text-[#2D1F23]">
                            {b.label}
                          </h4>
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#63474D] bg-[#63474D]/10 px-2 py-0.5 rounded-md">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 leading-snug">
                          {b.description}
                        </p>
                      </div>

                      {/* Radio Indicator */}
                      <div className="shrink-0 pr-1">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#63474D] bg-[#63474D]'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmittingAward}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                onClick={handleConfirmAward}
                isLoading={isSubmittingAward}
                variant="primary"
                size="sm"
              >
                Confirm & Approve Badge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
