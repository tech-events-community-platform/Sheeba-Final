import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  role: z.enum(['ATTENDEE', 'ORGANIZER', 'SPONSOR', 'attendee', 'organizer', 'sponsor']).optional(),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Please enter your full name.').optional(),
    full_name: z.string().trim().min(1, 'Please enter your full name.').optional(),
    email: z.string().trim().email('Please enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters long.'),
    role: z.enum(['ATTENDEE', 'ORGANIZER', 'SPONSOR', 'attendee', 'organizer', 'sponsor']).default('ATTENDEE'),
    organization: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    bio: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      const name = data.fullName || data.full_name;
      return Boolean(name && name.trim().length > 0);
    },
    {
      message: 'Please enter your full name.',
      path: ['fullName'],
    }
  )
  .refine(
    (data) => {
      const normRole = (data.role || '').toUpperCase();
      if (normRole === 'ORGANIZER' && (!data.organization || data.organization.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Please specify your organization or community name.',
      path: ['organization'],
    }
  );

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

export const sponsorRegisterSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.'),
  email: z.string().trim().email('Please enter a valid corporate email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  companyName: z.string().trim().min(1, 'Company name is required.'),
  industryCategory: z.string().trim().min(1, 'Please select an industry category.'),
  companyPhone: z.string().trim().min(1, 'Company phone number is required.'),
  companyWebsite: z
    .string()
    .trim()
    .url('Please provide a valid company website URL.')
    .or(z.literal(''))
    .optional(),
});

export const sponsorForgotOtpStep1Schema = z.object({
  email: z.string().trim().email('Please enter your corporate work email.'),
});

export const sponsorForgotOtpStep2Schema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'Please enter the complete 6-digit verification code.'),
});

export const sponsorResetPasswordStep3Schema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match. Please re-enter.',
    path: ['confirmPassword'],
  });

export const applyOrganizerSchema = z.object({
  organization: z.string().trim().min(1, 'Please provide an organization or community name.'),
  applyPassword: z.string().min(1, 'Please enter your account password to authorize your application.'),
  bio: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  telegram: z.string().trim().optional(),
  xHandle: z.string().trim().optional(),
});

export const switchRoleSchema = z.object({
  switchPassword: z.string().min(1, 'Please enter your account password.'),
});

export const verifyRegistrationOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  otp: z.string().trim().regex(/^\d{6}$/, 'Please enter the complete 6-digit verification code.'),
});

export const resendRegistrationOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

export const forgotOtpStep1Schema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

export const forgotOtpStep2Schema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'Please enter the complete 6-digit verification code.'),
});

export const resetPasswordStep3Schema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match. Please re-enter.',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyRegistrationOtpInput = z.infer<typeof verifyRegistrationOtpSchema>;
export type ResendRegistrationOtpInput = z.infer<typeof resendRegistrationOtpSchema>;
export type ForgotOtpStep1Input = z.infer<typeof forgotOtpStep1Schema>;
export type ForgotOtpStep2Input = z.infer<typeof forgotOtpStep2Schema>;
export type ResetPasswordStep3Input = z.infer<typeof resetPasswordStep3Schema>;
export type SponsorRegisterInput = z.infer<typeof sponsorRegisterSchema>;
export type SponsorForgotOtpStep1Input = z.infer<typeof sponsorForgotOtpStep1Schema>;
export type SponsorForgotOtpStep2Input = z.infer<typeof sponsorForgotOtpStep2Schema>;
export type SponsorResetPasswordStep3Input = z.infer<typeof sponsorResetPasswordStep3Schema>;
export type ApplyOrganizerInput = z.infer<typeof applyOrganizerSchema>;
export type SwitchRoleInput = z.infer<typeof switchRoleSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
