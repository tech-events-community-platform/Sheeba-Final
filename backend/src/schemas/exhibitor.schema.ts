import { z } from 'zod';

export const exhibitorCallStatusEnum = z.enum(['draft', 'open', 'closed'], {
  message: "Status must be 'draft', 'open', or 'closed'.",
});

export const upsertExhibitorCallSchema = z.object({
  isEnabled: z.boolean({ message: 'isEnabled must be a boolean.' }),
  status: exhibitorCallStatusEnum.default('draft'),
  description: z.string().optional().nullable(),
  totalSpaceSqm: z.coerce
    .number({ message: 'Total space must be a number.' })
    .min(0, { message: 'Total space cannot be negative.' }),
  pricePerSqm: z.coerce
    .number({ message: 'Price per sqm must be a number.' })
    .min(0, { message: 'Price cannot be negative.' }),
  sheebaCutPercent: z.coerce.number().min(0).max(100).optional().default(30),
  maxExhibitors: z.coerce.number().int().min(1).optional().default(10),
  specifications: z.string().optional().nullable(),
  applicationDeadline: z.string().optional().nullable(),
  hasBoothNumbers: z.boolean().optional().default(false),
  hasVendorCheckin: z.boolean().optional().default(false),
});

export const addManualVendorSchema = z.object({
  businessName: z.string().trim().min(1, { message: 'Business name is required.' }),
  category: z.string().trim().optional().nullable(),
  contactName: z.string().trim().min(1, { message: 'Contact person name is required.' }),
  contactEmail: z.string().trim().email({ message: 'Valid contact email is required.' }),
  contactPhone: z.string().trim().optional().nullable(),
  showcaseDescription: z.string().optional().nullable(),
  spaceSqm: z.coerce.number().min(0.5, { message: 'Space must be at least 0.5 sqm.' }).default(1),
  boothNumber: z.string().trim().optional().nullable(),
  source: z.enum(['manual', 'sponsorship']).default('manual'),
  logoUrl: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
});

export const updateVendorSchema = addManualVendorSchema.partial().extend({
  status: z.enum(['pending', 'accepted_awaiting_payment', 'confirmed', 'rejected', 'cancelled']).optional(),
  rejectionReason: z.string().optional().nullable(),
});

export const vendorQuerySchema = z.object({
  search: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
});

