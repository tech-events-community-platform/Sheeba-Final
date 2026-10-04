import { z } from 'zod';

/**
 * Report query parameters schema for GET /api/reports/events/:id
 * Validates optional `refresh` boolean flag passed as query string or boolean.
 */
export const reportQuerySchema = z.object({
  refresh: z
    .union([z.boolean(), z.enum(['true', 'false'])], {
      message: 'Refresh query parameter must be "true" or "false".',
    })
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return typeof val === 'boolean' ? val : val === 'true';
    }),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;

/**
 * Attendee voice quote item schema
 */
export const attendeeVoiceItemSchema = z.object({
  quote: z.string({ message: 'Attendee quote must be a string.' }),
  theme: z.string({ message: 'Attendee quote theme must be a string.' }),
  explanation: z.string({ message: 'Attendee quote explanation must be a string.' }),
});

/**
 * Key finding evidence item schema
 */
export const keyFindingItemSchema = z.object({
  title: z.string({ message: 'Finding title must be a string.' }),
  evidence: z.string({ message: 'Finding evidence must be a string.' }),
});

/**
 * Audience deep analysis section schema
 */
export const audienceDeepAnalysisSchema = z.object({
  profile: z.string({ message: 'Audience profile must be a string.' }).optional(),
  keyThemes: z.string({ message: 'Audience key themes must be a string.' }).optional(),
  emergingInterests: z.string({ message: 'Audience emerging interests must be a string.' }).optional(),
  communityOpportunities: z.string({ message: 'Audience community opportunities must be a string.' }).optional(),
});

/**
 * Structured recommendations section schema
 */
export const structuredRecommendationsSchema = z.object({
  futureProgramming: z.string({ message: 'Future programming recommendation must be a string.' }).optional(),
  mentorship: z.string({ message: 'Mentorship recommendation must be a string.' }).optional(),
  communityDevelopment: z.string({ message: 'Community development recommendation must be a string.' }).optional(),
});

/**
 * AI Narrative section update schema
 * All sections are optional to support partial updates.
 * Empty strings are allowed to support clearing content.
 */
export const aiNarrativeUpdateSchema = z.object({
  executiveSummary: z.string({ message: 'Executive summary must be a string.' }).optional(),
  eventBackground: z.string({ message: 'Event background must be a string.' }).optional(),
  objectives: z.string({ message: 'Objectives must be a string.' }).optional(),
  deliveryNarrative: z.string({ message: 'Delivery narrative must be a string.' }).optional(),
  audienceOverview: z.string({ message: 'Audience overview must be a string.' }).optional(),
  experienceNarrative: z.string({ message: 'Experience narrative must be a string.' }).optional(),
  organizationsNarrative: z.string({ message: 'Organizations narrative must be a string.' }).optional(),
  interestsNarrative: z.string({ message: 'Interests narrative must be a string.' }).optional(),
  motivationNarrative: z.string({ message: 'Motivation narrative must be a string.' }).optional(),
  engagementNarrative: z.string({ message: 'Engagement narrative must be a string.' }).optional(),
  communityFindings: z.string({ message: 'Community findings must be a string.' }).optional(),
  performanceAnalysis: z.string({ message: 'Performance analysis must be a string.' }).optional(),
  partnerImpactSummary: z.string({ message: 'Partner impact summary must be a string.' }).optional(),
  strategicConclusion: z.string({ message: 'Strategic conclusion must be a string.' }).optional(),
  eventIntroduction: z.string({ message: 'Event introduction must be a string.' }).optional(),
  demographicAnalysis: z.string({ message: 'Demographic analysis must be a string.' }).optional(),
  thematicTakeaways: z.string({ message: 'Thematic takeaways must be a string.' }).optional(),
  impactHighlights: z.array(z.string({ message: 'Impact highlight must be a string.' })).optional(),
  recommendations: z.array(z.string({ message: 'Recommendation must be a string.' })).optional(),
  attendeeVoice: z.array(attendeeVoiceItemSchema).optional(),
  audienceDeepAnalysis: audienceDeepAnalysisSchema.optional(),
  keyFindings: z.array(keyFindingItemSchema).optional(),
  structuredRecommendations: structuredRecommendationsSchema.optional(),
});

export type AiNarrativeUpdateInput = z.infer<typeof aiNarrativeUpdateSchema>;

/**
 * Report update request schema for PUT /api/reports/events/:id
 * Accepts optional `aiNarrative`, optional `customNotes`, and optional direct narrative fields.
 */
export const updateReportSchema = z
  .object({
    aiNarrative: aiNarrativeUpdateSchema.optional(),
    customNotes: z.string({ message: 'Custom notes must be a string.' }).optional(),
    // Direct narrative fields if provided at root level
    executiveSummary: z.string({ message: 'Executive summary must be a string.' }).optional(),
    eventBackground: z.string({ message: 'Event background must be a string.' }).optional(),
    objectives: z.string({ message: 'Objectives must be a string.' }).optional(),
    partnerImpactSummary: z.string({ message: 'Partner impact summary must be a string.' }).optional(),
    strategicConclusion: z.string({ message: 'Strategic conclusion must be a string.' }).optional(),
  })
  .transform((data) => {
    const rootNarrative: Record<string, any> = {};
    if (data.executiveSummary !== undefined) rootNarrative.executiveSummary = data.executiveSummary;
    if (data.eventBackground !== undefined) rootNarrative.eventBackground = data.eventBackground;
    if (data.objectives !== undefined) rootNarrative.objectives = data.objectives;
    if (data.partnerImpactSummary !== undefined) rootNarrative.partnerImpactSummary = data.partnerImpactSummary;
    if (data.strategicConclusion !== undefined) rootNarrative.strategicConclusion = data.strategicConclusion;

    const mergedAiNarrative =
      data.aiNarrative || Object.keys(rootNarrative).length > 0
        ? { ...rootNarrative, ...(data.aiNarrative || {}) }
        : undefined;

    return {
      aiNarrative: mergedAiNarrative,
      customNotes: data.customNotes,
    };
  });

export type UpdateReportInput = z.infer<typeof updateReportSchema>;
