import { query } from '../config/db';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { EmailService } from '../services/email.service';
import { applyOrganizerSchema } from '../schemas/auth.schema';
import { CloudinaryService } from '../services/cloudinary.service';

let totalTests = 0;
let passedTests = 0;

function assert(description: string, condition: boolean, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${description}`);
  } else {
    console.error(`  ❌ FAIL: ${description}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runEndToEndVerification() {
  console.log('\n====================================================');
  console.log('🧪 SHEEBA ORGANIZER FORMALIZATION E2E VERIFICATION');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const individualEmail = `test_indiv_${timestamp}@sheeba.test`;
  const orgEmail = `test_org_${timestamp}@sheeba.test`;
  const orgNoLogoEmail = `test_org_nologo_${timestamp}@sheeba.test`;

  let indivUserId = '';
  let orgUserId = '';
  let orgNoLogoUserId = '';

  // Prevent external email dispatches through Brevo during tests
  const originalDispatchEmail = (EmailService as any).dispatchEmail;
  (EmailService as any).dispatchEmail = async () => {};

  try {
    // -----------------------------------------------------------------
    // 1. Setup: Create test attendee accounts (with exhibitor flag on one)
    // -----------------------------------------------------------------
    console.log('📦 Setting up test user accounts...');

    const resIndiv = await query(
      `INSERT INTO users (full_name, email, phone, role, is_active, is_exhibitor, created_at, updated_at)
       VALUES ($1, $2, $3, 'attendee', TRUE, TRUE, NOW(), NOW())
       RETURNING id, full_name, email`,
      ['Abebe Bikila', individualEmail, '+251911223344']
    );
    indivUserId = resIndiv.rows[0].id;

    const resOrg = await query(
      `INSERT INTO users (full_name, email, phone, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 'attendee', TRUE, NOW(), NOW())
       RETURNING id, full_name, email`,
      ['Sara Haile', orgEmail, '+251922334455']
    );
    orgUserId = resOrg.rows[0].id;

    const resOrgNoLogo = await query(
      `INSERT INTO users (full_name, email, phone, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 'attendee', TRUE, NOW(), NOW())
       RETURNING id, full_name, email`,
      ['Dawit Kebede', orgNoLogoEmail, '+251933445566']
    );
    orgNoLogoUserId = resOrgNoLogo.rows[0].id;

    // -----------------------------------------------------------------
    // Verification 1 & 3: Individual Organizer Application
    // -----------------------------------------------------------------
    console.log('\n🔹 1. Individual Applicant Submission & Conditional Fields:');
    const indivPayload = {
      phone: '+251911223344',
      applicant_type: 'Individual Organizer' as const,
      personal_introduction: 'Passionate tech community builder organizing open source workshops in Addis Ababa.',
    };

    const parsedIndiv = applyOrganizerSchema.safeParse(indivPayload);
    assert('Individual schema validation succeeds with personal_introduction', parsedIndiv.success);

    const indivApplied = await AuthService.applyForOrganizer(indivUserId, indivPayload);
    assert('Individual applicant status is pending', indivApplied.user.organizerApprovalStatus === 'pending');
    assert('Individual applicant role remains attendee until approved', indivApplied.user.role === 'ATTENDEE');
    assert('Individual applicant_type stored correctly', indivApplied.user.applicantType === 'Individual Organizer');
    assert('Individual personalIntroduction populated', indivApplied.user.personalIntroduction?.includes('tech community builder'));

    // Check DB state for individual applicant
    const dbIndiv = await query('SELECT * FROM users WHERE id = $1', [indivUserId]);
    const rowIndiv = dbIndiv.rows[0];
    assert('Individual organizer_applied_at timestamp set', !!rowIndiv.organizer_applied_at);
    assert('Individual does not have organization name forced', !rowIndiv.organization || rowIndiv.organization === rowIndiv.full_name);

    // -----------------------------------------------------------------
    // Verification 2, 4, 5, 6: Organization Application (With & Without Logo)
    // -----------------------------------------------------------------
    console.log('\n🔹 2. Organization Applicant Submission & Logo Uploads:');
    const orgPayload = {
      phone: '+251922334455',
      applicant_type: 'Organization / Institution' as const,
      organization: 'Addis Open Source Initiative',
      organization_type: 'Community / Student Club' as const,
      applicant_position: 'Founder & President',
      organization_description: 'An open-source developer hub hosting hackathons and tech talks across Ethiopian universities.',
      organization_website: 'https://addisopensource.org',
      organization_logo: 'https://res.cloudinary.com/sheeba/image/upload/v1234/logos/addis_os_logo.png',
    };

    const parsedOrg = applyOrganizerSchema.safeParse(orgPayload);
    assert('Organization schema validation succeeds with all org fields & logo', parsedOrg.success);

    const orgApplied = await AuthService.applyForOrganizer(orgUserId, orgPayload);
    assert('Organization applicant status is pending', orgApplied.user.organizerApprovalStatus === 'pending');
    assert('Organization logo persisted', orgApplied.user.organizationLogo === orgPayload.organization_logo);
    assert('Applicant personal avatarUrl is NOT replaced by organization logo', orgApplied.user.avatarUrl !== orgPayload.organization_logo);
    assert('Organization type stored correctly', orgApplied.user.organizationType === 'Community / Student Club');
    assert('Applicant position stored correctly', orgApplied.user.applicantPosition === 'Founder & President');

    // Organization without logo (Requirement 5)
    const orgNoLogoPayload = {
      phone: '+251933445566',
      applicant_type: 'Organization / Institution' as const,
      organization: 'Ethiopian AI Society',
      organization_type: 'NGO' as const,
      applicant_position: 'Lead Coordinator',
      organization_description: 'Non-profit dedicated to AI research and ethical deployment in East Africa.',
    };
    const parsedNoLogo = applyOrganizerSchema.safeParse(orgNoLogoPayload);
    assert('Organization application succeeds without logo (optional logo)', parsedNoLogo.success);
    const orgNoLogoApplied = await AuthService.applyForOrganizer(orgNoLogoUserId, orgNoLogoPayload);
    assert('Organization with no logo has null/empty organizationLogo', !orgNoLogoApplied.user.organizationLogo);

    // -----------------------------------------------------------------
    // Verification 7: Admin View All Application Info & Security
    // -----------------------------------------------------------------
    console.log('\n🔹 3. Admin Application Review & Security:');
    const adminDetails = await AdminService.getOrganizerDetails(orgUserId);
    assert('Admin can view applicant name', adminDetails.name === 'Sara Haile');
    assert('Admin can view email', adminDetails.email === orgEmail);
    assert('Admin can view phone', adminDetails.phone === '+251922334455');
    assert('Admin can view applicantType', adminDetails.applicantType === 'Organization / Institution');
    assert('Admin can view organization name', adminDetails.organization === 'Addis Open Source Initiative');
    assert('Admin can view organizationType', adminDetails.organizationType === 'Community / Student Club');
    assert('Admin can view applicantPosition', adminDetails.applicantPosition === 'Founder & President');
    assert('Admin can view organizationDescription', adminDetails.organizationDescription?.includes('open-source developer hub'));
    assert('Admin can view website link', adminDetails.organizationWebsite === 'https://addisopensource.org');
    assert('Admin can view organization logo', adminDetails.organizationLogo === orgPayload.organization_logo);
    assert('Admin endpoint NEVER exposes password_hash', (adminDetails as any).password_hash === undefined);

    const adminUsersList = await AdminService.getUsersList();
    const foundOrgInList = adminUsersList.organizers.find((o) => o.id === orgUserId);
    assert('Admin user list contains organization with status "Pending Approval"', foundOrgInList?.status === 'Pending Approval');

    // -----------------------------------------------------------------
    // Verification 8: Admin Request Additional Information & Resubmission Lifecycle
    // -----------------------------------------------------------------
    console.log('\n🔹 4. Admin Request Info & Resubmission Lifecycle:');
    
    // Request additional info
    const reqInfoResult = await AdminService.requestOrganizerInfo(
      orgUserId,
      'Please attach an official registration letter or university club endorsement.'
    );
    assert('Request info sets status to more_info_needed', reqInfoResult.organizer_approval_status === 'more_info_needed');
    assert('Request info notes persisted in database', reqInfoResult.organizer_info_requested_notes?.includes('university club endorsement'));

    // Verify applicant state in database during more_info_needed
    const checkInfoStatus = await query(
      'SELECT organizer_approval_status, is_organizer, organizer_info_requested_notes FROM users WHERE id = $1',
      [orgUserId]
    );
    const orgInfoRow = checkInfoStatus.rows[0];
    assert('Applicant is in more_info_needed status', orgInfoRow.organizer_approval_status === 'more_info_needed');
    assert('Applicant is_organizer is false while more info is needed', orgInfoRow.is_organizer === false);

    // Resubmission: Submit updated application details through AuthService.applyForOrganizer
    const updatedOrgPayload = {
      ...orgPayload,
      organization_description: 'Updated Description: Certified developer hub with registered university chapters across Addis Ababa.',
      organization_website: 'https://addisopensource.org/verified',
    };
    const resubmitted = await AuthService.applyForOrganizer(orgUserId, updatedOrgPayload);

    // Verify status returns to pending
    assert('Application status resets to pending after resubmission', resubmitted.user.organizerApprovalStatus === 'pending');
    assert('Updated organization description is saved', resubmitted.user.organizationDescription?.includes('Certified developer hub'));
    assert('Updated organization website is saved', resubmitted.user.organizationWebsite === 'https://addisopensource.org/verified');

    // Verify database state after resubmission: organizer_info_requested_notes is cleared & is_organizer remains false
    const dbResubmitted = await query(
      'SELECT organizer_approval_status, is_organizer, organizer_info_requested_notes, organization_description FROM users WHERE id = $1',
      [orgUserId]
    );
    const resubmittedRow = dbResubmitted.rows[0];
    assert('organizer_info_requested_notes is cleared in database after resubmission', resubmittedRow.organizer_info_requested_notes === null);
    assert('is_organizer remains false after resubmission while pending', resubmittedRow.is_organizer === false);

    // -----------------------------------------------------------------
    // Verification 8b: Admin Rejection with Reason
    // -----------------------------------------------------------------
    console.log('\n🔹 4b. Admin Rejection with Reason:');
    const rejectReason = 'Organization documentation could not be validated with registrar.';
    const rejectResult = await AdminService.rejectOrganizer(orgNoLogoUserId, rejectReason);
    assert('Rejection sets status to rejected', rejectResult.organizer_approval_status === 'rejected');
    assert('Rejection reason persisted in database', rejectResult.organizer_rejection_reason === rejectReason);
    assert('Rejection keeps user active as attendee (Requirement 11)', rejectResult.is_active === true && rejectResult.role === 'attendee');

    const dbRejectedUser = await query('SELECT * FROM users WHERE id = $1', [orgNoLogoUserId]);
    assert('Rejected user record is NOT deleted', dbRejectedUser.rows.length === 1 && dbRejectedUser.rows[0].deleted_at === null);

    // -----------------------------------------------------------------
    // Verification 9 & 10: Permissions & Multi-Role Workspace Access:
    // -----------------------------------------------------------------
    console.log('\n🔹 5. Permissions & Multi-Role Workspace Access:');
    
    // Pending/More Info user cannot access organizer workspace
    const pendingCheck = await query('SELECT role, is_organizer, organizer_approval_status FROM users WHERE id = $1', [indivUserId]);
    const pendingRow = pendingCheck.rows[0];
    const canAccessOrganizerWorkspaceBeforeApproval = pendingRow.is_organizer === true || pendingRow.role === 'organizer';
    assert('Pending applicant CANNOT access Organizer Workspace (Requirement 9)', !canAccessOrganizerWorkspaceBeforeApproval);

    // Approve Individual Organizer
    const approvedIndiv = await AdminService.approveOrganizer(indivUserId);
    assert('Approve organizer sets is_organizer = TRUE', approvedIndiv.is_organizer === true);
    assert('Approve organizer sets organizer_approval_status = approved', approvedIndiv.organizer_approval_status === 'approved');

    // Requirement 10: Preserves Attendee and Exhibitor access
    const dbIndivAfterApproval = await query('SELECT id, is_organizer, is_exhibitor, is_active FROM users WHERE id = $1', [indivUserId]);
    const approvedRow = dbIndivAfterApproval.rows[0];
    assert('Approval grants Organizer access', approvedRow.is_organizer === true);
    assert('Approval preserves Exhibitor access (Requirement 10)', approvedRow.is_exhibitor === true);
    assert('Approval preserves account active status', approvedRow.is_active === true);

    // -----------------------------------------------------------------
    // Verification 12: Sponsor functionality remains unaffected
    // -----------------------------------------------------------------
    console.log('\n🔹 6. Sponsor Functionality & Platform Stability:');
    const sponsorsQuery = await query(`SELECT COUNT(*)::INTEGER AS count FROM users WHERE role = 'sponsor'`);
    assert('Sponsor users and role queries continue executing normally', parseInt(sponsorsQuery.rows[0].count) >= 0);

  } catch (error) {
    console.error('Fatal verification error:', error);
    assert('End-to-end verification ran without uncaught exceptions', false, String(error));
  } finally {
    // Restore EmailService.dispatchEmail regardless of test outcome
    (EmailService as any).dispatchEmail = originalDispatchEmail;

    console.log('\n🧹 Cleaning up test users...');
    if (indivUserId) await query('DELETE FROM users WHERE id = $1', [indivUserId]);
    if (orgUserId) await query('DELETE FROM users WHERE id = $1', [orgUserId]);
    if (orgNoLogoUserId) await query('DELETE FROM users WHERE id = $1', [orgNoLogoUserId]);
    console.log('Cleanup complete.');
  }

  console.log('\n====================================================');
  console.log(`📊 E2E VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runEndToEndVerification().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
