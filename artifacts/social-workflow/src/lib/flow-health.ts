import { Client } from '@/modules/clients/lib/client-types';
import { ContentDraft } from '@/modules/pipeline/lib/pipeline-types';
import { StrategyOutput } from '@/lib/content-generator';
import { canTriggerStrategy, ONBOARDING_ITEMS, getMissingItems, isFieldComplete } from '@/lib/onboarding';
import { ApprovalFlow, loadAllFlows } from '@/lib/approval-workflow';
import { getThreadsWaitingForClient, getThreadsWaitingForTeam, getThreadStaleness, type MessageThread } from '@/lib/client-messages';

export interface StuckDraft {
  draft: ContentDraft;
  daysStuck: number;
  reason: string;
}

export interface OverdueItem {
  id: string;
  type: 'draft' | 'approval';
  clientId: string;
  clientName: string;
  label: string;
  daysOverdue: number;
}

export interface ClientHealthWarning {
  type: 'onboarding_incomplete' | 'strategy_not_approved' | 'drafts_stuck' | 'approved_unscheduled' | 'no_activity' | 'overdue_draft' | 'overdue_approval' | 'client_unresponsive';
  clientId: string;
  clientName: string;
  message: string;
  actionLabel: string;
  targetView: string;
  severity: 'critical' | 'warning' | 'info';
}

export type ClientHealthStatus = 'healthy' | 'at_risk' | 'critical';

export interface ClientHealthScore {
  clientId: string;
  clientName: string;
  status: ClientHealthStatus;
  score: number;
  factors: Array<{ label: string; impact: 'positive' | 'negative' | 'neutral' }>;
}

export interface Bottleneck {
  type: 'waiting_on_client' | 'waiting_on_team' | 'overdue_draft' | 'stuck_in_review';
  clientId: string;
  clientName: string;
  message: string;
  daysWaiting: number;
  actionLabel: string;
  targetView: string;
}

export interface TodayPriority {
  id: string;
  type: 'review_draft' | 'pending_approval' | 'overdue' | 'schedule' | 'client_reply';
  clientId: string;
  clientName: string;
  label: string;
  urgency: 'high' | 'medium' | 'low';
  actionLabel: string;
  targetView: string;
}

const STUCK_DRAFT_DAYS = 3;
const NO_ACTIVITY_DAYS = 7;
const OVERDUE_DRAFT_DAYS = 5;
const OVERDUE_APPROVAL_DAYS = 3;

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getStuckDrafts(drafts: ContentDraft[]): StuckDraft[] {
  const stuck: StuckDraft[] = [];
  for (const draft of drafts) {
    if (draft.status === 'scheduled' || draft.status === 'approved') continue;
    const age = daysSince(draft.updatedAt);
    if (age >= STUCK_DRAFT_DAYS) {
      stuck.push({
        draft,
        daysStuck: age,
        reason: draft.status === 'draft'
          ? `Draft untouched for ${age} days`
          : `In review for ${age} days — no response`,
      });
    }
  }
  return stuck;
}

export function getOverdueDrafts(drafts: ContentDraft[]): OverdueItem[] {
  const overdue: OverdueItem[] = [];
  for (const draft of drafts) {
    if (draft.status === 'scheduled') continue;
    if (!draft.deadline) continue;
    const deadlineDate = new Date(draft.deadline);
    if (deadlineDate >= new Date()) continue;
    const daysOverdue = daysSince(draft.deadline);
    if (daysOverdue > 0) {
      overdue.push({
        id: draft.id,
        type: 'draft',
        clientId: draft.clientId,
        clientName: '',
        label: draft.sourceIdea.slice(0, 40),
        daysOverdue,
      });
    }
  }
  return overdue;
}

export function getOverdueApprovals(flows: ApprovalFlow[]): OverdueItem[] {
  const overdue: OverdueItem[] = [];
  for (const flow of flows) {
    if (flow.overallStatus === 'approved') continue;
    if (!flow.deadline) continue;
    const deadlineDate = new Date(flow.deadline);
    if (deadlineDate >= new Date()) continue;
    const daysOverdue = daysSince(flow.deadline);
    if (daysOverdue > 0) {
      overdue.push({
        id: flow.id,
        type: 'approval',
        clientId: flow.clientId,
        clientName: '',
        label: `Approval flow`,
        daysOverdue,
      });
    }
  }
  return overdue;
}

