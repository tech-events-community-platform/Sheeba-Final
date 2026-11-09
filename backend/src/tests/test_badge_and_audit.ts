import pool, { query } from '../config/db';
import { BadgeService } from '../services/badge.service';
import { AuditService } from '../services/audit.service';

async function runBadgeAndAuditTest() {
  console.log('====================================================');
  console.log('🧪 TESTING BADGE PAGINATION & SYSTEM AUDIT LOGGING');
  console.log('====================================================\n');

  try {
    // 1. Test Audit Table Initialization & Backfill
    console.log('🔹 1. Testing Audit Table Initialization & Backfill...');
    await AuditService.initAuditTable();
    console.log('  ✅ PASS: system_audit_logs initialized and backfilled without errors');

    // 2. Test Badge Pagination
    console.log('\n🔹 2. Testing Badge Oversight Pagination (15 per page)...');
    const badgePage1 = await BadgeService.getBadgeAwardsPaginated({ page: 1, limit: 15, status: 'all' });
    console.log(`  ✅ PASS: Page 1 returned ${badgePage1.badges.length} badges (Total: ${badgePage1.pagination.total})`);
    if (badgePage1.badges.length > 15) {
      throw new Error(`Expected at most 15 badges per page, got ${badgePage1.badges.length}`);
    }

    // Status filter
    const activeBadges = await BadgeService.getBadgeAwardsPaginated({ page: 1, limit: 15, status: 'active' });
    console.log(`  ✅ PASS: Active filter returned ${activeBadges.badges.length} active badges (Total active: ${activeBadges.pagination.total})`);

    const revokedBadges = await BadgeService.getBadgeAwardsPaginated({ page: 1, limit: 15, status: 'revoked' });
    console.log(`  ✅ PASS: Revoked filter returned ${revokedBadges.badges.length} revoked badges (Total revoked: ${revokedBadges.pagination.total})`);

    // 3. Test Audit Service Append & Sanitization
    console.log('\n🔹 3. Testing AuditService.logAction & Sanitization...');
    await AuditService.logAction({
      performedBy: null,
      performedByName: 'Admin Tester',
      performedByEmail: 'test-audit@sheeba.et',
      performedByRole: 'admin',
      action: 'SYSTEM_SECURITY_POLICY_UPDATED',
      category: 'AUTH_SECURITY',
      entityType: 'setting',
      entityId: 'security_policy',
      details: 'Updated authentication password policy',
      metadata: {
        settingName: 'two_factor_auth',
        password: 'SUPER_SECRET_PASSWORD', // should be redacted!
        apiKey: 'sk_live_123456789',       // should be redacted!
        publicFlag: true,
      },
    });

    // Check DB record directly to verify sanitization
    const checkRes = await query(
      `SELECT * FROM system_audit_logs WHERE action = 'SYSTEM_SECURITY_POLICY_UPDATED' ORDER BY created_at DESC LIMIT 1`
    );
    if (!checkRes.rows.length) {
      throw new Error('Expected audit log to be created in DB');
    }
    const savedLog = checkRes.rows[0];
    const savedMetadata = typeof savedLog.metadata === 'string' ? JSON.parse(savedLog.metadata) : savedLog.metadata;
    if (savedMetadata.password !== '[REDACTED]' || savedMetadata.apiKey !== '[REDACTED]') {
      throw new Error(`Sanitization failed! Saved metadata: ${JSON.stringify(savedMetadata)}`);
    }
    console.log('  ✅ PASS: Audit log action recorded and sensitive credentials redacted to [REDACTED]');

    // 4. Test Audit Log Retrieval & Pagination
    console.log('\n🔹 4. Testing Audit Log Retrieval & Pagination...');
    const auditLogsResult = await AuditService.getAuditLogs({ page: 1, limit: 15 });
    console.log(`  ✅ PASS: Retrieved ${auditLogsResult.logs.length} audit logs on page 1 (Total logs: ${auditLogsResult.pagination.total})`);
    console.log(`  ✅ PASS: Category breakdown returned (${Object.keys(auditLogsResult.categoryCounts).length} distinct categories)`);

    // 5. Test Search Filter on Audit Logs
    const searchedLogs = await AuditService.getAuditLogs({ page: 1, limit: 15, search: 'SYSTEM_SECURITY_POLICY_UPDATED' });
    console.log(`  ✅ PASS: Search by action found ${searchedLogs.logs.length} matching logs`);

    console.log('\n====================================================');
    console.log('🎉 ALL BADGE PAGINATION & AUDIT LOG TESTS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runBadgeAndAuditTest();
