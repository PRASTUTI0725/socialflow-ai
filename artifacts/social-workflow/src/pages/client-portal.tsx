import React, { useState } from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { usePipeline } from '@/modules/pipeline/context/pipeline-context';
import { useClients } from '@/modules/clients/context/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  CalendarDays, CheckCircle2, Clock, FileText, BarChart3,
  MessageSquare, ArrowLeft, Eye, TrendingUp, Target,
  Sparkles, ArrowRight, Star, Shield, ShieldCheck, ShieldAlert,
  Rocket, Brain, Zap
} from 'lucide-react';
import { getClientHealthScore, getStuckDrafts, type ClientHealthScore } from '@/lib/flow-health';
import { getGoalBreakdown, getGoalLabel, getGoalColor, BUSINESS_GOALS, type BusinessGoal } from '@/lib/goal-mapping';
import { loadAllFlows } from '@/lib/approval-workflow';

export function ClientPortalPage() {
  const { viewMode, setView } = useWorkflow();
  const { drafts, getApprovalFlow } = usePipeline();
  const { activeClient } = useClients();

  if (!activeClient) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <Card className="border-border/60">
          <CardContent className="p-12 text-center">
            <Eye className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No client selected</h3>
            <p className="text-muted-foreground mb-4">Select a client to view their portal.</p>
            <Button onClick={() => setView('clients')} variant="outline">Go to Clients</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientDrafts = drafts.filter(d => d.clientId === activeClient.id);
  const clientStrategies = activeClient.strategies || [];
  const latestStrategy = clientStrategies[0] || null;
  const flows = loadAllFlows();

  const healthScore = getClientHealthScore(activeClient, drafts, flows);
  const stuckDrafts = getStuckDrafts(clientDrafts);

  const draft = clientDrafts.filter(d => d.status === 'draft').length;
  const inReview = clientDrafts.filter(d => d.status === 'internal_review' || d.status === 'client_review').length;
  const approved = clientDrafts.filter(d => d.status === 'approved').length;
  const scheduled = clientDrafts.filter(d => d.status === 'scheduled').length;
  const totalContent = clientDrafts.length;

  const pendingApprovals = clientDrafts.filter(d => {
    const flow = getApprovalFlow(d.id);
    return flow && flow.overallStatus !== 'approved';
  });

  const highPerforming = clientDrafts.filter(d => d.performanceRating === 'high');
  const goalBreakdown = latestStrategy ? getGoalBreakdown(latestStrategy.settings.goal) : null;

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-20">
      {/* Premium Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2 truncate" title={activeClient.businessName || activeClient.name}>
              {activeClient.businessName || activeClient.name}
            </h1>
            <p className="text-muted-foreground text-lg">{currentMonth} Content Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <HealthBadge score={healthScore} />
            <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => setView('client-report')}>
              <FileText className="w-3.5 h-3.5" /> View Report
            </Button>
          </div>
        </div>
      </div>

      {/* What We're Doing — Hero Card */}
      {latestStrategy && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-primary/[0.02] shadow-sm">
            <CardContent className="p-6 lg:p-8">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Current Strategy</p>
                  </div>
                  <h2 className="text-2xl font-display font-bold mb-2">
                    {latestStrategy.settings.niche} — {latestStrategy.settings.goal}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Targeting {latestStrategy.settings.targetAudience.toLowerCase()} with a {latestStrategy.settings.tone.toLowerCase()} tone.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {latestStrategy.settings.platforms.map(p => (
                      <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
                {goalBreakdown && (
                  <div className="w-48 shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Goal Focus</p>
                    <div className={`text-sm font-bold px-3 py-1.5 rounded-lg border mb-3 ${getGoalColor(goalBreakdown.primary)}`}>
                      {goalBreakdown.label}
                    </div>
                    <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mb-2">
                      {BUSINESS_GOALS.map(g => (
                        <div key={g}
                          className={`rounded-full ${g === 'awareness' ? 'bg-blue-500' : g === 'engagement' ? 'bg-purple-500' : g === 'leads' ? 'bg-amber-500' : g === 'sales' ? 'bg-green-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.max(goalBreakdown.distribution[g], 2)}%` }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {BUSINESS_GOALS.filter(g => goalBreakdown.distribution[g] > 0).map(g => (
                        <span key={g} className="text-[10px] text-muted-foreground">
                          {getGoalLabel(g)} {goalBreakdown.distribution[g]}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Progress Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: totalContent, icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
          { label: 'Draft', value: draft, icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
          { label: 'In Review', value: inReview, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Approved', value: approved, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Scheduled', value: scheduled, icon: CalendarDays, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-display font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Content Progress Bar */}
      {totalContent > 0 && (
        <Card className="border-border/60 mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Content Progress</span>
              <span className="text-muted-foreground">{scheduled} of {totalContent} published</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
              <div className="h-full bg-slate-400 transition-all" style={{ width: `${(draft / totalContent) * 100}%` }} title="Draft" />
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${(inReview / totalContent) * 100}%` }} title="In Review" />
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(approved / totalContent) * 100}%` }} title="Approved" />
              <div className="h-full bg-purple-500 transition-all" style={{ width: `${(scheduled / totalContent) * 100}%` }} title="Scheduled" />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Draft</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> In Review</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Approved</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Scheduled</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-Column: What's Next + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* What's Coming Next */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> What's Coming Next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {approved > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/[0.04] border border-green-500/10">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-sm">{approved} piece{approved > 1 ? 's' : ''} ready for publishing</p>
              </div>
            )}
            {inReview > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm">{inReview} piece{inReview > 1 ? 's' : ''} in review — awaiting feedback</p>
              </div>
            )}
            {scheduled > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/10">
                <CalendarDays className="w-4 h-4 text-purple-500 shrink-0" />
                <p className="text-sm">{scheduled} piece{scheduled > 1 ? 's' : ''} already scheduled</p>
              </div>
            )}
            {draft > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm">{draft} draft{draft > 1 ? 's' : ''} in production</p>
              </div>
            )}
            {totalContent === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Content pipeline being set up</p>
            )}
          </CardContent>
        </Card>

        {/* Performance Snapshot */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> Performance Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Health Score</span>
                <span className={`font-bold ${healthScore.status === 'healthy' ? 'text-green-600' : healthScore.status === 'at_risk' ? 'text-amber-600' : 'text-red-600'}`}>
                  {healthScore.score}/100
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${healthScore.status === 'healthy' ? 'bg-green-500' : healthScore.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${healthScore.score}%` }} />
              </div>
            </div>

            {highPerforming.length > 0 && (
              <div className="pt-2 border-t border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Content</p>
                </div>
                {highPerforming.slice(0, 3).map((d, i) => (
                  <div key={d.id} className="flex items-start gap-2 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground truncate">{d.sourceIdea}</p>
                  </div>
                ))}
              </div>
            )}

            {healthScore.factors.length > 0 && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
                {healthScore.factors.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${f.impact === 'positive' ? 'bg-green-500' : f.impact === 'negative' ? 'bg-red-500' : 'bg-muted-foreground'}`} />
                    <span className="text-muted-foreground">{f.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card className="border-border/60 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" /> Needs Your Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingApprovals.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.sourceIdea}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{d.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{d.platformVariants.map(v => v.platform).join(', ')}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setView('pipeline')}>
                    Review <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Content */}
      {scheduled > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-500" /> Scheduled Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientDrafts.filter(d => d.status === 'scheduled').slice(0, 6).map(d => (
                <div key={d.id} className="p-3 rounded-xl border border-border/40 hover:border-border/60 transition-colors">
                  <p className="text-sm font-medium truncate mb-1">{d.sourceIdea}</p>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3 h-3 text-purple-500" />
                    <span className="text-xs text-muted-foreground">
                      {d.scheduledDate ? new Date(d.scheduledDate).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HealthBadge({ score }: { score: ClientHealthScore }) {
  if (score.status === 'healthy') {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
        <ShieldCheck className="w-3 h-3" /> Healthy
      </Badge>
    );
  }
  if (score.status === 'at_risk') {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
        <Shield className="w-3 h-3" /> At Risk
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
      <ShieldAlert className="w-3 h-3" /> Critical
    </Badge>
  );
}
