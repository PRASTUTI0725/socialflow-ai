import { ContentDraft } from '../modules/pipeline/lib/pipeline-types';
import { ApprovalFlow } from './approval-workflow';
import { PerformanceData, PerformanceMetric, ContentPreferences } from './client-memory';

export interface ClientReport {
  clientId: string;
  period: string;
  totalDrafts: number;
  approvedDrafts: number;
  scheduledDrafts: number;
  highPerforming: number;
  lowPerforming: number;
  approvalRate: number;
  contentVelocity: number;
  topThemes: ThemeStat[];
  topHookTypes: HookStat[];
  platformBreakdown: PlatformStat[];
  weeklyTrend: WeeklyTrend[];
}

export interface ThemeStat {
  theme: string;
  count: number;
  highPerformRate: number;
}

export interface HookStat {
  hookType: string;
  count: number;
  approvalRate: number;
}

export interface PlatformStat {
  platform: string;
  drafts: number;
  approved: number;
  scheduled: number;
}

export interface WeeklyTrend {
  week: string;
  draftsCreated: number;
  draftsApproved: number;
}

function extractTheme(idea: string): string {
  const lower = idea.toLowerCase();
  if (lower.includes('how to') || lower.includes('tips') || lower.includes('guide')) return 'Educational';
  if (lower.includes('story') || lower.includes('journey') || lower.includes('behind')) return 'Storytelling';
  if (lower.includes('review') || lower.includes('comparison')) return 'Reviews';
  if (lower.includes('myth') || lower.includes('mistake') || lower.includes('wrong')) return 'Myth-Busting';
  if (lower.includes('list') || /\d+/.test(lower.slice(0, 20))) return 'Listicle';
  if (lower.includes('question') || lower.includes('what do you think')) return 'Engagement';
  return 'General';
}

function classifyHookType(hook: string): string {
  const lower = hook.toLowerCase();
  if (/\d+%|\d+ out of|\d+x/.test(lower)) return 'Data-Driven';
  if (/^\b(why|how|what|when|who)\b/.test(lower) || /\?/.test(hook)) return 'Question';
  if (/\b(story|journey|started|began|once|remember)\b/.test(lower)) return 'Storytelling';
  if (/\b(stop|never|always|must|unpopular)\b/.test(lower)) return 'Bold Statement';
  if (/\b(secret|hack|trick|tip|one thing)\b/.test(lower)) return 'Curiosity';
  return 'Statement';
}

