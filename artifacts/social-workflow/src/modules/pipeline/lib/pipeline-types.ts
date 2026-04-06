import { generateId } from '@/lib/utils';
import { StrategyOutput } from '@/lib/content-generator';

export type ContentStatus = 'draft' | 'internal_review' | 'client_review' | 'approved' | 'scheduled' | 'published' | 'rejected';

export type PlatformType = 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube_shorts';

export interface PlatformVariant {
  platform: PlatformType;
  caption: string;
  hook: string;
  hashtags: string[];
}

export type DesignStatus = 'not_started' | 'in_progress' | 'ready';
export type PerformanceRating = 'high' | 'low' | null;
export type DraftSource = 'ai' | 'manual';

export const MAX_REVISIONS = 3;

export interface ContentIntent {
  goal: string;
  intent: string;
  expectedOutcome: string;
}

export interface ContentDraft {
  id: string;
  clientId: string;
  strategyId: string;
  briefId: string | null;
  approvalFlowId: string | null;
  title: string;
  sourceIdea: string;
  source: DraftSource;
  status: ContentStatus;
  platformVariants: PlatformVariant[];
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'link' | null;
  referenceLinks: string[];
  referenceNotes: string;
  scheduledDate: string | null;
  deadline: string | null;
  designStatus: DesignStatus;
  designNotes: string;
  performanceRating: PerformanceRating;
  revisionCount: number;
  contentIntent: ContentIntent | null;
  lastReminderSentAt: string | null;
  createdBy: string;
  internalNotes: string;
  sourceType: DraftSource;
  createdAt: string;
  updatedAt: string;
}

export const PIPELINE_STATUSES: ContentStatus[] = ['draft', 'internal_review', 'client_review', 'approved', 'scheduled', 'published', 'rejected'];

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  internal_review: 'Internal Review',
  client_review: 'Client Review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  rejected: 'Rejected',
};

export const DESIGN_LABELS: Record<DesignStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  ready: 'Ready',
};

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  twitter: 'Twitter/X',
  youtube_shorts: 'YouTube Shorts',
};

interface ApprovedDraftSeed {
  readonly text: string;
  readonly section: 'ideas' | 'hooks' | 'captions' | 'reels';
}

interface ApprovedDraftContext {
  readonly sourceIdea: string;
  readonly hook: string;
  readonly caption: string;
  readonly hashtags: string[];
}

// Maps raw platform names from strategy input to our supported PlatformType
function normalizePlatform(raw: string): PlatformType {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('instagram')) return 'instagram';
  if (lower.includes('linkedin')) return 'linkedin';
  if (lower.includes('tiktok')) return 'tiktok';
  if (lower.includes('twitter') || lower === 'x') return 'twitter';
  if (lower.includes('youtube')) return 'youtube_shorts';
  // Unknown platform → default to instagram (visual-first)
  return 'instagram';
}

// Gets the display label for any raw platform string
export function getPlatformLabel(raw: string): string {
  return PLATFORM_LABELS[normalizePlatform(raw)];
}

// Default hashtags per niche
const NICHE_HASHTAGS: Record<string, string[]> = {
  Fitness: ['#FitnessMotivation', '#GymLife', '#HealthyLiving'],
  Tech: ['#TechTrends', '#DevLife', '#Productivity'],
  default: ['#ContentStrategy', '#Growth', '#Marketing'],
};

function getHashtagsForNiche(niche: string): string[] {
  const key = Object.keys(NICHE_HASHTAGS).find(k =>
    niche.toLowerCase().includes(k.toLowerCase())
  );
  return key ? NICHE_HASHTAGS[key] : NICHE_HASHTAGS.default;
}

function normalizeHashtag(value: string): string {
  return value.startsWith('#') ? value : `#${value}`;
}

function getStrategyHashtags(strategy: StrategyOutput): string[] {
  const tags = Object.values(strategy.hashtags || {})
    .flat()
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(normalizeHashtag);

  return Array.from(new Set(tags)).slice(0, 8);
}