export function getClientHealthScore(
  client: Client,
  drafts: ContentDraft[],
  flows: ApprovalFlow[]
): ClientHealthScore {
  const clientDrafts = drafts.filter(d => d.clientId === client.id);
  const clientFlows = flows.filter(f => f.clientId === client.id);
  const factors: Array<{ label: string; impact: 'positive' | 'negative' | 'neutral' }> = [];
  let score = 70;

  const overdueDrafts = getOverdueDrafts(clientDrafts);
  if (overdueDrafts.length > 0) {
    score -= overdueDrafts.length * 15;
    factors.push({ label: `${overdueDrafts.length} overdue draft${overdueDrafts.length > 1 ? 's' : ''}`, impact: 'negative' });
  }

  const stuckDrafts = getStuckDrafts(clientDrafts);
  if (stuckDrafts.length > 0) {
    score -= stuckDrafts.length * 10;
    factors.push({ label: `${stuckDrafts.length} stuck draft${stuckDrafts.length > 1 ? 's' : ''}`, impact: 'negative' });
  }

  const overdueApprovals = getOverdueApprovals(clientFlows);
  if (overdueApprovals.length > 0) {
    score -= overdueApprovals.length * 12;
    factors.push({ label: `${overdueApprovals.length} overdue approval${overdueApprovals.length > 1 ? 's' : ''}`, impact: 'negative' });
  }

  const waitingClient = getThreadsWaitingForClient(client.id);
  if (waitingClient.length > 0) {
    const staleCount = waitingClient.filter(t => getThreadStaleness(t) >= 2).length;
    if (staleCount > 0) {
      score -= staleCount * 8;
      factors.push({ label: `${staleCount} client response${staleCount > 1 ? 's' : ''} pending 2+ days`, impact: 'negative' });
    }
  }

  const approvedUnscheduled = clientDrafts.filter(d => d.status === 'approved');
  if (approvedUnscheduled.length > 3) {
    score -= 10;
    factors.push({ label: `${approvedUnscheduled.length} approved drafts not scheduled`, impact: 'negative' });
  }

  if (clientDrafts.length > 0) {
    const lastUpdate = clientDrafts.reduce((latest, d) => {
      const dDate = new Date(d.updatedAt).getTime();
      return dDate > latest ? dDate : latest;
    }, 0);
    const daysSinceActivity = daysSince(new Date(lastUpdate).toISOString());
    if (daysSinceActivity >= NO_ACTIVITY_DAYS) {
      score -= 15;
      factors.push({ label: `No activity for ${daysSinceActivity} days`, impact: 'negative' });
    }
  }

  const scheduled = clientDrafts.filter(d => d.status === 'scheduled');
  if (scheduled.length > 0) {
    score += Math.min(15, scheduled.length * 3);
    factors.push({ label: `${scheduled.length} content piece${scheduled.length > 1 ? 's' : ''} scheduled`, impact: 'positive' });
  }

  if (canTriggerStrategy(client.clientProfile)) {
    score += 5;
    factors.push({ label: 'Onboarding complete', impact: 'positive' });
  }

  const highPerforming = clientDrafts.filter(d => d.performanceRating === 'high');
  if (highPerforming.length > 0) {
    score += Math.min(10, highPerforming.length * 5);
    factors.push({ label: `${highPerforming.length} high-performing content`, impact: 'positive' });
  }

  score = Math.max(0, Math.min(100, score));

  let status: ClientHealthStatus;
  if (score >= 70) status = 'healthy';
  else if (score >= 40) status = 'at_risk';
  else status = 'critical';

  return { clientId: client.id, clientName: client.businessName || client.name, status, score, factors };
}

