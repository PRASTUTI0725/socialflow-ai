import { BrandProfile } from './brand-memory';
import { StrategyOutput } from './content-generator';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface OnboardingChecklist {
  brandName: boolean;
  usp: boolean;
  platforms: boolean;
  contentPreferences: boolean;
  goals: boolean;
  messaging: boolean;
  targetAudience: boolean;
  challenges: boolean;
  geography: boolean;
  brandVoice: boolean;
}

export interface OnboardingData {
  status: OnboardingStatus;
  checklist: OnboardingChecklist;
  completedAt: string | null;
  notes: string;
}

export interface ContentPreferences {
  preferredHookStyles: string[];
  avoidedWords: string[];
  preferredTones: string[];
  highPerformingThemes: string[];
  ctaPatterns: string[];
  bestPlatforms: string[];
  bestPostingTimes: string[];
}

export interface PerformanceMetric {
  draftId: string;
  platform: string;
  theme: string;
  hookType: string;
  rating: 'high' | 'low';
  postedAt: string;
}

export interface PerformanceData {
  metrics: PerformanceMetric[];
  topThemes: string[];
  topHookTypes: string[];
  bestPlatform: string;
  approvalRate: number;
  contentVelocity: number;
  lastCalculated: string | null;
}

export interface ApprovalHistoryEntry {
  strategyId: string;
  action: 'approved' | 'rejected' | 'revision_requested';
  timestamp: string;
  notes: string;
}

export interface ApprovalsHistory {
  entries: ApprovalHistoryEntry[];
  totalApproved: number;
  totalRejected: number;
  totalRevisions: number;
}

export interface ClientMemory {
  onboardingData: OnboardingData;
  brandProfile: BrandProfile;
  strategy: StrategyOutput | null;
  contentPreferences: ContentPreferences;
  performanceData: PerformanceData;
  approvalsHistory: ApprovalsHistory;
  lastUpdated: string;
}

export function createDefaultOnboardingChecklist(): OnboardingChecklist {
  return {
    brandName: false,
    usp: false,
    platforms: false,
    contentPreferences: false,
    goals: false,
    messaging: false,
    targetAudience: false,
    challenges: false,
    geography: false,
    brandVoice: false,
  };
}

export function createDefaultOnboardingData(): OnboardingData {
  return {
    status: 'not_started',
    checklist: createDefaultOnboardingChecklist(),
    completedAt: null,
    notes: '',
  };
}

export function createDefaultContentPreferences(): ContentPreferences {
  return {
    preferredHookStyles: [],
    avoidedWords: [],
    preferredTones: [],
    highPerformingThemes: [],
    ctaPatterns: [],
    bestPlatforms: [],
    bestPostingTimes: [],
  };
}

export function createDefaultPerformanceData(): PerformanceData {
  return {
    metrics: [],
    topThemes: [],
    topHookTypes: [],
    bestPlatform: '',
    approvalRate: 0,
    contentVelocity: 0,
    lastCalculated: null,
  };
}

export function createDefaultApprovalsHistory(): ApprovalsHistory {
  return {
    entries: [],
    totalApproved: 0,
    totalRejected: 0,
    totalRevisions: 0,
  };
}

export function createDefaultClientMemory(brandProfile: BrandProfile): ClientMemory {
  return {
    onboardingData: createDefaultOnboardingData(),
    brandProfile,
    strategy: null,
    contentPreferences: createDefaultContentPreferences(),
    performanceData: createDefaultPerformanceData(),
    approvalsHistory: createDefaultApprovalsHistory(),
    lastUpdated: new Date().toISOString(),
  };
}

export function getOnboardingCompletion(checklist: OnboardingChecklist): number {
  const items = Object.values(checklist);
  const completed = items.filter(Boolean).length;
  return Math.round((completed / items.length) * 100);
}

export function isOnboardingComplete(checklist: OnboardingChecklist): boolean {
  return Object.values(checklist).every(Boolean);
}

export function updateOnboardingChecklist(
  checklist: OnboardingChecklist,
  item: keyof OnboardingChecklist,
  value: boolean
): OnboardingChecklist {
  return { ...checklist, [item]: value };
}

const STORAGE_KEY = 'socialidiots_client_memory';

export function loadAllClientMemories(): Record<string, ClientMemory> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ClientMemory>;
  } catch {
    return {};
  }
}

function saveAllClientMemories(memories: Record<string, ClientMemory>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch {
    // Storage full — ignore
  }
}

