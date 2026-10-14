import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  ShieldCheck,
  Edit3,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ReviewModal } from './ReviewModal';
import type { EventReviewItem, EventReviewsSummary } from '../../types/review';
import { api } from '../../services/api';

interface ReviewsSectionProps {
  eventId: string;
  eventTitle: string;
  isOrganizerView?: boolean;
  isSponsorView?: boolean;
  canWriteReview?: boolean;
  currentUserId?: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  eventId,
  eventTitle,
  isOrganizerView = false,
  isSponsorView = false,
  canWriteReview = false,
  currentUserId,
}) => {
  const [summary, setSummary] = useState<EventReviewsSummary>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviews: [],
    myReview: null,
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await api.reviews.getEventReviews(eventId);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleReviewSaved = (savedReview: EventReviewItem) => {
    setSummary((prev) => {
      const exists = prev.reviews.some((r) => r.id === savedReview.id);
      const updatedList = exists
        ? prev.reviews.map((r) => (r.id === savedReview.id ? savedReview : r))
        : [savedReview, ...prev.reviews];

      const sum = updatedList.reduce((acc, curr) => acc + curr.rating, 0);
      const avg = updatedList.length > 0 ? parseFloat((sum / updatedList.length).toFixed(1)) : 0;

      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      updatedList.forEach((r) => {
        if (r.rating >= 1 && r.rating <= 5) dist[r.rating] = (dist[r.rating] || 0) + 1;
      });

      return {
        ...prev,
        averageRating: avg,
        totalReviews: updatedList.length,
        ratingDistribution: dist,
        reviews: updatedList,
        myReview: savedReview,
      };
    });
  };

  const handleReviewDeleted = () => {
    fetchReviews();
  };

  const isAuthor = Boolean(summary.myReview);

  return (
    <div className="space-y-6 w-full">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-bold text-[#2D1F23]">
              {isSponsorView
                ? 'Audited Attendee Feedback & Sentiment'
                : 'Attendee Reviews & Feedback'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#63474D]/10 text-[#63474D]">
              {summary.totalReviews} {summary.totalReviews === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {isSponsorView
              ? 'Verifiable attendee satisfaction ratings and experiential feedback for sponsor justification.'
              : isOrganizerView
              ? 'Direct feedback from registered participants. The writer can edit their own comment at any time; all views are transparent and audited.'
              : 'Authentic reviews from registered community members.'}
          </p>
        </div>

        {/* Action Button: Write or Edit Feedback */}
        {canWriteReview && (
          <div className="shrink-0">
            <Button
              onClick={() => setIsModalOpen(true)}
              variant={isAuthor ? 'outline' : 'primary'}
              size="sm"
              icon={isAuthor ? <Edit3 className="w-4 h-4 text-[#63474D]" /> : <Star className="w-4 h-4 fill-white" />}
            >
              {isAuthor ? 'Edit Your Review' : 'Write a Review'}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-28 bg-gray-100 rounded-3xl"></div>
          <div className="h-24 bg-gray-100 rounded-2xl"></div>
        </div>
      ) : summary.totalReviews === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E8DDD7] text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#63474D]/10 text-[#63474D] flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-serif font-bold text-lg text-[#2D1F23]">No Feedback Recorded Yet</h3>
            <p className="text-xs text-[#756366] leading-relaxed">
              {canWriteReview
                ? 'Be the first participant to share your feedback, highlight learnings, and rate the event experience.'
                : 'Attendees who registered for this event will be able to share structured feedback and ratings here.'}
            </p>
          </div>
          {canWriteReview && (
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              size="sm"
              icon={<Star className="w-4 h-4 fill-white" />}
            >
              Leave First Review
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Summary Box */}
          <div className="bg-[#FAF7F5] rounded-3xl p-6 border border-[#E8DDD7] grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Average Rating */}
            <div className="text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-[#E8DDD7] pb-4 md:pb-0 md:pr-6">
              <span className="text-[10px] uppercase font-bold text-[#756366] tracking-wider block">
                Overall Satisfaction Score
              </span>
              <div className="flex items-baseline justify-center md:justify-start gap-2">
                <span className="font-serif text-5xl font-extrabold text-[#2D1F23]">
                  {summary.averageRating.toFixed(1)}
                </span>
                <span className="text-gray-400 text-sm font-semibold">/ 5.0</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(summary.averageRating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-500 ml-1.5 font-medium">
                  ({summary.totalReviews} {summary.totalReviews === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            </div>

            {/* Star Distribution Breakdown */}
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.ratingDistribution[stars] || 0;
                const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-8 font-mono text-[11px] text-gray-500 shrink-0 text-right">
                      {stars} ★
                    </span>
                    <div className="flex-1 h-2 bg-gray-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-[10px] text-gray-400 text-right font-mono">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Verified Trust Endorsement */}
            <div className="space-y-2.5 bg-white/70 p-4 rounded-2xl border border-[#E8DDD7]/70 text-xs">
              <div className="flex items-center gap-2 text-[#2A7B5F] font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Audited Integrity</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Reviews are tied to verified attendee accounts. Writers maintain ownership and can edit their own comment, while others retain read-only verification.
              </p>
            </div>
          </div>

          {/* User's Own Review Banner (If Logged In Attendee has reviewed) */}
          {summary.myReview && (
            <div className="bg-[#FAF2F4] rounded-2xl p-4 border border-[#63474D]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#63474D]/10 rounded-xl text-[#63474D] mt-0.5">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2D1F23]">You reviewed this event</h4>
                  <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1 italic">
                    "{summary.myReview.comment}"
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                size="sm"
                icon={<Edit3 className="w-3.5 h-3.5 text-[#63474D]" />}
                className="shrink-0 cursor-pointer"
              >
                Edit Your Review
              </Button>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-3.5">
            {summary.reviews.map((rev) => {
              const formattedDate = new Date(rev.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const isUpdated = rev.updatedAt && rev.updatedAt !== rev.createdAt;

              return (
                <div
                  key={rev.id}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    rev.isMyReview
                      ? 'border-[#63474D]/30 shadow-xs ring-1 ring-[#63474D]/10'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3 mb-3">
                    {/* Author Details */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#63474D]/10 text-[#63474D] font-bold text-xs flex items-center justify-center shrink-0">
                        {rev.userAvatar ? (
                          <img
                            src={rev.userAvatar}
                            alt={rev.userName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          rev.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#2D1F23]">{rev.userName}</span>
                          {rev.isVerifiedAttendee && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified Attendee
                            </span>
                          )}
                          {rev.isMyReview && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#63474D] text-white">
                              Your Review
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          <span>{formattedDate}</span>
                          {isUpdated && <span className="italic">• Edited by author</span>}
                        </div>
                      </div>
                    </div>

                    {/* Star Rating & Edit Trigger (Only for author) */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-200 fill-gray-200'
                            }`}
                          />
                        ))}
                      </div>

                      {rev.isMyReview && (
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#63474D] hover:bg-[#63474D]/10 rounded-lg transition-colors cursor-pointer"
                          title="Only you as the author can edit this comment"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Body */}
                  <p className="text-xs text-[#2D1F23] leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write / Edit Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventId={eventId}
        eventTitle={eventTitle}
        existingReview={summary.myReview}
        onReviewSaved={handleReviewSaved}
        onReviewDeleted={handleReviewDeleted}
      />
    </div>
  );
};
