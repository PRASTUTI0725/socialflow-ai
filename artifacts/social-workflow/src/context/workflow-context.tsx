import { generateId } from '@/lib/utils';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { StrategyInput, StrategyOutput, generateContent, generateSectionContent } from '../lib/content-generator';
import { BrandProfile, loadProfiles, getActiveProfileId } from '../lib/brand-memory';
import { generateWithAI, generateSectionWithAI, getStoredApiKey, getGenerationMode, SectionName, SECTION_NAMES, SECTION_DISPLAY_NAMES, checkSectionQuality } from '../lib/ai-client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useClients } from '@/modules/clients/context/client-context';
import { ImprovementReason } from '@/modules/clients/lib/client-types';
import { learnFromEdits, learnFromApproval, learnFromRejection, generateImprovementReasons } from '@/modules/clients/lib/brand-intelligence';
import { onStrategyGenerated, onStrategyApproved, onStrategyRejected, onStrategyRefined } from '@/services/automation';
import { addApprovalHistoryEntry } from '@/lib/client-memory';
import { createJob, updateJobStatus, loadJobs, cleanupOldJobs, hasPendingJobForClient, canCreateJobForClient, recordJobCreation } from '@/lib/generation-jobs';
import { loadClients } from '@/modules/clients/lib/client-store';

type ViewState = 'dashboard' | 'create' | 'analyzer' | 'output' | 'brand-profile' | 'clients' | 'pipeline' | 'onboarding' | 'client-portal' | 'client-report';
type ViewMode = 'employee' | 'client';
export type GenerationPhase = 'idle' | 'generating' | 'retrying' | 'partial' | 'complete' | 'error';
export type Confidence = 'strong' | 'good' | 'review' | 'template';

type SourceLevel = 'fresh' | 'retried' | 'template';

function computeConfidence(source: SourceLevel, qualityIssues: string[]): Confidence {
  if (source === 'template') return 'template';
  if (source === 'retried' && qualityIssues.length === 0) return 'good';
  if (source === 'retried' && qualityIssues.length > 0) return 'review';
  if (source === 'fresh' && qualityIssues.length === 0) return 'strong';
  return 'good';
}

const HISTORY_STORAGE_KEY = 'socialflow_strategies';
const MAX_HISTORY = 20;

function loadHistory(): StrategyOutput[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StrategyOutput[];
    return parsed.map(s => ({ ...s, createdAt: new Date(s.createdAt) }));
  } catch {
    return [];
  }
}

function saveHistory(history: StrategyOutput[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Storage full — ignore
  }
}

// --- Section merge ---

function mergeSection(
  existing: StrategyOutput,
  partial: Partial<StrategyOutput>,
  section: SectionName
): StrategyOutput {
  const merged = { ...existing };
  switch (section) {
    case 'ideas':
      if (partial.ideas) merged.ideas = partial.ideas;
      break;
    case 'hooks':
      if (partial.hooks) {
        merged.hooks = partial.hooks;
        merged.brandAwareHooks = partial.hooks;
      }
      break;
    case 'captions':
      if (partial.captions) {
        merged.captions = partial.captions;
        merged.brandAwareCaptions = partial.captions;
      }
      break;
    case 'reels':
      if (partial.reels) merged.reels = partial.reels;
      break;
    case 'calendar':
      if (partial.calendar) merged.calendar = partial.calendar.map(item => ({ ...item }));
      break;
  }
  return merged;
}

// --- Failed section detection ---

function detectFailedSections(errorMessage: string): SectionName[] {
  const msg = errorMessage.toLowerCase();
  const sections: SectionName[] = [];

  // Specific section mentions — check these first
  if (/\bideas?\b/.test(msg)) sections.push('ideas');
  if (/\bhooks?\b/.test(msg)) sections.push('hooks');
  if (/\bcaptions?\b/.test(msg)) sections.push('captions');
  if (/\bcalendar\b/.test(msg)) sections.push('calendar');
  if (/\breels?\b/.test(msg) || /\bvideo\b/.test(msg)) sections.push('reels');

  // Only fall back to "all sections" for complete parse failures
  if (sections.length === 0 && (msg.includes('malformed json') || msg.includes('empty_response'))) {
    return [...SECTION_NAMES];
  }

  return sections;
}

// --- Refine helpers ---

function adjustHooksForStyle(hooks: string[], style: string): string[] {
  switch (style) {
    case 'short':
      return hooks.map(h => h.length > 80 ? h.slice(0, 77) + '...' : h);
    case 'curiosity':
      return hooks.map(h => {
        if (/^here.s|^why|^how|^what|^the (one|real|secret)/i.test(h)) return h;
        return `Here's why ${h.charAt(0).toLowerCase() + h.slice(1)}`;
      });
    case 'storytelling':
      return hooks.map(h => {
        if (/\b(journey|started|began|once|grew|learned)\b/i.test(h)) return h;
        return `The story behind ${h.charAt(0).toLowerCase() + h.slice(1)}`;
      });
    default:
      return hooks;
  }
}

