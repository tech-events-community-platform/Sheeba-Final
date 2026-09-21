import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { EventType, RegistrationQuestion, QuestionType } from '../../types/event';
import { Button } from '../../components/ui/Button';
import {
  Plus,
  Trash2,
  Copy,
  HelpCircle,
  CreditCard,
  X,
} from 'lucide-react';

interface QuestionDraft {
  id: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  isRequired: boolean;
}

export const CreateEventPage: React.FC = () => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    type: 'meetup' as EventType,
    date: '',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    location: '',
    capacity: 100,
    isPaid: false,
    ticketPrice: 0,
    description: '',
    posterImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  });

  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      id: 'q_init_1',
      questionText: 'What is your background or experience level with this topic?',
      type: 'choice',
      options: ['Beginner', 'Intermediate', 'Advanced'],
      isRequired: true,
    },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        questionText: '',
        type: 'text',
        options: ['Option 1', 'Option 2'],
        isRequired: false,
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
              options: q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2'],
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

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Event title is required';
    if (!formData.date) errs.date = 'Event date is required';
    if (!formData.location.trim()) errs.location = 'Venue or location is required';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (formData.capacity <= 0) errs.capacity = 'Capacity must be at least 1';
    if (formData.isPaid && formData.ticketPrice <= 0) {
      errs.ticketPrice = 'Paid tickets must specify a price in ETB (e.g. 150)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formattedQuestions: RegistrationQuestion[] = questions
        .filter((q) => q.questionText.trim().length > 0)
        .map((q, idx) => ({
          id: q.id,
          questionText: q.questionText.trim(),
          type: q.type,
          options:
            q.type === 'choice' || q.type === 'multi_choice'
              ? q.options.filter((opt) => opt.trim().length > 0)
              : undefined,
          isRequired: q.isRequired,
          order: idx + 1,
        }));

      const newEvent = await api.events.create({
        title: formData.title,
        type: formData.type,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        time: `${formData.startTime} - ${formData.endTime} EAT`,
        location: formData.location,
        venueName: formData.location.split(',')[0],
        capacity: Number(formData.capacity),
        description: formData.description,
        isPaid: formData.isPaid,
        ticketPrice: formData.isPaid ? Number(formData.ticketPrice) : 0,
        currency: 'ETB',
        organizerId: user?.id || 'demo-organizer-001',
        organizerName: user?.organization || user?.name || 'GDG Addis',
        customQuestions: formattedQuestions,
        bannerUrl: formData.posterImageUrl,
        posterImageUrl: formData.posterImageUrl,
      });

      setCreatedEvent(newEvent);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!createdEvent) return;
    const url = `${window.location.origin}/e/${createdEvent.shareLinkToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Success Created View with Share Link
  if (createdEvent) {
    const shareUrl = `${window.location.origin}/e/${createdEvent.shareLinkToken}`;
    return (
      <div className="max-w-xl mx-auto py-16 px-4 space-y-6 text-center animate-fade-in">
        <img
          src="/tick.webp"
          alt="Success"
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto"
        />

        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2A7B5F] block">
            Event Published
          </span>
          <h2 className="font-serif text-3xl font-extrabold text-[#2D1F23]">{createdEvent.title}</h2>
          <p className="text-xs text-[#756366] max-w-md mx-auto leading-relaxed">
            Your shareable registration link is live. Anyone with this link can register and answer your custom questions.
          </p>
        </div>

        {/* Share Link Row (Unboxed, only inputs and buttons) */}
        <div className="space-y-2 text-left max-w-lg mx-auto pt-2">
          <label className="block text-xs font-bold text-[#2D1F23]">Shareable Registration Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs font-mono text-[#63474D] focus:outline-none"
            />
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={handleCopyShareLink}
              icon={copiedLink ? <img src="/tick.webp" alt="Copied" className="w-4 h-4 object-contain" /> : <Copy className="w-4 h-4" />}
            >
              {copiedLink ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="pt-3 max-w-xs mx-auto">
          <Link to="/organizer" className="block w-full">
            <Button fullWidth variant="primary">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-20">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#2D1F23]">Create Event</h1>
        <p className="text-xs text-[#756366]">
          Define event details, registration questions, and capacity. The system generates a shareable registration link.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Left Column: Event Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 xl:col-span-7 space-y-8 max-w-xl">
          {/* Core Event Details (Unboxed, free spacing, concise widths) */}
          <div className="space-y-4">
            <h2 className="font-serif font-bold text-base text-[#2D1F23]">1. Event Information</h2>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">Event Title *</label>
              <input
                type="text"
                placeholder="e.g. Ethiopia Rust & Systems Engineering Workshop"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
              {errors.title && <p className="text-[11px] text-red-600 mt-1">{errors.title}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">Event Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                  className="w-48 px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                >
                  <option value="meetup">Meetup</option>
                  <option value="workshop">Workshop</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-48 px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
                {errors.date && <p className="text-[11px] text-red-600 mt-1">{errors.date}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">Start Time</label>
                <input
                  type="text"
                  placeholder="09:00 AM"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-36 px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2D1F23] mb-1">End Time</label>
                <input
                  type="text"
                  placeholder="05:00 PM"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-36 px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">Poster / Banner Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formData.posterImageUrl}
                onChange={(e) => setFormData({ ...formData, posterImageUrl: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">Location & Venue *</label>
              <input
                type="text"
                placeholder="e.g. Bole Innovation Hub, 4th Floor, Addis Ababa"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
              {errors.location && <p className="text-[11px] text-red-600 mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">Capacity Limit *</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 100"
                value={formData.capacity === 0 ? '' : formData.capacity}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, capacity: val === '' ? 0 : parseInt(val, 10) });
                }}
                className="w-36 px-3.5 py-2 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
              />
              <p className="text-[10px] text-[#756366] mt-1">Registration automatically closes when capacity is reached.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D1F23] mb-1">Description *</label>
              <textarea
                rows={7}
                placeholder="Describe agenda, prerequisites, and what attendees will learn..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] resize-y min-h-[160px]"
              ></textarea>
              {errors.description && <p className="text-[11px] text-red-600 mt-1">{errors.description}</p>}
            </div>
          </div>

          {/* 2. Admissions & Pricing (Box kept as requested) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8DDD7] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#63474D]" />
                2. Admissions & Pricing
              </h2>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                  className="w-4 h-4 text-[#63474D] rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-[#2D1F23]">Paid Event</span>
              </label>
            </div>

            {formData.isPaid && (
              <div className="p-4 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-3 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-[#2D1F23] mb-1">
                    Single Ticket Price (in ETB) *
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="1"
                      placeholder="250"
                      value={formData.ticketPrice || ''}
                      onChange={(e) => setFormData({ ...formData, ticketPrice: Number(e.target.value) })}
                      className="w-full pl-3.5 pr-14 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs font-bold text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#756366]">
                      ETB
                    </span>
                  </div>
                  {errors.ticketPrice && <p className="text-[11px] text-red-600 mt-1">{errors.ticketPrice}</p>}
                </div>
              </div>
            )}
          </div>

          {/* 3. Registration Questions (Unboxed, free spacing, customizable answer choices) */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <div>
              <h2 className="font-serif font-bold text-base text-[#2D1F23] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#63474D]" />
                Registration Questions
              </h2>
              <p className="text-xs text-[#756366] mt-0.5">
                Customize the questions and answer types (text, choice options, multi-tick) for attendees.
              </p>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 sm:p-5 bg-[#FAF7F5] rounded-2xl border border-[#E8DDD7] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#63474D] font-mono">Q{idx + 1}</span>
                      <span className="text-xs font-semibold text-[#2D1F23]">Question Details</span>
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Remove Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter question text (e.g. What is your experience level? Or GitHub URL)..."
                      value={q.questionText}
                      onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#E8DDD7] rounded-xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D]"
                    />

                    {/* Answer Type Selector */}
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
              ))}

              {/* Big, prominent Add Question button placed below all questions */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-4 px-4 bg-[#FAF7F5] hover:bg-[#F3ECE8] border-2 border-dashed border-[#AA767C]/50 hover:border-[#63474D] rounded-2xl text-xs sm:text-sm font-bold text-[#63474D] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
              >
                <Plus className="w-4 h-4 text-[#AA767C] group-hover:text-[#63474D] transition-colors" />
                <span>+ Add Question</span>
              </button>
            </div>

            {/* Smaller Publish button aligned to the right edge of registration questions */}
            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                className="text-xs font-semibold px-4 py-2 shadow-xs"
              >
                Publish Event & Generate Share Link
              </Button>
            </div>
          </div>
        </form>

        {/* Right Column: Live Poster Preview (Bigger, higher up, aligned to event title row, unboxed) */}
        <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 space-y-2">
          {formData.posterImageUrl ? (
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#756366] uppercase tracking-wider block">
                Poster Preview
              </span>
              <img
                src={formData.posterImageUrl}
                alt="Poster preview"
                className="w-full max-w-sm rounded-2xl shadow-md object-cover max-h-[480px]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
