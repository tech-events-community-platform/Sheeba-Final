import { PoolClient } from 'pg';
import { query, getClient } from '../config/db';
import { EmailService } from './email.service';
import { decryptCredential } from '../utils/credential.util';

export type NotificationJobType =
  | 'manual_registration_new_user'
  | 'manual_registration_existing_user';

export type NotificationJobStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'retry';

export interface NotificationJobRow {
  id: string;
  registration_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  job_type: NotificationJobType;
  payload: Record<string, any>;
  status: NotificationJobStatus;
  attempts: number;
  max_attempts: number;
  next_run_at: Date;
  last_error: string | null;
  locked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface EnqueueJobParams {
  registrationId?: string | null;
  recipientEmail: string;
  recipientName?: string | null;
  jobType: NotificationJobType;
  payload: Record<string, any>;
  maxAttempts?: number;
}

export class NotificationQueueService {
  private static workerInterval: NodeJS.Timeout | null = null;
  private static isProcessingBatch = false;
  private static tableEnsured = false;
  public static customQueryFn: typeof query | null = null;

  public static async runQuery<T extends any = any>(text: string, params?: any[]): Promise<any> {
    if (this.customQueryFn) {
      return this.customQueryFn(text, params);
    }
    return query(text, params);
  }

  /**
   * Sanitizes any raw exception message to protect credentials, auth tokens, and URLs
   */
  public static sanitizeErrorMessage(err: any): string {
    if (!err) return 'Unknown error occurred during email delivery.';
    const raw = String(err?.message || err || '');
    // Strip authorization tokens, reset-password query parameters, or long URLs
    const sanitized = raw
      .replace(/token=[a-zA-Z0-9_\-]+/gi, 'token=[REDACTED]')
      .replace(/api-key=[a-zA-Z0-9_\-]+/gi, 'api-key=[REDACTED]')
      .replace(/xkeysib-[a-zA-Z0-9_\-]+/gi, '[REDACTED_API_KEY]')
      .replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]')
      .trim();

    // Bound length to 255 chars
    return sanitized.length > 255 ? `${sanitized.substring(0, 252)}...` : sanitized;
  }

  /**
   * Determines whether an error is permanent (do not retry) or transient (retry with backoff)
   */
  public static isPermanentFailure(err: any): boolean {
    const message = (err?.message || '').toLowerCase();
    const status = err?.status || err?.statusCode || 0;

    // Bad request or syntax error
    if (status === 400 || status === 404 || status === 422) return true;
    if (message.includes('invalid email') || message.includes('malformed') || message.includes('syntax')) {
      return true;
    }
    if (message.includes('not a valid email') || message.includes('does not exist')) {
      return true;
    }
    // Brevo API permanent rejection
    if (message.includes('unauthorized sender') || message.includes('domain not verified')) {
      return true;
    }

    // Default to transient (network timeout, rate limit 429, 5xx server error, ECONNRESET, etc.)
    return false;
  }

