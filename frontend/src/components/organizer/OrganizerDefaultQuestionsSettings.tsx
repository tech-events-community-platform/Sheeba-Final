import React, { useState } from 'react';
import type { User } from '../../types/user';
import type { QuestionType } from '../../types/event';
import {
  type DefaultQuestion,
  STANDARD_DEFAULT_QUESTIONS,
  getOrganizerDefaultQuestions,
  saveOrganizerDefaultQuestions,
} from '../../utils/defaultQuestions';
import { Button } from '../ui/Button';
import {
  HelpCircle,
  Plus,
  Trash2,
  X,
  RotateCcw,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface OrganizerDefaultQuestionsSettingsProps {
  user: User;
}

export const OrganizerDefaultQuestionsSettings: React.FC<OrganizerDefaultQuestionsSettingsProps> = ({
  user,
}) => {
  const [questions, setQuestions] = useState<DefaultQuestion[]>(() =>
    getOrganizerDefaultQuestions(user.id)
  );
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `def_q_${Date.now()}`,
        questionText: '',
        type: 'text',
        options: ['Option 1', 'Option 2'],
        isRequired: true,
      },
    ]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleQuestionTextChange = (id: string, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, questionText: text } : q))
    );
  };

  const handleQuestionTypeChange = (id: string, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              type,
              options:
                q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'],
            }
          : q
      )
    );
  };

  const handleQuestionRequiredChange = (id: string, isRequired: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isRequired } : q))
    );
  };

  const handleAddOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const count = q.options.length + 1;
          return { ...q, options: [...q.options, `Option ${count}`] };
        }
        return q;
      })
    );
  };

  const handleOptionChange = (questionId: string, index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const newOpts = [...q.options];
          newOpts[index] = value;
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleRemoveOption = (questionId: string, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const newOpts = q.options.filter((_, i) => i !== index);
          return { ...q, options: newOpts.length > 0 ? newOpts : ['Option 1'] };
        }
        return q;
      })
    );
  };

  const handleResetToStandard = () => {
    const standard = STANDARD_DEFAULT_QUESTIONS.map((q) => ({
      ...q,
      options: [...q.options],
    }));
    setQuestions(standard);
    saveOrganizerDefaultQuestions(standard, user.id);
    setSaveSuccess('Reset to the 4 standard Sheeba default questions.');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleSave = () => {
    const validQuestions = questions
      .filter((q) => q.questionText.trim().length > 0)
      .map((q) => ({
        ...q,
        options:
          q.type === 'choice' || q.type === 'multi_choice'
            ? q.options.filter((opt) => opt.trim().length > 0)
            : [],
      }));

    saveOrganizerDefaultQuestions(validQuestions, user.id);
    setQuestions(validQuestions);
    setSaveSuccess('Default organization questions saved successfully!');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  return (
    <div className="pt-6 border-t border-[#E8DDD7] space-y-5 max-w-3xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#63474D]" />
            Default Organization Questions
          </h2>
          <p className="text-xs text-[#756366] mt-0.5">
            Configure the default questions that automatically populate on every event you create. You can toggle them on or off per event during creation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToStandard}
          className="inline-flex items-center gap-1.5 text-xs text-[#756366] hover:text-[#2D1F23] font-semibold transition-colors shrink-0 cursor-pointer self-start sm:self-auto bg-[#FAF7F5] border border-[#E8DDD7] px-3 py-1.5 rounded-xl hover:bg-white"
          title="Reset to Sheeba's original 4 standard questions"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#AA767C]" />
          <span>Reset to 4 Standard Questions</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="p-6 bg-[#FAF7F5] border border-dashed border-[#E8DDD7] rounded-2xl text-center space-y-2">
            <p className="text-xs text-[#756366]">
              No default questions configured. You will write event-specific questions manually during event creation.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToStandard}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Load 4 Standard Questions
            </Button>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-4 sm:p-5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-3 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#63474D] font-mono">Q{idx + 1}</span>
                  <span className="text-xs font-semibold text-[#2D1F23]">Default Question Details</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(q.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Remove default question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter default question text (e.g., What best describes you?)..."
                  value={q.questionText}
                  onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />

                {/* Type & Required Selector */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <span className="text-[11px] font-bold text-[#756366]">Answer Type:</span>
                  <select
                    value={q.type}
                    onChange={(e) => handleQuestionTypeChange(q.id, e.target.value as QuestionType)}
                    className="px-2.5 py-1.5 bg-white border border-[#E8DDD7] rounded-lg text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                  >
                    <option value="text">Text Answer (Free text field)</option>
                    <option value="choice">Single Choice (Radio selection)</option>
                    <option value="multi_choice">Multiple Choice (Checkboxes / Multi-tick)</option>
                  </select>

                  <label className="flex items-center gap-2 text-xs text-[#756366] cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      checked={q.isRequired}
                      onChange={(e) => handleQuestionRequiredChange(q.id, e.target.checked)}
                      className="rounded text-[#63474D]"
                    />
                    <span>Required response</span>
                  </label>
                </div>

                {/* Options List for Single Choice & Multiple Choice */}
                {(q.type === 'choice' || q.type === 'multi_choice') && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-[#E8DDD7] space-y-2.5">
                    <span className="text-[10px] font-bold text-[#756366] uppercase tracking-wider block">
                      {q.type === 'choice' ? 'Single Choice Options' : 'Multiple Choice / Multi-Tick Options'}
                    </span>

                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono w-4 text-center">
                            {q.type === 'choice' ? '○' : '□'}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 px-3 py-1.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-lg text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                          />
                          {q.options.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(q.id, optIdx)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                              title="Remove option"
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

        {/* Add Default Question Button */}
        <button
          type="button"
          onClick={handleAddQuestion}
          className="w-full py-3 px-4 bg-[#FAF7F5] hover:bg-[#F3ECE8] border-2 border-dashed border-[#AA767C]/50 hover:border-[#63474D] rounded-2xl text-xs font-bold text-[#63474D] flex items-center justify-center gap-2 transition-all cursor-pointer group"
        >
          <Plus className="w-4 h-4 text-[#AA767C] group-hover:text-[#63474D] transition-colors" />
          <span>+ Add Default Question</span>
        </button>
      </div>

      {/* Save Button */}
      <div className="pt-2 flex justify-start">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          Save Default Questions
        </Button>
      </div>
    </div>
  );
};
