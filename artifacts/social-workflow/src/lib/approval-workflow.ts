import { generateId } from '@/lib/utils';
export type ApprovalStepType = 'internal_review' | 'client_review';
export type ApprovalStatus = 'pending' | 'approved' | 'changes_requested' | 'skipped';

export interface ApprovalComment {
  id: string;
  authorName: string;
  authorRole: 'employee' | 'client';
  text: string;
  timestamp: string;
  resolved: boolean;
}

export interface RevisionVersion {
  version: number;
  changes: string;
  timestamp: string;
  authorName: string;
}

export interface ApprovalStep {
  type: ApprovalStepType;
  status: ApprovalStatus;
  assignedTo: string;
  comments: ApprovalComment[];
  completedAt: string | null;
}

export interface ApprovalFlow {
  id: string;
  draftId: string;
  clientId: string;
  steps: ApprovalStep[];
  currentStepIndex: number;
  overallStatus: 'pending' | 'in_progress' | 'approved' | 'changes_requested';
  revisionHistory: RevisionVersion[];
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export function createApprovalFlow(
  draftId: string,
  clientId: string,
  assignedTo: string = 'Team Lead'
): ApprovalFlow {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    draftId,
    clientId,
    steps: [
      {
        type: 'internal_review',
        status: 'pending',
        assignedTo,
        comments: [],
        completedAt: null,
      },
      {
        type: 'client_review',
        status: 'pending',
        assignedTo: 'Client',
        comments: [],
        completedAt: null,
      },
    ],
    currentStepIndex: 0,
    overallStatus: 'pending',
    revisionHistory: [],
    deadline: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function getCurrentStep(flow: ApprovalFlow): ApprovalStep | null {
  return flow.steps[flow.currentStepIndex] ?? null;
}

export function approveCurrentStep(flow: ApprovalFlow): ApprovalFlow {
  const updated = { ...flow, steps: flow.steps.map(s => ({ ...s })) };
  const currentStep = updated.steps[updated.currentStepIndex];
  if (!currentStep) return flow;

  currentStep.status = 'approved';
  currentStep.completedAt = new Date().toISOString();

  if (updated.currentStepIndex < updated.steps.length - 1) {
    updated.currentStepIndex += 1;
    updated.overallStatus = 'in_progress';
  } else {
    updated.overallStatus = 'approved';
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function requestChanges(
  flow: ApprovalFlow,
  comment: string,
  authorName: string,
  authorRole: 'employee' | 'client'
): ApprovalFlow {
  const updated = { ...flow, steps: flow.steps.map(s => ({ ...s, comments: [...s.comments] })) };
  const currentStep = updated.steps[updated.currentStepIndex];
  if (!currentStep) return flow;

  currentStep.status = 'changes_requested';
  currentStep.completedAt = new Date().toISOString();
  currentStep.comments.push({
    id: generateId(),
    authorName,
    authorRole,
    text: comment,
    timestamp: new Date().toISOString(),
    resolved: false,
  });

  updated.overallStatus = 'changes_requested';
  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function addComment(
  flow: ApprovalFlow,
  stepIndex: number,
  text: string,
  authorName: string,
  authorRole: 'employee' | 'client'
): ApprovalFlow {
  const updated = { ...flow, steps: flow.steps.map(s => ({ ...s, comments: [...s.comments] })) };
  const step = updated.steps[stepIndex];
  if (!step) return flow;

  step.comments.push({
    id: generateId(),
    authorName,
    authorRole,
    text,
    timestamp: new Date().toISOString(),
    resolved: false,
  });

  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function resolveComment(
  flow: ApprovalFlow,
  stepIndex: number,
  commentId: string
): ApprovalFlow {
  const updated = { ...flow, steps: flow.steps.map(s => ({ ...s, comments: [...s.comments] })) };
  const step = updated.steps[stepIndex];
  if (!step) return flow;

  const comment = step.comments.find(c => c.id === commentId);
  if (comment) {
    comment.resolved = true;
  }

  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function addRevision(
  flow: ApprovalFlow,
  changes: string,
  authorName: string
): ApprovalFlow {
  const updated = { ...flow, revisionHistory: [...flow.revisionHistory] };
  updated.revisionHistory.push({
    version: updated.revisionHistory.length + 1,
    changes,
    timestamp: new Date().toISOString(),
    authorName,
  });

  // Reset flow to start from internal review
  updated.steps = updated.steps.map(s => ({
    ...s,
    status: 'pending' as ApprovalStatus,
    completedAt: null,
  }));
  updated.currentStepIndex = 0;
  updated.overallStatus = 'in_progress';
  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function resetApprovalFlow(flow: ApprovalFlow): ApprovalFlow {
  const updated = { ...flow, steps: flow.steps.map(s => ({ ...s, comments: [...s.comments] })) };
  updated.steps = updated.steps.map(s => ({
    ...s,
    status: 'pending' as ApprovalStatus,
    completedAt: null,
  }));
  updated.currentStepIndex = 0;
  updated.overallStatus = 'pending';
  updated.updatedAt = new Date().toISOString();
  return updated;
}

export function getUnresolvedCommentCount(flow: ApprovalFlow): number {
  return flow.steps.reduce(
    (count, step) => count + step.comments.filter(c => !c.resolved).length,
    0
  );
}

export function getFlowProgress(flow: ApprovalFlow): number {
  const completed = flow.steps.filter(s => s.status === 'approved' || s.status === 'skipped').length;
  return Math.round((completed / flow.steps.length) * 100);
}

const FLOWS_STORAGE_KEY = 'socialidiots_approval_flows';

export function loadAllFlows(): ApprovalFlow[] {
  try {
    const raw = localStorage.getItem(FLOWS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ApprovalFlow[];
  } catch {
    return [];
  }
}

function saveAllFlows(flows: ApprovalFlow[]): void {
  try {
    localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(flows));
  } catch {
    // Storage full — ignore
  }
}

export function getFlowByDraft(draftId: string): ApprovalFlow | null {
  return loadAllFlows().find(f => f.draftId === draftId) ?? null;
}

export function getFlowsByClient(clientId: string): ApprovalFlow[] {
  return loadAllFlows().filter(f => f.clientId === clientId);
}

export function saveFlow(flow: ApprovalFlow): void {
  const flows = loadAllFlows();
  const idx = flows.findIndex(f => f.id === flow.id);
  if (idx >= 0) {
    flows[idx] = flow;
  } else {
    flows.push(flow);
  }
  saveAllFlows(flows);
}

export function deleteFlow(id: string): void {
  saveAllFlows(loadAllFlows().filter(f => f.id !== id));
}

export function deleteFlowsByDraft(draftId: string): void {
  saveAllFlows(loadAllFlows().filter(f => f.draftId !== draftId));
}
