import React, { createContext, useContext, useState, ReactNode } from 'react';
import { StrategyInput, StrategyOutput, generateContent } from '../lib/content-generator';
import { useToast } from '@/hooks/use-toast';

type ViewState = 'dashboard' | 'create' | 'output';

interface WorkflowContextType {
  view: ViewState;
  setView: (view: ViewState) => void;
  strategy: StrategyOutput | null;
  isGenerating: boolean;
  history: StrategyOutput[];
  generateStrategy: (input: StrategyInput) => void;
  clearStrategy: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewState>('dashboard');
  const [strategy, setStrategy] = useState<StrategyOutput | null>(null);
  const [history, setHistory] = useState<StrategyOutput[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateStrategy = (input: StrategyInput) => {
    setIsGenerating(true);
    // Simulate API delay for premium feel
    setTimeout(() => {
      const newStrategy = generateContent(input);
      setStrategy(newStrategy);
      setHistory(prev => [newStrategy, ...prev]);
      setIsGenerating(false);
      setView('output');
      toast({
        title: "Strategy Generated!",
        description: "Your comprehensive social media strategy is ready.",
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
      strategy,
      isGenerating,
      history,
      generateStrategy,
      clearStrategy
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
