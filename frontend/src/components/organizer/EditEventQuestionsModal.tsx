import React, { useState, useEffect } from 'react';
import type { Event, RegistrationQuestion, QuestionType } from '../../types/event';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import {
  X,
  Plus,
  Trash2,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { getOrganizerDefaultQuestions, type DefaultQuestion } from '../../utils/defaultQuestions';

interface EditEventQuestionsModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onQuestionsUpdated: (updatedQuestions: RegistrationQuestion[]) => void;
}

export const EditEventQuestionsModal: React.FC<EditEventQuestionsModalProps> = ({
  event,
  isOpen,
  onClose,
  onQuestionsUpdated,
}) => {
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Synchronize state when modal opens or event changes
  useEffect(() => {
    if (event && isOpen) {
      const initial = event.customQuestions && event.customQuestions.length > 0
        ? JSON.parse(JSON.stringify(event.customQuestions))
        : [];
      setQuestions(initial);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  // Question manipulation handlers
  const handleAddQuestion = () => {
    const newQuestion: RegistrationQuestion = {
      id: `q_${Date.now()}`,
      eventId: event.id,
      questionText: '',
      type: 'text',
      options: ['Option 1', 'Option 2'],
      isRequired: false,
      order: questions.length + 1,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id).map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setQuestions(reordered.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  const handleQuestionTextChange = (id: string, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, questionText: text } : q))
    );
  };

  const handleQuestionTypeChange = (id: string, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const currentOptions = q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'];
          return {
            ...q,
            type,
            options: type === 'text' ? [] : currentOptions,
          };
        }
        return q;
      })
    );
  };

  const handleQuestionRequiredChange = (id: string, isRequired: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isRequired } : q))
    );
  };

  const handleOptionChange = (id: string, optionIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id && q.options) {
          const updated = [...q.options];
          updated[optionIndex] = text;
          return { ...q, options: updated };
        }
        return q;
      })
    );
  };

  const handleAddOption = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const existing = q.options || [];
          return { ...q, options: [...existing, `Option ${existing.length + 1}`] };
        }
        return q;
      })
    );
  };

  const handleRemoveOption = (id: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id && q.options) {
          return { ...q, options: q.options.filter((_, idx) => idx !== optionIndex) };
        }
        return q;
      })
    );
  };

  const handleLoadDefaults = () => {
    const defaults = getOrganizerDefaultQuestions(event.organizerId).map((q: DefaultQuestion, idx: number) => ({
      ...q,
      id: `q_default_${Date.now()}_${idx}`,
      eventId: event.id,
      order: questions.length + idx + 1,
    }));
    setQuestions((prev) => [...prev, ...defaults]);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate that questions with text exist and choice questions have options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setErrorMsg(`Question ${i + 1} has an empty prompt. Please fill it in or remove it.`);
        return;
      }
      if ((q.type === 'choice' || q.type === 'multi_choice')) {
        const validOptions = (q.options || []).filter((opt) => opt.trim().length > 0);
        if (validOptions.length < 2) {
          setErrorMsg(`Question ${i + 1} (${q.questionText}) requires at least 2 choice options.`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const sanitized = questions.map((q, idx) => ({
        id: q.id || `q_${Date.now()}_${idx}`,
        eventId: event.id,
        questionText: q.questionText.trim(),
        type: q.type || 'text',
        options: (q.type === 'choice' || q.type === 'multi_choice') ? (q.options || []).map((o) => o.trim()).filter(Boolean) : [],
        isRequired: Boolean(q.isRequired),
        order: idx + 1,
      }));

      await api.events.update(event.id, {
        customQuestions: sanitized,
      });

      setSuccessMsg('Registration questions updated and published live!');
      onQuestionsUpdated(sanitized);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update questions:', err);
      setErrorMsg(err.message || 'Failed to update questions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-gray-100 z-10 space-y-5 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#63474D]/10 text-[#63474D] rounded-xl">
                <HelpCircle className="w-5 h-5" />
              </span>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2D1F23]">
                Edit Registration Questions
              </h2>
            </div>
            <p className="text-xs text-[#756366] mt-1 line-clamp-1">
              For: <span className="font-semibold text-[#2D1F23]">{event.title}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Questions Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              {questions.length} question{questions.length === 1 ? '' : 's'} on this form
            </span>
            <button
              type="button"
              onClick={handleLoadDefaults}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#63474D] hover:underline cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>+ Insert Organization Defaults</span>
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="p-8 bg-[#FAF7F5] border border-dashed border-[#E8DDD7] rounded-2xl text-center space-y-2">
              <p className="text-xs text-[#756366]">
                No custom questions on this event. Attendees will only submit standard name and email.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add First Question
              </Button>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#63474D] font-mono bg-white px-2 py-0.5 rounded-md border border-[#E8DDD7]">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-[#2D1F23]">Question Prompt</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reordering buttons */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer ml-1"
                      title="Remove Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter question text (e.g. What best describes your current role?)..."
                    value={q.questionText}
                    onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  />

                  {/* Answer Type Selector & Required Checkbox */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <span className="text-[11px] font-bold text-[#756366]">Answer Type:</span>
                    <select
                      value={q.type || 'text'}
                      onChange={(e) => handleQuestionTypeChange(q.id, e.target.value as QuestionType)}
                      className="px-2.5 py-1 bg-white border border-[#E8DDD7] rounded-lg text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] cursor-pointer"
                    >
                      <option value="text">Text Field (Open-ended response)</option>
                      <option value="choice">Single Choice (Radio buttons)</option>
                      <option value="multi_choice">Multiple Choice (Checkboxes / Multi-select)</option>
                    </select>

                    <label className="flex items-center gap-2 text-xs text-[#756366] cursor-pointer ml-auto select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(q.isRequired)}
                        onChange={(e) => handleQuestionRequiredChange(q.id, e.target.checked)}
                        className="rounded text-[#63474D] cursor-pointer"
                      />
                      <span>Required</span>
                    </label>
                  </div>

                  {/* Options List for Single Choice & Multiple Choice */}
                  {(q.type === 'choice' || q.type === 'multi_choice') && (
                    <div className="mt-2 p-3 bg-white rounded-xl border border-[#E8DDD7] space-y-2">
                      <span className="text-[10px] font-bold text-[#756366] uppercase tracking-wider block">
                        {q.type === 'choice' ? 'Radio Choice Options' : 'Multi-Tick Checkbox Options'}
                      </span>

                      <div className="space-y-1.5">
                        {(q.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono w-4 text-center">
                              {q.type === 'choice' ? '○' : '□'}
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 px-2.5 py-1.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-lg text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                            />
                            {(q.options && q.options.length > 1) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(q.id, optIdx)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                                title="Remove Option"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddOption(q.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#63474D] hover:underline cursor-pointer pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Add Question Button */}
          {questions.length > 0 && (
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-3 px-4 bg-[#FAF7F5] hover:bg-[#F3ECE8] border-2 border-dashed border-[#AA767C]/40 hover:border-[#63474D] rounded-2xl text-xs font-bold text-[#63474D] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Question</span>
            </button>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 shadow-sm cursor-pointer"
          >
            {isSaving ? 'Saving Changes...' : 'Save & Publish Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};
