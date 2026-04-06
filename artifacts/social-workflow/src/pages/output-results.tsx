import React, { useState, useEffect, useRef } from 'react';
import { useWorkflow, Confidence } from '@/context/workflow-context';
import { usePipeline } from '@/modules/pipeline/context/pipeline-context';
import { useClients } from '@/modules/clients/context/client-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy, Plus, Calendar, Lightbulb, MessageSquare, Hash, Video,
  Target, ListChecks, Printer, Brain, Sparkles, RefreshCw, Linkedin, Twitter, AlertCircle, Pencil, Loader2,
  ShieldCheck, ShieldAlert, ShieldQuestion, ArrowRight, CheckCircle2, ChevronRight, Lock, Zap, PartyPopper, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { repurposeIdea, RepurposedContent } from '@/lib/brand-memory';
import { generateContent } from '@/lib/content-generator';
import { getGenerationMode, getStoredApiKey } from '@/lib/ai-client';
import { getApprovedDraftCount } from '@/modules/pipeline/lib/pipeline-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function OutputResults() {
  const { strategy, setView, activeProfile, generationError, failedStrategyInput, failedSections, sectionRetryCounts, sectionConfidence, sectionQualityReasons, generateStrategy, retryFailedSection, updateStrategy, isGenerating, retryingSection, generationPhase, previousStrategy, refinementReasons, refineWithBrain, approveStrategy, rejectStrategy, isRefining, viewStrategy, activeJobId } = useWorkflow();
  const { createFromStrategy } = usePipeline();
  const { activeClient } = useClients();
  const { toast } = useToast();
  const [repurposed, setRepurposed] = useState<RepurposedContent | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<string>('');
  const [isClientStrategyMissing, setIsClientStrategyMissing] = useState(false);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [globalRetryCount, setGlobalRetryCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<number>>>(() => ({
    ideas: new Set(),
    hooks: new Set(),
    captions: new Set(),
    reels: new Set(),
  }));
  const { approveSelected, rejectSelected } = useWorkflow();
  const [calendarEditedDays, setCalendarEditedDays] = useState<Set<number>>(new Set());
  const [pipelineCreated, setPipelineCreated] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const previousClientIdRef = useRef<string | null>(null);

  // Pipeline is ALWAYS created manually via the "Create Content Pipeline" button.
  // No auto-generation — users must explicitly approve items and click Create Pipeline.

  // Keep Output in sync with active client strategy to avoid stale results.
  useEffect(() => {
    const currentClientId = activeClient?.id ?? null;
    const clientChanged = previousClientIdRef.current !== currentClientId;
    previousClientIdRef.current = currentClientId;

    if (!clientChanged) return;

    setRepurposed(null);
    setSelectedIdea('');
    setCalendarEditedDays(new Set());
    setPipelineCreated(false);

    if (!activeClient) return;

    const latestStrategy = activeClient.strategies?.[0] ?? null;
    if (latestStrategy) {
      setIsClientStrategyMissing(false);
      if (!strategy || strategy.id !== latestStrategy.id) {
        viewStrategy(latestStrategy);
      }
      return;
    }

    // No strategy for selected client: keep user on Strategy Output,
    // but show an empty state instead of redirecting silently.
    setIsClientStrategyMissing(true);
  }, [activeClient, strategy, viewStrategy]);

  const handleCreatePipeline = () => {
    if (!strategy) return;
    const approvedDraftCount = getApprovedDraftCount(strategy);
    if (approvedDraftCount === 0) {
      toast({
        title: 'Approve content first',
        description: 'Select the ideas, hooks, captions, or reels you want in the pipeline before creating drafts.',
        variant: 'destructive',
      });
      return;
    }
    
    // CRITICAL: Use strategy.clientId directly - NO inference from brandProfileUsed
    const clientId = strategy.clientId;
    
    if (!clientId) {
      toast({
        title: 'No client selected',
        description: 'Cannot create pipeline without a client.',
        variant: 'destructive',
      });
      return;
    }
    
    const drafts = createFromStrategy(strategy, clientId);
    if (drafts.length === 0) {
      toast({
        title: 'No approved drafts available',
        description: 'The pipeline only creates drafts from the approved pool.',
        variant: 'destructive',
      });
      return;
    }
    setPipelineCreated(true);
    
    // Only show toast if this is still the active client
    if (activeClient?.id === clientId) {
      toast({
        title: 'Content pipeline created',
        description: `${drafts.length} drafts ready for review.`,
        action: <ToastAction altText="View pipeline" onClick={() => setView('pipeline')}>View Pipeline</ToastAction>,
      });
    }
  };

  const strategyClientName = (activeClient?.businessName || activeClient?.name)?.trim() || '';
  const contextAudience =
    (activeClient?.clientProfile?.targetAudience?.trim() || strategy?.settings.targetAudience || '').trim();
  const contextTone =
    (activeClient?.clientProfile?.brandVoice?.trim() || strategy?.settings.tone || '').trim();

  // Intelligence readiness: true if the client has any usable brand intelligence data
  const intelligence = activeClient?.brandIntelligence;
  const hasIntelligence = !!(intelligence && (
    (intelligence.avoidedWords?.length ?? 0) > 0 ||
    (intelligence.highPerformingThemes?.length ?? 0) > 0 ||
    (intelligence.approvalCount ?? 0) > 0 ||
    (intelligence.editCount ?? 0) > 0 ||
    Object.keys(intelligence.patternScores?.hookTypes ?? {}).length > 0
  ));
  const displayPlatforms = strategy
    ? (strategy.settings.platforms?.length ?? 0) > 0
      ? strategy.settings.platforms
      : activeClient?.clientProfile?.platforms ?? []
    : [];

  const hasBrandProfile = !!strategy?.brandProfileUsed;

  const handleCopyAll = () => {
    if (!strategy) return;
    let copyText = `🚀 SOCIAL MEDIA STRATEGY: ${strategy.settings.niche.toUpperCase()} 🚀\n\n`;
    copyText += `Goal: ${strategy.settings.goal}\n`;
    copyText += `Tone: ${strategy.settings.tone}\n`;
    copyText += `Platforms: ${strategy.settings.platforms.join(', ')}\n\n`;
    copyText += `💡 TOP 10 CONTENT IDEAS:\n`;
    strategy.ideas.forEach((idea, i) => copyText += `${i + 1}. ${idea}\n`);
    copyText += `\n🎣 TOP 10 HOOKS:\n`;
    strategy.hooks.forEach((hook, i) => copyText += `${i + 1}. "${hook}"\n`);
    copyText += `\n📝 5 CAPTION TEMPLATES:\n`;
    strategy.captions.forEach((cap, i) => copyText += `\n--- CAPTION ${i + 1} ---\n${cap}\n`);
    copyText += `\n#️⃣ HASHTAGS:\n`;
    Object.entries(strategy.hashtags).forEach(([cat, tags]) => {
      copyText += `${cat}: ${tags.join(' ')}\n`;
    });
    navigator.clipboard.writeText(copyText).then(() => {
      toast({ title: "Copied to clipboard", description: "Strategy has been copied as text." });
    });
  };

  const handleCopyCalendar = () => {
    if (!strategy) return;
    let copyText = `📅 30-DAY CONTENT CALENDAR: ${strategy.settings.niche.toUpperCase()} 📅\n\n`;
    strategy.calendar.forEach((item) => {
      copyText += `Day ${item.day} | ${item.type} | ${item.format}\nTopic: ${item.idea}\n\n`;
    });
    navigator.clipboard.writeText(copyText).then(() => {
      toast({ title: "Calendar Copied", description: "30-day calendar has been copied as text." });
    });
  };

  const handleCopyExecutionGuide = () => {
    if (!strategy || !strategy.executionGuide) return;
    let copyText = `✅ EXECUTION GUIDE: ${strategy.settings.niche.toUpperCase()} ✅\n\n`;
    strategy.executionGuide.forEach((step) => {
      copyText += `STEP ${step.step}: ${step.action}\nTool: ${step.tool}\nPrompt:\n${step.prompt}\n\n`;
    });
    navigator.clipboard.writeText(copyText).then(() => {
      toast({ title: "Execution Guide Copied", description: "Execution guide and prompts have been copied." });
    });
  };

  const handleRepurpose = () => {
    if (!selectedIdea || !strategy) {
      toast({ description: 'Please select a content idea first.', variant: 'destructive' });
      return;
    }
    setIsRepurposing(true);
    setTimeout(() => {
      const result = repurposeIdea(selectedIdea, strategy.settings.niche, activeProfile ?? null);
      setRepurposed(result);
      setIsRepurposing(false);
    }, 800);
  };

  const toggleSelectItem = (section: string, index: number) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      const set = new Set(next[section]);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      next[section] = set;
      return next;
    });
  };

  const selectAllInSection = (section: string, total: number) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      const isAllSelected = next[section].size === total;
      if (isAllSelected) {
        next[section] = new Set();
      } else {
        next[section] = new Set(Array.from({ length: total }, (_, i) => i));
      }
      return next;
    });
  };

  const handleApproveSelected = (section: string) => {
    if (!strategy) return;
    const indices = Array.from(selectedItems[section]);
    if (indices.length === 0) return;

    let itemsToApprove: string[] = [];
    if (section === 'ideas') itemsToApprove = indices.map(i => strategy.ideas[i]);
    else if (section === 'hooks') itemsToApprove = indices.map(i => hasBrandProfile ? strategy.brandAwareHooks[i] : strategy.hooks[i]);
    else if (section === 'captions') itemsToApprove = indices.map(i => hasBrandProfile ? strategy.brandAwareCaptions[i] : strategy.captions[i]);
    else if (section === 'reels') itemsToApprove = indices.map(i => strategy.reels[i]);

    approveSelected(itemsToApprove, section as any);
    
    // Clear selection
    setSelectedItems(prev => ({ ...prev, [section]: new Set() }));
  };

  const handleRejectSelected = (section: string) => {
    if (!strategy) return;
    const indices = Array.from(selectedItems[section]);
    if (indices.length === 0) return;

    let itemsToReject: string[] = [];
    if (section === 'ideas') itemsToReject = indices.map(i => strategy.ideas[i]);
    else if (section === 'hooks') itemsToReject = indices.map(i => hasBrandProfile ? strategy.brandAwareHooks[i] : strategy.hooks[i]);
    else if (section === 'captions') itemsToReject = indices.map(i => hasBrandProfile ? strategy.brandAwareCaptions[i] : strategy.captions[i]);
    else if (section === 'reels') itemsToReject = indices.map(i => strategy.reels[i]);

    rejectSelected(itemsToReject, section as any);
    
    // Clear selection
    setSelectedItems(prev => ({ ...prev, [section]: new Set() }));
  };

  const containerVariants: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants: any = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } } };

  // Determine which view to render
  const isClientMismatch = strategy && strategy.clientId && activeClient?.id !== strategy.clientId;
  const isErrorState = !strategy && generationError && failedStrategyInput;
  const isEmptyState = !activeClient || isClientStrategyMissing || !strategy;

  return (
    <>
      {/* Client Mismatch State */}
      {isClientMismatch && (
        <div className="flex flex-col items-center justify-center p-6 lg:p-10 max-w-lg mx-auto w-full h-[80vh] text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="w-7 h-7 text-blue-500" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Strategy from another client</h2>
            <p className="text-muted-foreground mb-8 text-[15px] leading-relaxed">
              This strategy was generated for a different client. Switch back to that client to view it.
            </p>
            <Button onClick={() => setView('dashboard')} size="lg" className="w-full h-11 rounded-xl">
              Return to Dashboard
            </Button>
          </motion.div>
        </div>
      )}

      {/* Generation Error State */}
      {!isClientMismatch && isErrorState && (
        <div className="flex flex-col items-center justify-center p-6 lg:p-10 max-w-lg mx-auto w-full h-[80vh] text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 mx-auto">
              <AlertCircle className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Generation incomplete</h2>
            <p className="text-muted-foreground mb-8 text-[15px] leading-relaxed">
              {generationError}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={() => {
                  setGlobalRetryCount(c => c + 1);
                  generateStrategy(failedStrategyInput);
                }}
                size="lg"
                disabled={isGenerating || !!activeJobId}
                className="w-full h-11 rounded-xl"
              >
                {(isGenerating || !!activeJobId) ? 'Generating…' : globalRetryCount >= 3 ? "Having trouble? Switch to Prototype Mode" : "Regenerate Full Strategy"}
              </Button>
              {(globalRetryCount > 0) && (
                <Button
                  variant="outline"
                  size="lg"
                  disabled={isGenerating}
                  onClick={() => {
                    if (failedStrategyInput) {
                      const fallback = generateContent(failedStrategyInput, activeProfile);
                      updateStrategy(fallback);
                    }
                  }}
                  className="w-full h-11 rounded-xl"
                >
                  Use Prototype Output
                </Button>
              )}
            </div>
            {globalRetryCount > 0 && (
              <p className="text-xs text-muted-foreground mt-4">
                Prototype data is a fallback — replace it manually before sharing.
              </p>
            )}
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {!isClientMismatch && !isErrorState && isEmptyState && (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-muted/80 rounded-2xl flex items-center justify-center mb-6">
              <Lightbulb className="w-9 h-9 text-muted-foreground/60" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">No strategy yet</h2>
            <p className="text-muted-foreground max-w-md mb-8 text-[15px]">
              Generate your first strategy to unlock the Strategy Output view.
            </p>
            <Button onClick={() => setView('create')} size="lg" className="active-elevate-2 shadow-md rounded-xl h-11 px-6">
              <Plus className="w-4 h-4 mr-2" /> Generate Strategy
            </Button>
          </motion.div>
        </div>
      )}

      {/* Main Content - Only render when we have a valid strategy for the current client */}
      {!isClientMismatch && !isErrorState && !isEmptyState && strategy && (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10"
      >
        <Button variant="ghost" size="sm" onClick={() => setView('create')} className="mb-4">
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Create Strategy
        </Button>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            {strategyClientName ? (
              <p className="text-sm font-semibold text-foreground mb-1">
                Strategy for: <span className="text-primary">{strategyClientName}</span>
              </p>
            ) : null}
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground truncate">
                {strategy.settings.niche} Strategy
              </h1>
            </div>
            <p className="text-muted-foreground text-[15px] mb-4">
              <span className="font-medium text-foreground/90">{contextTone || strategy.settings.tone}</span>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span>{contextAudience || strategy.settings.targetAudience}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(displayPlatforms.length > 0 ? displayPlatforms : strategy.settings.platforms).map(p => (
                <span key={p} className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-muted/80 text-muted-foreground border border-border/50">
                  {p}
                </span>
              ))}
              <span className="text-muted-foreground/30">·</span>
              <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-primary/[0.06] text-primary border border-primary/10">
                {strategy.settings.goal}
              </span>
              {hasBrandProfile && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-violet-500/[0.06] text-violet-600 border border-violet-500/10">
                    <Brain className="w-3 h-3" /> Brand-Tuned
                  </span>
                </>
              )}
              {generationError && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-500/[0.06] text-amber-600 border border-amber-500/10">
                    <AlertCircle className="w-3 h-3" /> Prototype
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {activeClient && (
              <>
                <Button
                  onClick={hasIntelligence ? refineWithBrain : undefined}
                  disabled={isRefining || isGenerating || !hasIntelligence}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-lg gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40"
                  title={!hasIntelligence ? 'No Brand Intelligence data yet — approve strategies and edit content to build it' : 'Applies brand voice patterns, hook style preferences, and avoids flagged words'}
                >
                  {isRefining ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refining…</> : <><TrendingUp className="w-3.5 h-3.5" /> Refine with Brand Intelligence</>}
                </Button>
                <Button onClick={approveStrategy} variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
                </Button>
                <Button onClick={rejectStrategy} variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                </Button>
                <div className="w-px h-5 bg-border/60 mx-0.5" />
              </>
            )}
            <Button onClick={handleCopyCalendar} variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground">
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Calendar
            </Button>
            <Button onClick={handleCopyExecutionGuide} variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground">
              <ListChecks className="w-3.5 h-3.5 mr-1.5" /> Execution
            </Button>
            <Button onClick={handleCopyAll} variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground">
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy All
            </Button>
            <div className="w-px h-5 bg-border/60 mx-1" />
            <Button onClick={() => window.print()} variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Guided Workflow + Primary CTA (Issue A+C) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mb-8"
      >
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Step tracker */}
            <div className="flex items-center gap-2 flex-wrap">
              <WorkflowStep number={1} label="Review Strategy" done />
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <WorkflowStep number={2} label="Create Pipeline" active={!pipelineCreated} done={pipelineCreated} />
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <WorkflowStep number={3} label="Edit Drafts" locked={!pipelineCreated} />
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <WorkflowStep number={4} label="Schedule Content" locked={!pipelineCreated} />
            </div>

            {/* Primary CTA */}
            {!pipelineCreated ? (
              <Button
                onClick={handleCreatePipeline}
                size="lg"
                className="shrink-0 h-11 px-6 rounded-xl shadow-lg shadow-primary/25 gap-2 font-semibold"
              >
                <Pencil className="w-4 h-4" /> Create Content Pipeline
              </Button>
            ) : (
              <Button
                onClick={() => setView('pipeline')}
                size="lg"
                className="shrink-0 h-11 px-6 rounded-xl shadow-lg shadow-green-500/20 gap-2 font-semibold bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Pipeline Ready — View Drafts
              </Button>
            )}
          </div>
          {!pipelineCreated && (
            <p className="text-xs text-muted-foreground mt-3">
              Creates editable pipeline drafts only from the content you explicitly approved above.
            </p>
          )}
        </div>
      </motion.div>

      {/* Approved Pool — clearly communicates what goes to pipeline (Issue 4) */}
      {(() => {
        const pool = strategy?.approvedPool;
        const approvedIdeas = pool?.ideas?.length || 0;
        const approvedHooks = pool?.hooks?.length || 0;
        const approvedCaptions = pool?.captions?.length || 0;
        const approvedReels = pool?.reels?.length || 0;
        const totalApproved = getApprovedDraftCount(strategy);
        if (totalApproved === 0) return null;

        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-green-500/[0.04] border-2 border-green-500/25 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-green-500/[0.06] border-b border-green-500/15">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm font-bold text-green-800 dark:text-green-400">Approved Pool — Ready for Pipeline</span>
                <span className="ml-auto text-xs text-green-700/70 font-medium">
                  Clicking "Create Pipeline" will create{' '}
                  <strong className="text-green-800 dark:text-green-300">{totalApproved} draft{totalApproved !== 1 ? 's' : ''}</strong>
                </span>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-3">
                {approvedIdeas > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-green-500/20">
                    <span className="text-lg font-display font-bold text-green-700 dark:text-green-400">{approvedIdeas}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Ideas</p>
                      <p className="text-[10px] text-muted-foreground">→ will become drafts</p>
                    </div>
                  </div>
                )}
                {approvedHooks > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-green-500/20">
                    <span className="text-lg font-display font-bold text-green-700 dark:text-green-400">{approvedHooks}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Hooks</p>
                      <p className="text-[10px] text-muted-foreground">available in editor</p>
                    </div>
                  </div>
                )}
                {approvedCaptions > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-green-500/20">
                    <span className="text-lg font-display font-bold text-green-700 dark:text-green-400">{approvedCaptions}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Captions</p>
                      <p className="text-[10px] text-muted-foreground">available in editor</p>
                    </div>
                  </div>
                )}
                {approvedReels > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-green-500/20">
                    <span className="text-lg font-display font-bold text-green-700 dark:text-green-400">{approvedReels}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Reels</p>
                      <p className="text-[10px] text-muted-foreground">available in editor</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Comparison View: Before vs After Refinement */}
      {previousStrategy && refinementReasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="bg-violet-500/[0.03] border border-violet-500/15 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-500/10 bg-violet-500/[0.04]">
              <div className="flex items-center gap-2.5">
                <Brain className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold text-foreground">Improved using Client Insights</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-600 border-violet-500/20">
                  {refinementReasons.length} change{refinementReasons.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground rounded-lg" onClick={() => setShowComparison(!showComparison)}>
                {showComparison ? 'Hide details' : 'Show comparison'}
              </Button>
            </div>

            {/* Improvement Reasons */}
            <div className="px-5 py-4 space-y-2.5">
              {refinementReasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{reason.label}</p>
                    <p className="text-xs text-muted-foreground">{reason.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Side-by-side comparison */}
            {showComparison && (
              <div className="border-t border-violet-500/10">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-violet-500/10">
                  {/* Original */}
                  <div className="p-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Original
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground/70 mb-1">Hooks</p>
                        {previousStrategy.hooks.slice(0, 3).map((h, i) => {
                          const changed = !strategy.hooks.includes(h);
                          return (
                            <p key={i} className={`text-xs py-1 ${changed ? 'line-through text-muted-foreground/50' : 'text-foreground/70'}`}>{h}</p>
                          );
                        })}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground/70 mb-1">Ideas</p>
                        {previousStrategy.ideas.slice(0, 3).map((idea, i) => {
                          const changed = !strategy.ideas.includes(idea);
                          return (
                            <p key={i} className={`text-xs py-1 ${changed ? 'line-through text-muted-foreground/50' : 'text-foreground/70'}`}>{idea}</p>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Refined */}
                  <div className="p-5 bg-violet-500/[0.02]">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      Refined
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground/70 mb-1">Hooks</p>
                        {strategy.hooks.slice(0, 3).map((h, i) => {
                          const isNew = !previousStrategy.hooks.includes(h);
                          return (
                            <p key={i} className={`text-xs py-1 ${isNew ? 'text-violet-600 dark:text-violet-400 font-medium' : 'text-foreground/70'}`}>
                              {isNew && <span className="inline-block w-1 h-1 rounded-full bg-violet-500 mr-1.5 align-middle" />}
                              {h}
                            </p>
                          );
                        })}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground/70 mb-1">Ideas</p>
                        {strategy.ideas.slice(0, 3).map((idea, i) => {
                          const isNew = !previousStrategy.ideas.includes(idea);
                          return (
                            <p key={i} className={`text-xs py-1 ${isNew ? 'text-violet-600 dark:text-violet-400 font-medium' : 'text-foreground/70'}`}>
                              {isNew && <span className="inline-block w-1 h-1 rounded-full bg-violet-500 mr-1.5 align-middle" />}
                              {idea}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

        {/* Confidence Summary */}
        {Object.keys(sectionConfidence).length > 0 && (() => {
          const counts = { strong: 0, good: 0, review: 0, template: 0 };
          for (const c of Object.values(sectionConfidence)) counts[c]++;
          const hasReview = counts.review > 0;
          const hasTemplate = counts.template > 0;
          return (
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                {counts.strong > 0 && (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="font-medium">{counts.strong}</span>
                    <span className="text-muted-foreground">Strong</span>
                  </span>
                )}
                {counts.good > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="font-medium">{counts.good}</span>
                    <span className="text-muted-foreground">Good</span>
                  </span>
                )}
                {counts.review > 0 && (
                  <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span className="font-medium">{counts.review}</span>
                    <span className="text-muted-foreground">Review</span>
                  </span>
                )}
                {counts.template > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="font-medium">{counts.template}</span>
                    <span className="text-muted-foreground">Template</span>
                  </span>
                )}
              </div>
              {hasReview ? (
                <div className="bg-orange-500/[0.06] border border-orange-500/10 text-orange-700 dark:text-orange-400 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm">
                  <ShieldAlert className="w-4 h-4 shrink-0 opacity-70" />
                  <span>Some sections need attention — review highlighted items below</span>
                </div>
              ) : hasTemplate ? (
                <div className="bg-slate-500/[0.06] border border-slate-500/10 text-slate-600 dark:text-slate-400 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm">
                  <ShieldQuestion className="w-4 h-4 shrink-0 opacity-70" />
                  <span>Some sections use template data — retry with AI or personalize</span>
                </div>
              ) : failedSections.size === 0 ? (
                <div className="bg-green-500/[0.06] border border-green-500/10 text-green-700 dark:text-green-400 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm">
                  <ShieldCheck className="w-4 h-4 shrink-0 opacity-70" />
                  <span>Strategy is ready — review, customize, and share</span>
                </div>
              ) : null}
            </motion.div>
          );
        })()}

        {/* Failed sections banner */}
        {failedSections.size > 0 && (
          <motion.div variants={itemVariants}>
            <div className="bg-amber-500/[0.06] border border-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 opacity-70" />
              <span>{failedSections.size} section{failedSections.size > 1 ? 's' : ''} failed to generate — see below</span>
            </div>
          </motion.div>
        )}

        {/* Section 1: Ideas & Hooks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <SectionCard
              title="Content Concepts"
              icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
              accentColor="amber"
              confidence={sectionConfidence['ideas']}
              hasFailed={failedSections.has('ideas')}
              onCopy={() => {
                const text = strategy.ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n');
                navigator.clipboard.writeText(text).then(() => toast({ description: "Ideas copied!" }));
              }}
              allSelected={selectedItems.ideas.size === strategy.ideas.length && strategy.ideas.length > 0}
              onSelectAll={() => selectAllInSection('ideas', strategy.ideas.length)}
              selectedCount={selectedItems.ideas.size}
              onApproveSelected={() => handleApproveSelected('ideas')}
              onRejectSelected={() => handleRejectSelected('ideas')}
            >
              {failedSections.has('ideas') ? (
                <FailedSectionCard
                  sectionName="Content Ideas"
                  section="ideas"
                  retryCount={sectionRetryCounts['ideas'] || 0}
                  isRetrying={retryingSection === 'ideas'}
                  isAnyGenerating={isGenerating}
                  onRetry={() => retryFailedSection('ideas')}
                  onPrototype={() => { if (failedStrategyInput) updateStrategy(generateContent(failedStrategyInput, activeProfile), 'ideas'); }}
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {strategy.ideas.map((idea, i) => (
                    <li key={i} className={`flex hover:bg-muted/20 transition-colors duration-200 group relative ${selectedItems.ideas.has(i) ? 'bg-primary/[0.03]' : ''}`}>
                      <div className="pl-4 pt-[22px] shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedItems.ideas.has(i)}
                          onChange={() => toggleSelectItem('ideas', i)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                          aria-label={`Select idea ${i + 1}`}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground/50 mt-[22px] ml-11 absolute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1 ml-11 mr-3 my-1.5 py-2">
                        <EditableBlock
                          initialValue={idea}
                          onSave={(val) => {
                            const updated = { ...strategy };
                            updated.ideas[i] = val;
                            updateStrategy(updated);
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {sectionConfidence['ideas'] && !failedSections.has('ideas') && (
                <ConfidenceHint confidence={sectionConfidence['ideas']} sectionName="ideas" reasons={sectionQualityReasons['ideas'] || []} onRetry={() => retryFailedSection('ideas')} />
              )}
            </SectionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <SectionCard
              title="Viral Hooks"
              icon={<Target className="w-4 h-4 text-red-500" />}
              accentColor="red"
              confidence={sectionConfidence['hooks']}
              hasFailed={failedSections.has('hooks')}
              onCopy={() => {
                const hooks = hasBrandProfile ? strategy.brandAwareHooks : strategy.hooks;
                const text = hooks.map((hook, i) => `${i + 1}. "${hook}"`).join('\n');
                navigator.clipboard.writeText(text).then(() => toast({ description: "Hooks copied!" }));
              }}
              allSelected={selectedItems.hooks.size === (hasBrandProfile ? strategy.brandAwareHooks.length : strategy.hooks.length)}
              onSelectAll={() => selectAllInSection('hooks', hasBrandProfile ? strategy.brandAwareHooks.length : strategy.hooks.length)}
              selectedCount={selectedItems.hooks.size}
              onApproveSelected={() => handleApproveSelected('hooks')}
              onRejectSelected={() => handleRejectSelected('hooks')}
            >
              {failedSections.has('hooks') ? (
                <FailedSectionCard
                  sectionName="Viral Hooks"
                  section="hooks"
                  retryCount={sectionRetryCounts['hooks'] || 0}
                  isRetrying={retryingSection === 'hooks'}
                  isAnyGenerating={isGenerating}
                  onRetry={() => retryFailedSection('hooks')}
                  onPrototype={() => { if (failedStrategyInput) updateStrategy(generateContent(failedStrategyInput, activeProfile), 'hooks'); }}
                />
              ) : (
                <ul className="divide-y divide-border/40">
                  {(hasBrandProfile ? strategy.brandAwareHooks : strategy.hooks).map((hook, i) => (
                    <li key={i} className={`flex hover:bg-muted/20 transition-colors duration-200 group relative ${selectedItems.hooks.has(i) ? 'bg-primary/[0.03]' : ''}`}>
                      <div className="pl-4 pt-[22px] shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedItems.hooks.has(i)}
                          onChange={() => toggleSelectItem('hooks', i)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          aria-label={`Select hook ${i + 1}`}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground/50 mt-[22px] ml-11 absolute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1 ml-11 mr-3 my-1.5 py-2">
                        <EditableBlock
                          initialValue={hook}
                          onSave={(val) => {
                            const updated = { ...strategy };
                            if (hasBrandProfile) updated.brandAwareHooks[i] = val;
                            else updated.hooks[i] = val;
                            updateStrategy(updated);
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {sectionConfidence['hooks'] && !failedSections.has('hooks') && (
                <ConfidenceHint confidence={sectionConfidence['hooks']} sectionName="hooks" reasons={sectionQualityReasons['hooks'] || []} onRetry={() => retryFailedSection('hooks')} />
              )}
            </SectionCard>
          </motion.div>
        </div>

        {/* Section 2: Captions */}
        <motion.div variants={itemVariants}>
          <SectionCard
            title="High-Converting Captions"
            icon={<MessageSquare className="w-4 h-4 text-blue-500" />}
            accentColor="blue"
            confidence={sectionConfidence['captions']}
            hasFailed={failedSections.has('captions')}
            onCopy={() => {
              const captions = hasBrandProfile ? strategy.brandAwareCaptions : strategy.captions;
              const text = captions.map((cap, i) => `--- CAPTION ${i + 1} ---\n${cap}`).join('\n\n');
              navigator.clipboard.writeText(text).then(() => toast({ description: "Captions copied!" }));
            }}
            allSelected={selectedItems.captions.size === (hasBrandProfile ? strategy.brandAwareCaptions.length : strategy.captions.length) && (hasBrandProfile ? strategy.brandAwareCaptions.length : strategy.captions.length) > 0}
            onSelectAll={() => selectAllInSection('captions', hasBrandProfile ? strategy.brandAwareCaptions.length : strategy.captions.length)}
            selectedCount={selectedItems.captions.size}
            onApproveSelected={() => handleApproveSelected('captions')}
            onRejectSelected={() => handleRejectSelected('captions')}
          >
            {failedSections.has('captions') ? (
              <FailedSectionCard
                sectionName="Captions"
                section="captions"
                retryCount={sectionRetryCounts['captions'] || 0}
                isRetrying={retryingSection === 'captions'}
                isAnyGenerating={isGenerating}
                onRetry={() => retryFailedSection('captions')}
                onPrototype={() => { if (failedStrategyInput) updateStrategy(generateContent(failedStrategyInput, activeProfile), 'captions'); }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
                {(hasBrandProfile ? strategy.brandAwareCaptions : strategy.captions).slice(0, 4).map((caption, i) => (
                  <div key={i} className="relative group">
                    <div className="absolute top-3 left-3 z-20">
                      <input
                        type="checkbox"
                        checked={selectedItems.captions.has(i)}
                        onChange={() => toggleSelectItem('captions', i)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        aria-label={`Select caption ${i + 1}`}
                      />
                    </div>
                    <CaptionCard
                      caption={caption}
                      index={i}
                      color="blue"
                      toast={toast}
                      onSave={(val) => {
                        const updated = { ...strategy };
                        if (hasBrandProfile) updated.brandAwareCaptions[i] = val;
                        else updated.captions[i] = val;
                        updateStrategy(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {sectionConfidence['captions'] && !failedSections.has('captions') && (
              <ConfidenceHint confidence={sectionConfidence['captions']} sectionName="captions" reasons={sectionQualityReasons['captions'] || []} onRetry={() => retryFailedSection('captions')} />
            )}
          </SectionCard>
        </motion.div>

        {/* Section 3: Reels & Hashtags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <SectionCard
              title="Short-Form Video Ideas"
              icon={<Video className="w-4 h-4 text-purple-500" />}
              accentColor="purple"
              confidence={sectionConfidence['reels']}
              hasFailed={failedSections.has('reels')}
              onCopy={() => {
                const text = strategy.reels.map((reel, i) => `${i + 1}. ${reel}`).join('\n\n');
                navigator.clipboard.writeText(text).then(() => toast({ description: "Video ideas copied!" }));
              }}
              allSelected={selectedItems.reels.size === strategy.reels.length}
              onSelectAll={() => selectAllInSection('reels', strategy.reels.length)}
              selectedCount={selectedItems.reels.size}
              onApproveSelected={() => handleApproveSelected('reels')}
              onRejectSelected={() => handleRejectSelected('reels')}
            >
              {failedSections.has('reels') ? (
                <FailedSectionCard
                  sectionName="Video Ideas"
                  section="reels"
                  retryCount={sectionRetryCounts['reels'] || 0}
                  isRetrying={retryingSection === 'reels'}
                  isAnyGenerating={isGenerating}
                  onRetry={() => retryFailedSection('reels')}
                  onPrototype={() => { if (failedStrategyInput) updateStrategy(generateContent(failedStrategyInput, activeProfile), 'reels'); }}
                />
              ) : (
                <div className="space-y-3 p-5">
                  {strategy.reels.map((reel, i) => (
                    <div key={i} className={`flex relative items-start gap-3.5 p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/10 hover:border-border/60 transition-all duration-200 group ${selectedItems.reels.has(i) ? 'bg-primary/[0.03]' : ''}`}>
                      <div className="pt-2 shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedItems.reels.has(i)}
                          onChange={() => toggleSelectItem('reels', i)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                          aria-label={`Select video idea ${i + 1}`}
                        />
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-purple-500/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                        <Video className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <EditableBlock
                          initialValue={reel}
                          multiline
                          onSave={(val) => {
                            const updated = { ...strategy };
                            updated.reels[i] = val;
                            updateStrategy(updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sectionConfidence['reels'] && !failedSections.has('reels') && (
                <ConfidenceHint confidence={sectionConfidence['reels']} sectionName="reels" reasons={sectionQualityReasons['reels'] || []} onRetry={() => retryFailedSection('reels')} />
              )}
            </SectionCard>
          </motion.div>

          {/* Hashtags */}
          <motion.div variants={itemVariants}>
            <SectionCard
              title="Hashtags"
              icon={<Hash className="w-4 h-4 text-green-500" />}
              accentColor="green"
              onCopy={() => {
                const text = Object.entries(strategy.hashtags).map(([cat, tags]) => `${cat}: ${tags.join(' ')}`).join('\n');
                navigator.clipboard.writeText(text).then(() => toast({ description: "Hashtags copied!" }));
              }}
            >
              <div className="space-y-5">
                {Object.entries(strategy.hashtags).map(([category, tags], i) => (
                  <div key={i}>
                    <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2.5">{category}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag, j) => (
                        <span key={j} className="text-[13px] px-2 py-0.5 rounded-md bg-muted/60 text-foreground/80 border border-border/30 hover:border-border/60 transition-colors duration-200 cursor-default">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </motion.div>
        </div>

        {/* Section Repurpose */}
        <motion.div variants={itemVariants}>
          <SectionCard
            title="Repurpose Idea"
            icon={<RefreshCw className="w-4 h-4 text-teal-500" />}
            accentColor="teal"
          >
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Select onValueChange={setSelectedIdea} value={selectedIdea}>
                <SelectTrigger className="flex-1 text-sm h-10 rounded-xl">
                  <SelectValue placeholder="Select a content idea to repurpose..." />
                </SelectTrigger>
                <SelectContent>
                  {strategy.ideas.map((idea, i) => (
                    <SelectItem key={i} value={idea}>{idea}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleRepurpose} disabled={isRepurposing || !selectedIdea} className="shrink-0 rounded-xl gap-2 h-10">
                {isRepurposing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Repurposing...</> : <><Sparkles className="w-4 h-4" /> Repurpose</>}
              </Button>
            </div>

            {repurposed && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <RepurposedCard platform="LinkedIn" icon={<Linkedin className="w-4 h-4"/>} color="bg-blue-700/10 text-blue-700 border-blue-700/20" iconBg="bg-blue-700/10" iconColor="text-blue-700" content={repurposed.linkedin} toast={toast} />
                <RepurposedCard platform="Instagram" icon={<div className="w-4 h-4 rounded bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400" />} color="bg-pink-500/10 text-pink-600 border-pink-500/20" iconBg="bg-pink-500/10" iconColor="text-pink-600" content={repurposed.instagram} toast={toast} />
                <RepurposedCard platform="Twitter / X" icon={<Twitter className="w-4 h-4"/>} color="bg-sky-500/10 text-sky-600 border-sky-500/20" iconBg="bg-sky-500/10" iconColor="text-sky-600" content={repurposed.twitter} toast={toast} />
              </motion.div>
            )}
          </SectionCard>
        </motion.div>

        {/* Section: Calendar */}
        <motion.div variants={itemVariants}>
          <SectionCard
            title="30-Day Content Calendar"
            icon={<Calendar className="w-4 h-4 text-indigo-500" />}
            accentColor="indigo"
            confidence={sectionConfidence['calendar']}
            hasFailed={failedSections.has('calendar')}
            onCopy={() => {
              const text = strategy.calendar.map((item) => `Day ${item.day} | ${item.type} | ${item.format}\nTopic: ${item.idea}`).join('\n\n');
              navigator.clipboard.writeText(text).then(() => toast({ description: "Calendar copied!" }));
            }}
            noPadding
          >
            {failedSections.has('calendar') ? (
              <div className="p-6">
                <FailedSectionCard
                  sectionName="Content Calendar"
                  section="calendar"
                  retryCount={sectionRetryCounts['calendar'] || 0}
                  isRetrying={retryingSection === 'calendar'}
                  isAnyGenerating={isGenerating}
                  onRetry={() => retryFailedSection('calendar')}
                  onPrototype={() => { if (failedStrategyInput) updateStrategy(generateContent(failedStrategyInput, activeProfile), 'calendar'); }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-5 py-3 font-medium text-[11px] text-muted-foreground/60 uppercase tracking-widest w-24">Day</th>
                      <th className="px-5 py-3 font-medium text-[11px] text-muted-foreground/60 uppercase tracking-widest w-32">Format</th>
                      <th className="px-5 py-3 font-medium text-[11px] text-muted-foreground/60 uppercase tracking-widest w-40">Theme</th>
                      <th className="px-5 py-3 font-medium text-[11px] text-muted-foreground/60 uppercase tracking-widest">Core Concept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.calendar.map((item, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors duration-150 group">
                        <td className="px-5 py-3 relative">
                          <span className="font-mono text-[13px] text-muted-foreground/60 tabular-nums">Day {item.day}</span>
                          {calendarEditedDays.has(item.day) && (
                            <div className="absolute top-1/2 left-2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center text-[12px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/30">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[13px] font-medium text-primary/80">{item.format}</span>
                        </td>
                        <td className="px-5 py-3 font-medium text-[14px]">
                          <EditableBlock
                            initialValue={item.idea}
                            onSave={(val) => {
                              const updated = { ...strategy };
                              updated.calendar[i].idea = val;
                              updateStrategy(updated);
                              setCalendarEditedDays(prev => new Set(prev).add(item.day));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sectionConfidence['calendar'] && !failedSections.has('calendar') && (
              <ConfidenceHint confidence={sectionConfidence['calendar']} sectionName="calendar" reasons={sectionQualityReasons['calendar'] || []} onRetry={() => retryFailedSection('calendar')} />
            )}
          </SectionCard>
        </motion.div>

      </motion.div>
    </div>
      )}
    </>
  );
}

// Section card wrapper — adds colored left accent, section-level copy button, and confidence badge
function SectionCard({
  title, icon, accentColor, confidence, hasFailed, onCopy, noPadding, children,
  allSelected, onSelectAll, selectedCount, onApproveSelected, onRejectSelected
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: 'amber' | 'red' | 'blue' | 'purple' | 'green' | 'teal' | 'indigo';
  confidence?: Confidence;
  hasFailed?: boolean;
  onCopy?: () => void;
  noPadding?: boolean;
  children: React.ReactNode;
  allSelected?: boolean;
  onSelectAll?: () => void;
  selectedCount?: number;
  onApproveSelected?: () => void;
  onRejectSelected?: () => void;
}) {
  const accentMap: Record<string, string> = {
    amber: 'border-l-amber-400/60',
    red: 'border-l-red-400/60',
    blue: 'border-l-blue-400/60',
    purple: 'border-l-purple-400/60',
    green: 'border-l-green-400/60',
    teal: 'border-l-teal-400/60',
    indigo: 'border-l-indigo-400/60',
  };

  return (
    <Card className={`h-full border-border/40 border-l-[3px] ${accentMap[accentColor]} shadow-sm overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-md group`}>
      <CardHeader className="bg-muted/20 border-b border-border/30 pb-3 pc-5 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {onSelectAll && (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                aria-label={`Select all ${title}`}
              />
            )}
            <CardTitle className="flex items-center gap-2.5 text-[15px] font-display font-semibold">
              {icon}
              <span>{title}</span>
              {confidence && <ConfidenceBadge confidence={confidence} />}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedCount ? (
              <div className="flex items-center gap-1 bg-background border border-border/50 rounded-lg p-1 animate-in fade-in zoom-in duration-200">
                <span className="text-[10px] font-bold px-1.5 text-primary">{selectedCount} selected</span>
                <Button variant="ghost" size="sm" onClick={onApproveSelected} className="h-6 px-2 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-500/10 rounded-md">
                   Approve
                </Button>
                <Button variant="ghost" size="sm" onClick={onRejectSelected} className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md">
                   Reject
                </Button>
              </div>
            ) : null}
            
            {onCopy && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onCopy}
                aria-label={`Copy ${title}`}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`${noPadding ? 'p-0' : 'p-0'} flex-1`}>
        {children}
      </CardContent>
    </Card>
  );
}


// Editable component wrapper
function EditableBlock({ initialValue, onSave, multiline = false }: { initialValue: string, onSave: (v: string) => void, multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initialValue);
  const [edited, setEdited] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!editing) {
      setVal(initialValue);
    }
  }, [initialValue, editing]);

  const handleEditStart = () => {
    setVal(initialValue);
    setEditing(true);
  };

  const handleSave = () => {
    if (val.trim() && val !== initialValue) {
      setEdited(true);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1500);
    }
    setEditing(false);
    if (val.trim()) {
      onSave(val);
    }
  };

  const handleCancel = () => {
    setVal(initialValue);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="w-full animate-in fade-in fill-mode-both duration-200" onClick={e => e.stopPropagation()}>
        {multiline ? (
          <textarea
            autoFocus
            className="w-full min-h-[120px] p-3 text-sm rounded-lg border-2 border-primary/40 focus:outline-none focus:border-primary bg-background resize-y transition-colors duration-200"
            value={val}
            onChange={e => setVal(e.target.value)}
          />
        ) : (
          <textarea
            autoFocus
            className="w-full h-auto min-h-[60px] p-3 text-sm rounded-lg border-2 border-primary/40 focus:outline-none focus:border-primary bg-background resize-none overflow-hidden transition-colors duration-200"
            value={val}
            onChange={e => {
              setVal(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
          />
        )}
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" className="h-7 px-3 text-xs rounded-lg" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" className="h-7 px-3 text-xs rounded-lg text-muted-foreground" onClick={handleCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group w-full h-full p-2 -m-2 rounded-lg transition-all duration-200 ${edited ? 'border-l-2 border-primary/50 bg-primary/[0.02] pl-3 -ml-[7px]' : ''}`}>
      <div className="pr-7 leading-relaxed whitespace-pre-wrap text-[15px]">{val}</div>
      <button
        onClick={(e) => { e.stopPropagation(); handleEditStart(); }}
        className="absolute top-1 right-1 p-1.5 rounded-md text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted/80 transition-all duration-200"
        title="Edit"
        aria-label="Edit"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0.5 right-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded"
          >
            Saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CaptionCard({ caption, index, color, toast, onSave }: { caption: string; index: number; color: 'blue' | 'violet'; toast: any, onSave: (v: string) => void }) {
  const numBg = color === 'violet' ? 'bg-violet-500/10 text-violet-600' : 'bg-blue-500/10 text-blue-600';

  return (
    <div className="bg-background border border-border/40 rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200 relative group flex flex-col items-start">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(caption); toast({ description: "Caption copied!" }); }} aria-label="Copy caption">
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      <div className={`w-7 h-7 rounded-lg ${numBg} flex items-center justify-center font-semibold text-xs mb-3`}>{index + 1}</div>
      <div className="w-full flex-1">
        <EditableBlock initialValue={caption} onSave={onSave} multiline />
      </div>
    </div>
  );
}

function RepurposedCard({ platform, icon, color, iconBg, iconColor, content, toast }: any) {
  return (
    <div className="flex flex-col rounded-xl border border-border/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30 bg-muted/10">
        <div className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>{icon}</div>
        <span className={`text-[13px] font-semibold ${color.split(' ').find((c: string) => c.startsWith('text-'))}`}>{platform}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0 text-muted-foreground/50 hover:text-foreground rounded-md" onClick={() => { navigator.clipboard.writeText(content); toast({ description: `${platform} post copied!` }); }} aria-label={`Copy ${platform} post`}>
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      <div className="flex-1 p-4 bg-background"><p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{content}</p></div>
    </div>
  );
}

function FailedSectionCard({ sectionName, section, retryCount, isRetrying, isAnyGenerating, onRetry, onPrototype }: {
  sectionName: string;
  section: string;
  retryCount: number;
  isRetrying: boolean;
  isAnyGenerating: boolean;
  onRetry: () => void;
  onPrototype: () => void;
}) {
  const showFallback = retryCount >= 3;
  const busy = isRetrying || isAnyGenerating;
  return (
    <div className="p-6 flex flex-col items-center text-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRetrying ? 'bg-primary/10' : 'bg-amber-500/10'}`}>
        {isRetrying ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-500" />
        )}
      </div>
      <div>
        <h4 className="font-semibold text-[15px] text-foreground">
          {isRetrying ? `Regenerating ${sectionName}…` : `${sectionName} failed to generate`}
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          {isRetrying ? 'This usually takes a few seconds.' : 'The AI returned invalid data for this section.'}
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button onClick={onRetry} size="sm" variant={showFallback ? 'outline' : 'default'} className="w-full rounded-xl h-9" disabled={busy}>
          {isRetrying ? (
            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Retrying…</>
          ) : showFallback ? 'Having trouble? Switch to Prototype Mode' : 'Retry This Section'}
        </Button>
        <Button onClick={onPrototype} size="sm" variant="ghost" className="w-full rounded-xl h-9 text-muted-foreground" disabled={busy}>
          Use Prototype Output
        </Button>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const styles: Record<Confidence, { dot: string; bg: string; text: string; label: string }> = {
    strong: { dot: 'bg-green-500', bg: 'bg-green-500/[0.06]', text: 'text-green-600 dark:text-green-400', label: 'Strong' },
    good: { dot: 'bg-amber-500', bg: 'bg-amber-500/[0.06]', text: 'text-amber-600 dark:text-amber-400', label: 'Good' },
    review: { dot: 'bg-orange-500', bg: 'bg-orange-500/[0.06]', text: 'text-orange-600 dark:text-orange-400', label: 'Needs Review' },
    template: { dot: 'bg-slate-400', bg: 'bg-slate-500/[0.06]', text: 'text-slate-500', label: 'Template' },
  };
  const s = styles[confidence];

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ConfidenceHint({ confidence, sectionName, reasons, onRetry }: { confidence: Confidence; sectionName: string; reasons: string[]; onRetry?: () => void }) {
  if (confidence === 'strong') {
    return (
      <div className="px-5 py-2 text-[12px] text-green-600/50 dark:text-green-400/40 border-t border-border/20">
        Ready to use or customize.
      </div>
    );
  }

  const shown = reasons.slice(0, 3);
  const bgClass = confidence === 'review' ? 'bg-orange-500/[0.03] text-orange-600/80 dark:text-orange-400/60 border-orange-500/10'
    : confidence === 'good' ? 'bg-amber-500/[0.03] text-amber-600/80 dark:text-amber-400/60 border-amber-500/10'
    : 'bg-slate-500/[0.03] text-slate-500/70 border-slate-500/10';

  return (
    <div className={`px-5 py-2.5 text-[12px] border-t ${bgClass}`}>
      {confidence === 'template' ? (
        <span>
          Template content — personalize before use.
          {onRetry && <ApiAwareRetryButton onClick={onRetry} label="Retry with AI" />}
        </span>
      ) : shown.length > 0 ? (
        <div className="space-y-1">
          <ul className="space-y-0.5">
            {shown.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-[5px] w-1 h-1 rounded-full shrink-0 opacity-40 bg-current" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          {onRetry && <ApiAwareRetryButton onClick={onRetry} label={confidence === 'review' ? 'Retry this section' : 'Retry'} />}
        </div>
      ) : (
        <span>
          Review for consistency before sharing.
          {onRetry && <ApiAwareRetryButton onClick={onRetry} label="Retry" />}
        </span>
      )}
    </div>
  );
}

function ApiAwareRetryButton({ onClick, label }: { onClick: () => void; label: string }) {
  const mode = getGenerationMode();
  const hasKey = !!getStoredApiKey();
  const canRetry = mode === 'ai' && hasKey;

  if (canRetry) {
    return (
      <button onClick={onClick} className="underline font-medium hover:text-foreground transition-colors duration-200 ml-0.5">
        {label}
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center ml-0.5">
          <button
            disabled
            className="underline font-medium text-muted-foreground/40 cursor-not-allowed ml-0.5"
          >
            {label}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {!hasKey ? 'Connect a Gemini API key in Settings to enable AI retry' : 'Switch to AI mode to enable retry'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function WorkflowStep({ number, label, done = false, active = false, locked = false }: {
  number: number;
  label: string;
  done?: boolean;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
      done ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : active ? 'bg-primary/10 text-primary font-semibold'
      : locked ? 'bg-muted/40 text-muted-foreground/50'
      : 'bg-muted/30 text-muted-foreground'
    }`}>
      {done ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : locked ? (
        <Lock className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>{number}</div>
      )}
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}
