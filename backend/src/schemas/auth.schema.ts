import { z } from 'zod';

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required.').optional(),
    fullName: z.string().trim().min(1, 'Full name is required.').optional(),
    email: z.string().trim().email('Please provide a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters long.'),
    role: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    bio: z.string().trim().optional(),
    organization: z.string().trim().optional(),
  })
  .transform((data) => ({
    full_name: (data.full_name || data.fullName || '').trim(),
    email: data.email.toLowerCase().trim(),
    password: data.password,
    role: data.role ? data.role.toUpperCase().trim() : 'ATTENDEE',
    phone: data.phone?.trim(),
    bio: data.bio?.trim(),
    organization: data.organization?.trim(),
  }))
  .superRefine((data, ctx) => {
    if (!data.full_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Full name is required.',
        path: ['full_name'],
      });
    }

    if (data.role) {
      const norm = data.role.toLowerCase();
      if (norm === 'admin') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Administrator accounts cannot be created via public registration.',
          path: ['role'],
        });
      } else if (!['attendee', 'organizer', 'sponsor'].includes(norm)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Role must be either ATTENDEE or ORGANIZER.',
          path: ['role'],
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  role: z.enum(['attendee', 'organizer', 'sponsor', 'ATTENDEE', 'ORGANIZER', 'SPONSOR']).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required.'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
});

export const googleAuthSchema = z.object({
  credential: z.string().trim().min(1, 'Google credential token is required.'),
  role: z.enum(['ATTENDEE', 'ORGANIZER']).optional(),
  mode: z.enum(['login', 'signup']).optional(),
});

export const applyOrganizerSchema = z.object({
  organization: z.string().trim().min(1, 'Organization / Community name is required.'),
  password: z.string().min(1, 'Please confirm with your account password to submit your application.'),
  bio: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  socials: z.record(z.string(), z.string()).optional(),
});

export const switchRoleSchema = z.object({
  targetRole: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['ATTENDEE', 'ORGANIZER'], {
      message: 'Target role must be either ATTENDEE or ORGANIZER.',
    })
  ),
  password: z.string().optional(),
});

export const sponsorRegisterSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required.').optional(),
    fullName: z.string().trim().min(1, 'Full name is required.').optional(),
    email: z.string().trim().email('Please provide a valid corporate email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters long.'),
    company_name: z.string().trim().min(1, 'Company name is required.').optional(),
    companyName: z.string().trim().min(1, 'Company name is required.').optional(),
    industry_category: z.string().trim().min(1, 'Industry category is required.').optional(),
    industryCategory: z.string().trim().min(1, 'Industry category is required.').optional(),
    company_phone: z.string().trim().min(1, 'Company phone is required.').optional(),
    companyPhone: z.string().trim().min(1, 'Company phone is required.').optional(),
    company_website: z
      .string()
      .trim()
      .url('Please provide a valid company website URL.')
      .or(z.literal(''))
      .optional(),
    companyWebsite: z
      .string()
      .trim()
      .url('Please provide a valid company website URL.')
      .or(z.literal(''))
      .optional(),
  })
  .transform((data) => ({
    full_name: (data.full_name || data.fullName || '').trim(),
    email: data.email.toLowerCase().trim(),
    password: data.password,
    company_name: (data.company_name || data.companyName || '').trim(),
    industry_category: (data.industry_category || data.industryCategory || '').trim(),
    company_phone: (data.company_phone || data.companyPhone || '').trim(),
    company_website: (data.company_website || data.companyWebsite || '').trim() || undefined,
  }))
  .superRefine((data, ctx) => {
    if (!data.full_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Full name is required.', path: ['full_name'] });
    }
    if (!data.company_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Company name is required.', path: ['company_name'] });
    }
    if (!data.industry_category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Industry category is required.', path: ['industry_category'] });
    }
    if (!data.company_phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Company phone is required.', path: ['company_phone'] });
    }
  });

export const sponsorGoogleAuthSchema = z.object({
  credential: z.string().trim().min(1, 'Google credential token is required.'),
  mode: z.enum(['login', 'signup']).optional(),
  company_name: z.string().trim().optional(),
  industry_category: z.string().trim().optional(),
  company_phone: z.string().trim().optional(),
  company_website: z.string().trim().url('Please provide a valid company website URL.').or(z.literal('')).optional(),
});

export const sponsorOtpRequestSchema = z.object({
  email: z.string().trim().email('Please provide a valid corporate email address.'),
});

export const sponsorVerifyOtpSchema = z.object({
  email: z.string().trim().email('Please provide a valid corporate email address.'),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits.'),
});

export const sponsorResetPasswordOtpSchema = z.object({
  email: z.string().trim().email('Please provide a valid corporate email address.'),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits.'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type ApplyOrganizerInput = z.infer<typeof applyOrganizerSchema>;
export type SwitchRoleInput = z.infer<typeof switchRoleSchema>;
export type SponsorRegisterInput = z.infer<typeof sponsorRegisterSchema>;
export type SponsorGoogleAuthInput = z.infer<typeof sponsorGoogleAuthSchema>;
export type SponsorOtpRequestInput = z.infer<typeof sponsorOtpRequestSchema>;
export type SponsorVerifyOtpInput = z.infer<typeof sponsorVerifyOtpSchema>;
export type SponsorResetPasswordOtpInput = z.infer<typeof sponsorResetPasswordOtpSchema>;
