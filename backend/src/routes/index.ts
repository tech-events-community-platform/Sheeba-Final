import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import eventRoutes from './event.routes';
import ticketRoutes from './ticket.routes';
import checkinRoutes from './checkin.routes';
import badgeRoutes from './badge.routes';
import reportRoutes from './report.routes';
import adminRoutes from './admin.routes';
import searchRoutes from './search.routes';
import sponsorshipRoutes from './sponsorship.routes';
import contactRoutes from './contact.routes';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Sheba API is running smoothly.',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/checkin', checkinRoutes);
router.use('/badges', badgeRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);
router.use('/search', searchRoutes);
router.use('/sponsorships', sponsorshipRoutes);
router.use('/contact', contactRoutes);

export default router;