export function calculateClientReport(
  clientId: string,
  drafts: ContentDraft[],
  flows: ApprovalFlow[]
): ClientReport {
  const now = new Date();
  const period = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const totalDrafts = drafts.length;
  const approvedDrafts = drafts.filter(d => d.status === 'approved' || d.status === 'scheduled').length;
  const scheduledDrafts = drafts.filter(d => d.status === 'scheduled').length;
  const highPerforming = drafts.filter(d => d.performanceRating === 'high').length;
  const lowPerforming = drafts.filter(d => d.performanceRating === 'low').length;
  const approvalRate = totalDrafts > 0 ? Math.round((approvedDrafts / totalDrafts) * 100) : 0;

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentDrafts = drafts.filter(d => new Date(d.createdAt) >= oneWeekAgo);
  const contentVelocity = recentDrafts.length;

  // Theme analysis
  const themeCounts: Record<string, { total: number; high: number }> = {};
  for (const draft of drafts) {
    const theme = extractTheme(draft.sourceIdea);
    if (!themeCounts[theme]) themeCounts[theme] = { total: 0, high: 0 };
    themeCounts[theme].total += 1;
    if (draft.performanceRating === 'high') themeCounts[theme].high += 1;
  }
  const topThemes: ThemeStat[] = Object.entries(themeCounts)
    .map(([theme, data]) => ({
      theme,
      count: data.total,
      highPerformRate: data.total > 0 ? Math.round((data.high / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Hook type analysis
  const hookCounts: Record<string, { total: number; approved: number }> = {};
  for (const draft of drafts) {
    for (const variant of draft.platformVariants) {
      const hookType = classifyHookType(variant.hook);
      if (!hookCounts[hookType]) hookCounts[hookType] = { total: 0, approved: 0 };
      hookCounts[hookType].total += 1;
      if (draft.status === 'approved' || draft.status === 'scheduled') {
        hookCounts[hookType].approved += 1;
      }
    }
  }
  const topHookTypes: HookStat[] = Object.entries(hookCounts)
    .map(([hookType, data]) => ({
      hookType,
      count: data.total,
      approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.approvalRate - a.approvalRate)
    .slice(0, 5);

  // Platform breakdown
  const platformCounts: Record<string, { drafts: number; approved: number; scheduled: number }> = {};
  for (const draft of drafts) {
    for (const variant of draft.platformVariants) {
      if (!platformCounts[variant.platform]) {
        platformCounts[variant.platform] = { drafts: 0, approved: 0, scheduled: 0 };
      }
      platformCounts[variant.platform].drafts += 1;
      if (draft.status === 'approved') platformCounts[variant.platform].approved += 1;
      if (draft.status === 'scheduled') platformCounts[variant.platform].scheduled += 1;
    }
  }
  const platformBreakdown: PlatformStat[] = Object.entries(platformCounts)
    .map(([platform, data]) => ({ platform, ...data }))
    .sort((a, b) => b.drafts - a.drafts);

  // Weekly trend (last 4 weeks)
  const weeklyTrend: WeeklyTrend[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    const weekDrafts = drafts.filter(d => {
      const created = new Date(d.createdAt);
      return created >= weekStart && created < weekEnd;
    });
    weeklyTrend.push({
      week: weekLabel,
      draftsCreated: weekDrafts.length,
      draftsApproved: weekDrafts.filter(d => d.status === 'approved' || d.status === 'scheduled').length,
    });
  }

  return {
    clientId,
    period,
    totalDrafts,
    approvedDrafts,
    scheduledDrafts,
    highPerforming,
    lowPerforming,
    approvalRate,
    contentVelocity,
    topThemes,
    topHookTypes,
    platformBreakdown,
    weeklyTrend,
  };
}

export function derivePerformanceData(
  drafts: ContentDraft[],
  report: ClientReport
): PerformanceData {
  const metrics: PerformanceMetric[] = drafts
    .filter(d => d.performanceRating)
    .map(d => ({
      draftId: d.id,
      platform: d.platformVariants[0]?.platform || 'unknown',
      theme: extractTheme(d.sourceIdea),
      hookType: d.platformVariants[0] ? classifyHookType(d.platformVariants[0].hook) : 'unknown',
      rating: d.performanceRating as 'high' | 'low',
      postedAt: d.scheduledDate || d.createdAt,
    }));

  const bestPlatform = report.platformBreakdown.length > 0
    ? report.platformBreakdown[0].platform
    : '';

  return {
    metrics,
    topThemes: report.topThemes.map(t => t.theme),
    topHookTypes: report.topHookTypes.map(h => h.hookType),
    bestPlatform,
    approvalRate: report.approvalRate,
    contentVelocity: report.contentVelocity,
    lastCalculated: new Date().toISOString(),
  };
}

export function deriveContentPreferences(
  report: ClientReport,
  existing: ContentPreferences
): ContentPreferences {
  return {
    preferredHookStyles: [
      ...new Set([
        ...existing.preferredHookStyles,
        ...report.topHookTypes.filter(h => h.approvalRate >= 60).map(h => h.hookType),
      ]),
    ].slice(0, 5),
    avoidedWords: existing.avoidedWords,
    preferredTones: existing.preferredTones,
    highPerformingThemes: [
      ...new Set([
        ...existing.highPerformingThemes,
        ...report.topThemes.filter(t => t.highPerformRate >= 50).map(t => t.theme),
      ]),
    ].slice(0, 8),
    ctaPatterns: existing.ctaPatterns,
    bestPlatforms: [
      ...new Set([
        ...existing.bestPlatforms,
        ...report.platformBreakdown.slice(0, 3).map(p => p.platform),
      ]),
    ].slice(0, 5),
    bestPostingTimes: existing.bestPostingTimes,
  };
}

export interface EngagementMetrics {
  estimatedEngagementScore: number;
  contentConsistencyScore: number;
  avgApprovalDelayHours: number;
  trend: 'improving' | 'stable' | 'declining';
  trendLabel: string;
}

export function calculateEngagementMetrics(
  drafts: ContentDraft[],
  flows: ApprovalFlow[]
): EngagementMetrics {
  if (drafts.length === 0) {
    return {
      estimatedEngagementScore: 0,
      contentConsistencyScore: 0,
      avgApprovalDelayHours: 0,
      trend: 'stable',
      trendLabel: 'No data yet',
    };
  }

  // Estimated engagement score based on quality scores and performance ratings
  const qualityScores = drafts.flatMap(d => d.platformVariants.map(v => {
    const hook = v.hook || '';
    const caption = v.caption || '';
    let score = 50;
    if (hook.length >= 20 && hook.length <= 150) score += 10;
    if (hook.includes('?')) score += 5;
    if (caption.length >= 50) score += 10;
    if (caption.includes('\n')) score += 5;
    if (v.hashtags.length >= 3) score += 10;
    if (drafts.some(d2 => d2.performanceRating === 'high' && d2.id === d.id)) score += 15;
    return Math.min(100, score);
  }));
  const avgQuality = qualityScores.length > 0
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : 0;

  // Content consistency: how regularly content is produced
  const dates = drafts.map(d => new Date(d.createdAt).getTime()).sort();
  if (dates.length < 2) {
    return {
      estimatedEngagementScore: avgQuality,
      contentConsistencyScore: 50,
      avgApprovalDelayHours: 0,
      trend: 'stable',
      trendLabel: 'Need more data',
    };
  }
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const consistencyScore = avgGap <= 1 ? 95 : avgGap <= 2 ? 80 : avgGap <= 4 ? 60 : avgGap <= 7 ? 40 : 20;

  // Average approval delay
  const delays: number[] = [];
  for (const flow of flows) {
    if (flow.steps.length >= 2) {
      const firstStep = flow.steps[0];
      const lastCompleted = flow.steps.filter(s => s.completedAt).pop();
      if (firstStep.completedAt && lastCompleted?.completedAt) {
        const delayMs = new Date(lastCompleted.completedAt).getTime() - new Date(firstStep.completedAt).getTime();
        delays.push(delayMs / (1000 * 60 * 60));
      }
    }
  }
  const avgDelay = delays.length > 0
    ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
    : 0;

  // Trend: compare recent vs older drafts
  const midpoint = Math.floor(dates.length / 2);
  const olderDates = dates.slice(0, midpoint);
  const newerDates = dates.slice(midpoint);
  const olderGaps = olderDates.length > 1 ? (olderDates[olderDates.length - 1] - olderDates[0]) / (1000 * 60 * 60 * 24 * (olderDates.length - 1)) : 7;
  const newerGaps = newerDates.length > 1 ? (newerDates[newerDates.length - 1] - newerDates[0]) / (1000 * 60 * 60 * 24 * (newerDates.length - 1)) : 7;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  let trendLabel = 'Producing content steadily';
  if (newerGaps < olderGaps * 0.8) {
    trend = 'improving';
    trendLabel = 'Content pace is picking up';
  } else if (newerGaps > olderGaps * 1.3) {
    trend = 'declining';
    trendLabel = 'Content pace is slowing down';
  }

  return {
    estimatedEngagementScore: avgQuality,
    contentConsistencyScore: consistencyScore,
    avgApprovalDelayHours: avgDelay,
    trend,
    trendLabel,
  };
}
