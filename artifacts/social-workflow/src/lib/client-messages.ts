import { generateId } from '@/lib/utils';
export type MessageSender = 'client' | 'team';
export type ThreadStatus = 'waiting_for_client' | 'waiting_for_team' | 'resolved';

export interface ClientMessage {
  id: string;
  draftId: string;
  clientId: string;
  sender: MessageSender;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface MessageThread {
  id: string;
  draftId: string;
  clientId: string;
  status: ThreadStatus;
  messages: ClientMessage[];
  lastMessageAt: string;
  createdAt: string;
}

const MESSAGES_KEY = 'socialidiots_client_messages';

function saveThreads(threads: MessageThread[]): void {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(threads));
  } catch {
    // Storage full
  }
}

export function loadThreads(): MessageThread[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MessageThread[];
  } catch {
    return [];
  }
}

export function getThreadByDraft(draftId: string): MessageThread | null {
  return loadThreads().find(t => t.draftId === draftId) ?? null;
}

export function getThreadsByClient(clientId: string): MessageThread[] {
  return loadThreads().filter(t => t.clientId === clientId);
}

export function getThreadsWaitingForClient(clientId: string): MessageThread[] {
  return loadThreads().filter(t => t.clientId === clientId && t.status === 'waiting_for_client');
}

export function getThreadsWaitingForTeam(): MessageThread[] {
  return loadThreads().filter(t => t.status === 'waiting_for_team');
}

export function createThread(draftId: string, clientId: string): MessageThread {
  const now = new Date().toISOString();
  const thread: MessageThread = {
    id: generateId(),
    draftId,
    clientId,
    status: 'waiting_for_team',
    messages: [],
    lastMessageAt: now,
    createdAt: now,
  };
  const threads = loadThreads();
  const existing = threads.find(t => t.draftId === draftId);
  if (existing) return existing;
  saveThreads([...threads, thread]);
  return thread;
}

export function addMessage(
  threadId: string,
  sender: MessageSender,
  senderName: string,
  message: string
): MessageThread | null {
  const threads = loadThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return null;

  const now = new Date().toISOString();
  const msg: ClientMessage = {
    id: generateId(),
    draftId: thread.draftId,
    clientId: thread.clientId,
    sender,
    senderName,
    message,
    timestamp: now,
  };

  thread.messages.push(msg);
  thread.lastMessageAt = now;
  thread.status = sender === 'client' ? 'waiting_for_team' : 'waiting_for_client';

  saveThreads(threads);
  return thread;
}

export function resolveThread(threadId: string): MessageThread | null {
  const threads = loadThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return null;
  thread.status = 'resolved';
  saveThreads(threads);
  return thread;
}

export function getUnreadClientMessagesCount(): number {
  return loadThreads().filter(t => t.status === 'waiting_for_team').length;
}

export function getThreadStaleness(thread: MessageThread): number {
  const diff = Date.now() - new Date(thread.lastMessageAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function deleteThreadsByDraft(draftId: string): void {
  saveThreads(loadThreads().filter(t => t.draftId !== draftId));
}

export interface FollowUpSuggestion {
  threadId: string;
  draftId: string;
  clientId: string;
  daysStale: number;
  suggestedMessage: string;
}

export function getStaleFollowUps(): FollowUpSuggestion[] {
  const threads = loadThreads();
  const suggestions: FollowUpSuggestion[] = [];

  for (const thread of threads) {
    if (thread.status !== 'waiting_for_client') continue;
    const daysStale = getThreadStaleness(thread);
    if (daysStale < 2) continue;

    const lastMsg = thread.messages.length > 0
      ? thread.messages[thread.messages.length - 1]
      : null;

    let suggestedMessage: string;
    if (daysStale >= 5) {
      suggestedMessage = `Hi — just following up on the content we shared. We'd love your feedback so we can keep things moving. Let us know if you have any questions!`;
    } else if (daysStale >= 3) {
      suggestedMessage = `Quick reminder: we're waiting on your feedback for the latest draft. A quick "looks good" or any changes would help us stay on schedule.`;
    } else {
      suggestedMessage = `Hi — wanted to check if you've had a chance to review the latest content. Happy to make adjustments based on your feedback.`;
    }

    suggestions.push({
      threadId: thread.id,
      draftId: thread.draftId,
      clientId: thread.clientId,
      daysStale,
      suggestedMessage,
    });
  }

  return suggestions.sort((a, b) => b.daysStale - a.daysStale);
}

export function getStaleThreadsCount(): number {
  return loadThreads().filter(t => t.status === 'waiting_for_client' && getThreadStaleness(t) >= 2).length;
}
