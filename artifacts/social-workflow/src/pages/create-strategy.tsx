import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWorkflow } from '@/context/workflow-context';
import { useClients } from '@/modules/clients/context/client-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Users, Check, ChevronDown, Zap, ClipboardCheck, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStoredApiKey, getGenerationMode } from '@/lib/ai-client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { getClientProfileMissingFieldLabels, getClientProfileMissingFields } from '@/modules/clients/lib/client-types';
import type { Client } from '@/modules/clients/lib/client-types';
import type { StrategyInput } from '@/lib/content-generator';

const sanitizeInput = (val: string) => {
  if (!val) return val;
  return val.replace(/ignore (all |previous |above )?instructions/gi, '')
            .replace(/you are now/gi, '')
            .replace(/system prompt/gi, '')
            .replace(/\[INST\]/gi, '');
};

function deriveContentFocus(contentPreferences: string[]): string {
  const prefs = contentPreferences ?? [];
  const normalized = prefs.map(p => p.toLowerCase());
  if (normalized.some(p => p.includes('reel'))) return 'Reels';
  if (normalized.some(p => p.includes('post'))) return 'Posts';
  if (prefs.length === 1) return prefs[0];
  return 'Mixed Strategy';
}

function buildStrategyInputFromClientProfile(client: Client): StrategyInput {
  const profile = client.clientProfile;

  const brand = profile.brandName || client.brandProfile.brandName || client.name;
  const industry = profile.industry || client.niche || client.brandProfile.niche;
  const audience = profile.targetAudience || client.brandProfile.targetAudience;
  const tone = profile.brandVoice || client.brandProfile.tone;
  const platforms = profile.platforms?.length > 0 ? profile.platforms : client.metadata.platforms;
  const goals = profile.goals ?? [];
  const contentPreferences = profile.contentPreferences ?? [];

  const structuredPayload = {
    brand,
    industry,
    audience,
    goals,
    tone,
    platforms,
    contentTypes: contentPreferences,
    differentiators: profile.usp ?? '',
    messaging: sanitizeInput(profile.messaging ?? ''),
    challenges: profile.challenges ?? [],
    notes: sanitizeInput(profile.additionalNotes ?? ''),
    geography: profile.geography ?? '',
  };

  const extraContext = JSON.stringify(structuredPayload, null, 2);

  return {
    niche: industry || 'General',
    platforms,
    goal: goals[0] || 'Grow followers & engagement',
    targetAudience: audience || 'our audience',
    tone: tone || 'Professional & Authoritative',
    contentFocus: deriveContentFocus(contentPreferences),
    extraContext,
  };
}

