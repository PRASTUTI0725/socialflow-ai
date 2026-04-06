import { generateId } from '@/lib/utils';
import { ContentDraft } from '@/modules/pipeline/lib/pipeline-types';
import { StrategyOutput } from '@/lib/content-generator';
import { Client } from '@/modules/clients/lib/client-types';
import { getGoalBreakdown, getGoalLabel, type BusinessGoal } from './goal-mapping';

export interface ClientReport {
  id: string;
  clientId: string;
  clientName: string;
  period: string;
  generatedAt: string;

  summary: {
    goal: string;
    goalType: BusinessGoal;
    goalLabel: string;
    platforms: string[];
    niche: string;
  };

  workDone: {
    totalDrafts: number;
    published: number;
    scheduled: number;
    inReview: number;
    byPlatform: Record<string, number>;
  };

  performance: {
    highPerforming: Array<{ idea: string; rating: string }>;
    lowPerforming: Array<{ idea: string; rating: string }>;
    topContent: string[];
    approvalRate: number;
    totalApproved: number;
    totalReviewed: number;
  };

  learnings: {
    worked: string[];
    didntWork: string[];
  };

  nextPlan: string[];

  insights: {
    contentVelocity: string;
    goalAlignment: string;
    platformBreakdown: string;
  };
}

const REPORTS_KEY = 'socialidiots_client_reports';

function saveReports(reports: ClientReport[]): void {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch { }
}

export function loadReports(): ClientReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientReport[];
  } catch {
    return [];
  }
}

export function getReportsByClient(clientId: string): ClientReport[] {
  return loadReports().filter(r => r.clientId === clientId);
}

export function getLatestReport(clientId: string): ClientReport | null {
  const reports = getReportsByClient(clientId);
  return reports.length > 0 ? reports[reports.length - 1] : null;
}

function deriveLearnings(drafts: ContentDraft[]): { worked: string[]; didntWork: string[] } {
  const worked: string[] = [];
  const didntWork: string[] = [];

  const highRated = drafts.filter(d => d.performanceRating === 'high');
  const lowRated = drafts.filter(d => d.performanceRating === 'low');

  if (highRated.length > 0) {
    worked.push(`${highRated.length} high-performing content piece${highRated.length > 1 ? 's' : ''} identified`);
    const platforms = new Set(highRated.flatMap(d => d.platformVariants.map(v => v.platform)));
    worked.push(`Strong performance on ${Array.from(platforms).join(', ')}`);
  }

  if (lowRated.length > 0) {
    didntWork.push(`${lowRated.length} piece${lowRated.length > 1 ? 's' : ''} underperformed — content angle needs adjustment`);
  }

  const revisionsNeeded = drafts.filter(d => d.revisionCount > 0);
  if (revisionsNeeded.length > 0) {
    didntWork.push(`${revisionsNeeded.length} revision${revisionsNeeded.length > 1 ? 's' : ''} needed — alignment with brand voice improving`);
  }

  if (worked.length === 0) {
    worked.push('Content pipeline is building — performance data will emerge as content is published');
  }

  return { worked, didntWork };
}

function deriveNextPlan(drafts: ContentDraft[], strategy: StrategyOutput | null): string[] {
  const plan: string[] = [];

  const scheduled = drafts.filter(d => d.status === 'scheduled');
  const inReview = drafts.filter(d => d.status === 'internal_review' || d.status === 'client_review');
  const approved = drafts.filter(d => d.status === 'approved');

  if (scheduled.length > 0) {
    plan.push(`${scheduled.length} content piece${scheduled.length > 1 ? 's' : ''} scheduled for publishing`);
  }

  if (approved.length > 0) {
    plan.push(`${approved.length} approved piece${approved.length > 1 ? 's' : ''} ready for scheduling`);
  }

  if (inReview.length > 0) {
    plan.push(`${inReview.length} piece${inReview.length > 1 ? 's' : ''} awaiting review and approval`);
  }

  if (strategy) {
    plan.push(`Continue executing ${strategy.settings.niche} strategy across ${strategy.settings.platforms.join(', ')}`);
  }

  if (plan.length === 0) {
    plan.push('Begin content production cycle');
    plan.push('Establish consistent posting schedule');
  }

  return plan;
}

export function generateReport(
  client: Client,
  drafts: ContentDraft[],
  strategies: StrategyOutput[]
): ClientReport {
  const clientDrafts = drafts.filter(d => d.clientId === client.id);
  // CRITICAL: Use strategy.clientId directly - NO inference from brandProfileUsed
  const clientStrategies = strategies.filter(s => s.clientId === client.id);
  const latestStrategy = clientStrategies[0] || null;

  const period = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const byPlatform: Record<string, number> = {};
  clientDrafts.forEach(d => d.platformVariants.forEach(v => {
    const label = v.platform.charAt(0).toUpperCase() + v.platform.slice(1).replace('_', ' ');
    byPlatform[label] = (byPlatform[label] || 0) + 1;
  }));

  const highRated = clientDrafts.filter(d => d.performanceRating === 'high');
  const lowRated = clientDrafts.filter(d => d.performanceRating === 'low');
  const approvedCount = clientDrafts.filter(d => d.status === 'approved' || d.status === 'scheduled').length;

  const goalStr = latestStrategy?.settings.goal || 'Grow brand presence';
  const breakdown = getGoalBreakdown(goalStr);

  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.businessName || client.name,
    period,
    generatedAt: new Date().toISOString(),

    summary: {
      goal: goalStr,
      goalType: breakdown.primary,
      goalLabel: breakdown.label,
      platforms: latestStrategy?.settings.platforms || client.metadata.platforms,
      niche: latestStrategy?.settings.niche || client.niche,
    },

    workDone: {
      totalDrafts: clientDrafts.length,
      published: clientDrafts.filter(d => d.status === 'scheduled').length,
      scheduled: clientDrafts.filter(d => d.status === 'approved').length,
      inReview: clientDrafts.filter(d => d.status === 'internal_review' || d.status === 'client_review').length,
      byPlatform,
    },

    performance: {
      highPerforming: highRated.map(d => ({ idea: d.sourceIdea, rating: 'high' })),
      lowPerforming: lowRated.map(d => ({ idea: d.sourceIdea, rating: 'low' })),
      topContent: highRated.slice(0, 3).map(d => d.sourceIdea),
      approvalRate: clientDrafts.length > 0 ? Math.round((approvedCount / clientDrafts.length) * 100) : 0,
      totalApproved: approvedCount,
      totalReviewed: clientDrafts.length,
    },

    learnings: deriveLearnings(clientDrafts),

    nextPlan: deriveNextPlan(clientDrafts, latestStrategy),

    insights: {
      contentVelocity: `${clientDrafts.length} pieces produced this period`,
      goalAlignment: latestStrategy ? `Content aligned to: ${breakdown.label}` : 'No active strategy',
      platformBreakdown: Object.entries(byPlatform).map(([p, c]) => `${p}: ${c}`).join(' · ') || 'No content yet',
    },
  };
}

export function saveReport(report: ClientReport): void {
  const reports = loadReports();
  const existing = reports.findIndex(r => r.clientId === report.clientId && r.period === report.period);
  if (existing >= 0) {
    reports[existing] = report;
  } else {
    reports.push(report);
  }
  saveReports(reports);
}

export function deleteReport(id: string): void {
  saveReports(loadReports().filter(r => r.id !== id));
}
