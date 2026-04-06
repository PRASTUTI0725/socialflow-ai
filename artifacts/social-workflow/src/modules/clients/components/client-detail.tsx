import React, { useState, useEffect } from 'react';
import { Client, ClientStrategy, StrategyStatus, ClientStatus } from '../lib/client-types';
import { useClients } from '../context/client-context';
import { usePipeline } from '@/modules/pipeline/context/pipeline-context';
import { useWorkflow } from '@/context/workflow-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft, Edit3, Trash2, CheckCircle2, Users, Mic2, Target, Tag,
  BarChart3, Pencil, Eye, CalendarDays, TrendingUp, Sparkles, ArrowRight,
  Lightbulb, Zap, Copy, RefreshCw, Calendar, XCircle, X, Check, Plus, Brain, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { generateStrategy, isAiEnabled, GenerationResult, GenerationType } from '@/services/ai-service';
import { onStrategyGenerated, onStrategyApproved, onStrategyRejected, onStrategyEdited, isAutoPipelineEnabled, onStrategyRefined } from '@/services/automation';
import { getClientActivity } from '@/services/activity-log';
import { ActivityTimeline } from '@/components/activity-timeline';
import { analyzePastContent, mergeIntelligence, calculateLearningProgress } from '../lib/brand-intelligence';
import { ClientTasks } from '@/modules/tasks/components/client-tasks';
import { InternalNotes } from './internal-notes';
import { generateRefinedStrategy } from '../lib/client-strategy-generator';

interface ClientDetailProps {
  client: Client;
  onEdit: () => void;
  onBack: () => void;
}

