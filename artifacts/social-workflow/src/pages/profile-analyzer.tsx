import React, { useState } from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSearch, Loader2, CheckCircle2, XCircle, Lightbulb, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const NICHES = ['Fitness', 'Tech', 'Fashion', 'Food & Beverage', 'Finance', 'Real Estate', 'E-commerce', 'Travel', 'Beauty', 'Education', 'Other'];

export function ProfileAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [samplePost, setSamplePost] = useState('');
  const [niche, setNiche] = useState('');

  const handleAnalyze = () => {
    if (!username || !bio) return;
    
    setIsAnalyzing(true);
    
    setTimeout(() => {
      let score = 50; // base score
      const strengths = [];
      const weaknesses = [];
      const suggestions = [];

      // Logic for score and feedback
      if (bio.length > 100) {
        score += 15;
        strengths.push("Bio length is optimal and detailed.");
      } else {
        score -= 5;
        weaknesses.push("Bio is too short. Add more detail about what you do.");
        suggestions.push("Expand your bio to clearly state your value proposition.");
      }

      if (/\p{Emoji}/u.test(bio)) {
        score += 10;
        strengths.push("Good use of emojis in bio to break up text.");
      } else {
        suggestions.push("Add emojis to your bio to make it more visually appealing and scannable.");
      }

      if (samplePost.length > 200) {
        score += 15;
        strengths.push("Sample post has good depth and length.");
      } else if (samplePost.length > 0) {
        score -= 5;
        weaknesses.push("Sample post caption is very brief.");
        suggestions.push("Write longer, more engaging captions that tell a story.");
      }

      if (/#\w+/.test(samplePost)) {
        score += 10;
        strengths.push("Effective use of hashtags in posts.");
      } else if (samplePost.length > 0) {
        weaknesses.push("Missing hashtags in sample post.");
        suggestions.push(`Include 3-5 niche-specific hashtags (e.g. #${niche.toLowerCase().replace(/\s+/g, '')}) to increase reach.`);
      }

      // Niche specific logic
      if (niche && username.toLowerCase().includes(niche.toLowerCase().split(' ')[0])) {
        score += 10;
        strengths.push("Username contains strong niche keywords.");
      } else if (niche) {
        suggestions.push(`Consider adding a keyword like '${niche.split(' ')[0]}' to your display name for better searchability.`);
      }

      // Add default points for formatting
      score = Math.min(Math.max(score, 10), 100);

      // Default fill-ins if we didn't get enough
      if (strengths.length < 3) strengths.push("Clear profile structure.", "Consistent tone detected.");
      if (weaknesses.length < 3) weaknesses.push("Call-to-action is not clearly defined.", "Missing social proof or credentials.");
      if (suggestions.length < 3) suggestions.push("Add a strong CTA link in your bio.", "Post more consistently to build audience trust.");

      setResult({
        score,
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        suggestions: suggestions.slice(0, 4)
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10";
    if (score >= 60) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full pb-32">
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <UserSearch className="w-8 h-8 text-primary" /> Profile Analyzer
        </h1>
        <p className="text-muted-foreground text-lg">Evaluate your current social profile to get actionable growth tips.</p>
      </div>

      {!result && !isAnalyzing && (
        <Card className="border-border/50 shadow-sm max-w-3xl">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
            <CardTitle className="text-xl font-display">Enter Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Username / Handle</label>
                <Input 
                  placeholder="@yourusername" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Current Bio</label>
                <Textarea 
                  placeholder="Paste your Instagram, Twitter, or LinkedIn bio here..." 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[100px] rounded-xl resize-y"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sample Post Caption (Optional)</label>
                <Textarea 
                  placeholder="Paste a recent post caption to analyze..." 
                  value={samplePost} 
                  onChange={(e) => setSamplePost(e.target.value)}
                  className="min-h-[120px] rounded-xl resize-y"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Primary Niche</label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select niche..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleAnalyze} 
              disabled={!username || !bio} 
              size="lg" 
              className="w-full md:w-auto h-12 px-8 text-base rounded-xl active-elevate-2 font-semibold"
            >
              Analyze Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
          >
            <UserSearch className="w-8 h-8 text-primary animate-pulse" />
          </motion.div>
          <h2 className="text-2xl font-display font-bold mb-2">Analyzing Profile Data...</h2>
          <p className="text-muted-foreground text-lg mb-6">Scanning bio structure, keyword usage, and post formatting.</p>
          <div className="w-64 bg-muted rounded-full h-1.5 overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="bg-primary h-full rounded-full"
            />
          </div>
        </div>
      )}

      {result && !isAnalyzing && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setResult(null)}>Analyze Another Profile</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-border/50 shadow-sm flex flex-col items-center justify-center p-8 text-center md:col-span-1">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 border-8 ${getScoreColor(result.score)} ${getScoreBg(result.score)} border-current`}>
                <span className={`text-4xl font-display font-bold ${getScoreColor(result.score)}`}>{result.score}</span>
              </div>
              <h3 className="text-xl font-bold font-display">Profile Score</h3>
              <p className="text-muted-foreground text-sm mt-2">Based on current best practices for engagement and discoverability.</p>
            </Card>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-green-500/5 border-b border-green-500/10 pb-4">
                  <CardTitle className="text-lg font-display flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <ul className="space-y-3">
                    {result.strengths.map((item: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-red-500/5 border-b border-red-500/10 pb-4">
                  <CardTitle className="text-lg font-display flex items-center gap-2 text-red-700 dark:text-red-400">
                    <XCircle className="w-5 h-5" /> Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <ul className="space-y-3">
                    {result.weaknesses.map((item: string, i: number) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
              <CardTitle className="text-xl font-display flex items-center gap-2 text-primary">
                <Lightbulb className="w-5 h-5" /> Actionable Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.suggestions.map((item: string, i: number) => (
                  <div key={i} className="bg-background border p-4 rounded-xl flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <p className="text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}