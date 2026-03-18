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
import { Sparkles, Loader2, Target, Users, Zap, LayoutTemplate } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion } from 'framer-motion';

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

export function CreateStrategy() {
  const { generateStrategy, isGenerating } = useWorkflow();
  const [showCustomNiche, setShowCustomNiche] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      niche: "",
      customNiche: "",
      platforms: [],
      goal: "",
      targetAudience: "",
      tone: "",
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
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
          className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8"
        >
          <Sparkles className="w-10 h-10 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        </motion.div>
        <h2 className="text-2xl font-display font-bold mb-3">AI is analyzing your niche...</h2>
        <p className="text-muted-foreground text-lg mb-8">Crafting hooks, captions, and a 30-day calendar specifically for {form.getValues('niche')}.</p>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="bg-primary h-full rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full pb-32">
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" /> Create Strategy
        </h1>
        <p className="text-muted-foreground text-lg">Define the parameters below and our AI will generate a complete month of content.</p>
      </div>

      <div className="bg-card border border-border/50 rounded-3xl p-6 lg:p-10 shadow-lg shadow-black/[0.02]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            
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
