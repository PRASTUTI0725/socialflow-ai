import React from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { useClients } from '@/modules/clients/context/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain, User, Target, Mic2, MessageSquare, AlertCircle, Edit3, Briefcase, Sparkles, Activity, Zap, ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  calculateOnboardingProgress,
  getClientProfileMissingFieldLabels,
  isClientProfileComplete,
} from '@/modules/clients/lib/client-types';
import { calculateLearningProgress } from '@/modules/clients/lib/brand-intelligence';

export function BrandProfilePage() {
  const { activeClient } = useClients();
  const { setView } = useWorkflow();

  if (!activeClient) {
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-6">
            <Brain className="w-10 h-10 text-violet-400" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">No active client selected</h3>
          <p className="text-muted-foreground max-w-sm mb-8">
            Please select a client from the Client Portal to access their Client Insights.
          </p>
          <Button onClick={() => setView('clients')} className="gap-2 rounded-xl shadow-md shadow-primary/20">
            <User className="w-4 h-4" /> Go to Client Portal
          </Button>
        </div>
      </div>
    );
  }

  const profile = activeClient.clientProfile;
  const isComplete = isClientProfileComplete(profile);
  const missingFields = getClientProfileMissingFieldLabels(profile);

  const profileStrength = calculateOnboardingProgress(activeClient);
  const profileStrengthLabel = profileStrength === 100
    ? 'Complete'
    : profileStrength >= 80
      ? 'Strong'
      : profileStrength >= 50
        ? 'Medium'
        : 'Weak';
  const profileStrengthColor = profileStrength >= 80 ? 'text-green-600' : profileStrength >= 50 ? 'text-blue-600' : profileStrength >= 20 ? 'text-amber-600' : 'text-muted-foreground';
  const profileStrengthBarColor = profileStrength >= 80 ? 'bg-green-500' : profileStrength >= 50 ? 'bg-blue-500' : profileStrength >= 20 ? 'bg-amber-500' : 'bg-muted-foreground/30';
  const learningProgress = calculateLearningProgress(activeClient.brandIntelligence);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32">
      <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>
      {/* Top Banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              Client Insights for: <span className="text-primary">{activeClient.businessName || activeClient.name}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeClient.businessName && activeClient.name !== activeClient.businessName && (
                <span className="font-medium text-foreground/70">Contact: {activeClient.name} · </span>
              )}
              Central intelligence and structured knowledge for this client.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setView('onboarding')}>
            <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        </div>
      </motion.div>

      {!isComplete && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Incomplete profile</p>
            <p>Missing critical fields: {missingFields.join(', ')}. AI-generated content may lack crucial context.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Profile Strength */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Activity className="w-4 h-4 text-violet-500" /> Profile Strength
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Based only on saved onboarding and client profile fields.</p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="text-center mb-5">
                <div className={`text-5xl font-display font-bold ${profileStrengthColor} mb-1`}>{profileStrength}%</div>
                <div className="text-sm text-muted-foreground">
                  <span className={`font-semibold ${profileStrengthColor}`}>{profileStrengthLabel}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-6">
                <div className={`h-full ${profileStrengthBarColor} rounded-full transition-all`} style={{ width: `${profileStrength}%` }} />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Saved profile completion is {profileStrength}% based on the onboarding fields.
                </p>
                {!isComplete && (
                  <p className="text-xs text-muted-foreground">
                    Fill the missing profile fields to improve this score.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Brain className="w-4 h-4 text-primary" /> Client Intelligence
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Based on analyzed content, refinements, approvals, edits, and learned patterns.</p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="text-center mb-5">
                <div className={`text-5xl font-display font-bold ${learningProgress.percentage >= 80 ? 'text-green-600' : learningProgress.percentage >= 50 ? 'text-blue-600' : learningProgress.percentage >= 20 ? 'text-amber-600' : 'text-muted-foreground'} mb-1`}>
                  {learningProgress.percentage}%
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className={`font-semibold ${learningProgress.percentage >= 80 ? 'text-green-600' : learningProgress.percentage >= 50 ? 'text-blue-600' : learningProgress.percentage >= 20 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {learningProgress.label}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-6">
                <div
                  className={`h-full rounded-full transition-all ${learningProgress.percentage >= 80 ? 'bg-green-500' : learningProgress.percentage >= 50 ? 'bg-blue-500' : learningProgress.percentage >= 20 ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}
                  style={{ width: `${learningProgress.percentage}%` }}
                />
              </div>
              {learningProgress.factors.length > 0 ? (
                <div className="space-y-2.5">
                  {learningProgress.factors.map((factor) => (
                    <div key={factor.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{factor.name}</span>
                      <span className="font-medium">{factor.value}/{factor.max}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  This grows as past content is analyzed and your team refines, edits, and approves more content.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Briefcase className="w-4 h-4 text-blue-500" /> Brand Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Brand Name</p>
                <p className="text-sm">{profile.brandName || <span className="text-muted-foreground italic">Not provided</span>}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Industry</p>
                <p className="text-sm">{profile.industry || <span className="text-muted-foreground italic">Not provided</span>}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Geography</p>
                <p className="text-sm">{profile.geography || <span className="text-muted-foreground italic">Not provided</span>}</p>
              </div>
            </CardContent>
          </Card>

           <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <MessageSquare className="w-4 h-4 text-slate-500" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm whitespace-pre-wrap">{profile.additionalNotes || <span className="text-muted-foreground italic">No additional notes provided.</span>}</p>
            </CardContent>
          </Card>

        </div>

        {/* Right Columns */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60 shadow-sm h-full">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <User className="w-4 h-4 text-emerald-500" /> Audience
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm whitespace-pre-wrap">{profile.targetAudience || <span className="text-muted-foreground italic">Not provided</span>}</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm h-full">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <Mic2 className="w-4 h-4 text-violet-500" /> Brand Voice
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tone / Voice</p>
                  <p className="text-sm">{profile.brandVoice || <span className="text-muted-foreground italic">Not provided</span>}</p>
                </div>
                {profile.brandGuidelines && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Guidelines</p>
                    <p className="text-sm whitespace-pre-wrap">{profile.brandGuidelines}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60 shadow-sm h-full">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <Target className="w-4 h-4 text-indigo-500" /> Strategy Inputs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platforms</p>
                  {profile.platforms && profile.platforms.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                       {profile.platforms.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                    </div>
                  ) : <span className="text-sm text-muted-foreground italic">Not provided</span>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Content Preferences</p>
                  {profile.contentPreferences && profile.contentPreferences.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                       {profile.contentPreferences.map(c => <Badge key={c} variant="outline" className="bg-primary/5">{c}</Badge>)}
                    </div>
                  ) : <span className="text-sm text-muted-foreground italic">Not provided</span>}
                </div>
                <div>
                   <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Goals</p>
                   {profile.goals && profile.goals.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                       {profile.goals.map(g => <span key={g} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-700 border border-green-500/20">{g}</span>)}
                    </div>
                  ) : <span className="text-sm text-muted-foreground italic">Not provided</span>}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-display">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Differentiation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">USP</p>
                    <p className="text-sm whitespace-pre-wrap">{profile.usp || <span className="text-muted-foreground italic">Not provided</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Messaging</p>
                    <p className="text-sm whitespace-pre-wrap">{profile.messaging || <span className="text-muted-foreground italic">Not provided</span>}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-display">
                    <Zap className="w-4 h-4 text-red-500" /> Challenges
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                   {profile.challenges && profile.challenges.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 text-sm">
                      {profile.challenges.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  ) : <span className="text-sm text-muted-foreground italic">Not provided</span>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