function filterByAvoidedWords(texts: string[], avoidedWords: string[]): string[] {
  if (avoidedWords.length === 0) return texts;
  const lowerAvoided = avoidedWords.map(w => w.toLowerCase());
  return texts.filter(text => {
    const lower = text.toLowerCase();
    return !lowerAvoided.some(w => lower.includes(w));
  });
}

// --- Context interface ---

interface WorkflowContextType {
  view: ViewState;
  setView: (view: ViewState) => void;
  setClientFormDirty: (dirty: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  strategy: StrategyOutput | null;
  isGenerating: boolean;
  generationPhase: GenerationPhase;
  retryingSection: string | null;
  generationStep: string;
  history: StrategyOutput[];
  generationError: string | null;
  failedStrategyInput: StrategyInput | null;
  failedSections: Set<string>;
  sectionRetryCounts: Record<string, number>;
  sectionConfidence: Record<string, Confidence>;
  sectionQualityReasons: Record<string, string[]>;
  generateStrategy: (input: StrategyInput) => void;
  updateStrategy: (newStrategy: StrategyOutput, clearedSection?: string) => void;
  viewStrategy: (strategy: StrategyOutput) => void;
  clearStrategy: () => void;
  retryFailedSection: (section: string) => void;
  activeProfile: BrandProfile | null;
  setActiveProfile: (profile: BrandProfile | null) => void;
  profiles: BrandProfile[];
  refreshProfiles: () => void;
  previousStrategy: StrategyOutput | null;
  refinementReasons: ImprovementReason[];
  refineWithBrain: () => void;
  approveStrategy: () => void;
  rejectStrategy: () => void;
  approveSelected: (items: string[], section: SectionName) => void;
  rejectSelected: (items: string[], section: SectionName) => void;
  isRefining: boolean;
  onboardingEditingSection: string | null;
  setOnboardingEditingSection: (section: string | null) => void;
  activeJobId: string | null; // Exposed for UI button disabling during pending jobs
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { activeClient, activeClientBrandProfile, updateClient } = useClients();
  const clientFormDirtyRef = useRef(false);
  const setClientFormDirty = useCallback((dirty: boolean) => {
    clientFormDirtyRef.current = dirty;
  }, []);
  const [view, setViewState] = useState<ViewState>('dashboard');
  const setView = useCallback((next: ViewState) => {
    if (clientFormDirtyRef.current && !window.confirm('You have unsaved changes. Leave without saving?')) {
      return;
    }
    setViewState(next);
  }, []);
  const [viewMode, setViewMode] = useState<ViewMode>('employee');
  const [strategy, setStrategy] = useState<StrategyOutput | null>(null);
  const [history, setHistory] = useState<StrategyOutput[]>(() => loadHistory());
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle');
  const [generationStep, setGenerationStep] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [failedStrategyInput, setFailedStrategyInput] = useState<StrategyInput | null>(null);
  const [failedSections, setFailedSections] = useState<Set<string>>(new Set());
  const [sectionRetryCounts, setSectionRetryCounts] = useState<Record<string, number>>({});
  const [sectionConfidence, setSectionConfidence] = useState<Record<string, Confidence>>({});
  const [sectionQualityReasons, setSectionQualityReasons] = useState<Record<string, string[]>>({});
  const [retryingSection, setRetryingSection] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [previousStrategy, setPreviousStrategy] = useState<StrategyOutput | null>(null);
  const [refinementReasons, setRefinementReasons] = useState<ImprovementReason[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [onboardingEditingSection, setOnboardingEditingSection] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const previousClientIdRef = useRef<string | null>(null);

  // Bridge: activeClientBrandProfile (from Client module) overrides activeProfile
  // This preserves backward compatibility — existing code using activeProfile continues to work
  const [manualActiveProfile, setManualActiveProfile] = useState<BrandProfile | null>(null);

  // activeProfile is derived: prefer client's brand profile, fall back to manual selection
  const activeProfile: BrandProfile | null = activeClientBrandProfile || manualActiveProfile;

  const setActiveProfile = (profile: BrandProfile | null) => {
    setManualActiveProfile(profile);
  };
  const generationAbortRef = useRef<AbortController | null>(null);
  const retryAbortRef = useRef<Record<string, AbortController>>({});
  const { toast, dismiss: dismissToast } = useToast();
  const clearActiveJob = useCallback(() => {
    setActiveJobId(null);
  }, []);

  // Clear toasts when activeClient changes to prevent stale UI state
  useEffect(() => {
    dismissToast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClient?.id]);

  // Log stale jobs on client switch
  useEffect(() => {
    if (previousClientIdRef.current && previousClientIdRef.current !== activeClient?.id) {
      const jobs = loadJobs();
      const staleJobs = jobs.filter(j => j.clientId === previousClientIdRef.current && j.status === 'pending');
      staleJobs.forEach(j => {
        console.log(`[CLIENT_SWITCH] Marking job ${j.jobId} as stale (was for client ${j.clientId}, now viewing ${activeClient?.id})`);
      });
    }
    previousClientIdRef.current = activeClient?.id ?? null;
  }, [activeClient?.id]);

  // Cleanup old jobs on mount
  useEffect(() => {
    cleanupOldJobs();
  }, []);

  const isGenerating = generationPhase === 'generating' || generationPhase === 'retrying';

  const evaluateSections = (s: StrategyOutput, sources: Record<SectionName, SourceLevel>) => {
    const conf: Record<string, Confidence> = {};
    const reasons: Record<string, string[]> = {};
    const sections: SectionName[] = ['ideas', 'hooks', 'captions', 'reels', 'calendar'];
    for (const sec of sections) {
      const data = sec === 'calendar' ? s.calendar : sec === 'ideas' ? s.ideas : sec === 'hooks' ? s.hooks : sec === 'captions' ? s.captions : s.reels;
      const issues = checkSectionQuality(sec, data);
      conf[sec] = computeConfidence(sources[sec], issues);
      reasons[sec] = issues;
    }
    setSectionConfidence(conf);
    setSectionQualityReasons(reasons);
  };

  const refreshProfiles = () => {
    const all = loadProfiles();
    setProfiles(all);
    // Only set manual active profile if no client is active
    // (activeClientBrandProfile takes priority via the bridge)
    if (!activeClient) {
      const activeId = getActiveProfileId();
      const active = all.find(p => p.id === activeId) ?? null;
      setManualActiveProfile(active);
    }
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const addToHistory = (s: StrategyOutput, targetClientId?: string | null) => {
    setHistory(prev => {
      const next = [s, ...prev.filter(x => x.id !== s.id)].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });

    // Use captured clientId, NOT activeClient
    const clientIdToUse = targetClientId ?? activeClient?.id;
    if (clientIdToUse) {
      const allClients = loadClients();
      const client = allClients.find(c => c.id === clientIdToUse);
      if (client) {
        const updatedClient = {
          ...client,
          strategies: [s, ...(client.strategies || []).filter(x => x.id !== s.id)]
        };
        updateClient(updatedClient);
      }
    }
  };

  // --- Full strategy generation ---

  const generateFullStrategy = async (input: StrategyInput) => {
    // CRITICAL: Capture clientId NOW, before any async operations
    const capturedClientId = activeClient?.id ?? null;
    
    // SAFETY DEDUP CHECK: Prevent rapid duplicate clicks within time window
    const dedupCheck = canCreateJobForClient(capturedClientId);
    if (!dedupCheck.allowed) {
      console.log(`[GEN_BLOCKED] Rapid click prevented for client ${capturedClientId || 'none'}: ${dedupCheck.reason}`);
      toast({
        title: 'Please wait',
        description: dedupCheck.reason || 'A generation is already in progress.',
        variant: 'destructive',
      });
      return;
    }
    
    // HARD LOCK: Check if a pending job already exists for this client
    if (hasPendingJobForClient(capturedClientId)) {
      console.log(`[GEN_BLOCKED] Duplicate generation prevented for client ${capturedClientId || 'none'}`);
      toast({
        title: 'Generation in progress',
        description: 'A strategy is already being generated for this client. Please wait.',
        variant: 'destructive',
      });
      return;
    }
    
    // Record this job creation timestamp
    recordJobCreation(capturedClientId);
    
    // Create job record
    const job = createJob(capturedClientId, input);
    setActiveJobId(job.jobId);
    updateJobStatus(job.jobId, 'pending');
    
    console.log(`[GEN_START] Job ${job.jobId} for client ${capturedClientId || 'none'}`);
    
    // Abort any in-flight generation AND all retries
    if (generationAbortRef.current) {
      generationAbortRef.current.abort();
    }
    Object.values(retryAbortRef.current).forEach(ac => ac.abort());
    retryAbortRef.current = {};
    const abortController = new AbortController();
    generationAbortRef.current = abortController;

    setGenerationPhase('generating');
    setGenerationError(null);
    setFailedStrategyInput(null);
    setFailedSections(new Set());
    setSectionRetryCounts({});
    setSectionConfidence({});
    setSectionQualityReasons({});
    setPreviousStrategy(null);
    setRefinementReasons([]);
    setGenerationStep('Analyzing brand voice…');

    const mode = getGenerationMode();

    if (mode === 'prototype') {
      await delay(700);
      setGenerationStep('Understanding audience psychology…');
      await delay(700);
      setGenerationStep('Generating platform-specific strategy…');
      await delay(700);
      setGenerationStep('Finalizing your 30-day calendar…');
      await delay(400);

      const newStrategy = generateContent(input, activeProfile);
      // CRITICAL: Bind strategy directly to captured clientId - NO inference
      newStrategy.clientId = capturedClientId;
      
      // CRITICAL: Only update UI state if this job's client is still active
      const isCurrentClient = activeClient?.id === capturedClientId;
      
      if (isCurrentClient) {
        setStrategy(newStrategy);
      }
      
      addToHistory(newStrategy, capturedClientId);
      setGenerationPhase('complete');
      setGenerationStep('');
      evaluateSections(newStrategy, { ideas: 'template', hooks: 'template', captions: 'template', reels: 'template', calendar: 'template' });

      // Update job status
      updateJobStatus(job.jobId, 'completed', {
        strategyId: newStrategy.id,
        completedAt: new Date().toISOString(),
      });

      if (capturedClientId) {
        const client = loadClients().find(c => c.id === capturedClientId);
        if (client) onStrategyGenerated(client, 'template');
      }

      // Only show toast if this job's client is still active (reusing isCurrentClient from above)
      if (isCurrentClient) {
        toast({
          title: 'Prototype ready',
          description: 'Demo mode — no API costs. Review and customize before sharing.',
          action: <ToastAction altText="View strategy output" onClick={() => setView('output')}>View Strategy Output</ToastAction>,
        });
      } else {
        console.log(`[GEN_COMPLETE] Job ${job.jobId} completed for client ${capturedClientId}, but active client is ${activeClient?.id}. UI suppressed.`);
      }
      clearActiveJob();
      return;
    }

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setGenerationPhase('idle');
      setGenerationStep('');
      clearActiveJob();
      toast({
        title: 'API Key Required',
        description: 'You must provide a Gemini API key to generate a strategy.',
        variant: 'destructive',
      });
      throw new Error("Missing API Key in AI Mode");
    }

    try {
      setGenerationStep('Analyzing brand voice…');
      await delay(600);
      setGenerationStep('Understanding audience psychology…');
      await delay(600);
      setGenerationStep('Generating platform-specific strategy…');

      const aiResult = await generateWithAI(input, activeProfile, apiKey, setGenerationStep, abortController.signal);

      setGenerationStep('Finalizing your 30-day calendar…');
      await delay(400);

      const newStrategy: StrategyOutput = {
        id: generateId(),
        settings: input,
        createdAt: new Date(),
        ideas: aiResult.ideas,
        hooks: aiResult.hooks,
        captions: aiResult.captions,
        brandAwareCaptions: aiResult.captions,
        brandAwareHooks: aiResult.hooks,
        reels: aiResult.reels,
        hashtags: aiResult.hashtags,
        calendar: aiResult.calendar,
        executionGuide: [],
        clientId: capturedClientId, // CRITICAL: Direct client binding - NO inference
        brandProfileUsed: activeProfile?.id ?? null,
        hiddenAnalysis: {
          problems: [],
          opportunities: []
        }
      };

      // CRITICAL: Only update UI state if this job's client is still active
      const isCurrentClient = activeClient?.id === capturedClientId;
      
      if (isCurrentClient) {
        setStrategy(newStrategy);
      }
      
      addToHistory(newStrategy, capturedClientId);
      setGenerationPhase('complete');
      setGenerationStep('');
      evaluateSections(newStrategy, { ideas: 'fresh', hooks: 'fresh', captions: 'fresh', reels: 'fresh', calendar: 'fresh' });

      // Update job status
      updateJobStatus(job.jobId, 'completed', {
        strategyId: newStrategy.id,
        completedAt: new Date().toISOString(),
      });

      console.log(`[GEN_COMPLETE] Job ${job.jobId} for client ${capturedClientId || 'none'}, active client is ${activeClient?.id || 'none'}`);

      if (capturedClientId) {
        const client = loadClients().find(c => c.id === capturedClientId);
        if (client) onStrategyGenerated(client, 'ai');
      }

      // Only show toast if this job's client is still active (reusing isCurrentClient from above)
      if (isCurrentClient) {
        toast({
          title: 'Strategy ready',
          description: capturedClientId 
            ? `Brand-tuned strategy for ${loadClients().find(c => c.id === capturedClientId)?.brandProfile.brandName || 'client'} — review and customize.`
            : 'Your AI strategy is ready — review and customize.',
          action: <ToastAction altText="View strategy output" onClick={() => setView('output')}>View Strategy Output</ToastAction>,
        });
      } else {
        console.log(`[GEN_COMPLETE] Job ${job.jobId} completed for client ${capturedClientId}, but active client is ${activeClient?.id}. UI suppressed.`);
      }
      clearActiveJob();
    } catch (err: unknown) {
      // If this generation was aborted, do nothing — a newer generation is running
      if (abortController.signal.aborted) {
        clearActiveJob();
        return;
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      setGenerationPhase('error');
      setGenerationStep('');
      setGenerationError(message);
      setFailedStrategyInput(input);
      setView('output');

      const detected = detectFailedSections(message);
      if (detected.length > 0) {
        setFailedSections(new Set(detected));
      }

      if (message === 'NO_API_KEY' || message.startsWith('INVALID_KEY')) {
        toast({
          title: 'Invalid API Key',
          description: 'Your Gemini API key was rejected. Check it and try again.',
          variant: 'destructive',
        });
      } else if (message === 'RATE_LIMITED') {
        toast({
          title: 'Rate Limited',
          description: 'Gemini API rate limit reached. Generation failed.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'AI Generation Failed',
          description: message,
          variant: 'destructive',
        });
      }
      clearActiveJob();
    }
  };

  // --- Refine with Brain ---

  const refineWithBrain = () => {
    if (!strategy || !activeClient) return;

    setIsRefining(true);
    const intelligence = activeClient.brandIntelligence;
    const reasons = generateImprovementReasons(intelligence);

    // Store previous for comparison
    const prevStrategy: StrategyOutput = {
      ...strategy,
      ideas: [...strategy.ideas],
      hooks: [...strategy.hooks],
      brandAwareHooks: [...strategy.brandAwareHooks],
      brandAwareCaptions: [...strategy.brandAwareCaptions],
    };
    setPreviousStrategy(prevStrategy);

    // Apply refinements to hooks
    let refinedHooks = adjustHooksForStyle([...strategy.hooks], intelligence.preferredHookStyle);
    refinedHooks = filterByAvoidedWords(refinedHooks, intelligence.avoidedWords);
    let refinedBrandHooks = adjustHooksForStyle([...strategy.brandAwareHooks], intelligence.preferredHookStyle);
    refinedBrandHooks = filterByAvoidedWords(refinedBrandHooks, intelligence.avoidedWords);

    // Apply refinements to captions (filter by avoided words)
    let refinedCaptions = filterByAvoidedWords([...strategy.captions], intelligence.avoidedWords);
    let refinedBrandCaptions = filterByAvoidedWords([...strategy.brandAwareCaptions], intelligence.avoidedWords);

    // Apply refinements to ideas
    let refinedIdeas = filterByAvoidedWords([...strategy.ideas], intelligence.avoidedWords);

    // Ensure we still have content after filtering
    if (refinedHooks.length === 0) refinedHooks = [...strategy.hooks];
    if (refinedBrandHooks.length === 0) refinedBrandHooks = [...strategy.brandAwareHooks];
    if (refinedCaptions.length === 0) refinedCaptions = [...strategy.captions];
    if (refinedBrandCaptions.length === 0) refinedBrandCaptions = [...strategy.brandAwareCaptions];
    if (refinedIdeas.length === 0) refinedIdeas = [...strategy.ideas];

    // Prepend theme-based ideas if available
    if (intelligence.highPerformingThemes.length > 0) {
      const niche = strategy.settings.niche || 'this industry';
      const themeIdeas: string[] = [];
      for (const theme of intelligence.highPerformingThemes.slice(0, 2)) {
        if (theme === 'Behind the Scenes') themeIdeas.push(`Behind the scenes: How we operate in ${niche.toLowerCase()}`);
        else if (theme === 'Customer Stories') themeIdeas.push(`Customer spotlight: A real success story in ${niche.toLowerCase()}`);
        else if (theme === 'Educational') themeIdeas.push(`${niche} fundamentals that most people skip`);
        else if (theme === 'Quick Tips') themeIdeas.push(`3 quick ${niche.toLowerCase()} tips for immediate results`);
      }
      if (themeIdeas.length > 0) {
        refinedIdeas = [...new Set([...themeIdeas, ...refinedIdeas])].slice(0, refinedIdeas.length);
      }
    }

    const refined: StrategyOutput = {
      ...strategy,
      ideas: refinedIdeas,
      hooks: refinedHooks,
      brandAwareHooks: refinedBrandHooks,
      captions: refinedCaptions,
      brandAwareCaptions: refinedBrandCaptions,
    };

    // Update intelligence refinement count
    const updatedClient = {
      ...activeClient,
      brandIntelligence: {
        ...intelligence,
        refinementCount: (intelligence.refinementCount || 0) + 1,
        lastAnalyzed: new Date().toISOString(),
      },
    };
    updateClient(updatedClient);

    setStrategy(refined);
    addToHistory(refined);
    setRefinementReasons(reasons);
    setIsRefining(false);
    setGenerationPhase('complete');
    evaluateSections(refined, { ideas: 'retried', hooks: 'retried', captions: 'retried', reels: 'retried', calendar: 'retried' });

    onStrategyRefined(updatedClient);

    if (reasons.length === 0) {
      toast({
        title: 'No patterns to apply yet',
        description: 'Approve strategies, edit content, and refine to build Brand Intelligence first.',
        variant: 'destructive',
      });
    } else {
      const applied: string[] = [];
      const intel = intelligence;
      if (intel.preferredHookStyle && intel.preferredHookStyle !== 'mixed') applied.push(`${intel.preferredHookStyle} hooks`);
      if (intel.avoidedWords.length > 0) applied.push(`${intel.avoidedWords.length} avoided words`);
      if (intel.highPerformingThemes.length > 0) applied.push(`${intel.highPerformingThemes.slice(0, 2).join(', ')} themes`);
      toast({
        title: 'Brand Intelligence applied',
        description: applied.length > 0
          ? `Applied: ${applied.join(' · ')}`
          : `${reasons.length} pattern${reasons.length > 1 ? 's' : ''} applied from brand history.`,
      });
    }
  };

  // --- Approve strategy ---

  const approveStrategy = () => {
    if (!strategy || !activeClient) return;

    const intelligence = activeClient.brandIntelligence;
    const updated = learnFromApproval(strategy.hooks, strategy.ideas, intelligence);

    const updatedClient = {
      ...activeClient,
      brandIntelligence: updated,
      strategyStatus: 'approved' as const,
    };
    updateClient(updatedClient);

    // Write to client memory
    addApprovalHistoryEntry(activeClient.id, {
      strategyId: strategy.id,
      action: 'approved' as const,
      timestamp: new Date().toISOString(),
      notes: 'Strategy approved via workflow',
    });

    // Fire automation trigger
    onStrategyApproved(updatedClient);

    toast({
      title: 'Strategy approved',
      description: 'Brain learned from this approval — future strategies will be stronger.',
    });
  };

  // --- Reject strategy ---

  const rejectStrategy = () => {
    if (!strategy || !activeClient) return;

    const intelligence = activeClient.brandIntelligence;
    const updated = learnFromRejection(strategy.hooks, strategy.ideas, intelligence);

    const updatedClient = {
      ...activeClient,
      brandIntelligence: updated,
      strategyStatus: 'rejected' as const,
    };
    updateClient(updatedClient);

    // Write to client memory
    addApprovalHistoryEntry(activeClient.id, {
      strategyId: strategy.id,
      action: 'rejected' as const,
      timestamp: new Date().toISOString(),
      notes: 'Strategy rejected via workflow',
    });

    // Fire automation trigger
    onStrategyRejected(updatedClient);

    toast({
      title: 'Strategy rejected',
      description: 'Brain adjusted — these patterns will be deprioritized.',
      variant: 'destructive',
    });
  };

  const approveSelected = (items: string[], section: SectionName) => {
    if (!activeClient || items.length === 0) return;

    const intelligence = activeClient.brandIntelligence;
    const hooks = section === 'hooks' ? items : [];
    const ideas = section === 'ideas' ? items : [];
    const other = section !== 'hooks' && section !== 'ideas' ? items : [];

    if (strategy) {
      const pool = strategy.approvedPool || { ideas: [], hooks: [], captions: [], reels: [] };
      const nextPool = {
        ...pool,
        [section]: [...new Set([...(pool[section as keyof typeof pool] || []), ...items])]
      };
      const updatedStrategy = { ...strategy, approvedPool: nextPool };
      setStrategy(updatedStrategy);
      addToHistory(updatedStrategy);
    }
    
    const updated = learnFromApproval(hooks, [...ideas, ...other], intelligence);

    const updatedClient = {
      ...activeClient,
      brandIntelligence: updated,
    };
    updateClient(updatedClient);

    toast({
      title: 'Items approved',
      description: `Added ${items.length} ${section} to approved pool. Brain learned from selection.`,
    });
  };

  const rejectSelected = (items: string[], section: SectionName) => {
    if (!activeClient || items.length === 0) return;

    const intelligence = activeClient.brandIntelligence;
    const hooks = section === 'hooks' ? items : [];
    const ideas = section === 'ideas' ? items : [];
    const other = section !== 'hooks' && section !== 'ideas' ? items : [];
    
    if (strategy && strategy.approvedPool) {
      const pool = strategy.approvedPool;
      const nextPool = {
        ...pool,
        [section]: (pool[section as keyof typeof pool] || []).filter(item => !items.includes(item))
      };
      const updatedStrategy = { ...strategy, approvedPool: nextPool };
      setStrategy(updatedStrategy);
      addToHistory(updatedStrategy);
    }
    
    const updated = learnFromRejection(hooks, [...ideas, ...other], intelligence);

    const updatedClient = {
      ...activeClient,
      brandIntelligence: updated,
    };
    updateClient(updatedClient);

    toast({
      title: 'Items rejected',
      description: `Removed ${items.length} ${section} from pool. Brain adjusted.`,
      variant: 'destructive',
    });
  };

  // --- True per-section retry ---

  const retrySection = async (section: string) => {
    const sectionName = section as SectionName;
    if (!SECTION_NAMES.includes(sectionName)) return;
    if (!failedStrategyInput) return;

    // Abort only this section's previous retry (other sections are unaffected)
    if (retryAbortRef.current[sectionName]) {
      retryAbortRef.current[sectionName].abort();
    }
    const abortController = new AbortController();
    retryAbortRef.current[sectionName] = abortController;

    setRetryingSection(sectionName);
    setSectionRetryCounts(prev => ({
      ...prev,
      [sectionName]: (prev[sectionName] || 0) + 1,
    }));
    setGenerationPhase('retrying');
    setGenerationError(null);

    const mode = getGenerationMode();

    if (mode === 'prototype') {
      setGenerationStep(`Regenerating ${sectionName}…`);
      await delay(800);

      const partial = generateSectionContent(sectionName, failedStrategyInput, activeProfile);
      if (strategy) {
        const merged = mergeSection(strategy, partial, sectionName);
        setStrategy(merged);
        addToHistory(merged);
      }
      const partialData = sectionName === 'calendar' ? partial.calendar : sectionName === 'ideas' ? partial.ideas : sectionName === 'hooks' ? partial.hooks : sectionName === 'captions' ? partial.captions : partial.reels;
      const protoIssues = partialData ? checkSectionQuality(sectionName, partialData) : [];
      setFailedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionName);
        return next;
      });
      setSectionRetryCounts(prev => {
        const next = { ...prev };
        delete next[sectionName];
        return next;
      });
      setSectionConfidence(prev => ({ ...prev, [sectionName]: computeConfidence('template', protoIssues) }));
      setSectionQualityReasons(prev => ({ ...prev, [sectionName]: protoIssues }));
      const remainingAfterPrototype = failedSections.has(sectionName) ? failedSections.size - 1 : failedSections.size;
      setGenerationPhase(strategy && remainingAfterPrototype <= 0 ? 'complete' : 'partial');
      setRetryingSection(null);
      setGenerationStep('');
      const remainingProto = failedSections.has(sectionName) ? failedSections.size - 1 : failedSections.size;
      toast({
        title: `${SECTION_DISPLAY_NAMES[sectionName]} applied`,
        description: remainingProto <= 0
          ? 'All sections ready — review your strategy.'
          : `${remainingProto} section${remainingProto > 1 ? 's' : ''} still need${remainingProto === 1 ? 's' : ''} attention.`,
      });
      return;
    }

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setGenerationPhase('partial');
      setGenerationStep('');
      toast({
        title: 'API Key Required',
        description: 'You must provide a Gemini API key to regenerate.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerationStep(`Regenerating ${sectionName}…`);

      const partial = await generateSectionWithAI(
        sectionName,
        failedStrategyInput,
        activeProfile,
        apiKey,
        setGenerationStep,
        abortController.signal
      );

      if (strategy) {
        const merged = mergeSection(strategy, partial, sectionName);
        setStrategy(merged);
        addToHistory(merged);
      }

      const aiPartialData = sectionName === 'calendar' ? partial.calendar : sectionName === 'ideas' ? partial.ideas : sectionName === 'hooks' ? partial.hooks : sectionName === 'captions' ? partial.captions : partial.reels;
      const aiIssues = aiPartialData ? checkSectionQuality(sectionName, aiPartialData) : [];
      setFailedSections(prev => {
        const next = new Set(prev);
        next.delete(sectionName);
        return next;
      });
      setSectionRetryCounts(prev => {
        const next = { ...prev };
        delete next[sectionName];
        return next;
      });
      setSectionConfidence(prev => ({ ...prev, [sectionName]: computeConfidence('retried', aiIssues) }));
      setSectionQualityReasons(prev => ({ ...prev, [sectionName]: aiIssues }));
      const remainingAfterAI = failedSections.has(sectionName) ? failedSections.size - 1 : failedSections.size;
      setGenerationPhase(remainingAfterAI <= 0 ? 'complete' : 'partial');
      setRetryingSection(null);
      setGenerationStep('');
      const remainingAI = failedSections.has(sectionName) ? failedSections.size - 1 : failedSections.size;
      toast({
        title: `${SECTION_DISPLAY_NAMES[sectionName]} regenerated`,
        description: remainingAI <= 0
          ? 'All sections ready — review your strategy.'
          : `${remainingAI} section${remainingAI > 1 ? 's' : ''} still need${remainingAI === 1 ? 's' : ''} attention.`,
      });
    } catch (err: unknown) {
      // If this retry was aborted, do nothing — a newer retry for this section is running
      if (abortController.signal.aborted) {
        setRetryingSection(null);
        return;
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      setGenerationPhase('partial');
      setRetryingSection(null);
      setGenerationStep('');

      // On retry failure, keep only this section as failed
      setFailedSections(prev => {
        const next = new Set(prev);
        next.add(sectionName);
        return next;
      });

      toast({
        title: `${sectionName} retry failed`,
        description: message,
        variant: 'destructive',
      });
    }
  };

  // --- Prototype fallback for single section (called from UI directly) ---

  const applyPrototypeSection = (section: string) => {
    const sectionName = section as SectionName;
    if (!SECTION_NAMES.includes(sectionName) || !failedStrategyInput) return;

    // Abort only this section's in-flight retry before applying prototype
    if (retryAbortRef.current[sectionName]) {
      retryAbortRef.current[sectionName].abort();
      delete retryAbortRef.current[sectionName];
    }
    setRetryingSection(null);

    const partial = generateSectionContent(sectionName, failedStrategyInput, activeProfile);
    if (strategy) {
      const merged = mergeSection(strategy, partial, sectionName);
      setStrategy(merged);
      addToHistory(merged);
    }
    const pSecData = sectionName === 'calendar' ? partial.calendar : sectionName === 'ideas' ? partial.ideas : sectionName === 'hooks' ? partial.hooks : sectionName === 'captions' ? partial.captions : partial.reels;
    const pIssues = pSecData ? checkSectionQuality(sectionName, pSecData) : [];
    setFailedSections(prev => {
      const next = new Set(prev);
      next.delete(sectionName);
      return next;
    });
    setSectionRetryCounts(prev => {
      const next = { ...prev };
      delete next[sectionName];
      return next;
    });
    setSectionConfidence(prev => ({ ...prev, [sectionName]: computeConfidence('template', pIssues) }));
    setSectionQualityReasons(prev => ({ ...prev, [sectionName]: pIssues }));
    setGenerationPhase('partial');
    toast({
      title: `Prototype ${SECTION_DISPLAY_NAMES[sectionName]} applied`,
      description: 'Template data — retry with AI or edit manually before sharing.',
    });
  };

  // --- Public API ---

  const generateStrategy = async (input: StrategyInput) => {
    await generateFullStrategy(input);
  };

  const retryFailedSection = async (section: string) => {
    await retrySection(section);
  };

  const updateStrategy = (newStrategy: StrategyOutput, clearedSection?: string) => {
    if (clearedSection) {
      applyPrototypeSection(clearedSection);
      return;
    }

    // Learn from edits if there's an active client
    if (strategy && activeClient) {
      const intelligence = activeClient.brandIntelligence;
      // Detect edits in hooks
      if (JSON.stringify(strategy.hooks) !== JSON.stringify(newStrategy.hooks)) {
        const updated = learnFromEdits(strategy.hooks, newStrategy.hooks, intelligence);
        updateClient({ ...activeClient, brandIntelligence: updated });
      }
      // Detect edits in ideas
      if (JSON.stringify(strategy.ideas) !== JSON.stringify(newStrategy.ideas)) {
        const updated = learnFromEdits(strategy.ideas, newStrategy.ideas, intelligence);
        updateClient({ ...activeClient, brandIntelligence: updated });
      }
    }

    setStrategy(newStrategy);
    setHistory(prev => {
      const updated = prev.map(s => s.id === newStrategy.id ? newStrategy : s);
      saveHistory(updated);
      return updated;
    });
    setGenerationPhase('complete');
    setGenerationError(null);
    setFailedSections(new Set());
    setSectionRetryCounts({});
    evaluateSections(newStrategy, { ideas: 'fresh', hooks: 'fresh', captions: 'fresh', reels: 'fresh', calendar: 'fresh' });
  };

  const clearStrategy = () => {
    setStrategy(null);
    setGenerationPhase('idle');
    setGenerationError(null);
    setFailedSections(new Set());
    setSectionRetryCounts({});
    setSectionConfidence({});
    setSectionQualityReasons({});
    setPreviousStrategy(null);
    setRefinementReasons([]);
    setView('create');
  };

  const viewStrategy = (s: StrategyOutput) => {
    setStrategy(s);
    setGenerationPhase('complete');
    setGenerationError(null);
    setFailedSections(new Set());
    setSectionRetryCounts({});
    evaluateSections(s, { ideas: 'fresh', hooks: 'fresh', captions: 'fresh', reels: 'fresh', calendar: 'fresh' });
    setView('output');
  };

  return (
    <WorkflowContext.Provider value={{
      view,
      setView,
      setClientFormDirty,
      viewMode,
      setViewMode,
      strategy,
      isGenerating,
      generationPhase,
      retryingSection,
      generationStep,
      generationError,
      failedStrategyInput,
      failedSections,
      sectionRetryCounts,
      sectionConfidence,
      sectionQualityReasons,
      history,
      generateStrategy,
      updateStrategy,
      viewStrategy,
      clearStrategy,
      retryFailedSection,
      activeProfile,
      setActiveProfile,
      profiles,
      refreshProfiles,
      previousStrategy,
      refinementReasons,
      refineWithBrain,
      approveStrategy,
      rejectStrategy,
      approveSelected,
      rejectSelected,
      isRefining,
      onboardingEditingSection,
      setOnboardingEditingSection,
      activeJobId,
    }}>
      {children}
    </WorkflowContext.Provider>
  );
}


export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