export function getClientHealthWarnings(
  client: Client,
  drafts: ContentDraft[],
  strategies: StrategyOutput[]
): ClientHealthWarning[] {
  const warnings: ClientHealthWarning[] = [];
  const clientDrafts = drafts.filter(d => d.clientId === client.id);

  const missingItems = getMissingItems(client.clientProfile);
  const onboardingPct = ONBOARDING_ITEMS.length === 0 ? 0 : Math.round(((ONBOARDING_ITEMS.length - missingItems.length) / ONBOARDING_ITEMS.length) * 100);
  
  if (onboardingPct > 0 && onboardingPct < 100) {
    warnings.push({
      type: 'onboarding_incomplete',
      clientId: client.id,
      clientName: client.businessName || client.name,
      message: `Onboarding ${onboardingPct}% complete — ${100 - onboardingPct}% remaining`,
      actionLabel: 'Complete Now',
      targetView: 'onboarding',
      severity: 'warning',
    });
  }

  if (!canTriggerStrategy(client.clientProfile)) {
    const hasAnyChecklistItems = ONBOARDING_ITEMS.some(item => isFieldComplete(client.clientProfile, item.key));
    if (!hasAnyChecklistItems && clientDrafts.length === 0) {
      warnings.push({
        type: 'onboarding_incomplete',
        clientId: client.id,
        clientName: client.businessName || client.name,
        message: 'Not started — onboarding needed before strategy',
        actionLabel: 'Start Onboarding',
        targetView: 'onboarding',
        severity: 'critical',
      });
    }
  }

  const overdueDrafts = getOverdueDrafts(clientDrafts);
  for (const od of overdueDrafts) {
    warnings.push({
      type: 'overdue_draft',
      clientId: client.id,
      clientName: client.businessName || client.name,
      message: `"${od.label}" overdue by ${od.daysOverdue} day${od.daysOverdue > 1 ? 's' : ''}`,
      actionLabel: 'Complete Profile',
      targetView: 'pipeline',
      severity: od.daysOverdue >= 3 ? 'critical' : 'warning',
    });
  }

  const stuckDrafts = getStuckDrafts(clientDrafts);
  if (stuckDrafts.length > 0) {
    warnings.push({
      type: 'drafts_stuck',
      clientId: client.id,
      clientName: client.businessName || client.name,
      message: `${stuckDrafts.length} draft${stuckDrafts.length > 1 ? 's' : ''} stuck for ${STUCK_DRAFT_DAYS}+ days`,
      actionLabel: 'Review Drafts',
      targetView: 'pipeline',
      severity: stuckDrafts.length >= 5 ? 'critical' : 'warning',
    });
  }

  const waitingClient = getThreadsWaitingForClient(client.id);
  const staleClientThreads = waitingClient.filter(t => getThreadStaleness(t) >= 2);
  if (staleClientThreads.length > 0) {
    warnings.push({
      type: 'client_unresponsive',
      clientId: client.id,
      clientName: client.businessName || client.name,
      message: `${staleClientThreads.length} thread${staleClientThreads.length > 1 ? 's' : ''} waiting on client for 2+ days`,
      actionLabel: 'Follow Up',
      targetView: 'pipeline',
      severity: 'warning',
    });
  }

  const approvedUnscheduled = clientDrafts.filter(d => d.status === 'approved');
  if (approvedUnscheduled.length > 0) {
    warnings.push({
      type: 'approved_unscheduled',
      clientId: client.id,
      clientName: client.businessName || client.name,
      message: `${approvedUnscheduled.length} approved draft${approvedUnscheduled.length > 1 ? 's' : ''} not yet scheduled`,
      actionLabel: 'Schedule Now',
      targetView: 'pipeline',
      severity: 'warning',
    });
  }

  // CRITICAL: Use strategy.clientId directly - NO inference from brandProfileUsed
  const hasStrategy = strategies.some(s => s.clientId === client.id);
  if (hasStrategy && client.strategyStatus === 'draft') {
    warnings.push({
      type: 'strategy_not_approved',
      clientId: client.id,
      clientName: client.businessName || client.name,
      message: 'Strategy generated but not approved',
      actionLabel: 'Review Strategy',
      targetView: 'output',
      severity: 'warning',
    });
  }

  if (clientDrafts.length > 0) {
    const lastUpdate = clientDrafts.reduce((latest, d) => {
      const dDate = new Date(d.updatedAt).getTime();
      return dDate > latest ? dDate : latest;
    }, 0);
    const daysSinceActivity = daysSince(new Date(lastUpdate).toISOString());
    if (daysSinceActivity >= NO_ACTIVITY_DAYS) {
      warnings.push({
        type: 'no_activity',
        clientId: client.id,
        clientName: client.businessName || client.name,
        message: `No activity for ${daysSinceActivity} days`,
        actionLabel: 'View Pipeline',
        targetView: 'pipeline',
        severity: 'info',
      });
    }
  }

  return warnings;
}

export function getSystemHealthSummary(
  clients: Client[],
  drafts: ContentDraft[],
  strategies: StrategyOutput[]
): {
  totalWarnings: number;
  criticalCount: number;
  stuckDraftsTotal: number;
  approvedUnscheduledTotal: number;
  warnings: ClientHealthWarning[];
} {
  const allWarnings: ClientHealthWarning[] = [];
  for (const client of clients) {
    allWarnings.push(...getClientHealthWarnings(client, drafts, strategies));
  }

  return {
    totalWarnings: allWarnings.length,
    criticalCount: allWarnings.filter(w => w.severity === 'critical').length,
    stuckDraftsTotal: getStuckDrafts(drafts).length,
    approvedUnscheduledTotal: drafts.filter(d => d.status === 'approved').length,
    warnings: allWarnings,
  };
}

