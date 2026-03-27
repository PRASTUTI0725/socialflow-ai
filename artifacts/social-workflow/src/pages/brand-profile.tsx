import React, { useState } from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Plus, Save, Trash2, CheckCircle2, Edit3, X, Tag, Sparkles,
  BarChart2, MessageSquare, Mic2, Target, ChevronLeft, TrendingUp,
  Lightbulb, AlignLeft, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import {
  BrandProfile, createEmptyProfile, saveProfile, deleteProfile, setActiveProfileId
} from '@/lib/brand-memory';

const TONES = [
  'Professional & Authoritative', 'Casual & Friendly', 'Bold & Disruptive',
  'Educational & Informative', 'Witty & Humorous', 'Inspirational & Motivational',
  'Empathetic & Supportive', 'Custom',
];

const WRITING_STYLES = [
  { value: 'educational', label: 'Educational — structured, data-backed, informative' },
  { value: 'storytelling', label: 'Storytelling — narrative-driven, emotional arc' },
  { value: 'punchy', label: 'Punchy — short, direct, high-impact lines' },
  { value: 'short', label: 'Short-form — concise bullets, scannable content' },
] as const;

// --- Brand Intelligence Engine (simulated, logic-based) ---

function computeBrandScore(profile: BrandProfile): { score: number; breakdown: Record<string, number>; label: string } {
  const breakdown = {
    'Brand Identity': profile.brandName.trim() && profile.niche.trim() ? 20 : profile.brandName.trim() ? 10 : 0,
    'Audience Clarity': profile.targetAudience.length > 20 ? 20 : profile.targetAudience.length > 5 ? 10 : 0,
    'Voice Definition': (profile.tone && profile.tone !== 'Custom') ? 15 : 0,
    'Writing Style': profile.writingStyle ? 10 : 0,
    'Content Guidelines': (profile.dos.filter(Boolean).length > 0 ? 10 : 0) + (profile.donts.filter(Boolean).length > 0 ? 5 : 0),
    'Keyword Depth': profile.keywords.length >= 3 ? 10 : profile.keywords.length > 0 ? 5 : 0,
    'Content Examples': profile.pastContent.length > 200 ? 10 : profile.pastContent.length > 50 ? 5 : 0,
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const label = score >= 80 ? 'Strong' : score >= 55 ? 'Good' : score >= 30 ? 'Developing' : 'Incomplete';
  return { score, breakdown, label };
}

function deriveVoiceSummary(profile: BrandProfile): Record<string, string> {
  const toneMap: Record<string, string> = {
    'Professional & Authoritative': 'Formal, confident, data-backed',
    'Casual & Friendly': 'Conversational, warm, approachable',
    'Bold & Disruptive': 'Provocative, contrarian, high-energy',
    'Educational & Informative': 'Structured, step-by-step, clear',
    'Witty & Humorous': 'Light, playful, culturally aware',
    'Inspirational & Motivational': 'Emotionally charged, action-driving',
    'Empathetic & Supportive': 'Soft, validating, community-first',
  };
  const styleMap: Record<string, string> = {
    educational: 'Headers → Points → Takeaway',
    storytelling: 'Setup → Conflict → Resolution',
    punchy: 'One-liner → Hook → CTA',
    short: 'Bullet fragments, scannable',
  };
  const emotionMap: Record<string, string> = {
    'Professional & Authoritative': 'Trust, Respect, Confidence',
    'Casual & Friendly': 'Belonging, Comfort, Fun',
    'Bold & Disruptive': 'Excitement, FOMO, Challenge',
    'Educational & Informative': 'Curiosity, Clarity, Growth',
    'Witty & Humorous': 'Joy, Surprise, Relatability',
    'Inspirational & Motivational': 'Hope, Drive, Urgency',
    'Empathetic & Supportive': 'Safety, Validation, Connection',
  };
  const ctaMap: Record<string, string> = {
    educational: "Save this · Share with a friend · Try this today",
    storytelling: "What's your story? · Drop your experience below",
    punchy: "Do this NOW · Stop waiting · Tag someone",
    short: "Agree? · Double tap · Swipe for more",
  };

  return {
    'Tone Style': toneMap[profile.tone] ?? (profile.customTone || 'Custom — undefined'),
    'Sentence Pattern': styleMap[profile.writingStyle] ?? 'Mixed',
    'Emotional Style': emotionMap[profile.tone] ?? 'Neutral',
    'CTA Behaviour': ctaMap[profile.writingStyle] ?? 'Varies by post',
  };
}

function analyzeContent(pastContent: string): Array<{ label: string; value: string; description: string }> {
  if (!pastContent || pastContent.trim().length < 10) return [];
  const text = pastContent.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  const hasQuestions = (text.match(/\?/g) || []).length > 0;
  const hasStats = /\d+%|\d+ out of|\d+ times|\d+x/.test(text);
  const hasStory = /when i|i remember|it was|the day|last year|i used to/.test(text);
  const hookType = hasStats ? 'Data / Statistic' : hasQuestions ? 'Question-led' : hasStory ? 'Storytelling' : 'Statement / Opinion';

  const positiveWords = ['love', 'great', 'amazing', 'best', 'success', 'growth', 'win', 'achieve'];
  const negativeWords = ['struggle', 'fail', 'mistake', 'problem', 'hard', 'difficult', 'wrong'];
  const posCount = positiveWords.filter(w => text.includes(w)).length;
  const negCount = negativeWords.filter(w => text.includes(w)).length;
  const toneType = posCount > negCount + 1 ? 'Positive / Uplifting' : negCount > posCount + 1 ? 'Contrast / Tension' : 'Balanced / Neutral';

  const hasBullets = /[-•]\s/.test(pastContent) || /^\d+\.\s/m.test(pastContent);
  const paragraphCount = pastContent.split(/\n\n+/).filter(Boolean).length;
  const structureType = hasBullets ? 'Bullet / List format' : paragraphCount > 2 ? 'Long-form paragraphs' : 'Short paragraph';

  const avgSentenceLen = wordCount / Math.max((text.match(/[.!?]/g) || []).length, 1);
  const sentenceStyle = avgSentenceLen > 20 ? 'Long & detailed (20+ words/sentence)' : avgSentenceLen > 12 ? 'Medium length (12–20 words)' : 'Short & punchy (<12 words)';

  return [
    { label: 'Hook Type', value: hookType, description: 'Primary opening strategy detected in past content' },
    { label: 'Tone Pattern', value: toneType, description: 'Emotional polarity of the writing' },
    { label: 'Structure', value: structureType, description: 'How the content is visually organised' },
    { label: 'Sentence Rhythm', value: sentenceStyle, description: 'Average sentence length and pacing' },
  ];
}

// --- Subcomponents ---

function BulletListEditor({ label, items, onChange, placeholder }: {
  label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string;
}) {
  const updateItem = (i: number, val: string) => { const n = [...items]; n[i] = val; onChange(n); };
  const addItem = () => onChange([...items, '']);
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <Label className="text-sm font-semibold mb-2 block">{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-5 h-9 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            </div>
            <Input value={item} onChange={e => updateItem(i, e.target.value)} placeholder={placeholder} className="flex-1 h-9 text-sm" />
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="text-primary gap-1.5 pl-0 hover:bg-transparent" onClick={addItem}>
          <Plus className="w-3.5 h-3.5" /> Add item
        </Button>
      </div>
    </div>
  );
}

function KeywordEditor({ keywords, onChange }: { keywords: string[]; onChange: (kw: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !keywords.includes(t)) { onChange([...keywords, t]); setInput(''); }
  };
  const remove = (kw: string) => onChange(keywords.filter(k => k !== kw));

  return (
    <div>
      <Label className="text-sm font-semibold mb-2 block">Keywords & Content Themes</Label>
      <div className="flex gap-2 mb-3">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Type keyword and press Enter" className="text-sm" />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map(kw => (
            <span key={kw} className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Tag className="w-3 h-3" />{kw}
              <button onClick={() => remove(kw)} className="ml-0.5 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Brand Intelligence Panel shown when viewing a saved profile
function IntelligenceView({ profile, onEdit, onBack }: {
  profile: BrandProfile; onEdit: () => void; onBack: () => void;
}) {
  const { score, breakdown, label } = computeBrandScore(profile);
  const voiceSummary = deriveVoiceSummary(profile);
  const contentBreakdown = analyzeContent(profile.pastContent);
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 55 ? 'text-blue-600' : score >= 30 ? 'text-amber-600' : 'text-red-500';
  const scoreBarColor = score >= 80 ? 'bg-green-500' : score >= 55 ? 'bg-blue-500' : score >= 30 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-xl gap-2 text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> All Profiles
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/10 flex items-center justify-center">
            <span className="font-display font-bold text-sm text-primary">{profile.brandName.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">{profile.brandName}</h2>
            <p className="text-muted-foreground text-sm">{profile.niche} · Intelligence Report</p>
          </div>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm" className="rounded-xl gap-2">
          <Edit3 className="w-3.5 h-3.5" /> Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Brand Score — left column */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <BarChart2 className="w-4 h-4 text-primary" /> Brand Score
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="text-center mb-5">
                <div className={`text-5xl font-display font-bold ${scoreColor} mb-1`}>{score}</div>
                <div className="text-sm text-muted-foreground">out of 100 · <span className={`font-semibold ${scoreColor}`}>{label}</span></div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-6">
                <div className={`h-full ${scoreBarColor} rounded-full transition-all`} style={{ width: `${score}%` }} />
              </div>
              <div className="space-y-3">
                {Object.entries(breakdown).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-semibold">{val}/{key === 'Brand Identity' || key === 'Audience Clarity' ? 20 : key === 'Voice Definition' ? 15 : key === 'Content Guidelines' ? 15 : 10}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={val > 0 ? scoreBarColor : 'bg-muted-foreground/20'}
                        style={{ width: `${(val / (key === 'Brand Identity' || key === 'Audience Clarity' ? 20 : key === 'Voice Definition' ? 15 : key === 'Content Guidelines' ? 15 : 10)) * 100}%`, height: '100%', borderRadius: '9999px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {score < 80 && (
                <div className="mt-4 text-xs text-amber-600 dark:text-amber-500 bg-amber-500/8 border border-amber-500/15 rounded-xl px-3 py-2">
                  {score < 30
                    ? 'Add brand identity, audience, and tone to build your profile.'
                    : score < 55
                    ? 'Add content guidelines and keywords to strengthen your profile.'
                    : 'Add past content examples to reach a strong score.'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* Voice Summary */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Mic2 className="w-4 h-4 text-violet-500" /> Voice Summary
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Auto-derived from your brand profile settings.</p>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(voiceSummary).map(([key, val]) => {
                  const icons: Record<string, any> = {
                    'Tone Style': Zap, 'Sentence Pattern': AlignLeft, 'Emotional Style': TrendingUp, 'CTA Behaviour': Target
                  };
                  const Icon = icons[key] || Lightbulb;
                  return (
                    <div key={key} className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{key}</p>
                        <p className="text-sm font-medium text-foreground">{val}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content Breakdown */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <MessageSquare className="w-4 h-4 text-blue-500" /> Content Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {contentBreakdown.length > 0
                  ? 'Analysed from your past high-performing content examples.'
                  : 'Add past content examples to unlock this analysis.'}
              </p>
            </CardHeader>
            <CardContent className="p-5">
              {contentBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contentBreakdown.map(item => (
                    <div key={item.label} className="p-4 rounded-xl border border-border/50 bg-card">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{item.label}</p>
                      <Badge variant="secondary" className="mb-2 font-medium">{item.value}</Badge>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No past content added yet.</p>
                  <Button variant="link" size="sm" onClick={onEdit} className="mt-1 text-primary">Add content examples →</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Summary */}
          {(profile.dos.filter(Boolean).length > 0 || profile.donts.filter(Boolean).length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.dos.filter(Boolean).length > 0 && (
                <Card className="border-green-500/20 bg-green-500/3 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-3">Brand Do's</p>
                    <ul className="space-y-1.5">
                      {profile.dos.filter(Boolean).map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {profile.donts.filter(Boolean).length > 0 && (
                <Card className="border-red-500/20 bg-red-500/3 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">Brand Don'ts</p>
                    <ul className="space-y-1.5">
                      {profile.donts.filter(Boolean).map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- Main Page ---
export function BrandProfilePage() {
  const { profiles, activeProfile, setActiveProfile, refreshProfiles, setView } = useWorkflow();
  const { toast } = useToast();

  const [editingProfile, setEditingProfile] = useState<BrandProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<BrandProfile | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleNew = () => { setEditingProfile(createEmptyProfile()); setIsNew(true); setViewingProfile(null); };
  const handleEdit = (p: BrandProfile) => { setEditingProfile({ ...p }); setIsNew(false); setViewingProfile(null); };
  const handleView = (p: BrandProfile) => { setViewingProfile(p); setEditingProfile(null); };
  const handleCancel = () => { setEditingProfile(null); setIsNew(false); };
  const handleBackToList = () => { setViewingProfile(null); };

  const handleSave = () => {
    if (!editingProfile) return;
    if (!editingProfile.brandName.trim()) {
      toast({ title: 'Brand name required', description: 'Please enter a brand name.', variant: 'destructive' });
      return;
    }
    saveProfile(editingProfile);
    refreshProfiles();
    setEditingProfile(null);
    setIsNew(false);
    toast({ title: 'Profile saved', description: `${editingProfile.brandName} has been saved.` });
  };

  const handleDelete = (id: string, name: string) => {
    deleteProfile(id);
    refreshProfiles();
    if (activeProfile?.id === id) setActiveProfile(null);
    if (viewingProfile?.id === id) setViewingProfile(null);
    toast({ title: 'Profile deleted', description: `${name} has been removed.` });
  };

  const handleSetActive = (p: BrandProfile) => {
    setActiveProfileId(p.id);
    setActiveProfile(p);
    refreshProfiles();
    toast({ title: `${p.brandName} is now active`, description: 'Next strategy will be tuned to this brand.' });
  };

  const handleClearActive = () => {
    setActiveProfileId(null);
    setActiveProfile(null);
    refreshProfiles();
    toast({ description: 'Active profile cleared.' });
  };

  const updateField = <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => {
    setEditingProfile(prev => prev ? { ...prev, [key]: value } : prev);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32">
      {/* Page Header */}
      {!viewingProfile && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-violet-600" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">Client Brain</h1>
            </div>
            <p className="text-muted-foreground text-lg">Brand intelligence layer — profiles adapt AI content generation.</p>
          </div>
          {!editingProfile && (
            <Button onClick={handleNew} className="shrink-0 rounded-xl shadow-md shadow-primary/20 gap-2">
              <Plus className="w-4 h-4" /> New Profile
            </Button>
          )}
        </div>
      )}

      {/* Active Profile Banner */}
      {activeProfile && !editingProfile && !viewingProfile && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Active: <span className="text-primary">{activeProfile.brandName}</span></p>
              <p className="text-xs text-muted-foreground">{activeProfile.niche} · {activeProfile.tone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={() => setView('create')}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Strategy
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl h-8 text-xs text-muted-foreground" onClick={handleClearActive}>Clear</Button>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Intelligence View */}
        {viewingProfile && !editingProfile && (
          <IntelligenceView
            key="intelligence"
            profile={viewingProfile}
            onEdit={() => handleEdit(viewingProfile)}
            onBack={handleBackToList}
          />
        )}

        {/* Editor */}
        {editingProfile && (
          <motion.div key="editor" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mb-10">
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <Edit3 className="w-5 h-5 text-primary" />
                  {isNew ? 'New Brand Profile' : `Editing: ${editingProfile.brandName || '…'}`}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="rounded-xl"><X className="w-4 h-4" /></Button>
              </CardHeader>

              <CardContent className="p-6 space-y-8">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Brand Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Brand Name *</Label>
                      <Input value={editingProfile.brandName} onChange={e => updateField('brandName', e.target.value)} placeholder="e.g. FitNation, TechBloom, Aura Studio" className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Niche / Industry</Label>
                      <Input value={editingProfile.niche} onChange={e => updateField('niche', e.target.value)} placeholder="e.g. Fitness, SaaS, Real Estate, Beauty" className="text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold mb-1.5 block">Target Audience</Label>
                      <Input value={editingProfile.targetAudience} onChange={e => updateField('targetAudience', e.target.value)} placeholder="e.g. Women 25-35 interested in wellness" className="text-sm" />
                    </div>
                  </div>
                </div>

                {/* Voice & Style */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Voice & Style</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Brand Tone</Label>
                      <Select value={editingProfile.tone} onValueChange={val => updateField('tone', val)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select tone" /></SelectTrigger>
                        <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      {editingProfile.tone === 'Custom' && (
                        <Input className="mt-2 text-sm" value={editingProfile.customTone || ''} onChange={e => updateField('customTone', e.target.value)} placeholder="Describe the custom tone..." />
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Writing Style</Label>
                      <Select value={editingProfile.writingStyle} onValueChange={val => updateField('writingStyle', val as any)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{WRITING_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Do's and Don'ts */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Content Guidelines</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <BulletListEditor label="Do's — What this brand always does" items={editingProfile.dos.length ? editingProfile.dos : ['']} onChange={val => updateField('dos', val)} placeholder="e.g. Always end with a question" />
                    <BulletListEditor label="Don'ts — What this brand avoids" items={editingProfile.donts.length ? editingProfile.donts : ['']} onChange={val => updateField('donts', val)} placeholder="e.g. Never use corporate jargon" />
                  </div>
                </div>

                {/* Past Content */}
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Past High-Performing Content</Label>
                  <p className="text-xs text-muted-foreground mb-2">Paste examples of content that performed well. Powers content breakdown analysis.</p>
                  <Textarea value={editingProfile.pastContent} onChange={e => updateField('pastContent', e.target.value)} placeholder="Paste captions, hooks, or post descriptions that got strong engagement..." className="text-sm min-h-[100px] resize-none" />
                </div>

                {/* Keywords */}
                <KeywordEditor keywords={editingProfile.keywords} onChange={val => updateField('keywords', val)} />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-border/50">
                  <Button onClick={handleSave} className="gap-2 rounded-xl shadow-md shadow-primary/20">
                    <Save className="w-4 h-4" /> Save Profile
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="rounded-xl">Cancel</Button>
                  {!isNew && (
                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl ml-auto" onClick={() => { handleDelete(editingProfile.id, editingProfile.brandName); handleCancel(); }}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile List */}
        {!editingProfile && !viewingProfile && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-6">
                  <Brain className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">No brand profiles yet</h3>
                <p className="text-muted-foreground max-w-sm mb-8">Create your first brand profile to start generating content tailored to a client's voice and style.</p>
                <Button onClick={handleNew} className="gap-2 rounded-xl shadow-md shadow-primary/20">
                  <Plus className="w-4 h-4" /> Create First Profile
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {profiles.map((profile, i) => {
                  const isActive = activeProfile?.id === profile.id;
                  const { score, label } = computeBrandScore(profile);
                  const scoreColor = score >= 80 ? 'text-green-600' : score >= 55 ? 'text-blue-600' : score >= 30 ? 'text-amber-600' : 'text-red-500';
                  return (
                    <motion.div key={profile.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className={`border transition-colors h-full flex flex-col cursor-pointer ${isActive ? 'border-primary/40 bg-primary/[0.02]' : 'border-border/60 hover:border-primary/30'}`} onClick={() => handleView(profile)}>
                        <CardContent className="p-5 flex flex-col h-full">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/10 flex items-center justify-center shrink-0">
                                <span className="font-display font-bold text-sm text-primary">{profile.brandName.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <h3 className="font-display font-bold text-foreground leading-tight">{profile.brandName}</h3>
                                <p className="text-xs text-muted-foreground">{profile.niche || 'No niche set'}</p>
                              </div>
                            </div>
                            {isActive && <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0 text-xs">Active</Badge>}
                          </div>

                          {/* Score bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground">Brand Score</span>
                              <span className={`font-bold ${scoreColor}`}>{score}/100 · {label}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 55 ? 'bg-blue-500' : score >= 30 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${score}%` }} />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">{profile.tone?.split(' & ')[0]}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50 capitalize">{profile.writingStyle}</span>
                          </div>

                          <div className="flex gap-2 pt-3 border-t border-border/40 mt-auto" onClick={e => e.stopPropagation()}>
                            {!isActive ? (
                              <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs" onClick={() => handleSetActive(profile)}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> Set Active
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="flex-1 rounded-xl h-8 text-xs text-muted-foreground" onClick={handleClearActive}>Clear Active</Button>
                            )}
                            <Button size="sm" variant="ghost" className="rounded-xl h-8 text-xs" onClick={() => handleEdit(profile)}>
                              <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="rounded-xl h-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(profile.id, profile.brandName)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
