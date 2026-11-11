process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = 'postgres://test_user:test_pass@localhost:5432/sheeba_isolated_test';

import { PassThrough } from 'stream';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app';
import pool from '../config/db';
import { ENV } from '../config/env';
import { signAuthToken, verifyAuthToken } from '../utils/jwt.util';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';
import { CacheService } from '../services/cache.service';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: unknown) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`, detail !== undefined ? detail : '');
    failed++;
  }
}

async function httpRequest(
  _baseUrl: string,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough() as any;
    socket.remoteAddress = '127.0.0.1';
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = `/api${path}`;
    const rawBody = body !== undefined ? JSON.stringify(body) : '';
    const normalizedHeaders: Record<string, string> = {
      'content-type': 'application/json',
    };
    for (const [k, v] of Object.entries(headers)) {
      normalizedHeaders[k.toLowerCase()] = v;
    }
    if (rawBody) {
      normalizedHeaders['content-length'] = String(Buffer.byteLength(rawBody));
    }
    req.headers = normalizedHeaders;

    const res = new http.ServerResponse(req);
    const chunks: Buffer[] = [];
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = ((chunk: any, ...args: any[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return origWrite(chunk, ...args);
    }) as any;

    res.end = ((chunk?: any, ...args: any[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const result = origEnd(chunk, ...args);
      const raw = Buffer.concat(chunks).toString('utf8');
      const headerSep = raw.indexOf('\r\n\r\n');
      const bodyStr = headerSep !== -1 ? raw.slice(headerSep + 4) : raw;
      let parsed: any = null;
      try {
        parsed = JSON.parse(bodyStr);
      } catch {
        parsed = bodyStr;
      }
      resolve({ status: res.statusCode, data: parsed });
      return result;
    }) as any;

    (app as any)(req, res, (err: any) => {
      if (err) reject(err);
    });

    if (rawBody) {
      req.push(rawBody);
    }
    req.push(null);
  });
}

async function run() {
  console.log('====================================================');
  console.log('🔐 SHEEBA SESSION EXPIRATION VERIFICATION SUITE');
  console.log('====================================================\n');

  // 1. Env & JWT utility checks
  console.log('📦 1. Verifying JWT Expiration Configuration & Utility...');
  assert(ENV.JWT_EXPIRES_IN === '2h', `ENV.JWT_EXPIRES_IN is 2h (got ${ENV.JWT_EXPIRES_IN})`);
  assert(
    ENV.ACTION_TOKEN_EXPIRES_IN === '7d',
    `ENV.ACTION_TOKEN_EXPIRES_IN is 7d (got ${ENV.ACTION_TOKEN_EXPIRES_IN})`
  );

  const sessionToken = signAuthToken({
    userId: 'user-1',
    email: 'user@sheeba.et',
    role: 'attendee',
    fullName: 'Test User',
  });
  const decodedSession = verifyAuthToken(sessionToken);
  const sessionTtl = (decodedSession.exp || 0) - (decodedSession.iat || 0);
  assert(sessionTtl === 7200, `Default signAuthToken TTL is exactly 7200s / 2 hours (got ${sessionTtl}s)`);

  // preserveExp must not extend expiration
  const originalExp = Math.floor(Date.now() / 1000) + 1800; // 30 mins remaining
  const preservedToken = signAuthToken(
    {
      userId: 'user-1',
      email: 'user@sheeba.et',
      role: 'organizer',
      fullName: 'Test User',
    },
    { preserveExp: originalExp }
  );
  const decodedPreserved = verifyAuthToken(preservedToken);
  assert(
    decodedPreserved.exp === originalExp,
    `preserveExp keeps exact original exp (${decodedPreserved.exp} === ${originalExp})`
  );

  let expiredPreserveRejected = false;
  try {
    signAuthToken(
      {
        userId: 'user-1',
        email: 'user@sheeba.et',
        role: 'organizer',
        fullName: 'Test User',
      },
      { preserveExp: Math.floor(Date.now() / 1000) - 5 }
    );
  } catch (err: any) {
    expiredPreserveRejected = err.name === 'TokenExpiredError';
  }
  assert(expiredPreserveRejected, 'signAuthToken refuses to re-sign an already expired preserveExp');

  // Action token retains 7-day validity
  const actionToken = signAuthToken(
    {
      userId: 'user-1',
      email: 'user@sheeba.et',
      role: 'attendee',
      fullName: 'Test User',
    },
    { expiresIn: ENV.ACTION_TOKEN_EXPIRES_IN as any }
  );
  const decodedAction = verifyAuthToken(actionToken);
  const actionTtl = (decodedAction.exp || 0) - (decodedAction.iat || 0);
  assert(actionTtl === 7 * 86400, `Organizer action token retains 7-day TTL (604800s, got ${actionTtl}s)`);

  // Stub DB & side effects for full Express + Service verification without touching real DB
  const passwordHash = await bcrypt.hash('ValidPass123!', 4);
  const mockUserRow = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'multi@sheeba.et',
    password_hash: passwordHash,
    full_name: 'Multi Role User',
    role: 'attendee',
    is_active: true,
    approval_status: 'approved',
    is_organizer: true,
    organizer_approval_status: 'approved',
    is_exhibitor: true,
    must_change_password: false,
    deleted_at: null,
    visibility: 'public',
    member_since: 'August 2026',
    has_password: true,
  };

  (AuditService as any).logAction = async () => {};
  (CacheService as any).del = async () => {};
  (CacheService as any).delPattern = async () => {};
  let capturedActionToken: string | undefined;
  (EmailService as any).sendOrganizerInfoRequestedEmail = async (
    _to: string,
    _name: string,
    _org: string,
    _notes: string,
    token?: string
  ) => {
    capturedActionToken = token;
  };
  (EmailService as any).sendWelcomeEmail = async () => {};
  (EmailService as any).sendPasswordChangedNotificationEmail = async () => {};

  const originalPoolQuery = pool.query.bind(pool);
  pool.query = (async (sql: string, params?: any[]) => {
    const q = String(sql).toLowerCase();
    if (q.includes('from tickets t') && q.includes('count(')) {
      return { rowCount: 1, rows: [{ meetups_count: '0', workshops_count: '0', hackathons_count: '0', total_attended: '0' }] };
    }
    if (q.includes('from otp_verifications')) {
      return {
        rowCount: 1,
        rows: [
          {
            id: 'otp-1',
            email: 'otp@sheeba.et',
            otp_code: '123456',
            expires_at: new Date(Date.now() + 180000),
            attempts: 0,
            metadata: {
              full_name: 'OTP User',
              password_hash: passwordHash,
              role: 'attendee',
            },
          },
        ],
      };
    }
    if (q.startsWith('insert into users')) {
      return { rowCount: 1, rows: [{ ...mockUserRow, email: 'otp@sheeba.et' }] };
    }
    if (q.startsWith('update users') && q.includes('organizer_info_requested_notes')) {
      return { rowCount: 1, rows: [{ ...mockUserRow, organizer_approval_status: 'more_info_needed' }] };
    }
    if (q.includes('from users')) {
      if (params?.[0] === 'otp@sheeba.et') {
        return { rowCount: 0, rows: [] };
      }
      if (params?.[0] === 'sponsor@sheeba.et') {
        return {
          rowCount: 1,
          rows: [{ ...mockUserRow, email: 'sponsor@sheeba.et', role: 'sponsor', approval_status: 'approved' }],
        };
      }
      return { rowCount: 1, rows: [mockUserRow] };
    }
    return { rowCount: 0, rows: [] };
  }) as any;

  const baseUrl = '';

  try {
    // 2. HTTP Protected route tests (valid vs expired)
    console.log('\n📦 2. Testing HTTP Protected Endpoints (Valid vs Expired JWT)...');
    const validRes = await httpRequest(baseUrl, 'GET', '/users/profile', {
      Authorization: `Bearer ${sessionToken}`,
    });
    assert(validRes.status === 200 && validRes.data?.success === true, 'Valid token accesses /api/users/profile (HTTP 200)');

    const expiredJwt = jwt.sign(
      { userId: mockUserRow.id, email: mockUserRow.email, role: 'attendee', fullName: mockUserRow.full_name },
      ENV.JWT_SECRET,
      { expiresIn: -10 }
    );

    const expiredProfileRes = await httpRequest(baseUrl, 'GET', '/users/profile', {
      Authorization: `Bearer ${expiredJwt}`,
    });
    assert(expiredProfileRes.status === 401, `Expired token rejected at /api/users/profile with HTTP 401 (got ${expiredProfileRes.status})`);

    const expiredMeRes = await httpRequest(baseUrl, 'GET', '/auth/me', {
      Authorization: `Bearer ${expiredJwt}`,
    });
    assert(expiredMeRes.status === 401, `Expired token rejected at /api/auth/me with HTTP 401 (got ${expiredMeRes.status})`);

    const expiredSwitchRes = await httpRequest(
      baseUrl,
      'POST',
      '/auth/switch-role',
      { Authorization: `Bearer ${expiredJwt}` },
      { targetRole: 'ORGANIZER', password: 'ValidPass123!' }
    );
    assert(expiredSwitchRes.status === 401, `Expired token rejected at /api/auth/switch-role with HTTP 401 (got ${expiredSwitchRes.status})`);

    // 3. Role switching preserves original exp over HTTP
    console.log('\n📦 3. Testing Role Switch & Password Change Expiration Preservation...');
    const shortRemainingExp = Math.floor(Date.now() / 1000) + 900; // 15 minutes remaining
    const shortSessionToken = signAuthToken(
      {
        userId: mockUserRow.id,
        email: mockUserRow.email,
        role: 'attendee',
        fullName: mockUserRow.full_name,
      },
      { preserveExp: shortRemainingExp }
    );

    const switchRes = await httpRequest(
      baseUrl,
      'POST',
      '/auth/switch-role',
      { Authorization: `Bearer ${shortSessionToken}` },
      { targetRole: 'ORGANIZER', password: 'ValidPass123!' }
    );
    assert(switchRes.status === 200 && Boolean(switchRes.data?.data?.token), 'Role switch succeeds with valid token');
    const switchedDecoded = verifyAuthToken(switchRes.data.data.token);
    assert(
      switchedDecoded.exp === shortRemainingExp,
      `Role switch preserves original exp (${switchedDecoded.exp} === ${shortRemainingExp}) and does NOT extend to +2h`
    );
    assert(switchedDecoded.role === 'organizer', `Role switch updates role claim to organizer (got ${switchedDecoded.role})`);

    const pwChangeRes = await httpRequest(
      baseUrl,
      'POST',
      '/auth/change-password',
      { Authorization: `Bearer ${shortSessionToken}` },
      { currentPassword: 'ValidPass123!', newPassword: 'NewValidPass456!', confirmPassword: 'NewValidPass456!' }
    );
    assert(pwChangeRes.status === 200 && Boolean(pwChangeRes.data?.data?.token), 'Password change succeeds with valid token');
    const pwChangedDecoded = verifyAuthToken(pwChangeRes.data.data.token);
    assert(
      pwChangedDecoded.exp === shortRemainingExp,
      `Password change preserves original exp (${pwChangedDecoded.exp} === ${shortRemainingExp}) and does NOT extend session`
    );

    // 4. All login methods follow 2h expiration policy
    console.log('\n📦 4. Testing All Login Methods Follow 2-Hour Policy...');
    const emailLogin = await AuthService.loginUser({ email: mockUserRow.email, password: 'ValidPass123!' });
    const emailExp = verifyAuthToken(emailLogin.token);
    assert((emailExp.exp! - emailExp.iat!) === 7200, 'Email/password login issues 2h JWT');

    const sponsorLogin = await AuthService.loginUser({
      email: 'sponsor@sheeba.et',
      password: 'ValidPass123!',
      role: 'sponsor',
    });
    const sponsorExp = verifyAuthToken(sponsorLogin.token);
    assert((sponsorExp.exp! - sponsorExp.iat!) === 7200, 'Sponsor login issues 2h JWT');

    const otpReg = await AuthService.verifyRegistrationOtp({ email: 'otp@sheeba.et', otp: '123456' });
    const otpExp = verifyAuthToken(otpReg.token);
    assert((otpExp.exp! - otpExp.iat!) === 7200, 'Registration OTP completion issues 2h JWT');

    // Mock Google OAuth client verification inside AuthService
    const { OAuth2Client } = await import('google-auth-library');
    OAuth2Client.prototype.verifyIdToken = (async () => ({
      getPayload: () => ({
        sub: 'google-sub-1',
        email: mockUserRow.email,
        email_verified: true,
        name: mockUserRow.full_name,
      }),
    })) as any;

    const googleLogin = await AuthService.loginWithGoogle('fake-google-id-token', 'attendee', 'login');
    const googleExp = verifyAuthToken(googleLogin.token);
    assert((googleExp.exp! - googleExp.iat!) === 7200, 'Google login issues 2h JWT');

    // Sponsor Google login
    pool.query = (async (sql: string) => {
      if (String(sql).toLowerCase().includes('from users')) {
        return {
          rowCount: 1,
          rows: [{ ...mockUserRow, email: 'sponsor@sheeba.et', role: 'sponsor', approval_status: 'approved', google_id: 'google-sub-1' }],
        };
      }
      return { rowCount: 0, rows: [] };
    }) as any;
    const sponsorGoogle = await AuthService.loginSponsorWithGoogle('fake-google-id-token', 'login');
    const sponsorGoogleExp = verifyAuthToken(sponsorGoogle.token);
    assert((sponsorGoogleExp.exp! - sponsorGoogleExp.iat!) === 7200, 'Sponsor Google login issues 2h JWT');

    // 5. Organizer email action links retain 7-day validity
    console.log('\n📦 5. Testing Organizer Email Action Link Validity...');
    pool.query = (async (sql: string) => {
      const q = String(sql).toLowerCase();
      if (q.startsWith('update users') && q.includes('organizer_info_requested_notes')) {
        return { rowCount: 1, rows: [{ ...mockUserRow, organizer_approval_status: 'more_info_needed' }] };
      }
      if (q.includes('from users')) {
        return { rowCount: 1, rows: [mockUserRow] };
      }
      return { rowCount: 0, rows: [] };
    }) as any;

    await AdminService.requestOrganizerInfo(mockUserRow.id, 'Please provide website link');
    assert(Boolean(capturedActionToken), 'AdminService.requestOrganizerInfo generated an actionToken');
    const decodedOrgAction = verifyAuthToken(capturedActionToken!);
    assert(
      (decodedOrgAction.exp! - decodedOrgAction.iat!) === 7 * 86400,
      `Organizer email action token has 7-day validity (got ${decodedOrgAction.exp! - decodedOrgAction.iat!}s)`
    );

    const orgDetailsRes = await httpRequest(
      baseUrl,
      'GET',
      `/auth/organizer-response-details?token=${encodeURIComponent(capturedActionToken!)}`
    );
    assert(orgDetailsRes.status === 200, 'Organizer response endpoint accepts valid 7-day action token');

    const expiredOrgDetailsRes = await httpRequest(
      baseUrl,
      'GET',
      `/auth/organizer-response-details?token=${encodeURIComponent(expiredJwt)}`
    );
    assert(expiredOrgDetailsRes.status === 401, 'Organizer response endpoint rejects expired action token with 401');
  } finally {
    pool.query = originalPoolQuery;
  }

  console.log('\n====================================================');
  console.log(`📊 SESSION EXPIRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
