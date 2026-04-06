import { z } from 'zod';

export const ClientContactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['approver', 'viewer', 'editor']),
});

export const ClientMetadataSchema = z.object({
  platforms: z.array(z.string()),
  postingFrequency: z.string(),
  contentPillars: z.array(z.string()),
});

export const ClientStrategySchema = z.object({
  contentPillars: z.array(z.string()),
  contentIdeas: z.array(z.string()),
  hooks: z.array(z.string()),
  postingPlan: z.array(z.object({ day: z.string(), type: z.string(), topic: z.string() })),
  brandAngle: z.string(),
  generatedAt: z.string(),
});

const HasInHouseTeamSchema = z.union([z.boolean(), z.literal('unknown')]);

const ClientProfileSchema = z.object({
  name: z.string().default(''),
  contactNumber: z.string().default(''),
  email: z.string().default(''),
  brandName: z.string().default(''),
  goals: z.array(z.string()).default([]),
  industry: z.string().default(''),
  targetAudience: z.string().default(''),
  geography: z.string().default(''),
  brandGuidelines: z.string().default(''),
  brandVoice: z.string().default(''),
  brandAssets: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
  contentPreferences: z.array(z.string()).default([]),
  startDate: z.string().default(''),
  deadlines: z.string().default(''),
  hasInHouseTeam: HasInHouseTeamSchema.default('unknown'),
  communicationMethod: z.string().default(''),
  usp: z.string().default(''),
  messaging: z.string().default(''),
  challenges: z.array(z.string()).default([]),
  complianceNotes: z.string().default(''),
  additionalNotes: z.string().default(''),
});

export const OnboardingChecklistSchema = z.object({
  brandName: z.boolean().default(false),
  usp: z.boolean().default(false),
  platforms: z.boolean().default(false),
  contentPreferences: z.boolean().default(false),
  goals: z.boolean().default(false),
  messaging: z.boolean().default(false),
  targetAudience: z.boolean().default(false),
  challenges: z.boolean().default(false),
  geography: z.boolean().default(false),
  brandVoice: z.boolean().default(false),
}).default({});

export const ClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Client name is required'),
  businessName: z.string().default(''),
  niche: z.string(),
  status: z.enum(['lead', 'onboarding', 'active', 'paused', 'completed']).default('lead'),
  strategyStatus: z.enum(['draft', 'approved', 'rejected']).default('draft'),
  brandProfile: z.object({
    id: z.string(),
    brandName: z.string(),
    niche: z.string(),
    targetAudience: z.string(),
    tone: z.string(),
    customTone: z.string().optional(),
    writingStyle: z.enum(['short', 'storytelling', 'punchy', 'educational']),
    dos: z.array(z.string()),
    donts: z.array(z.string()),
    pastContent: z.string(),
    keywords: z.array(z.string()),
    themes: z.array(z.string()),
    createdAt: z.string(),
  }),
  contacts: z.array(ClientContactSchema),
  metadata: ClientMetadataSchema,
  brandIntelligence: z.object({
    preferredHookStyle: z.enum(['short', 'long', 'curiosity', 'storytelling', 'mixed']).default('mixed'),
    preferredTonePatterns: z.array(z.string()).default([]),
    avoidedWords: z.array(z.string()).default([]),
    highPerformingThemes: z.array(z.string()).default([]),
    contentStyleNotes: z.string().default(''),
    ctaPatterns: z.array(z.string()).default([]),
    commonWords: z.array(z.string()).default([]),
    lastAnalyzed: z.string().nullable().default(null),
    patternScores: z.object({
      themes: z.record(z.number()).default({}),
      hookTypes: z.record(z.number()).default({}),
      tonePatterns: z.record(z.number()).default({}),
    }).default({ themes: {}, hookTypes: {}, tonePatterns: {} }),
    refinementCount: z.number().default(0),
    approvalCount: z.number().default(0),
    rejectionCount: z.number().default(0),
    editCount: z.number().default(0),
  }).default({}),
  rawFormData: z.record(z.string()).nullable().default(null),
  strategy: ClientStrategySchema.nullable().default(null),
  strategies: z.array(z.any()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  onboardingStatus: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
  onboardingChecklist: OnboardingChecklistSchema,
  onboardingNotes: z.string().default(''),
  onboardingCompletedAt: z.string().nullable().default(null),
  clientProfile: ClientProfileSchema.optional().default({}),
  selectedPlan: z.string().default(''),
  monthlyPrice: z.number().default(0),
  servicesIncluded: z.array(z.string()).default([]),
  internalNotes: z.string().default(''),
});

export const ClientArraySchema = z.array(ClientSchema);

export function validateClient(data: unknown): z.infer<typeof ClientSchema> {
  return ClientSchema.parse(data);
}

export function validateClients(data: unknown): z.infer<typeof ClientArraySchema> {
  return ClientArraySchema.parse(data);
}
