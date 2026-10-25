import { query, getClient } from '../config/db';
import { ExhibitorService } from '../services/exhibitor.service';
import crypto from 'crypto';

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runExhibitorReceiptWorkflowTests() {
  console.log('====================================================');
  console.log('🏢 SHEEBA EXHIBITORS: STAGE 6H END-TO-END AUDIT SUITE');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const testIds: {
    org1Id?: string;
    org2Id?: string;
    exhibitor1Id?: string;
    exhibitor2Id?: string;
    eventId?: string;
    callId?: string;
    vendor1Id?: string;
    freeVendorId?: string;
  } = {};

  try {
    // 0. Setup test users
    console.log('📦 0. Setting up test users and event fixtures...');
    const org1Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status, organizer_approval_status)
       VALUES ($1, 'hash', 'Primary Organizer', 'organizer', 'approved', 'approved')
       RETURNING id`,
      [`org1_${timestamp}@sheeba.et`]
    );
    testIds.org1Id = org1Res.rows[0].id;

    const org2Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status, organizer_approval_status)
       VALUES ($1, 'hash', 'Unrelated Organizer', 'organizer', 'approved', 'approved')
       RETURNING id`,
      [`org2_${timestamp}@sheeba.et`]
    );
    testIds.org2Id = org2Res.rows[0].id;

    const exh1Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status)
       VALUES ($1, 'hash', 'Exhibitor Alpha', 'exhibitor', 'approved')
       RETURNING id`,
      [`exh1_${timestamp}@sheeba.et`]
    );
    testIds.exhibitor1Id = exh1Res.rows[0].id;

    const exh2Res = await query(
      `INSERT INTO users (email, password_hash, full_name, role, approval_status)
       VALUES ($1, 'hash', 'Exhibitor Beta', 'exhibitor', 'approved')
       RETURNING id`,
      [`exh2_${timestamp}@sheeba.et`]
    );
    testIds.exhibitor2Id = exh2Res.rows[0].id;

    // Create event owned by org1
    const eventRes = await query(
      `INSERT INTO events (title, description, event_date, location, organizer_id, status, capacity)
       VALUES ($1, 'Addis Trade Expo 2026', NOW() + interval '30 days', 'Millennium Hall', $2, 'open', 500)
       RETURNING id`,
      [`Trade Expo ${timestamp}`, testIds.org1Id]
    );
    testIds.eventId = eventRes.rows[0].id;

    // Create open exhibitor call with paymentConfig
    const callRes = await query(
      `INSERT INTO exhibitor_calls (
         event_id, is_enabled, status, pricing_mode, total_space_sqm,
         price_per_sqm, sheeba_cut_percent, max_exhibitors, payment_config
       ) VALUES ($1, true, 'open', 'per_sqm', 100, 1000, 30, 20, $2::jsonb)
       RETURNING id`,
      [
        testIds.eventId,
        JSON.stringify({
          allowManual: true,
          instructions: 'Transfer to Telebirr or CBE',
          destinations: [
            { provider: 'telebirr', accountNumber: '0911000000', accountHolder: 'Addis Expo Org', label: 'Main' },
          ],
        }),
      ]
    );
    testIds.callId = callRes.rows[0].id;

    // Exhibitor 1 applies for paid booth (10 sqm = 10,000 ETB)
    const appRes = await ExhibitorService.applyForBooth(testIds.exhibitor1Id!, testIds.eventId!, {
      businessName: 'Alpha Tech PLC',
      category: 'Software',
      contactName: 'Abebe Alpha',
      contactEmail: `exh1_${timestamp}@sheeba.et`,
      showcaseDescription: 'Enterprise ERP software demonstrations',
      spaceSqm: 10,
    });
    testIds.vendor1Id = appRes.id;

    assert(appRes.status === 'pending', 'Application initially created with pending status');
    assert(parseFloat(String((appRes as any).totalFinalAmount || appRes.total_final_amount)) === 13000, 'Calculates correct total final amount (10,000 ETB space + 3,000 ETB Sheeba cut = 13,000 ETB)');

    // -------------------------------------------------------------
    // Scenario 12A: Unapproved/pending booth cannot submit receipts
    // -------------------------------------------------------------
    console.log('\n🔒 Testing Scenario 12A: Unapproved application cannot submit receipts...');
    let pendingSubmissionFailed = false;
    try {
      await ExhibitorService.submitBoothReceipt(testIds.exhibitor1Id!, testIds.vendor1Id!, {
        receiptUrl: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/test_receipt.jpg',
        transactionReference: 'TX_PREMATURE_123',
      });
    } catch (err: any) {
      pendingSubmissionFailed = true;
      assert(err.statusCode === 400, 'Pending application receipt submission rejected with 400');
    }
    assert(pendingSubmissionFailed, 'Pending application cannot bypass approval to submit payment');

    // Organizer accepts application
    console.log('\n👔 Organizer accepts application...');
    const acceptedVendor = await ExhibitorService.updateVendor(testIds.org1Id!, testIds.eventId!, testIds.vendor1Id!, {
      status: 'accepted_awaiting_payment',
    });
    assert(acceptedVendor.status === 'accepted_awaiting_payment', 'Vendor moved to accepted_awaiting_payment');

    // -------------------------------------------------------------
    // Scenario 11: Free booths do not require receipts
    // -------------------------------------------------------------
    console.log('\n🎟️ Testing Scenario 11: Free booth handling...');
    // Create a free application (0 price)
    const freeVendorRes = await query(
      `INSERT INTO event_vendors (
         event_id, user_id, source, business_name, contact_name, contact_email,
         showcase_description, space_sqm, organizer_price_per_sqm, sheeba_cut_percent,
         total_organizer_amount, total_cut_amount, total_final_amount, status
       ) VALUES ($1, $2, 'applied', 'Free Startup Booth', 'Chala Free', 'chala@startup.et',
         'Open source community demo', 5, 0, 0, 0, 0, 0, 'accepted_awaiting_payment')
       RETURNING id`,
      [testIds.eventId, testIds.exhibitor2Id]
    );
    testIds.freeVendorId = freeVendorRes.rows[0].id;

    let freeReceiptFailed = false;
    try {
      await ExhibitorService.submitBoothReceipt(testIds.exhibitor2Id!, testIds.freeVendorId!, {
        receiptUrl: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/free_receipt.jpg',
        transactionReference: 'TX_FREE_999',
      });
    } catch (err: any) {
      freeReceiptFailed = true;
      assert(err.statusCode === 400, 'Free booth receipt submission correctly rejected with 400');
    }
    assert(freeReceiptFailed, 'Free booths cannot submit payment receipts');

    // -------------------------------------------------------------
    // Scenario 5: Cross-user submission and history access blocked
    // -------------------------------------------------------------
    console.log('\n🛡️ Testing Scenario 5: Exhibitor isolation (no cross-user submission/viewing)...');
    let crossSubmitFailed = false;
    try {
      await ExhibitorService.submitBoothReceipt(testIds.exhibitor2Id!, testIds.vendor1Id!, {
        receiptUrl: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/hacked_receipt.jpg',
        transactionReference: 'TX_HACK_123',
      });
    } catch (err: any) {
      crossSubmitFailed = true;
      assert(err.statusCode === 404, 'Cross-user submission rejected with 404 unauthorized');
    }
    assert(crossSubmitFailed, 'Exhibitor cannot submit receipt for another user’s booth');

    let crossHistoryFailed = false;
    try {
      await ExhibitorService.getBoothReceiptHistory(testIds.exhibitor2Id!, testIds.vendor1Id!);
    } catch (err: any) {
      crossHistoryFailed = true;
      assert(err.statusCode === 404, 'Cross-user history access rejected with 404 unauthorized');
    }
    assert(crossHistoryFailed, 'Exhibitor cannot view another user’s booth receipt history');

    // -------------------------------------------------------------
    // Scenario 1: Exhibitor submits a receipt for an approved paid booth
    // -------------------------------------------------------------
    console.log('\n📄 Testing Scenario 1: Submitting receipt for approved paid booth...');
    const receipt1 = await ExhibitorService.submitBoothReceipt(testIds.exhibitor1Id!, testIds.vendor1Id!, {
      receiptUrl: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/receipt_attempt1.jpg',
      transactionReference: 'CBE-TXN-001234',
      paymentMethod: 'cbe_birr',
      notes: 'Paid from Commercial Bank of Ethiopia mobile app',
    });

    assert(receipt1.payment.status === 'PENDING', 'Payment record created with PENDING status');
    assert(receipt1.payment.payment_type === 'exhibitor_booth', 'Payment type is exhibitor_booth');
    assert(parseFloat(receipt1.payment.amount) === 13000, 'Payment amount matches booth total final amount (13,000 ETB)');
    assert(receipt1.payment.screenshot_url.includes('receipt_attempt1.jpg'), 'Preserves Cloudinary screenshot URL');

    // Verify unverified claim was NOT written to event_vendors.payment_reference
    const vendorCheck1 = await query('SELECT payment_reference, status, payment_status FROM event_vendors WHERE id = $1', [testIds.vendor1Id]);
    assert(vendorCheck1.rows[0].payment_reference === null, 'Unverified bank reference was NOT written to event_vendors.payment_reference');
    assert(vendorCheck1.rows[0].payment_status === 'unpaid', 'Vendor payment_status remains unpaid');
    assert(vendorCheck1.rows[0].status === 'accepted_awaiting_payment', 'Vendor status remains accepted_awaiting_payment');

    // -------------------------------------------------------------
    // Scenario 2: Second submission blocked while receipt is pending
    // -------------------------------------------------------------
    console.log('\n🚫 Testing Scenario 2: Second submission blocked while receipt is pending...');
    let duplicateBlocked = false;
    try {
      await ExhibitorService.submitBoothReceipt(testIds.exhibitor1Id!, testIds.vendor1Id!, {
        receiptUrl: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/receipt_attempt2.jpg',
        transactionReference: 'CBE-TXN-DUP',
      });
    } catch (err: any) {
      duplicateBlocked = true;
      assert(err.statusCode === 409, 'Duplicate pending receipt blocked with 409 Conflict');
      assert(err.code === 'RECEIPT_ALREADY_PENDING', 'Error code is RECEIPT_ALREADY_PENDING');
    }
    assert(duplicateBlocked, 'Second receipt submission correctly blocked while pending');

    // -------------------------------------------------------------
    // Scenario 3: Organizer can view receipt history for managed event
    // -------------------------------------------------------------
    console.log('\n👀 Testing Scenario 3: Organizer view receipt history...');
    const orgReceipts = await ExhibitorService.getVendorReceiptHistory(testIds.org1Id!, testIds.eventId!, testIds.vendor1Id!);
    assert(orgReceipts.length === 1, 'Organizer retrieves exactly 1 receipt submission');
    assert(orgReceipts[0].transactionReference === 'CBE-TXN-001234', 'Receipt history includes claimed transaction reference');
    assert(orgReceipts[0].status === 'PENDING', 'Receipt status is PENDING');

    // -------------------------------------------------------------
    // Scenario 4: Unrelated organizer cannot access or review receipts
    // -------------------------------------------------------------
    console.log('\n⛔ Testing Scenario 4: Unrelated organizer cannot access or review receipts...');
    let unauthOrgHistoryFailed = false;
    try {
      await ExhibitorService.getVendorReceiptHistory(testIds.org2Id!, testIds.eventId!, testIds.vendor1Id!);
    } catch (err: any) {
      unauthOrgHistoryFailed = true;
      assert(err.statusCode === 403 || err.statusCode === 404, 'Unrelated organizer history access forbidden (403/404)');
    }
    assert(unauthOrgHistoryFailed, 'Unrelated organizer blocked from viewing receipt history');

    let unauthOrgVerifyFailed = false;
    try {
      await ExhibitorService.verifyBoothReceipt(testIds.org2Id!, testIds.eventId!, testIds.vendor1Id!, {
        confirmedCleared: true,
      });
    } catch (err: any) {
      unauthOrgVerifyFailed = true;
      assert(err.statusCode === 403 || err.statusCode === 404, 'Unrelated organizer verification forbidden (403/404)');
    }
    assert(unauthOrgVerifyFailed, 'Unrelated organizer blocked from verifying receipt');

    let unauthOrgRejectFailed = false;
    try {
      await ExhibitorService.rejectBoothReceipt(testIds.org2Id!, testIds.eventId!, testIds.vendor1Id!, {
        rejectionReason: 'Unauthorized rejection attempt',
      });
    } catch (err: any) {
      unauthOrgRejectFailed = true;
      assert(err.statusCode === 403 || err.statusCode === 404, 'Unrelated organizer rejection forbidden (403/404)');
    }
    assert(unauthOrgRejectFailed, 'Unrelated organizer blocked from rejecting receipt');

    // -------------------------------------------------------------
    // Scenario 8: Verification fails unless confirmedCleared: true
    // -------------------------------------------------------------
    console.log('\n⚠️ Testing Scenario 8: Verification fails without confirmedCleared: true...');
    let verifyWithoutConfirmationFailed = false;
    try {
      await ExhibitorService.verifyBoothReceipt(testIds.org1Id!, testIds.eventId!, testIds.vendor1Id!, {
        confirmedCleared: false as any,
      });
    } catch (err: any) {
      verifyWithoutConfirmationFailed = true;
      assert(err.statusCode === 400, 'Verification rejected with 400 when confirmedCleared is false');
      assert(err.code === 'CONFIRMATION_REQUIRED', 'Error code is CONFIRMATION_REQUIRED');
    }
    assert(verifyWithoutConfirmationFailed, 'Verification fails safely without explicit confirmation');

    // -------------------------------------------------------------
    // Scenario 6: Organizer rejects a receipt with a valid reason
    // -------------------------------------------------------------
    console.log('\n❌ Testing Scenario 6: Organizer rejects receipt...');
    let shortReasonFailed = false;
    try {
      await ExhibitorService.rejectBoothReceipt(testIds.org1Id!, testIds.eventId!, testIds.vendor1Id!, {
        rejectionReason: 'no',
      });
    } catch (err: any) {
      shortReasonFailed = true;
      assert(err.statusCode === 400, 'Rejection reason under 3 characters rejected with 400');
    }
    assert(shortReasonFailed, 'Enforces minimum 3-character rejection reason');

    const rejectRes = await ExhibitorService.rejectBoothReceipt(testIds.org1Id!, testIds.eventId!, testIds.vendor1Id!, {
      rejectionReason: 'Reference CBE-TXN-001234 not found in bank transaction statement.',
    });
    assert(rejectRes.success === true, 'Receipt rejection succeeds');
    assert(rejectRes.payment.status === 'FAILED', 'Payment record status marked as FAILED');
    assert(rejectRes.payment.failure_reason === 'Reference CBE-TXN-001234 not found in bank transaction statement.', 'Rejection reason saved in failure_reason');

    const vendorAfterReject = await query('SELECT status, payment_status, payment_reference FROM event_vendors WHERE id = $1', [testIds.vendor1Id]);
    assert(vendorAfterReject.rows[0].status === 'accepted_awaiting_payment', 'Vendor status remains accepted_awaiting_payment after receipt rejection');
    assert(vendorAfterReject.rows[0].payment_status === 'unpaid', 'Vendor payment_status remains unpaid');
    assert(vendorAfterReject.rows[0].payment_reference === null, 'Vendor payment_reference remains null');

    // -------------------------------------------------------------
    // Scenario 7: Resubmission after rejection without losing history
    // -------------------------------------------------------------
    console.log('\n🔄 Testing Scenario 7: Resubmission after rejection & history preservation...');
    const receipt2 = await ExhibitorService.submitBoothReceipt(testIds.exhibitor1Id!, testIds.vendor1Id!, {
      receiptUrl: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/receipt_attempt2_corrected.pdf',
      transactionReference: 'CBE-TXN-CORRECTED-99',
      paymentMethod: 'telebirr',
      notes: 'Resubmitted with correct Telebirr transfer slip',
    });

    assert(receipt2.payment.status === 'PENDING', 'New payment created with PENDING status');
    assert(receipt2.payment.screenshot_url.includes('.pdf'), 'Supports PDF receipt document upload');

    // Check complete history
    const exhibitorHistory = await ExhibitorService.getBoothReceiptHistory(testIds.exhibitor1Id!, testIds.vendor1Id!);
    assert(exhibitorHistory.length === 2, 'History contains both submissions (no overwrites)');
    assert(exhibitorHistory[0].status === 'PENDING', 'Latest submission is PENDING');
    assert(exhibitorHistory[1].status === 'FAILED', 'First submission remains FAILED');
    assert(exhibitorHistory[1].failureReason === 'Reference CBE-TXN-001234 not found in bank transaction statement.', 'Historical rejection reason preserved');

    // -------------------------------------------------------------
    // Scenario 9: Successful verification settles payment and confirms booth
    // -------------------------------------------------------------
    console.log('\n✅ Testing Scenario 9: Atomic verification & booth confirmation...');
    const verifyRes = await ExhibitorService.verifyBoothReceipt(testIds.org1Id!, testIds.eventId!, testIds.vendor1Id!, {
      confirmedCleared: true,
      notes: 'Verified against Bank of Abyssinia and Telebirr merchant portal.',
    });

    assert(verifyRes.payment.status === 'SETTLED', 'Payment status updated to SETTLED');
    assert(Boolean(verifyRes.payment.verified_at), 'verified_at timestamp set');
    assert(verifyRes.vendor.status === 'confirmed', 'Vendor status updated to confirmed');
    assert((verifyRes.vendor.paymentStatus || verifyRes.vendor.payment_status) === 'paid', 'Vendor paymentStatus updated to paid');
    assert((verifyRes.vendor.paymentReference || verifyRes.vendor.payment_reference) === 'CBE-TXN-CORRECTED-99', 'Verified claimed reference written to paymentReference');
    assert(Boolean(verifyRes.vendor.paidAt || verifyRes.vendor.paid_at), 'paidAt timestamp set');

    // Verify DB state directly
    const dbVendor = await query('SELECT status, payment_status, payment_reference, paid_at FROM event_vendors WHERE id = $1', [testIds.vendor1Id]);
    assert(dbVendor.rows[0].status === 'confirmed', 'Database confirms vendor status is confirmed');
    assert(dbVendor.rows[0].payment_status === 'paid', 'Database confirms vendor payment_status is paid');
    assert(dbVendor.rows[0].payment_reference === 'CBE-TXN-CORRECTED-99', 'Database confirms payment_reference');

    // -------------------------------------------------------------
    // Scenario 10: Repeated or concurrent verification blocked
    // -------------------------------------------------------------
    console.log('\n🔒 Testing Scenario 10: Repeated verification blocked...');
    let repeatedVerifyFailed = false;
    try {
      await ExhibitorService.verifyBoothReceipt(testIds.org1Id!, testIds.eventId!, testIds.vendor1Id!, {
        confirmedCleared: true,
      });
    } catch (err: any) {
      repeatedVerifyFailed = true;
      assert(err.statusCode === 400 || err.statusCode === 404, 'Repeated verification fails safely with 400/404');
    }
    assert(repeatedVerifyFailed, 'Already confirmed booth cannot be re-verified');

    // -------------------------------------------------------------
    // Scenario 12C: Confirmed booth cannot submit additional receipts
    // -------------------------------------------------------------
    console.log('\n🔒 Testing Scenario 12C: Confirmed booth cannot submit further receipts...');
    let postConfirmSubmitFailed = false;
    try {
      await ExhibitorService.submitBoothReceipt(testIds.exhibitor1Id!, testIds.vendor1Id!, {
        receiptUrl: 'https://res.cloudinary.com/dktpwqspb/image/upload/v1234/receipt_attempt3.jpg',
        transactionReference: 'TX_POST_CONFIRM',
      });
    } catch (err: any) {
      postConfirmSubmitFailed = true;
      assert(err.statusCode === 400, 'Confirmed booth receipt submission blocked with 400');
    }
    assert(postConfirmSubmitFailed, 'Confirmed booth cannot submit additional receipts');

    // -------------------------------------------------------------
    // Lead capture verification for confirmed booth
    // -------------------------------------------------------------
    console.log('\n👥 Testing Confirmed Booth Lead Capture...');
    const visitor = await ExhibitorService.addBoothVisitor(testIds.exhibitor1Id!, testIds.vendor1Id!, {
      visitorName: 'Dr. Solomon Visitor',
      visitorEmail: 'solomon@partner.et',
      visitorPhone: '+251911223344',
      notes: 'Interested in annual enterprise license',
    });
    assert(visitor.visitorName === 'Dr. Solomon Visitor', 'Visitor logged for confirmed booth');

    const visitorsList = await ExhibitorService.getBoothVisitors(testIds.exhibitor1Id!, testIds.vendor1Id!);
    assert(visitorsList.length === 1, 'Visitor retrieved in booth visitors list');

    await ExhibitorService.deleteBoothVisitor(testIds.exhibitor1Id!, testIds.vendor1Id!, visitor.id);
    const emptyVisitors = await ExhibitorService.getBoothVisitors(testIds.exhibitor1Id!, testIds.vendor1Id!);
    assert(emptyVisitors.length === 0, 'Visitor deleted successfully');

    console.log('\n🎉 ALL 12 AUDIT SCENARIOS PASSED WITH ZERO FAILURES!\n');
  } finally {
    // Cleanup fixtures
    console.log('🧹 Cleaning up test fixtures...');
    if (testIds.vendor1Id) {
      await query('DELETE FROM payments WHERE vendor_id = $1', [testIds.vendor1Id]);
      await query('DELETE FROM exhibitor_booth_visitors WHERE vendor_id = $1', [testIds.vendor1Id]);
      await query('DELETE FROM event_vendors WHERE id = $1', [testIds.vendor1Id]);
    }
    if (testIds.freeVendorId) {
      await query('DELETE FROM event_vendors WHERE id = $1', [testIds.freeVendorId]);
    }
    if (testIds.callId) {
      await query('DELETE FROM exhibitor_calls WHERE id = $1', [testIds.callId]);
    }
    if (testIds.eventId) {
      await query('DELETE FROM events WHERE id = $1', [testIds.eventId]);
    }
    if (testIds.exhibitor1Id) {
      await query('DELETE FROM users WHERE id = $1', [testIds.exhibitor1Id]);
    }
    if (testIds.exhibitor2Id) {
      await query('DELETE FROM users WHERE id = $1', [testIds.exhibitor2Id]);
    }
    if (testIds.org1Id) {
      await query('DELETE FROM users WHERE id = $1', [testIds.org1Id]);
    }
    if (testIds.org2Id) {
      await query('DELETE FROM users WHERE id = $1', [testIds.org2Id]);
    }
    console.log('✨ Cleanup complete.\n');
  }
}

runExhibitorReceiptWorkflowTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
