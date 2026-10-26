import React, { useState, useEffect } from 'react';
import type { RegistrationQuestion, QuestionType } from '../../types/event';
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
  RotateCcw,
} from 'lucide-react';
import { validateForm } from '../../utils/validation';
import { eventQuestionDraftSchema } from '../../schemas/event.schema';

export interface DefaultExhibitorQuestion {
  id: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  isRequired: boolean;
  enabled: boolean;
}

export const STANDARD_EXHIBITOR_DEFAULT_QUESTIONS: DefaultExhibitorQuestion[] = [
  {
    id: 'default_exhibitor_showcase',
    questionText: 'Product or service showcase description',
    type: 'text',
    options: [],
    isRequired: true,
    enabled: true,
  },
  {
    id: 'default_exhibitor_power',
    questionText: 'Power and booth setup requirements',
    type: 'choice',
    options: ['Standard 220V Outlet', 'High Power / 3-Phase', 'No Special Power Required'],
    isRequired: false,
    enabled: true,
  },
  {
    id: 'default_exhibitor_retail',
    questionText: 'Do you intend to conduct on-site direct retail sales?',
    type: 'choice',
    options: ['Yes, direct retail sales intended', 'No, exhibition & lead generation only'],
    isRequired: true,
    enabled: true,
  },
];

interface EditExhibitorQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: RegistrationQuestion[];
  onQuestionsUpdated: (updatedQuestions: RegistrationQuestion[]) => void;
}

