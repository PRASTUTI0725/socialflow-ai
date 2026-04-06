import React from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { useClients } from '@/modules/clients/context/client-context';
import { usePipeline } from '@/modules/pipeline/context/pipeline-context';
import { useTheme } from '@/components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PenTool, Sparkles, ChevronRight, Zap, UserSearch, Moon, Sun, Brain, Users, Pencil, ClipboardCheck, MessageSquare, Eye, ArrowRight, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getStoredApiKey, storeApiKey, getGenerationMode, setGenerationMode } from '@/lib/ai-client';
import { KeyRound, CheckCircle2, AlertCircle, Eye as EyeIcon, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ClientSelector } from '@/modules/clients/components/client-selector';
import { canTriggerStrategy } from '@/lib/onboarding';
import { getStuckDrafts } from '@/lib/flow-health';
import { getClientProfileMissingFields } from '@/modules/clients/lib/client-types';

function ApiKeyModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Mask logic
  const displayKey = key.length > 4 ? `••••••••••••${key.slice(-4)}` : key;

  const handleVerify = async () => {
    if (!key.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${key.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: "Reply with the word OK" }] }] })
      });
      if (!res.ok) throw new Error("Invalid key or quota exceeded. Please check and try again.");
      
      setSuccess(true);
      storeApiKey(key.trim());
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setKey('');
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handlePrototypeMode = () => {
    setGenerationMode('prototype');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Connect Your AI Engine
          </DialogTitle>
          <DialogDescription>
            SocialIdiots uses Google Gemini (free tier) to generate your strategies. Takes 2 minutes to set up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-xl border border-border/50 text-sm">
            <h4 className="font-semibold mb-2">Step 1</h4>
            <p className="text-muted-foreground mb-4">Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a> → Click 'Get API Key' → Create a new key</p>
            <h4 className="font-semibold mb-2">Step 2</h4>
            <p className="text-muted-foreground mb-2">Paste your key below:</p>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={showKey ? key : displayKey}
                onChange={e => {
                  const val = e.target.value;
                  // if they type over the mask, just reset
                  if (val.includes('•')) setKey('');
                  else setKey(val);
                  setError(null);
                }}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-red-500 text-xs font-medium mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {error}</p>}
            {success && <p className="text-green-500 text-sm font-medium mt-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Key verified ✓</p>}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-col gap-3 sm:gap-3 sm:justify-center overflow-hidden">
          <Button onClick={handleVerify} disabled={verifying || !key.trim() || success} className="w-full h-11 shrink-0">
            {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying key...</> : success ? "✓ Verified" : "Verify & Save"}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            For team use, we recommend rotating your API key monthly in Google AI Studio. Never share your key.
          </p>
          <button onClick={handlePrototypeMode} className="text-sm font-medium text-muted-foreground hover:text-foreground mt-2 underline decoration-muted-foreground/30 underline-offset-4 pb-2">
            Use Prototype Mode Instead
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { view, setView, viewMode, setViewMode, activeProfile, isGenerating, generationStep, retryingSection, generationPhase, strategy, failedSections, setOnboardingEditingSection } = useWorkflow();
  const { activeClient, clients } = useClients();
  const { drafts } = usePipeline();
  const { theme, setTheme } = useTheme();
  // Security Banner State
  const [showSecurityBanner, setShowSecurityBanner] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [guidanceDismissed, setGuidanceDismissed] = useState(false);
  
  useEffect(() => {
    const isAiMode = getGenerationMode() === 'ai';
    
    if (!getStoredApiKey() && isAiMode) {
      setApiModalOpen(true);
    }

    if (isAiMode && !localStorage.getItem('security_notice_dismissed')) {
      setShowSecurityBanner(true);
    }

    const handleSetView = (e: any) => setView(e.detail);
    window.addEventListener('set-view', handleSetView);
    return () => window.removeEventListener('set-view', handleSetView);
  }, [view, setView]);

  const dismissSecurityBanner = () => {
    localStorage.setItem('security_notice_dismissed', 'true');
    setShowSecurityBanner(false);
  };

  // System guidance: determine next action based on system state
  const getNextGuidance = (): { message: string; action: string; targetView: string } | null => {
    if (view === 'client-portal') return null;

    // No clients yet
    if (clients.length === 0) {
      return { message: 'Start by adding your first client', action: 'Add Client', targetView: 'clients' };
    }

    // Client selected but onboarding not done
    if (activeClient && !canTriggerStrategy(activeClient.clientProfile)) {
      return {
        message: `Complete onboarding for ${activeClient.businessName || activeClient.name}`,
        action: 'Complete Profile',
        targetView: 'onboarding',
      };
    }

    // Onboarding done, no strategy
    if (activeClient && canTriggerStrategy(activeClient.clientProfile) && !(activeClient.strategies?.length > 0)) {
      return {
        message: `Ready to generate strategy for ${activeClient.businessName || activeClient.name}`,
        action: 'Generate Strategy',
        targetView: 'create',
      };
    }

    // Strategy exists
    if (activeClient && (strategy || (activeClient.strategies?.length ?? 0) > 0)) {
      return {
        message: `Viewing strategy for ${activeClient.businessName || activeClient.name}`,
        action: 'View / Regenerate',
        targetView: 'output',
      };
    }

    // Check for stuck drafts across all clients
    const stuckDrafts = getStuckDrafts(drafts);
    if (stuckDrafts.length >= 3) {
      return { message: `${stuckDrafts.length} drafts stuck for 3+ days — clients may be waiting`, action: 'Review Pipeline', targetView: 'pipeline' };
    }

    // Approved but unscheduled
    const approvedUnscheduled = drafts.filter(d => d.status === 'approved');
    if (approvedUnscheduled.length >= 3) {
      return { message: `${approvedUnscheduled.length} approved drafts need scheduling`, action: 'Schedule Now', targetView: 'pipeline' };
    }

    return null;
  };

  const guidance = getNextGuidance();

  const mapMissingFieldToSection = (field: string): string => {
    if (field === 'targetAudience') return 'targetAudience';
    if (field === 'goals') return 'goals';
    if (field === 'brandVoice') return 'brandVoice';
    if (field === 'platforms') return 'platforms';
    if (field === 'industry') return 'niche';
    if (field === 'brandName') return 'name';
    return 'name';
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'onboarding', label: 'Onboarding', icon: ClipboardCheck },
    { id: 'create', label: 'Create Strategy', icon: PenTool },
    { id: 'pipeline', label: 'Pipeline', icon: Pencil },
    { id: 'brand-profile', label: 'Client Insights', icon: Brain },
  ] as const;

  const viewLabel: Record<string, string> = {
    dashboard: viewMode === 'client' ? 'Client Dashboard' : 'Dashboard',
    create: 'Create Strategy',
    clients: 'Clients',
    onboarding: 'Onboarding',
    pipeline: 'Pipeline',
    analyzer: 'Profile Analyzer',
    'brand-profile': 'Client Insights',
    output: 'Strategy Output',
    'client-portal': 'Client Portal',
    'client-report': 'Client Report',
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      <ApiKeyModal open={apiModalOpen} onOpenChange={setApiModalOpen} />

      {/* Security Banner */}
      {showSecurityBanner && (
        <div className="fixed bottom-4 right-4 z-[100] bg-zinc-900 border border-zinc-800 text-zinc-100 p-4 rounded-xl shadow-2xl max-w-sm flex flex-col gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              Your API key is stored in this browser only. Clear it anytime in Settings.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={dismissSecurityBanner} className="self-end h-8 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none">
            Dismiss
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5 fill-primary" />
            <span className="font-display font-bold text-lg text-foreground tracking-tight">SocialIdiots</span>
          </div>
        </div>

        <div className="flex-1 py-6 px-3 flex flex-col gap-1">
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-3">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium w-full text-left group hover-elevate",
                  isActive
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-foreground")} />
                {item.label}
                {item.id === 'clients' && activeClient && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-500" title={`Active: ${activeClient.businessName || activeClient.name}`} />
                )}
                {item.id === 'brand-profile' && activeProfile && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-500" title={`Active: ${activeProfile.brandName}`} />
                )}
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
                )}
              </button>
            );
          })}

          {/* Client Selector */}
          <div className="mt-4 mx-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Active Client</p>
            <ClientSelector />
          </div>

          {/* Legacy profile display (shown only when no client is active) */}
          {activeProfile && !activeClient && (
            <div className="mt-3 mx-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Profile</p>
              <p className="text-sm font-semibold text-foreground truncate">{activeProfile.brandName}</p>
              <p className="text-xs text-muted-foreground truncate">{activeProfile.niche}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-foreground cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/80 to-accent flex items-center justify-center text-primary-foreground shadow-sm">
              <span className="font-bold text-xs">JD</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-foreground font-semibold">Jane Doe</p>
              <p className="truncate text-xs opacity-70">jane@agency.com</p>
            </div>
          </div>
        </div>

        {isGenerating && (
          <button
            onClick={() => setView('output')}
            className="mx-3 mb-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-left w-[calc(100%-24px)] hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              <p className="text-xs font-medium text-primary truncate">
                {retryingSection ? `Retrying ${retryingSection}…` : 'Generating…'}
              </p>
            </div>
            {generationStep && (
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{generationStep}</p>
            )}
          </button>
        )}

        {!isGenerating && strategy && (generationPhase === 'complete' || generationPhase === 'partial') && (
          <button
            onClick={() => setView('output')}
            className="mx-3 mb-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15 text-left w-[calc(100%-24px)] hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <p className="text-xs font-medium text-green-700 dark:text-green-400 truncate">
                {generationPhase === 'complete' ? 'Strategy ready' : `${failedSections.size} section${failedSections.size > 1 ? 's' : ''} need attention`}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Click to view results</p>
          </button>
        )}

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden bg-background">
        {/* System Guidance Banner */}
        {guidance && !guidanceDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/[0.04] border-b border-primary/10 px-4 lg:px-8 py-2.5 flex items-center gap-3"
          >
            <Compass className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-medium flex-1">{guidance.message}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs rounded-lg shrink-0"
              onClick={() => {
                if (guidance.targetView === 'onboarding' && activeClient) {
                  const firstMissing = getClientProfileMissingFields(activeClient.clientProfile)[0];
                  setOnboardingEditingSection(mapMissingFieldToSection(firstMissing || 'name'));
                  setView('clients');
                  return;
                }
                setView(guidance.targetView as any);
              }}
            >
              {guidance.action} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <button onClick={() => setGuidanceDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss guidance">
              <span className="text-xs">✕</span>
            </button>
          </motion.div>
        )}

        {/* Responsive Header */}
        <header className="h-16 border-b flex items-center justify-between px-4 lg:px-8 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2 md:hidden text-primary">
            <Zap className="w-5 h-5 fill-primary" />
            <span className="font-display font-bold text-lg text-foreground">SocialIdiots</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <h2 className="text-lg font-display font-semibold capitalize">
              {viewLabel[view] || view}
            </h2>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Employee/Client toggle intentionally hidden (UX polish pass) */}

            <Button variant="ghost" size="icon" onClick={() => setApiModalOpen(true)} title="API Settings">
              <KeyRound className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <div className="flex gap-2 md:hidden ml-2 border-l border-border pl-2">
              <Button variant="ghost" size="icon" onClick={() => setView('dashboard')}>
                <LayoutDashboard className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setView('create')}>
                <PenTool className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view + viewMode}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
