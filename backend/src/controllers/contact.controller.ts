import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { EmailService } from '../services/email.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class ContactController {
  /**
   * Submit Contact Us Message
   * Saves to database and dispatches transactional email via Brevo to sheebanet.events@gmail.com
   */
  static async submitMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, subject, category, message } = req.body;
      const ipAddress = (req.ip || req.socket.remoteAddress || '').slice(0, 100);

      // 1. Persist the message in the database for reliability and audit trail
      let messageRecordId: string | null = null;
      try {
        const insertRes = await query(
          `INSERT INTO contact_messages (name, email, subject, category, message, ip_address, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'unread')
           RETURNING id, created_at`,
          [name, email, subject, category || 'General Inquiry', message, ipAddress]
        );
        messageRecordId = insertRes.rows[0]?.id || null;
      } catch (dbErr) {
        console.warn('[ContactController] ⚠️ Failed to save contact message to database, proceeding with email delivery:', dbErr);
      }

      // 2. Dispatch notification email to Sheeba Team via Brevo
      await EmailService.sendContactUsNotification({
        name,
        email,
        subject,
        category: category || 'General Inquiry',
        message,
      });

      // 3. Dispatch automated confirmation receipt to the visitor (non-blocking)
      EmailService.sendContactAcknowledgmentEmail(email, name, subject).catch((ackErr) => {
        console.warn('[ContactController] ⚠️ Acknowledgment email to visitor could not be sent:', ackErr?.message || ackErr);
      });

      sendSuccess(
        res,
        {
          id: messageRecordId,
          status: 'sent',
          deliveredTo: process.env.BREVO_SENDER_EMAIL || 'sheebanet.events@gmail.com',
        },
        'Thank you! Your message has been sent successfully. We will get back to you shortly.',
        201
      );
    } catch (error: any) {
      console.error('[ContactController] ❌ Contact submission error:', error);
      next(error);
    }
  }
}
