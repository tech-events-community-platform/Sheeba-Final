import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createReviewSchema, updateReviewSchema } from '../schemas/review.schema';

const router = Router();

router.get('/event/:eventId', optionalAuthenticate, ReviewController.getEventReviews);
router.get('/event/:eventId/my', authenticate, ReviewController.getUserReview);
router.post('/event/:eventId', authenticate, validateBody(createReviewSchema), ReviewController.submitReview);
router.patch('/:reviewId', authenticate, validateBody(updateReviewSchema), ReviewController.updateReview);
router.delete('/:reviewId', authenticate, ReviewController.deleteReview);

export default router;
