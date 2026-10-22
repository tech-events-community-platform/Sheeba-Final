import { getFrontendUrl } from '../config/env';

export interface EmailAttachment {
  name: string;
  content: string; // Base64 encoded file content without data URL prefix
  cid?: string;    // Content-ID for inline images (e.g., qr-ticket-SHB-DEVFEST-001.png)
  type?: string;   // MIME type, e.g. 'image/png'
}

/**
 * Email Service for Sheeba Platform
 * Powered by Brevo Transactional Email API (https://api.brevo.com/v3/smtp/email)
 */
export class EmailService {
  public static mockDispatchedEmails: Array<{
    to: string;
    subject: string;
    html: string;
    recipientName?: string;
    replyTo?: { email: string; name?: string };
    attachments?: EmailAttachment[];
    timestamp: Date;
  }> = [];

  public static clearMockDispatchedEmails(): void {
    EmailService.mockDispatchedEmails = [];
  }

  /**
   * Core email dispatcher using Brevo REST API
   */
  private static async dispatchEmail(
    to: string,
    subject: string,
    html: string,
    recipientName?: string,
    replyTo?: { email: string; name?: string },
    attachments?: EmailAttachment[]
  ): Promise<void> {
    // CRITICAL SECURITY SAFEGUARD: Never send real Brevo emails during test runs
    if (process.env.NODE_ENV === 'test') {
      console.log(`[EmailService] 🧪 [TEST MOCK] Simulated email to: ${to} | Subject: "${subject}"`);
      EmailService.mockDispatchedEmails.push({
        to,
        subject,
        html,
        recipientName,
        replyTo,
        attachments: attachments || [],
        timestamp: new Date(),
      });
      return;
    }

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'sheebanet.events@gmail.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Sheeba';

    console.log(`\n======================================================`);
    console.log(`[EmailService] 📧 Dispatching Email to: ${to}`);
    console.log(`[EmailService] 📋 Subject: ${subject}`);
    console.log(`[EmailService] 🚀 Provider: Brevo (Sender: ${senderName} <${senderEmail}>)`);
    if (replyTo) {
      console.log(`[EmailService] ↩️ Reply-To: ${replyTo.name || replyTo.email} <${replyTo.email}>`);
    }
    console.log(`======================================================\n`);

    if (!apiKey) {
      const errorMsg = 'Email delivery failed: BREVO_API_KEY is not configured on the backend.';
      console.warn(`[EmailService] ⚠️ ${errorMsg}`);
      throw new Error('Email service is temporarily unavailable. Please try again later.');
    }

    try {
      const payload: any = {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: to,
            name: recipientName || to,
          },
        ],
        subject,
        htmlContent: html,
      };

      if (replyTo && replyTo.email) {
        payload.replyTo = {
          email: replyTo.email,
          name: replyTo.name || replyTo.email,
        };
      }

      if (attachments && attachments.length > 0) {
        payload.attachment = attachments.map((att) => ({
          name: att.name,
          content: att.content,
        }));
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(
          `[EmailService] ⚠️ Brevo API responded with error status ${response.status}:`,
          (errorData as any)?.message || response.statusText
        );
        throw new Error((errorData as any)?.message || 'Failed to deliver email through Brevo service.');
      }

