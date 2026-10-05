import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { validateBody } from '../middlewares/validate.middleware';
import { contactMessageSchema } from '../schemas/contact.schema';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for contact submissions to protect Brevo quota and prevent spam:
// 10 submissions per 15 minutes per IP (disabled in development/test)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') return true;
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  message: {
    success: false,
    message: 'Too many messages sent from this IP. Please wait a few minutes before trying again.',
  },
});

router.post(
  '/',
  contactLimiter,
  validateBody(contactMessageSchema),
  ContactController.submitMessage
);

export default router;
