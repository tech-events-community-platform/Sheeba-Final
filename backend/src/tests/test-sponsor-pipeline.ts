import { query } from '../config/db';
import { AuthService } from '../services/auth.service';
import { SponsorshipService } from '../services/sponsorship.service';

async function runSponsorPipelineTest() {
  console.log('🚀 Running Sponsor & Sponsorship Deals Pipeline Verification Test...');

  const timestamp = Date.now();
  const testOrganizerEmail = `org_test_${timestamp}@sheeba.et`;
  const testSponsorEmail = `sponsor_test_${timestamp}@corp.et`;

  try {
    // 1. Create and approve organizer
    console.log('1. Creating test organizer...');
    const orgRes = await AuthService.registerUser({
      email: testOrganizerEmail,
      password: 'Password123!',
      full_name: 'Test Organizer Lead',
      role: 'organizer',
      organization: 'Addis Tech Hub',
    });
    const orgId = orgRes.user.id;
    // Approve organizer
    await query("UPDATE users SET organizer_approval_status = 'approved', approval_status = 'approved' WHERE id = $1", [orgId]);
    console.log('✅ Test organizer approved:', orgId);

    // 2. Create and approve sponsor
    console.log('2. Creating test corporate sponsor...');
    const sponsorRes = await AuthService.registerSponsor({
      full_name: 'Sara Sponsor Lead',
      email: testSponsorEmail,
      password: 'Password123!',
      company_name: 'Ethio Tech Capital',
      industry_category: 'Fintech & Financial Services',
      company_phone: '+251911002233',
      company_website: 'https://ethiotech.et',
      company_description: 'Venture fund and tech incubator accelerating Ethiopian developer talent.',
      sponsorship_objectives: ['Brand awareness', 'Startup discovery'],
      target_audience: ['Software developers', 'Entrepreneurs and startup founders'],
      preferred_event_categories: ['Hackathons', 'Startup competitions'],
      skills_and_interests: ['AI', 'Python', 'Entrepreneurship'],
    });
    const sponsorId = sponsorRes.user.id;
    // Approve sponsor
    await query("UPDATE users SET approval_status = 'approved' WHERE id = $1", [sponsorId]);
    console.log('✅ Test corporate sponsor approved:', sponsorId);

    // 3. Organizer creates sponsorship application with socials
    console.log('3. Organizer submits sponsorship application with packages & socials...');
    const application = await SponsorshipService.createApplication(orgId, {
      event_title: 'Ethio Hackathon 2026',
      event_type: 'In-Person Hackathon',
      category: 'Fintech',
      expected_date: '2026-11-15',
      location: 'Millennium Hall, Addis Ababa',
      expected_attendees: 1500,
      target_audience: 'Software Engineers, Fintech Startups & CS Students',
      funding_goal: 500000,
      currency: 'ETB',
      description: 'The largest university & corporate hackathon in East Africa.',
      packages: [
        { name: 'Platinum Title Sponsor', amount: 300000, perks: 'Keynote speech, VIP booth, Brand on all badges' },
        { name: 'Gold Partner', amount: 150000, perks: 'Roll-up banners, 10 tickets, Workshop hosting' }
      ],
      contact_name: 'Sara Organizer',
      contact_phone: '+251911887766',
      contact_email: testOrganizerEmail,
      contact_telegram: '@ethiohack2026',
      pitch_deck_url: 'https://drive.google.com/deck-2026',
      socials: {
        linkedin: 'https://linkedin.com/company/addis-tech-hub',
        telegram: 'https://t.me/addistechhub',
        x: 'https://x.com/addistech'
      }
    });
    console.log('✅ Sponsorship application created:', application.id);
    console.log('   Stored socials:', JSON.stringify(application.socials));

    // 4. Explore applications
    console.log('4. Sponsor explores marketplace...');
    const exploreResults = await SponsorshipService.getAllOpenApplications();
    const foundApp = exploreResults.find((a: any) => a.id === application.id);
    if (!foundApp) throw new Error('Application not found in explore list');
    console.log('✅ Application found in marketplace. Packages count:', foundApp.packages?.length);

    // 5. Sponsor marks application as INTERESTED
    console.log('5. Sponsor marks as INTERESTED with Platinum package pledge...');
    const deal = await SponsorshipService.expressInterestOrDecline(
      sponsorId,
      application.id,
      'INTERESTED',
      {
        package_name: 'Platinum Title Sponsor',
        pledged_amount: 300000,
        sponsor_notes: 'Initial meeting scheduled for next Monday.'
      }
    );
    console.log('✅ Deal created with status:', deal.status, 'Pledged:', deal.pledged_amount);

    // 6. Sponsor fetches their deals (Deals & Pledges tab)
    console.log('6. Sponsor fetches Deals & Pledges tab...');
    const sponsorDeals = await SponsorshipService.getSponsorDeals(sponsorId, 'INTERESTED');
    console.log(`✅ Returned ${sponsorDeals.length} deals in pipeline.`);
    const firstDeal = sponsorDeals[0];
    if (!firstDeal.application) {
      throw new Error('FAILED: deal.application is not nested!');
    }
    console.log('✅ Nested application event title:', firstDeal.application.event_title);
    console.log('✅ Nested application contact:', firstDeal.application.contact_phone, firstDeal.application.contact_email);
    console.log('✅ Nested application socials:', JSON.stringify(firstDeal.application.socials));

    // 7. Update deal to DECLINED
    console.log('7. Testing status update to DECLINED...');
    const updatedDeal = await SponsorshipService.updateDealStatus(deal.id, sponsorId, 'DECLINED');
    console.log('✅ Deal status updated to:', updatedDeal.status);

    // 8. Verify declined tab
    const declinedDeals = await SponsorshipService.getSponsorDeals(sponsorId, 'DECLINED');
    if (declinedDeals.length !== 1) {
      throw new Error(`Expected 1 declined deal, got ${declinedDeals.length}`);
    }
    console.log('✅ Declined deals tab displays deal properly:', declinedDeals[0].application?.event_title);

    // Cleanup test data
    console.log('8. Cleaning up test records...');
    await query('DELETE FROM sponsorship_deals WHERE sponsor_id = $1', [sponsorId]);
    await query('DELETE FROM sponsorship_applications WHERE id = $1', [application.id]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [orgId, sponsorId]);
    console.log('✅ Test data cleaned up successfully.');

    console.log('\n🎉 ALL SPONSOR & DEALS PIPELINE TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Pipeline test failed:', err);
    process.exit(1);
  }
}

runSponsorPipelineTest().then(() => process.exit(0));
