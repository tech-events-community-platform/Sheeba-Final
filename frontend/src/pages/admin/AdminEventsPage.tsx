import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types/event';
import type { ISponsorshipApplication } from '../../types/sponsorship';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

import {
  Search,
  PlusCircle,
  ShieldAlert,
  HandCoins,
  Calendar,
  Building2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';


export const AdminEventsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'pitches'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [pitches, setPitches] = useState<ISponsorshipApplication[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [pitchesLoading, setPitchesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [pitchCategoryFilter, setPitchCategoryFilter] = useState<string>('All');

  // Take-down modal state
  const [pitchToTakeDown, setPitchToTakeDown] = useState<ISponsorshipApplication | null>(null);
  const [takingDown, setTakingDown] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const data = await api.events.getAll();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load platform events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchPitches = async () => {
    try {
      setPitchesLoading(true);
      const data = await api.admin.getSponsorshipPitches();
      setPitches(data || []);
    } catch (err) {
      console.error('Failed to load sponsorship pitches:', err);
    } finally {
      setPitchesLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchPitches();
  }, []);

  const handleConfirmTakeDown = async () => {
    if (!pitchToTakeDown) return;
    try {
      setTakingDown(true);
      await api.admin.takeDownSponsorshipPitch(pitchToTakeDown.id);
      setPitches((prev) => prev.filter((p) => p.id !== pitchToTakeDown.id));
      setFeedbackMessage(`Sponsorship pitch "${pitchToTakeDown.event_title}" was successfully taken down.`);
      setPitchToTakeDown(null);
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to take down sponsorship pitch.');
    } finally {
      setTakingDown(false);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Public Discovery'
        ? Boolean(evt.isPublicized)
        : evt.status === statusFilter;
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.organizerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredPitches = pitches.filter((pitch) => {
    const matchesCategory =
      pitchCategoryFilter === 'All' || pitch.category === pitchCategoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      pitch.event_title.toLowerCase().includes(q) ||
      (pitch.organizer_name && pitch.organizer_name.toLowerCase().includes(q)) ||
      (pitch.organizer_organization && pitch.organizer_organization.toLowerCase().includes(q)) ||
      (pitch.location && pitch.location.toLowerCase().includes(q)) ||
      (pitch.category && pitch.category.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const uniquePitchCategories = Array.from(
    new Set(pitches.map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Page Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">Platform Events & Marketplace Oversight</h1>
          <p className="text-xs text-[#756366]">Manage live events and moderate sponsorship marketplace proposals across Sheeba.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/moderation">
            <Button variant="outline" icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}>
              Content Moderation
            </Button>
          </Link>
          {activeTab === 'pitches' ? (
            <button
              type="button"
              onClick={fetchPitches}
              disabled={pitchesLoading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pitchesLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Pitches</span>
            </button>
          ) : (
            <Link to="/organizer/events/create">
              <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                Create Platform Event
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs Switcher: Platform Events vs Sponsorship Pitches */}
      <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveTab('events');
            setSearchQuery('');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-white text-[#2D1F23] shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Platform Events ({events.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('pitches');
            setSearchQuery('');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'pitches'
              ? 'bg-white text-[#63474D] shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <HandCoins className="w-3.5 h-3.5" />
          <span>Sponsorship Pitches ({pitches.length})</span>
        </button>
      </div>

      {/* Success Feedback banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: Platform Events */}
      {activeTab === 'events' && (
        <div className="space-y-4">

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756366]" />
              <input
                type="text"
                placeholder="Search events by title, organizer, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', 'Public Discovery', 'open', 'completed', 'canceled'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === status
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'bg-[#FAF7F5] text-[#756366] hover:bg-[#F4EFEB]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Original Events Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                    <th className="py-3 px-4">Event Title</th>
                    <th className="py-3 px-4">Organizer</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date & Location</th>
                    <th className="py-3 px-4">Turnout</th>
                    <th className="py-3 px-4">Pricing</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-[#FAF7F5]/50">
                      <td className="py-3.5 px-4 font-bold max-w-xs truncate">
                        {evt.title}
                      </td>

                      <td className="py-3.5 px-4 text-[#AA767C] font-semibold">
                        {evt.organizerName}
                      </td>

                      <td className="py-3.5 px-4 uppercase font-mono text-[10px]">
                        <Badge variant="primary">{evt.type}</Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <p>{evt.date}</p>
                        <p className="text-[10px] text-[#756366]">
                          {evt.location.split(',')[0]}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        {evt.checkedInCount} / {evt.registeredCount}
                      </td>

                      <td className="py-3.5 px-4 font-semibold">
                        {evt.isPaid ? `${evt.ticketPrice} ETB` : 'Free'}
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <Badge variant={evt.status === 'open' ? 'success' : 'gray'}>
                          {evt.status}
                        </Badge>

                        {evt.isPublicized && (
                          <span className="block text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider w-max">
                            Discovery
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          to="/admin/moderation"
                          className="text-xs text-rose-700 font-semibold hover:underline"
                        >
                          Moderate
                        </Link>

                        <Link
                          to={`/e/${evt.shareLinkToken}`}
                          target="_blank"
                          className="text-xs text-[#63474D] font-semibold hover:underline"
                        >
                          Public Link
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#756366]">
                        No events found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}



      {/* TAB 2: Sponsorship Marketplace Pitches */}
      {activeTab === 'pitches' && (
        <div className="space-y-4">
          {/* Pitch Search & Category Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#E8DDD7] shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#756366]" />
              <input
                type="text"
                placeholder="Search pitches by event title, organizer, category, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setPitchCategoryFilter('All')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  pitchCategoryFilter === 'All'
                    ? 'bg-[#63474D] text-white shadow-xs'
                    : 'bg-[#FAF7F5] text-[#756366] hover:bg-[#F4EFEB]'
                }`}
              >
                All Categories ({pitches.length})
              </button>
              {uniquePitchCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPitchCategoryFilter(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    pitchCategoryFilter === cat
                      ? 'bg-[#63474D] text-white shadow-xs'
                      : 'bg-[#FAF7F5] text-[#756366] hover:bg-[#F4EFEB]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Pitches Table */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF7F5] border-b border-[#E8DDD7] text-[10px] font-bold uppercase tracking-wider text-[#756366]">
                    <th className="py-3 px-4">Event Pitch</th>
                    <th className="py-3 px-4">Organizer</th>
                    <th className="py-3 px-4">Category & Format</th>
                    <th className="py-3 px-4">Date & Location</th>
                    <th className="py-3 px-4">Funding Goal</th>
                    <th className="py-3 px-4">Interested Sponsors</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DDD7] text-[#2D1F23]">
                  {pitchesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading sponsorship pitches...
                      </td>
                    </tr>
                  ) : filteredPitches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500 space-y-2">
                        <p className="font-semibold text-gray-700">No active sponsorship pitches found.</p>
                        <p className="text-xs text-gray-400">
                          {pitches.length === 0
                            ? 'The marketplace is clean. When organizers publish event pitches, they will appear here.'
                            : 'No pitches match your current search/filter.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPitches.map((pitch) => (
                      <tr key={pitch.id} className="hover:bg-[#FAF7F5]/50 transition-colors">
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-gray-900 truncate">{pitch.event_title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-1">{pitch.description}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-800">{pitch.organizer_name || 'Organizer'}</p>
                          {pitch.organizer_organization && (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-[#AA767C]" />
                              <span>{pitch.organizer_organization}</span>
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFA686]/20 text-[#63474D] border border-[#FFA686]/30 mb-1">
                            {pitch.category}
                          </span>
                          <p className="text-[10px] uppercase font-mono text-gray-500">{pitch.event_type}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-800">{pitch.expected_date}</p>
                          <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{pitch.location}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#63474D]">
                            {pitch.funding_goal.toLocaleString()} {pitch.currency}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            ~{pitch.expected_attendees.toLocaleString()} guests
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-700">
                          {pitch.interested_sponsors_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <Link
                            to={`/sponsor/applications/${pitch.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPitchToTakeDown(pitch)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Take down this sponsorship pitch immediately"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Take Down</span>
                          </button>
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

      {/* Admin Take-down Confirmation Modal */}
      {pitchToTakeDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-gray-900">Take Down Sponsorship Pitch</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Are you sure you want to take down <strong className="text-gray-900">"{pitchToTakeDown.event_title}"</strong> from the Sheeba Sponsorship Marketplace?
              </p>
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                This pitch will be immediately closed and removed from the public Explore page and sponsor dashboards.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={takingDown}
                onClick={() => setPitchToTakeDown(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={takingDown}
                onClick={handleConfirmTakeDown}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {takingDown ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Taking down...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Take Down Pitch</span>
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
