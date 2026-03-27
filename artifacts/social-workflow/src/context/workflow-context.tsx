import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StrategyInput, StrategyOutput, generateContent } from '../lib/content-generator';
import { BrandProfile, loadProfiles, getActiveProfileId } from '../lib/brand-memory';
import { generateWithAI, getStoredApiKey } from '../lib/ai-client';
import { useToast } from '@/hooks/use-toast';

type ViewState = 'dashboard' | 'create' | 'analyzer' | 'output' | 'brand-profile';
type ViewMode = 'employee' | 'client';

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

interface WorkflowContextType {
  view: ViewState;
  setView: (view: ViewState) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  strategy: StrategyOutput | null;
  isGenerating: boolean;
  generationStep: string;
  history: StrategyOutput[];
  generateStrategy: (input: StrategyInput) => void;
  clearStrategy: () => void;
  activeProfile: BrandProfile | null;
  setActiveProfile: (profile: BrandProfile | null) => void;
  profiles: BrandProfile[];
  refreshProfiles: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewState>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('employee');
  const [strategy, setStrategy] = useState<StrategyOutput | null>(null);
  const [history, setHistory] = useState<StrategyOutput[]>(() => loadHistory());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<BrandProfile | null>(null);
  const { toast } = useToast();

  const refreshProfiles = () => {
    const all = loadProfiles();
    setProfiles(all);
    const activeId = getActiveProfileId();
    const active = all.find(p => p.id === activeId) ?? null;
    setActiveProfile(active);
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const addToHistory = (s: StrategyOutput) => {
    setHistory(prev => {
      const next = [s, ...prev.filter(x => x.id !== s.id)].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  };

  const generateStrategy = async (input: StrategyInput) => {
    setIsGenerating(true);
    setGenerationStep('Analyzing brand voice…');

    const apiKey = getStoredApiKey();

    if (apiKey) {
      // Real AI path
      try {
        setGenerationStep('Analyzing brand voice…');
        await delay(600);
        setGenerationStep('Understanding audience psychology…');
        await delay(600);
        setGenerationStep('Generating platform-specific strategy…');

        const aiResult = await generateWithAI(input, activeProfile, apiKey, setGenerationStep);

        setGenerationStep('Finalizing your 30-day calendar…');
        await delay(400);

        // Merge AI result with local generation for missing fields
        const base = generateContent(input, activeProfile);
        const newStrategy: StrategyOutput = {
          ...base,
          ideas: aiResult.ideas ?? base.ideas,
          hooks: aiResult.hooks ?? base.hooks,
          captions: aiResult.captions ?? base.captions,
          brandAwareCaptions: activeProfile
            ? aiResult.captions ?? base.brandAwareCaptions
            : base.brandAwareCaptions,
          brandAwareHooks: activeProfile
            ? aiResult.hooks ?? base.brandAwareHooks
            : base.brandAwareHooks,
          reels: aiResult.reels ?? base.reels,
          hashtags: aiResult.hashtags ?? base.hashtags,
          calendar: aiResult.calendar ?? base.calendar,
        };

        setStrategy(newStrategy);
        addToHistory(newStrategy);
        setIsGenerating(false);
        setGenerationStep('');
        setView('output');
        toast({
          title: 'Strategy Generated with AI',
          description: activeProfile
            ? `Brand-tuned strategy for ${activeProfile.brandName} is ready.`
            : 'Your AI-generated strategy is ready.',
        });
      } catch (err: any) {
        setIsGenerating(false);
        setGenerationStep('');

        if (err.message === 'NO_API_KEY' || err.message?.startsWith('INVALID_KEY')) {
          toast({
            title: 'Invalid API Key',
            description: 'Your Gemini API key was rejected. Check it and try again.',
            variant: 'destructive',
          });
        } else if (err.message === 'RATE_LIMITED') {
          toast({
            title: 'Rate Limited',
            description: 'Gemini API rate limit reached. Falling back to smart templates.',
            variant: 'destructive',
          });
          useFallback(input);
        } else {
          toast({
            title: 'AI unavailable — using smart templates',
            description: err.message?.includes('fetch') ? 'Network error.' : err.message,
            variant: 'destructive',
          });
          useFallback(input);
        }
      }
    } else {
      // Template fallback path with staged loading
      setGenerationStep('Analyzing brand voice…');
      await delay(700);
      setGenerationStep('Understanding audience psychology…');
      await delay(700);
      setGenerationStep('Generating platform-specific strategy…');
      await delay(700);
      setGenerationStep('Finalizing your 30-day calendar…');
      await delay(400);
      useFallback(input);
    }
  };

  const useFallback = (input: StrategyInput) => {
    const newStrategy = generateContent(input, activeProfile);
    setStrategy(newStrategy);
    addToHistory(newStrategy);
    setIsGenerating(false);
    setGenerationStep('');
    setView('output');
    toast({
      title: 'Strategy Generated',
      description: activeProfile
        ? `Strategy tuned for ${activeProfile.brandName} is ready.`
        : 'Your 30-day strategy is ready. Add a Gemini API key for real AI output.',
    });
  };

  const clearStrategy = () => {
    setStrategy(null);
    setView('create');
  };

  return (
    <WorkflowContext.Provider value={{
      view,
      setView,
      viewMode,
      setViewMode,
      strategy,
      isGenerating,
      generationStep,
      history,
      generateStrategy,
      clearStrategy,
      activeProfile,
      setActiveProfile,
      profiles,
      refreshProfiles,
    }}>
      {children}
    </WorkflowContext.Provider>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
