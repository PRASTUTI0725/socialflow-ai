import React, { useState } from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { usePipeline } from '@/modules/pipeline/context/pipeline-context';
import { useClients } from '@/modules/clients/context/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  FileText, ArrowLeft, Sparkles, CheckCircle2, Clock, Target,
  TrendingUp, Lightbulb, CalendarDays, BarChart3, Download, Printer,
  ArrowRight, Star, AlertCircle, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateReport, saveReport, getLatestReport, type ClientReport } from '@/lib/client-report';
import { getGoalColor, getGoalLabel, BUSINESS_GOALS, type BusinessGoal } from '@/lib/goal-mapping';

export function ClientReportPage() {
  const { setView } = useWorkflow();
  const { drafts } = usePipeline();
  const { activeClient, clients } = useClients();
  const { toast } = useToast();
  const [report, setReport] = useState<ClientReport | null>(
    activeClient ? getLatestReport(activeClient.id) : null
  );

  const handleGenerate = () => {
    if (!activeClient) return;
    const newReport = generateReport(activeClient, drafts, activeClient.strategies || []);
    saveReport(newReport);
    setReport(newReport);
    toast({ title: 'Report generated', description: `Monthly report for ${activeClient.name} is ready.` });
  };

  const handlePrint = () => window.print();

  const handleCopy = () => {
    if (!report) return;
    const text = buildReportText(report);
    navigator.clipboard.writeText(text).then(() => {
      toast({ description: 'Report copied to clipboard' });
    });
  };

  if (!activeClient) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <Card className="border-border/60">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No client selected</h3>
            <p className="text-muted-foreground mb-4">Select a client to generate a report.</p>
            <Button onClick={() => setView('clients')} variant="outline">Go to Clients</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full pb-20">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Client Report — {activeClient.businessName || activeClient.name}
            </h1>
            <p className="text-muted-foreground text-lg">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} performance summary
            </p>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopy} className="rounded-lg gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-lg gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
              </>
            )}
            <Button onClick={handleGenerate} className="rounded-lg gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {report ? 'Regenerate' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </div>

      {!report ? (
        <Card className="border-border/60">
          <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No report generated yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Generate a monthly report to share with {activeClient.businessName || activeClient.name}. It will include work done, performance insights, learnings, and next steps.
              </p>
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="w-4 h-4" /> Generate Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <Card className="border-border/60 bg-gradient-to-br from-primary/[0.04] to-card">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold">{report.summary.niche} Strategy</h2>
                  <p className="text-sm text-muted-foreground">{report.period}</p>
                </div>
              </div>
              <p className="text-lg font-medium text-foreground mb-4">
                This month we focused on: <span className="text-primary font-semibold">{report.summary.goal}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {report.summary.platforms.map(p => (
                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                ))}
                <Badge className={`text-xs border ${getGoalColor(report.summary.goalType)}`}>
                  {report.summary.goalLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Work Done */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Work Done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <StatBlock label="Content Pieces" value={report.workDone.totalDrafts} />
                <StatBlock label="Published" value={report.workDone.published} color="text-purple-600" />
                <StatBlock label="Approved" value={report.workDone.scheduled} color="text-green-600" />
                <StatBlock label="In Review" value={report.workDone.inReview} color="text-amber-600" />
              </div>
              {Object.keys(report.workDone.byPlatform).length > 0 && (
                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform Breakdown</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(report.workDone.byPlatform).map(([platform, count]) => (
                      <span key={platform} className="text-sm">
                        <span className="font-medium">{count}</span>
                        <span className="text-muted-foreground ml-1">{platform}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" /> Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Approval Rate</span>
                    <span className="font-semibold">{report.performance.approvalRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${report.performance.approvalRate}%` }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold">{report.performance.totalApproved}</p>
                  <p className="text-xs text-muted-foreground">of {report.performance.totalReviewed}</p>
                </div>
              </div>

              {report.performance.topContent.length > 0 && (
                <div className="pt-3 border-t border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Performing Content</p>
                  </div>
                  <ul className="space-y-1.5">
                    {report.performance.topContent.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learnings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/60 border-l-[3px] border-l-green-400/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> What Worked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {report.learnings.worked.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/60 border-l-[3px] border-l-amber-400/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" /> What Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {report.learnings.didntWork.length > 0 ? (
                    report.learnings.didntWork.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No issues identified — all content on track</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Next Plan */}
          <Card className="border-border/60 bg-gradient-to-r from-card to-primary/[0.02]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> What's Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.nextPlan.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </span>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Goal Alignment Insight */}
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold">Strategy Alignment</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{report.insights.contentVelocity}</p>
                <p>{report.insights.goalAlignment}</p>
                <p>{report.insights.platformBreakdown}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-muted/30">
      <p className={`text-2xl font-display font-bold ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function buildReportText(report: ClientReport): string {
  let text = `CLIENT REPORT: ${report.clientName} — ${report.period}\n\n`;
  text += `GOAL: ${report.summary.goal}\n`;
  text += `PLATFORMS: ${report.summary.platforms.join(', ')}\n\n`;
  text += `WORK DONE:\n`;
  text += `- ${report.workDone.totalDrafts} content pieces produced\n`;
  text += `- ${report.workDone.published} published\n`;
  text += `- ${report.workDone.scheduled} approved\n\n`;
  text += `PERFORMANCE:\n`;
  text += `- Approval rate: ${report.performance.approvalRate}%\n`;
  if (report.performance.topContent.length > 0) {
    text += `- Top content:\n`;
    report.performance.topContent.forEach(c => text += `  * ${c}\n`);
  }
  text += `\nWHAT WORKED:\n`;
  report.learnings.worked.forEach(l => text += `- ${l}\n`);
  text += `\nWHAT NEEDS ATTENTION:\n`;
  report.learnings.didntWork.forEach(l => text += `- ${l}\n`);
  text += `\nNEXT STEPS:\n`;
  report.nextPlan.forEach((p, i) => text += `${i + 1}. ${p}\n`);
  return text;
}
