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
    confirmPassword: z.string().optional(),
    confirm_password: z.string().optional(),
    role: z.enum(['ATTENDEE', 'ORGANIZER', 'SPONSOR', 'attendee', 'organizer', 'sponsor']).default('ATTENDEE'),
    phone: z.string().trim().optional(),
    bio: z.string().trim().optional(),
    // Formalization fields
    applicantType: z.enum(['Individual Organizer', 'Organization / Institution']).default('Individual Organizer'),
    applicant_type: z.string().trim().optional(),
    personalIntroduction: z.string().trim().optional(),
    personal_introduction: z.string().trim().optional(),
    organization: z.string().trim().optional(),
    organization_name: z.string().trim().optional(),
    organizationType: z.string().trim().optional(),
    organization_type: z.string().trim().optional(),
    applicantPosition: z.string().trim().optional(),
    applicant_position: z.string().trim().optional(),
    position: z.string().trim().optional(),
    organizationDescription: z.string().trim().optional(),
    organization_description: z.string().trim().optional(),
    organizationWebsite: z.string().trim().optional(),
    organization_website: z.string().trim().optional(),
    website: z.string().trim().optional(),
    organizationLogo: z.string().trim().optional(),
    organization_logo: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const name = data.fullName || data.full_name;
    if (!name || name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter your full name.',
        path: ['fullName'],
      });
    }

    const confirm = data.confirmPassword || data.confirm_password;
    if (confirm && confirm !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match. Please re-enter.',
        path: ['confirmPassword'],
      });
    }

    const normRole = (data.role || '').toUpperCase();
    if (normRole === 'ORGANIZER') {
      if (!data.phone || data.phone.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone number is required.',
          path: ['phone'],
        });
      }

      const applicantType = data.applicantType || data.applicant_type || 'Individual Organizer';
      if (applicantType === 'Individual Organizer') {
        const intro = data.personalIntroduction || data.personal_introduction || data.bio;
        if (!intro || intro.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Short personal introduction is required.',
            path: ['personalIntroduction'],
          });
        }
      } else {
        // Organization / Institution
        const orgName = data.organization || data.organization_name;
        if (!orgName || orgName.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Organization name is required.',
            path: ['organization'],
          });
        }
        const orgType = data.organizationType || data.organization_type;
        if (!orgType || orgType.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Organization type is required.',
            path: ['organizationType'],
          });
        } else if (!ORGANIZATION_TYPES.includes(orgType as any)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Organization type must be one of: ${ORGANIZATION_TYPES.join(', ')}.`,
            path: ['organizationType'],
          });
        }
        const position = data.applicantPosition || data.applicant_position || data.position;
        if (!position || position.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Applicant's position or role is required.",
            path: ['applicantPosition'],
          });
        }
        const desc = data.organizationDescription || data.organization_description;
        if (!desc || desc.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Short organization description is required.',
            path: ['organizationDescription'],
          });
        }
      }
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

export const SPONSORSHIP_OBJECTIVES = [
  'Brand awareness',
  'Talent recruitment',
  'Startup discovery',
  'Community impact',
  'Product promotion',
  'Networking and partnerships',
] as const;

export const TARGET_AUDIENCES = [
  'University students',
  'Software developers',
  'Entrepreneurs and startup founders',
  'Researchers',
  'Technology professionals',
  'Business owners',
] as const;

export const PREFERRED_EVENT_CATEGORIES = [
  'Hackathons',
  'Workshops',
  'Tech conferences',
  'Career fairs',
  'Startup competitions',
  'Training programs',
  'Innovation events',
] as const;

export const PREDEFINED_SKILLS_INTERESTS = [
  'AI',
  'Software engineering',
  'Python',
  'Cloud computing',
  'Cybersecurity',
  'Data science',
  'Entrepreneurship',
] as const;

export const sponsorRegisterSchema = z.object({
  fullName: z.string().trim().min(1, 'Representative full name is required.'),
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
  companyDescription: z.string().trim().min(1, 'Company description is required.'),
  companyLogo: z
    .string()
    .trim()
    .url('Please provide a valid company logo URL.')
    .or(z.literal(''))
    .optional(),
  sponsorshipObjectives: z.array(z.string().trim().min(1)).min(1, 'Please select at least one sponsorship objective.'),
  targetAudience: z.array(z.string().trim().min(1)).min(1, 'Please select at least one target audience.'),
  preferredEventCategories: z.array(z.string().trim().min(1)).min(1, 'Please select at least one preferred event category.'),
  skillsAndInterests: z
    .array(z.string().trim().min(1).max(50, 'Skill/interest tag cannot exceed 50 characters.'))
    .min(1, 'Please select or add at least one skill or interest.'),
  preferredLocations: z.array(z.string().trim().min(1).max(100)).optional(),
  budgetRange: z.coerce.number().positive('Budget range must be greater than 0.').optional().nullable(),
  preferredBenefits: z.array(z.string().trim().min(1).max(100)).optional(),
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

export const ORGANIZER_APPLICANT_TYPES = [
  'Individual Organizer',
  'Organization / Institution',
] as const;

export const ORGANIZATION_TYPES = [
  'University / Educational Institution',
  'Company / Business',
  'Community / Student Club',
  'NGO',
  'Other',
] as const;

export const applyOrganizerSchema = z
  .object({
    applicantType: z.enum(['Individual Organizer', 'Organization / Institution']).default('Individual Organizer'),
    phone: z.string().trim().min(1, 'Phone number is required.'),
    applyPassword: z.string().optional(),
    // Individual Organizer field
    personalIntroduction: z.string().trim().optional(),
    // Organization fields
    organization: z.string().trim().optional(),
    organizationType: z.string().trim().optional(),
    applicantPosition: z.string().trim().optional(),
    organizationDescription: z.string().trim().optional(),
    organizationWebsite: z.string().trim().optional(),
    organizationLogo: z.string().trim().optional(),
    telegram: z.string().trim().optional(),
    xHandle: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.applicantType === 'Individual Organizer') {
      if (!data.personalIntroduction || data.personalIntroduction.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Short personal introduction is required.',
          path: ['personalIntroduction'],
        });
      }
    } else {
      if (!data.organization || data.organization.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization name is required.',
          path: ['organization'],
        });
      }
      if (!data.organizationType || data.organizationType.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization type is required.',
          path: ['organizationType'],
        });
      } else if (!ORGANIZATION_TYPES.includes(data.organizationType as any)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Organization type must be one of: ${ORGANIZATION_TYPES.join(', ')}.`,
          path: ['organizationType'],
        });
      }
      if (!data.applicantPosition || data.applicantPosition.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Applicant's position or role is required.",
          path: ['applicantPosition'],
        });
      }
      if (!data.organizationDescription || data.organizationDescription.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Short organization description is required.',
          path: ['organizationDescription'],
        });
      }
    }
  });

export const switchRoleSchema = z.object({
  switchPassword: z.string().optional(),
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