export function getBottlenecks(
  clients: Client[],
  drafts: ContentDraft[]
): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  for (const client of clients) {
    const clientDrafts = drafts.filter(d => d.clientId === client.id);

    const stuckInReview = clientDrafts.filter(d => d.status === 'internal_review' || d.status === 'client_review');
    for (const draft of stuckInReview) {
      const age = daysSince(draft.updatedAt);
      if (age >= 2) {
        bottlenecks.push({
          type: 'stuck_in_review',
          clientId: client.id,
          clientName: client.businessName || client.name,
          message: `"${draft.sourceIdea.slice(0, 30)}" in review for ${age} days`,
          daysWaiting: age,
          actionLabel: 'Review',
          targetView: 'pipeline',
        });
      }
    }

    const waitingClient = getThreadsWaitingForClient(client.id);
    for (const thread of waitingClient) {
      const staleDays = getThreadStaleness(thread);
      if (staleDays >= 2) {
        bottlenecks.push({
          type: 'waiting_on_client',
          clientId: client.id,
          clientName: client.businessName || client.name,
          message: `Client hasn't responded for ${staleDays} days`,
          daysWaiting: staleDays,
          actionLabel: 'Follow Up',
          targetView: 'pipeline',
        });
        break;
      }
    }

    const overdueDrafts = getOverdueDrafts(clientDrafts);
    if (overdueDrafts.length > 0) {
      bottlenecks.push({
        type: 'overdue_draft',
        clientId: client.id,
        clientName: client.businessName || client.name,
        message: `${overdueDrafts.length} overdue draft${overdueDrafts.length > 1 ? 's' : ''}`,
        daysWaiting: Math.max(...overdueDrafts.map(o => o.daysOverdue)),
        actionLabel: 'Complete Profile',
        targetView: 'pipeline',
      });
    }
  }

  const waitingTeam = getThreadsWaitingForTeam();
  for (const thread of waitingTeam) {
    const staleDays = getThreadStaleness(thread);
    if (staleDays >= 1) {
      const client = clients.find(c => c.id === thread.clientId);
      bottlenecks.push({
        type: 'waiting_on_team',
        clientId: thread.clientId,
        clientName: client?.businessName || client?.name || 'Unknown',
        message: `Team hasn't replied for ${staleDays} day${staleDays > 1 ? 's' : ''}`,
        daysWaiting: staleDays,
        actionLabel: 'Reply',
        targetView: 'pipeline',
      });
    }
  }

  bottlenecks.sort((a, b) => b.daysWaiting - a.daysWaiting);
  return bottlenecks;
}

export function getTodayPriorities(
  clients: Client[],
  drafts: ContentDraft[],
  strategies: StrategyOutput[]
): TodayPriority[] {
  const priorities: TodayPriority[] = [];

  for (const client of clients) {
    const clientDrafts = drafts.filter(d => d.clientId === client.id);

    const overdueDrafts = getOverdueDrafts(clientDrafts);
    for (const od of overdueDrafts) {
      priorities.push({
        id: od.id,
        type: 'overdue',
        clientId: client.id,
        clientName: client.businessName || client.name,
        label: `"${od.label}" overdue by ${od.daysOverdue}d`,
        urgency: od.daysOverdue >= 3 ? 'high' : 'medium',
        actionLabel: 'Complete Profile',
        targetView: 'pipeline',
      });
    }

    const needsReview = clientDrafts.filter(d => d.status === 'draft');
    if (needsReview.length >= 3) {
      priorities.push({
        id: `review-${client.id}`,
        type: 'review_draft',
        clientId: client.id,
        clientName: client.businessName || client.name,
        label: `${needsReview.length} drafts need initial review`,
        urgency: needsReview.length >= 5 ? 'high' : 'medium',
        actionLabel: 'Review',
        targetView: 'pipeline',
      });
    }

    const approvedUnscheduled = clientDrafts.filter(d => d.status === 'approved');
    if (approvedUnscheduled.length > 0) {
      priorities.push({
        id: `schedule-${client.id}`,
        type: 'schedule',
        clientId: client.id,
        clientName: client.businessName || client.name,
        label: `${approvedUnscheduled.length} approved — ready to schedule`,
        urgency: 'medium',
        actionLabel: 'Schedule',
        targetView: 'pipeline',
      });
    }

    const waitingClient = getThreadsWaitingForClient(client.id);
    const staleReplies = waitingClient.filter(t => getThreadStaleness(t) >= 2);
    for (const thread of staleReplies) {
      priorities.push({
        id: `reply-${thread.id}`,
        type: 'client_reply',
        clientId: client.id,
        clientName: client.businessName || client.name,
        label: `Client hasn't responded (${getThreadStaleness(thread)}d)`,
        urgency: getThreadStaleness(thread) >= 4 ? 'high' : 'medium',
        actionLabel: 'Follow Up',
        targetView: 'pipeline',
      });
    }

    // CRITICAL: Use strategy.clientId directly - NO inference from brandProfileUsed
    const hasStrategy = strategies.some(s => s.clientId === client.id);
    if (hasStrategy && client.strategyStatus === 'draft') {
      priorities.push({
        id: `strategy-${client.id}`,
        type: 'pending_approval',
        clientId: client.id,
        clientName: client.businessName || client.name,
        label: 'Strategy awaiting approval',
        urgency: 'medium',
        actionLabel: 'Review',
        targetView: 'output',
      });
    }
  }

  priorities.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  return priorities;
}
