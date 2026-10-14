import React, { useState, useEffect } from 'react';
import { Star, X, Check, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { EventReviewItem } from '../../types/review';
import { api } from '../../services/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  existingReview?: EventReviewItem | null;
  onReviewSaved: (savedReview: EventReviewItem) => void;
  onReviewDeleted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Fair Experience',
  3: 'Good Event',
  4: 'Great Experience',
  5: 'Exceptional Event',
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  existingReview,
  onReviewSaved,
  onReviewDeleted,
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(existingReview?.isAnonymous || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
      setIsAnonymous(existingReview.isAnonymous);
    } else {
      setRating(5);
      setComment('');
      setIsAnonymous(false);
    }
    setError(null);
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 3) {
      setError('Please provide at least 3 characters of feedback.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let saved: EventReviewItem;
      if (existingReview) {
        saved = await api.reviews.updateReview(existingReview.id, {
          rating,
          comment: comment.trim(),
          isAnonymous,
        });
      } else {
        saved = await api.reviews.submitReview(eventId, {
          rating,
          comment: comment.trim(),
          isAnonymous,
        });
      }
      onReviewSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview) return;
    if (!window.confirm('Are you sure you want to delete your feedback?')) return;

    setLoading(true);
    try {
      await api.reviews.deleteReview(existingReview.id);
      if (onReviewDeleted) onReviewDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete review.');
    } finally {
      setLoading(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E8DDD7] transition-all transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#FAF7F5]">
          <div>
            <h3 className="font-serif font-bold text-xl text-[#2D1F23]">
              {existingReview ? 'Edit Your Feedback' : 'Leave Event Feedback'}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{eventTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Selector */}
          <div className="space-y-2 text-center py-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
              Your Overall Rating
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 transition-transform hover:scale-115 focus:outline-none cursor-pointer"
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= activeRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-100 hover:text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-[#63474D] h-4">
              {RATING_LABELS[activeRating] || ''}
            </p>
          </div>

          {/* Review Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[#2D1F23]">Detailed Review & Insights</label>
              <span className="text-gray-400 text-[11px]">{comment.length}/2000</span>
            </div>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you learn? How was the organization, speaker, venue, or content quality? Honest feedback helps organizers and sponsors make future editions even better."
              className="w-full p-3.5 bg-[#FAF7F5] border border-[#E8DDD7] rounded-2xl text-xs text-[#2D1F23] focus:outline-none focus:ring-2 focus:ring-[#63474D] placeholder:text-gray-400 resize-none leading-relaxed"
              maxLength={2000}
              required
            />
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#2D1F23] block">Display Anonymously</span>
              <span className="text-[11px] text-gray-500 block">
                Your feedback will show as "Verified Participant" to other attendees.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#63474D]"></div>
            </label>
          </div>

          {/* Trust notice */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Only you can edit or update your feedback at any time.</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {existingReview ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 cursor-pointer transition-colors"
              >
                Delete Feedback
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || comment.trim().length < 3}
                icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              >
                {loading ? 'Saving...' : existingReview ? 'Save Changes' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