const formSchema = z.object({
  niche: z.string().min(1, "Please enter a niche or industry"),
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  goal: z.string().min(1, "Select a primary goal"),
  targetAudience: z.string().min(5, "Describe your target audience"),
  tone: z.string().min(1, "Select a brand tone"),
  contentFocus: z.string().default("Mixed Strategy"),
  extraContext: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NICHES = ['Fitness', 'SaaS', 'E-commerce', 'Personal Brand', 'Food & Beverage', 'Real Estate', 'Education', 'Finance', 'Beauty', 'Travel', 'Technology', 'Healthcare', 'Fashion', 'Gaming'];
const GOALS = ['Grow Followers', 'Drive Sales', 'Build Authority', 'Increase Engagement', 'Launch Product'];
const TONES = ['Witty', 'Professional', 'Casual', 'Authoritative', 'Inspirational', 'Educational'];
const PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'Twitter/X', 'YouTube Shorts'];

const AUDIENCE_PRESETS = [
  'Young adults 18-25',
  'Professionals 25-40',
  'Parents 30-45',
  'Business owners',
  'Students and educators',
  'Health-conscious individuals',
];

const GENERATION_STEPS = [
  'Analyzing brand voice…',
  'Understanding audience psychology…',
  'Generating platform-specific strategy…',
  'Finalizing your 30-day calendar…',
];

function GeneratingScreen({ step, niche }: { step: string; niche: string }) {
  const activeIndex = GENERATION_STEPS.indexOf(step);
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4 py-20">
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }} className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8">
        <Sparkles className="w-10 h-10 text-primary" />
      </motion.div>
      <h2 className="text-2xl font-display font-bold mb-2">Building your strategy</h2>
      <p className="text-muted-foreground mb-10">Crafting a 30-day plan for <span className="font-semibold text-foreground">{niche || 'your niche'}</span></p>
      <div className="w-full space-y-3 mb-8 text-left">
        {GENERATION_STEPS.map((s, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <motion.div key={s} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${isActive ? 'border-primary/30 bg-primary/5' : isDone ? 'border-green-500/20 bg-green-500/5' : 'border-border/40 bg-muted/20 opacity-50'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-green-500' : isActive ? 'bg-primary' : 'bg-border'}`}>
                {isDone ? <CheckCircle2 className="w-3 h-3 text-white" /> : isActive ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
              </div>
              <span className={`text-sm font-medium ${isActive ? 'text-foreground' : isDone ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>{s}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <motion.div initial={{ width: '0%' }} animate={{ width: `${Math.max(((activeIndex + 1) / GENERATION_STEPS.length) * 100, 8)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="bg-primary h-full rounded-full" />
      </div>
    </div>
  );
}

export function CreateStrategy() {
  const { generateStrategy, isGenerating, setView, activeJobId, viewStrategy, generationStep } = useWorkflow();
  const { clients, activeClient, setActiveClient } = useClients();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [sanitizedWarning, setSanitizedWarning] = useState(false);
  const [clientAutoFilled, setClientAutoFilled] = useState(false);
  const [autoPipeline, setAutoPipeline] = useState(() => {
    return localStorage.getItem('auto_pipeline') !== 'false';
  });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { niche: "", platforms: [], goal: "", targetAudience: "", tone: "", contentFocus: "Mixed Strategy", extraContext: "" }
  });

  // Auto-fill form from activeClient when navigating to this page or client changes
  useEffect(() => {
    if (activeClient) {
      const profile = activeClient.clientProfile;
      const brandProfile = activeClient.brandProfile;
      if (profile.industry || activeClient.niche || brandProfile.niche) {
        form.setValue('niche', profile.industry || activeClient.niche || brandProfile.niche);
      }
      if (profile.targetAudience || brandProfile.targetAudience) {
        form.setValue('targetAudience', profile.targetAudience || brandProfile.targetAudience);
      }
      if (profile.brandVoice || brandProfile.tone) {
        form.setValue('tone', profile.brandVoice || brandProfile.tone);
      }
      const platforms = profile.platforms.length > 0 ? profile.platforms : activeClient.metadata.platforms;
      if (platforms.length > 0) {
        form.setValue('platforms', platforms);
      }
      if (profile.messaging || profile.additionalNotes) {
        form.setValue('extraContext', [profile.messaging, profile.additionalNotes].filter(Boolean).join('\n\n'));
      }
      setClientAutoFilled(true);
    } else {
      // When activeClient becomes null, reset ALL form state
      form.reset({ niche: "", platforms: [], goal: "", targetAudience: "", tone: "", contentFocus: "Mixed Strategy", extraContext: "" });
      setClientAutoFilled(false);
    }
  }, [activeClient?.id, form]);

  const handleSanitizedChange = (field: "niche" | "targetAudience" | "extraContext", value: string) => {
    const clean = sanitizeInput(value);
    if (clean !== value) setSanitizedWarning(true);
    form.setValue(field, clean);
  };

  const handleClientSelect = (clientId: string | null) => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setActiveClient(client);
      }
    } else {
      // Reset ALL form state when clearing client selection
      setActiveClient(null);
      form.reset({ niche: "", platforms: [], goal: "", targetAudience: "", tone: "", contentFocus: "Mixed Strategy", extraContext: "" });
      setClientAutoFilled(false);
    }
  };

  const nextStep = async () => {
    // Block progression beyond step 1 if no active client selected
    if (step === 1 && !activeClient) {
      toast({
        title: 'Select a Client',
        description: 'Please select a client before continuing, or use "Start Fresh" to proceed without a client.',
        variant: 'destructive',
      });
      return;
    }

    if (step === 2) {
      const valid = await form.trigger(["niche", "goal", "platforms"]);
      if (!valid) return;
    }
    if (step === 3) {
      const valid = await form.trigger(["targetAudience", "tone"]);
      if (!valid) return;
    }
    setStep(s => Math.min(4, s + 1));
  };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const onSubmit = (data: FormValues) => {
    generateStrategy(data);
  };

  const mode = getGenerationMode();
  const hasKey = !!getStoredApiKey();

  const profileMissing = useMemo(() => {
    if (!activeClient) return [];
    return getClientProfileMissingFieldLabels(activeClient.clientProfile);
  }, [activeClient]);

  const profileComplete = !!activeClient && profileMissing.length === 0;
  const existingStrategy = activeClient?.strategies?.[0] ?? null;

  if (isGenerating) {
    const niche = activeClient?.clientProfile.industry || form.getValues('niche');
    return <GeneratingScreen step={generationStep} niche={niche} />;
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full pb-32">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-4 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" /> Create Strategy
        </h1>

        {/* Active client indicator */}
        {activeClient && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium">
              Creating for: <span className="text-primary font-semibold">{activeClient.businessName || activeClient.name}</span>
              {activeClient.niche && <span className="text-muted-foreground ml-1">({activeClient.niche})</span>}
            </span>
            <span className="text-[10px] text-muted-foreground italic ml-2 opacity-70">Contact: {activeClient.name}</span>
            {clientAutoFilled && (
              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md ml-auto shrink-0">
                Fields auto-filled
              </span>
            )}
          </div>
        )}

        {activeClient && profileComplete && (
          <Card className="mb-4 border-border/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Generating strategy for:</p>
                  <h2 className="text-xl font-display font-bold text-foreground leading-tight mt-1">
                    {activeClient.businessName || activeClient.clientProfile.brandName || activeClient.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-lg bg-muted/80 text-muted-foreground border border-border/50">
                      Audience: {activeClient.clientProfile.targetAudience}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-muted/80 text-muted-foreground border border-border/50">
                      Platforms:{' '}
                      {(activeClient.clientProfile.platforms.length > 0
                        ? activeClient.clientProfile.platforms
                        : activeClient.metadata.platforms
                      ).join(', ')}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-primary/[0.06] text-primary border border-primary/10">
                      Tone: {activeClient.clientProfile.brandVoice}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {existingStrategy && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => viewStrategy(existingStrategy)}
                      size="lg"
                      className="rounded-xl px-7"
                    >
                      <Eye className="w-5 h-5 mr-2" /> View Current Strategy
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => generateStrategy(buildStrategyInputFromClientProfile(activeClient))}
                    size="lg"
                    className="rounded-xl px-7"
                    disabled={(mode === 'ai' && !hasKey) || !!activeJobId || isGenerating}
                  >
                    <Sparkles className="w-5 h-5 mr-2" /> {existingStrategy ? 'Regenerate Strategy' : 'Generate Strategy'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeClient && !profileComplete && (
          <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
            <ClipboardCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Client profile incomplete
              </p>
              <p className="text-xs text-muted-foreground mt-1">Add: {profileMissing.join(', ')}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-7 text-xs rounded-lg border-amber-500/30"
              onClick={() => setView('onboarding')}
            >
              Complete Profile
            </Button>
          </div>
        )}

        {!activeClient && (
          <>
            {/* Progress bar */}
            <div className="flex items-center gap-2 w-full">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-2 flex-1 rounded-full overflow-hidden ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground font-medium uppercase tracking-wider">Step {step} of 4</p>
          </>
        )}
      </div>

      {!activeClient && (
        <div className="bg-card border border-border/50 rounded-3xl shadow-lg shadow-black/[0.02]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 lg:p-10 space-y-8">

            {sanitizedWarning && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Some content was removed to ensure safe generation.</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold font-display">Pick a client</h3>
                  <p className="text-muted-foreground mt-1">Select a client to auto-fill their details, or start fresh.</p>
                </div>

                {/* Client selector */}
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-12 rounded-xl text-sm">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Select a client (optional)</span>
                        </span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72" align="start">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Your Clients</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {clients.map(client => (
                        <DropdownMenuItem
                          key={client.id}
                          onClick={() => handleClientSelect(client.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{(client.businessName || client.name).charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{client.businessName || client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{client.name} · {client.niche}</p>
                          </div>
                          {null}
                        </DropdownMenuItem>
                      ))}
                      {clients.length === 0 && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No clients yet. Create one in Clients page.
                        </div>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleClientSelect(null)} className="cursor-pointer text-muted-foreground">
                        <Sparkles className="w-4 h-4 mr-2" /> Start Fresh (no client)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Auto-filled indicator removed: this wizard renders only when no active client is selected */}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold font-display">Niche & Goal</h3>
                  {clientAutoFilled && <p className="text-xs text-muted-foreground mt-1">Auto-filled from client. Edit if needed.</p>}
                </div>

                <FormField control={form.control} name="niche" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Niche / Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Vintage Watch Restoration" className="h-12" {...field} onChange={e => handleSanitizedChange("niche", e.target.value)} />
                    </FormControl>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {NICHES.map(p => (
                        <button type="button" key={p} onClick={() => field.onChange(p)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", field.value === p ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/80 border-transparent text-muted-foreground")}>{p}</button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="goal" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Primary Goal</FormLabel>
                    <FormControl>
                      <Input placeholder="What do you want to achieve?" className="h-12" {...field} />
                    </FormControl>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {GOALS.map(p => (
                        <button type="button" key={p} onClick={() => field.onChange(p)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", field.value === p ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/80 border-transparent text-muted-foreground")}>{p}</button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="platforms" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base block mb-3">Platforms</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {PLATFORMS.map(platform => {
                          const isSelected = field.value?.includes(platform);
                          return (
                            <button
                              type="button"
                              key={platform}
                              onClick={() => {
                                const current = new Set(field.value || []);
                                if (isSelected) current.delete(platform);
                                else current.add(platform);
                                field.onChange(Array.from(current));
                              }}
                              className={cn(
                                "px-5 py-2.5 rounded-xl border font-medium transition-all",
                                isSelected ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 border-primary" : "bg-background border-border hover:border-primary/50 text-foreground"
                              )}
                            >
                              {platform}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold font-display">Voice & Audience</h3>
                  {clientAutoFilled && <p className="text-xs text-muted-foreground mt-1">Auto-filled from client. Edit if needed.</p>}
                </div>

                <FormField control={form.control} name="targetAudience" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Target Audience</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Female founders aged 28-40 running product businesses" className="h-12" {...field} onChange={e => handleSanitizedChange("targetAudience", e.target.value)} />
                    </FormControl>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {AUDIENCE_PRESETS.map(preset => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => field.onChange(preset)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            field.value === preset ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/80 border-transparent text-muted-foreground"
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base block mb-3">Tone</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map(t => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => field.onChange(t)}
                            className={cn(
                              "px-5 py-2 rounded-full border text-sm font-medium transition-all",
                              field.value === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="extraContext" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Writing Style / Extra Context <span className="text-muted-foreground text-sm font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any specific strict brand guidelines or current campaigns?" className="min-h-[100px] resize-y" {...field} onChange={e => handleSanitizedChange("extraContext", e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold font-display">Review & Generate</h3>
                  <p className="text-muted-foreground">Check your settings, then hit generate.</p>
                </div>

                <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 space-y-4">
                  <div className="grid grid-cols-3 pb-3 border-b border-border/50">
                    <span className="text-muted-foreground text-sm font-medium">Client</span>
                    <span className="col-span-2 font-semibold text-foreground">No client (fresh start)</span>
                  </div>
                  <div className="grid grid-cols-3 pb-3 border-b border-border/50">
                    <span className="text-muted-foreground text-sm font-medium">Niche</span>
                    <span className="col-span-2 font-semibold text-foreground">{form.getValues('niche')}</span>
                  </div>
                  <div className="grid grid-cols-3 pb-3 border-b border-border/50">
                    <span className="text-muted-foreground text-sm font-medium">Goal</span>
                    <span className="col-span-2 font-semibold text-foreground">{form.getValues('goal')}</span>
                  </div>
                  <div className="grid grid-cols-3 pb-3 border-b border-border/50">
                    <span className="text-muted-foreground text-sm font-medium">Platforms</span>
                    <span className="col-span-2 font-medium text-foreground">{(form.getValues('platforms') || []).join(', ')}</span>
                  </div>
                  <div className="grid grid-cols-3 pb-3 border-b border-border/50">
                    <span className="text-muted-foreground text-sm font-medium">Audience</span>
                    <span className="col-span-2 text-sm text-foreground">{form.getValues('targetAudience')}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground text-sm font-medium">Tone</span>
                    <span className="col-span-2 font-medium text-foreground">{form.getValues('tone')}</span>
                  </div>
                </div>

                {/* Auto-pipeline toggle */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/10">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Auto-create pipeline</p>
                      <p className="text-xs text-muted-foreground">Generate content drafts immediately after strategy</p>
                    </div>
                  </div>
                  <Switch checked={autoPipeline} onCheckedChange={(v) => { setAutoPipeline(v); localStorage.setItem('auto_pipeline', String(v)); }} />
                </div>

                <div className="flex flex-col items-center gap-4 mt-6">
                  {mode === 'ai' && !hasKey ? (
                    <div className="w-full bg-amber-500/10 border border-amber-500/20 text-center py-4 rounded-2xl text-amber-700 dark:text-amber-400 font-medium">
                      <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                      Cannot generate. Please add an API Key via settings, or switch to Prototype mode.
                    </div>
                  ) : (
                    <>
                      <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-2xl shadow-lg shadow-primary/25 active-elevate-2 font-semibold transition-all" disabled={!!activeJobId || isGenerating}>
                        <Sparkles className="w-5 h-5 mr-2" /> Generate Strategy
                      </Button>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <div className={`w-2.5 h-2.5 rounded-full ${mode === 'ai' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                        {mode === 'ai' ? 'AI Mode Active (Gemini)' : 'Prototype Mode Active'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-6 border-t mt-8">
              <Button type="button" variant="ghost" onClick={prevStep} disabled={step === 1} className="text-muted-foreground rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {step < 4 && (
                <Button type="button" onClick={nextStep} className="rounded-xl px-6">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

          </form>
        </Form>
      </div>
      )}
    </div>
  );
}