export function ClientDetail({ client, onEdit, onBack }: ClientDetailProps) {
  const { activeClient, setActiveClient, deleteClient, updateClient } = useClients();
  const { setView, viewMode, viewStrategy } = useWorkflow();
  const { drafts } = usePipeline();
  const { toast } = useToast();
  const isActive = activeClient?.id === client.id;

  const profile = client.clientProfile;

  const [strategy, setStrategy] = useState<ClientStrategy | null>(client.strategy);
  const [strategyStatus, setStrategyStatus] = useState<StrategyStatus>(client.strategyStatus);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<GenerationType | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedStrategy, setEditedStrategy] = useState<ClientStrategy | null>(null);
  const [newPillar, setNewPillar] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Auto-analyze past content on mount if not yet analyzed
  useEffect(() => {
    const hasPastContent = client.brandProfile.pastContent && client.brandProfile.pastContent.trim().length > 20;
    const notYetAnalyzed = !client.brandIntelligence?.lastAnalyzed;
    if (hasPastContent && notYetAnalyzed) {
      const analyzed = analyzePastContent(client);
      const merged = mergeIntelligence(client.brandIntelligence, analyzed);
      updateClient({ ...client, brandIntelligence: merged });
    }
  }, []);

  const handleGenerateStrategy = async () => {
    setIsGenerating(true);
    setStrategyStatus('draft');
    try {
      const result: GenerationResult = await generateStrategy(client);
      setStrategy(result.strategy);
      setEditedStrategy(result.strategy);
      setGenerationSource(result.source);
      updateClient({ ...client, strategy: result.strategy, strategyStatus: 'draft' });
      setIsGenerating(false);
      setEditMode(false);
      onStrategyGenerated(client, result.source);
      const sourceLabel = result.source === 'ai' ? 'AI-generated' : 'Template-based';
      toast({
        title: 'Strategy generated',
        description: `${sourceLabel}. Review and approve before creating pipeline.`,
      });
    } catch (err) {
      setIsGenerating(false);
      toast({ title: 'Generation failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleRefineWithBrain = () => {
    // First analyze past content to update intelligence
    const analyzed = analyzePastContent(client);
    const merged = mergeIntelligence(client.brandIntelligence, analyzed);
    const updatedClient = { ...client, brandIntelligence: merged };
    updateClient(updatedClient);

    // Generate refined strategy using intelligence
    const refined = generateRefinedStrategy(updatedClient);
    setStrategy(refined);
    setEditedStrategy(refined);
    setStrategyStatus('draft');
    setGenerationSource('template');
    updateClient({ ...updatedClient, strategy: refined, strategyStatus: 'draft' });
    onStrategyGenerated(updatedClient, 'template');
    onStrategyRefined(updatedClient);
    toast({ title: 'Strategy refined with Client Insights', description: 'Used brand intelligence to improve hooks, themes, and ideas.' });
  };

  const handleAnalyzeContent = () => {
    const analyzed = analyzePastContent(client);
    const merged = mergeIntelligence(client.brandIntelligence, analyzed);
    const updatedClient = { ...client, brandIntelligence: merged };
    updateClient(updatedClient);
    toast({ title: 'Content analyzed', description: 'Brand intelligence updated from past content. Use "Refine with Brain" to apply.' });
  };

  const handleApproveStrategy = () => {
    setStrategyStatus('approved');
    updateClient({ ...client, strategy, strategyStatus: 'approved' });
    onStrategyApproved(client);
    toast({ title: 'Strategy approved', description: 'You can now create a content pipeline.' });

    // Auto-pipeline if enabled
    if (isAutoPipelineEnabled() && !hasExistingPipeline) {
      setTimeout(() => handleCreatePipelineFromStrategy(), 500);
    }
  };

  const handleRejectStrategy = () => {
    setStrategyStatus('rejected');
    updateClient({ ...client, strategyStatus: 'rejected' });
    onStrategyRejected(client);
    toast({ title: 'Strategy rejected', description: 'Click Regenerate to create a new one.' });
  };

  const handleToggleEdit = () => {
    if (!editMode && strategy) {
      setEditedStrategy({ ...strategy, contentPillars: [...strategy.contentPillars], contentIdeas: [...strategy.contentIdeas], hooks: [...strategy.hooks], postingPlan: strategy.postingPlan.map(p => ({ ...p })) });
    }
    setEditMode(!editMode);
  };

  const handleSaveEdits = () => {
    if (!editedStrategy) return;
    setStrategy(editedStrategy);
    setStrategyStatus('draft');
    updateClient({ ...client, strategy: editedStrategy, strategyStatus: 'draft' });
    setEditMode(false);
    onStrategyEdited(client);
    toast({ title: 'Strategy updated', description: 'Re-approve before creating pipeline.' });
  };

  const updateEditedField = <K extends keyof ClientStrategy>(key: K, value: ClientStrategy[K]) => {
    setEditedStrategy(prev => prev ? { ...prev, [key]: value } : null);
  };

  const addPillar = () => {
    if (!newPillar.trim() || !editedStrategy) return;
    updateEditedField('contentPillars', [...editedStrategy.contentPillars, newPillar.trim()]);
    setNewPillar('');
  };

  const removePillar = (index: number) => {
    if (!editedStrategy) return;
    updateEditedField('contentPillars', editedStrategy.contentPillars.filter((_, i) => i !== index));
  };

  const updateListItem = (field: 'hooks' | 'contentIdeas', index: number, value: string) => {
    if (!editedStrategy) return;
    const list = [...editedStrategy[field]];
    list[index] = value;
    updateEditedField(field, list);
  };

  const updatePostingPlan = (index: number, field: 'type' | 'topic', value: string) => {
    if (!editedStrategy) return;
    const plan = editedStrategy.postingPlan.map((p, i) => i === index ? { ...p, [field]: value } : p);
    updateEditedField('postingPlan', plan);
  };

  const handleCreatePipelineFromStrategy = () => {
    if (!strategy) return;
    if (strategyStatus !== 'approved') {
      toast({ title: 'Approve strategy first', description: 'Strategy must be approved before creating pipeline.', variant: 'destructive' });
      return;
    }
    if (hasExistingPipeline) {
      toast({ title: 'Pipeline already exists', description: 'This client already has content drafts. Delete them first to recreate.', variant: 'destructive' });
      return;
    }
    const latestStrategy = client.strategies?.[0] ?? null;
    if (!latestStrategy) {
      toast({
        title: 'Open strategy output first',
        description: 'Approve the exact items you want in the approved pool before creating pipeline drafts.',
        variant: 'destructive',
      });
      return;
    }
    viewStrategy(latestStrategy);
    toast({
      title: 'Approve items before pipeline',
      description: 'Use Strategy Output to approve the exact ideas, hooks, captions, or reels that should become drafts.',
    });
  };

  // Client insights from pipeline data
  const clientDrafts = drafts.filter(d => d.clientId === client.id);
  const hasExistingPipeline = clientDrafts.length > 0;
  const totalDrafts = clientDrafts.length;
  const approvedCount = clientDrafts.filter(d => d.status === 'approved' || d.status === 'scheduled').length;
  const scheduledCount = clientDrafts.filter(d => d.status === 'scheduled').length;

  // Most used platform
  const platformCounts: Record<string, number> = {};
  clientDrafts.forEach(d => d.platformVariants.forEach(v => {
    platformCounts[v.platform] = (platformCounts[v.platform] || 0) + 1;
  }));
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // Last activity
  const lastUpdated = clientDrafts.length > 0
    ? new Date(Math.max(...clientDrafts.map(d => new Date(d.updatedAt).getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'No activity';

  const handleSetActive = () => {
    setActiveClient(client);
    toast({ title: `${client.businessName || client.name} is now active`, description: 'Strategies will use this client\'s brand voice.' });
  };

  const handleClearActive = () => {
    setActiveClient(null);
    toast({ description: 'Active client cleared.' });
  };

  const confirmDelete = () => {
    deleteClient(client.id);
    if (isActive) setActiveClient(null);
    setDeleteDialogOpen(false);
    toast({ title: 'Client deleted', description: `${client.businessName || client.name} has been removed.` });
    onBack();
  };

  const statusColor: Record<ClientStatus, string> = {
    lead: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    onboarding: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    paused: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    completed: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl gap-2 text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> All Clients
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center">
            <span className="font-display font-bold text-sm text-primary">
              {(client.businessName || client.name).charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold truncate" title={client.businessName || client.name}>{client.businessName || client.name}</h2>
            <p className="text-muted-foreground text-sm uppercase tracking-tighter text-[10px] font-bold opacity-70">Contact: {client.name} · {client.niche || 'No niche set'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isActive ? (
            <Button variant="outline" size="sm" onClick={handleClearActive} className="rounded-xl">
              Clear Active
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleSetActive} className="rounded-xl gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Set Active
            </Button>
          )}
          <Button onClick={onEdit} variant="outline" size="sm" className="rounded-xl gap-2">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete client"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — Client Info */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Users className="w-4 h-4 text-primary" /> Client Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge className={statusColor[client.status]}>{client.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Niche</p>
                <p className="text-sm font-medium">{profile.industry || client.niche || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Target Audience</p>
                <p className="text-sm font-medium">{profile.targetAudience || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm font-medium">{new Date(client.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <BarChart3 className="w-4 h-4 text-emerald-500" /> Plan & Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Selected Plan</p>
                <p className="text-sm font-medium">{client.selectedPlan || 'No plan selected'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Monthly Revenue</p>
                <p className="text-sm font-bold">INR {client.monthlyPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Services Included</p>
                {client.servicesIncluded.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {client.servicesIncluded.map((service) => (
                      <li key={service} className="text-sm">{service}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No services listed</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Insights */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Content Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Pencil className="w-3 h-3" /> Total Drafts</span>
                <span className="text-sm font-bold">{totalDrafts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Approved</span>
                <span className="text-sm font-bold text-green-600">{approvedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Scheduled</span>
                <span className="text-sm font-bold text-blue-600">{scheduledCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Top Platform</span>
                <span className="text-sm font-bold capitalize">{topPlatform.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Eye className="w-3 h-3" /> Last Activity</span>
                <span className="text-sm font-medium">{lastUpdated}</span>
              </div>
            </CardContent>
          </Card>

          {/* Client Insights — always visible */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Brain className="w-4 h-4 text-violet-500" /> Client Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {client.brandIntelligence?.lastAnalyzed ? (
                <>
                  {/* Profile Strength */}
                  {(() => {
                    const progress = calculateLearningProgress(client.brandIntelligence);
                    const barColor = progress.percentage >= 80 ? 'bg-green-500' : progress.percentage >= 50 ? 'bg-blue-500' : progress.percentage >= 20 ? 'bg-amber-500' : 'bg-muted-foreground/30';
                    const textColor = progress.percentage >= 80 ? 'text-green-600' : progress.percentage >= 50 ? 'text-blue-600' : progress.percentage >= 20 ? 'text-amber-600' : 'text-muted-foreground';
                    return (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">Profile Strength</span>
                          <span className={`text-sm font-bold ${textColor}`}>{progress.percentage}% · {progress.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${progress.percentage}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Preferred Hook Style</p>
                    <span className="text-sm font-medium capitalize">{client.brandIntelligence.preferredHookStyle}</span>
                  </div>
                  {client.brandIntelligence.preferredTonePatterns.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Tone Patterns</p>
                      <div className="flex flex-wrap gap-1">
                        {client.brandIntelligence.preferredTonePatterns.map((t, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {client.brandIntelligence.highPerformingThemes.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Top Themes</p>
                      <div className="flex flex-wrap gap-1">
                        {client.brandIntelligence.highPerformingThemes.map((t, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {client.brandIntelligence.avoidedWords.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Avoided Words</p>
                      <div className="flex flex-wrap gap-1">
                        {client.brandIntelligence.avoidedWords.slice(0, 5).map((w, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 line-through">{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Learning counters */}
                  {(client.brandIntelligence.editCount > 0 || client.brandIntelligence.approvalCount > 0) && (
                    <div className="pt-2 border-t border-border/30 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold">{client.brandIntelligence.approvalCount || 0}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Approved</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{client.brandIntelligence.refinementCount || 0}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Refined</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{client.brandIntelligence.editCount || 0}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Edited</p>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 pt-1">
                    Last analyzed: {new Date(client.brandIntelligence.lastAnalyzed).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {client.brandProfile.pastContent && client.brandProfile.pastContent.trim().length > 20
                      ? 'Past content exists but hasn\'t been analyzed yet.'
                      : 'Add past content or generate strategies to activate the brain.'}
                  </p>
                  {client.brandProfile.pastContent && client.brandProfile.pastContent.trim().length > 20 && (
                    <Button size="sm" variant="outline" onClick={handleAnalyzeContent} className="rounded-xl gap-1.5">
                      <Activity className="w-3 h-3" /> Analyze Content
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <ActivityTimeline entries={getClientActivity(client.id)} maxItems={10} />

          {client.contacts.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="text-base font-display">Contacts</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {client.contacts.map(contact => (
                  <div key={contact.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-bold">{contact.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.email} · {contact.role}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — Brand Voice */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Mic2 className="w-4 h-4 text-violet-500" /> Brand Voice
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tone</p>
                    <p className="text-sm font-medium">{profile.brandVoice || client.brandProfile.tone}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Writing Style</p>
                  <p className="text-sm font-medium capitalize">{client.brandProfile.writingStyle}</p>
                </div>
              </div>
              {client.brandProfile.keywords.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {client.brandProfile.keywords.map(kw => (
                      <span key={kw} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <Tag className="w-3 h-3" />{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platforms */}
          {profile.platforms.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <Target className="w-4 h-4 text-blue-500" /> Platforms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2">
                  {profile.platforms.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Do's and Don'ts */}
          {(client.brandProfile.dos.filter(Boolean).length > 0 || client.brandProfile.donts.filter(Boolean).length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {client.brandProfile.dos.filter(Boolean).length > 0 && (
                <Card className="border-green-500/20 bg-green-500/3 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-3">Do's</p>
                    <ul className="space-y-1.5">
                      {client.brandProfile.dos.filter(Boolean).map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {d}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {client.brandProfile.donts.filter(Boolean).length > 0 && (
                <Card className="border-red-500/20 bg-red-500/3 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">Don'ts</p>
                    <ul className="space-y-1.5">
                      {client.brandProfile.donts.filter(Boolean).map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-4 h-4 text-red-500 shrink-0 mt-0.5 text-center">✕</span> {d}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tasks Section */}
      <div className="mt-8">
        <ClientTasks clientId={client.id} />
      </div>

      {/* Internal Notes Section */}
      <div className="mt-8">
        <InternalNotes clientId={client.id} currentNotes={client.internalNotes || ''} />
      </div>

      {/* Strategy Section */}
      <div className="mt-8">
        {!strategy ? (
          <Card className="border-dashed border-border/50 shadow-sm">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-primary/60" />
              </div>
              <h3 className="text-lg font-display font-bold mb-2">No strategy yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">
                Generate a content strategy based on {client.businessName || client.name}'s brand profile, audience, and goals.
              </p>
              <Button onClick={handleGenerateStrategy} disabled={isGenerating} className="gap-2 rounded-xl shadow-md shadow-primary/20">
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating…' : 'Generate Strategy'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Strategy Header + Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-display font-bold">Content Strategy</h2>
                    <StrategyStatusBadge status={strategyStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generated {new Date(strategy.generatedAt).toLocaleDateString()}
                    {generationSource && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        generationSource === 'ai'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {generationSource === 'ai' ? 'AI Generated' : 'Template (fallback)'}
                      </span>
                    )}
                    {editMode && <span className="text-amber-500 ml-2">· Editing</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {viewMode === 'client' ? (
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">Read-only view</span>
                ) : editMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setEditedStrategy(strategy); }} className="rounded-xl gap-1.5">
                      <X className="w-3 h-3" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdits} className="rounded-xl gap-1.5">
                      <Check className="w-3 h-3" /> Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={handleGenerateStrategy} disabled={isGenerating} className="rounded-xl gap-1.5">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRefineWithBrain} className="rounded-xl gap-1.5 text-violet-600 hover:text-violet-700 hover:bg-violet-500/5 border-violet-500/20">
                        <Brain className="w-3 h-3" /> Refine with Brand Intelligence
                      </Button>
                    <Button variant="outline" size="sm" onClick={handleToggleEdit} className="rounded-xl gap-1.5">
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    {strategyStatus === 'draft' && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleRejectStrategy} className="rounded-xl gap-1.5 text-destructive hover:text-destructive">
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                        <Button size="sm" onClick={handleApproveStrategy} className="rounded-xl gap-1.5 bg-green-600 hover:bg-green-700">
                          <Check className="w-3 h-3" /> Approve
                        </Button>
                      </>
                    )}
                    {strategyStatus === 'rejected' && (
                      <Button size="sm" onClick={handleGenerateStrategy} disabled={isGenerating} className="rounded-xl gap-1.5">
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Approval warning — employee only */}
            {strategyStatus === 'draft' && !editMode && viewMode !== 'client' && (
              <div className="bg-amber-500/[0.06] border border-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm">
                <Zap className="w-4 h-4 shrink-0 opacity-70" />
                <span>Approve this strategy to enable pipeline creation</span>
              </div>
            )}

            {/* Rejected notice */}
            {strategyStatus === 'rejected' && (
              <div className="bg-red-500/[0.06] border border-red-500/10 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm">
                <XCircle className="w-4 h-4 shrink-0 opacity-70" />
                <span>Strategy rejected. Regenerate to create a new one.</span>
              </div>
            )}

            {/* Duplicate pipeline warning */}
            {hasExistingPipeline && strategyStatus === 'approved' && (
              <div className="bg-blue-500/[0.06] border border-blue-500/10 text-blue-700 dark:text-blue-400 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 opacity-70" />
                <span>Pipeline already exists with {clientDrafts.length} draft{clientDrafts.length > 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Brand Angle */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-muted/20 border-b border-border/30 pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Target className="w-4 h-4 text-violet-500" /> Brand Angle
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {editMode && editedStrategy ? (
                  <Textarea
                    value={editedStrategy.brandAngle}
                    onChange={e => updateEditedField('brandAngle', e.target.value)}
                    className="text-sm min-h-[80px]"
                  />
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed">{strategy.brandAngle}</p>
                )}
              </CardContent>
            </Card>

            {/* Content Pillars + Hooks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/20 border-b border-border/30 pb-3">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-500" /> Content Pillars
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {editMode && editedStrategy ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {editedStrategy.contentPillars.map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                            {p}
                            <button onClick={() => removePillar(i)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newPillar} onChange={e => setNewPillar(e.target.value)} placeholder="Add pillar..." className="text-xs h-8" onKeyDown={e => e.key === 'Enter' && addPillar()} />
                        <Button size="sm" variant="outline" onClick={addPillar} className="h-8 text-xs"><Plus className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {strategy.contentPillars.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/20 border-b border-border/30 pb-3">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Hooks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border/30">
                    {(editMode && editedStrategy ? editedStrategy : strategy).hooks.map((hook, i) => (
                      <li key={i} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/20 transition-colors group">
                        <span className="text-[10px] text-muted-foreground/50 font-mono mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        {editMode && editedStrategy ? (
                          <Input value={hook} onChange={e => updateListItem('hooks', i, e.target.value)} className="text-sm h-7 flex-1" />
                        ) : (
                          <>
                            <p className="text-sm">{hook}</p>
                            <button onClick={() => { navigator.clipboard.writeText(hook); toast({ description: 'Hook copied' }); }}
                              className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all shrink-0">
                              <Copy className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Content Ideas */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-muted/20 border-b border-border/30 pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-500" /> Content Ideas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/30">
                  {(editMode && editedStrategy ? editedStrategy : strategy).contentIdeas.map((idea, i) => (
                    <li key={i} className="flex items-start gap-2.5 px-4 py-3 hover:bg-muted/20 transition-colors group">
                      <span className="text-[10px] text-muted-foreground/50 font-mono mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      {editMode && editedStrategy ? (
                        <Input value={idea} onChange={e => updateListItem('contentIdeas', i, e.target.value)} className="text-sm flex-1" />
                      ) : (
                        <p className="text-sm flex-1">{idea}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Posting Plan */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-muted/20 border-b border-border/30 pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" /> Weekly Posting Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Day</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Topic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editMode && editedStrategy ? editedStrategy : strategy).postingPlan.map((p, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{p.day}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {editMode && editedStrategy ? (
                            <Input value={p.type} onChange={e => updatePostingPlan(i, 'type', e.target.value)} className="text-xs h-7" />
                          ) : p.type}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {editMode && editedStrategy ? (
                            <Input value={p.topic} onChange={e => updatePostingPlan(i, 'topic', e.target.value)} className="text-xs h-7" />
                          ) : p.topic}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* CTA — only enabled when approved and no existing pipeline */}
            {/* CTA — employee only */}
            {viewMode !== 'client' && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleCreatePipelineFromStrategy}
                disabled={strategyStatus !== 'approved' || hasExistingPipeline}
                className="gap-2 rounded-xl shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" /> Create Pipeline from Strategy
                <ArrowRight className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {strategyStatus !== 'approved'
                  ? 'Approve strategy first'
                  : hasExistingPipeline
                    ? 'Pipeline already exists'
                    : 'Turns ideas into editable content drafts'}
              </span>
            </div>
            )}
          </motion.div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl" aria-describedby="delete-client-desc">
          <DialogHeader>
            <DialogTitle>Delete Client?</DialogTitle>
            <DialogDescription id="delete-client-desc">
              Are you sure you want to delete {client.businessName || client.name}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="rounded-xl" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function StrategyStatusBadge({ status }: { status: StrategyStatus }) {
  const config: Record<StrategyStatus, { label: string; bg: string; text: string; dot: string }> = {
    draft: { label: 'Draft', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    approved: { label: 'Approved', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
    rejected: { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
