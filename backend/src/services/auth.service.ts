import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { IUser, IUserSafe, UserRole, ISponsorRegistration } from '../types';
import { signAuthToken } from '../utils/jwt.util';
import { EmailService } from './email.service';
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  static formatUserResponse(user: any, stats?: any) {
    const isOrganizer = Boolean(user.is_organizer || user.role?.toLowerCase() === 'organizer');
    const isSponsor = user.role?.toLowerCase() === 'sponsor';
    const organizerApprovalStatus = (user.organizer_approval_status && user.organizer_approval_status !== 'none')
      ? user.organizer_approval_status
      : (user.role?.toLowerCase() === 'organizer' ? (user.approval_status || 'pending') : 'none');

    const roles = [
      'ATTENDEE',
      ...(isOrganizer ? ['ORGANIZER'] : []),
      ...(user.role?.toLowerCase() === 'admin' ? ['ADMIN'] : []),
      ...(isSponsor ? ['SPONSOR'] : []),
    ];

    return {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: (user.role || 'attendee').toUpperCase(),
      avatarUrl: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.company_name || user.full_name)}&background=63474D&color=fff`,
      memberSince: user.member_since || 'August 2026',
      visibility: user.visibility || 'public',
      organization: user.organization || user.company_name || undefined,
      companyName: user.company_name || user.organization || undefined,
      industryCategory: user.industry_category || undefined,
      companyWebsite: user.company_website || undefined,
      companyPhone: user.company_phone || user.phone || undefined,
      phone: user.phone || user.company_phone || undefined,
      bio: user.bio || user.organizer_bio || undefined,
      isActive: user.is_active !== false,
      approvalStatus: user.approval_status || (user.role?.toLowerCase() === 'organizer' ? 'pending' : 'approved'),
      isOrganizer,
      organizerApprovalStatus,
      roles,
      stats: stats || {
        meetupsCount: 0,
        workshopsCount: 0,
        hackathonsCount: 0,
        totalEventsAttended: 0,
      },
    };
  }

  static async computeUserStats(userId: string) {
    const statsRes = await query(
      `SELECT 
        COUNT(CASE WHEN e.event_type = 'meetup' THEN 1 END) as meetups_count,
        COUNT(CASE WHEN e.event_type = 'workshop' THEN 1 END) as workshops_count,
        COUNT(CASE WHEN e.event_type = 'hackathon' THEN 1 END) as hackathons_count,
        COUNT(t.id) as total_attended
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.user_id = $1 AND t.status = 'CHECKED_IN'`,
      [userId]
    );

    const row = statsRes.rows[0] || {};
    return {
      meetupsCount: parseInt(row.meetups_count || '0', 10),
      workshopsCount: parseInt(row.workshops_count || '0', 10),
      hackathonsCount: parseInt(row.hackathons_count || '0', 10),
      totalEventsAttended: parseInt(row.total_attended || '0', 10),
    };
  }

  static async registerUser(data: {
    email: string;
    password: string;
    full_name: string;
    role?: UserRole | string;
    phone?: string;
    bio?: string;
    organization?: string;
  }): Promise<{ user: any; token: string; isPendingApproval?: boolean; message?: string }> {
    const {
      email,
      password,
      full_name,
      phone = null,
      bio = null,
      organization = null,
    } = data;

    const normalizedRole = (data.role || 'attendee').toLowerCase();
    if (normalizedRole === 'admin') {
      const err: any = new Error('Administrator accounts cannot be created via public registration.');
      err.statusCode = 403;
      throw err;
    }
    const isOrganizer = normalizedRole === 'organizer';
    const initialApprovalStatus = isOrganizer ? 'pending' : 'approved';
    const initialIsActive = !isOrganizer;

    // Check existing email
    const existing = await query<IUser>(
      'SELECT id, role, approval_status, is_active, is_organizer, organizer_approval_status FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const existingUser = existing.rows[0];
      const hasOrganizerProfile = Boolean(existingUser.is_organizer || existingUser.role?.toLowerCase() === 'organizer');

      if (isOrganizer) {
        if (hasOrganizerProfile) {
          const err: any = new Error('You already have an organizer account or pending application. Please sign in.');
          err.statusCode = 409;
          throw err;
        } else {
          const err: any = new Error('An account with this email already exists as an Attendee. Please sign in to your Attendee account and apply to become an organizer in Settings.');
          err.statusCode = 409;
          throw err;
        }
      } else {
        const err: any = new Error('An account with this email already exists. Please sign in to your account.');
        err.statusCode = 409;
        throw err;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(full_name)}&background=63474D&color=fff`;

    const result = await query<IUser>(
      `INSERT INTO users (
        email, password_hash, full_name, role, phone, bio, organization,
        avatar_url, visibility, member_since, is_active, approval_status,
        is_organizer, organizer_approval_status, organizer_bio
       )
       VALUES (LOWER($1), $2, $3, $4, $5, $6, $7, $8, 'public', 'August 2026', $9, $10, $11, $12, $13)
       RETURNING id, email, full_name, role, phone, bio, organization, avatar_url, visibility, member_since, is_active, approval_status, is_organizer, organizer_approval_status, organizer_bio, created_at, updated_at`,
      [
        email,
        passwordHash,
        full_name,
        normalizedRole,
        phone,
        bio,
        organization,
        avatarUrl,
        initialIsActive,
        initialApprovalStatus,
        isOrganizer,
        isOrganizer ? 'pending' : 'none',
        isOrganizer ? bio : null,
      ]
    );

    const rawUser = result.rows[0];

    // If organizer: registration goes to pending approval queue
    if (isOrganizer) {
      const user = this.formatUserResponse(rawUser);
      return {
        user,
        token: '',
        isPendingApproval: true,
        message: 'Your organizer application has been submitted and is under review by Sheeba Administration. It is typically reviewed within 1 hour.',
      };
    }

    // Attendee: immediate active login token
    const token = signAuthToken({
      userId: rawUser.id,
      email: rawUser.email,
      role: 'attendee',
      fullName: rawUser.full_name,
    });

    const user = this.formatUserResponse(rawUser);

    // Trigger separate "Welcome to Sheeba" email after account creation (Section 2)
    try {
      await EmailService.sendWelcomeEmail(rawUser.email, rawUser.full_name || 'Attendee');
    } catch (emailErr) {
      console.warn('Welcome email dispatch failed:', emailErr);
    }

    return { user, token, isPendingApproval: false };
  }

  static async loginUser(data: {
    email: string;
    password: string;
    role?: string;
  }): Promise<{ user: any; token: string }> {
    const { email, password, role } = data;

    const result = await query<IUser>(
      `SELECT id, email, password_hash, google_id, full_name, role, phone, bio, organization, company_name, industry_category, company_phone, company_website, avatar_url, visibility, member_since, is_active, approval_status, is_organizer, organizer_approval_status, organizer_bio, organizer_socials, created_at, updated_at
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (!result.rowCount || result.rowCount === 0) {
      const err: any = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const rawUser = result.rows[0];

    // Ensure password is provided and of valid type
    if (!password || typeof password !== 'string') {
      const err: any = new Error('Password is required.');
      err.statusCode = 400;
      throw err;
    }

    // Check if account has a password set or was created via OAuth (Google)
    if (!rawUser.password_hash) {
      if (rawUser.google_id) {
        const err: any = new Error(
          'This account was registered using Google Sign-In. Please sign in using the "Continue with Google" button.'
        );
        err.statusCode = 401;
        throw err;
      }
      const err: any = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, rawUser.password_hash);

    if (!isMatch) {
      const err: any = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const isSponsorAccount = rawUser.role?.toLowerCase() === 'sponsor';
    const requestedRole = (role || '').toLowerCase();

    // Prevent cross-portal logins: sponsors cannot use attendee/organizer login form
    if (isSponsorAccount && requestedRole !== 'sponsor') {
      const err: any = new Error('This account is registered as a Sponsor. Please sign in via the dedicated Sponsor Portal.');
      err.statusCode = 403;
      throw err;
    }

    // If logging into sponsor portal, verify that account has sponsor role
    if (requestedRole === 'sponsor') {
      if (!isSponsorAccount) {
        const err: any = new Error('This account is not registered as a Sponsor. Please use the Attendee or Organizer login.');
        err.statusCode = 403;
        throw err;
      }
      if (rawUser.approval_status !== 'approved') {
        const err: any = new Error('Your application will be reviewed shortly. Sheeba Administration is reviewing your sponsor account.');
        err.statusCode = 403;
        err.isPendingApproval = true;
        err.approvalStatus = rawUser.approval_status || 'pending';
        throw err;
      }
    }

    if (!rawUser.is_active && rawUser.role?.toLowerCase() !== 'organizer' && rawUser.role?.toLowerCase() !== 'sponsor') {
      const err: any = new Error('Your account has been deactivated. Please contact support.');
      err.statusCode = 403;
      throw err;
    }

    const isAdmin = rawUser.role?.toLowerCase() === 'admin';
    const isOrganizerAccount = Boolean(rawUser.is_organizer || rawUser.role?.toLowerCase() === 'organizer');
    const organizerStatus = (rawUser.organizer_approval_status && rawUser.organizer_approval_status !== 'none')
      ? rawUser.organizer_approval_status
      : (rawUser.approval_status || 'pending');

    let sessionRole: UserRole = 'attendee';

    if (isAdmin) {
      sessionRole = 'admin';
    } else if (requestedRole === 'sponsor') {
      sessionRole = 'sponsor';
    } else if (requestedRole === 'organizer') {
      if (!isOrganizerAccount) {
        const err: any = new Error('This account does not have an organizer profile. Please sign in as an Attendee and apply in your Settings.');
        err.statusCode = 403;
        throw err;
      }
      if (organizerStatus !== 'approved') {
        const err: any = new Error('Your organizer application is under review by Sheeba Administration. It is typically reviewed within 1 hour.');
        err.statusCode = 403;
        err.isPendingApproval = true;
        err.approvalStatus = organizerStatus;
        throw err;
      }
      sessionRole = 'organizer';
    } else if (requestedRole === 'attendee') {
      sessionRole = 'attendee';
    } else {
      // Unspecified role:
      if (rawUser.role?.toLowerCase() === 'sponsor') {
        if (rawUser.approval_status !== 'approved') {
          const err: any = new Error('Your application will be reviewed shortly. Sheeba Administration is reviewing your sponsor account.');
          err.statusCode = 403;
          err.isPendingApproval = true;
          throw err;
        }
        sessionRole = 'sponsor';
      } else if (rawUser.role?.toLowerCase() === 'organizer') {
        if (organizerStatus !== 'approved') {
          const err: any = new Error('Your organizer application is under review by Sheeba Administration. It is typically reviewed within 1 hour.');
          err.statusCode = 403;
          err.isPendingApproval = true;
          err.approvalStatus = organizerStatus;
          throw err;
        }
        sessionRole = 'organizer';
      } else if (isOrganizerAccount && organizerStatus === 'approved') {
        sessionRole = 'organizer';
      } else {
        sessionRole = 'attendee';
      }
    }

    const stats = await this.computeUserStats(rawUser.id);
    const token = signAuthToken({
      userId: rawUser.id,
      email: rawUser.email,
      role: sessionRole,
      fullName: rawUser.full_name,
    });

    const user = this.formatUserResponse(rawUser, stats);
    user.role = (sessionRole as string).toUpperCase() as any;
    return { user, token };
  }

  static async getCurrentUser(userId: string): Promise<any> {
    const result = await query<IUser>(
      `SELECT id, email, full_name, role, phone, bio, organization, company_name, industry_category, company_phone, company_website, avatar_url, visibility, member_since, is_active, approval_status, is_organizer, organizer_approval_status, organizer_bio, organizer_socials, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      const err: any = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const rawUser = result.rows[0];
    const stats = await this.computeUserStats(rawUser.id);
    return this.formatUserResponse(rawUser, stats);
  }

  static async applyForOrganizer(
    userId: string,
    data: {
      organization: string;
      bio?: string;
      phone?: string;
      password?: string;
      socials?: Record<string, string>;
    }
  ): Promise<{ user: any; message: string }> {
    const { organization, bio = null, phone = null, password, socials = {} } = data;

    if (!organization || !organization.trim()) {
      const err: any = new Error('Organization / Community name is required.');
      err.statusCode = 400;
      throw err;
    }

    const userRes = await query<IUser>(
      'SELECT id, password_hash, approval_status, organizer_approval_status FROM users WHERE id = $1',
      [userId]
    );

    if (!userRes.rowCount || userRes.rowCount === 0) {
      const err: any = new Error('User account not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = userRes.rows[0];

    // Password verification gate: formal application signature
    if (user.password_hash) {
      if (!password) {
        const err: any = new Error('Please confirm with your account password to submit your application.');
        err.statusCode = 401;
        throw err;
      }
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        const err: any = new Error('Incorrect password. Please verify your credentials to submit your application.');
        err.statusCode = 401;
        throw err;
      }
    }

    const updated = await query<IUser>(
      `UPDATE users
       SET organization = $1,
           organizer_bio = COALESCE($2, organizer_bio, bio),
           bio = COALESCE($2, bio),
           phone = COALESCE($3, phone),
           organizer_socials = $4,
           organizer_approval_status = 'pending',
           is_organizer = TRUE,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, full_name, role, phone, bio, organization, avatar_url, visibility, member_since, is_active, approval_status, is_organizer, organizer_approval_status, organizer_bio, organizer_socials, created_at, updated_at`,
      [organization.trim(), bio ? bio.trim() : null, phone ? phone.trim() : null, JSON.stringify(socials), userId]
    );

    const rawUpdated = updated.rows[0];
    const stats = await this.computeUserStats(rawUpdated.id);
    return {
      user: this.formatUserResponse(rawUpdated, stats),
      message: 'Your organizer application has been submitted and is currently being reviewed by Sheeba administration.',
    };
  }

  static async switchRole(
    userId: string,
    data: {
      targetRole: 'ATTENDEE' | 'ORGANIZER';
      password?: string;
    }
  ): Promise<{ user: any; token: string }> {
    const { targetRole, password } = data;
    const normalizedTarget = (targetRole || 'ATTENDEE').toUpperCase() as 'ATTENDEE' | 'ORGANIZER';

    const userRes = await query<IUser>(
      `SELECT id, email, password_hash, full_name, role, phone, bio, organization, avatar_url, visibility, member_since, is_active, approval_status, is_organizer, organizer_approval_status, organizer_bio, organizer_socials, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!userRes.rowCount || userRes.rowCount === 0) {
      const err: any = new Error('User account not found.');
      err.statusCode = 404;
      throw err;
    }

    const rawUser = userRes.rows[0];

    // Password verification gate: formal hopping between roles
    if (rawUser.password_hash) {
      if (!password) {
        const err: any = new Error('Please enter your password to switch to this workspace.');
        err.statusCode = 401;
        throw err;
      }
      const isMatch = await bcrypt.compare(password, rawUser.password_hash);
      if (!isMatch) {
        const err: any = new Error('Incorrect password. Credential verification required to change role context.');
        err.statusCode = 401;
        throw err;
      }
    }

    if (normalizedTarget === 'ORGANIZER') {
      const isOrganizer = Boolean(rawUser.is_organizer || rawUser.role?.toLowerCase() === 'organizer' || rawUser.role?.toLowerCase() === 'admin');
      const effApproval = rawUser.organizer_approval_status && rawUser.organizer_approval_status !== 'none'
        ? rawUser.organizer_approval_status
        : rawUser.approval_status;

      if (!isOrganizer) {
        const err: any = new Error('This account does not have an organizer profile. Please submit an application in your Attendee Settings.');
        err.statusCode = 403;
        throw err;
      }

      if (rawUser.role?.toLowerCase() !== 'admin' && effApproval !== 'approved') {
        const err: any = new Error('Your organizer application is pending administrator review. You will be able to access this workspace once approved.');
        err.statusCode = 403;
        err.isPendingApproval = true;
        throw err;
      }

      const token = signAuthToken({
        userId: rawUser.id,
        email: rawUser.email,
        role: rawUser.role?.toLowerCase() === 'admin' ? 'admin' : 'organizer',
        fullName: rawUser.full_name,
      });

      const stats = await this.computeUserStats(rawUser.id);
      const userFormatted = this.formatUserResponse(rawUser, stats);
      userFormatted.role = rawUser.role?.toLowerCase() === 'admin' ? 'ADMIN' : 'ORGANIZER';
      return { user: userFormatted, token };
    } else {
      // Switching to ATTENDEE
      const token = signAuthToken({
        userId: rawUser.id,
        email: rawUser.email,
        role: rawUser.role?.toLowerCase() === 'admin' ? 'admin' : 'attendee',
        fullName: rawUser.full_name,
      });

      const stats = await this.computeUserStats(rawUser.id);
      const userFormatted = this.formatUserResponse(rawUser, stats);
      userFormatted.role = rawUser.role?.toLowerCase() === 'admin' ? 'ADMIN' : 'ATTENDEE';
      return { user: userFormatted, token };
    }
  }

  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const result = await query<IUser>(
      'SELECT id, email, full_name FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rowCount && result.rowCount > 0) {
      const user = result.rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

      await query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, resetToken, expiresAt]
      );

      try {
        await EmailService.sendPasswordResetEmail(user.email, resetToken, user.full_name || 'Attendee');
      } catch (e) {
        console.warn('Password reset email dispatch error:', e);
      }
    }

    return {
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched.',
    };
  }

  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const tokenRes = await query(
      'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    if (!tokenRes.rowCount || tokenRes.rowCount === 0) {
      const err: any = new Error('Invalid or expired password reset token.');
      err.statusCode = 400;
      throw err;
    }

    const { user_id, expires_at } = tokenRes.rows[0];
    if (new Date() > new Date(expires_at)) {
      const err: any = new Error('Password reset token has expired.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user_id]);
    await query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);

    return {
      success: true,
      message: 'Password has been reset successfully. You may now log in.',
    };    
  }

  
  static async loginWithGoogle(credential: string, role?: string, mode: 'login' | 'register' = 'login') {
    // 1. Verify the ID token directly with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      const err: any = new Error('Invalid Google credential.');
      err.statusCode = 400;
      throw err;
    }

    if (!payload.email_verified) {
      const err: any = new Error('Google email is not verified.');
      err.statusCode = 400;
      throw err;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const fullName = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture;

    // 2. Search database: first by google_id, then by email
    let userRes = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user = userRes.rows[0];

    if (!user) {
      const emailRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (emailRes.rows.length > 0) {
        user = emailRes.rows[0];
        // Link Google ID to their existing account
        await query(
          'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3',
          [googleId, avatarUrl, user.id]
        );
        user.google_id = googleId;
      }
    }

    // Check mode rules:
    // If attempting to login but user doesn't exist -> reject
    if (mode === 'login' && !user) {
      const err: any = new Error('You have not registered yet. Please register first.');
      err.statusCode = 404;
      throw err;
    }

    const requestedRole = (role || 'attendee').toLowerCase();

    // If attempting to register but user already exists:
    if (mode === 'register' && user) {
      const isOrganizerAccount = Boolean(user.is_organizer || user.role?.toLowerCase() === 'organizer');
      if (requestedRole === 'organizer') {
        if (isOrganizerAccount) {
          const err: any = new Error('You already have an organizer account or pending application. Please sign in.');
          err.statusCode = 409;
          throw err;
        } else {
          const err: any = new Error('An account with this email already exists as an Attendee. Please sign in to your Attendee account and apply to become an organizer in Settings.');
          err.statusCode = 409;
          throw err;
        }
      } else {
        const err: any = new Error('An account with this email already exists. Please sign in.');
        err.statusCode = 409;
        throw err;
      }
    }

    // If registering and user does not exist, create the account
    if (!user) {
      const requested = (role || 'attendee').toLowerCase();
      // Ensure newly created Google users can only be attendee or organizer, never admin
      const assignedRole = requested === 'organizer' ? 'organizer' : 'attendee';
      const isOrganizer = assignedRole === 'organizer';
      const approvalStatus = isOrganizer ? 'pending' : 'approved';
      const insertRes = await query(
        `INSERT INTO users (email, full_name, role, avatar_url, google_id, approval_status, member_since, is_organizer, organizer_approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [email, fullName, assignedRole, avatarUrl, googleId, approvalStatus, 'September 2026', isOrganizer, isOrganizer ? 'pending' : 'none']
      );
      user = insertRes.rows[0];

      // Send welcome email
      EmailService.sendWelcomeEmail(email, fullName).catch((e) =>
        console.error('Welcome email dispatch failed:', e)
      );
    }

    // Determine session role
    const isOrganizerAccount = Boolean(user.is_organizer || user.role?.toLowerCase() === 'organizer');
    const effOrganizerStatus = user.organizer_approval_status && user.organizer_approval_status !== 'none'
      ? user.organizer_approval_status
      : (user.approval_status || 'pending');

    let sessionRole: UserRole = 'attendee';
    if (user.role?.toLowerCase() === 'admin') {
      sessionRole = 'admin';
    } else if (requestedRole === 'organizer') {
      if (!isOrganizerAccount) {
        const err: any = new Error('This account does not have an organizer profile. Please sign in as an Attendee and apply in your Settings.');
        err.statusCode = 403;
        throw err;
      }
      if (effOrganizerStatus !== 'approved') {
        const err: any = new Error('Your organizer application is under review by Sheeba Administration. It is typically reviewed within 1 hour.');
        err.statusCode = 403;
        err.isPendingApproval = true;
        err.approvalStatus = effOrganizerStatus;
        throw err;
      }
      sessionRole = 'organizer';
    } else {
      sessionRole = 'attendee';
    }

    // 3. Generate your Sheeba JWT token
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: sessionRole,
      fullName: user.full_name,
    });
    const stats = await AuthService.computeUserStats(user.id);
    const userFormatted = AuthService.formatUserResponse(user, stats);
    userFormatted.role = (sessionRole as string).toUpperCase() as any;
    return {
      user: userFormatted,
      token,
    };
  }

  /**
   * Register a new Sponsor account (requires Sheeba administration review)
   */
  static async registerSponsor(data: ISponsorRegistration): Promise<{ user: any; message: string }> {
    const {
      full_name,
      email,
      password,
      company_name,
      industry_category,
      company_phone,
      company_website = null,
    } = data;

    if (!full_name || !email || !password || !company_name || !industry_category || !company_phone) {
      const err: any = new Error('All required sponsor fields must be provided.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing email across all users
    const existing = await query<IUser>(
      'SELECT id, role, approval_status FROM users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const err: any = new Error('An account with this email address already exists. Please sign in or use a dedicated corporate email.');
      err.statusCode = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(company_name)}&background=63474D&color=FFA686`;

    const result = await query<IUser>(
      `INSERT INTO users (
        email, password_hash, full_name, role, phone, organization,
        company_name, industry_category, company_phone, company_website,
        avatar_url, visibility, member_since, is_active, approval_status
       )
       VALUES (LOWER($1), $2, $3, 'sponsor', $4, $5, $5, $6, $4, $7, $8, 'public', 'September 2026', FALSE, 'pending')
       RETURNING *`,
      [
        cleanEmail,
        passwordHash,
        full_name.trim(),
        company_phone.trim(),
        company_name.trim(),
        industry_category.trim(),
        company_website ? company_website.trim() : null,
        avatarUrl,
      ]
    );

    const rawUser = result.rows[0];
    const user = this.formatUserResponse(rawUser);

    // Send application received email
    try {
      await EmailService.sendSponsorApplicationReceivedEmail(cleanEmail, full_name.trim(), company_name.trim());
    } catch (e) {
      console.warn('Failed to send sponsor application email:', e);
    }

    return {
      user,
      message: 'Your application will be reviewed shortly. Wait a few moments until Sheeba Administration approves you...',
    };
  }

  /**
   * Sponsor Google Sign-In with optimal indexed lookup and Attendee/Organizer cross-role rejection
   */
  static async loginSponsorWithGoogle(
    credential: string,
    mode: 'login' | 'register' = 'login',
    sponsorData?: Partial<ISponsorRegistration>
  ): Promise<{ user: any; token: string }> {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      const err: any = new Error('Invalid Google credential.');
      err.statusCode = 400;
      throw err;
    }

    if (!payload.email_verified) {
      const err: any = new Error('Google email is not verified.');
      err.statusCode = 400;
      throw err;
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const fullName = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture;

    // Fast indexed query in PostgreSQL: check by email or google_id
    const userRes = await query<IUser>(
      `SELECT id, email, full_name, role, phone, organization, company_name, industry_category, company_phone, company_website, avatar_url, approval_status, is_active, google_id
       FROM users WHERE LOWER(email) = LOWER($1) OR google_id = $2`,
      [email, googleId]
    );

    if (userRes.rowCount && userRes.rowCount > 0) {
      const user = userRes.rows[0];

      // Rejection rule: If account is registered as Attendee or Organizer, reject
      if (user.role?.toLowerCase() !== 'sponsor') {
        const err: any = new Error(
          'This Google account is already registered as an Attendee or Organizer. Sponsor accounts require a dedicated corporate account.'
        );
        err.statusCode = 409;
        throw err;
      }

      // Check admin approval
      if (user.approval_status !== 'approved') {
        const err: any = new Error('Your application will be reviewed shortly. Sheeba Administration is reviewing your sponsor account.');
        err.statusCode = 403;
        err.isPendingApproval = true;
        err.approvalStatus = user.approval_status || 'pending';
        throw err;
      }

      // Ensure google_id is linked
      if (!user.google_id) {
        await query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
        user.google_id = googleId;
      }

      const token = signAuthToken({
        userId: user.id,
        email: user.email,
        role: 'sponsor',
        fullName: user.full_name,
      });

      const userFormatted = this.formatUserResponse(user);
      userFormatted.role = 'SPONSOR' as any;
      return { user: userFormatted, token };
    }

    // Account does not exist:
    if (mode === 'login') {
      const err: any = new Error('No sponsor account found for this Google email. Please register as a sponsor first.');
      err.statusCode = 404;
      throw err;
    }

    // Google registration mode: create pending sponsor account
    const companyName = sponsorData?.company_name || fullName;
    const industryCategory = sponsorData?.industry_category || 'Technology';
    const companyPhone = sponsorData?.company_phone || null;
    const companyWebsite = sponsorData?.company_website || null;

    const insertRes = await query<IUser>(
      `INSERT INTO users (
        email, full_name, role, google_id, avatar_url,
        company_name, industry_category, company_phone, company_website,
        organization, phone, visibility, member_since, is_active, approval_status
       )
       VALUES ($1, $2, 'sponsor', $3, $4, $5, $6, $7, $8, $5, $7, 'public', 'September 2026', FALSE, 'pending')
       RETURNING *`,
      [email, fullName, googleId, avatarUrl, companyName, industryCategory, companyPhone, companyWebsite]
    );

    const newUser = insertRes.rows[0];
    EmailService.sendSponsorApplicationReceivedEmail(email, fullName, companyName).catch(console.warn);

    const err: any = new Error('Your application will be reviewed shortly. Sheeba Administration is reviewing your sponsor account.');
    err.statusCode = 201;
    err.isPendingApproval = true;
    err.user = this.formatUserResponse(newUser);
    throw err;
  }

  /**
   * Dispatch a 6-digit numeric OTP to sponsor email (15-minute expiration)
   */
  static async sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const userRes = await query<IUser>(
      'SELECT id, email, full_name, role, company_name FROM users WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );

    if (!userRes.rowCount || userRes.rowCount === 0) {
      const err: any = new Error(
        'No registered sponsor account found with this email address. Please check your spelling or apply to become a sponsor.'
      );
      err.statusCode = 404;
      throw err;
    }

    const user = userRes.rows[0];
    if (user.role?.toLowerCase() !== 'sponsor') {
      const err: any = new Error(
        'This email belongs to an Attendee or Organizer account. Please use the standard password reset on the main login page.'
      );
      err.statusCode = 400;
      throw err;
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log(`\n======================================================`);
    console.log(`[Sponsor OTP Generated] 🔑 EMAIL: ${cleanEmail} | CODE: ${otpCode}`);
    console.log(`======================================================\n`);

    // Delete older unverified OTPs for this email
    await query('DELETE FROM otp_verifications WHERE LOWER(email) = LOWER($1)', [cleanEmail]);

    // Insert new OTP record
    await query(
      'INSERT INTO otp_verifications (email, otp_code, expires_at, attempts) VALUES (LOWER($1), $2, $3, 0)',
      [cleanEmail, otpCode, expiresAt]
    );

    // Dispatch email
    await EmailService.sendSponsorOtpEmail(cleanEmail, otpCode, user.full_name || user.company_name || 'Partner');

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email. It will expire in 15 minutes.',
    };
  }

  /**
   * Verify 6-digit OTP code before displaying new password inputs
   */
  static async verifySponsorOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim();

    const otpRes = await query(
      'SELECT id, otp_code, expires_at, attempts FROM otp_verifications WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1',
      [cleanEmail]
    );

    if (!otpRes.rowCount || otpRes.rowCount === 0) {
      const err: any = new Error('No active verification code found for this email. Please request a new code.');
      err.statusCode = 400;
      throw err;
    }

    const record = otpRes.rows[0];

    // Limit failed attempts to prevent brute-forcing
    if (record.attempts >= 5) {
      await query('DELETE FROM otp_verifications WHERE id = $1', [record.id]);
      const err: any = new Error('Too many failed attempts. Please request a new verification code.');
      err.statusCode = 429;
      throw err;
    }

    // Check expiration
    if (new Date() > new Date(record.expires_at)) {
      await query('DELETE FROM otp_verifications WHERE id = $1', [record.id]);
      const err: any = new Error('The verification code has expired. Please request a fresh one.');
      err.statusCode = 400;
      throw err;
    }

    // Match verification code
    if (record.otp_code !== cleanOtp) {
      await query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      const remaining = 5 - (record.attempts + 1);
      const err: any = new Error(`Invalid verification code. You have ${remaining} attempt(s) remaining.`);
      err.statusCode = 400;
      throw err;
    }

    // Mark OTP verified in database
    await query('UPDATE otp_verifications SET is_verified = TRUE WHERE id = $1', [record.id]);

    return {
      success: true,
      message: 'Code verified successfully! Please enter your new password below.',
    };
  }

  /**
   * Verify 6-digit OTP and reset account password
   */
  static async verifyOtpAndResetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim();

    const otpRes = await query(
      'SELECT id, otp_code, expires_at, attempts FROM otp_verifications WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1',
      [cleanEmail]
    );

    if (!otpRes.rowCount || otpRes.rowCount === 0) {
      const err: any = new Error('No active verification code found for this email. Please request a new one.');
      err.statusCode = 400;
      throw err;
    }

    const record = otpRes.rows[0];

    // Limit failed attempts to prevent brute-forcing
    if (record.attempts >= 5) {
      await query('DELETE FROM otp_verifications WHERE id = $1', [record.id]);
      const err: any = new Error('Too many failed attempts. Please request a new verification code.');
      err.statusCode = 429;
      throw err;
    }

    // Check expiration
    if (new Date() > new Date(record.expires_at)) {
      await query('DELETE FROM otp_verifications WHERE id = $1', [record.id]);
      const err: any = new Error('The verification code has expired. Please request a new one.');
      err.statusCode = 400;
      throw err;
    }

    // Match verification code
    if (record.otp_code !== cleanOtp) {
      await query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      const remaining = 5 - (record.attempts + 1);
      const err: any = new Error(`Invalid verification code. You have ${remaining} attempt(s) remaining.`);
      err.statusCode = 400;
      throw err;
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      const err: any = new Error('New password must be at least 6 characters.');
      err.statusCode = 400;
      throw err;
    }

    // Hash and update
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2)',
      [passwordHash, cleanEmail]
    );

    // Clean up OTP record
    await query('DELETE FROM otp_verifications WHERE id = $1', [record.id]);

    return {
      success: true,
      message: 'Your password has been successfully reset. You may now log in with your new password.',
    };
  }
}
