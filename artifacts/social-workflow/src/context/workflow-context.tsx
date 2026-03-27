import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StrategyInput, StrategyOutput, generateContent } from '../lib/content-generator';
import { BrandProfile, loadProfiles, getActiveProfileId } from '../lib/brand-memory';
import { useToast } from '@/hooks/use-toast';

type ViewState = 'dashboard' | 'create' | 'analyzer' | 'output' | 'brand-profile';
type ViewMode = 'employee' | 'client';

interface WorkflowContextType {
  view: ViewState;
  setView: (view: ViewState) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  strategy: StrategyOutput | null;
  isGenerating: boolean;
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
  const [history, setHistory] = useState<StrategyOutput[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const generateStrategy = (input: StrategyInput) => {
    setIsGenerating(true);
    setTimeout(() => {
      const newStrategy = generateContent(input, activeProfile);
      setStrategy(newStrategy);
      setHistory(prev => [newStrategy, ...prev]);
      setIsGenerating(false);
      setView('output');
      toast({
        title: "Strategy Generated!",
        description: activeProfile
          ? `Strategy tuned for ${activeProfile.brandName} is ready.`
          : "Your comprehensive social media strategy is ready.",
      });
    }, 2000);
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

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