export function getClientMemory(clientId: string): ClientMemory | null {
  const all = loadAllClientMemories();
  return all[clientId] ?? null;
}

export function saveClientMemory(clientId: string, memory: ClientMemory): void {
  const all = loadAllClientMemories();
  all[clientId] = { ...memory, lastUpdated: new Date().toISOString() };
  saveAllClientMemories(all);
}

export function deleteClientMemory(clientId: string): void {
  const all = loadAllClientMemories();
  delete all[clientId];
  saveAllClientMemories(all);
}

export function updateMemoryOnboarding(
  clientId: string,
  updates: Partial<OnboardingData>
): ClientMemory | null {
  const memory = getClientMemory(clientId);
  if (!memory) return null;

  const updated: ClientMemory = {
    ...memory,
    onboardingData: { ...memory.onboardingData, ...updates },
    lastUpdated: new Date().toISOString(),
  };

  if (updates.checklist && isOnboardingComplete(updates.checklist)) {
    updated.onboardingData.status = 'completed';
    updated.onboardingData.completedAt = new Date().toISOString();
  } else if (updates.checklist) {
    updated.onboardingData.status = 'in_progress';
  }

  saveClientMemory(clientId, updated);
  return updated;
}

export function updateMemoryStrategy(
  clientId: string,
  strategy: StrategyOutput
): ClientMemory | null {
  const memory = getClientMemory(clientId);
  if (!memory) return null;

  const updated: ClientMemory = {
    ...memory,
    strategy,
    lastUpdated: new Date().toISOString(),
  };

  saveClientMemory(clientId, updated);
  return updated;
}

export function updateMemoryPreferences(
  clientId: string,
  preferences: Partial<ContentPreferences>
): ClientMemory | null {
  const memory = getClientMemory(clientId);
  if (!memory) return null;

  const updated: ClientMemory = {
    ...memory,
    contentPreferences: { ...memory.contentPreferences, ...preferences },
    lastUpdated: new Date().toISOString(),
  };

  saveClientMemory(clientId, updated);
  return updated;
}

export function addPerformanceMetric(
  clientId: string,
  metric: PerformanceMetric
): ClientMemory | null {
  const memory = getClientMemory(clientId);
  if (!memory) return null;

  const metrics = [...memory.performanceData.metrics, metric];
  const updated: ClientMemory = {
    ...memory,
    performanceData: { ...memory.performanceData, metrics },
    lastUpdated: new Date().toISOString(),
  };

  saveClientMemory(clientId, updated);
  return updated;
}

export function addApprovalHistoryEntry(
  clientId: string,
  entry: ApprovalHistoryEntry
): ClientMemory | null {
  const memory = getClientMemory(clientId);
  if (!memory) return null;

  const entries = [...memory.approvalsHistory.entries, entry];
  const updated: ClientMemory = {
    ...memory,
    approvalsHistory: {
      entries,
      totalApproved: entries.filter(e => e.action === 'approved').length,
      totalRejected: entries.filter(e => e.action === 'rejected').length,
      totalRevisions: entries.filter(e => e.action === 'revision_requested').length,
    },
    lastUpdated: new Date().toISOString(),
  };

  saveClientMemory(clientId, updated);
  return updated;
}

export function getMemorySummary(memory: ClientMemory): {
  onboardingPct: number;
  hasStrategy: boolean;
  contentCount: number;
  approvalRate: number;
  brainStrength: number;
} {
  const onboardingPct = getOnboardingCompletion(memory.onboardingData.checklist);
  const hasStrategy = memory.strategy !== null;
  const totalActions = memory.approvalsHistory.totalApproved + memory.approvalsHistory.totalRejected;
  const approvalRate = totalActions > 0
    ? Math.round((memory.approvalsHistory.totalApproved / totalActions) * 100)
    : 0;

  const prefScore = [
    memory.contentPreferences.preferredHookStyles.length > 0 ? 1 : 0,
    memory.contentPreferences.preferredTones.length > 0 ? 1 : 0,
    memory.contentPreferences.highPerformingThemes.length > 0 ? 1 : 0,
    memory.performanceData.metrics.length > 0 ? 1 : 0,
    memory.approvalsHistory.entries.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const brainStrength = Math.round((prefScore / 5) * 100);

  return {
    onboardingPct,
    hasStrategy,
    contentCount: memory.performanceData.metrics.length,
    approvalRate,
    brainStrength,
  };
}
