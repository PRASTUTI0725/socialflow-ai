import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useWorkflow } from '@/context/workflow-context';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Target, Users, Zap, LayoutTemplate, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredApiKey, storeApiKey, clearApiKey } from '@/lib/ai-client';

const formSchema = z.object({
  niche: z.string().min(1, "Please select a niche"),
  customNiche: z.string().optional(),
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  goal: z.string().min(1, "Select a primary goal"),
  targetAudience: z.string().min(5, "Describe your target audience"),
  tone: z.string().min(1, "Select a brand tone"),
  contentFocus: z.string().min(1, "Select a content focus"),
  extraContext: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NICHES = ['Fitness', 'Tech', 'Fashion', 'Food & Beverage', 'Finance', 'Real Estate', 'E-commerce', 'Travel', 'Beauty', 'Education', 'Custom'];
const TONES = ['Bold & Edgy', 'Professional & Authoritative', 'Educational & Helpful', 'Funny & Entertaining', 'Inspirational & Uplifting'];

const GENERATION_STEPS = [
  'Analyzing brand voice…',
  'Understanding audience psychology…',
  'Generating platform-specific strategy…',
  'Finalizing your 30-day calendar…',
];

function ApiKeySection() {
  const [key, setKey] = useState(getStoredApiKey());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(!!getStoredApiKey());

  const handleSave = () => {
    if (key.trim()) {
      storeApiKey(key.trim());
      setSaved(true);
    }
  };

  const handleClear = () => {
    clearApiKey();
    setKey('');
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-2">
        <KeyRound className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold font-display">AI Configuration</h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Optional</span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${saved ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
            {saved
              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : <AlertCircle className="w-4 h-4 text-amber-600" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {saved ? 'Gemini AI connected — real generation active' : 'No API key set — using smart templates'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {saved
                ? 'Strategies will be generated live by Google Gemini 1.5 Flash.'
                : 'Add your free Gemini API key to generate real, unique content every time.'
              }
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={e => { setKey(e.target.value); setSaved(false); }}
              placeholder="Paste your Gemini API key (AIza...)"
              className="pr-10 text-sm font-mono h-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {key.trim() && !saved && (
            <Button type="button" size="sm" onClick={handleSave} className="h-10 px-4 rounded-xl">
              Save
            </Button>
          )}
          {saved && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="h-10 px-4 rounded-xl text-muted-foreground">
              Remove
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Get a free key at{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            aistudio.google.com
          </a>
          {' '}— stored locally in your browser only.
        </p>
      </div>
    </div>
  );
}

function GeneratingScreen({ step, niche }: { step: string; niche: string }) {
  const activeIndex = GENERATION_STEPS.indexOf(step);

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4 py-20">
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8"
      >
        <Sparkles className="w-10 h-10 text-primary" style={{ animationDuration: '3s' }} />
      </motion.div>

      <h2 className="text-2xl font-display font-bold mb-2">Building your strategy</h2>
      <p className="text-muted-foreground mb-10">
        Crafting a 30-day plan for <span className="font-semibold text-foreground">{niche || 'your niche'}</span>
      </p>

      {/* Step list */}
      <div className="w-full space-y-3 mb-8 text-left">
        {GENERATION_STEPS.map((s, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const isPending = i > activeIndex;
          return (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                isActive ? 'border-primary/30 bg-primary/5' :
                isDone ? 'border-green-500/20 bg-green-500/5' :
                'border-border/40 bg-muted/20 opacity-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                isDone ? 'bg-green-500' : isActive ? 'bg-primary' : 'bg-border'
              }`}>
                {isDone
                  ? <CheckCircle2 className="w-3 h-3 text-white" />
                  : isActive
                    ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                    : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                }
              </div>
              <span className={`text-sm font-medium ${isActive ? 'text-foreground' : isDone ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                {s}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(((activeIndex + 1) / GENERATION_STEPS.length) * 100, 8)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-primary h-full rounded-full"
        />
      </div>
    </div>
  );
}

export function CreateStrategy() {
  const { generateStrategy, isGenerating, generationStep, activeProfile } = useWorkflow();
  const [showCustomNiche, setShowCustomNiche] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      niche: "",
      customNiche: "",
      platforms: [],
      goal: "",
      targetAudience: activeProfile?.targetAudience ?? "",
      tone: activeProfile?.tone ?? "",
      contentFocus: "",
      extraContext: "",
    }
  });

  const onSubmit = (data: FormValues) => {
    generateStrategy({
      ...data,
      niche: data.niche === 'Custom' && data.customNiche ? data.customNiche : data.niche
    });
  };

  if (isGenerating) {
    return (
      <GeneratingScreen
        step={generationStep}
        niche={form.getValues('niche')}
      />
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full pb-32">
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" /> Create Strategy
        </h1>
        <p className="text-muted-foreground text-lg">
          Define the parameters below and AI will generate a complete month of content.
        </p>
        {activeProfile && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/8 border border-violet-500/20 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium text-foreground">Active profile:</span>
            <span className="text-violet-700 dark:text-violet-400 font-semibold">{activeProfile.brandName}</span>
            <span className="text-muted-foreground">— content will be brand-tuned</span>
          </div>
        )}
      </div>

      <div className="bg-card border border-border/50 rounded-3xl p-6 lg:p-10 shadow-lg shadow-black/[0.02]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

            {/* AI Configuration */}
            <ApiKeySection />

            {/* Core Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold font-display">Core Strategy</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="niche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Industry / Niche</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          setShowCustomNiche(val === 'Custom');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 bg-background/50 hover:bg-background transition-colors text-base rounded-xl">
                            <SelectValue placeholder="Select industry..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NICHES.map(niche => (
                            <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showCustomNiche && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <FormField
                      control={form.control}
                      name="customNiche"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Custom Niche</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Vintage Watch Restoration" className="h-12 text-base rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">Target Audience</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 25-35 year old busy professionals looking to save time" className="h-12 text-base rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Platform & Focus */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold font-display">Distribution & Formatting</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="platforms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base block mb-3">Platforms</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="multiple"
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-wrap justify-start gap-2"
                        >
                          {['Instagram', 'LinkedIn', 'Twitter / X', 'TikTok'].map(platform => (
                            <ToggleGroupItem
                              key={platform}
                              value={platform}
                              className="px-6 py-3 h-auto rounded-xl border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-all hover-elevate"
                            >
                              {platform}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contentFocus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base block mb-3">Content Focus</FormLabel>
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-wrap justify-start gap-2"
                        >
                          {['Video / Reels', 'Text / Carousels', 'Mixed Strategy'].map(focus => (
                            <ToggleGroupItem
                              key={focus}
                              value={focus}
                              className="px-6 py-3 h-auto rounded-xl border border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary transition-all hover-elevate"
                            >
                              {focus}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Voice & Goals */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b pb-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold font-display">Voice & Goals</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Brand Tone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-base rounded-xl">
                            <SelectValue placeholder="Select tone..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TONES.map(tone => (
                            <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Primary Goal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-base rounded-xl">
                            <SelectValue placeholder="Select goal..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Audience Growth">Audience Growth</SelectItem>
                          <SelectItem value="Brand Awareness">Brand Awareness</SelectItem>
                          <SelectItem value="Lead Generation / Sales">Lead Generation / Sales</SelectItem>
                          <SelectItem value="Community Engagement">Community Engagement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="extraContext"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">Extra Context <span className="text-muted-foreground text-sm font-normal">(Optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any specific upcoming launches, promotions, or strict brand guidelines?"
                          className="min-h-[120px] text-base rounded-xl resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end">
              <Button type="submit" size="lg" className="w-full md:w-auto h-14 px-10 text-lg rounded-xl shadow-lg shadow-primary/25 active-elevate-2 font-semibold">
                <Sparkles className="w-5 h-5 mr-2" /> Generate 30-Day Strategy
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
