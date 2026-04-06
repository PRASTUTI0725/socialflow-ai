import { generateId } from '@/lib/utils';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ContentDraft, ContentStatus, DesignStatus, PerformanceRating, createDraftsFromStrategy, PlatformType, MAX_REVISIONS } from '../lib/pipeline-types';
import {
  loadDrafts, saveDraftsBatch, updateDraftField as updateDraftInStore,
  updateDraftStatus as updateStatusInStore, deleteDraft as deleteDraftFromStore,
  getDraftsByClient, getDraftsByStrategy,
  bulkDeleteDrafts, bulkUpdateStatus, bulkScheduleDrafts,
} from '../lib/pipeline-store';
import { StrategyOutput } from '@/lib/content-generator';
import { ContentBrief, generateBriefsFromStrategy, saveBriefsBatch as saveBriefsToStore, getBriefsByStrategy } from '@/lib/content-brief';
import { ApprovalFlow, createApprovalFlow, saveFlow, getFlowByDraft, approveCurrentStep, requestChanges, addComment, addRevision, resolveComment } from '@/lib/approval-workflow';
import { onDraftStatusChanged, onDraftCreated, onDraftEdited, onDraftScheduled, onPipelineCreated, onDraftDeleted } from '@/services/automation';
import { getThreadByDraft, createThread, addMessage, resolveThread, getThreadsByClient, type ClientMessage, type MessageThread, type MessageSender } from '@/lib/client-messages';
import { loadClients } from '@/modules/clients/lib/client-store';

