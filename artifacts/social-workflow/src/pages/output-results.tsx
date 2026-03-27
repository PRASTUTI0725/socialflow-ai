import React, { useState } from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy, Plus, Calendar, Lightbulb, MessageSquare, Hash, Video,
  Target, ListChecks, Printer, Brain, Sparkles, RefreshCw, Linkedin, Twitter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { repurposeIdea, RepurposedContent } from '@/lib/brand-memory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function OutputResults() {
  const { strategy, setView, activeProfile } = useWorkflow();
  const { toast } = useToast();
  const [repurposed, setRepurposed] = useState<RepurposedContent | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<string>('');
  const [isRepurposing, setIsRepurposing] = useState(false);

  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <Lightbulb className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No strategy generated yet</h2>
        <p className="text-muted-foreground max-w-md mb-8">Go to the Create Strategy tab to generate your first 30-day content plan.</p>
        <Button onClick={() => setView('create')} size="lg" className="active-elevate-2 shadow-md rounded-xl">
          <Plus className="w-5 h-5 mr-2" /> Create Strategy
        </Button>
      </div>
    );
  }

  const hasBrandProfile = !!strategy.brandProfileUsed;

  const handleCopyAll = () => {
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
    let copyText = `📅 30-DAY CONTENT CALENDAR: ${strategy.settings.niche.toUpperCase()} 📅\n\n`;
    strategy.calendar.forEach((item) => {
      copyText += `Day ${item.day} | ${item.type} | ${item.format}\nTopic: ${item.idea}\n\n`;
    });
    navigator.clipboard.writeText(copyText).then(() => {
      toast({ title: "Calendar Copied", description: "30-day calendar has been copied as text." });
    });
  };

  const handleCopyExecutionGuide = () => {
    if (!strategy.executionGuide) return;
    let copyText = `✅ EXECUTION GUIDE: ${strategy.settings.niche.toUpperCase()} ✅\n\n`;
    strategy.executionGuide.forEach((step) => {
      copyText += `STEP ${step.step}: ${step.action}\nTool: ${step.tool}\nPrompt:\n${step.prompt}\n\n`;
    });
    navigator.clipboard.writeText(copyText).then(() => {
      toast({ title: "Execution Guide Copied", description: "Execution guide and prompts have been copied." });
    });
  };

  const handleRepurpose = () => {
    if (!selectedIdea) {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">
              {strategy.settings.niche} Strategy
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-sm py-1 px-3">
              Ready
            </Badge>
            {hasBrandProfile && (
              <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-sm py-1 px-3 gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Brand-Tuned
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg mb-4">
            Targeting {strategy.settings.targetAudience.toLowerCase()} with a {strategy.settings.tone.toLowerCase()} tone.
          </p>
          <div className="flex flex-wrap gap-2">
            {strategy.settings.platforms.map(p => (
              <Badge key={p} variant="secondary" className="font-medium">{p}</Badge>
            ))}
            <Badge variant="secondary" className="font-medium bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">{strategy.settings.goal}</Badge>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex flex-wrap shrink-0 gap-2 mb-2">
            <Button onClick={handleCopyCalendar} variant="outline" className="bg-card hover:bg-accent shadow-sm rounded-xl h-10 px-4">
              <Calendar className="w-4 h-4 mr-2 text-indigo-500" /> Copy Calendar
            </Button>
            <Button onClick={handleCopyExecutionGuide} variant="outline" className="bg-card hover:bg-accent shadow-sm rounded-xl h-10 px-4">
              <ListChecks className="w-4 h-4 mr-2 text-green-500" /> Copy Execution
            </Button>
            <Button onClick={handleCopyAll} variant="outline" className="bg-card hover:bg-accent shadow-sm rounded-xl h-10 px-4">
              <Copy className="w-4 h-4 mr-2 text-blue-500" /> Copy Strategy
            </Button>
            <Button onClick={() => window.print()} variant="default" className="shadow-sm rounded-xl h-10 px-4">
              <Printer className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">PDF export: opens print dialog, select "Save as PDF"</p>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Section 1: Ideas & Hooks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div variants={itemVariants}>
            <Card className="h-full border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <Lightbulb className="w-5 h-5 text-amber-500" /> Content Concepts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/50">
                  {strategy.ideas.map((idea, i) => (
                    <li key={i} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
                      <span className="font-mono text-muted-foreground text-sm mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-foreground font-medium">{idea}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <Target className="w-5 h-5 text-red-500" /> Viral Hooks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/50">
                  {(hasBrandProfile ? strategy.brandAwareHooks : strategy.hooks).map((hook, i) => (
                    <li key={i} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
                      <span className="font-mono text-muted-foreground text-sm mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-foreground font-medium">"{hook}"</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Section 2: Before vs After Captions */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <MessageSquare className="w-5 h-5 text-blue-500" /> High-Converting Captions
                </CardTitle>
                {hasBrandProfile && (
                  <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-xs gap-1.5">
                    <Brain className="w-3 h-3" /> Before vs After
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {hasBrandProfile ? (
                <Tabs defaultValue="brand" className="w-full">
                  <TabsList className="mb-6 bg-muted/50 rounded-xl p-1">
                    <TabsTrigger value="brand" className="rounded-lg gap-2 data-[state=active]:bg-background">
                      <Brain className="w-3.5 h-3.5 text-violet-500" /> Brand-Aware
                    </TabsTrigger>
                    <TabsTrigger value="generic" className="rounded-lg gap-2 data-[state=active]:bg-background">
                      <Sparkles className="w-3.5 h-3.5 text-muted-foreground" /> Generic AI
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="brand">
                    <div className="mb-4 px-4 py-3 rounded-xl bg-violet-500/5 border border-violet-500/15 text-sm text-violet-700 dark:text-violet-400 flex items-center gap-2">
                      <Brain className="w-4 h-4 shrink-0" />
                      Tuned to your brand voice, audience, and content style.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {strategy.brandAwareCaptions.slice(0, 4).map((caption, i) => (
                        <CaptionCard key={i} caption={caption} index={i} color="violet" toast={toast} />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="generic">
                    <div className="mb-4 px-4 py-3 rounded-xl bg-muted border border-border/40 text-sm text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      Standard AI output without brand profile applied.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {strategy.captions.slice(0, 4).map((caption, i) => (
                        <CaptionCard key={i} caption={caption} index={i} color="blue" toast={toast} />
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <>
                  <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Brain className="w-4 h-4 shrink-0" />
                    Set an active brand profile in Client Brain to see Before vs After comparison.
                    <button className="ml-auto underline font-medium shrink-0" onClick={() => setView('brand-profile' as any)}>
                      Set profile →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {strategy.captions.slice(0, 4).map((caption, i) => (
                      <CaptionCard key={i} caption={caption} index={i} color="blue" toast={toast} />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 3: Reels & Hashtags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="h-full border-border/50 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <Video className="w-5 h-5 text-purple-500" /> Short-Form Video Ideas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {strategy.reels.map((reel, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="font-medium">{reel}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full border-border/50 shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <Hash className="w-5 h-5 text-green-500" /> Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {Object.entries(strategy.hashtags).map(([category, tags], i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, j) => (
                        <span key={j} className="text-sm px-2.5 py-1 rounded-md bg-muted text-foreground border border-border/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Section 4: Repurpose Idea */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-xl font-display">
                <RefreshCw className="w-5 h-5 text-teal-500" /> Repurpose Idea
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pick one content idea and get platform-specific versions for LinkedIn, Instagram, and Twitter.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Select onValueChange={setSelectedIdea} value={selectedIdea}>
                  <SelectTrigger className="flex-1 text-sm">
                    <SelectValue placeholder="Select a content idea to repurpose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {strategy.ideas.map((idea, i) => (
                      <SelectItem key={i} value={idea}>{idea}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleRepurpose}
                  disabled={isRepurposing || !selectedIdea}
                  className="shrink-0 rounded-xl gap-2"
                >
                  {isRepurposing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Repurposing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Repurpose</>
                  )}
                </Button>
              </div>

              {repurposed && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-5"
                >
                  <RepurposedCard
                    platform="LinkedIn"
                    icon={<Linkedin className="w-4 h-4" />}
                    color="bg-blue-700/10 text-blue-700 border-blue-700/20"
                    iconBg="bg-blue-700/10"
                    iconColor="text-blue-700"
                    content={repurposed.linkedin}
                    toast={toast}
                  />
                  <RepurposedCard
                    platform="Instagram"
                    icon={<div className="w-4 h-4 rounded bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400" />}
                    color="bg-pink-500/10 text-pink-600 border-pink-500/20"
                    iconBg="bg-pink-500/10"
                    iconColor="text-pink-600"
                    content={repurposed.instagram}
                    toast={toast}
                  />
                  <RepurposedCard
                    platform="Twitter / X"
                    icon={<Twitter className="w-4 h-4" />}
                    color="bg-sky-500/10 text-sky-600 border-sky-500/20"
                    iconBg="bg-sky-500/10"
                    iconColor="text-sky-600"
                    content={repurposed.twitter}
                    toast={toast}
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Section 5: Execution Guide */}
        {strategy.executionGuide && (
          <motion.div variants={itemVariants}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <ListChecks className="w-5 h-5 text-green-500" /> Execution Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {strategy.executionGuide.map((step, i) => {
                    let toolColor = "bg-gray-500/10 text-gray-700 border-gray-500/20";
                    if (step.tool.includes("ChatGPT")) toolColor = "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
                    else if (step.tool.includes("Perplexity")) toolColor = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
                    else if (step.tool.includes("Claude")) toolColor = "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
                    else if (step.tool.includes("Canva")) toolColor = "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
                    else if (step.tool.includes("Buffer") || step.tool.includes("Meta")) toolColor = "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20";
                    return (
                      <div key={i} className="border border-border/50 rounded-2xl p-5 bg-card relative shadow-sm hover:border-primary/30 transition-colors">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {step.step}
                          </div>
                          <h4 className="font-semibold text-foreground flex-1">{step.action}</h4>
                          <Badge variant="outline" className={toolColor}>{step.tool}</Badge>
                        </div>
                        <div className="relative group">
                          <textarea
                            readOnly
                            className="w-full h-28 bg-muted/50 border border-border/50 rounded-xl p-4 text-sm font-mono text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                            value={step.prompt}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8"
                            onClick={() => {
                              navigator.clipboard.writeText(step.prompt);
                              toast({ description: "Prompt copied to clipboard!" });
                            }}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Prompt
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Section 6: 30-Day Calendar */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-xl font-display">
                <Calendar className="w-5 h-5 text-indigo-500" /> 30-Day Content Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="p-4 font-semibold text-muted-foreground w-20 border-b">Day</th>
                    <th className="p-4 font-semibold text-muted-foreground w-32 border-b">Format</th>
                    <th className="p-4 font-semibold text-muted-foreground w-40 border-b">Theme</th>
                    <th className="p-4 font-semibold text-muted-foreground border-b">Core Concept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {strategy.calendar.map((item, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono text-sm text-muted-foreground">Day {item.day}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-background">{item.type}</Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-primary">{item.format}</span>
                      </td>
                      <td className="p-4 font-medium">{item.idea}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

function CaptionCard({ caption, index, color, toast }: {
  caption: string; index: number; color: 'blue' | 'violet'; toast: any;
}) {
  const num = color === 'violet'
    ? 'w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-sm mb-4'
    : 'w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm mb-4';

  return (
    <div className="bg-background border rounded-2xl p-5 hover:border-primary/40 transition-colors shadow-sm relative group">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted" onClick={() => {
          navigator.clipboard.writeText(caption);
          toast({ description: "Caption copied!" });
        }}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className={num}>{index + 1}</div>
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
    </div>
  );
}

function RepurposedCard({ platform, icon, color, iconBg, iconColor, content, toast }: {
  platform: string; icon: React.ReactNode; color: string;
  iconBg: string; iconColor: string; content: string; toast: any;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-border/40 ${color.split(' ')[0]}/5`}>
        <div className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`text-sm font-semibold ${color.split(' ').find(c => c.startsWith('text-'))}`}>
          {platform}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-auto shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(content);
            toast({ description: `${platform} post copied!` });
          }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 p-4 bg-background">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
