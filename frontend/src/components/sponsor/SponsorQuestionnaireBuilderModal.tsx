import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileQuestion,
  ListPlus,
  Star,
  Type,
  AlignLeft,
  CheckSquare,
  Radio,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  ISponsorQuestionnaire,
  ISponsorQuestionnaireQuestion,
  SponsorQuestionType,
} from '../../types/sponsorship';

interface SponsorQuestionnaireBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  eventTitle?: string;
  onSaved?: () => void;
}

export const SponsorQuestionnaireBuilderModal: React.FC<SponsorQuestionnaireBuilderModalProps> = ({
  isOpen,
  onClose,
  dealId,
  eventTitle,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState('Attendee Engagement Questionnaire');
  const [versionNumber, setVersionNumber] = useState<number>(1);
  const [questions, setQuestions] = useState<ISponsorQuestionnaireQuestion[]>([]);

  useEffect(() => {
    if (isOpen && dealId) {
      loadQuestionnaire();
    } else {
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, dealId]);

  const loadQuestionnaire = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ISponsorQuestionnaire = await api.sponsorship.getSponsorQuestionnaire(dealId);
      if (data) {
        setTitle(data.title || `${eventTitle || 'Event'} Attendee Survey`);
        setVersionNumber(data.version_number || 1);
        setQuestions(
          data.questions?.length
            ? data.questions
            : [
                {
                  id: `q_${Date.now()}_1`,
                  question: 'What interest brings you to our booth today?',
                  type: 'SHORT_TEXT',
                  required: true,
                  options: [],
                },
                {
                  id: `q_${Date.now()}_2`,
                  question: 'How likely are you to explore our services or partner with us?',
                  type: 'RATING',
                  required: false,
                  options: ['1', '2', '3', '4', '5'],
                },
              ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load questionnaire.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQ: ISponsorQuestionnaireQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question: '',
      type: 'SHORT_TEXT',
      required: false,
      options: [],
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Questionnaire must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveQuestion = (idx: number, direction: 'UP' | 'DOWN') => {
    setQuestions((prev) => {
      const updated = [...prev];
      const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= updated.length) return prev;
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  const handleQuestionChange = (idx: number, field: keyof ISponsorQuestionnaireQuestion, val: any) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const target = { ...updated[idx], [field]: val };

      // Initialize default options if switching to choice
      if (field === 'type') {
        if ((val === 'SINGLE_CHOICE' || val === 'MULTIPLE_CHOICE') && (!target.options || target.options.length === 0)) {
          target.options = ['Option 1', 'Option 2'];
        } else if (val === 'RATING') {
          target.options = ['1', '2', '3', '4', '5'];
        }
      }

      updated[idx] = target;
      return updated;
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = [...(updated[qIdx].options || [])];
      opts[optIdx] = val;
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return updated;
    });
  };

  const handleAddOption = (qIdx: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = [...(updated[qIdx].options || []), `Option ${(updated[qIdx].options?.length || 0) + 1}`];
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return updated;
    });
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = (updated[qIdx].options || []).filter((_, i) => i !== optIdx);
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return updated;
    });
  };

  const handleSave = async () => {
    // Validate that questions have non-empty prompt
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        setError(`Question #${i + 1} cannot have an empty prompt.`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await api.sponsorship.saveSponsorQuestionnaire(dealId, {
        title,
        questions,
      });
      setVersionNumber(saved.version_number);
      setSuccess('Questionnaire saved successfully! Version updated.');
      setTimeout(() => setSuccess(null), 4000);
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save questionnaire.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] z-10">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#2D1F23] to-[#402A30] text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-white/10 text-[#FFA686]">
                <Sliders className="w-5 h-5" />
              </span>
              <h3 className="font-serif font-bold text-lg text-white">Sponsor Questionnaire Builder</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/15 text-stone-200">
                v{versionNumber}
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Customize questions asked to checked-in attendees at {eventTitle || 'the event'}.
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

        {/* Feedback Alerts */}
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

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Questionnaire Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. VIP Partner Attendee Survey"
              className="w-full px-4 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-semibold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#AA767C]"
            />
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Survey Questions ({questions.length})
              </span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-xl bg-[#63474D]/10 hover:bg-[#63474D]/20 text-[#63474D] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#63474D] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-stone-500">Loading questionnaire template...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-4 transition-all hover:border-stone-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                        #{idx + 1}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveQuestion(idx, 'UP')}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === questions.length - 1}
                          onClick={() => handleMoveQuestion(idx, 'DOWN')}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 cursor-pointer ml-1"
                          title="Delete question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question text & type row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-stone-500">
                          Question Prompt
                        </label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                          placeholder="Type your question..."
                          className="w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#AA767C]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-500">
                          Answer Type
                        </label>
                        <select
                          value={q.type}
                          onChange={(e) => handleQuestionChange(idx, 'type', e.target.value as SponsorQuestionType)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#AA767C]"
                        >
                          <option value="SHORT_TEXT">Short Text</option>
                          <option value="LONG_TEXT">Long Text / Paragraph</option>
                          <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                          <option value="MULTIPLE_CHOICE">Multiple Choice (Checkboxes)</option>
                          <option value="RATING">Rating Scale (1-5)</option>
                        </select>
                      </div>
                    </div>

                    {/* Options manager for Single & Multiple choice */}
                    {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (
                      <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                        <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Answer Choices
                        </label>
                        <div className="space-y-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="w-4 text-center text-xs text-stone-400">
                                {q.type === 'SINGLE_CHOICE' ? '○' : '□'}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(idx, optIdx, e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#AA767C]"
                              />
                              {(q.options || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(idx, optIdx)}
                                  className="text-stone-400 hover:text-red-500 p-1 cursor-pointer"
                                  title="Remove choice"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddOption(idx)}
                          className="text-[11px] font-bold text-[#63474D] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add another choice</span>
                        </button>
                      </div>
                    )}

                    {/* Required Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => handleQuestionChange(idx, 'required', e.target.checked)}
                          className="w-4 h-4 text-[#63474D] rounded border-stone-300 focus:ring-[#AA767C]"
                        />
                        <span className="text-xs font-semibold text-stone-700">Required question</span>
                      </label>
                      <span className="text-[11px] text-stone-400">
                        {q.required ? 'Mandatory for attendee submission' : 'Optional'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <p className="text-[11px] text-stone-500">
            Historical integrity: Saving creates an immutable snapshot for attendee responses.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Questionnaire'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

