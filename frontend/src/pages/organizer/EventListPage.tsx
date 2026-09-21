import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EventDetailModal } from '../../components/organizer/EventDetailModal';
import {
  Search,
  PlusCircle,
  QrCode,
  BarChart3,
  Award,
  Copy,
  Trash2,
  AlertTriangle,
  X,
  ShieldAlert,
} from 'lucide-react';

export const EventListPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedModalEvent, setSelectedModalEvent] = useState<Event | null>(null);

  // Delete confirmation state
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const data = await api.events.getAll(user?.id);
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [user?.id]);

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/e/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenDeleteModal = (evt: Event, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEventToDelete(evt);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      await api.events.delete(eventToDelete.id);
      setDeleteSuccessMsg(`"${eventToDelete.title}" has been permanently deleted.`);
      setTimeout(() => setDeleteSuccessMsg(null), 5000);
      setEventToDelete(null);
      await fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesStatus = statusFilter === 'All' || evt.status === statusFilter;
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Banner Message */}
      {deleteSuccessMsg && (
        <div className="bg-[#2A7B5F]/10 border border-[#2A7B5F]/30 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold text-[#2A7B5F] animate-fade-in">
          <span>{deleteSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setDeleteSuccessMsg(null)}
            className="p-1 hover:bg-[#2A7B5F]/20 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">My Events</h1>
          <p className="text-xs text-gray-500 font-light">
            Overview of your single-day events, share links, and check-in rosters. Click any card to inspect full details.
          </p>
        </div>
        <Link to="/organizer/events/create">
          <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
            Create New Event
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {['All', 'open', 'completed', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#63474D] text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'open' ? 'Active' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cards */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl"></div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 space-y-3 shadow-2xs">
          <img src="/calendar.webp" alt="Calendar" className="w-10 h-10 object-contain mx-auto" />
          <h3 className="font-serif text-base font-bold text-[#2D1F23]">No events found</h3>
          <p className="text-xs text-gray-500 font-light">Set up registration, door QR scanner, and sponsor reports.</p>
          <Link to="/organizer/events/create">
            <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
              Create Event Now
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => setSelectedModalEvent(evt)}
              className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs hover:border-[#63474D] hover:shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" className="uppercase font-mono text-[10px]">
                    {evt.type}
                  </Badge>
                  <Badge variant={evt.status === 'open' ? 'success' : 'gray'}>
                    {evt.status === 'open' ? 'Active Registration' : evt.status}
                  </Badge>
                  <span className="text-xs font-bold text-[#63474D]">
                    {evt.isPaid ? `${evt.ticketPrice} ETB` : 'FREE'}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#2D1F23] group-hover:text-[#63474D] transition-colors truncate">
                  {evt.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-light">
                  <span className="flex items-center gap-1">
                    <img src="/calendar.webp" alt="Calendar" className="w-3.5 h-3.5 object-contain shrink-0" />
                    {evt.date} • {evt.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <img src="/location.webp" alt="Location" className="w-3.5 h-3.5 object-contain shrink-0" />
                    {evt.location}
                  </span>
                </div>
              </div>

              {/* Counts & Actions */}
              <div
                className="flex flex-wrap items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 text-xs pr-2">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Registered</span>
                    <span className="font-bold text-[#2D1F23]">
                      {evt.registeredCount} / {evt.capacity}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Checked In</span>
                    <span className="font-bold text-[#2A7B5F]">{evt.checkedInCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(evt.shareLinkToken, e)}
                    className="p-2 text-gray-500 hover:text-[#63474D] hover:bg-gray-100 rounded-xl transition-colors"
                    title="Copy Registration Link"
                  >
                    {copiedId === evt.shareLinkToken ? (
                      <img src="/tick.webp" alt="Copied" className="w-4 h-4 object-contain shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <Link to={`/organizer/events/${evt.id}/scanner`}>
                    <Button variant="accent" size="sm" icon={<QrCode className="w-3.5 h-3.5" />}>
                      Scanner
                    </Button>
                  </Link>
                  <Link to={`/organizer/events/${evt.id}/attendees`}>
                    <Button variant="outline" size="sm" icon={<Award className="w-3.5 h-3.5 text-[#AA767C]" />}>
                      Badges
                    </Button>
                  </Link>
                  <Link to={`/organizer/reports/${evt.id}`}>
                    <Button variant="outline" size="sm" icon={<BarChart3 className="w-3.5 h-3.5 text-[#AA767C]" />}>
                      Report
                    </Button>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => handleOpenDeleteModal(evt, e)}
                    className="p-2 text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent rounded-xl transition-all cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comprehensive Event Details Modal */}
      <EventDetailModal
        event={selectedModalEvent}
        isOpen={!!selectedModalEvent}
        onClose={() => setSelectedModalEvent(null)}
        onDeleteClick={(evt) => handleOpenDeleteModal(evt)}
      />

      {/* Event Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => !isDeleting && setEventToDelete(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 z-10 space-y-6 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-xl font-bold text-[#2D1F23]">Delete Event</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-[#2D1F23]">"{eventToDelete.title}"</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-left space-y-1 text-xs text-red-800">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Important Notice:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-red-700">
                  This will permanently delete this event, its public registration link, all{' '}
                  <strong>{eventToDelete.registeredCount} attendee passes</strong>, and associated verification records. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Event</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
