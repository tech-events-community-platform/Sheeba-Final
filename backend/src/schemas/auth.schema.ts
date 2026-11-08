import { z } from 'zod';

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required.').optional(),
    fullName: z.string().trim().min(1, 'Full name is required.').optional(),
    email: z.string().trim().email('Please provide a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters long.'),
    confirm_password: z.string().optional(),
    confirmPassword: z.string().optional(),
    role: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    bio: z.string().trim().optional(),
    // Formalization fields
    applicant_type: z.string().trim().optional(),
    applicantType: z.string().trim().optional(),
    personal_introduction: z.string().trim().optional(),
    personalIntroduction: z.string().trim().optional(),
    organization: z.string().trim().optional(),
    organization_name: z.string().trim().optional(),
    organizationName: z.string().trim().optional(),
    organization_type: z.string().trim().optional(),
    organizationType: z.string().trim().optional(),
    applicant_position: z.string().trim().optional(),
    applicantPosition: z.string().trim().optional(),
    position: z.string().trim().optional(),
    organization_description: z.string().trim().optional(),
    organizationDescription: z.string().trim().optional(),
    organization_website: z.string().trim().optional(),
    organizationWebsite: z.string().trim().optional(),
    website: z.string().trim().optional(),
    organization_logo: z.string().trim().optional(),
    organizationLogo: z.string().trim().optional(),
    socials: z.record(z.string(), z.string()).optional(),
  })
  .transform((data) => {
    let rawType = (data.applicant_type || data.applicantType || '').trim();
    let normType: 'Individual Organizer' | 'Organization / Institution';
    if (rawType.toLowerCase() === 'individual' || rawType.toLowerCase() === 'individual organizer') {
      normType = 'Individual Organizer';
    } else if (
      rawType.toLowerCase() === 'organization' ||
      rawType.toLowerCase() === 'organization / institution' ||
      rawType.toLowerCase() === 'institution'
    ) {
      normType = 'Organization / Institution';
    } else if (!rawType && (data.organization || data.organization_name || data.organizationName)) {
      normType = 'Organization / Institution';
    } else {
      normType = 'Individual Organizer';
    }

    const personalIntro = (data.personal_introduction || data.personalIntroduction || data.bio || '').trim();
    const orgName = (data.organization || data.organization_name || data.organizationName || '').trim();
    const orgType = (data.organization_type || data.organizationType || '').trim();
    const position = (data.applicant_position || data.applicantPosition || data.position || '').trim();
    const orgDesc = (data.organization_description || data.organizationDescription || data.bio || '').trim();
    const orgWebsite = (data.organization_website || data.organizationWebsite || data.website || '').trim();
    const orgLogo = (data.organization_logo || data.organizationLogo || '').trim();

    return {
      full_name: (data.full_name || data.fullName || '').trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      confirm_password: data.confirm_password || data.confirmPassword,
      role: data.role ? data.role.toUpperCase().trim() : 'ATTENDEE',
      phone: data.phone?.trim(),
      bio: normType === 'Individual Organizer' ? personalIntro : (orgDesc || data.bio?.trim()),
      applicant_type: normType,
      applicantType: normType,
      personal_introduction: personalIntro,
      personalIntroduction: personalIntro,
      organization: orgName,
      organizationName: orgName,
      organization_type: orgType,
      organizationType: orgType,
      applicant_position: position,
      applicantPosition: position,
      organization_description: orgDesc,
      organizationDescription: orgDesc,
      organization_website: orgWebsite || undefined,
      organizationWebsite: orgWebsite || undefined,
      organization_logo: orgLogo || undefined,
      organizationLogo: orgLogo || undefined,
      socials: data.socials || (orgWebsite ? { website: orgWebsite } : {}),
    };
  })
  .superRefine((data, ctx) => {
    if (!data.full_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Full name is required.',
        path: ['full_name'],
      });
    }

    if (data.confirm_password && data.confirm_password !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match.',
        path: ['confirm_password'],
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
      } else if (!['attendee', 'organizer', 'sponsor', 'exhibitor'].includes(norm)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Role must be ATTENDEE, ORGANIZER, SPONSOR, or EXHIBITOR.',
          path: ['role'],
        });
      }

      if (norm === 'organizer') {
        if (!data.phone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Phone number is required.',
            path: ['phone'],
          });
        } else if (!/^0\d{9}$/.test(data.phone.replace(/[\s-]/g, ''))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Phone number must be exactly 10 digits starting with 0 (e.g., 0912345678).',
            path: ['phone'],
          });
        }

        if (data.applicant_type === 'Individual Organizer') {
          if (!data.personal_introduction || data.personal_introduction.length < 10) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Personal introduction is required (minimum 10 characters).',
              path: ['personal_introduction'],
            });
          }
        } else {
          // Organization / Institution
          if (!data.organization || data.organization.length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Organization name is required.',
              path: ['organization'],
            });
          }
          if (!data.organization_type) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Organization type is required.',
              path: ['organization_type'],
            });
          } else if (!ORGANIZATION_TYPES.includes(data.organization_type as any)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Organization type must be one of: ${ORGANIZATION_TYPES.join(', ')}.`,
              path: ['organization_type'],
            });
          }
          if (!data.applicant_position || data.applicant_position.length < 2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Applicant's position or role in the organization is required.",
              path: ['applicant_position'],
            });
          }
          if (!data.organization_description || data.organization_description.length < 10) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Organization description is required (minimum 10 characters).',
              path: ['organization_description'],
            });
          }
        }
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.'),
  password: z.string().optional(),
  role: z.enum(['attendee', 'organizer', 'sponsor', 'exhibitor', 'ATTENDEE', 'ORGANIZER', 'SPONSOR', 'EXHIBITOR']).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.'),
});

export const verifyRegistrationOtpSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.'),
  otp: z.string().trim().regex(/^\d{6}$/, 'Please provide a valid 6-digit verification code.'),
});

export const resendRegistrationOtpSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.'),
});

export const verifyForgotPasswordOtpSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address.'),
  otp: z.string().trim().regex(/^\d{6}$/, 'Please provide a valid 6-digit verification code.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().optional(),
    email: z.string().trim().email('Please provide a valid email address.').optional(),
    otp: z.string().trim().regex(/^\d{6}$/, 'Please provide a valid 6-digit verification code.').optional(),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
  })
  .superRefine((data, ctx) => {
    const hasToken = Boolean(data.token && data.token.length > 0);
    const hasOtp = Boolean(data.email && data.otp && data.otp.length > 0);
    if (!hasToken && !hasOtp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either reset token or email with OTP verification code is required.',
        path: ['token'],
      });
    }
  });

export const googleAuthSchema = z.object({
  credential: z.string().trim().min(1, 'Google credential token is required.'),
  role: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['ATTENDEE', 'ORGANIZER']).optional()
  ),
  mode: z.preprocess(
    (val) => (val === 'signup' ? 'register' : val),
    z.enum(['login', 'register']).default('login')
  ),
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
    applicant_type: z.string().trim().optional(),
    applicantType: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    password: z.string().optional(),
    applyPassword: z.string().optional(),
    // Individual fields
    bio: z.string().trim().optional(),
    personal_introduction: z.string().trim().optional(),
    personalIntroduction: z.string().trim().optional(),
    // Organization fields
    organization: z.string().trim().optional(),
    organization_name: z.string().trim().optional(),
    organizationName: z.string().trim().optional(),
    organization_type: z.string().trim().optional(),
    organizationType: z.string().trim().optional(),
    applicant_position: z.string().trim().optional(),
    applicantPosition: z.string().trim().optional(),
    position: z.string().trim().optional(),
    organization_description: z.string().trim().optional(),
    organizationDescription: z.string().trim().optional(),
    organization_website: z.string().trim().optional(),
    organizationWebsite: z.string().trim().optional(),
    website: z.string().trim().optional(),
    organization_logo: z.string().trim().optional(),
    organizationLogo: z.string().trim().optional(),
    socials: z.record(z.string(), z.string()).optional(),
  })
  .transform((data) => {
    let rawType = (data.applicant_type || data.applicantType || '').trim();
    let normType: 'Individual Organizer' | 'Organization / Institution';
    if (rawType.toLowerCase() === 'individual' || rawType.toLowerCase() === 'individual organizer') {
      normType = 'Individual Organizer';
    } else if (
      rawType.toLowerCase() === 'organization' ||
      rawType.toLowerCase() === 'organization / institution' ||
      rawType.toLowerCase() === 'institution'
    ) {
      normType = 'Organization / Institution';
    } else if (!rawType && (data.organization || data.organization_name || data.organizationName)) {
      normType = 'Organization / Institution';
    } else {
      normType = 'Individual Organizer';
    }

    const phone = (data.phone || '').trim();
    const password = data.password || data.applyPassword;
    const personalIntro = (data.personal_introduction || data.personalIntroduction || data.bio || '').trim();
    const orgName = (data.organization || data.organization_name || data.organizationName || '').trim();
    const orgType = (data.organization_type || data.organizationType || '').trim();
    const position = (data.applicant_position || data.applicantPosition || data.position || '').trim();
    const orgDesc = (data.organization_description || data.organizationDescription || data.bio || '').trim();
    const orgWebsite = (data.organization_website || data.organizationWebsite || data.website || '').trim();
    const orgLogo = (data.organization_logo || data.organizationLogo || '').trim();

    return {
      applicant_type: normType,
      applicantType: normType,
      phone,
      password,
      personal_introduction: personalIntro,
      personalIntroduction: personalIntro,
      organization: orgName,
      organizationName: orgName,
      organization_type: orgType,
      organizationType: orgType,
      applicant_position: position,
      applicantPosition: position,
      organization_description: orgDesc,
      organizationDescription: orgDesc,
      organization_website: orgWebsite || undefined,
      organizationWebsite: orgWebsite || undefined,
      organization_logo: orgLogo || undefined,
      organizationLogo: orgLogo || undefined,
      bio: normType === 'Individual Organizer' ? personalIntro : orgDesc,
      socials: data.socials || (orgWebsite ? { website: orgWebsite } : {}),
    };
  })
  .superRefine((data, ctx) => {
    if (!data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone number is required.',
        path: ['phone'],
      });
    } else if (!/^0\d{9}$/.test(data.phone.replace(/[\s-]/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone number must be exactly 10 digits starting with 0 (e.g., 0912345678).',
        path: ['phone'],
      });
    }

    if (data.applicant_type === 'Individual Organizer') {
      if (!data.personal_introduction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Personal introduction is required for individual applicants.',
          path: ['personal_introduction'],
        });
      }
    } else {
      // Organization / Institution
      if (!data.organization) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization name is required.',
          path: ['organization'],
        });
      }
      if (!data.organization_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization type is required.',
          path: ['organization_type'],
        });
      } else if (!ORGANIZATION_TYPES.includes(data.organization_type as any)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Organization type must be one of: ${ORGANIZATION_TYPES.join(', ')}.`,
          path: ['organization_type'],
        });
      }
      if (!data.applicant_position) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Applicant's position or role in the organization is required.",
          path: ['applicant_position'],
        });
      }
      if (!data.organization_description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Organization description is required.',
          path: ['organization_description'],
        });
      }
    }
  });

