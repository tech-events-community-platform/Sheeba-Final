/**
 * Frontend Session Expiration & 401 Synchronization Verification Suite
 */

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
    failed++;
  }
}

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.mock-signature`;
}

// Mock localStorage and window EventTarget for Node
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

const eventListeners = new Map();
globalThis.window = {
  location: { hostname: 'localhost', protocol: 'http:' },
  addEventListener: (type, fn) => {
    if (!eventListeners.has(type)) eventListeners.set(type, new Set());
    eventListeners.get(type).add(fn);
  },
  removeEventListener: (type, fn) => {
    eventListeners.get(type)?.delete(fn);
  },
  dispatchEvent: (event) => {
    const fns = eventListeners.get(event.type);
    if (fns) {
      for (const fn of fns) fn(event);
    }
    return true;
  },
};

let fetchCalls = [];
let mockStatus = 200;
let mockBody = { success: true, data: { id: 'u-1', email: 'user@sheeba.et', role: 'ATTENDEE' } };

globalThis.fetch = async (url, options = {}) => {
  fetchCalls.push({ url, options });
  return {
    ok: mockStatus >= 200 && mockStatus < 300,
    status: mockStatus,
    statusText: mockStatus === 401 ? 'Unauthorized' : 'OK',
    headers: {
      get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => mockBody,
  };
};

async function runTests() {
  console.log('====================================================');
  console.log('🔐 SHEEBA FRONTEND SESSION EXPIRATION TEST SUITE');
  console.log('====================================================\n');

  const {
    api,
    requestApi,
    getAuthToken,
    setAuthToken,
    decodeJwtPayload,
    getTokenExpirationMs,
    isTokenExpired,
    AUTH_TOKEN_KEY,
    AUTH_USER_KEY,
    AUTH_EXPIRED_EVENT,
  } = await import('../src/services/api.ts');

  // 1. JWT decoding & expiration checks
  console.log('📦 1. Testing Client-Side JWT Decoding & Expiration...');
  const nowSec = Math.floor(Date.now() / 1000);
  const validToken = makeJwt({ userId: 'u-1', role: 'attendee', exp: nowSec + 7200 });
  const expiredToken = makeJwt({ userId: 'u-1', role: 'attendee', exp: nowSec - 60 });
  const missingExpToken = makeJwt({ userId: 'u-1', role: 'attendee' });

  assert(decodeJwtPayload(validToken)?.userId === 'u-1', 'Safely decodes valid JWT payload');
  assert(getTokenExpirationMs(validToken) === (nowSec + 7200) * 1000, 'Extracts exact exp timestamp in ms');
  assert(isTokenExpired(validToken) === false, 'Valid 2h token is reported as not expired');
  assert(isTokenExpired(expiredToken) === true, 'Expired token is reported as expired');
  assert(isTokenExpired(missingExpToken) === true, 'Token without exp claim is rejected as expired');
  assert(isTokenExpired('not.a.jwt') === true, 'Malformed token is rejected as expired');

  // 2. Refresh / restoration check clears expired token & user
  console.log('\n📦 2. Testing Browser Refresh / Session Restoration Rejection...');
  localStorage.setItem(AUTH_TOKEN_KEY, expiredToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 'u-1', role: 'ATTENDEE' }));

  const restored = getAuthToken();
  assert(restored === null, 'getAuthToken returns null for expired token');
  assert(localStorage.getItem(AUTH_TOKEN_KEY) === null, 'Expired token is cleared from localStorage');
  assert(localStorage.getItem(AUTH_USER_KEY) === null, 'Stale user profile is cleared from localStorage');

  // 3. api.auth.getMe bypasses cache (skipCache: true)
  console.log('\n📦 3. Testing api.auth.getMe() Bypasses In-Memory Cache...');
  setAuthToken(validToken);
  fetchCalls = [];
  mockStatus = 200;
  mockBody = { success: true, data: { id: 'u-1', email: 'user@sheeba.et', role: 'ATTENDEE' } };

  const me1 = await api.auth.getMe();
  const me2 = await api.auth.getMe();
  assert(me1?.id === 'u-1' && me2?.id === 'u-1', 'getMe returns user profile when backend responds 200');
  assert(fetchCalls.length === 2, `Two consecutive getMe() calls hit backend both times (count=${fetchCalls.length})`);

  // 4. HTTP 401 synchronization on protected GET and POST
  console.log('\n📦 4. Testing HTTP 401 Synchronization & Event Dispatch...');
  let authExpiredEvents = 0;
  const onExpired = () => {
    authExpiredEvents++;
  };
  window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);

  setAuthToken(validToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 'u-1', role: 'ATTENDEE' }));
  mockStatus = 401;
  mockBody = { success: false, message: 'Session expired. Please log in again.' };

  let getThrew401 = false;
  try {
    await requestApi('/events/organizer/my-events');
  } catch (err) {
    getThrew401 = err.status === 401;
  }
  assert(getThrew401, 'Protected GET 401 still rejects with status 401');
  assert(authExpiredEvents === 1, 'Protected GET 401 emits AUTH_EXPIRED_EVENT immediately');
  assert(localStorage.getItem(AUTH_TOKEN_KEY) === null, 'Protected GET 401 clears sheba_auth_token');
  assert(localStorage.getItem(AUTH_USER_KEY) === null, 'Protected GET 401 clears sheba_auth_user');

  // Mutation 401
  setAuthToken(validToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 'u-1', role: 'ATTENDEE' }));
  let postThrew401 = false;
  try {
    await requestApi('/tickets/register', { method: 'POST', body: '{}' });
  } catch (err) {
    postThrew401 = err.status === 401;
  }
  assert(postThrew401, 'Protected POST 401 rejects with status 401');
  assert(authExpiredEvents === 2, 'Protected POST 401 emits AUTH_EXPIRED_EVENT immediately');
  assert(localStorage.getItem(AUTH_TOKEN_KEY) === null, 'Protected POST 401 clears sheba_auth_token');

  // 5. Failed login / wrong password on switch-role does NOT trigger logout
  console.log('\n📦 5. Testing Login / Wrong-Password 401 Does Not Trigger Auto-Logout...');
  setAuthToken(validToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 'u-1', role: 'ATTENDEE' }));
  const eventsBefore = authExpiredEvents;

  mockStatus = 401;
  mockBody = { success: false, message: 'Incorrect email or password.' };
  try {
    await requestApi('/auth/login', { method: 'POST', body: '{}' });
  } catch {
    // expected
  }
  try {
    await requestApi('/auth/sponsor/login', { method: 'POST', body: '{}' });
  } catch {
    // expected
  }
  try {
    await requestApi('/auth/switch-role', { method: 'POST', body: '{}' });
  } catch {
    // expected
  }

  assert(authExpiredEvents === eventsBefore, 'Login and wrong-password 401s do not emit AUTH_EXPIRED_EVENT');
  assert(localStorage.getItem(AUTH_TOKEN_KEY) === validToken, 'Valid session token remains intact after wrong-password 401');

  // Switch-role with actual session expired message SHOULD emit AUTH_EXPIRED_EVENT
  mockBody = { success: false, message: 'Session expired. Please log in again.' };
  try {
    await requestApi('/auth/switch-role', { method: 'POST', body: '{}' });
  } catch {
    // expected
  }
  assert(authExpiredEvents === eventsBefore + 1, 'Expired-token 401 on /auth/switch-role emits AUTH_EXPIRED_EVENT');

  window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);

  console.log('\n====================================================');
  console.log(`📊 FRONTEND SESSION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

