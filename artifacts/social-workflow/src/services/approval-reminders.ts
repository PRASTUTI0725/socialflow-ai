import { loadDrafts, updateDraftField as updateDraftInStore } from '../modules/pipeline/lib/pipeline-store';
import { ContentDraft } from '../modules/pipeline/lib/pipeline-types';

const REMINDER_INTERVAL_HOURS = 24; // Send reminder every 24 hours

/**
 * Check drafts pending approval and send reminders if needed
 */
export function checkAndSendReminders(): Array<{ draftId: string; clientId: string; message: string }> {
  const drafts = loadDrafts();
  const now = new Date();
  const remindersSent: Array<{ draftId: string; clientId: string; message: string }> = [];

  for (const draft of drafts) {
    if (draft.status !== 'internal_review' && draft.status !== 'client_review') continue;

    const shouldSendReminder = shouldTriggerReminder(draft, now);
    
    if (shouldSendReminder) {
      const reminder = sendApprovalReminder(draft.id);
      if (reminder) {
        remindersSent.push(reminder);
      }
    }
  }

  return remindersSent;
}

/**
 * Determine if a reminder should be sent for this draft
 */
function shouldTriggerReminder(draft: ContentDraft, now: Date): boolean {
  // If no reminder has been sent yet, check if draft has been pending for > 24 hours
  if (!draft.lastReminderSentAt) {
    const createdAt = new Date(draft.updatedAt);
    const hoursPending = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursPending >= REMINDER_INTERVAL_HOURS;
  }

  // If reminder was sent before, check if it's been 24+ hours since last reminder
  const lastReminder = new Date(draft.lastReminderSentAt);
  const hoursSinceReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60);
  return hoursSinceReminder >= REMINDER_INTERVAL_HOURS;
}

/**
 * Send approval reminder for a specific draft
 * Updates lastReminderSentAt timestamp
 */
export function sendApprovalReminder(draftId: string): { draftId: string; clientId: string; message: string } | null {
  const drafts = loadDrafts();
  const draft = drafts.find(d => d.id === draftId);
  
  if (!draft || (draft.status !== 'internal_review' && draft.status !== 'client_review')) {
    return null;
  }

  // Update last reminder timestamp
  updateDraftInStore(draftId, { lastReminderSentAt: new Date().toISOString() } as any);

  const message = `⏰ Approval Reminder: "${draft.sourceIdea.slice(0, 50)}${draft.sourceIdea.length > 50 ? '...' : ''}" has been pending approval. Please review and approve/reject.`;
  
  // Log to console (in production, this would send email/notification)
  console.log(`[APPROVAL REMINDER] Client ${draft.clientId}: ${message}`);
  
  return {
    draftId,
    clientId: draft.clientId,
    message,
  };
}

/**
 * Manual trigger for sending a reminder (called by user action)
 */
export function triggerManualReminder(draftId: string): boolean {
  const result = sendApprovalReminder(draftId);
  return result !== null;
}