export const adminRejectOrganizerSchema = z.object({
  reason: z.string().trim().min(1, 'Please provide a reason for rejecting the application.').optional(),
});

export const adminRequestOrganizerInfoSchema = z.object({
  notes: z.string().trim().min(1, 'Please specify the additional information requested from the applicant.'),
});

export const switchRoleSchema = z.object({
  targetRole: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['ATTENDEE', 'ORGANIZER', 'EXHIBITOR'], {
      message: 'Target role must be ATTENDEE, ORGANIZER, or EXHIBITOR.',
    })
  ),
  password: z.string().optional(),
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
    company_description: z.string().trim().min(1, 'Company description is required.').optional(),
    companyDescription: z.string().trim().min(1, 'Company description is required.').optional(),
    company_logo: z.string().trim().url('Please provide a valid company logo URL.').or(z.literal('')).optional(),
    companyLogo: z.string().trim().url('Please provide a valid company logo URL.').or(z.literal('')).optional(),
    sponsorship_objectives: z.array(z.string().trim().min(1)).optional(),
    sponsorshipObjectives: z.array(z.string().trim().min(1)).optional(),
    target_audience: z.array(z.string().trim().min(1)).optional(),
    targetAudience: z.array(z.string().trim().min(1)).optional(),
    preferred_event_categories: z.array(z.string().trim().min(1)).optional(),
    preferredEventCategories: z.array(z.string().trim().min(1)).optional(),
    skills_and_interests: z.array(z.string().trim().min(1).max(50, 'Skill/interest tag cannot exceed 50 characters.')).optional(),
    skillsAndInterests: z.array(z.string().trim().min(1).max(50, 'Skill/interest tag cannot exceed 50 characters.')).optional(),
    preferred_locations: z.array(z.string().trim().min(1).max(100)).optional(),
    preferredLocations: z.array(z.string().trim().min(1).max(100)).optional(),
    budget_range: z.coerce.number().positive('Budget range must be greater than 0.').optional().nullable(),
    budgetRange: z.coerce.number().positive('Budget range must be greater than 0.').optional().nullable(),
    preferred_benefits: z.array(z.string().trim().min(1).max(100)).optional(),
    preferredBenefits: z.array(z.string().trim().min(1).max(100)).optional(),
    additional_preferences: z.record(z.string(), z.any()).optional(),
    additionalPreferences: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => {
    const rawSkills = data.skills_and_interests || data.skillsAndInterests || [];
    const skillsAndInterests = rawSkills.map((s) => s.trim()).filter(Boolean);

    const rawCategories = data.preferred_event_categories || data.preferredEventCategories || [];
    const preferredEventCategories = rawCategories.map((c) => c.trim()).filter(Boolean);

    const rawObjectives = data.sponsorship_objectives || data.sponsorshipObjectives || [];
    const sponsorshipObjectives = rawObjectives.map((o) => o.trim()).filter(Boolean);

    const rawAudience = data.target_audience || data.targetAudience || [];
    const targetAudience = rawAudience.map((a) => a.trim()).filter(Boolean);

    const rawLocations = data.preferred_locations || data.preferredLocations || [];
    const preferredLocations = rawLocations.map((l) => l.trim()).filter(Boolean);

    const rawBenefits = data.preferred_benefits || data.preferredBenefits || [];
    const preferredBenefits = rawBenefits.map((b) => b.trim()).filter(Boolean);

    const budget = data.budget_range !== undefined ? data.budget_range : data.budgetRange;

    return {
      full_name: (data.full_name || data.fullName || '').trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      company_name: (data.company_name || data.companyName || '').trim(),
      industry_category: (data.industry_category || data.industryCategory || '').trim(),
      company_phone: (data.company_phone || data.companyPhone || '').trim(),
      company_website: (data.company_website || data.companyWebsite || '').trim() || undefined,
      company_description: (data.company_description || data.companyDescription || '').trim(),
      company_logo: (data.company_logo || data.companyLogo || '').trim() || undefined,
      sponsorship_objectives: sponsorshipObjectives,
      target_audience: targetAudience,
      preferred_event_categories: preferredEventCategories,
      skills_and_interests: skillsAndInterests,
      preferred_locations: preferredLocations,
      budget_range: budget !== undefined && budget !== null && !isNaN(Number(budget)) ? Number(budget) : undefined,
      preferred_benefits: preferredBenefits,
      additional_preferences: data.additional_preferences || data.additionalPreferences || undefined,
    };
  })
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
    } else if (!/^0\d{9}$/.test(data.company_phone.replace(/[\s-]/g, ''))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company phone must be exactly 10 digits starting with 0 (e.g., 0912345678).',
        path: ['company_phone'],
      });
    }
    if (!data.company_description) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Company description is required.', path: ['company_description'] });
    }
    if (!data.sponsorship_objectives || data.sponsorship_objectives.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select at least one sponsorship objective.', path: ['sponsorship_objectives'] });
    }
    if (!data.target_audience || data.target_audience.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select at least one target audience.', path: ['target_audience'] });
    }
    if (!data.preferred_event_categories || data.preferred_event_categories.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select at least one preferred event category.', path: ['preferred_event_categories'] });
    }
    if (!data.skills_and_interests || data.skills_and_interests.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select or enter at least one skill or interest.', path: ['skills_and_interests'] });
    }
  });

export const sponsorGoogleAuthSchema = z.object({
  credential: z.string().trim().min(1, 'Google credential token is required.'),
  mode: z.preprocess(
    (val) => (val === 'signup' ? 'register' : val),
    z.enum(['login', 'register']).default('login')
  ),
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

export const addExhibitorRoleSchema = z.object({
  companyName: z.string().trim().min(1, 'Company / Organization name is required.'),
  industryCategory: z.string().trim().min(1, 'Industry category is required.'),
  companyPhone: z.string().trim().optional(),
  companyWebsite: z
    .string()
    .trim()
    .url('Please provide a valid company website URL.')
    .or(z.literal(''))
    .optional(),
  exhibitorDescription: z.string().trim().optional(),
  password: z.string().optional(),
});

export type AddExhibitorRoleInput = z.infer<typeof addExhibitorRoleSchema>;