export const EditExhibitorQuestionsModal: React.FC<EditExhibitorQuestionsModalProps> = ({
  isOpen,
  onClose,
  questions: initialQuestions,
  onQuestionsUpdated,
}) => {
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialQuestions && initialQuestions.length > 0) {
        setQuestions(JSON.parse(JSON.stringify(initialQuestions)));
      } else {
        // Initialize with the 3 standard exhibitor default questions
        const defaults: RegistrationQuestion[] = STANDARD_EXHIBITOR_DEFAULT_QUESTIONS.map(
          (q, idx) => ({
            id: q.id,
            questionText: q.questionText,
            type: q.type,
            options: [...q.options],
            isRequired: q.isRequired,
            order: idx + 1,
          })
        );
        setQuestions(defaults);
      }
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialQuestions]);

  if (!isOpen) return null;

  // Add custom question
  const handleAddQuestion = () => {
    const newQuestion: RegistrationQuestion = {
      id: `exhibitor_q_${Date.now()}`,
      questionText: '',
      type: 'text',
      options: ['Option 1', 'Option 2'],
      isRequired: false,
      order: questions.length + 1,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  // Remove question
  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) =>
      prev.filter((q) => q.id !== id).map((q, idx) => ({ ...q, order: idx + 1 }))
    );
  };

  // Move question
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setQuestions(reordered.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  // Text change
  const handleQuestionTextChange = (id: string, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, questionText: text } : q))
    );
  };

  // Type change
  const handleQuestionTypeChange = (id: string, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const currentOptions =
            q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'];
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

  // Required toggle
  const handleQuestionRequiredChange = (id: string, isRequired: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isRequired } : q))
    );
  };

  // Option change
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

  // Add option
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

  // Remove option
  const handleRemoveOption = (id: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id && q.options) {
          return {
            ...q,
            options: q.options.filter((_, idx) => idx !== optionIndex),
          };
        }
        return q;
      })
    );
  };

  // Restore 3 standard default exhibitor questions
  const handleRestoreDefaults = () => {
    const defaults: RegistrationQuestion[] = STANDARD_EXHIBITOR_DEFAULT_QUESTIONS.map(
      (q, idx) => ({
        id: q.id,
        questionText: q.questionText,
        type: q.type,
        options: [...q.options],
        isRequired: q.isRequired,
        order: idx + 1,
      })
    );
    setQuestions(defaults);
    setErrorMsg(null);
  };

  // Save questions
  const handleSave = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate each question using eventQuestionDraftSchema
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const validation = validateForm(eventQuestionDraftSchema, {
        id: q.id || `exhibitor_q_${Date.now()}_${i}`,
        questionText: q.questionText,
        type: q.type || 'text',
        options: q.options || [],
        isRequired: Boolean(q.isRequired),
        order: i + 1,
      });

      if (!validation.success) {
        setErrorMsg(validation.error);
        return;
      }
    }

    const sanitized: RegistrationQuestion[] = questions.map((q, idx) => ({
      id: q.id || `exhibitor_q_${Date.now()}_${idx}`,
      questionText: q.questionText.trim(),
      type: q.type || 'text',
      options: ['choice', 'multi_choice', 'select', 'radio', 'checkbox', 'dropdown'].includes(
        q.type || ''
      )
        ? (q.options || []).map((o) => o.trim()).filter(Boolean)
        : [],
      isRequired: Boolean(q.isRequired),
      order: idx + 1,
    }));

    onQuestionsUpdated(sanitized);
    setSuccessMsg('Exhibitor application questions updated successfully!');
    setTimeout(() => {
      onClose();
    }, 400);
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
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2D1F23]">
                Exhibitor Application Questions
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure the questions applicants answer when requesting a booth at this event.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-[#2D1F23] rounded-xl hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Header: Restore standard defaults and Add Custom */}
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 bg-[#FAF7F5] p-3 rounded-2xl border border-[#E8DDD7]">
          <div className="text-xs text-[#63474D] font-semibold">
            {questions.length} Question{questions.length === 1 ? '' : 's'} Configured
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8DDD7] text-xs font-semibold text-[#63474D] hover:bg-gray-50 transition-colors cursor-pointer"
              title="Reset to the 3 standard exhibitor default questions"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddQuestion}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Question
            </Button>
          </div>
        </div>

        {/* Question List (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {questions.length === 0 ? (
            <div className="text-center py-10 space-y-3 bg-[#FAF7F5] rounded-3xl border border-dashed border-[#E8DDD7]">
              <Layers className="w-8 h-8 text-gray-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#2D1F23]">No exhibitor questions configured</p>
                <p className="text-[11px] text-gray-400">
                  Applicants will only provide standard company and contact details.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestoreDefaults}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Load Default Questions
              </Button>
            </div>
          ) : (
            questions.map((q, idx) => {
              const isChoiceType = [
                'choice',
                'multi_choice',
                'select',
                'radio',
                'checkbox',
              ].includes(q.type || '');
              const isDefault = q.id.startsWith('default_exhibitor_');

              return (
                <div
                  key={q.id || idx}
                  className="p-4 bg-white border border-[#E8DDD7] rounded-2xl shadow-2xs space-y-3 relative hover:border-[#AA767C] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#FAF7F5] border border-[#E8DDD7] text-[11px] font-bold text-[#63474D] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {isDefault && (
                        <span className="text-[10px] font-semibold bg-[#FFA686]/20 text-[#2D1F23] px-2 py-0.5 rounded-full">
                          Default Question
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        className="p-1 text-gray-400 hover:text-[#63474D] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        className="p-1 text-gray-400 hover:text-[#63474D] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer ml-1"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Question Prompt *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Showcase details, power requirements..."
                      value={q.questionText}
                      onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] font-medium focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                  </div>

                  {/* Question Type and Required Checkbox */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Response Type
                      </label>
                      <select
                        value={q.type || 'text'}
                        onChange={(e) =>
                          handleQuestionTypeChange(q.id, e.target.value as QuestionType)
                        }
                        className="w-full px-3 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] font-medium focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                      >
                        <option value="text">Text (Free Form)</option>
                        <option value="choice">Single Choice (Dropdown / Radio)</option>
                        <option value="multi_choice">Multiple Choice (Checkboxes)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5 sm:pt-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2D1F23]">
                        <input
                          type="checkbox"
                          checked={Boolean(q.isRequired)}
                          onChange={(e) => handleQuestionRequiredChange(q.id, e.target.checked)}
                          className="w-4 h-4 rounded text-[#63474D] focus:ring-[#63474D]"
                        />
                        <span>Mandatory Question (Required to apply)</span>
                      </label>
                    </div>
                  </div>

                  {/* Options List (for choice and multi_choice types) */}
                  {isChoiceType && (
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <label className="block text-[11px] font-bold text-gray-600">
                        Answer Options (At least 2 required)
                      </label>
                      <div className="space-y-1.5">
                        {(q.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-bold w-4">
                              {optIdx + 1}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 px-2.5 py-1.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-lg text-xs text-[#2D1F23] focus:outline-none focus:ring-1 focus:ring-[#63474D]"
                            />
                            {(q.options || []).length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(q.id, optIdx)}
                                className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
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
                        className="text-[11px] font-bold text-[#63474D] hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            icon={<Check className="w-4 h-4" />}
          >
            Apply Questions
          </Button>
        </div>
      </div>
    </div>
  );
};
