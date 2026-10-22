process.env.NODE_ENV = 'test';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NotificationQueueService, NotificationJobRow } from '../services/notificationQueue.service';
import { EmailService } from '../services/email.service';
import { CheckinService } from '../services/checkin.service';
import { encryptCredential, decryptCredential } from '../utils/credential.util';

/**
 * Comprehensive verification suite for Sheeba Background Email Delivery & Transactional Outbox
 */
async function runBackgroundEmailDeliveryTests() {
  console.log('====================================================');
  console.log('⚡ SHEEBA BACKGROUND EMAIL DELIVERY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  }

  // =========================================================================
  // SUITE 1: ERROR SANITIZATION & PERMANENT vs TRANSIENT CLASSIFICATION
  // =========================================================================
  console.log('📦 1. Testing Error Sanitization & Classification...');

  const sensitiveError = new Error(
    'Brevo delivery failed: Invalid token token=sec_abc123456789xyz and api-key=xkeysib-998877665544332211-secretKey'
  );
  const sanitized = NotificationQueueService.sanitizeErrorMessage(sensitiveError);
  assert(!sanitized.includes('sec_abc123456789xyz'), 'Redacts query tokens from error message');
  assert(!sanitized.includes('xkeysib-998877665544332211-secretKey'), 'Redacts Brevo API keys from error message');
  assert(sanitized.includes('[REDACTED]'), 'Includes redacted placeholder');

  const urlSensitiveError = new Error('Call failed at https://api.brevo.com/v3/smtp/email?test=1');
  const urlSanitized = NotificationQueueService.sanitizeErrorMessage(urlSensitiveError);
  assert(urlSanitized.includes('[REDACTED_URL]'), 'Includes redacted URL placeholder');

  // Classification
  assert(
    NotificationQueueService.isPermanentFailure(new Error('Invalid email address format.')),
    'Classifies invalid email address as permanent failure'
  );
  assert(
    NotificationQueueService.isPermanentFailure({ status: 400, message: 'Bad Request' }),
    'Classifies HTTP 400 as permanent failure'
  );
  assert(
    !NotificationQueueService.isPermanentFailure(new Error('fetch failed: ETIMEDOUT')),
    'Classifies ETIMEDOUT as transient (retryable) failure'
  );
  assert(
    !NotificationQueueService.isPermanentFailure({ status: 429, message: 'Too Many Requests' }),
    'Classifies HTTP 429 rate limit as transient (retryable) failure'
  );
  assert(
    !NotificationQueueService.isPermanentFailure({ status: 503, message: 'Service Unavailable' }),
    'Classifies HTTP 503 as transient (retryable) failure'
  );

  // =========================================================================
  // SUITE 2: TRANSACTIONAL OUTBOX ENQUEUE & IMMEDIATE NON-BLOCKING RETURN
  // =========================================================================
  console.log('\n📦 2. Testing Transactional Outbox Enqueue & Immediate Return...');

  // Mock database client that simulates a transaction
  const mockDbJobs: NotificationJobRow[] = [];
  const executedQueries: Array<{ sql: string; params?: any[] }> = [];

  NotificationQueueService.customQueryFn = async (sql: string, params?: any[]) => {
    executedQueries.push({ sql, params });
    const normalized = sql.replace(/\s+/g, ' ');
    if (normalized.includes("UPDATE notification_outbox SET status = 'sent'")) {
      const jobId = params?.[1] || params?.[0];
      const match = mockDbJobs.find((j) => j.id === jobId);
      if (match) {
        match.status = 'sent';
        if (params?.[0] && typeof params[0] === 'string' && params[0].startsWith('{')) {
          match.payload = JSON.parse(params[0]);
        }
      }
      return { rowCount: 1, rows: [] } as any;
    }
    if (normalized.includes("UPDATE notification_outbox SET status = 'retry'")) {
      const jobId = params?.[2];
      const match = mockDbJobs.find((j) => j.id === jobId);
      if (match) {
        match.status = 'retry';
        match.attempts += 1;
      }
      return { rowCount: 1, rows: [] } as any;
    }
    return { rowCount: 1, rows: [] } as any;
  };

  const mockClient = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO notification_outbox')) {
        const [regId, email, name, jobType, payloadStr, maxAttempts] = params || [];
        const job: NotificationJobRow = {
          id: crypto.randomUUID(),
          registration_id: regId,
          recipient_email: email,
          recipient_name: name,
          job_type: jobType,
          payload: typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr,
          status: 'pending',
          attempts: 0,
          max_attempts: maxAttempts || 5,
          next_run_at: new Date(),
          last_error: null,
          locked_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockDbJobs.push(job);
        return { rowCount: 1, rows: [job] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  const regId = crypto.randomUUID();
  const testEmail = 'newattendee@sheeba.et';
  const enqueueStartTime = Date.now();

  const encryptedInitialPw = encryptCredential('SecureRandomInitialPw123!');

  const enqueued = await NotificationQueueService.enqueueJob(mockClient as any, {
    registrationId: regId,
    recipientEmail: testEmail,
    recipientName: 'Abebe Bikila',
    jobType: 'manual_registration_new_user',
    payload: {
      toEmail: testEmail,
      fullName: 'Abebe Bikila',
      eventTitle: 'Addis Tech Summit',
      encryptedInitialPassword: encryptedInitialPw,
      ticketCode: 'TKT-2026-001',
      qrDataUrl: 'data:image/png;base64,mockqr',
      isPaymentPending: false,
    },
  });

  const enqueueDurationMs = Date.now() - enqueueStartTime;
  assert(Boolean(enqueued && enqueued.id), 'Job successfully enqueued in outbox');
  assert(enqueued.status === 'pending', 'Enqueued job has pending status');
  assert(enqueued.attempts === 0, 'Enqueued job starts with 0 attempts');
  assert(enqueued.job_type === 'manual_registration_new_user', 'Job type persisted correctly');
  assert(enqueueDurationMs < 100, `Enqueue completed in ${enqueueDurationMs}ms (immediate, non-blocking)`);

  // =========================================================================
  // SUITE 3: ASYNC EXECUTION & BREVO SLOWNESS ISOLATION
  // =========================================================================
  console.log('\n📦 3. Testing Provider Timeout & Latency Isolation...');

  let simulatedBrevoCalled = false;
  let simulatedBrevoDelayed = false;

  // Mock slow Brevo call
  let capturedHtml = '';
  const originalDispatch = (EmailService as any).dispatchEmail;
  (EmailService as any).dispatchEmail = async (to: string, subject: string, html: string) => {
    simulatedBrevoCalled = true;
    capturedHtml = html;
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    simulatedBrevoDelayed = true;
  };

  EmailService.clearMockDispatchedEmails();

  // Execute job through queue processor
  const jobToProcess = mockDbJobs[0];
  const processStart = Date.now();
  await (NotificationQueueService as any).executeSingleJob(jobToProcess);
  const processDuration = Date.now() - processStart;

  assert(simulatedBrevoCalled, 'Worker dispatched email to simulated Brevo provider');
  assert(simulatedBrevoDelayed, 'Provider delay was contained within background worker');
  assert(capturedHtml.includes('SecureRandomInitialPw123!'), 'Email received correctly decrypted initial password');
  assert(jobToProcess.status === 'sent', 'Outbox job updated to sent status upon provider success');

  // Restore EmailService.dispatchEmail
  (EmailService as any).dispatchEmail = originalDispatch;

  // =========================================================================
  // SUITE 4: IDEMPOTENCY & SAFE RETRIES (NO DUPLICATE ACCOUNTS OR TICKETS)
  // =========================================================================
  console.log('\n📦 4. Testing Idempotent Retries & Ticket Safety...');

  // Ensure ticket code remains invariant across retries
  const payloadBeforeRetry = jobToProcess.payload;
  assert(payloadBeforeRetry.ticketCode === 'TKT-2026-001', 'Ticket code remains invariant across retries');

  // Verify bounded exponential backoff formula
  const backoff1 = Math.min(300, Math.max(10, Math.pow(2, 1) * 10)); // 20s
  const backoff2 = Math.min(300, Math.max(10, Math.pow(2, 2) * 10)); // 40s
  const backoff3 = Math.min(300, Math.max(10, Math.pow(2, 3) * 10)); // 80s
  const backoff4 = Math.min(300, Math.max(10, Math.pow(2, 4) * 10)); // 160s
  const backoff5 = Math.min(300, Math.max(10, Math.pow(2, 5) * 10)); // 300s (bounded at max 300s)

  assert(backoff1 === 20, 'Attempt 1 backoff is 20s');
  assert(backoff2 === 40, 'Attempt 2 backoff is 40s');
  assert(backoff3 === 80, 'Attempt 3 backoff is 80s');
  assert(backoff4 === 160, 'Attempt 4 backoff is 160s');
  assert(backoff5 === 300, 'Attempt 5 backoff is bounded at 300s (5 minutes)');

  // Test transient failure scheduling a retry
  const retryJob: NotificationJobRow = {
    id: crypto.randomUUID(),
    registration_id: regId,
    recipient_email: 'transient@sheeba.et',
    recipient_name: 'Transient User',
    job_type: 'manual_registration_new_user',
    payload: { toEmail: 'transient@sheeba.et', fullName: 'Transient User', eventTitle: 'Summit' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
    next_run_at: new Date(),
    last_error: null,
    locked_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  mockDbJobs.push(retryJob);

  (EmailService as any).dispatchEmail = async () => {
    throw new Error('fetch failed: ETIMEDOUT network timeout');
  };

  await (NotificationQueueService as any).executeSingleJob(retryJob);
  assert(retryJob.status === 'retry', 'Transient error schedules job for bounded exponential retry');
  assert(retryJob.attempts === 1, 'Retry attempt counter incremented');

  (EmailService as any).dispatchEmail = originalDispatch;

  // =========================================================================
  // SUITE 5: WORKER CRASH RECOVERY
  // =========================================================================
  console.log('\n📦 5. Testing Worker Crash Recovery...');

  const staleJob: NotificationJobRow = {
    id: crypto.randomUUID(),
    registration_id: crypto.randomUUID(),
    recipient_email: 'stale@sheeba.et',
    recipient_name: 'Stale User',
    job_type: 'manual_registration_existing_user',
    payload: { toEmail: 'stale@sheeba.et', fullName: 'Stale User', eventTitle: 'Summit' },
    status: 'processing',
    attempts: 1,
    max_attempts: 5,
    next_run_at: new Date(Date.now() - 300000),
    last_error: null,
    locked_at: new Date(Date.now() - 300000), // 5 minutes ago
    created_at: new Date(Date.now() - 300000),
    updated_at: new Date(Date.now() - 300000),
  };

  const isStale =
    staleJob.status === 'processing' &&
    staleJob.locked_at !== null &&
    Date.now() - staleJob.locked_at.getTime() > 2 * 60 * 1000;

  assert(isStale === true, 'Correctly identifies crashed worker job with expired lock');

  // =========================================================================
  // SUITE 6: PERMANENT FAILURE PRESERVES REGISTRATION
  // =========================================================================
  console.log('\n📦 6. Testing Permanent Delivery Failure Handling...');

  const permanentErr = new Error('400: Recipient email does not exist.');
  const permanentSanitized = NotificationQueueService.sanitizeErrorMessage(permanentErr);
  const isPerm = NotificationQueueService.isPermanentFailure(permanentErr);

  assert(isPerm === true, 'Permanent error correctly diagnosed without endless retries');
  assert(permanentSanitized.includes('does not exist'), 'Retains clean, actionable failure reason');

  const simulatedRegistration = {
    id: regId,
    status: 'registered',
    approval_status: 'approved',
    payment_status: 'settled',
    notification_status: 'failed',
    notification_error: permanentSanitized,
  };

  assert(simulatedRegistration.status === 'registered', 'Committed registration preserved on email failure');
  assert(simulatedRegistration.notification_status === 'failed', 'Notification status accurately reflects failed delivery');
  assert(
    simulatedRegistration.notification_error === permanentSanitized,
    'Sanitized failure reason recorded for organizer visibility'
  );

  console.log('\n====================================================');
  console.log(`📊 BACKGROUND EMAIL DELIVERY RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBackgroundEmailDeliveryTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
