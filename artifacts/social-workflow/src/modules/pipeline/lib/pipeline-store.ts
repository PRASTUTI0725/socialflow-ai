import { z } from 'zod';
import { ContentDraft, ContentStatus } from './pipeline-types';
import { validateDrafts, ContentDraftSchema } from './pipeline-validation';

const STORAGE_KEY = 'socialidiots_pipeline_drafts';

export function loadDrafts(): ContentDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error('[PIPELINE STORE] Data is not an array, defaulting to empty.');
      return [];
    }

    try {
      const results = parsed.map(d => {
        try {
          const validated = ContentDraftSchema.parse(d);
          return validated;
        } catch (e) {
          console.error('[PIPELINE STORE] Validation failed for draft:', d?.id || 'unknown', e instanceof z.ZodError ? e.errors : e);
          return null;
        }
      }).filter(Boolean) as ContentDraft[];
      
      console.log(`[PIPELINE STORE] LOADED: ${results.length} drafts`);
      return results;
    } catch (validationError) {
      console.error('[PIPELINE STORE] Catastrophic array validation failure:', validationError);
      return [];
    }
  } catch (err) {
    console.error('[PIPELINE STORE] Critical error loading drafts:', err);
    return [];
  }
}

function saveDrafts(drafts: ContentDraft[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Storage full — ignore
  }
}

export function getDraft(id: string): ContentDraft | null {
  return loadDrafts().find(d => d.id === id) ?? null;
}

export function getDraftsByClient(clientId: string): ContentDraft[] {
  return loadDrafts().filter(d => d.clientId === clientId);
}

export function getDraftsByStrategy(strategyId: string): ContentDraft[] {
  return loadDrafts().filter(d => d.strategyId === strategyId);
}

export function saveDraft(draft: ContentDraft): void {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === draft.id);
  const updated = { ...draft, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    drafts[idx] = updated;
  } else {
    drafts.push(updated);
  }
  
  saveDrafts(drafts);
  console.log("DRAFT SAVED:", updated);
}

export function saveDraftsBatch(newDrafts: ContentDraft[]): void {
  const existing = loadDrafts();
  const existingIds = new Set(existing.map(d => d.id));
  const toAdd = newDrafts.filter(d => !existingIds.has(d.id));
  
  const updated = [...existing, ...toAdd];
  if (updated.length === 0 && newDrafts.length > 0) {
    throw new Error('DRAFT SAVE FAILURE: Persistent array is empty after batch operation attempt.');
  }
  
  saveDrafts(updated);
  console.log(`BATCH SAVED: ${newDrafts.length} new drafts, Total: ${updated.length}`);
}

export function deleteDraft(id: string): void {
  saveDrafts(loadDrafts().filter(d => d.id !== id));
}

export function deleteDraftsByStrategy(strategyId: string): void {
  saveDrafts(loadDrafts().filter(d => d.strategyId !== strategyId));
}

export function updateDraftStatus(id: string, status: ContentStatus): void {
  const drafts = loadDrafts();
  const draft = drafts.find(d => d.id === id);
  if (draft) {
    draft.status = status;
    draft.updatedAt = new Date().toISOString();
    saveDrafts(drafts);
  }
}

export function updateDraftField(
  id: string,
  updates: Partial<Pick<ContentDraft, 'title' | 'sourceIdea' | 'platformVariants' | 'scheduledDate' | 'deadline' | 'status' | 'designStatus' | 'designNotes' | 'performanceRating' | 'briefId' | 'revisionCount' | 'contentIntent' | 'source' | 'lastReminderSentAt' | 'createdBy' | 'internalNotes' | 'sourceType'>>
): void {
  const drafts = loadDrafts();
  const draft = drafts.find(d => d.id === id);
  if (draft) {
    Object.assign(draft, updates, { updatedAt: new Date().toISOString() });
    saveDrafts(drafts);
  }
}

export function bulkDeleteDrafts(ids: string[]): void {
  const idSet = new Set(ids);
  saveDrafts(loadDrafts().filter(d => !idSet.has(d.id)));
}

export function bulkUpdateStatus(ids: string[], status: ContentStatus): void {
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  const drafts = loadDrafts();
  for (const draft of drafts) {
    if (idSet.has(draft.id)) {
      draft.status = status;
      draft.updatedAt = now;
    }
  }
  saveDrafts(drafts);
}

export function bulkScheduleDrafts(ids: string[], date: string): void {
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  const drafts = loadDrafts();
  for (const draft of drafts) {
    if (idSet.has(draft.id)) {
      draft.scheduledDate = date;
      draft.status = 'scheduled';
      draft.updatedAt = now;
    }
  }
  saveDrafts(drafts);
}
