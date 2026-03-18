import React from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Calendar, Lightbulb, MessageSquare, Hash, Video, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export function OutputResults() {
  const { strategy, setView } = useWorkflow();
  const { toast } = useToast();

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
      toast({
        title: "Copied to clipboard",
        description: "Strategy has been copied as text.",
      });
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">
              {strategy.settings.niche} Strategy
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-sm py-1 px-3">
              Ready
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg mb-4">
            Targeting {strategy.settings.targetAudience.toLowerCase()} with a {strategy.settings.tone.toLowerCase()} tone.
          </p>
          <div className="flex flex-wrap gap-2">
            {strategy.settings.platforms.map(p => (
              <Badge key={p} variant="secondary" className="font-medium text-secondary-foreground">{p}</Badge>
            ))}
            <Badge variant="secondary" className="font-medium bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">{strategy.settings.goal}</Badge>
          </div>
        </div>
        
        <div className="flex shrink-0">
          <Button onClick={handleCopyAll} variant="outline" className="bg-white hover:bg-gray-50 active-elevate-2 shadow-sm rounded-xl h-12 px-6">
            <Copy className="w-4 h-4 mr-2" /> Copy Full Strategy
          </Button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Section 1: Ideas & Hooks Grid */}
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
                  {strategy.hooks.map((hook, i) => (
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

        {/* Section 2: Captions */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-xl font-display">
                <MessageSquare className="w-5 h-5 text-blue-500" /> High-Converting Captions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strategy.captions.slice(0, 4).map((caption, i) => (
                  <div key={i} className="bg-background border rounded-2xl p-5 hover:border-primary/40 transition-colors shadow-sm relative group">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted" onClick={() => {
                        navigator.clipboard.writeText(caption);
                        toast({ description: "Caption copied!" });
                      }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                      {i + 1}
                    </div>
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
                  </div>
                ))}
              </div>
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

        {/* Section 4: 30-Day Calendar */}
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
                        <Badge variant="outline" className="bg-background">
                          {item.type}
                        </Badge>
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
