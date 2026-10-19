process.env.NODE_ENV = 'test';
import { PaymentService } from '../services/payment.service';
import { EventService } from '../services/event.service';
import { query, getClient } from '../config/db';

const runPaymentTests = async () => {
  console.log('====================================================');
  console.log('💳 LINKS.ET PAYMENT INTEGRATION & FRAUD PREVENTION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: any) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  };

  try {
    // UNIT TEST SUITE: Payment Receipt Parsing & Normalization
    console.log('📦 1. Testing Payment Receipt Extraction & Normalization (PaymentService)...');

    // 1.1 Amount parsing in various Ethiopian banking formats
    const receipt1 = PaymentService.extractReceiptDetails({
      id: 'tx_001',
      reference: 'TB1234567890',
      status: 'completed',
      receipt: {
        amount: '250.00 ETB',
        currency: 'ETB',
        creditedAccount: '100098765432',
        paidAt: '2026-10-19T10:00:00Z',
      },
    });
    assert(receipt1.amount === 250 && receipt1.currency === 'ETB', 'Parses "250.00 ETB" into numeric 250 ETB');
    assert(receipt1.status === 'COMPLETED', 'Recognizes "completed" status');
    assert(receipt1.transactionId === 'TB1234567890', 'Extracts reference as transactionId');

    // 1.2 Amount parsing with "Birr" suffix
    const receipt2 = PaymentService.extractReceiptDetails({
      reference: 'CBE_REC_99',
      receipt: {
        amount: '500 Birr',
        currency: 'birr',
      },
    });
    assert(receipt2.amount === 500 && receipt2.currency === 'ETB', 'Normalizes "500 Birr" to 500 ETB');

    // 1.3 Amount parsing when amount is a pure number
    const receipt3 = PaymentService.extractReceiptDetails({
      transactionId: 'TX_DIRECT_NUM',
      amount: 150.5,
      currency: 'ETB',
    });
    assert(receipt3.amount === 150.5 && receipt3.currency === 'ETB', 'Extracts numeric amount directly');

    // 1.4 Status check for failed/pending transactions
    const receiptFailed = PaymentService.extractReceiptDetails({
      reference: 'TX_PENDING',
      status: 'pending',
    });
    assert(receiptFailed.status === 'PENDING', 'Pending transaction is correctly identified');

    // TEST SUITE 2: Verification Logic & Fraud Prevention
    console.log('\n📦 2. Testing Fraud Prevention & Links.et Rule Validation...');

    // 2.1 Underpayment detection
    let underpaymentError: any = null;
    try {
      const originalVerify = PaymentService.verifyViaLinksEt;
      PaymentService.verifyViaLinksEt = async () => ({
        ok: true,
        receipt: {
          reference: `TX_UNDERPAY_${Date.now()}`,
          status: 'completed',
          receipt: {
            amount: 100, // Expected 250
            currency: 'ETB',
          },
        },
      });

      await PaymentService.verifyPayment({
        event: {
          id: 'test_event_1',
          title: 'Test Tech Summit',
          ticketPrice: 250,
          currency: 'ETB',
        },
        paymentReference: 'TX_UNDERPAY_TEST',
      });
      PaymentService.verifyViaLinksEt = originalVerify;
    } catch (err: any) {
      underpaymentError = err;
    }
    assert(
      underpaymentError !== null &&
      underpaymentError.statusCode === 422 &&
      underpaymentError.message.includes('Underpayment'),
      'Strictly rejects underpayment (paid 100 ETB, expected 250 ETB)'
    );

    // 2.2 Currency mismatch detection
    let currencyError: any = null;
    try {
      const originalVerify = PaymentService.verifyViaLinksEt;
      PaymentService.verifyViaLinksEt = async () => ({
        ok: true,
        receipt: {
          reference: `TX_USD_${Date.now()}`,
          status: 'completed',
          receipt: {
            amount: 250,
            currency: 'USD', // Expected ETB
          },
        },
      });

      await PaymentService.verifyPayment({
        event: {
          id: 'test_event_2',
          title: 'Test Tech Summit',
          ticketPrice: 250,
          currency: 'ETB',
        },
        paymentReference: 'TX_USD_TEST',
      });
      PaymentService.verifyViaLinksEt = originalVerify;
    } catch (err: any) {
      currencyError = err;
    }
    assert(
      currencyError !== null &&
      currencyError.statusCode === 422 &&
      currencyError.message.includes('Currency mismatch'),
      'Strictly rejects non-ETB currency payments'
    );

    // 2.3 Upstream bank lookup failure on screenshot (unverified screenshot)
    let unverifiedScreenshotError: any = null;
    try {
      const originalVerifyImage = PaymentService.verifyScreenshotViaLinksEt;
      PaymentService.verifyScreenshotViaLinksEt = async () => ({
        ok: false,
        httpStatus: 422,
        error: { message: 'Bank upstream verification failed for this receipt. Screenshot alone is not confirmed by the bank.' },
      });

      await PaymentService.verifyPayment({
        event: {
          id: 'test_event_3',
          title: 'Test Tech Summit',
          ticketPrice: 250,
          currency: 'ETB',
        },
        screenshotBase64: 'data:image/png;base64,fakeimagecontent',
      });
      PaymentService.verifyScreenshotViaLinksEt = originalVerifyImage;
    } catch (err: any) {
      unverifiedScreenshotError = err;
    }
    assert(
      unverifiedScreenshotError !== null &&
      unverifiedScreenshotError.statusCode === 422 &&
      unverifiedScreenshotError.message.includes('Bank upstream verification failed'),
      'Strictly rejects screenshot without bank network ledger confirmation'
    );

    // 2.4 Recipient account mismatch detection
    let recipientMismatchError: any = null;
    try {
      const originalVerify = PaymentService.verifyViaLinksEt;
      PaymentService.verifyViaLinksEt = async () => ({
        ok: true,
        receipt: {
          reference: `TX_RECIPIENT_MISMATCH_${Date.now()}`,
          status: 'completed',
          receipt: {
            amount: 250,
            currency: 'ETB',
            creditedAccount: '999999999999', // Organizer account is 100098765432
          },
        },
      });

      await PaymentService.verifyPayment({
        event: {
          id: 'test_event_4',
          title: 'Test Tech Summit',
          ticketPrice: 250,
          currency: 'ETB',
          paymentMethods: [
            {
              id: 'pm_1',
              provider: 'cbe',
              accountNumber: '100098765432',
              accountHolder: 'Official Organizer',
            },
          ],
        },
        paymentReference: 'TX_RECIPIENT_TEST',
      });
      PaymentService.verifyViaLinksEt = originalVerify;
    } catch (err: any) {
      recipientMismatchError = err;
    }
    assert(
      recipientMismatchError !== null &&
      recipientMismatchError.statusCode === 422 &&
      recipientMismatchError.message.includes('does not match any configured organizer destination'),
      'Strictly rejects transaction sent to wrong recipient account'
    );

    // TEST SUITE 3: Database & Event Registration Flow Integration
    console.log('\n📦 3. Testing Full Event Registration & Duplicate Replay Protection...');

    // Setup test users & paid event in DB
    const timestamp = Date.now();
    const organizerRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'testhash', 'Payment Organizer', 'ORGANIZER', true, 'approved')
       RETURNING id`,
      [`org_pay_${timestamp}@example.et`]
    );
    const organizerId = organizerRes.rows[0].id;

    const attendee1Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'testhash', 'Attendee One', 'ATTENDEE', true, 'approved')
       RETURNING id`,
      [`attendee1_pay_${timestamp}@example.et`]
    );
    const attendee1Id = attendee1Res.rows[0].id;

    const attendee2Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, approval_status)
       VALUES ($1, 'testhash', 'Attendee Two', 'ATTENDEE', true, 'approved')
       RETURNING id`,
      [`attendee2_pay_${timestamp}@example.et`]
    );
    const attendee2Id = attendee2Res.rows[0].id;

    // Create a paid event
    const paidEventRes = await query(
      `INSERT INTO events (
        title, organizer_id, event_type, event_date, start_time, end_time, location,
        description, capacity, is_paid, ticket_price, currency, status, payment_methods
       ) VALUES ($1, $2, 'summit', NOW() + INTERVAL '10 days', '09:00 AM', '05:00 PM', 'Addis Ababa',
        'Paid Summit with Links.et verification', 100, true, 300, 'ETB', 'open', $3)
       RETURNING id, share_link_token`,
      [
        `Ethiopia Cloud Summit ${timestamp}`,
        organizerId,
        JSON.stringify([
          {
            id: 'pm_cbe',
            provider: 'cbe',
            accountNumber: '100012345678',
            accountHolder: 'Sheeba Org',
          },
        ]),
      ]
    );
    const paidEventId = paidEventRes.rows[0].id;

    // 3.1 Registration without payment on paid event should request payment
    const missingPaymentReg = await EventService.registerForEvent({
      eventId: paidEventId,
      userId: attendee1Id,
    });
    assert(
      missingPaymentReg.isPaymentRequired === true && missingPaymentReg.ticket === null,
      'Paid event without payment evidence returns isPaymentRequired: true'
    );

    // 3.2 Registration with valid verified transaction reference
    const uniqueTxId = `TX_VALID_${timestamp}`;
    const originalVerifyViaLinksEt = PaymentService.verifyViaLinksEt;
    PaymentService.verifyViaLinksEt = async () => ({
      ok: true,
      receipt: {
        reference: uniqueTxId,
        status: 'completed',
        receipt: {
          amount: 300,
          currency: 'ETB',
          creditedAccount: '100012345678',
          paidAt: new Date().toISOString(),
        },
      },
    });

    const successfulReg = await EventService.registerForEvent({
      eventId: paidEventId,
      userId: attendee1Id,
      paymentReference: uniqueTxId,
      paymentMethod: 'cbe',
    });

    assert(
      successfulReg.ticket !== null && successfulReg.ticket.status === 'Valid',
      'Successful payment verification generates valid ticket pass'
    );
    assert(
      successfulReg.verifiedPayment?.transactionId === uniqueTxId,
      'Returns verified payment details with transactionId'
    );

    // Check payment record in database
    const paymentRecordRes = await query(
      'SELECT * FROM payments WHERE transaction_id = $1 AND event_id = $2',
      [uniqueTxId, paidEventId]
    );
    assert(
      paymentRecordRes.rowCount === 1 && String(paymentRecordRes.rows[0].status).toUpperCase() === 'SETTLED',
      'Payment recorded atomically in payments table with status settled'
    );

    // 3.3 Duplicate transaction prevention (Attempting to reuse uniqueTxId for attendee2)
    let duplicateReplayError: any = null;
    try {
      await EventService.registerForEvent({
        eventId: paidEventId,
        userId: attendee2Id,
        paymentReference: uniqueTxId, // REUSING SAME TRANSACTION ID
        paymentMethod: 'cbe',
      });
    } catch (err: any) {
      duplicateReplayError = err;
    }
    assert(
      duplicateReplayError !== null &&
      duplicateReplayError.statusCode === 409 &&
      duplicateReplayError.message.includes('has already been used'),
      'Strictly blocks duplicate transaction replay with HTTP 409 Conflict'
    );

    // 3.4 Screenshot OCR verification flow
    const screenshotTxId = `TX_SCREENSHOT_${timestamp}`;
    const originalVerifyScreenshot = PaymentService.verifyScreenshotViaLinksEt;
    PaymentService.verifyScreenshotViaLinksEt = async () => ({
      ok: true,
      providerKey: 'cbe',
      receipt: {
        reference: screenshotTxId,
        status: 'completed',
        transferredAmount: 300,
        currency: 'ETB',
        receiverAccount: '100012345678',
        paymentDate: new Date().toISOString(),
      },
    });

    const screenshotReg = await EventService.registerForEvent({
      eventId: paidEventId,
      userId: attendee2Id,
      screenshotBase64: 'data:image/png;base64,validreceiptimage',
      screenshotUrl: 'https://res.cloudinary.com/sheeba/receipts/sample.png',
      paymentMethod: 'cbe',
    });

    assert(
      screenshotReg.ticket !== null && screenshotReg.ticket.status === 'Valid',
      'Verified screenshot with upstream confirmation issues valid ticket pass'
    );

    const screenshotPaymentRecord = await query(
      'SELECT * FROM payments WHERE transaction_id = $1 AND event_id = $2',
      [screenshotTxId, paidEventId]
    );
    assert(
      screenshotPaymentRecord.rowCount === 1 &&
      screenshotPaymentRecord.rows[0].screenshot_url === 'https://res.cloudinary.com/sheeba/receipts/sample.png',
      'Stores screenshot_url in payments table alongside verified transaction'
    );

    // Restore original methods
    PaymentService.verifyViaLinksEt = originalVerifyViaLinksEt;
    PaymentService.verifyScreenshotViaLinksEt = originalVerifyScreenshot;

    // Cleanup test records
    await query('DELETE FROM tickets WHERE event_id = $1', [paidEventId]);
    await query('DELETE FROM payments WHERE event_id = $1', [paidEventId]);
    await query('DELETE FROM registrations WHERE event_id = $1', [paidEventId]);
    await query('DELETE FROM events WHERE id = $1', [paidEventId]);
    await query('DELETE FROM users WHERE id IN ($1, $2, $3)', [organizerId, attendee1Id, attendee2Id]);

  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 PAYMENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runPaymentTests();
