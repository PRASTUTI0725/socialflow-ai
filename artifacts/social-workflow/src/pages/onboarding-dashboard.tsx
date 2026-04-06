import React, { useState } from 'react';
import { useClients } from '@/modules/clients/context/client-context';
import { useWorkflow } from '@/context/workflow-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Sparkles, AlertTriangle, ClipboardCheck, Zap, Lightbulb, ChevronDown, Edit } from 'lucide-react';
import { ONBOARDING_ITEMS, getOnboardingWarnings, canTriggerStrategy, getNicheSuggestions } from '@/lib/onboarding';
import { cn } from '@/lib/utils';
import { calculateOnboardingProgress, deriveOnboardingChecklistFromProfile, getClientProfileMissingFieldLabels, getClientProfileMissingFields } from '@/modules/clients/lib/client-types';

export function OnboardingDashboard() {
  const { activeClient } = useClients();
  const { setView, setOnboardingEditingSection } = useWorkflow();
  const [quickMode, setQuickMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!activeClient) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <Card className="border-border/60">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No client selected</h3>
            <p className="text-muted-foreground mb-4">Pick a client to start onboarding.</p>
            <Button onClick={() => setView('clients')} variant="outline">
              Go to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = activeClient.clientProfile;
  const requiredMissing = getClientProfileMissingFields(profile);
  const requiredMissingLabels = getClientProfileMissingFieldLabels(profile);

  // Single source of truth: always derived from real clientProfile field data
  const requiredCompletion = calculateOnboardingProgress(activeClient);

  const warnings = getOnboardingWarnings(profile);
  const canGenerate = canTriggerStrategy(profile);
  const nicheSuggestion = getNicheSuggestions(activeClient.niche || activeClient.brandProfile.niche);
  const onboardingChecklist = deriveOnboardingChecklistFromProfile(profile);

  const getEditSectionForChecklistKey = (key: string): string => {
    if (key === 'industry') return 'niche';
    if (key === 'brandName') return 'name';
    if (key === 'platforms') return 'platforms';
    if (key === 'contentPreferences') return 'contentPreferences';
    if (key === 'messaging') return 'messaging';
    if (key === 'usp') return 'usp';
    if (key === 'geography') return 'geography';
    if (key === 'challenges') return 'challenges';
    if (key === 'targetAudience') return 'targetAudience';
    if (key === 'goals') return 'goals';
    if (key === 'brandVoice') return 'brandVoice';
    return 'name';
  };

  const handleItemClick = (key: string) => {
    const section = getEditSectionForChecklistKey(key);
    setOnboardingEditingSection(section);
    setView('clients');
  };

  const handleQuickOnboard = () => {
    const firstRequiredMissing = requiredMissing[0];
    const section = firstRequiredMissing ? getEditSectionForChecklistKey(firstRequiredMissing) : 'name';
    setOnboardingEditingSection(section);
    setView('clients');
    setQuickMode(false);
  };

  const categories = ['brand', 'strategy', 'audience'] as const;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full pb-20">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => setView('clients')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Onboarding — {activeClient.businessName || activeClient.name}
            </h1>
            <p className="text-muted-foreground text-lg mb-1">
              Fill in the basics to unlock strategy generation.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Complete these to improve strategy quality
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant={requiredCompletion === 100 ? 'default' : 'secondary'}
              className={requiredCompletion === 100 ? 'bg-green-500 text-white' : ''}
            >
              Completed: {requiredCompletion}%
            </Badge>
            <span className={cn(
              "text-[10px] uppercase font-bold tracking-wider",
              requiredCompletion >= 80 ? "text-green-600" : requiredCompletion >= 50 ? "text-amber-600" : "text-red-500"
            )}>
              Profile quality: {requiredCompletion >= 80 ? "Strong" : requiredCompletion >= 50 ? "Medium" : "Weak"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Onboarding Banner */}
      {!canGenerate && !quickMode && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Want to skip ahead?</p>
                  <p className="text-xs text-muted-foreground">Use Quick Setup to auto-fill the required fields and start generating right away.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setQuickMode(true)} className="shrink-0 gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Quick Setup
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Onboarding Mode */}
      {quickMode && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-green-500/20 bg-green-500/[0.03]">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Quick Setup</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                This will mark Goals, Target Audience, and Brand Voice as complete using your client profile data.
                You can always fill in the remaining details later.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleQuickOnboard} className="bg-green-600 hover:bg-green-700">
                  <Zap className="w-3.5 h-3.5 mr-1.5" /> Apply Quick Setup
                </Button>
                <Button size="sm" variant="outline" onClick={() => setQuickMode(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="mb-6">
        <Progress value={requiredCompletion} className="h-3" />
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-muted-foreground">
            {requiredMissing.length === 0
              ? '✅ All required fields complete!'
              : `${requiredMissing.length} required field${requiredMissing.length > 1 ? 's' : ''} remaining`}
          </p>
          <span className="text-sm font-semibold">{requiredCompletion}%</span>
        </div>
        
        {/* Status Indicator */}
        {requiredCompletion >= 80 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              🟢 Strong profile — high quality strategy expected
            </p>
          </div>
        )}
        {requiredCompletion >= 50 && requiredCompletion < 80 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              🟡 Medium — strategy may need edits
            </p>
          </div>
        )}
        {requiredCompletion < 50 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400 font-medium">
              🔴 Weak profile — output may be generic
            </p>
          </div>
        )}
      </div>

      {/* Smart Suggestions */}
      {nicheSuggestion && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/15 hover:bg-amber-500/[0.08] transition-colors text-left"
            aria-label="Toggle smart suggestions"
          >
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm font-medium flex-1">Smart suggestions for {activeClient.niche || activeClient.brandProfile.niche || 'your niche'}</span>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showSuggestions && "rotate-180")} />
          </button>
          {showSuggestions && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Audiences</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nicheSuggestion.audiences.map(a => (
                        <button
                          key={a}
                          onClick={() => {
                            // Can't toggle directly anymore, user must fill it in the form
                            setView('onboarding');
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Content Pillars</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nicheSuggestion.contentPillars.map(p => (
                        <span key={p} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Tones</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nicheSuggestion.tones.map(t => (
                        <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-700 dark:text-amber-400">{w}</p>
                  ))}
                  {requiredMissingLabels.length > 0 && (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Missing required fields: {requiredMissingLabels.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="space-y-8">
        {categories.map((category) => {
          const categoryItems = ONBOARDING_ITEMS.filter(item => item.category === category);
          if (categoryItems.length === 0) return null;

          const categoryLabel = category === 'brand' ? 'Brand Assets' : category === 'strategy' ? 'Strategy' : 'Audience';

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categories.indexOf(category) * 0.1 }}
            >
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{categoryLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryItems.map((item) => {
                    const isComplete = onboardingChecklist[item.key as keyof typeof onboardingChecklist];
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleItemClick(item.key)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                        aria-label={`Edit ${item.label}`}
                      >
                        {isComplete ? (
                          <span className="text-lg mt-[-2px]">✅</span>
                        ) : (
                          <span className="text-lg mt-[-2px]">⭕</span>
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${isComplete ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {item.label}
                          </p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 shrink-0 text-xs px-2 py-1 rounded-lg border border-border/50 bg-background text-foreground">
                          <Edit className="w-3 h-3" />
                          {isComplete ? 'Edit' : 'Add Data'}
                        </span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Confidence Indicator */}
      {canGenerate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8"
        >
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-semibold text-foreground">You're ready to generate strategy</p>
                    <p className="text-sm text-muted-foreground">
                      All required fields are complete.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setView('create')} className="bg-green-600 hover:bg-green-700">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Strategy
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
