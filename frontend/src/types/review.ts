export interface EventReviewItem {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  isVerifiedAttendee: boolean;
  isMyReview?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventReviewsSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  reviews: EventReviewItem[];
  myReview?: EventReviewItem | null;
}
