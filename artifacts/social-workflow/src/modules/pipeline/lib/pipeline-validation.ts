import { z } from 'zod';

export const PlatformVariantSchema = z.object({
  platform: z.enum(['instagram', 'linkedin', 'tiktok', 'twitter', 'youtube_shorts']),
  caption: z.string(),
  hook: z.string(),
  hashtags: z.array(z.string()),
});

export const ContentStatusSchema = z.enum(['draft', 'internal_review', 'client_review', 'approved', 'scheduled', 'published', 'rejected']);

export const DesignStatusSchema = z.enum(['not_started', 'in_progress', 'ready']);

export const ContentIntentSchema = z.object({
  goal: z.string().default(''),
  intent: z.string().default(''),
  expectedOutcome: z.string().default(''),
}).nullable().default(null);

export const ContentDraftSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  strategyId: z.string().min(1),
  briefId: z.string().nullable().default(null),
  approvalFlowId: z.string().nullable().default(null),
  title: z.string().default(''),
  sourceIdea: z.string(),
  source: z.enum(['ai', 'manual']).default('ai'),
  status: ContentStatusSchema.default('draft'),
  platformVariants: z.array(PlatformVariantSchema).default([]),
  mediaUrl: z.string().nullable().default(null),
  mediaType: z.enum(['image', 'video', 'link']).nullable().default(null),
  referenceLinks: z.array(z.string()).default([]),
  referenceNotes: z.string().default(''),
  scheduledDate: z.string().nullable().default(null),
  deadline: z.string().nullable().default(null),
  designStatus: DesignStatusSchema.default('not_started'),
  designNotes: z.string().default(''),
  performanceRating: z.enum(['high', 'low']).nullable().default(null),
  revisionCount: z.number().default(0),
  contentIntent: ContentIntentSchema,
  lastReminderSentAt: z.string().nullable().default(null),
  createdBy: z.string().default(''),
  internalNotes: z.string().default(''),
  sourceType: z.enum(['ai', 'manual']).default('ai'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const ContentDraftArraySchema = z.array(ContentDraftSchema);

export function validateDraft(data: unknown): z.infer<typeof ContentDraftSchema> {
  return ContentDraftSchema.parse(data);
}

export function validateDrafts(data: unknown): z.infer<typeof ContentDraftArraySchema> {
  return ContentDraftArraySchema.parse(data);
}
