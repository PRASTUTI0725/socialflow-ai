import { generateId } from '@/lib/utils';
import { StrategyOutput, CalendarDay } from './content-generator';

export type BriefPriority = 'high' | 'medium' | 'low';
export type BriefStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ContentBrief {
  id: string;
  clientId: string;
  strategyId: string;
  pillar: string;
  goal: string;
  hookAngle: string;
  platform: string;
  cta: string;
  contentType: string;
  calendarDay: number | null;
  priority: BriefPriority;
  status: BriefStatus;
  notes: string;
  createdAt: string;
}

export interface CampaignBrief {
  id: string;
  clientId: string;
  strategyId: string;
  name: string;
  pillar: string;
  briefs: ContentBrief[];
  startDate: string;
  endDate: string;
  status: BriefStatus;
}

const CONTENT_PILLARS: Record<string, string[]> = {
  Fitness: ['Workout Tips', 'Nutrition', 'Motivation', 'Transformation Stories', 'Product Reviews'],
  Tech: ['Tutorials', 'Tool Reviews', 'Industry News', 'Career Advice', 'Behind the Scenes'],
  default: ['Educational', 'Inspirational', 'Entertaining', 'Promotional', 'Community'],
};

const HOOK_ANGLES = [
  'Problem-Solution',
  'Myth-Busting',
  'Step-by-Step',
  'Personal Story',
  'Data-Driven',
  'Contrarian Take',
  'Quick Tips',
  'Before/After',
];

function detectPillars(niche: string): string[] {
  const key = Object.keys(CONTENT_PILLARS).find(k =>
    niche.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CONTENT_PILLARS[key] : CONTENT_PILLARS.default;
}

function pickHookAngle(index: number): string {
  return HOOK_ANGLES[index % HOOK_ANGLES.length];
}

function deriveGoal(idea: string): string {
  const lower = idea.toLowerCase();
  if (lower.includes('how to') || lower.includes('guide') || lower.includes('tips')) {
    return 'Educate audience and build authority';
  }
  if (lower.includes('story') || lower.includes('journey') || lower.includes('experience')) {
    return 'Build emotional connection and trust';
  }
  if (lower.includes('review') || lower.includes('comparison') || lower.includes('vs')) {
    return 'Drive consideration and decision-making';
  }
  if (lower.includes('myth') || lower.includes('mistake') || lower.includes('wrong')) {
    return 'Challenge assumptions and spark engagement';
  }
  return 'Drive engagement and brand awareness';
}

function deriveCta(platform: string): string {
  switch (platform) {
    case 'instagram':
      return 'Save this post & tag someone who needs it';
    case 'linkedin':
      return 'Share your experience in the comments';
    case 'tiktok':
      return 'Follow for more tips like this';
    case 'twitter':
      return 'Retweet to share with your network';
    default:
      return 'Comment your thoughts below';
  }
}

export function generateBriefsFromStrategy(
  strategy: StrategyOutput,
  clientId: string
): ContentBrief[] {
  const pillars = detectPillars(strategy.settings.niche);
  const platforms = strategy.settings.platforms;
  const briefs: ContentBrief[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < strategy.ideas.length; i++) {
    const idea = strategy.ideas[i];
    const pillar = pillars[i % pillars.length];
    const hookAngle = pickHookAngle(i);
    const goal = deriveGoal(idea);
    const platform = platforms[i % platforms.length] || 'instagram';
    const cta = deriveCta(platform.toLowerCase());
    const calendarDay = strategy.calendar[i] ? strategy.calendar[i].day : null;

    briefs.push({
      id: generateId(),
      clientId,
      strategyId: strategy.id,
      pillar,
      goal,
      hookAngle,
      platform: platform.toLowerCase(),
      cta,
      contentType: calendarDay
        ? (strategy.calendar[i] as CalendarDay).type || 'Post'
        : 'Post',
      calendarDay,
      priority: i < 3 ? 'high' : i < 7 ? 'medium' : 'low',
      status: 'pending',
      notes: '',
      createdAt: now,
    });
  }

  return briefs;
}

export function generateCampaignsFromBriefs(
  briefs: ContentBrief[],
  clientId: string,
  strategyId: string
): CampaignBrief[] {
  const pillarGroups: Record<string, ContentBrief[]> = {};

  for (const brief of briefs) {
    if (!pillarGroups[brief.pillar]) {
      pillarGroups[brief.pillar] = [];
    }
    (pillarGroups[brief.pillar] as ContentBrief[]).push(brief);
  }

  return Object.entries(pillarGroups).map(([pillar, pillarBriefs]) => ({
    id: generateId(),
    clientId,
    strategyId,
    name: `${pillar} Campaign`,
    pillar,
    briefs: pillarBriefs,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending' as BriefStatus,
  }));
}

const BRIEFS_STORAGE_KEY = 'socialidiots_content_briefs';

export function loadAllBriefs(): ContentBrief[] {
  try {
    const raw = localStorage.getItem(BRIEFS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ContentBrief[];
  } catch {
    return [];
  }
}

function saveAllBriefs(briefs: ContentBrief[]): void {
  try {
    localStorage.setItem(BRIEFS_STORAGE_KEY, JSON.stringify(briefs));
  } catch {
    // Storage full — ignore
  }
}

export function getBriefsByClient(clientId: string): ContentBrief[] {
  return loadAllBriefs().filter(b => b.clientId === clientId);
}

export function getBriefsByStrategy(strategyId: string): ContentBrief[] {
  return loadAllBriefs().filter(b => b.strategyId === strategyId);
}

export function getBrief(id: string): ContentBrief | null {
  return loadAllBriefs().find(b => b.id === id) ?? null;
}

export function saveBriefsBatch(briefs: ContentBrief[]): void {
  const existing = loadAllBriefs();
  const existingIds = new Set(existing.map(b => b.id));
  const toAdd = briefs.filter(b => !existingIds.has(b.id));
  saveAllBriefs([...existing, ...toAdd]);
}

export function updateBriefStatus(id: string, status: BriefStatus): void {
  const briefs = loadAllBriefs();
  const brief = briefs.find(b => b.id === id);
  if (brief) {
    brief.status = status;
    saveAllBriefs(briefs);
  }
}

export function deleteBriefsByStrategy(strategyId: string): void {
  saveAllBriefs(loadAllBriefs().filter(b => b.strategyId !== strategyId));
}