  /**
   * Ensure outbox table exists in database
   */
  public static async ensureTableExists(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await this.runQuery(`
        CREATE TABLE IF NOT EXISTS notification_outbox (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
          recipient_email VARCHAR(255) NOT NULL,
          recipient_name VARCHAR(255),
          job_type VARCHAR(50) NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'retry')),
          attempts INT NOT NULL DEFAULT 0,
          max_attempts INT NOT NULL DEFAULT 5,
          next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_error TEXT,
          locked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_notification_outbox_poll ON notification_outbox(status, next_run_at);
        CREATE INDEX IF NOT EXISTS idx_notification_outbox_reg_id ON notification_outbox(registration_id);
      `);
      this.tableEnsured = true;
    } catch (err: any) {
      console.warn('[NotificationQueue] Warning during table initialization check:', err?.message || err);
    }
  }

  /**
   * Enqueue a notification job. Supports passing a transactional client so the job is committed
   * atomically in the exact same database transaction as the registration.
   */
  public static async enqueueJob(
    dbClient: PoolClient | { query: typeof query },
    params: EnqueueJobParams
  ): Promise<NotificationJobRow> {
    await this.ensureTableExists();

    const {
      registrationId = null,
      recipientEmail,
      recipientName = null,
      jobType,
      payload,
      maxAttempts = 5,
    } = params;

    const cleanEmail = recipientEmail.toLowerCase().trim();

    const insertSql = `
      INSERT INTO notification_outbox (
        registration_id,
        recipient_email,
        recipient_name,
        job_type,
        payload,
        status,
        attempts,
        max_attempts,
        next_run_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', 0, $6, NOW())
      RETURNING *
    `;

    const res = await (dbClient as any).query(insertSql, [
      registrationId,
      cleanEmail,
      recipientName,
      jobType,
      JSON.stringify(payload),
      maxAttempts,
    ]);

    return res.rows[0];
  }

  /**
   * Non-blocking trigger called immediately after the registration transaction commits.
   * Wakes up the worker via setImmediate to deliver the email without waiting.
   */
  public static triggerAsyncProcessing(): void {
    setImmediate(() => {
      this.processNextBatch().catch((err) => {
        console.warn('[NotificationQueue] Error in background trigger processing:', err?.message || err);
      });
    });
  }

  /**
   * Claims and processes the next batch of queued jobs using FOR UPDATE SKIP LOCKED
   */
  public static async processNextBatch(batchSize = 10): Promise<number> {
    if (this.isProcessingBatch) {
      return 0;
    }
    this.isProcessingBatch = true;

    try {
      await this.ensureTableExists();

      // Atomically claim claimable jobs (pending or retry past due, or expired lock > 5m)
      const claimQuery = `
        WITH claimable AS (
          SELECT id FROM notification_outbox
          WHERE status IN ('pending', 'retry')
            AND next_run_at <= NOW()
            AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE notification_outbox
        SET status = 'processing',
            locked_at = NOW(),
            updated_at = NOW()
        WHERE id IN (SELECT id FROM claimable)
        RETURNING *;
      `;

      const claimedRes = await this.runQuery<NotificationJobRow>(claimQuery, [batchSize]);
      const jobs = claimedRes.rows;

      if (!jobs || jobs.length === 0) {
        return 0;
      }

      for (const job of jobs) {
        await this.executeSingleJob(job);
      }

      return jobs.length;
    } catch (err: any) {
      console.warn('[NotificationQueue] Error claiming or processing batch:', err?.message || err);
      return 0;
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Executes a single claimed job, dispatching through EmailService and updating lifecycle state
   */
  private static async executeSingleJob(job: NotificationJobRow): Promise<void> {
    const startTime = Date.now();
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload || {};

    try {
      console.log(`[NotificationQueue] 🚀 Processing Job ${job.id} (${job.job_type}) for ${job.recipient_email}...`);

      if (job.job_type === 'manual_registration_new_user') {
        let initialPassword = payload.initialPassword;
        if (!initialPassword && payload.encryptedInitialPassword) {
          try {
            const decrypted = decryptCredential(payload.encryptedInitialPassword);
            if (decrypted) {
              initialPassword = decrypted;
            }
          } catch (decryptErr) {
            console.warn(`[NotificationQueue] Failed to decrypt initial password for job ${job.id}:`, decryptErr);
          }
        }

        await EmailService.sendManualRegistrationNewUserEmail({
          toEmail: payload.toEmail || job.recipient_email,
          fullName: payload.fullName || job.recipient_name || '',
          eventTitle: payload.eventTitle || '',
          initialPassword: initialPassword || undefined,
          passwordSetupLink: payload.passwordSetupLink || undefined,
          ticketCode: payload.ticketCode,
          qrDataUrl: payload.qrDataUrl,
          isPaymentPending: payload.isPaymentPending,
          eventId: payload.eventId,
        });
      } else if (job.job_type === 'manual_registration_existing_user') {
        await EmailService.sendManualRegistrationExistingUserEmail({
          toEmail: payload.toEmail || job.recipient_email,
          fullName: payload.fullName || job.recipient_name || '',
          eventTitle: payload.eventTitle || '',
          ticketCode: payload.ticketCode,
          qrDataUrl: payload.qrDataUrl,
          isPaymentPending: payload.isPaymentPending,
          eventId: payload.eventId,
        });
      } else {
        throw new Error(`Unsupported notification job type: ${job.job_type}`);
      }

      const elapsedMs = Date.now() - startTime;
      console.log(`[NotificationQueue] ✅ Job ${job.id} dispatched successfully in ${elapsedMs}ms.`);

      // Sanitize temporary credential material upon successful delivery
      const sanitizedPayload = { ...payload };
      delete sanitizedPayload.encryptedInitialPassword;
      delete sanitizedPayload.initialPassword;

      // Mark outbox job as sent and purge credentials from storage
      await this.runQuery(
        `UPDATE notification_outbox
         SET status = 'sent',
             locked_at = NULL,
             last_error = NULL,
             payload = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(sanitizedPayload), job.id]
      );

      // Update associated registration record if present
      if (job.registration_id) {
        await this.runQuery(
          `UPDATE registrations
           SET notification_status = 'sent',
               notification_sent_at = NOW(),
               notification_error = NULL
           WHERE id = $1`,
          [job.registration_id]
        );
      }
    } catch (deliveryErr: any) {
      const elapsedMs = Date.now() - startTime;
      const sanitizedError = this.sanitizeErrorMessage(deliveryErr);
      const isPermanent = this.isPermanentFailure(deliveryErr);
      const nextAttempt = job.attempts + 1;
      const hasExceededAttempts = nextAttempt >= job.max_attempts;

      console.warn(
        `[NotificationQueue] ⚠️ Job ${job.id} failed after ${elapsedMs}ms (attempt ${nextAttempt}/${job.max_attempts}). Permanent: ${isPermanent}. Error: ${sanitizedError}`
      );

      if (isPermanent || hasExceededAttempts) {
        // Permanently failed: wipe temporary credential material from storage
        const sanitizedPayload = { ...payload };
        delete sanitizedPayload.encryptedInitialPassword;
        delete sanitizedPayload.initialPassword;

        await this.runQuery(
          `UPDATE notification_outbox
           SET status = 'failed',
               attempts = attempts + 1,
               locked_at = NULL,
               last_error = $1,
               payload = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [sanitizedError, JSON.stringify(sanitizedPayload), job.id]
        );

        if (job.registration_id) {
          await this.runQuery(
            `UPDATE registrations
             SET notification_status = 'failed',
                 notification_error = $1
             WHERE id = $2`,
            [sanitizedError, job.registration_id]
          );
        }
      } else {
        // Schedule bounded exponential retry: min 10s, max 300s (e.g. 20s, 40s, 80s, 160s, 300s)
        const backoffSeconds = Math.min(300, Math.max(10, Math.pow(2, nextAttempt) * 10));

        await this.runQuery(
          `UPDATE notification_outbox
           SET status = 'retry',
               attempts = attempts + 1,
               next_run_at = NOW() + ($1 || ' seconds')::INTERVAL,
               locked_at = NULL,
               last_error = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [backoffSeconds, sanitizedError, job.id]
        );

        if (job.registration_id) {
          await this.runQuery(
            `UPDATE registrations
             SET notification_status = 'pending',
                 notification_error = $1
             WHERE id = $2`,
            [`Retrying (${nextAttempt}/${job.max_attempts}): ${sanitizedError}`, job.registration_id]
          );
        }
      }
    }
  }

  /**
   * Recovers stranded jobs after a process crash/restart
   */
  public static async recoverStaleJobs(): Promise<number> {
    try {
      await this.ensureTableExists();
      const res = await this.runQuery(
        `UPDATE notification_outbox
         SET status = 'pending',
             locked_at = NULL,
             updated_at = NOW()
         WHERE status = 'processing'
           AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '2 minutes')
         RETURNING id`
      );
      if (res.rowCount && res.rowCount > 0) {
        console.log(`[NotificationQueue] 🔄 Recovered ${res.rowCount} stale job(s) from previous server execution.`);
      }
      return res.rowCount || 0;
    } catch (err: any) {
      console.warn('[NotificationQueue] Warning during stale job recovery:', err?.message || err);
      return 0;
    }
  }

  /**
   * Starts periodic polling worker for retries and crash recovery
   */
  public static startQueueWorker(intervalMs = 15000): void {
    if (this.workerInterval) return;

    // Do not start persistent interval in test mode
    if (process.env.NODE_ENV === 'test') return;

    console.log(`[NotificationQueue] 🚀 Background Email Queue Worker started (polling every ${intervalMs / 1000}s).`);

    // Recover stale jobs immediately on startup
    this.recoverStaleJobs()
      .then(() => this.processNextBatch())
      .catch(() => {});

    this.workerInterval = setInterval(() => {
      this.processNextBatch().catch((err) => {
        console.warn('[NotificationQueue] Periodic queue processor error:', err?.message || err);
      });
    }, intervalMs);

    // Ensure worker doesn't block node process exit
    if (this.workerInterval.unref) {
      this.workerInterval.unref();
    }
  }

  /**
   * Stops periodic polling worker
   */
  public static stopQueueWorker(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
      console.log('[NotificationQueue] 🛑 Background Email Queue Worker stopped.');
    }
  }
}
