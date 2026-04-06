import { generateId } from '@/lib/utils';
import { Client } from '@/modules/clients/lib/client-types';
import { ContentDraft } from '@/modules/pipeline/lib/pipeline-types';
import { OnboardingChecklist } from '@/lib/client-memory';
import { logActivity, ActivityAction } from './activity-log';
import { sendApprovalNotification, sendPipelineCreatedNotification, sendRejectionNotification } from './integrations/notification-service';

// --- Settings ---

const AUTO_PIPELINE_KEY = 'auto_pipeline_on_approval';

export function isAutoPipelineEnabled(): boolean {
  return localStorage.getItem(AUTO_PIPELINE_KEY) === 'true';
}

export function setAutoPipelineEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_PIPELINE_KEY, String(enabled));
}

// --- Automation Suggestions ---

export type AutomationTrigger =
  | 'onboarding_completed'
  | 'strategy_generated'
  | 'strategy_approved'
  | 'strategy_rejected'
  | 'briefs_created'
  | 'draft_created'
  | 'draft_approved'
  | 'draft_rejected'
  | 'draft_scheduled'
  | 'performance_rated';

export interface AutomationSuggestion {
  id: string;
  trigger: AutomationTrigger;
  clientId: string;
  message: string;
  action: string;
  actionType: 'navigate' | 'generate' | 'create' | 'schedule';
  targetView: string;
  dismissed: boolean;
  createdAt: string;
}

const SUGGESTIONS_KEY = 'socialidiots_automation_suggestions';

