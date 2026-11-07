import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Calendar,
  MapPin,
  Building2,
  ClipboardEdit,
  Sliders,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  ISponsorEventItem,
  ISponsorCheckedInAttendeeItem,
  ISponsorQuestionnaire,
} from '../../types/sponsorship';
import { SponsorRecordAttendeeModal } from '../../components/sponsor/SponsorRecordAttendeeModal';
import { SponsorQuestionnaireBuilderModal } from '../../components/sponsor/SponsorQuestionnaireBuilderModal';

export const SponsorReportsPage: React.FC = () => {
  const [events, setEvents] = useState<ISponsorEventItem[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  // Selected event report details
  const [attendees, setAttendees] = useState<ISponsorCheckedInAttendeeItem[]>([]);
  const [questionnaire, setQuestionnaire] = useState<ISponsorQuestionnaire | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  // Modals
  const [selectedAttendeeForRecording, setSelectedAttendeeForRecording] =
    useState<ISponsorCheckedInAttendeeItem | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isQuestionnaireBuilderOpen, setIsQuestionnaireBuilderOpen] = useState(false);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // 1. Load sponsor's granted events
  const loadEvents = async () => {
    setLoading(true);
    try {
      const allEvents = await api.sponsorship.getSponsorMyEvents();
      // Filter to deals accepted or sharing granted
      const activeEvents = allEvents.filter(
        (e) => e.deal_status === 'DEAL_ACCEPTED' || e.allow_attendee_sharing
      );
      setEvents(activeEvents.length > 0 ? activeEvents : allEvents);

      if (activeEvents.length > 0) {
        setSelectedDealId(activeEvents[0].deal_id);
      } else if (allEvents.length > 0) {
        setSelectedDealId(allEvents[0].deal_id);
      }
    } catch (err: any) {
      console.error('Failed to load sponsor events for reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // 2. Load report details when selectedDealId changes
  const loadEventReport = async (dealId: string) => {
    if (!dealId) {
      setAttendees([]);
      setQuestionnaire(null);
      return;
    }

    setReportLoading(true);
    try {
      const [attendeesRes, qRes] = await Promise.allSettled([
        api.sponsorship.getSponsorCheckedInAttendees(dealId),
        api.sponsorship.getSponsorQuestionnaire(dealId),
      ]);

      if (attendeesRes.status === 'fulfilled') {
        setAttendees(attendeesRes.value.attendees || []);
      } else {
        setAttendees([]);
      }

      if (qRes.status === 'fulfilled') {
        setQuestionnaire(qRes.value);
      } else {
        setQuestionnaire(null);
      }
    } catch (err: any) {
      console.warn('Error loading event report details:', err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDealId) {
      loadEventReport(selectedDealId);
    }
  }, [selectedDealId]);

  const selectedEvent = events.find((e) => e.deal_id === selectedDealId);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!selectedEvent || attendees.length === 0) return;
    const headers = ['Attendee Name', 'Check-In Timestamp', 'Record Status'];
    const rows = attendees.map((a) => [
      `"${a.attendee_name.replace(/"/g, '""')}"`,
      `"${a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : ''}"`,
      `"${a.is_recorded || a.record_status === 'RECORDED' ? 'Recorded' : 'Not Recorded'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedEvent.event_title.replace(/\s+/g, '_')}_Attendees_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const recordedCount = attendees.filter((a) => a.is_recorded || a.record_status === 'RECORDED').length;
  const filteredAttendees = attendees.filter((a) =>
    a.attendee_name.toLowerCase().includes(attendeeSearch.toLowerCase().trim())
  );

  return (
    <div className="sheeba-report-page w-full max-w-5xl mx-auto space-y-6 pb-32 font-sans text-[#2D1F23] print:max-w-none print:w-full print:m-0 print:p-0 print:pb-0 print:space-y-4">
      {/* Top Controls Header (Identical to Organizer Reports Tab) */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#63474D]">
              Proof-of-Performance Artifact
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#63474D] text-white">
              Sponsor Impact Dossier
            </span>
            {selectedEvent?.allow_attendee_sharing && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Attendee Sharing Active
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23] leading-tight">
            Sheeba Event Impact Report
          </h1>
        </div>

        {/* Toolbar: Event Selector Dropdown & Action Buttons */}
        {!loading && events.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F5] p-3 rounded-2xl border border-[#E8DDD7]">
            <div className="w-full sm:w-72 md:w-80">
              <select
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                className="w-full truncate px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs font-bold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] cursor-pointer"
              >
                {events.map((e) => (
                  <option key={e.deal_id} value={e.deal_id}>
                    {e.event_title} ({e.expected_date || 'Date TBD'})
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuestionnaireBuilderOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sliders className="w-4 h-4 text-[#63474D]" />
                  <span>Questionnaire</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={attendees.length === 0}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#2A7B5F]" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="px-3.5 py-1.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-6 pt-4">
          <div className="h-1 w-full bg-[#63474D]/20 overflow-hidden rounded-full print:hidden">
            <div className="h-full bg-[#63474D] animate-pulse w-1/2 rounded-full" />
          </div>
          <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] shadow-xs space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-100 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
              <div className="h-24 bg-gray-100 rounded-2xl"></div>
              <div className="h-24 bg-gray-100 rounded-2xl"></div>
              <div className="h-24 bg-gray-100 rounded-2xl"></div>
              <div className="h-24 bg-gray-100 rounded-2xl"></div>
            </div>
          </div>
        </div>
      ) : events.length === 0 ? (
        /* Empty State: Sponsor hasn't participated in any events */
        <div className="bg-white rounded-3xl p-12 border border-[#E8DDD7] text-center space-y-5 shadow-xs max-w-xl mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-[#63474D]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-[#2D1F23]">No Sponsored Event Reports Yet</h2>
            <p className="text-sm text-[#756366] max-w-md mx-auto leading-relaxed">
              Reports and verified attendee intelligence appear here for events you sponsor once a partnership deal is accepted. Explore open opportunities on the marketplace to get started.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/sponsor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#63474D] hover:bg-[#4E373C] text-white text-xs font-bold shadow-md transition-all"
            >
              <span>Explore Sponsorship Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : reportLoading ? (
        <div className="space-y-6 pt-4">
          <div className="h-1 w-full bg-[#63474D]/20 overflow-hidden rounded-full print:hidden">
            <div className="h-full bg-[#63474D] animate-pulse w-1/2 rounded-full" />
          </div>
          <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] shadow-xs space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      ) : !selectedEvent ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] text-center space-y-4 shadow-xs max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#2D1F23]">Report Data Unavailable</h3>
          <p className="text-xs text-[#756366]">
            Could not retrieve performance metrics for this sponsorship deal.
          </p>
        </div>
      ) : (
        <div ref={reportContainerRef} className="space-y-8 print:space-y-6">
          {/* COVER & HEADER SECTION (Identical to Organizer Report Cover) */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] p-8 sm:p-12 shadow-xs space-y-6 print:p-6 print:rounded-2xl print:shadow-none">
            <div className="border-b border-gray-200 pb-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                  {selectedEvent.category || 'General'}
                </span>
                <span className="text-[10px] font-mono text-gray-400 font-semibold">
                  REPORT REF: SHEEBA-SPONSOR-{selectedEvent.deal_id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div>
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#2D1F23] tracking-tight leading-tight">
                  {selectedEvent.event_title}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 font-medium mt-2">
                  Organized by <strong className="text-[#2D1F23]">{selectedEvent.organizer?.name || 'Event Organizer'}</strong>
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{selectedEvent.expected_date || 'Date TBD'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{selectedEvent.location || 'Location TBD'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* High-Level Delivery Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl border border-gray-200 bg-[#FAF7F5] space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Verified Check-Ins</span>
                <p className="font-serif text-3xl font-black text-[#2D1F23]">
                  {selectedEvent.allow_attendee_sharing ? attendees.length : selectedEvent.checked_in_count || 0}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">Door check-in records</p>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Surveys Gathered</span>
                <p className="font-serif text-3xl font-black text-emerald-900">{recordedCount}</p>
                <p className="text-[10px] text-emerald-700 font-medium">
                  {attendees.length > 0
                    ? `${Math.round((recordedCount / attendees.length) * 100)}% coverage`
                    : 'Awaiting recordings'}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">Package Tier</span>
                <p className="font-serif text-lg sm:text-xl font-black text-blue-900 truncate">
                  {selectedEvent.package_name || 'Title Sponsor'}
                </p>
                <p className="text-[10px] text-blue-700 font-medium">Agreed activation</p>
              </div>

              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">Pledged Amount</span>
                <p className="font-serif text-lg sm:text-xl font-black text-purple-900">
                  {selectedEvent.pledged_amount
                    ? `${selectedEvent.pledged_amount.toLocaleString()} ${selectedEvent.currency || 'ETB'}`
                    : 'N/A'}
                </p>
                <p className="text-[10px] text-purple-700 font-medium">Sponsorship capital</p>
              </div>
            </div>
          </div>

          {/* SECTION 1: VERIFIED ATTENDEE ROSTER */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">Verified Attendee Roster</h3>
                <p className="text-xs text-gray-500">
                  Authoritative door check-in attendance list for your activation. (Names only under Sheeba data minimization standards).
                </p>
              </div>

              {selectedEvent.allow_attendee_sharing && attendees.length > 0 && (
                <div className="relative min-w-[200px] sm:min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    placeholder="Search attendee by name..."
                    className="w-full pl-8 pr-3 py-1.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#AA767C]"
                  />
                </div>
              )}
            </div>

            {!selectedEvent.allow_attendee_sharing ? (
              <div className="py-12 text-center space-y-3 bg-stone-50/60 rounded-2xl border border-stone-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-900">Attendee-Information Sharing Pending</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  The event organizer has accepted your sponsorship deal, but attendee roster access has not been activated yet. Contact the organizer to request attendee sharing.
                </p>
              </div>
            ) : attendees.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-stone-50/60 rounded-2xl border border-stone-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-800">No attendees have checked in yet</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Checked-in attendees will populate automatically when the event door check-in begins.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
                {filteredAttendees.map((attendee) => (
                  <div
                    key={attendee.attendee_id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#63474D]/20 to-[#FFA686]/30 text-[#63474D] font-bold text-xs flex items-center justify-center shrink-0">
                        {attendee.attendee_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[#2D1F23] truncate">
                          {attendee.attendee_name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified Check-in
                          </span>
                          {attendee.checked_in_at && (
                            <span className="flex items-center gap-1 text-gray-400">
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
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          attendee.is_recorded || attendee.record_status === 'RECORDED'
                            ? 'bg-stone-900 hover:bg-black text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <ClipboardEdit className="w-3.5 h-3.5" />
                        <span>
                          {attendee.is_recorded || attendee.record_status === 'RECORDED'
                            ? 'Edit'
                            : 'Record'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: QUESTIONNAIRE OUTCOMES */}
          <div className="bg-white rounded-3xl border border-[#E8DDD7] p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#2D1F23]">Engagement Questionnaire</h3>
                <p className="text-xs text-gray-500">
                  Custom survey questions deployed for your brand activation (v{questionnaire?.version_number || 1}).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsQuestionnaireBuilderOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-[#63474D]" />
                <span>Configure Questions</span>
              </button>
            </div>

            {questionnaire?.questions && questionnaire.questions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {questionnaire.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-[#FAF7F5] border border-[#E8DDD7] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-500">
                        Question #{idx + 1} • {q.type.replace('_', ' ')}
                      </span>
                      {q.required && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#2D1F23]">{q.question}</p>
                    {q.options && q.options.length > 0 && (
                      <p className="text-[11px] text-gray-500">
                        Choices: {q.options.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No questions defined yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Record Attendee Questionnaire Modal */}
      {selectedEvent && (
        <SponsorRecordAttendeeModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setSelectedAttendeeForRecording(null);
          }}
          dealId={selectedEvent.deal_id}
          eventTitle={selectedEvent.event_title}
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
      )}

      {/* Questionnaire Builder Modal */}
      {selectedEvent && (
        <SponsorQuestionnaireBuilderModal
          isOpen={isQuestionnaireBuilderOpen}
          onClose={() => setIsQuestionnaireBuilderOpen(false)}
          dealId={selectedEvent.deal_id}
          eventTitle={selectedEvent.event_title}
          onSaved={() => {
            loadEventReport(selectedEvent.deal_id);
          }}
        />
      )}
    </div>
  );
};