// Adapts a caption for a specific platform
function adaptCaptionForPlatform(caption: string, platform: PlatformType): string {
  switch (platform) {
    case 'linkedin':
      return caption.replace(/👇/g, '').replace(/💛/g, '').trim();
    case 'twitter':
      // Twitter: truncate to ~280 chars, keep first paragraph
      const firstPara = caption.split('\n\n')[0];
      return firstPara.length > 250 ? firstPara.slice(0, 247) + '...' : firstPara;
    case 'tiktok':
    case 'youtube_shorts':
    case 'instagram':
    default:
      return caption;
  }
}

// Adapts a hook for a specific platform
function adaptHookForPlatform(hook: string, platform: PlatformType): string {
  switch (platform) {
    case 'linkedin':
      return hook.replace(/^[^\w\s]+/, '').trim();
    case 'twitter':
      return hook.length > 100 ? hook.slice(0, 97) + '...' : hook;
    case 'tiktok':
    case 'youtube_shorts':
    case 'instagram':
    default:
      return hook;
  }
}

export function getApprovedDraftSeeds(strategy: StrategyOutput): readonly ApprovedDraftSeed[] {
  const pool = strategy.approvedPool;
  if (!pool) {
    return [];
  }

  const seeds: ApprovedDraftSeed[] = [
    ...pool.ideas.map((text) => ({ text, section: 'ideas' as const })),
    ...pool.reels.map((text) => ({ text, section: 'reels' as const })),
    ...pool.hooks.map((text) => ({ text, section: 'hooks' as const })),
    ...pool.captions.map((text) => ({ text, section: 'captions' as const })),
  ];
  const seen = new Set<string>();

  return seeds.filter((seed) => {
    const normalized = seed.text.trim().toLowerCase();
    const key = `${seed.section}:${normalized}`;
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getApprovedDraftCount(strategy: StrategyOutput): number {
  return getApprovedDraftSeeds(strategy).length;
}

function findStrategyIndex(strategy: StrategyOutput, seed: ApprovedDraftSeed): number {
  const findIndex = (items: readonly string[]): number => items.findIndex(item => item.trim() === seed.text.trim());

  switch (seed.section) {
    case 'ideas':
      return findIndex(strategy.ideas);
    case 'hooks': {
      const brandAwareIndex = findIndex(strategy.brandAwareHooks);
      return brandAwareIndex >= 0 ? brandAwareIndex : findIndex(strategy.hooks);
    }
    case 'captions': {
      const brandAwareIndex = findIndex(strategy.brandAwareCaptions);
      return brandAwareIndex >= 0 ? brandAwareIndex : findIndex(strategy.captions);
    }
    case 'reels':
      return findIndex(strategy.reels);
  }
}

function buildApprovedDraftContext(strategy: StrategyOutput, seed: ApprovedDraftSeed): ApprovedDraftContext {
  const index = findStrategyIndex(strategy, seed);
  const strategyHashtags = getStrategyHashtags(strategy);
  const fallbackHashtags = strategyHashtags.length > 0 ? strategyHashtags : getHashtagsForNiche(strategy.settings.niche);
  const sourceIdea = index >= 0
    ? strategy.ideas[index] || strategy.reels[index] || seed.text
    : seed.text;
  const hook = seed.section === 'hooks'
    ? seed.text
    : index >= 0
      ? strategy.brandAwareHooks[index] || strategy.hooks[index] || ''
      : seed.section === 'reels'
        ? seed.text
        : '';
  const caption = seed.section === 'captions'
    ? seed.text
    : index >= 0
      ? strategy.brandAwareCaptions[index] || strategy.captions[index] || ''
      : '';

  return {
    sourceIdea,
    hook,
    caption,
    hashtags: fallbackHashtags,
  };
}

/**
 * Core function: converts a StrategyOutput into ContentDraft objects.
 * Each idea from the strategy becomes a draft with platform variants.
 * All selected platforms are supported — no silent drops.
 */
export function createDraftsFromStrategy(
  strategy: StrategyOutput,
  clientId: string,
  briefIds?: string[]
): ContentDraft[] {
  const now = new Date().toISOString();
  const selectedPlatforms = strategy.settings.platforms;

  // Normalize ALL selected platforms — no silent drops
  const normalizedPlatforms: PlatformType[] = selectedPlatforms.map(normalizePlatform);

  // Deduplicate (e.g., if user selected Instagram twice via different naming)
  const uniquePlatforms = Array.from(new Set(normalizedPlatforms));

  // Fallback: if somehow empty, use both instagram + linkedin
  const platforms = uniquePlatforms.length > 0 ? uniquePlatforms : ['instagram', 'linkedin'] as PlatformType[];

  const drafts: ContentDraft[] = [];
  const approvedSeeds = getApprovedDraftSeeds(strategy);

  for (let i = 0; i < approvedSeeds.length; i++) {
    const seed = approvedSeeds[i];
    const context = buildApprovedDraftContext(strategy, seed);

    const platformVariants: PlatformVariant[] = platforms.map(platform => {
      return {
        platform,
        caption: adaptCaptionForPlatform(context.caption, platform),
        hook: adaptHookForPlatform(context.hook, platform),
        hashtags: [...context.hashtags],
      };
    });

    const titlePrefix = seed.section === 'reels'
      ? 'Reel'
      : seed.section === 'hooks'
        ? 'Hook'
        : seed.section === 'captions'
          ? 'Caption'
          : 'Idea';
    const titleBase = context.sourceIdea || seed.text;
    const titleText = titleBase.length > 40 ? `${titleBase.slice(0, 40)}...` : titleBase;

    drafts.push({
      id: generateId(),
      clientId,
      strategyId: strategy.id,
      briefId: briefIds?.[i] ?? null,
      approvalFlowId: null,
      title: `${titlePrefix} ${i + 1}: ${titleText}`,
      sourceIdea: context.sourceIdea,
      source: 'ai',
      status: 'draft',
      platformVariants,
      mediaUrl: null,
      mediaType: null,
      referenceLinks: [],
      referenceNotes: '',
      scheduledDate: null,
      deadline: null,
      designStatus: 'not_started',
      designNotes: '',
      performanceRating: null,
      revisionCount: 0,
      contentIntent: null,
      lastReminderSentAt: null,
      createdBy: 'AI System',
      internalNotes: '',
      sourceType: 'ai',
      createdAt: now,
      updatedAt: now,
    });
  }

  return drafts;
}

// --- Content Quality Scoring ---

const CTA_PHRASES = [
  'save this', 'share this', 'tag', 'comment', 'follow', 'click', 'link in bio',
  'swipe', 'drop', 'tell me', 'let me know', 'what do you think', 'double tap',
  'check out', 'subscribe', 'try this', 'dm me', 'shop now', 'get yours',
];

const STRONG_HOOK_OPENERS = [
  /\bstop\b/i, /\bwhy\b/i, /\bhow\b/i, /\bwhat\b/i, /\bhere.s why\b/i,
  /\bthe (one|real|best|worst|secret)\b/i, /\byou.re (probably|likely)\b/i,
  /\bno one\b/i, /\beveryone\b/i, /\bi tried\b/i, /\bthis is\b/i,
  /\b3\b/, /\b5\b/, /\b7\b/, /\b10\b/,
];

export interface QualityBreakdown {
  hookStrength: number;   // 0-30
  captionClarity: number; // 0-30
  ctaPresence: number;    // 0-20
  hashtagRelevance: number; // 0-20
  total: number;          // 0-100
  warnings: string[];
}

export function calculateQualityScore(variant: PlatformVariant): QualityBreakdown {
  const warnings: string[] = [];
  let hookStrength = 15;
  let captionClarity = 15;
  let ctaPresence = 0;
  let hashtagRelevance = 0;

  // Hook strength (0-30)
  if (!variant.hook || variant.hook.length < 5) {
    hookStrength = 0;
    warnings.push('Hook is missing or too short');
  } else {
    if (variant.hook.length >= 20 && variant.hook.length <= 150) hookStrength += 5;
    if (STRONG_HOOK_OPENERS.some(r => r.test(variant.hook))) hookStrength += 5;
    if (variant.hook.includes('?')) hookStrength += 3;
    if (variant.hook.length > 200) {
      hookStrength -= 5;
      warnings.push('Hook is very long — consider shortening');
    }
  }

  // Caption clarity (0-30)
  if (!variant.caption || variant.caption.length < 10) {
    captionClarity = 0;
    warnings.push('Caption is missing or too short');
  } else {
    const wordCount = variant.caption.split(/\s+/).length;
    if (wordCount >= 20 && wordCount <= 150) captionClarity += 8;
    else if (wordCount < 20) {
      captionClarity -= 5;
      warnings.push('Caption is too short — add more detail');
    }
    if (variant.caption.includes('\n')) captionClarity += 3;
    if (variant.caption.length <= 2200) captionClarity += 4;
  }

  // CTA presence (0-20)
  const captionLower = variant.caption.toLowerCase();
  const hasCTA = CTA_PHRASES.some(phrase => captionLower.includes(phrase));
  if (hasCTA) {
    ctaPresence = 20;
  } else {
    ctaPresence = 5;
    warnings.push('No clear call-to-action found');
  }

  // Hashtag relevance (0-20)
  if (variant.hashtags.length === 0) {
    hashtagRelevance = 0;
    warnings.push('No hashtags added');
  } else if (variant.hashtags.length >= 3 && variant.hashtags.length <= 15) {
    hashtagRelevance = 20;
  } else if (variant.hashtags.length > 15) {
    hashtagRelevance = 12;
    warnings.push('Too many hashtags — 5-10 is optimal');
  } else {
    hashtagRelevance = 10;
  }

  const total = Math.min(100, Math.max(0, hookStrength + captionClarity + ctaPresence + hashtagRelevance));

  return { hookStrength, captionClarity, ctaPresence, hashtagRelevance, total, warnings };
}

export function getQualityColor(score: number): string {
  if (score >= 75) return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20';
}

export function getBestVariantScore(draft: ContentDraft): number {
  if (draft.platformVariants.length === 0) return 0;
  return Math.max(...draft.platformVariants.map(v => calculateQualityScore(v).total));
}

export type NextAction = 'review' | 'waiting_client' | 'ready_schedule' | 'done';

export interface DraftNextAction {
  label: string;
  action: NextAction;
  color: string;
  icon: 'review' | 'clock' | 'calendar' | 'check';
}

export function getDraftNextAction(draft: ContentDraft, hasApprovalFlow: boolean, approvalStatus?: string): DraftNextAction {
  if (draft.status === 'published') {
    return { label: 'Published ✓', action: 'done', color: 'text-green-600 bg-green-500/10 border-green-500/20', icon: 'check' };
  }
  if (draft.status === 'scheduled') {
    return { label: 'Ready to Publish', action: 'done', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', icon: 'clock' };
  }
  if (draft.status === 'approved') {
    return { label: 'Ready to schedule', action: 'ready_schedule', color: 'text-green-600 bg-green-500/10 border-green-500/20', icon: 'calendar' };
  }
  if (draft.status === 'client_review') {
    return { label: 'Awaiting client', action: 'waiting_client', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', icon: 'clock' };
  }
  if (draft.status === 'internal_review') {
    return { label: 'Needs internal review', action: 'review', color: 'text-primary bg-primary/10 border-primary/20', icon: 'review' };
  }
  if (draft.status === 'rejected') {
    return { label: 'Revision needed', action: 'review', color: 'text-red-600 bg-red-500/10 border-red-500/20', icon: 'review' };
  }
  return { label: 'Submit for review', action: 'review', color: 'text-slate-600 bg-slate-500/10 border-slate-500/20', icon: 'review' };
}

export const STATUS_BORDER_COLORS: Record<ContentStatus, string> = {
  draft: 'border-l-slate-400',
  internal_review: 'border-l-primary',
  client_review: 'border-l-amber-400',
  approved: 'border-l-green-400',
  scheduled: 'border-l-blue-400',
  published: 'border-l-green-600',
  rejected: 'border-l-red-500',
};
