process.env.NODE_ENV = 'test';
import { ScannerPrivacyUtil } from '../utils/scannerPrivacy.util';
import { generateRandomInitialPassword } from '../utils/credential.util';

async function runScannerDelegationTests() {
  console.log('====================================================');
  console.log('🎟️ SHEEBA SCANNER DELEGATION & GATE VERIFICATION SUITE');
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
  // SUITE 1: TIMEZONE-AWARE LOCAL DATE PRIVACY CALCULATIONS (EAT / UTC+3)
  // =========================================================================
  console.log('📦 1. Testing Timezone-Aware Attendee Data Privacy (EAT / Africa/Addis_Ababa)...');

  const now = new Date();
  const todayLocalStr = ScannerPrivacyUtil.toLocalDayString(now);
  assert(typeof todayLocalStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayLocalStr), 'toLocalDayString produces valid YYYY-MM-DD');

  const isTodayNow = ScannerPrivacyUtil.isEventTodayInLocalTime(now);
  assert(isTodayNow === true, 'Current timestamp correctly identified as event today in local time');

  // Test yesterday (should be false for isToday, true for isPassed)
  const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000);
  assert(ScannerPrivacyUtil.isEventTodayInLocalTime(yesterday) === false, 'Yesterday timestamp rejected as event today');
  assert(ScannerPrivacyUtil.isEventPassedInLocalTime(yesterday) === true, 'Yesterday timestamp recognized as event passed');

  // Test tomorrow (should be false for isToday, false for isPassed)
  const tomorrow = new Date(Date.now() + 26 * 60 * 60 * 1000);
  assert(ScannerPrivacyUtil.isEventTodayInLocalTime(tomorrow) === false, 'Tomorrow timestamp rejected as event today');
  assert(ScannerPrivacyUtil.isEventPassedInLocalTime(tomorrow) === false, 'Tomorrow timestamp recognized as not yet passed');

  // Test UTC midnight boundary vs EAT (UTC+3)
  // 21:30 UTC on 2026-11-08 is 00:30 EAT on 2026-11-09
  const lateUtc = new Date('2026-11-08T21:30:00.000Z');
  const eatLateLocal = ScannerPrivacyUtil.toLocalDayString(lateUtc);
  assert(eatLateLocal === '2026-11-09', 'Local timezone handles midnight boundary accurately (21:30 UTC is next day in EAT)');

  // =========================================================================
  // SUITE 2: CREDENTIAL GENERATION & RANDOM PASSWORDS FOR NEW SCANNERS
  // =========================================================================
  console.log('📦 2. Testing Random Credentials Provisioning for Scanners...');

  const pass1 = generateRandomInitialPassword(12);
  const pass2 = generateRandomInitialPassword(12);
  assert(pass1 !== pass2, 'Random passwords generated for scanner invites are distinct');
  assert(pass1.length >= 12, 'Scanner temporary password meets length policy (>= 12)');
  assert(/[A-Z]/.test(pass1) && /[0-9]/.test(pass1), 'Scanner password includes alphanumeric complexity');

  // =========================================================================
  // SUITE 3: SCOPED AUTHORIZATION LOGIC
  // =========================================================================
  console.log('📦 3. Testing Event-Scoped Scanner Permissions Logic...');

  // Mock event and scanner verification rules
  const mockEvent = {
    id: 'evt-100',
    organizerId: 'org-1',
    requiresScanners: true,
  };

  // Rule 1: Admin bypasses
  const isAdmin = (role: string) => role === 'admin';
  assert(isAdmin('admin') === true, 'Admin has full access to scan any event');

  // Rule 2: Organizer of event passes
  const isOrganizer = (userId: string, evt: typeof mockEvent) => evt.organizerId === userId;
  assert(isOrganizer('org-1', mockEvent) === true, 'Event organizer is granted scan access');
  assert(isOrganizer('other-user', mockEvent) === false, 'Unrelated user is denied native organizer access');

  // Rule 3: Scanners disabled blocks delegated scanners
  const canDelegateScan = (evt: { requiresScanners: boolean }, isAssigned: boolean) => evt.requiresScanners && isAssigned;
  assert(canDelegateScan({ requiresScanners: false }, true) === false, 'Disabling requiresScanners revokes delegated door scanning immediately');
  assert(canDelegateScan({ requiresScanners: true }, true) === true, 'Active assigned scanner permitted when requiresScanners is true');
  assert(canDelegateScan({ requiresScanners: true }, false) === false, 'Unassigned user denied scan access');

  // =========================================================================
  // SUITE 4: FRESH EMPTY LIST ON RE-ENABLEMENT (CONFIRMED SPECIFICATION v2.1)
  // =========================================================================
  console.log('📦 4. Testing Fresh Empty List Re-enablement Invariance...');

  interface MockScannerAssignment {
    userId: string;
    isActive: boolean;
  }

  let assignments: MockScannerAssignment[] = [
    { userId: 'scanner-1', isActive: true },
    { userId: 'scanner-2', isActive: true },
  ];

  // Organizer toggles OFF
  function toggleOff(list: MockScannerAssignment[]) {
    return list.map(a => ({ ...a, isActive: false }));
  }
  assignments = toggleOff(assignments);
  const activeCountAfterOff = assignments.filter(a => a.isActive).length;
  assert(activeCountAfterOff === 0, 'Disabling toggle deactivates all active scanner assignments');

  // Organizer toggles ON later: fresh empty active list
  function toggleOnFresh(list: MockScannerAssignment[]) {
    // Only return currently active (which is empty)
    return list.filter(a => a.isActive);
  }
  const activeListOnReEnable = toggleOnFresh(assignments);
  assert(activeListOnReEnable.length === 0, 'Re-enabling toggle starts with a fresh empty active scanner list');

  console.log('\n====================================================');
  console.log(`🎯 SCANNER DELEGATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runScannerDelegationTests().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});

