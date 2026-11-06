import assert from 'assert';
import { SponsorshipService } from '../services/sponsorship.service';
import { saveDeliverableSchema } from '../schemas/sponsorship.schema';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';

async function runStage4IntegrationTests() {
  console.log('=================================================================');
  console.log('🛡️  SHEEBA STAGE 4: SPONSOR WORKFLOW & DELIVERABLES TEST SUITE');
  console.log('=================================================================');

  const testSuffix = Date.now().toString(36);
  const sponsor1Email = `st4_sp1_${testSuffix}@corporate.et`;
  const sponsor2Email = `st4_sp2_${testSuffix}@othercorp.et`;
  const orgEmail = `st4_org_${testSuffix}@sheeba-events.et`;
  const hashedPassword = await bcrypt.hash('SponsorPass2026!', 10);

  let sponsor1Id: string = '';
  let sponsor2Id: string = '';
  let organizerId: string = '';
  let pitchId: string = '';
  let deal1Id: string = '';
  let deal2Id: string = '';

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create test users and pitch
    // -------------------------------------------------------------------------
    // 1. Sponsor 1
    const sp1Res = await query(
      `INSERT INTO users (full_name, email, password_hash, role, approval_status, company_name, industry_category)
       VALUES ($1, $2, $3, 'SPONSOR', 'approved', 'Fintech Innovators', 'Fintech')
       RETURNING id`,
      ['Sponsor 1 Rep', sponsor1Email, hashedPassword]
    );
    sponsor1Id = sp1Res.rows[0].id;

    // 2. Sponsor 2 (Rival sponsor)
    const sp2Res = await query(
      `INSERT INTO users (full_name, email, password_hash, role, approval_status, company_name, industry_category)
       VALUES ($1, $2, $3, 'SPONSOR', 'approved', 'Rival Tech Corp', 'Software')
       RETURNING id`,
      ['Sponsor 2 Rep', sponsor2Email, hashedPassword]
    );
    sponsor2Id = sp2Res.rows[0].id;

    // 3. Organizer
    const orgRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, approval_status, is_organizer)
       VALUES ($1, $2, $3, 'ORGANIZER', 'approved', true)
       RETURNING id`,
      ['Organizer Rep', orgEmail, hashedPassword]
    );
    organizerId = orgRes.rows[0].id;

    // 4. Sponsorship Pitch created via SponsorshipService
    const pitch = await SponsorshipService.createApplication(organizerId, {
      event_title: `Addis Fintech Summit ${testSuffix}`,
      expected_date: 'December 2026',
      location: 'Millennium Hall, Addis Ababa',
      expected_attendees: 500,
      target_audience: 'Software Engineers and Founders',
      funding_goal: 300000,
      currency: 'ETB',
      description: 'The largest annual gathering of developers and founders in East Africa.',
      packages: [
        { name: 'Headline Partner', amount: 150000, perks: 'Keynote, Prime Booth, Logo on Lanyard' },
        { name: 'Gold Partner', amount: 75000, perks: 'Booth, Logo on site, 5 passes' },
      ],
      contact_name: 'Organizer Rep',
      contact_phone: '+251911000000',
      contact_email: orgEmail,
    });
    pitchId = pitch.id;

    // 5. Deal 1: Sponsor 1 applied, APPROVED
    const deal1Res = await query(
      `INSERT INTO sponsorship_deals (
        application_id, sponsor_id, package_name, pledged_amount, proposal_message, status, reviewed_at
      ) VALUES ($1, $2, 'Gold Partner', 75000, 'Proposal for gold tier', 'APPROVED', NOW())
       RETURNING id`,
      [pitchId, sponsor1Id]
    );
    deal1Id = deal1Res.rows[0].id;

    // 6. Deal 2: Sponsor 2 applied, PENDING review
    const deal2Res = await query(
      `INSERT INTO sponsorship_deals (
        application_id, sponsor_id, package_name, pledged_amount, proposal_message, status
      ) VALUES ($1, $2, 'Gold Partner', 75000, 'Proposal under review', 'PENDING')
       RETURNING id`,
      [pitchId, sponsor2Id]
    );
    deal2Id = deal2Res.rows[0].id;

    console.log('✅ Test fixtures initialized successfully.');

    // -------------------------------------------------------------------------
    // TEST 1: Deliverable Schema Validation
    // -------------------------------------------------------------------------
    console.log('\n🔹 1. Testing Deliverable Schema Validation...');
    const validDeliverablePayload = {
      companyName: 'Fintech Innovators PLC',
      website: 'https://fintech-innovators.et',
      tagline: 'Empowering Digital Finance in the Horn',
      primaryColor: '#70383D',
      secondaryColor: '#D29E96',
      mediaKitUrl: 'https://drive.google.com/media-kit',
      bio: 'Pioneering mobile payments and enterprise API rails across Ethiopia.',
      boothPreference: 'Standard 3x3m Corner Exhibition Booth',
      avRequirements: '1x 55-inch LED Display screen, 2x Roll-up Banner stands',
      ticketVouchersNeeded: '5 VIP Passes + 10 Standard Attendee Badges',
      repName: 'Dawit Haile',
      repTitle: 'Head of Sponsorships & PR',
      repPhone: '+251 91 123 4567',
      repEmail: 'partnerships@fintech-innovators.et',
      status: 'SUBMITTED',
    };

    const parsed = saveDeliverableSchema.safeParse(validDeliverablePayload);
    assert(parsed.success, `Schema validation should pass for valid deliverable: ${JSON.stringify(parsed.error?.format())}`);
    console.log('  ✅ PASS: Valid deliverable payload validated successfully');

    // Invalid email check
    const invalidEmail = saveDeliverableSchema.safeParse({ ...validDeliverablePayload, repEmail: 'not-an-email' });
    assert(!invalidEmail.success, 'Schema should reject invalid representative email');
    console.log('  ✅ PASS: Invalid email format rejected');

    // -------------------------------------------------------------------------
    // TEST 2: Master Default Deliverable Persistence
    // -------------------------------------------------------------------------
    console.log('\n🔹 2. Testing Master Default Deliverable Persistence (deal_id = null)...');
    const defaultSaved = await SponsorshipService.saveDeliverable(sponsor1Id, validDeliverablePayload);
    assert.strictEqual(defaultSaved.sponsorId, sponsor1Id);
    assert.strictEqual(defaultSaved.dealId, null);
    assert.strictEqual(defaultSaved.companyName, 'Fintech Innovators PLC');
    assert.strictEqual(defaultSaved.primaryColor, '#70383D');
    assert.strictEqual(defaultSaved.mediaKitUrl, 'https://drive.google.com/media-kit');

    // Check direct database values in sponsorship_deliverables table
    const dbCheck = await query(
      `SELECT * FROM sponsorship_deliverables WHERE sponsor_id = $1 AND deal_id IS NULL`,
      [sponsor1Id]
    );
    assert.strictEqual(dbCheck.rowCount, 1, 'Default deliverable must exist in PostgreSQL');
    assert.strictEqual(dbCheck.rows[0].rep_phone, '+251 91 123 4567');
    console.log('  ✅ PASS: Master default deliverable persisted in PostgreSQL with deal_id = NULL');

    // -------------------------------------------------------------------------
    // TEST 3: Deal-Specific Deliverable Persistence
    // -------------------------------------------------------------------------
    console.log('\n🔹 3. Testing Deal-Specific Deliverable Association...');
    const dealSaved = await SponsorshipService.saveDeliverable(sponsor1Id, {
      ...validDeliverablePayload,
      dealId: deal1Id,
      boothPreference: 'Premium 6x4m Central Exhibition Space',
      ticketVouchersNeeded: '10 VIP Passes + 20 Badges',
    });
    assert.strictEqual(dealSaved.dealId, deal1Id);
    assert.strictEqual(dealSaved.boothPreference, 'Premium 6x4m Central Exhibition Space');

    const dbDealCheck = await query(
      `SELECT * FROM sponsorship_deliverables WHERE deal_id = $1`,
      [deal1Id]
    );
    assert.strictEqual(dbDealCheck.rowCount, 1, 'Deal-specific deliverable must exist in PostgreSQL');
    assert.strictEqual(dbDealCheck.rows[0].ticket_vouchers_needed, '10 VIP Passes + 20 Badges');
    console.log('  ✅ PASS: Deal-specific deliverable persisted and associated with deal1');

    // -------------------------------------------------------------------------
    // TEST 4: Sponsor Deliverables List
    // -------------------------------------------------------------------------
    console.log('\n🔹 4. Testing getDeliverablesForSponsor...');
    const sponsor1Deliverables = await SponsorshipService.getDeliverablesForSponsor(sponsor1Id);
    assert.strictEqual(sponsor1Deliverables.length, 2, 'Sponsor 1 should have 2 deliverables (default + deal1)');
    const deal1Del = sponsor1Deliverables.find((d) => d.dealId === deal1Id);
    assert(deal1Del !== undefined, 'Deal 1 deliverable must be present in list');
    assert.strictEqual(deal1Del.packageName, 'Gold Partner');
    console.log('  ✅ PASS: getDeliverablesForSponsor returns all deal and template deliverables');

    // -------------------------------------------------------------------------
    // TEST 5: Security & Authorization — Cross-Sponsor Isolation
    // -------------------------------------------------------------------------
    console.log('\n🔹 5. Testing Cross-Sponsor Security Isolation...');
    // Sponsor 2 attempts to save deliverables to Sponsor 1's deal
    let crossSponsorBlocked = false;
    try {
      await SponsorshipService.saveDeliverable(sponsor2Id, {
        ...validDeliverablePayload,
        dealId: deal1Id, // Deal 1 belongs to Sponsor 1!
      });
    } catch (err: any) {
      crossSponsorBlocked = err.statusCode === 403;
    }
    assert(crossSponsorBlocked, 'Sponsor 2 must be blocked with HTTP 403 from updating Sponsor 1 deal deliverables');
    console.log('  ✅ PASS: Non-owning sponsor strictly blocked from attaching deliverables to another sponsor deal');

    // Sponsor 2 attempts to view Sponsor 1's deal deliverable
    let crossViewBlocked = false;
    try {
      await SponsorshipService.getDeliverableForDeal(deal1Id, sponsor2Id, 'SPONSOR');
    } catch (err: any) {
      crossViewBlocked = err.statusCode === 403;
    }
    assert(crossViewBlocked, 'Sponsor 2 must be blocked with HTTP 403 from viewing Sponsor 1 deal deliverables');
    console.log('  ✅ PASS: Non-owning sponsor blocked from viewing another sponsor private deliverables');

    // -------------------------------------------------------------------------
    // TEST 6: Organizer Access to Deliverables for Approved vs Pending Deals
    // -------------------------------------------------------------------------
    console.log('\n🔹 6. Testing Organizer Access to Deliverables...');
    // 1. Organizer accesses APPROVED deal deliverables
    const orgDelView = await SponsorshipService.getDeliverableForDeal(deal1Id, organizerId, 'ORGANIZER');
    assert(orgDelView !== null, 'Organizer must be able to view approved sponsor deliverables');
    assert.strictEqual(orgDelView.mediaKitUrl, 'https://drive.google.com/media-kit');
    console.log('  ✅ PASS: Event organizer can access deliverables for approved sponsor');

    // 2. Organizer attempts to access PENDING deal deliverables
    let pendingOrgBlocked = false;
    try {
      await SponsorshipService.getDeliverableForDeal(deal2Id, organizerId, 'ORGANIZER');
    } catch (err: any) {
      pendingOrgBlocked = err.statusCode === 403;
    }
    assert(pendingOrgBlocked, 'Organizer must be blocked from accessing deliverables for unapproved PENDING deals');
    console.log('  ✅ PASS: Organizer strictly blocked from viewing deliverables of pending, unapproved deals');

    // -------------------------------------------------------------------------
    // TEST 7: Deliverable Deletion & Ownership
    // -------------------------------------------------------------------------
    console.log('\n🔹 7. Testing Deliverable Deletion and Guard...');
    // Rival sponsor attempts to delete Sponsor 1 deliverable
    let deleteUnauthorized = false;
    try {
      await SponsorshipService.deleteDeliverable(dealSaved.id, sponsor2Id);
    } catch (err: any) {
      deleteUnauthorized = err.statusCode === 404 || err.statusCode === 403;
    }
    assert(deleteUnauthorized, 'Rival sponsor must be blocked from deleting Sponsor 1 deliverable');

    // Sponsor 1 deletes their deal deliverable
    const deleted = await SponsorshipService.deleteDeliverable(dealSaved.id, sponsor1Id);
    assert(deleted === true, 'Sponsor 1 must be able to delete their own deliverable');

    const checkAfterDelete = await query(
      `SELECT * FROM sponsorship_deliverables WHERE id = $1`,
      [dealSaved.id]
    );
    assert.strictEqual(checkAfterDelete.rowCount, 0, 'Deliverable must be removed from PostgreSQL');
    console.log('  ✅ PASS: Deliverable successfully deleted by owning sponsor with security guard');

    console.log('\n=================================================================');
    console.log('🎉 ALL 7 STAGE 4 INTEGRATION & DELIVERABLES TESTS PASSED (100%)');
    console.log('=================================================================\n');
  } finally {
    // Clean up test records
    try {
      if (sponsor1Id || sponsor2Id) {
        await query('DELETE FROM sponsorship_deliverables WHERE sponsor_id IN ($1, $2)', [
          sponsor1Id || '00000000-0000-0000-0000-000000000000',
          sponsor2Id || '00000000-0000-0000-0000-000000000000',
        ]);
      }
      if (pitchId) {
        await query('DELETE FROM sponsorship_deals WHERE application_id = $1', [pitchId]);
        await query('DELETE FROM sponsorship_applications WHERE id = $1', [pitchId]);
      }
      if (sponsor1Id || sponsor2Id || organizerId) {
        await query('DELETE FROM users WHERE id IN ($1, $2, $3)', [
          sponsor1Id || '00000000-0000-0000-0000-000000000000',
          sponsor2Id || '00000000-0000-0000-0000-000000000000',
          organizerId || '00000000-0000-0000-0000-000000000000',
        ]);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }
}

runStage4IntegrationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Stage 4 Test failed with error:', err);
    process.exit(1);
  });
