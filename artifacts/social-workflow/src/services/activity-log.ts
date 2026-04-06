import { generateId } from '@/lib/utils';

// --- Activity Log Types ---

export type ActivityAction =
  | 'CLIENT_CREATED'
  | 'CLIENT_ACTIVATED'
  | 'STRATEGY_GENERATED'
  | 'STRATEGY_APPROVED'
  | 'STRATEGY_REJECTED'
  | 'STRATEGY_REFINED'
  | 'STRATEGY_EDITED'
  | 'STRATEGY_REGENERATED'
  | 'PIPELINE_CREATED'
  | 'DRAFT_CREATED'
  | 'DRAFT_EDITED'
  | 'DRAFT_DELETED'
  | 'DRAFT_STATUS_CHANGED'
  | 'DRAFT_APPROVED'
  | 'DRAFT_REJECTED'
  | 'DRAFT_SCHEDULED'
  | 'DRAFT_PUBLISHED'
  | 'PERFORMANCE_MARKED'
  | 'FORM_IMPORTED'
  | 'CLIENT_UPDATED'; // Legacy support

export type EntityType = 'client' | 'draft' | 'strategy';

export interface ActivityEntry {
  id: string;
  action: ActivityAction | string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  meta?: {
    from?: string;
    to?: string;
    scheduledDate?: string;
    [key: string]: any;
  };
  createdAt: string;
  // Legacy fields for backward compatibility during display
  clientId?: string;
  timestamp?: string;
}

// --- Storage ---

const STORAGE_KEY = 'socialidiots_activity_log';
const MAX_ENTRIES = 500;

export function loadActivityLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    
    // Migration helper for old entries
    return parsed.map((entry: any) => {
      if (!entry.createdAt) {
        return {
          ...entry,
          createdAt: entry.timestamp || new Date().toISOString(),
          entityType: 'client', // Default for old data
          entityId: entry.clientId || '',
          entityName: entry.meta?.clientName || 'Archive',
        };
      }
      return entry;
    });
  } catch {
    return [];
  }
}

function saveActivityLog(entries: ActivityEntry[]): void {
  try {
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — ignore
  }
}

// --- CRUD ---

export function logActivity(
  action: ActivityAction,
  entity: { id: string; name: string; type: EntityType },
  meta: Record<string, any> = {}
): ActivityEntry {
  // Debug log for verification
  console.log("LOG TRIGGERED:", action, entity.name);

  const entry: ActivityEntry = {
    id: generateId(),
    action,
    entityType: entity.type,
    entityId: entity.id,
    entityName: entity.name,
    meta,
    createdAt: new Date().toISOString(),
    // Backward compatibility for existing code that uses .clientId or .timestamp
    clientId: entity.type === 'client' ? entity.id : (meta.clientId || ''),
    timestamp: new Date().toISOString(),
  };

  const log = loadActivityLog();
  log.push(entry);
  saveActivityLog(log);

  return entry;
}

export function getClientActivity(clientId: string): ActivityEntry[] {
  return loadActivityLog()
    .filter(e => e.entityId === clientId || (e.entityType === 'draft' && e.meta?.clientId === clientId) || e.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getDraftActivity(draftId: string): ActivityEntry[] {
  return loadActivityLog()
    .filter(e => e.entityId === draftId && e.entityType === 'draft')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getRecentActivity(limit: number = 20): ActivityEntry[] {
  return loadActivityLog()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function clearActivityLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// --- Display helpers ---

export function formatActivityMessage(entry: ActivityEntry): { text: string; bold: string } {
  const name = entry.entityName || 'Item';
  const meta = entry.meta || {};

  switch (entry.action) {
    case 'CLIENT_CREATED':
      return { bold: name, text: 'created' };
    case 'CLIENT_ACTIVATED':
      return { bold: name, text: 'set as active' };
    case 'CLIENT_UPDATED':
      return { bold: name, text: meta.updateType === 'onboarding_completed' ? 'onboarding completed' : 'profile updated' };
    case 'DRAFT_CREATED':
      return { bold: name, text: 'post created' };
    case 'DRAFT_EDITED':
      return { bold: name, text: 'post edited' };
    case 'DRAFT_DELETED':
      return { bold: name, text: 'post deleted' };
    case 'DRAFT_STATUS_CHANGED':
      return { bold: name, text: `moved ${meta.from || 'Draft'} → ${meta.to}` };
    case 'DRAFT_APPROVED':
      return { bold: name, text: 'approved' };
    case 'DRAFT_REJECTED':
      return { bold: name, text: 'rejected' };
    case 'DRAFT_SCHEDULED':
      return { bold: name, text: `scheduled for ${meta.scheduledDate ? new Date(meta.scheduledDate).toLocaleDateString() : 'delivery'}` };
    case 'DRAFT_PUBLISHED':
      return { bold: name, text: 'published' };
    case 'STRATEGY_GENERATED':
      return { bold: name, text: 'strategy generated' };
    case 'STRATEGY_APPROVED':
      return { bold: name, text: 'strategy approved' };
    case 'STRATEGY_REJECTED':
      return { bold: name, text: 'strategy rejected' };
    case 'STRATEGY_REFINED':
      return { bold: name, text: 'strategy refined with Brain' };
    case 'STRATEGY_EDITED':
      return { bold: name, text: 'strategy edited' };
    case 'STRATEGY_REGENERATED':
      return { bold: name, text: 'strategy regenerated' };
    case 'PIPELINE_CREATED':
      return { bold: name, text: `${meta.draftCount || meta.briefCount || 'New'} items added to pipeline` };
    case 'PERFORMANCE_MARKED':
      return { bold: name, text: `rated as "${meta.rating}" performance` };
    case 'FORM_IMPORTED':
      return { bold: name, text: 'data imported from Google Form' };
    default:
      return { bold: name, text: entry.action.toLowerCase().replace(/_/g, ' ') };
  }
}

export function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

