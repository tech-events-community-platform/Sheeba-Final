import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  CheckCircle2,
  Clock,
  ClipboardEdit,
  Save,
  AlertCircle,
  Star,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  ISponsorCheckedInAttendeeItem,
  ISponsorQuestionnaire,
  ISponsorQuestionnaireQuestion,
} from '../../types/sponsorship';

interface SponsorRecordAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  eventTitle?: string;
  attendee: ISponsorCheckedInAttendeeItem | null;
  onRecordedSuccess?: (attendeeId: string) => void;
}

export const SponsorRecordAttendeeModal: React.FC<SponsorRecordAttendeeModalProps> = ({
  isOpen,
  onClose,
  dealId,
  eventTitle,
  attendee,
  onRecordedSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [questionnaire, setQuestionnaire] = useState<ISponsorQuestionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [previouslyRecorded, setPreviouslyRecorded] = useState(false);

  useEffect(() => {
    if (isOpen && dealId && attendee) {
      loadFormData();
    } else {
      setAnswers({});
      setError(null);
      setSuccess(null);
      setPreviouslyRecorded(false);
    }
  }, [isOpen, dealId, attendee?.attendee_id]);

  const loadFormData = async () => {
    if (!attendee) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Load active questionnaire
      const qData: ISponsorQuestionnaire = await api.sponsorship.getSponsorQuestionnaire(dealId);
      setQuestionnaire(qData);

      // 2. Check for existing response
      const existing = await api.sponsorship.getAttendeeResponse(dealId, attendee.attendee_id);
      if (existing && existing.answers) {
        setAnswers(existing.answers);
        setPreviouslyRecorded(true);
      } else {
        setAnswers({});
        setPreviouslyRecorded(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load questionnaire for this attendee.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleCheckboxToggle = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const exists = current.includes(option);
      const updated = exists ? current.filter((item: string) => item !== option) : [...current, option];
      return {
        ...prev,
        [questionId]: updated,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendee) return;

    // Validate required questions
    if (questionnaire?.questions) {
      for (const q of questionnaire.questions) {
        if (q.required) {
          const val = answers[q.id];
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            setError(`Please answer the required question: "${q.question}"`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.sponsorship.recordAttendeeResponse(dealId, attendee.attendee_id, {
        answers,
        status: 'COMPLETED',
      });
      setSuccess('Attendee response recorded successfully!');
      setPreviouslyRecorded(true);
      if (onRecordedSuccess) {
        onRecordedSuccess(attendee.attendee_id);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to record response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !attendee) return null;

  const questions = questionnaire?.questions || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] z-10">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#2D1F23] to-[#402A30] text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-white/10 text-[#FFA686]">
                <ClipboardEdit className="w-5 h-5" />
              </span>
              <h3 className="font-serif font-bold text-lg text-white">Record Attendee Response</h3>
              {previouslyRecorded && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Recorded ✓
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 truncate max-w-md">
              {eventTitle || 'Event Activation'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Attendee Context Banner */}
        <div className="bg-[#FAF7F5] border-b border-stone-200 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#63474D]/15 text-[#63474D] font-bold text-xs flex items-center justify-center">
              {attendee.attendee_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-stone-900">{attendee.attendee_name}</h4>
              <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified door check-in
              </p>
            </div>
          </div>

          {attendee.checked_in_at && (
            <span className="text-[11px] text-stone-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              {new Date(attendee.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Questionnaire Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-500">Loading attendee questionnaire...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs text-stone-500">No questions found in this questionnaire.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const answerVal = answers[q.id];

                return (
                  <div key={q.id || idx} className="space-y-2 bg-stone-50/60 p-4 rounded-2xl border border-stone-200">
                    <label className="text-xs font-bold text-stone-800 block">
                      <span className="text-stone-400 mr-1.5">#{idx + 1}</span>
                      {q.question}
                      {q.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                    </label>

                    {/* SHORT_TEXT */}
                    {q.type === 'SHORT_TEXT' && (
                      <input
                        type="text"
                        value={answerVal || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        placeholder="Enter attendee's response..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#AA767C]"
                      />
                    )}

                    {/* LONG_TEXT */}
                    {q.type === 'LONG_TEXT' && (
                      <textarea
                        rows={3}
                        value={answerVal || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        placeholder="Detailed response..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#AA767C]"
                      />
                    )}

                    {/* SINGLE_CHOICE */}
                    {q.type === 'SINGLE_CHOICE' && (
                      <div className="space-y-1.5 pt-1">
                        {(q.options || []).map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              answerVal === opt
                                ? 'bg-[#63474D]/10 border-[#63474D] text-[#63474D] font-bold'
                                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              value={opt}
                              checked={answerVal === opt}
                              onChange={() => handleInputChange(q.id, opt)}
                              className="text-[#63474D] focus:ring-[#AA767C]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* MULTIPLE_CHOICE */}
                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-1.5 pt-1">
                        {(q.options || []).map((opt, oIdx) => {
                          const isSelected = Array.isArray(answerVal) && answerVal.includes(opt);
                          return (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#63474D]/10 border-[#63474D] text-[#63474D] font-bold'
                                  : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleCheckboxToggle(q.id, opt)}
                                className="w-4 h-4 text-[#63474D] rounded border-stone-300 focus:ring-[#AA767C]"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* RATING (1 to 5) */}
                    {q.type === 'RATING' && (
                      <div className="flex items-center gap-2 pt-1">
                        {['1', '2', '3', '4', '5'].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleInputChange(q.id, star)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              answerVal === star
                                ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                            }`}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                answerVal === star ? 'text-amber-500 fill-amber-500' : 'text-stone-300'
                              }`}
                            />
                            <span>{star}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Form Actions Footer inside form */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : previouslyRecorded ? 'Update Response' : 'Save Response'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