interface PipelineContextType {
  drafts: ContentDraft[];
  draftsByClient: (clientId: string) => ContentDraft[];
  draftsByStrategy: (strategyId: string) => ContentDraft[];
  createFromStrategy: (strategy: StrategyOutput, clientId: string) => ContentDraft[];
  createFromStrategyWithBriefs: (strategy: StrategyOutput, clientId: string) => ContentDraft[];
  createCustomDraft: (clientId: string, strategyId: string, idea: string, platform: PlatformType, caption: string, hook: string, hashtags: string[]) => ContentDraft;
  updateDraft: (id: string, updates: Partial<Pick<ContentDraft, 'title' | 'sourceIdea' | 'platformVariants' | 'scheduledDate' | 'deadline' | 'status' | 'designStatus' | 'designNotes' | 'performanceRating' | 'contentIntent' | 'createdBy' | 'internalNotes' | 'sourceType'>>) => void;
  changeStatus: (id: string, status: ContentStatus) => void;
  setDeadline: (id: string, deadline: string | null) => void;
  deleteDraft: (id: string) => void;
  bulkDelete: (ids: string[]) => void;
  bulkChangeStatus: (ids: string[], status: ContentStatus) => void;
  bulkSchedule: (ids: string[], date: string) => void;
  refreshDrafts: () => void;
  getApprovalFlow: (draftId: string) => ApprovalFlow | null;
  approveDraft: (draftId: string) => void;
  requestDraftChanges: (draftId: string, comment: string, authorName: string, authorRole: 'employee' | 'client') => void;
  addDraftComment: (draftId: string, stepIndex: number, text: string, authorName: string, authorRole: 'employee' | 'client') => void;
  resolveDraftComment: (draftId: string, stepIndex: number, commentId: string) => void;
  addDraftRevision: (draftId: string, changes: string, authorName: string) => void;
  getBriefsForStrategy: (strategyId: string) => ContentBrief[];
  getDraftThread: (draftId: string) => MessageThread | null;
  sendDraftMessage: (draftId: string, clientId: string, sender: MessageSender, senderName: string, message: string) => MessageThread | null;
  resolveDraftThread: (draftId: string) => void;
  getClientThreads: (clientId: string) => MessageThread[];
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);

  const refreshDrafts = useCallback(() => {
    setDrafts(loadDrafts());
  }, []);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  const createFromStrategy = useCallback((strategy: StrategyOutput, clientId: string): ContentDraft[] => {
    // Validate strategy exists for this client
    const client = loadClients().find(c => c.id === clientId);
    if (!client) {
      console.error(`[PIPELINE_CREATE] Client ${clientId} not found. Aborting.`);
      return [];
    }
    
    const clientHasStrategy = client.strategies?.some(s => s.id === strategy.id);
    if (!clientHasStrategy) {
      console.warn(`[PIPELINE_CREATE] Strategy ${strategy.id} not found in client ${clientId}. Creating anyway (orphaned strategy?).`);
      // Still allow creation - strategy might be in memory but not yet persisted
    }

    // Check if drafts already exist for this strategy+client to prevent duplicates
    const existingDrafts = getDraftsByStrategy(strategy.id);
    const hasExistingForClient = existingDrafts.some(d => d.clientId === clientId);
    
    if (hasExistingForClient) {
      console.log(`[PIPELINE_CREATE] Drafts already exist for strategy ${strategy.id} and client ${clientId}. Returning existing drafts.`);
      return existingDrafts.filter(d => d.clientId === clientId);
    }

    const newDrafts = createDraftsFromStrategy(strategy, clientId);
    saveDraftsBatch(newDrafts);
    newDrafts.forEach(d => onDraftCreated(d));
    refreshDrafts();
    
    console.log(`[PIPELINE_CREATE] Creating ${newDrafts.length} drafts for client ${clientId}, strategy ${strategy.id}`);
    return newDrafts;
  }, [refreshDrafts]);

  const createFromStrategyWithBriefs = useCallback((strategy: StrategyOutput, clientId: string): ContentDraft[] => {
    // Validate strategy exists for this client
    const client = loadClients().find(c => c.id === clientId);
    if (!client) {
      console.error(`[PIPELINE_CREATE] Client ${clientId} not found. Aborting.`);
      return [];
    }
    
    const clientHasStrategy = client.strategies?.some(s => s.id === strategy.id);
    if (!clientHasStrategy) {
      console.warn(`[PIPELINE_CREATE] Strategy ${strategy.id} not found in client ${clientId}. Creating anyway (orphaned strategy?).`);
    }

    // Check if drafts already exist for this strategy+client to prevent duplicates
    const existingDrafts = getDraftsByStrategy(strategy.id);
    const hasExistingForClient = existingDrafts.some(d => d.clientId === clientId);
    
    if (hasExistingForClient) {
      console.log(`[PIPELINE_CREATE] Drafts already exist for strategy ${strategy.id} and client ${clientId}. Returning existing drafts.`);
      return existingDrafts.filter(d => d.clientId === clientId);
    }

    const briefs = generateBriefsFromStrategy(strategy, clientId);
    saveBriefsToStore(briefs);

    const briefIds = briefs.map(b => b.id);
    const newDrafts = createDraftsFromStrategy(strategy, clientId, briefIds);
    saveDraftsBatch(newDrafts);
    newDrafts.forEach(d => onDraftCreated(d));
    refreshDrafts();

    onPipelineCreated(client, newDrafts.length);
    
    console.log(`[PIPELINE_CREATE] Creating ${newDrafts.length} drafts with briefs for client ${clientId}, strategy ${strategy.id}`);
    return newDrafts;
  }, [refreshDrafts]);

  const updateDraft = useCallback((
    id: string,
    updates: Partial<Pick<ContentDraft, 'title' | 'sourceIdea' | 'platformVariants' | 'scheduledDate' | 'deadline' | 'status' | 'designStatus' | 'designNotes' | 'performanceRating' | 'contentIntent' | 'createdBy' | 'internalNotes' | 'sourceType'>>
  ) => {
    updateDraftInStore(id, updates);
    const draft = loadDrafts().find(d => d.id === id);
    if (draft) {
      if (updates.scheduledDate) {
        onDraftScheduled(draft.clientId, draft.id, draft.title || draft.sourceIdea, updates.scheduledDate);
      } else {
        onDraftEdited(draft);
      }
    }
    refreshDrafts();
  }, [refreshDrafts]);

  const setDeadline = useCallback((id: string, deadline: string | null) => {
    updateDraftInStore(id, { deadline } as any);
    refreshDrafts();
  }, [refreshDrafts]);

  const changeStatus = useCallback((id: string, status: ContentStatus) => {
    const all = loadDrafts();
    const draft = all.find(d => d.id === id);
    if (!draft) return;
    
    const oldStatus = draft.status;
    updateStatusInStore(id, status);
    onDraftStatusChanged(draft.clientId, id, oldStatus, status, draft.title || draft.sourceIdea || 'Post');
    refreshDrafts();
  }, [refreshDrafts]);

  const deleteDraft = useCallback((id: string) => {
    const draft = loadDrafts().find(d => d.id === id);
    deleteDraftFromStore(id);
    if (draft) {
      onDraftDeleted(draft.clientId, draft.id, draft.title || draft.sourceIdea || 'Post');
    }
    refreshDrafts();
  }, [refreshDrafts]);

  const bulkDelete = useCallback((ids: string[]) => {
    const all = loadDrafts();
    const toDelete = all.filter(d => ids.includes(d.id));
    bulkDeleteDrafts(ids);
    toDelete.forEach(d => onDraftDeleted(d.clientId, d.id, d.title || d.sourceIdea || 'Post'));
    refreshDrafts();
  }, [refreshDrafts]);

  const bulkChangeStatus = useCallback((ids: string[], status: ContentStatus) => {
    const all = loadDrafts();
    const toUpdate = all.filter(d => ids.includes(d.id));
    bulkUpdateStatus(ids, status);
    toUpdate.forEach(d => {
      onDraftStatusChanged(d.clientId, d.id, d.status, status, d.title || d.sourceIdea || 'Post');
    });
    refreshDrafts();
  }, [refreshDrafts]);

  const bulkSchedule = useCallback((ids: string[], date: string) => {
    const all = loadDrafts();
    const toUpdate = all.filter(d => ids.includes(d.id));
    bulkScheduleDrafts(ids, date);
    toUpdate.forEach(d => {
      onDraftScheduled(d.clientId, d.id, d.title || d.sourceIdea || 'Post', date);
      onDraftStatusChanged(d.clientId, d.id, d.status, 'scheduled', d.title || d.sourceIdea || 'Post');
    });
    refreshDrafts();
  }, [refreshDrafts]);

  const createCustomDraft = useCallback((
    clientId: string,
    strategyId: string,
    idea: string,
    platform: PlatformType,
    caption: string,
    hook: string,
    hashtags: string[]
  ): ContentDraft => {
    const now = new Date().toISOString();
    const draft: ContentDraft = {
      id: generateId(),
      clientId,
      strategyId,
      briefId: null,
      approvalFlowId: null,
      title: idea ? (idea.substring(0, 40) + (idea.length > 40 ? '...' : '')) : 'New Post',
      sourceIdea: idea,
      source: 'manual',
      status: 'draft',
      platformVariants: [{ platform, caption, hook, hashtags }],
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
      createdBy: 'User',
      internalNotes: '',
      sourceType: 'manual',
      createdAt: now,
      updatedAt: now,
    };

    
    saveDraftsBatch([draft]);
    console.log(`[PIPELINE_CONTEXT] DRAFT SAVED: "${draft.title}" for CLIENT: ${clientId}`);
    
    // Verify it exists in store immediately
    const verify = loadDrafts().find(d => d.id === draft.id);
    if (!verify) console.error('[PIPELINE_CONTEXT] FATAL ERROR: Draft not found in store immediately after save!');
    else console.log('[PIPELINE_CONTEXT] Persistence Verification: SUCCESS');

    onDraftCreated(draft);
    refreshDrafts();
    return draft;
  }, [refreshDrafts]);

  const draftsByClient = useCallback((clientId: string) => {
    return drafts.filter(d => d.clientId === clientId);
  }, [drafts]);

  const draftsByStrategy = useCallback((strategyId: string) => {
    return drafts.filter(d => d.strategyId === strategyId);
  }, [drafts]);

  const getApprovalFlow = useCallback((draftId: string): ApprovalFlow | null => {
    return getFlowByDraft(draftId);
  }, []);

  const approveDraft = useCallback((draftId: string) => {
    let flow = getFlowByDraft(draftId);
    if (!flow) {
      const draft = loadDrafts().find(d => d.id === draftId);
      if (!draft) return;
      flow = createApprovalFlow(draftId, draft.clientId);
    }

    const updated = approveCurrentStep(flow);
    saveFlow(updated);

    if (updated.overallStatus === 'approved') {
      updateStatusInStore(draftId, 'approved');
      onDraftStatusChanged(updated.clientId, draftId, 'client_review', 'approved', 'Post');
    }

    refreshDrafts();
  }, [refreshDrafts]);

  const requestDraftChanges = useCallback((draftId: string, comment: string, authorName: string, authorRole: 'employee' | 'client') => {
    let flow = getFlowByDraft(draftId);
    if (!flow) {
      const draft = loadDrafts().find(d => d.id === draftId);
      if (!draft) return;
      flow = createApprovalFlow(draftId, draft.clientId);
    }

    const updated = requestChanges(flow, comment, authorName, authorRole);
    saveFlow(updated);

    onDraftStatusChanged(updated.clientId, draftId, 'client_review', 'draft', 'Post');
    
    const draft = loadDrafts().find(d => d.id === draftId);
    if (draft) {
      updateDraftInStore(draftId, { revisionCount: (draft.revisionCount || 0) + 1 });
    }

    refreshDrafts();
  }, [refreshDrafts]);

  const addDraftComment = useCallback((draftId: string, stepIndex: number, text: string, authorName: string, authorRole: 'employee' | 'client') => {
    const flow = getFlowByDraft(draftId);
    if (!flow) return;

    const updated = addComment(flow, stepIndex, text, authorName, authorRole);
    saveFlow(updated);
  }, []);

  const resolveDraftComment = useCallback((draftId: string, stepIndex: number, commentId: string) => {
    const flow = getFlowByDraft(draftId);
    if (!flow) return;

    const updated = resolveComment(flow, stepIndex, commentId);
    saveFlow(updated);
  }, []);

  const addDraftRevision = useCallback((draftId: string, changes: string, authorName: string) => {
    let flow = getFlowByDraft(draftId);
    if (!flow) {
      const draft = loadDrafts().find(d => d.id === draftId);
      if (!draft) return;
      flow = createApprovalFlow(draftId, draft.clientId);
    }

    const updated = addRevision(flow, changes, authorName);
    saveFlow(updated);

    const draft = loadDrafts().find(d => d.id === draftId);
    if (draft) {
      const newRevisionCount = (draft.revisionCount || 0) + 1;
      
      // Check if we've hit the revision limit
      if (newRevisionCount >= MAX_REVISIONS) {
        // Set to rejected to flag that it needs attention
        updateStatusInStore(draftId, 'rejected');
        onDraftStatusChanged(draft.clientId, draftId, draft.status, 'rejected', draft.title || draft.id);
      } else {
        // Otherwise send back for client review
        updateStatusInStore(draftId, 'client_review');
        onDraftStatusChanged(draft.clientId, draftId, draft.status, 'client_review', draft.title || draft.id);
      }
      
      updateDraftInStore(draftId, { revisionCount: newRevisionCount });
    }

    refreshDrafts();
  }, [refreshDrafts]);

  const getBriefsForStrategy = useCallback((strategyId: string): ContentBrief[] => {
    return getBriefsByStrategy(strategyId);
  }, []);

  const getDraftThread = useCallback((draftId: string): MessageThread | null => {
    return getThreadByDraft(draftId);
  }, []);

  const sendDraftMessage = useCallback((draftId: string, clientId: string, sender: MessageSender, senderName: string, message: string): MessageThread | null => {
    let thread = getThreadByDraft(draftId);
    if (!thread) {
      thread = createThread(draftId, clientId);
    }
    return addMessage(thread.id, sender, senderName, message);
  }, []);

  const resolveDraftThread = useCallback((draftId: string) => {
    const thread = getThreadByDraft(draftId);
    if (thread) {
      resolveThread(thread.id);
    }
  }, []);

  const getClientThreads = useCallback((clientId: string): MessageThread[] => {
    return getThreadsByClient(clientId);
  }, []);

  return (
    <PipelineContext.Provider value={{
      drafts,
      draftsByClient,
      draftsByStrategy,
      createFromStrategy,
      createFromStrategyWithBriefs,
      createCustomDraft,
      updateDraft,
      changeStatus,
      setDeadline,
      deleteDraft,
      bulkDelete,
      bulkChangeStatus,
      bulkSchedule,
      refreshDrafts,
      getApprovalFlow,
      approveDraft,
      requestDraftChanges,
      addDraftComment,
      resolveDraftComment,
      addDraftRevision,
      getBriefsForStrategy,
      getDraftThread,
      sendDraftMessage,
      resolveDraftThread,
      getClientThreads,
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}