      const resJson: any = await response.json().catch(() => ({}));
      console.log(`[EmailService] ✅ Email successfully delivered via Brevo (MessageId: ${resJson.messageId || 'OK'}) to ${to}`);
    } catch (error: any) {
      console.warn(`[EmailService] ⚠️ Brevo email dispatch error:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Attendee Registration OTP Email
   * Subject: Verify your Sheeba account
   * Expires in 3 minutes
   */
  static async sendAttendeeRegistrationOtpEmail(toEmail: string, otpCode: string, fullName?: string): Promise<void> {
    const expirationMinutes = parseInt(process.env.OTP_EXPIRATION_MINUTES || '3', 10);
    const subject = 'Verify your Sheeba account';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Verify your email address</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            Hello ${fullName || 'Attendee'},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            Thank you for creating an account with Sheeba. Please use the 6-digit verification code below to complete your attendee registration:
          </p>

          <div style="background-color: #FAF7F5; border: 2px dashed #63474D; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #63474D; display: inline-block;">
              ${otpCode}
            </span>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #AA767C; font-weight: 600;">
              ⏱️ This code will expire in ${expirationMinutes} minutes.
            </p>
          </div>

          <div style="background-color: #FFF8F6; border-left: 4px solid #FFA686; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #63474D; line-height: 1.5;">
              <strong>Security Notice:</strong> For your security, never share this verification code with anyone. Sheeba team members will never ask for your code.
            </p>
          </div>

          <p style="font-size: 13px; color: #756366; line-height: 1.5; margin: 20px 0 0 0;">
            If you did not attempt to register on Sheeba, you can safely ignore this email.
          </p>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 28px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Forgot Password OTP Email
   * Subject: Reset your Sheeba password
   * Expires in 3 minutes
   */
  static async sendForgotPasswordOtpEmail(toEmail: string, otpCode: string, fullName?: string): Promise<void> {
    const expirationMinutes = parseInt(process.env.OTP_EXPIRATION_MINUTES || '3', 10);
    const subject = 'Reset your Sheeba password';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Reset your password</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            Hello ${fullName || 'User'},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            We received a request to reset the password for your Sheeba account. Use the 6-digit verification code below to verify your identity and choose a new password:
          </p>

          <div style="background-color: #FAF7F5; border: 2px dashed #63474D; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #63474D; display: inline-block;">
              ${otpCode}
            </span>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #AA767C; font-weight: 600;">
              ⏱️ This code will expire in ${expirationMinutes} minutes.
            </p>
          </div>

          <div style="background-color: #FFF8F6; border-left: 4px solid #FFA686; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #63474D; line-height: 1.5;">
              <strong>Security Notice:</strong> If you did not request a password reset, you can safely ignore this email. Never share your verification code with anyone.
            </p>
          </div>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 28px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Password Changed Confirmation Email
   * Subject: Your Sheeba password has been changed
   */
  static async sendPasswordChangedNotificationEmail(toEmail: string, fullName?: string): Promise<void> {
    const subject = 'Your Sheeba password has been changed';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Password Changed Successfully</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            Hello ${fullName || 'User'},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            This email confirms that the password for your Sheeba account has been successfully changed. You can now use your new password to log in.
          </p>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${getFrontendUrl()}/login" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Sign In to Sheeba
            </a>
          </div>

          <div style="background-color: #FFF8F6; border-left: 4px solid #FFA686; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #63474D; line-height: 1.5;">
              <strong>Security Notice:</strong> If you did not make this change, please contact Sheeba support immediately to secure your account.
            </p>
          </div>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 28px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Welcome Email (Dispatched after attendee registration verification is complete)
   */
  static async sendWelcomeEmail(toEmail: string, fullName: string): Promise<void> {
    const subject = 'Welcome to Sheeba!';
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 16px;">
        <h1 style="color: #63474D; font-size: 24px; margin-bottom: 16px;">Welcome to Sheeba!</h1>
        <p>Hello ${fullName},</p>
        <p>Your attendee account has been verified and created successfully.</p>
        <p>Sheeba is an event platform for verifiable attendance credentials and community tech events in Ethiopia.</p>
        <div style="margin: 24px 0;">
          <a href="${getFrontendUrl()}/app" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Open Your Sheeba Dashboard
          </a>
        </div>
        <p style="font-size: 12px; color: #756366; margin-top: 32px;">Sheeba Platform • Ethiopian Tech Community Credentials</p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Registration Confirmation Email for Events
   */
  static async sendRegistrationConfirmationEmail(
    toEmail: string,
    fullName: string,
    eventTitle: string,
    date: string,
    time: string,
    location: string
  ): Promise<void> {
    const subject = `You're registered for ${eventTitle}`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 16px;">
        <h1 style="color: #63474D; font-size: 24px; margin-bottom: 8px;">Registration Confirmed</h1>
        <h2 style="font-size: 20px; font-weight: bold; margin-top: 0; color: #2D1F23;">You're registered for ${eventTitle}</h2>
        <p>Hello ${fullName},</p>
        <p>Your registration is confirmed! Here are the event details:</p>
        
        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 6px 0;"><strong>Event:</strong> ${eventTitle}</p>
          <p style="margin: 6px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 6px 0;"><strong>Time:</strong> ${time}</p>
          <p style="margin: 6px 0;"><strong>Location:</strong> ${location}</p>
        </div>

        <p style="font-size: 14px; color: #63474D; font-weight: bold;">
          Important: Verified badges unlock when the organizer checks you in at the door!
        </p>

        <div style="margin: 24px 0;">
          <a href="${getFrontendUrl()}/app/badges" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Your Badges & Passes
          </a>
        </div>
        <p style="font-size: 12px; color: #756366; margin-top: 32px;">Sheeba Platform • Ethiopian Tech Community Credentials</p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Dedicated email for manually added event registrations
   */
  static async sendManualRegistrationTicketEmail(params: {
    toEmail: string;
    fullName: string;
    eventTitle: string;
    date: string;
    time: string;
    location: string;
    ticketCode: string;
    qrDataUrl?: string;
    isExistingUser: boolean;
  }): Promise<void> {
    const { toEmail, fullName, eventTitle, date, time, location, ticketCode, qrDataUrl, isExistingUser } = params;
    const frontendUrl = getFrontendUrl();
    const actionUrl = isExistingUser
      ? `${frontendUrl}/login?email=${encodeURIComponent(toEmail)}`
      : `${frontendUrl}/register?email=${encodeURIComponent(toEmail)}`;

    const cleanTicketCode = (ticketCode || 'PASS').replace(/[^a-zA-Z0-9_-]/g, '');
    const qrCid = `qr-ticket-${cleanTicketCode}.png`;
    const attachments: EmailAttachment[] = [];

    if (qrDataUrl) {
      const base64Content = qrDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      attachments.push({
        name: qrCid,
        content: base64Content,
        cid: qrCid,
        type: 'image/png',
      });
    }

    const subject = `Event Registration & Ticket: ${eventTitle}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">You've been registered for ${eventTitle}!</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Hello ${fullName},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            The event organizer has registered you for <strong>${eventTitle}</strong>. Your official entry pass and QR ticket have been generated.
          </p>

          <div style="background-color: #FAF7F5; border: 1px solid #E8DDD7; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 6px 0; font-size: 14px;"><strong>Event:</strong> ${eventTitle}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Time:</strong> ${time}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Location:</strong> ${location}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Ticket Code:</strong> <span style="font-family: monospace; font-weight: bold; color: #63474D;">${ticketCode}</span></p>
          </div>

          ${
            qrDataUrl
              ? `
          <div style="text-align: center; margin: 24px 0; padding: 16px; background-color: #FAF7F5; border-radius: 16px; border: 1px solid #E8DDD7;">
            <p style="font-size: 12px; font-weight: bold; color: #63474D; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Your QR Entry Pass</p>
            <img src="cid:${qrCid}" alt="QR Ticket Code" width="180" height="180" style="width: 180px; height: 180px; max-width: 100%; display: inline-block; border-radius: 8px; aspect-ratio: 1/1;" />
            <p style="font-size: 11px; color: #756366; margin-top: 8px;">Present this QR code at the event door for scan verification & check-in.</p>
          </div>
          `
              : ''
          }

          <div style="background-color: #FFF8F6; border-left: 4px solid #63474D; padding: 14px 16px; border-radius: 6px; margin: 24px 0;">
            <p style="margin: 0; font-size: 13px; color: #63474D; line-height: 1.5;">
              ${
                isExistingUser
                  ? `<strong>Account Ready:</strong> Sign in with your registered email <strong>${toEmail}</strong> to view your ticket and pass anytime on your dashboard.`
                  : `<strong>Account Setup Required:</strong> Use your registered email <strong>${toEmail}</strong> to create/finish setting up your Sheeba account and access your dashboard pass.`
              }
            </p>
          </div>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${actionUrl}" style="background-color: #63474D; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
              ${isExistingUser ? 'Sign In & View Ticket' : 'Complete Account Setup'}
            </a>
          </div>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 28px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName, undefined, attachments);
  }

  /**
   * Email A: Manual Registration for Existing Sheeba Account
   * Never includes any password, password hash, reset token, or credential-recovery secret.
   */
  static async sendManualRegistrationExistingUserEmail(params: {
    toEmail: string;
    fullName: string;
    eventTitle: string;
    ticketCode?: string;
    qrDataUrl?: string;
    isPaymentPending?: boolean;
    eventId?: string;
  }): Promise<void> {
    const { toEmail, fullName, eventTitle, ticketCode, qrDataUrl, isPaymentPending } = params;
    const frontendUrl = getFrontendUrl();
    const loginUrl = `${frontendUrl}/login`;

    const cleanTicketCode = (ticketCode || 'PASS').replace(/[^a-zA-Z0-9_-]/g, '');
    const qrCid = `qr-ticket-${cleanTicketCode}.png`;
    const attachments: EmailAttachment[] = [];

    if (!isPaymentPending && qrDataUrl) {
      const base64Content = qrDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      attachments.push({
        name: qrCid,
        content: base64Content,
        cid: qrCid,
        type: 'image/png',
      });
    }

    const subject = isPaymentPending
      ? `Registration Confirmation: ${eventTitle} (Payment Pending)`
      : `Registration Confirmation: ${eventTitle}`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <p style="color: #2D1F23; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Hello ${fullName || 'Attendee'},</p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            You have been successfully registered for <strong>${eventTitle}</strong> by the event organizer.
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            Please log in using your existing Sheeba credentials to access your account, review event details, and view your registration pass.
          </p>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${loginUrl}" style="background-color: #63474D; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; -webkit-text-size-adjust: none;">
              Login to Sheeba
            </a>
          </div>

          ${
            isPaymentPending
              ? `<div style="background-color: #FFFBEB; border-left: 4px solid #D97706; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
                   <p style="margin: 0; font-size: 13px; color: #92400E; line-height: 1.5;">
                     <strong>Payment Status: Pending.</strong> Your registration has been recorded. Once your payment is verified or settled through an authorized channel, your active dynamic entrance QR pass will be unlocked in your Sheeba dashboard.
                   </p>
                 </div>`
              : !isPaymentPending && qrDataUrl
              ? `
          <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #FAF7F5; border-radius: 16px; border: 1px solid #E8DDD7;">
            <p style="font-size: 12px; font-weight: bold; color: #63474D; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Your Entrance Pass</p>
            <img src="cid:${qrCid}" alt="QR Ticket Code" width="180" height="180" style="width: 180px; height: 180px; max-width: 100%; display: inline-block; border-radius: 8px; aspect-ratio: 1/1;" />
            ${ticketCode ? `<p style="font-size: 13px; font-family: monospace; font-weight: bold; color: #63474D; margin: 8px 0 0 0;">Pass Code: ${ticketCode}</p>` : ''}
            <p style="font-size: 11px; color: #756366; margin-top: 8px;">Present this QR code on event day for instant check-in verification.</p>
          </div>
          `
              : ''
          }

          <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
            We look forward to seeing you there!
          </p>
          <p style="color: #2D1F23; font-weight: 600; margin: 20px 0 0 0; font-size: 14px;">
            Best regards,<br />
            The Sheeba Team
          </p>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 28px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName, undefined, attachments);
  }

  /**
   * Email B: Manual Registration for NEW Attendee Account
   * Delivers cryptographically generated random initial password and requires password change.
   */
  static async sendManualRegistrationNewUserEmail(params: {
    toEmail: string;
    fullName: string;
    eventTitle: string;
    initialPassword?: string;
    passwordSetupLink?: string;
    ticketCode?: string;
    qrDataUrl?: string;
    isPaymentPending?: boolean;
    eventId?: string;
  }): Promise<void> {
    const { toEmail, fullName, eventTitle, initialPassword, passwordSetupLink, ticketCode, qrDataUrl, isPaymentPending } = params;
    const frontendUrl = getFrontendUrl();
    const loginUrl = `${frontendUrl}/login`;

    const cleanTicketCode = (ticketCode || 'PASS').replace(/[^a-zA-Z0-9_-]/g, '');
    const qrCid = `qr-ticket-${cleanTicketCode}.png`;
    const attachments: EmailAttachment[] = [];

    if (!isPaymentPending && qrDataUrl) {
      const base64Content = qrDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      attachments.push({
        name: qrCid,
        content: base64Content,
        cid: qrCid,
        type: 'image/png',
      });
    }

    const subject = 'Your Sheeba Account and Event Registration';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <p style="color: #2D1F23; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Hello ${fullName || 'Attendee'},</p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            You have been successfully registered for <strong>${eventTitle}</strong> by the event organizer.
          </p>

          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Your Sheeba account has been created. You can log in using the credentials below:
          </p>

          <div style="background-color: #FAF7F5; border: 1px solid #E8DDD7; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #2D1F23;">
              <strong>Email:</strong> <span style="font-family: monospace; color: #63474D;">${toEmail}</span>
            </p>
            ${
              initialPassword
                ? `
            <p style="margin: 0; font-size: 14px; color: #2D1F23;">
              <strong>Initial password:</strong> <code style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 15px; font-weight: bold; background-color: #FFFFFF; padding: 4px 10px; border-radius: 6px; border: 1px solid #E8DDD7; color: #63474D; display: inline-block;">${initialPassword}</code>
            </p>
            `
                : passwordSetupLink
                ? `
            <p style="margin: 0; font-size: 13px; color: #63474D;">
              <a href="${passwordSetupLink}" style="color: #63474D; font-weight: bold;">Set your password here</a>
            </p>
            `
                : ''
            }
          </div>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${loginUrl}" style="background-color: #63474D; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; -webkit-text-size-adjust: none;">
              Login to Sheeba
            </a>
          </div>

          <div style="background-color: #FFF8F6; border-left: 4px solid #FFA686; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #63474D; line-height: 1.5; font-weight: bold;">
              Security Requirement:
            </p>
            <p style="margin: 0; font-size: 12px; color: #63474D; line-height: 1.5;">
              For your security, please change your password immediately after your first login. Do not share your password with anyone.
            </p>
          </div>

          <p style="color: #555; line-height: 1.6; margin: 16px 0; font-size: 14px;">
            Once logged in, you can view your account and event registration. Your QR ticket will be available according to the event's registration, approval, and payment rules.
          </p>

          ${
            isPaymentPending
              ? `<div style="background-color: #FFFBEB; border-left: 4px solid #D97706; padding: 14px 16px; border-radius: 6px; margin: 20px 0;">
                   <p style="margin: 0; font-size: 13px; color: #92400E; line-height: 1.5;">
                     <strong>Registration Status: Pending Payment / Review.</strong> Your registration has been recorded. Once your payment is verified or settled by the organizer, your active entrance QR ticket will be unlocked in your Sheeba dashboard.
                   </p>
                 </div>`
              : !isPaymentPending && qrDataUrl
              ? `
          <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #FAF7F5; border-radius: 16px; border: 1px solid #E8DDD7;">
            <p style="font-size: 12px; font-weight: bold; color: #63474D; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Your QR Entrance Pass</p>
            <img src="cid:${qrCid}" alt="QR Ticket Code" width="180" height="180" style="width: 180px; height: 180px; max-width: 100%; display: inline-block; border-radius: 8px; aspect-ratio: 1/1;" />
            ${ticketCode ? `<p style="font-size: 13px; font-family: monospace; font-weight: bold; color: #63474D; margin: 8px 0 0 0;">Pass Code: ${ticketCode}</p>` : ''}
            <p style="font-size: 11px; color: #756366; margin-top: 8px;">Present this QR code on event day for instant check-in verification.</p>
          </div>
          `
              : ''
          }

          <p style="color: #2D1F23; font-weight: bold; margin: 24px 0 0 0; font-size: 15px;">
            Welcome to Sheeba!
          </p>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 28px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName, undefined, attachments);
  }

  /**
   * Password reset request email (link-based fallback)
   */
  static async sendPasswordResetEmail(toEmail: string, resetToken: string, fullName: string): Promise<void> {
    const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Sheeba Password';
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 16px;">
        <h2 style="color: #63474D;">Password Reset Request</h2>
        <p>Hello ${fullName},</p>
        <p>We received a request to reset your Sheeba account password. Click the link below to choose a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 12px; color: #756366;">This link expires in 1 hour. If you did not make this request, you can safely ignore this email.</p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Sponsor OTP Code Email (6-digit verification code)
   */
  static async sendSponsorOtpEmail(toEmail: string, otpCode: string, fullName: string): Promise<void> {
    const expirationMinutes = parseInt(process.env.OTP_EXPIRATION_MINUTES || '3', 10);
    const subject = `Your Sheeba Password Reset Code: ${otpCode}`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 20px; font-weight: bold; color: #63474D; letter-spacing: 1px;">SHEEBA SPONSOR PORTAL</span>
        </div>
        <h2 style="color: #2D1F23; font-size: 22px; margin-top: 0;">Password Reset Verification</h2>
        <p>Hello ${fullName || 'Partner'},</p>
        <p style="color: #555; line-height: 1.5;">You requested to reset your password for your Sheeba Sponsor Account. Use the 6-digit verification code below to complete the reset:</p>
        
        <div style="background-color: #FFFFFF; border: 2px dashed #63474D; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #63474D;">
            ${otpCode}
          </span>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #756366;">Valid for ${expirationMinutes} minutes</p>
        </div>

        <p style="font-size: 13px; color: #666; line-height: 1.5;">
          If you did not request this verification code, please ignore this email or contact support. Never share your OTP code with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #E8DDD7; margin: 28px 0;" />
        <p style="font-size: 11px; color: #99878B; text-align: center;">
          Sheeba Corporate Partnerships • Ethiopian Technology & Startup Ecosystem
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Sponsor Application Received Email
   */
  static async sendSponsorApplicationReceivedEmail(toEmail: string, fullName: string, companyName: string): Promise<void> {
    const subject = `Sponsor Application Received: ${companyName}`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <h2 style="color: #63474D; font-size: 22px; margin-top: 0;">Sponsor Application Received</h2>
        <p>Hello ${fullName},</p>
        <p>Thank you for applying to partner with Sheeba on behalf of <strong>${companyName}</strong>.</p>
        <p>Your corporate sponsor application has been submitted and is currently being reviewed by the Sheeba Administration team. We review each sponsor profile to ensure aligned partnerships with tech events and hackathons across Ethiopia.</p>
        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 13px;"><strong>Company:</strong> ${companyName}</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Representative:</strong> ${fullName}</p>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Status:</strong> Pending Administrator Review</p>
        </div>
        <p style="font-size: 13px; color: #555;">You will receive an email confirmation as soon as your account is approved and activated.</p>
        <p style="font-size: 12px; color: #756366; margin-top: 32px;">Sheeba Platform • Ethiopian Tech Community Credentials</p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Sponsor Account Approved Email
   */
  static async sendSponsorApprovalEmail(toEmail: string, fullName: string, companyName: string): Promise<void> {
    const subject = `🎉 Your Sheeba Sponsor Account Has Been Approved!`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <h2 style="color: #2A7B5F; font-size: 22px; margin-top: 0;">Welcome, Corporate Partner!</h2>
        <p>Hello ${fullName},</p>
        <p>Great news! Your sponsor account for <strong>${companyName}</strong> has been approved by Sheeba Administration.</p>
        <p>You can now sign in to your dedicated Sponsor Dashboard to explore sponsorship opportunities, view verified attendee analytics, and collaborate with top tech community organizers.</p>
        <div style="margin: 28px 0;">
          <a href="${getFrontendUrl()}/sponsor/auth" style="background-color: #63474D; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
            Access Sponsor Dashboard
          </a>
        </div>
        <p style="font-size: 12px; color: #756366; margin-top: 32px;">Sheeba Platform • Ethiopian Tech Community Credentials</p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Sponsor Account Rejected Email
   */
  static async sendSponsorRejectionEmail(toEmail: string, fullName: string, companyName: string): Promise<void> {
    const subject = `Update on Your Sheeba Sponsor Application`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <h2 style="color: #63474D; font-size: 22px; margin-top: 0;">Sponsor Application Update</h2>
        <p>Hello ${fullName},</p>
        <p>Thank you for your interest in partnering with Sheeba for <strong>${companyName}</strong>.</p>
        <p>After review, the Sheeba Administration was unable to approve your application at this time. If you believe this was an error or would like to submit additional information regarding your organization, please contact us directly at <a href="mailto:partnerships@sheeba.et">partnerships@sheeba.et</a>.</p>
        <p style="font-size: 12px; color: #756366; margin-top: 32px;">Sheeba Platform • Ethiopian Tech Community Credentials</p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Contact Us Notification Email to Sheeba Team
   * Dispatched to the organization email (BREVO_SENDER_EMAIL) when a visitor submits the contact form.
   */
  static async sendContactUsNotification(data: {
    name: string;
    email: string;
    subject: string;
    category?: string;
    message: string;
  }): Promise<void> {
    const teamEmail = process.env.BREVO_SENDER_EMAIL || 'sheebanet.events@gmail.com';
    const emailSubject = `📬 [Contact Us] ${data.category ? `[${data.category}] ` : ''}${data.subject} - from ${data.name}`;
    const formattedDate = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">New Contact Form Submission</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(99, 71, 77, 0.04);">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0E8E4; padding-bottom: 16px; margin-bottom: 20px;">
            <span style="display: inline-block; background-color: #F3EAE6; color: #63474D; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px;">
              ${data.category || 'General Inquiry'}
            </span>
            <span style="font-size: 12px; color: #99878B;">
              ${formattedDate} EAT
            </span>
          </div>

          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 16px; line-height: 1.3;">
            ${data.subject}
          </h2>

          <div style="background-color: #FAF7F5; border-left: 4px solid #63474D; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #756366;">
              <strong style="color: #2D1F23;">From:</strong> ${data.name} &lt;<a href="mailto:${data.email}" style="color: #63474D; text-decoration: underline;">${data.email}</a>&gt;
            </p>
            <p style="margin: 0; font-size: 13px; color: #756366;">
              <strong style="color: #2D1F23;">Topic:</strong> ${data.category || 'General Inquiry'}
            </p>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #AA767C; margin-bottom: 8px;">
              Message Content:
            </p>
            <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #333; background-color: #FAF7F5; border: 1px solid #E8DDD7; border-radius: 12px; padding: 18px;">${data.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 13px; display: inline-block;">
              Reply Directly to ${data.name}
            </a>
          </div>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 24px; line-height: 1.4;">
          This message was sent from the Sheeba Contact Us portal.<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(
      teamEmail,
      emailSubject,
      htmlBody,
      'Sheeba Team',
      { email: data.email, name: data.name }
    );
  }

  /**
   * Confirmation / Auto-response receipt to the visitor
   */
  static async sendContactAcknowledgmentEmail(toEmail: string, fullName: string, subject: string): Promise<void> {
    const emailSubject = `We received your message: "${subject}"`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Thank you for contacting Sheeba!</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Hello ${fullName},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            We have received your message regarding <strong>"${subject}"</strong>. Our team reviews every inquiry and will get back to you promptly, typically within 24 hours.
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            In the meantime, feel free to explore upcoming community tech events, hackathons, and verifiable credentials on the Sheeba platform.
          </p>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${getFrontendUrl()}" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
              Visit Sheeba Platform
            </a>
          </div>

          <div style="background-color: #FFF8F6; border-left: 4px solid #FFA686; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
            <p style="margin: 0; font-size: 12px; color: #63474D; line-height: 1.5;">
              <strong>Note:</strong> If you did not submit this message or need urgent assistance, reach out directly to <a href="mailto:sheebanet.events@gmail.com" style="color: #63474D; font-weight: 600;">sheebanet.events@gmail.com</a>.
            </p>
          </div>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 24px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, emailSubject, htmlBody, fullName);
  }

  /**
   * Application Received (Pending Review) Email
   */
  static async sendApplicationSubmittedPendingEmail(
    toEmail: string,
    fullName: string,
    eventTitle: string
  ): Promise<void> {
    const subject = `Application Received: ${eventTitle}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="display: inline-block; background-color: #FFF8F6; color: #AA767C; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #E8DDD7;">
            Under Review
          </div>
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Application Received for ${eventTitle}</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Hello ${fullName},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Thank you for applying to attend <strong>${eventTitle}</strong>. The organizer is currently reviewing attendee applications to curate the event cohort.
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            You will receive an email as soon as your application status is updated. If accepted, your official dynamic QR entrance pass will be issued immediately.
          </p>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${getFrontendUrl()}/app/events" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
              View Application Status
            </a>
          </div>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 24px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Application Approved Email
   */
  static async sendApplicationApprovedEmail(
    toEmail: string,
    fullName: string,
    eventTitle: string,
    date: string,
    time: string,
    location: string,
    isPaid: boolean,
    ticketPrice: number,
    actionUrl: string
  ): Promise<void> {
    const subject = isPaid
      ? `Application Approved: Complete Payment for ${eventTitle}`
      : `Application Approved! Your pass for ${eventTitle} is ready`;

    const ctaText = isPaid ? `Pay ${ticketPrice} ETB & Claim Ticket` : 'View Your QR Entrance Pass';
    const ctaSubtext = isPaid
      ? `Your application has been accepted! Please complete payment of <strong>${ticketPrice} ETB</strong> to generate and unlock your verifiable entrance QR ticket.`
      : `Congratulations! Your application has been approved by the organizer. Your official dynamic QR entrance pass has been generated and is ready in your wallet.`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="display: inline-block; background-color: #E8F5E9; color: #2E7D32; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #C8E6C9;">
            Application Approved
          </div>
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">You're In! Welcome to ${eventTitle}</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Hello ${fullName},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            ${ctaSubtext}
          </p>

          <div style="background-color: #FAF7F5; border: 1px solid #E8DDD7; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 6px 0; font-size: 13px;"><strong>Event:</strong> ${eventTitle}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Time:</strong> ${time}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Venue:</strong> ${location}</p>
            ${isPaid ? `<p style="margin: 6px 0; font-size: 13px;"><strong>Ticket Fee:</strong> ${ticketPrice} ETB</p>` : ''}
          </div>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${actionUrl}" style="background-color: #63474D; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              ${ctaText}
            </a>
          </div>

          <p style="font-size: 12px; color: #756366; text-align: center; margin-top: 16px;">
            Present your QR pass at the entrance on event day for instant verification and automated badge issuance.
          </p>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 24px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }

  /**
   * Application Rejected Notification Email
   */
  static async sendApplicationRejectedEmail(
    toEmail: string,
    fullName: string,
    eventTitle: string,
    reason?: string
  ): Promise<void> {
    const subject = `Update on your registration for ${eventTitle}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #2D1F23; background-color: #FAF7F5; border-radius: 20px; border: 1px solid #E8DDD7;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #63474D; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Sheeba</h1>
          <p style="font-size: 13px; color: #756366; margin: 4px 0 0 0;">Event Organization & Verifiable Credentials</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E8DDD7; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <h2 style="color: #2D1F23; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Registration Update for ${eventTitle}</h2>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Hello ${fullName},
          </p>
          <p style="color: #555; line-height: 1.6; margin: 0 0 16px 0; font-size: 14px;">
            Thank you for your interest in attending <strong>${eventTitle}</strong>. Due to limited venue capacity and cohort size constraints, the organizing team was unable to accept your application for this specific session.
          </p>
          ${reason ? `<div style="background-color: #FAF7F5; border-left: 4px solid #63474D; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #2D1F23;">${reason}</div>` : ''}
          <p style="color: #555; line-height: 1.6; margin: 0 0 20px 0; font-size: 14px;">
            We encourage you to explore other upcoming community hackathons, tech meetups, and workshops hosted on Sheeba.
          </p>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${getFrontendUrl()}" style="background-color: #63474D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
              Browse Upcoming Events
            </a>
          </div>
        </div>

        <p style="font-size: 11px; color: #99878B; text-align: center; margin-top: 24px; line-height: 1.4;">
          Sheeba Platform • Ethiopian Tech Community Credentials<br />
          Addis Ababa, Ethiopia
        </p>
      </div>
    `;

    await this.dispatchEmail(toEmail, subject, htmlBody, fullName);
  }
}
