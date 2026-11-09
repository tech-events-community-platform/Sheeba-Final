import React, { useEffect, useState } from 'react';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ClipboardEdit,
  AlertCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ISponsorEventItem, ISponsorCheckedInAttendeeItem } from '../../types/sponsorship';
import { SponsorRecordAttendeeModal } from './SponsorRecordAttendeeModal';
import { SponsorQuestionnaireBuilderModal } from './SponsorQuestionnaireBuilderModal';

interface SponsorCheckedInAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventItem: ISponsorEventItem | null;
  onRecordAttendee?: (attendee: ISponsorCheckedInAttendeeItem) => void;
}

export const SponsorCheckedInAttendeesModal: React.FC<SponsorCheckedInAttendeesModalProps> = ({
  isOpen,
  onClose,
  eventItem,
  onRecordAttendee,
}) => {
  const [attendees, setAttendees] = useState<ISponsorCheckedInAttendeeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Phase 3 Modal States
  const [selectedAttendeeForRecording, setSelectedAttendeeForRecording] =
    useState<ISponsorCheckedInAttendeeItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isQuestionnaireBuilderOpen, setIsQuestionnaireBuilderOpen] = useState(false);

  const loadAttendees = async (isManualRefresh = false) => {
    if (!eventItem) return;
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await api.sponsorship.getSponsorCheckedInAttendees(eventItem.deal_id);
      setAttendees(data.attendees || []);
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to load checked-in attendees. Please verify attendee-sharing permissions with the organizer.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && eventItem) {
      loadAttendees();
      setSearchTerm('');
    } else {
      setAttendees([]);
      setError(null);
    }
  }, [isOpen, eventItem?.deal_id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !eventItem) return null;

  const filteredAttendees = attendees.filter((a) =>
    a.attendee_name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] z-10">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#2D1F23] to-[#402A30] text-white flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-white/10 text-[#FFA686]">
                <Users className="w-5 h-5" />
              </span>
              <h3 className="font-serif font-bold text-lg text-white">Checked-In Attendees</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {attendees.length} Verified
              </span>
            </div>
            <p className="text-xs text-stone-300 truncate max-w-md">
              {eventItem.event_title}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQuestionnaireBuilderOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Customize survey questions for attendees"
            >
              <Sliders className="w-3.5 h-3.5 text-[#FFA686]" />
              <span className="hidden sm:inline">Questionnaire</span>
            </button>
            <button
              type="button"
              disabled={refreshing || loading}
              onClick={() => loadAttendees(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Refresh attendee list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 py-3 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 leading-relaxed">
            <strong className="font-semibold">Privacy Notice:</strong> In accordance with Sheeba's data minimization and privacy standards, only attendees who have genuinely checked in at the door are shown. Names are provided strictly for agreed on-site engagement. Contact details, payment info, and unverified registrations remain private.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search checked-in attendee by name..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#AA767C]"
            />
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-stone-500 hover:text-stone-800 font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-500">Retrieving checked-in attendee roster...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          ) : attendees.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-stone-800">No checked-in attendees yet</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Attendee names will automatically appear here as participants check in at the event venue. Unchecked registrations are kept confidential.
              </p>
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs text-stone-500">
                No checked-in attendees match "<strong className="text-stone-800">{searchTerm}</strong>".
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-[#AA767C] font-semibold underline cursor-pointer"
              >
                Reset search filter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {filteredAttendees.map((attendee) => (
                <div
                  key={attendee.attendee_id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#63474D]/20 to-[#FFA686]/30 text-[#63474D] font-bold text-xs flex items-center justify-center shrink-0">
                      {attendee.attendee_name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {attendee.attendee_name}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-medium">Verified check-in</span>
                        </span>
                        {attendee.checked_in_at && (
                          <span className="flex items-center gap-1 text-stone-400">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(attendee.checked_in_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Record Button & Status Badge (Phase 3) */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {attendee.is_recorded || attendee.record_status === 'RECORDED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Recorded ✓</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-500">
                        Not Recorded
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAttendeeForRecording(attendee);
                        setIsRecordModalOpen(true);
                        if (onRecordAttendee) onRecordAttendee(attendee);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                        attendee.is_recorded || attendee.record_status === 'RECORDED'
                          ? 'bg-stone-900 hover:bg-black text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title="Record questionnaire responses for this attendee"
                    >
                      <ClipboardEdit className="w-3.5 h-3.5" />
                      <span>
                        {attendee.is_recorded || attendee.record_status === 'RECORDED'
                          ? 'Edit Record'
                          : 'Record'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing <strong className="text-stone-800">{filteredAttendees.length}</strong> of{' '}
            <strong className="text-stone-800">{attendees.length}</strong> checked-in attendees
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Record Attendee Questionnaire Modal */}
      <SponsorRecordAttendeeModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setSelectedAttendeeForRecording(null);
        }}
        dealId={eventItem.deal_id}
        eventTitle={eventItem.event_title}
        attendee={selectedAttendeeForRecording}
        onRecordedSuccess={(attendeeId) => {
          setAttendees((prev) =>
            prev.map((a) =>
              a.attendee_id === attendeeId
                ? { ...a, is_recorded: true, record_status: 'RECORDED' }
                : a
            )
          );
        }}
      />

      {/* Questionnaire Builder Modal */}
      <SponsorQuestionnaireBuilderModal
        isOpen={isQuestionnaireBuilderOpen}
        onClose={() => setIsQuestionnaireBuilderOpen(false)}
        dealId={eventItem.deal_id}
        eventTitle={eventItem.event_title}
        onSaved={() => {
          loadAttendees(true);
        }}
      />
    </div>
  );
};