export function loadSuggestions(): AutomationSuggestion[] {
  try {
    const raw = localStorage.getItem(SUGGESTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AutomationSuggestion[];
  } catch {
    return [];
  }
}

function saveSuggestions(suggestions: AutomationSuggestion[]): void {
  try {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
  } catch {
    // Storage full — ignore
  }
}

function addSuggestion(
  trigger: AutomationTrigger,
  clientId: string,
  message: string,
  action: string,
  actionType: AutomationSuggestion['actionType'],
  targetView: string
): void {
  const existing = loadSuggestions();
  const recent = existing.find(
    s => s.trigger === trigger && s.clientId === clientId && !s.dismissed
  );
  if (recent) return;

  const suggestion: AutomationSuggestion = {
    id: generateId(),
    trigger,
    clientId,
    message,
    action,
    actionType,
    targetView,
    dismissed: false,
    createdAt: new Date().toISOString(),
  };

  saveSuggestions([...existing, suggestion]);
}

export function dismissSuggestion(id: string): void {
  const suggestions = loadSuggestions();
  const s = suggestions.find(s => s.id === id);
  if (s) {
    s.dismissed = true;
    saveSuggestions(suggestions);
  }
}

export function getClientSuggestions(clientId: string): AutomationSuggestion[] {
  return loadSuggestions().filter(s => s.clientId === clientId && !s.dismissed);
}

export function getActiveSuggestions(): AutomationSuggestion[] {
  return loadSuggestions().filter(s => !s.dismissed);
}

export function clearOldSuggestions(): void {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  saveSuggestions(loadSuggestions().filter(s => s.createdAt > oneWeekAgo));
}

// --- Automation Triggers ---

export function onFormImported(clientId: string, clientName: string, fieldCount: number): void {
  logActivity('FORM_IMPORTED', { id: clientId, name: clientName, type: 'client' }, {
    fieldsImported: String(fieldCount),
  });
}

export function onClientCreated(client: Client): void {
  logActivity('CLIENT_CREATED', { id: client.id, name: client.name, type: 'client' }, {
    niche: client.niche,
  });

  addSuggestion(
    'onboarding_completed',
    client.id,
    `Start onboarding for ${client.name}? Complete the checklist to unlock strategy generation.`,
    'Start Onboarding',
    'navigate',
    'clients'
  );
}

export function onClientActivated(client: Client): void {
  logActivity('CLIENT_ACTIVATED', { id: client.id, name: client.name, type: 'client' });
}

export function onOnboardingCompleted(client: Client): void {
  logActivity('CLIENT_UPDATED', { id: client.id, name: client.name, type: 'client' }, {
    updateType: 'onboarding_completed',
  });

  addSuggestion(
    'onboarding_completed',
    client.id,
    `Onboarding complete for ${client.name}! Ready to generate a content strategy.`,
    'Generate Strategy',
    'generate',
    'create'
  );
}

export function onStrategyGenerated(client: Client, source: string = 'template'): void {
  logActivity('STRATEGY_GENERATED', { id: client.id, name: client.name, type: 'client' }, {
    source,
  });

  addSuggestion(
    'strategy_generated',
    client.id,
    `Strategy generated for ${client.name}. Review it and approve to create content briefs.`,
    'Review Strategy',
    'navigate',
    'output'
  );
}

export function onStrategyRefined(client: Client): void {
  logActivity('STRATEGY_REFINED', { id: client.id, name: client.name, type: 'client' });
}

export function onStrategyEdited(client: Client): void {
  logActivity('STRATEGY_EDITED', { id: client.id, name: client.name, type: 'client' });
}

export function onStrategyRegenerated(client: Client): void {
  logActivity('STRATEGY_REGENERATED', { id: client.id, name: client.name, type: 'client' });
}

export function onStrategyApproved(client: Client): void {
  logActivity('STRATEGY_APPROVED', { id: client.id, name: client.name, type: 'client' });

  sendApprovalNotification({
    clientId: client.id,
    clientName: client.name,
    action: 'STRATEGY_APPROVED',
    meta: { niche: client.niche },
  });

  addSuggestion(
    'strategy_approved',
    client.id,
    `Strategy approved for ${client.name}! Create content briefs and pipeline drafts?`,
    'Create Pipeline',
    'create',
    'pipeline'
  );
}

export function onStrategyRejected(client: Client): void {
  logActivity('STRATEGY_REJECTED', { id: client.id, name: client.name, type: 'client' });

  sendRejectionNotification({
    clientId: client.id,
    clientName: client.name,
    action: 'STRATEGY_REJECTED',
    meta: {},
  });

  addSuggestion(
    'strategy_rejected',
    client.id,
    `Strategy rejected for ${client.name}. Refine with Brain and regenerate?`,
    'Refine & Retry',
    'generate',
    'create'
  );
}

export function onPipelineCreated(client: Client, draftCount: number): void {
  logActivity('PIPELINE_CREATED', { id: client.id, name: client.name, type: 'client' }, {
    draftCount,
  });

  sendPipelineCreatedNotification({
    clientId: client.id,
    clientName: client.name,
    action: 'PIPELINE_CREATED',
    meta: { draftCount: String(draftCount) },
  });
}

export function onDraftCreated(draft: ContentDraft): void {
  try {
    logActivity('DRAFT_CREATED', { id: draft.id, name: draft.title || 'Untitled Post', type: 'draft' }, {
      clientId: draft.clientId,
      source: draft.source,
    });
  } catch (e) {
    console.error('Failed to log DRAFT_CREATED:', e);
  }
}

export function onDraftEdited(draft: ContentDraft): void {
  try {
    logActivity('DRAFT_EDITED', { id: draft.id, name: draft.title || 'Untitled Post', type: 'draft' }, {
      clientId: draft.clientId,
    });
  } catch (e) {
    console.error('Failed to log DRAFT_EDITED:', e);
  }
}

export function onDraftDeleted(clientId: string, draftId: string, draftName: string): void {
  try {
    logActivity('DRAFT_DELETED', { id: draftId, name: draftName || 'Post', type: 'draft' }, {
      clientId,
    });
  } catch (e) {
    console.error('Failed to log DRAFT_DELETED:', e);
  }
}

export function onDraftStatusChanged(clientId: string, draftId: string, oldStatus: string, newStatus: string, draftName: string = ''): void {
  try {
    // Determine if this is a high-level event like approve/reject
    let action: ActivityAction = 'DRAFT_STATUS_CHANGED';
    if (newStatus === 'approved') action = 'DRAFT_APPROVED';
    if (newStatus === 'rejected') action = 'DRAFT_REJECTED';
    if (newStatus === 'published') action = 'DRAFT_PUBLISHED';

    logActivity(action, { id: draftId, name: draftName || 'Post', type: 'draft' }, {
      clientId,
      from: oldStatus,
      to: newStatus,
    });

    if (newStatus === 'approved') {
      addSuggestion(
        'draft_approved',
        clientId,
        'Draft approved! Schedule it or continue reviewing other drafts.',
        'Schedule Draft',
        'schedule',
        'pipeline'
      );
    }
  } catch (e) {
    console.error('Failed to log DRAFT_STATUS_CHANGED:', e);
  }
}

export function onDraftScheduled(clientId: string, draftId: string, draftName: string, scheduledDate: string): void {
  try {
    logActivity('DRAFT_SCHEDULED', { id: draftId, name: draftName || 'Post', type: 'draft' }, {
      clientId,
      scheduledDate,
    });
  } catch (e) {
    console.error('Failed to log DRAFT_SCHEDULED:', e);
  }
}

export function onPerformanceMarked(clientId: string, draftId: string, draftName: string, rating: string): void {
  try {
    logActivity('PERFORMANCE_MARKED', { id: draftId, name: draftName || 'Post', type: 'draft' }, {
      clientId,
      rating,
    });

    if (rating === 'high') {
      addSuggestion(
        'performance_rated',
        clientId,
        'High-performing content detected! Use this pattern in the next strategy.',
        'Review Insights',
        'navigate',
        'brand-profile'
      );
    }
  } catch (e) {
    console.error('Failed to log PERFORMANCE_MARKED:', e);
  }
}

// --- Aliases for Backward Compatibility ---

export function onBriefsCreated(clientId: string, clientName: string, briefCount: number): void {
  onPipelineCreated({ id: clientId, name: clientName } as any, briefCount);
}

export function onApprovalCompleted(clientId: string, draftId: string): void {
  onDraftStatusChanged(clientId, draftId, 'pending_approval', 'approved', 'Post');
}

export function onRevisionRequested(clientId: string, draftId: string): void {
  onDraftStatusChanged(clientId, draftId, 'pending_approval', 'draft', 'Post');
}

// --- Onboarding Check ---

export function canGenerateStrategy(checklist: OnboardingChecklist): boolean {
  return Object.values(checklist).every(Boolean);
}

export function getOnboardingGateMessage(checklist: OnboardingChecklist): string | null {
  const missing: string[] = [];
  if (!checklist.brandName) missing.push('Brand Identity');
  if (!checklist.goals) missing.push('Goals');
  if (!checklist.targetAudience) missing.push('Target Audience');
  if (!checklist.brandVoice) missing.push('Brand Voice');
  if (!checklist.platforms) missing.push('Platforms');

  if (missing.length === 0) return null;
  return `Onboarding in progress. Complete required fields first: ${missing.join(', ')}`;
}

