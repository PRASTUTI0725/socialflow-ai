import React, { useState, useEffect } from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain, Plus, Save, Trash2, CheckCircle2, Edit3, X, Tag, ChevronRight, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import {
  BrandProfile, createEmptyProfile, saveProfile, deleteProfile, setActiveProfileId
} from '@/lib/brand-memory';

const TONES = [
  'Professional & Authoritative',
  'Casual & Friendly',
  'Bold & Disruptive',
  'Educational & Informative',
  'Witty & Humorous',
  'Inspirational & Motivational',
  'Empathetic & Supportive',
  'Custom',
];

const WRITING_STYLES = [
  { value: 'educational', label: 'Educational — structured, data-backed, informative' },
  { value: 'storytelling', label: 'Storytelling — narrative-driven, emotional arc' },
  { value: 'punchy', label: 'Punchy — short, direct, high-impact lines' },
  { value: 'short', label: 'Short-form — concise bullets, scannable content' },
] as const;

function BulletListEditor({
  label, items, onChange, placeholder
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const updateItem = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const addItem = () => onChange([...items, '']);
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <Label className="text-sm font-semibold mb-2 block">{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-5 h-9 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-0.5" />
            </div>
            <Input
              value={item}
              onChange={e => updateItem(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 h-9 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(i)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary gap-1.5 pl-0 hover:bg-transparent"
          onClick={addItem}
        >
          <Plus className="w-3.5 h-3.5" /> Add item
        </Button>
      </div>
    </div>
  );
}

function KeywordEditor({ keywords, onChange }: { keywords: string[]; onChange: (kw: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
      setInput('');
    }
  };

  const remove = (kw: string) => onChange(keywords.filter(k => k !== kw));

  return (
    <div>
      <Label className="text-sm font-semibold mb-2 block">Keywords & Content Themes</Label>
      <div className="flex gap-2 mb-3">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Type a keyword and press Enter"
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map(kw => (
            <span
              key={kw}
              className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              <Tag className="w-3 h-3" />
              {kw}
              <button
                onClick={() => remove(kw)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandProfilePage() {
  const { profiles, activeProfile, setActiveProfile, refreshProfiles, setView } = useWorkflow();
  const { toast } = useToast();

  const [editingProfile, setEditingProfile] = useState<BrandProfile | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleNew = () => {
    setEditingProfile(createEmptyProfile());
    setIsNew(true);
  };

  const handleEdit = (p: BrandProfile) => {
    setEditingProfile({ ...p });
    setIsNew(false);
  };

  const handleCancel = () => {
    setEditingProfile(null);
    setIsNew(false);
  };

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
    if (activeProfile?.id === id) {
      setActiveProfile(null);
    }
    toast({ title: 'Profile deleted', description: `${name} has been removed.` });
  };

  const handleSetActive = (p: BrandProfile) => {
    setActiveProfileId(p.id);
    setActiveProfile(p);
    refreshProfiles();
    toast({
      title: `${p.brandName} is now active`,
      description: 'Your next strategy will be tuned to this brand profile.',
    });
  };

  const handleClearActive = () => {
    setActiveProfileId(null);
    setActiveProfile(null);
    refreshProfiles();
    toast({ description: 'Active profile cleared. Strategies will use generic output.' });
  };

  const updateField = <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => {
    setEditingProfile(prev => prev ? { ...prev, [key]: value } : prev);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-violet-600" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">Client Brain</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Store brand DNA for each client. Content generation adapts to the active profile.
          </p>
        </div>
        {!editingProfile && (
          <Button onClick={handleNew} className="shrink-0 rounded-xl shadow-md shadow-primary/20 gap-2">
            <Plus className="w-4 h-4" /> New Profile
          </Button>
        )}
      </div>

      {/* Active Profile Banner */}
      {activeProfile && !editingProfile && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Active: <span className="text-primary">{activeProfile.brandName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {activeProfile.niche} · {activeProfile.tone} · {activeProfile.writingStyle}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-8 text-xs"
              onClick={() => setView('create')}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Strategy
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl h-8 text-xs text-muted-foreground" onClick={handleClearActive}>
              Clear
            </Button>
          </div>
        </motion.div>
      )}

      {/* Profile Editor */}
      <AnimatePresence mode="wait">
        {editingProfile && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mb-10"
          >
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-display">
                  <Edit3 className="w-5 h-5 text-primary" />
                  {isNew ? 'New Brand Profile' : `Editing: ${editingProfile.brandName || '…'}`}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="rounded-xl">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-8">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Brand Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Brand Name *</Label>
                      <Input
                        value={editingProfile.brandName}
                        onChange={e => updateField('brandName', e.target.value)}
                        placeholder="e.g. FitNation, TechBloom, Aura Studio"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Niche / Industry</Label>
                      <Input
                        value={editingProfile.niche}
                        onChange={e => updateField('niche', e.target.value)}
                        placeholder="e.g. Fitness, SaaS, Real Estate, Beauty"
                        className="text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold mb-1.5 block">Target Audience</Label>
                      <Input
                        value={editingProfile.targetAudience}
                        onChange={e => updateField('targetAudience', e.target.value)}
                        placeholder="e.g. Women 25-35 interested in wellness, B2B founders, First-time homebuyers"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Voice & Style */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Voice & Style</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Brand Tone</Label>
                      <Select
                        value={editingProfile.tone}
                        onValueChange={val => updateField('tone', val)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TONES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editingProfile.tone === 'Custom' && (
                        <Input
                          className="mt-2 text-sm"
                          value={editingProfile.customTone || ''}
                          onChange={e => updateField('customTone', e.target.value)}
                          placeholder="Describe the custom tone..."
                        />
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-1.5 block">Writing Style</Label>
                      <Select
                        value={editingProfile.writingStyle}
                        onValueChange={val => updateField('writingStyle', val as any)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WRITING_STYLES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Do's and Don'ts */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Content Guidelines</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <BulletListEditor
                      label="Do's — What this brand always does"
                      items={editingProfile.dos.length ? editingProfile.dos : ['']}
                      onChange={val => updateField('dos', val)}
                      placeholder="e.g. Always end with a question"
                    />
                    <BulletListEditor
                      label="Don'ts — What this brand avoids"
                      items={editingProfile.donts.length ? editingProfile.donts : ['']}
                      onChange={val => updateField('donts', val)}
                      placeholder="e.g. Never use corporate jargon"
                    />
                  </div>
                </div>

                {/* Past Content */}
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">Past High-Performing Content</Label>
                  <p className="text-xs text-muted-foreground mb-2">Paste examples of content that performed well. This helps calibrate brand voice.</p>
                  <Textarea
                    value={editingProfile.pastContent}
                    onChange={e => updateField('pastContent', e.target.value)}
                    placeholder="Paste captions, hooks, or post descriptions that got strong engagement for this brand..."
                    className="text-sm min-h-[100px] resize-none"
                  />
                </div>

                {/* Keywords */}
                <KeywordEditor
                  keywords={editingProfile.keywords}
                  onChange={val => updateField('keywords', val)}
                />

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-border/50">
                  <Button onClick={handleSave} className="gap-2 rounded-xl shadow-md shadow-primary/20">
                    <Save className="w-4 h-4" /> Save Profile
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="rounded-xl">
                    Cancel
                  </Button>
                  {!isNew && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl ml-auto"
                      onClick={() => {
                        handleDelete(editingProfile.id, editingProfile.brandName);
                        handleCancel();
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile List */}
      {!editingProfile && (
        <>
          {profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-violet-400" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">No brand profiles yet</h3>
              <p className="text-muted-foreground max-w-sm mb-8">
                Create your first brand profile to start generating content tailored to a specific client's voice and style.
              </p>
              <Button onClick={handleNew} className="gap-2 rounded-xl shadow-md shadow-primary/20">
                <Plus className="w-4 h-4" /> Create First Profile
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {profiles.map((profile, i) => {
                const isActive = activeProfile?.id === profile.id;
                return (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <Card className={`border transition-colors h-full flex flex-col ${isActive ? 'border-primary/40 bg-primary/3' : 'border-border/60 hover:border-border'}`}>
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/10 flex items-center justify-center shrink-0">
                              <span className="font-display font-bold text-sm text-primary">
                                {profile.brandName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-display font-bold text-foreground leading-tight">{profile.brandName}</h3>
                              <p className="text-xs text-muted-foreground">{profile.niche || 'No niche set'}</p>
                            </div>
                          </div>
                          {isActive && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0 text-xs">Active</Badge>
                          )}
                        </div>

                        <div className="space-y-2 mb-4 flex-1">
                          {profile.targetAudience && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Audience</p>
                              <p className="text-sm text-foreground line-clamp-2">{profile.targetAudience}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                              {profile.tone?.replace(' & ', ' ')}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50 capitalize">
                              {profile.writingStyle}
                            </span>
                          </div>
                          {profile.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {profile.keywords.slice(0, 3).map(kw => (
                                <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
                                  {kw}
                                </span>
                              ))}
                              {profile.keywords.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{profile.keywords.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-border/40">
                          {!isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-xl h-8 text-xs"
                              onClick={() => handleSetActive(profile)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> Set Active
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 rounded-xl h-8 text-xs text-muted-foreground"
                              onClick={handleClearActive}
                            >
                              Clear Active
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl h-8 text-xs"
                            onClick={() => handleEdit(profile)}
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl h-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(profile.id, profile.brandName)}
                          >
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
        </>
      )}
    </div>
  );
}
