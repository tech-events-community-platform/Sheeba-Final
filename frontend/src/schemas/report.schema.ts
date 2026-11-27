import { z } from 'zod';

/**
 * Report narrative update form schema for frontend ReportPage
 * Allows editing executive summary, background, objectives,
 * partner impact, strategic conclusion, and custom notes.
 * All fields are optional and allow empty strings.
 */
export const reportNarrativeUpdateFormSchema = z.object({
  executiveSummary: z.string({ message: 'Executive summary must be a string.' }).optional(),
  eventBackground: z.string({ message: 'Event background must be a string.' }).optional(),
  objectives: z.string({ message: 'Objectives must be a string.' }).optional(),
  deliveryNarrative: z.string({ message: 'Delivery narrative must be a string.' }).optional(),
  audienceOverview: z.string({ message: 'Audience overview must be a string.' }).optional(),
  organizationsNarrative: z.string({ message: 'Organizations narrative must be a string.' }).optional(),
  interestsNarrative: z.string({ message: 'Interests narrative must be a string.' }).optional(),
  motivationNarrative: z.string({ message: 'Motivation narrative must be a string.' }).optional(),
  engagementNarrative: z.string({ message: 'Engagement narrative must be a string.' }).optional(),
  partnerImpactSummary: z.string({ message: 'Partner impact summary must be a string.' }).optional(),
  strategicConclusion: z.string({ message: 'Strategic conclusion must be a string.' }).optional(),
  customNotes: z.string({ message: 'Custom notes must be a string.' }).optional(),
  communityFindings: z.string({ message: 'Community findings must be a string.' }).optional(),
  futureProgramming: z.string({ message: 'Future programming must be a string.' }).optional(),
  mentorship: z.string({ message: 'Mentorship must be a string.' }).optional(),
  communityDevelopment: z.string({ message: 'Community development must be a string.' }).optional(),
});

export type ReportNarrativeUpdateFormData = z.infer<typeof reportNarrativeUpdateFormSchema>;
