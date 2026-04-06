import React from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { usePipeline } from '@/modules/pipeline/context/pipeline-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, Clock, CheckCircle2, ArrowRight, Sparkles, TrendingUp, Activity, PartyPopper, Pencil, CalendarDays, Eye, DollarSign, Users, Target, Video, Image, FileText, Lightbulb, X, AlertTriangle, Zap, Shield, ShieldAlert, ShieldCheck, MessageSquare, Crosshair, Gauge, ListChecks, Send, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadProfiles } from '@/lib/brand-memory';
import { useEffect, useState } from 'react';
import { loadDemoData, hasDemoData } from '@/lib/demo-data';
import { useToast } from '@/hooks/use-toast';
import { getRecentActivity } from '@/services/activity-log';
import { ActivityTimeline } from '@/components/activity-timeline';
import { useClients } from '@/modules/clients/context/client-context';
import { getActiveSuggestions, dismissSuggestion, getClientSuggestions, type AutomationSuggestion } from '@/services/automation';
import { getOnboardingCompletion } from '@/lib/client-memory';
import { calculateEngagementMetrics } from '@/lib/performance-reporting';
import { loadAllFlows } from '@/lib/approval-workflow';
import { getSystemHealthSummary, getTodayPriorities, getBottlenecks, getClientHealthScore, type TodayPriority, type Bottleneck, type ClientHealthScore, type ClientHealthStatus } from '@/lib/flow-health';
import { getGoalBreakdown, getGoalLabel, getGoalColor, calculatePillarGoalDistribution, type BusinessGoal, BUSINESS_GOALS } from '@/lib/goal-mapping';
import { getStaleFollowUps, type FollowUpSuggestion } from '@/lib/client-messages';

function SimpleBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Dashboard() {
  const { setView, viewStrategy, viewMode } = useWorkflow();
  const { drafts, refreshDrafts } = usePipeline();
  const { clients, activeClient, setActiveClient, refreshClients } = useClients();
  const { toast } = useToast();

  const [profileCount, setProfileCount] = useState(0);
  const [demoLoaded, setDemoLoaded] = useState(hasDemoData());
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);

  useEffect(() => {
    setProfileCount(loadProfiles().length);
  }, []);

  useEffect(() => {
    if (activeClient) {
      setSuggestions(getClientSuggestions(activeClient.id));
    } else {
      setSuggestions([]);
    }
  }, [activeClient]);

  const refreshSuggestions = () => {
    if (activeClient) {
      setSuggestions(getClientSuggestions(activeClient.id));
    } else {
      setSuggestions([]);
    }
  };

  const handleDismissSuggestion = (id: string) => {
    dismissSuggestion(id);
    refreshSuggestions();
  };

  const handleSuggestionAction = (suggestion: AutomationSuggestion) => {
    setView(suggestion.targetView as ReturnType<typeof useWorkflow>['view']);
    dismissSuggestion(suggestion.id);
    refreshSuggestions();
  };

  const handleLoadDemo = () => {
    const result = loadDemoData();
    setDemoLoaded(true);
    setProfileCount(loadProfiles().length);
    
    // Refresh both contexts to show new data immediately
    refreshClients();
    refreshDrafts();
    
    toast({
      title: 'Demo data loaded successfully',
      description: `${result.clientName} agency client with ${result.draftCount} drafts is now live.`,
    });
  };

  const scopedClients = activeClient ? [activeClient] : [];
  const scopedDrafts = activeClient ? drafts.filter(d => d.clientId === activeClient.id) : [];
  const scopedStrategies = activeClient ? (activeClient.strategies || []) : [];

  const totalDrafts = scopedDrafts.length;
  const approvedDrafts = scopedDrafts.filter(d => d.status === 'approved' || d.status === 'scheduled').length;
  const scheduledDrafts = scopedDrafts.filter(d => d.status === 'scheduled').length;
  const inReviewDrafts = scopedDrafts.filter(d => d.status === 'client_review' || d.status === 'internal_review').length;
  const newDrafts = scopedDrafts.filter(d => d.status === 'draft').length;

  // Content type breakdown
  const contentTypeCounts: Record<string, number> = {};
  scopedDrafts.forEach(d => d.platformVariants.forEach(v => {
    const label = v.platform.charAt(0).toUpperCase() + v.platform.slice(1).replace('_', ' ');
    contentTypeCounts[label] = (contentTypeCounts[label] || 0) + 1;
  }));
  const maxContentType = Math.max(...Object.values(contentTypeCounts), 1);

  // Pipeline conversion rates
  const conversionRate = totalDrafts > 0 ? Math.round((approvedDrafts / totalDrafts) * 100) : 0;
  const scheduleRate = totalDrafts > 0 ? Math.round((scheduledDrafts / totalDrafts) * 100) : 0;

  // Revenue (mock from monthlyValue)
  const totalRevenue = clients.reduce((sum, c) => sum + (c.monthlyPrice || 0), 0);
  const activeClientRevenue = activeClient?.monthlyPrice || 0;
  
  // When active client is selected, use ONLY that client's revenue for scoped displays
  const displayRevenue = activeClient ? activeClientRevenue : totalRevenue;

  // Engagement metrics
  const allFlows = loadAllFlows();
  const scopedFlows = activeClient ? allFlows.filter(flow => flow.clientId === activeClient.id) : [];
  const engagementMetrics = calculateEngagementMetrics(scopedDrafts, scopedFlows);

  const allStrategies = scopedStrategies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Strategies this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const strategiesThisWeek = allStrategies.filter(s => new Date(s.createdAt) >= oneWeekAgo).length;

  // Performance marked drafts
  const highPerforming = scopedDrafts.filter(d => d.performanceRating === 'high').length;
  const lowPerforming = scopedDrafts.filter(d => d.performanceRating === 'low').length;

  const healthSummary = getSystemHealthSummary(scopedClients, scopedDrafts, allStrategies);
  const todayPriorities = getTodayPriorities(scopedClients, scopedDrafts, allStrategies);
  const bottlenecks = getBottlenecks(scopedClients, scopedDrafts);
  const clientHealthScores = scopedClients.map(c => getClientHealthScore(c, scopedDrafts, scopedFlows));
  const atRiskClients = clientHealthScores.filter(c => c.status !== 'healthy').sort((a, b) => a.score - b.score);
  const allWaitingOnClient = bottlenecks.filter(b => b.type === 'waiting_on_client');
  const staleFollowUps = activeClient
    ? getStaleFollowUps().filter(fu => fu.clientId === activeClient.id)
    : [];

  const stats = [
    { title: "Total Strategies", value: allStrategies.length.toString(), icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Content Drafts", value: totalDrafts.toString(), icon: Pencil, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Approved", value: approvedDrafts.toString(), icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Scheduled", value: scheduledDrafts.toString(), icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  if (viewMode === 'client') {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const clientStrategies = activeClient?.strategies || [];
    const latestStrategy = clientStrategies[0] || null;

    const clientHealth = activeClient
      ? healthSummary.warnings.filter(w => w.clientId === activeClient.id)
      : [];

    const deriveMostUsedPlatform = (): string => {
      if (clientStrategies.length === 0) return 'N/A';
      const counts: Record<string, number> = {};
      clientStrategies.forEach(s => s.settings.platforms.forEach(p => { counts[p] = (counts[p] || 0) + 1; }));
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    };

    const lastGenerated = clientStrategies.length > 0 && clientStrategies[0].createdAt
      ? new Date(clientStrategies[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Never';

    const totalContentPieces = clientStrategies.reduce((acc, s) => acc + (s.ideas?.length || 0) + (s.hooks?.length || 0) + (s.captions?.length || 0), 0);

    const clientStats = [
      { label: 'Strategies Generated', value: clientStrategies.length.toString(), icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Content Pieces', value: totalContentPieces.toString(), icon: FileText, color: 'text-green-500', bg: 'bg-green-500/10' },
      { label: 'Last Generated', value: lastGenerated, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { label: 'Most Used Platform', value: deriveMostUsedPlatform(), icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ];

    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2">Client Report — {currentMonth}</h1>
              <p className="text-muted-foreground text-lg">Your strategy generation summary and content metrics.</p>
            </div>
          </div>
        </div>

        {clientHealth.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="space-y-2">
              {clientHealth.map((w, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${w.severity === 'critical' ? 'bg-red-500/[0.04] border-red-500/15' : w.severity === 'warning' ? 'bg-amber-500/[0.04] border-amber-500/15' : 'bg-blue-500/[0.04] border-blue-500/15'}`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${w.severity === 'critical' ? 'text-red-500' : w.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                  <p className="text-sm flex-1">{w.message}</p>
                  <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs rounded-lg" onClick={() => setView(w.targetView as any)}>
                    {w.actionLabel}
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {clientStats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Strategy Summary</p>
                  {latestStrategy ? (
                    <>
                      <h3 className="font-display font-bold text-xl">{latestStrategy.settings.niche} Strategy</h3>
                      <p className="text-sm text-muted-foreground mt-1">{latestStrategy.settings.goal}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-display font-bold text-xl">No strategy yet</h3>
                      <p className="text-sm text-muted-foreground mt-1">Create your first strategy to see a summary</p>
                    </>
                  )}
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
              </div>
              {latestStrategy ? (
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platforms</span>
                    <span className="font-medium">{latestStrategy.settings.platforms.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Content Pieces</span>
                    <span className="font-medium">{(latestStrategy.ideas?.length || 0) + (latestStrategy.hooks?.length || 0) + (latestStrategy.captions?.length || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calendar Days</span>
                    <span className="font-medium">{latestStrategy.calendar?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tone</span>
                    <span className="font-medium capitalize">{latestStrategy.settings.tone}</span>
                  </div>
                  {latestStrategy.settings.goal && (() => {
                    const breakdown = getGoalBreakdown(latestStrategy.settings.goal);
                    return (
                      <div className="pt-2 mt-2 border-t border-border/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Goal Focus</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getGoalColor(breakdown.primary)}`}>
                            {breakdown.label}
                          </span>
                        </div>
                        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                          {BUSINESS_GOALS.map(g => (
                            <div key={g} className={`rounded-full transition-all ${g === 'awareness' ? 'bg-blue-500' : g === 'engagement' ? 'bg-purple-500' : g === 'leads' ? 'bg-amber-500' : g === 'sales' ? 'bg-green-500' : 'bg-rose-500'}`}
                              style={{ width: `${breakdown.distribution[g]}%` }} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                          {BUSINESS_GOALS.filter(g => breakdown.distribution[g] > 0).map(g => (
                            <span key={g} className="text-[10px] text-muted-foreground">
                              {getGoalLabel(g)} {breakdown.distribution[g]}%
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <Button size="sm" variant="outline" className="rounded-xl mt-2" onClick={() => setView('clients')}>
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Open Client Workspace
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Client Analytics */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Content Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {totalDrafts > 0 ? (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Draft</span>
                      <span className="font-medium">{newDrafts}</span>
                    </div>
                    <SimpleBar value={newDrafts} max={totalDrafts} color="bg-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">In Review</span>
                      <span className="font-medium">{inReviewDrafts}</span>
                    </div>
                    <SimpleBar value={inReviewDrafts} max={totalDrafts} color="bg-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Approved</span>
                      <span className="font-medium text-green-600">{approvedDrafts}</span>
                    </div>
                    <SimpleBar value={approvedDrafts} max={totalDrafts} color="bg-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Scheduled</span>
                      <span className="font-medium text-purple-600">{scheduledDrafts}</span>
                    </div>
                    <SimpleBar value={scheduledDrafts} max={totalDrafts} color="bg-purple-500" />
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No content drafts yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Employee view
  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-20">
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2">
          {activeClient ? `${activeClient.businessName || activeClient.name} Dashboard` : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {activeClient ? 'All metrics below are scoped to the active client.' : 'Select an active client to view client-scoped metrics.'}
        </p>
      </div>

      {!activeClient && (
        <div className="mb-8 space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-base font-semibold">No active client selected</p>
                <p className="text-sm text-muted-foreground mt-1">Choose a client from the sidebar to unlock client-specific dashboard stats.</p>
              </div>
              <Button onClick={() => setView('clients')} className="rounded-xl">Go to Clients</Button>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Agency Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Monthly Revenue (All Clients)</p>
              <p className="text-3xl font-display font-bold mt-1">INR {totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeClient && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl"
              >
                <Lightbulb className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm flex-1">{suggestion.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => handleSuggestionAction(suggestion)}
                >
                  {suggestion.action}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-6 w-6 p-0"
                  onClick={() => handleDismissSuggestion(suggestion.id)}
                  aria-label="Dismiss suggestion"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeClient && healthSummary.totalWarnings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className={`p-4 rounded-2xl border ${healthSummary.criticalCount > 0 ? 'bg-red-500/[0.04] border-red-500/15' : 'bg-amber-500/[0.04] border-amber-500/15'}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={`w-4 h-4 ${healthSummary.criticalCount > 0 ? 'text-red-500' : 'text-amber-500'}`} />
              <p className="text-sm font-semibold">
                {healthSummary.totalWarnings} issue{healthSummary.totalWarnings > 1 ? 's' : ''} need attention
                {healthSummary.stuckDraftsTotal > 0 && ` · ${healthSummary.stuckDraftsTotal} stuck draft${healthSummary.stuckDraftsTotal > 1 ? 's' : ''}`}
                {healthSummary.approvedUnscheduledTotal > 0 && ` · ${healthSummary.approvedUnscheduledTotal} unscheduled`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {healthSummary.warnings.slice(0, 4).map((w, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="outline"
                  className={`h-7 text-xs rounded-lg gap-1.5 ${w.severity === 'critical' ? 'border-red-500/30 text-red-600 hover:bg-red-500/5' : w.severity === 'warning' ? 'border-amber-500/30 text-amber-600 hover:bg-amber-500/5' : ''}`}
                  onClick={() => {
                    setActiveClient(clients.find(c => c.id === w.clientId) || null);
                    setView(w.targetView as any);
                  }}
                >
                  {w.clientName}: {w.actionLabel}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeClient && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            key={i}
          >
            <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>}

      {activeClient && <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Strategies This Week */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" /> This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="text-center mb-4">
                <p className="text-4xl font-display font-bold text-foreground">{strategiesThisWeek}</p>
                <p className="text-sm text-muted-foreground">strategies generated</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total all time</span>
                  <span className="font-medium">{allStrategies.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High performing</span>
                  <span className="font-medium text-green-600">{highPerforming}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Types Mix */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" /> Platform Mix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {Object.keys(contentTypeCounts).length > 0 ? (
                Object.entries(contentTypeCounts).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
                  <div key={platform}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{platform}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <SimpleBar value={count} max={maxContentType} color="bg-amber-500" />
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No content yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pipeline Conversion & Engagement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" /> Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Approval Rate</span>
                  <span className="font-medium text-green-600">{conversionRate}%</span>
                </div>
                <SimpleBar value={conversionRate} max={100} color="bg-green-500" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground" title="Based on content quality: hooks, captions, CTA strength">Engagement Score</span>
                  <span className="font-medium">{engagementMetrics.estimatedEngagementScore}/100</span>
                </div>
                <SimpleBar value={engagementMetrics.estimatedEngagementScore} max={100} color="bg-blue-500" />
                <p className="mt-1 text-[11px] text-muted-foreground">Based on content quality: hooks, captions, CTA strength</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground" title="Based on how regularly content is created">Content Consistency</span>
                  <span className="font-medium">{engagementMetrics.contentConsistencyScore}/100</span>
                </div>
                <SimpleBar value={engagementMetrics.contentConsistencyScore} max={100} color="bg-purple-500" />
                <p className="mt-1 text-[11px] text-muted-foreground">Based on how regularly content is created</p>
              </div>
              <div className="pt-3 border-t border-border/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground" title="Time taken to approve drafts">Avg. Approval Time</span>
                  <span className="text-sm font-medium">{engagementMetrics.avgApprovalDelayHours}h</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Time taken to approve drafts</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    engagementMetrics.trend === 'improving' ? 'bg-green-500/10 text-green-600' :
                    engagementMetrics.trend === 'declining' ? 'bg-red-500/10 text-red-500' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {engagementMetrics.trend === 'improving' ? '↑' : engagementMetrics.trend === 'declining' ? '↓' : '→'} {engagementMetrics.trendLabel}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                These improve as your team creates and approves more content.
              </p>
              <div className="pt-3 border-t border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Monthly Revenue from Active Client</span>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">
                  INR {activeClientRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Monthly Revenue (All Clients): INR {totalRevenue.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>}

      {/* Today's Priorities + Clients at Risk */}
      {activeClient && (todayPriorities.length > 0 || atRiskClients.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Today's Priorities */}
          {todayPriorities.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-border/60 shadow-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-primary" /> Today's Priorities
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {todayPriorities.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${p.urgency === 'high' ? 'bg-red-500' : p.urgency === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.label}</p>
                        <p className="text-xs text-muted-foreground">{p.clientName}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 text-xs shrink-0 px-2"
                        onClick={() => {
                          setActiveClient(clients.find(c => c.id === p.clientId) || null);
                          setView(p.targetView as any);
                        }}>
                        {p.actionLabel}
                      </Button>
                    </div>
                  ))}
                  {todayPriorities.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{todayPriorities.length - 5} more items</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Clients at Risk */}
          {atRiskClients.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-border/60 shadow-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" /> Clients at Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {atRiskClients.slice(0, 5).map((ch, i) => (
                    <div key={ch.clientId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setActiveClient(clients.find(c => c.id === ch.clientId) || null);
                        setView('pipeline');
                      }}>
                      {ch.status === 'critical'
                        ? <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                        : <Shield className="w-4 h-4 text-amber-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ch.clientName}</p>
                        <p className="text-xs text-muted-foreground">{ch.factors.filter(f => f.impact === 'negative').slice(0, 2).map(f => f.label).join(' · ') || 'No issues'}</p>
                      </div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${ch.status === 'critical' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        {ch.score}/100
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Bottlenecks */}
      {activeClient && bottlenecks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Bottlenecks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {bottlenecks.slice(0, 6).map((b, i) => (
                  <button key={i}
                    onClick={() => {
                      setActiveClient(clients.find(c => c.id === b.clientId) || null);
                      setView(b.targetView as any);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${b.type === 'waiting_on_client' ? 'bg-blue-500/[0.06] border-blue-500/15 text-blue-600 hover:bg-blue-500/10' : b.type === 'overdue_draft' ? 'bg-red-500/[0.06] border-red-500/15 text-red-600 hover:bg-red-500/10' : 'bg-amber-500/[0.06] border-amber-500/15 text-amber-600 hover:bg-amber-500/10'}`}>
                    <span className="font-semibold">{b.clientName}:</span> {b.message}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Smart Follow-ups */}
      {activeClient && staleFollowUps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-border/60 shadow-sm border-l-[3px] border-l-blue-400/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" /> Follow-ups Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {staleFollowUps.slice(0, 3).map((fu, i) => (
                <div key={fu.threadId} className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/[0.03] border border-blue-500/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{clients.find(c => c.id === fu.clientId)?.name || 'Client'}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{fu.daysStale}d stale</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{fu.suggestedMessage}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 gap-1 border-blue-500/20 text-blue-600 hover:bg-blue-500/5"
                    onClick={() => {
                      setActiveClient(clients.find(c => c.id === fu.clientId) || null);
                      setView('pipeline');
                    }}>
                    <Send className="w-3 h-3" /> Send
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeClient && <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold">Recent Strategies</h2>
            {allStrategies.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                {allStrategies.length} saved
              </span>
            )}
          </div>

          {allStrategies.length > 0 ? (
            <div className="space-y-4">
              {allStrategies.slice(0, 5).map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  key={item.id}
                  className="bg-card border border-border/50 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-primary/30 transition-colors group cursor-pointer hover-elevate"
                  onClick={() => viewStrategy(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {item.settings.niche.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.settings.niche} Campaign</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.settings.platforms.join(', ')} · {item.settings.goal}
                        {item.createdAt && (
                          <span className="ml-2 opacity-60">
                            · {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/30 border border-dashed border-border/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No strategies yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">You haven't generated any social media strategies. Create your first one to see it here.</p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button onClick={() => setView('create')} className="active-elevate-2 shadow-md shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" /> Create First Strategy
                </Button>
                {!demoLoaded && (
                  <Button onClick={handleLoadDemo} variant="outline" className="rounded-xl gap-2">
                    <PartyPopper className="w-4 h-4" /> Load Demo Data
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          {/* Context-aware right panel: pipeline summary when data exists, CTA when empty */}
          {allStrategies.length > 0 || totalDrafts > 0 ? (
            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-display font-bold text-base">Pipeline Status</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setView('pipeline')}>
                  View all <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  { label: 'Draft', count: newDrafts, color: 'bg-slate-400' },
                  { label: 'In Review', count: inReviewDrafts, color: 'bg-primary' },
                  { label: 'Approved', count: approvedDrafts - scheduledDrafts, color: 'bg-green-500' },
                  { label: 'Scheduled', count: scheduledDrafts, color: 'bg-blue-500' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                    <span className="text-sm text-muted-foreground flex-1">{label}</span>
                    <span className="text-sm font-semibold tabular-nums">{count}</span>
                    {totalDrafts > 0 && (
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round((count / totalDrafts) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
                {totalDrafts === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    No pipeline drafts yet — create a strategy then click "Create Pipeline".
                  </p>
                )}
              </div>
              {allStrategies.length > 0 && (
                <div className="px-6 pb-5">
                  <Button onClick={() => setView('clients')} variant="outline" size="sm" className="w-full rounded-xl gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Open Client Workspace
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <Sparkles className="w-10 h-10 mb-6 text-white/90" />
                <h3 className="text-2xl font-display font-bold mb-3">Ready to create?</h3>
                <p className="text-primary-foreground/80 mb-8 leading-relaxed">
                  Generate 30 days of content in under 2 minutes.
                </p>
                <Button
                  onClick={() => setView('clients')}
                  className="w-full bg-white text-primary hover:bg-white/90 active-elevate-2 font-semibold text-lg py-6"
                >
                  Open Clients <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
          {/* Activity Timeline */}
          <div className="mt-6">
            <ActivityTimeline entries={getRecentActivity(8)} maxItems={8} />
          </div>
        </div>
      </div>}
    </div>
  );
}
