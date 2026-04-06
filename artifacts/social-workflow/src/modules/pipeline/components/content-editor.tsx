import React, { useState } from 'react';
import { ContentDraft, PlatformVariant, PLATFORM_LABELS, PlatformType, calculateQualityScore, getQualityColor } from '../lib/pipeline-types';
import { usePipeline } from '../context/pipeline-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Save, X, Instagram, Linkedin, Music2, Twitter, Youtube, Info, Plus, Sparkles, Eye, EyeOff, AlertTriangle, Library, BookOpen, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { normalizeHashtags } from '@/lib/content-utils';

import { useWorkflow } from '@/context/workflow-context';

interface ContentEditorProps {
  draft: ContentDraft;
  onClose: () => void;
}

const ALL_PLATFORMS: PlatformType[] = ['instagram', 'linkedin', 'tiktok', 'twitter', 'youtube_shorts'];

const PLATFORM_ICONS: Record<PlatformType, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  youtube_shorts: <Youtube className="w-4 h-4" />,
};

function createEmptyVariant(platform: PlatformType): PlatformVariant {
  return { platform, caption: '', hook: '', hashtags: [] };
}

// Simple content improvement (fake AI)
function improveHook(hook: string): string {
  if (!hook) return hook;
  // Make more curiosity-driven
  let improved = hook;
  if (!improved.includes('?') && !improved.toLowerCase().startsWith('why') && !improved.toLowerCase().startsWith('how')) {
    const starters = ['Here\'s why ', 'This is why ', 'The truth about '];
    const starter = starters[Math.floor(Math.random() * starters.length)];
    improved = starter + improved.charAt(0).toLowerCase() + improved.slice(1);
  }
  if (!improved.endsWith('...') && !improved.endsWith('.')) {
    improved = improved.replace(/\.$/, '') + '...';
  }
  return improved;
}

function improveCaption(caption: string): string {
  if (!caption) return caption;
  let improved = caption.trim();
  const ctas = ['Save this for later.', 'Share this with someone who needs it.', 'What do you think? Tell me below.', 'Try this and let me know how it goes.'];
  const hasWeakCTA = /save|share|tag|comment/i.test(improved);
  if (!hasWeakCTA) {
    const cta = ctas[Math.floor(Math.random() * ctas.length)];
    improved = improved + '\n\n' + cta;
  }
  return improved;
}

function improveHashtags(hashtags: string[], context: string): string[] {
  const existing = normalizeHashtags(hashtags);
  if (existing.length >= 5) {
    return existing;
  }

  const keywordTags = context
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 6)
    .map(word => `#${word}`);

  return normalizeHashtags([...existing, ...keywordTags, '#contentstrategy', '#socialmedia']).slice(0, 8);
}

function areVariantsEqual(left: PlatformVariant[], right: PlatformVariant[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getSmartWarnings(variant: PlatformVariant): string[] {
  const warnings: string[] = [];
  if (!variant.hook || variant.hook.length < 10) warnings.push('Hook is too short');
  if (!variant.caption || variant.caption.length < 20) warnings.push('Caption is too short');
  if (!variant.caption?.match(/save|share|tag|comment|click|follow|link|swipe/i)) warnings.push('No call-to-action');
  if (variant.hashtags.length === 0) warnings.push('No hashtags');
  if (variant.hashtags.length > 15) warnings.push('Too many hashtags');
  if (variant.caption && variant.caption.length > 2200) warnings.push('Caption may exceed platform limit');
  return warnings;
}

export function ContentEditor({ draft, onClose }: ContentEditorProps) {
  const { updateDraft } = usePipeline();
  const { strategy } = useWorkflow();
  const { toast } = useToast();

  const [title, setTitle] = useState(draft.title);
  const [idea, setIdea] = useState(draft.sourceIdea);
  const [variants, setVariants] = useState<PlatformVariant[]>(
    (draft.platformVariants || []).map(v => ({ ...v, hashtags: [...(v.hashtags || [])] }))
  );
  const [createdBy, setCreatedBy] = useState(draft.createdBy || '');
  const [internalNotes, setInternalNotes] = useState(draft.internalNotes || '');
  const [sourceType, setSourceType] = useState(draft.sourceType || draft.source);
  const [activeTab, setActiveTab] = useState(variants[0]?.platform || 'instagram');
  const [showPreview, setShowPreview] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [hashtagInputs, setHashtagInputs] = useState<Partial<Record<PlatformType, string>>>({});

  const currentPlatforms = new Set(variants.map(v => v.platform));
  const availableToAdd = ALL_PLATFORMS.filter(p => !currentPlatforms.has(p));

  const updateVariant = (index: number, field: keyof PlatformVariant, value: string | string[]) => {
    setVariants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const commitHashtagInput = (platform: PlatformType) => {
    const pendingValue = hashtagInputs[platform]?.trim();
    if (!pendingValue) {
      return;
    }

    const variantIndex = variants.findIndex(variant => variant.platform === platform);
    if (variantIndex < 0) {
      return;
    }

    updateVariant(variantIndex, 'hashtags', normalizeHashtags([...variants[variantIndex].hashtags, pendingValue]));
    setHashtagInputs(prev => ({ ...prev, [platform]: '' }));
  };

  const addPlatform = (platform: PlatformType) => {
    setVariants(prev => [...prev, createEmptyVariant(platform)]);
    setActiveTab(platform);
  };

  const removePlatform = (platform: PlatformType) => {
    setVariants(prev => {
      const next = prev.filter(v => v.platform !== platform);
      if (activeTab === platform && next.length > 0) setActiveTab(next[0].platform);
      return next;
    });
  };

  const handleImprove = () => {
    setIsImproving(true);
    setTimeout(() => {
      const nextVariants = (variants || []).map(variant => ({
        ...variant,
        hook: improveHook(variant.hook),
        caption: improveCaption(variant.caption),
        hashtags: improveHashtags(variant.hashtags, `${idea} ${variant.caption} ${variant.hook}`),
      }));
      if (areVariantsEqual(variants, nextVariants)) {
        setIsImproving(false);
        toast({
          title: 'No major improvements applied',
          description: 'The current content already matches the improvement rules.',
        });
        return;
      }
      setVariants(nextVariants);
      setIsImproving(false);
      toast({
        title: 'Content refined ✨', 
        description: 'Applied curiosity-driven hooks and CTAs to all platform variants.',
      });
    }, 600);
  };

  const handleSave = () => {
    if (variants.length === 0) { toast({ title: 'At least one platform required', variant: 'destructive' }); return; }
    const nextVariants = variants.map(variant => {
      const pendingValue = hashtagInputs[variant.platform]?.trim();
      return pendingValue
        ? { ...variant, hashtags: normalizeHashtags([...variant.hashtags, pendingValue]) }
        : variant;
    });
    updateDraft(draft.id, { 
      title,
      sourceIdea: idea, 
      platformVariants: nextVariants,
      createdBy,
      internalNotes,
      sourceType: sourceType === 'manual' ? 'manual' : 'ai'
    });
    toast({ title: 'Draft updated', description: 'Changes saved successfully.' });
    onClose();
  };

  const activeVariant = variants.find(v => v.platform === activeTab);
  const activeWarnings = activeVariant ? getSmartWarnings(activeVariant) : [];
  const activeScore = activeVariant ? calculateQualityScore(activeVariant) : null;

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onClose} className="mb-2 -ml-3">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pipeline
          </Button>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            Edit Content Draft
            {activeScore && (
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md border", getQualityColor(activeScore.total))}>
                {activeScore.total}/100
              </span>
            )}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImprove} className="rounded-lg gap-1.5 h-8 text-xs">
            <Sparkles className="w-3 h-3" /> Improve Content
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Smart Warnings */}
        {activeWarnings.length > 0 && (
          <div className="bg-amber-500/[0.06] border border-amber-500/10 rounded-xl p-3 space-y-1.5">
            {activeWarnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
              </div>
            ))}
          </div>
        )}

        {/* Title & Source Idea */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Draft Title</Label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Summer Reel Concept"
              className="text-sm rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Content Idea</Label>
            <Textarea 
              value={idea} 
              onChange={e => setIdea(e.target.value)} 
              placeholder="What is this post about?"
              className="text-sm min-h-[60px] rounded-xl" 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Created By</Label>
              <Input 
                value={createdBy} 
                onChange={e => setCreatedBy(e.target.value)} 
                placeholder="Team member name"
                className="text-sm rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Source Category</Label>
              <Input 
                value={sourceType} 
                onChange={e => setSourceType(e.target.value as any)} 
                placeholder="e.g. AI, Manual, Client Idea"
                className="text-sm rounded-xl"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Internal Team Notes</Label>
            <Textarea 
              value={internalNotes} 
              onChange={e => setInternalNotes(e.target.value)} 
              placeholder="Add notes for your team (not visible to client)..."
              className="text-sm min-h-[80px] rounded-xl bg-muted/20" 
            />
          </div>
        </div>

        {/* Platform Variants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold block">Platform Variants</Label>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-8 text-xs rounded-lg gap-1.5">
                {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
              {availableToAdd.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1.5">
                      <Plus className="w-3 h-3" /> Add Platform
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Add a platform</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableToAdd.map(p => (
                      <DropdownMenuItem key={p} onClick={() => addPlatform(p)} className="gap-2 cursor-pointer">
                        {PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {variants.length === 0 ? (
            <div className="border border-dashed border-border/40 rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No platforms</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5"><Plus className="w-3 h-3" /> Add Platform</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {ALL_PLATFORMS.map(p => (
                    <DropdownMenuItem key={p} onClick={() => addPlatform(p)} className="gap-2 cursor-pointer">
                      {PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PlatformType)}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                {variants.map((v) => {
                  const vs = calculateQualityScore(v);
                  return (
                    <div key={v.platform} className="relative group/tab">
                      <TabsTrigger value={v.platform} className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground pr-7">
                        {PLATFORM_ICONS[v.platform]}
                        {PLATFORM_LABELS[v.platform]}
                        <span className={cn("text-[9px] font-bold ml-1", vs.total >= 75 ? 'text-green-500' : vs.total >= 50 ? 'text-amber-500' : 'text-red-500')}>
                          {vs.total}
                        </span>
                      </TabsTrigger>
                      {variants.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); removePlatform(v.platform); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label={`Remove ${PLATFORM_LABELS[v.platform]}`}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </TabsList>

              {variants.map((variant, i) => (
                <TabsContent key={variant.platform} value={variant.platform} className={cn("space-y-4 mt-0 transition-opacity duration-300", isImproving && "opacity-50 blur-[1px]")}>
                  {showPreview ? (
                    <ContentPreview variant={variant} idea={idea} />
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-medium text-muted-foreground block">Hook</Label>
                          {strategy?.approvedPool?.hooks && strategy.approvedPool.hooks.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary gap-1.5 rounded-md hover:bg-primary/5">
                                  <Library className="w-3 h-3" /> Pick from Approved Hooks
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[300px] max-h-[300px] overflow-y-auto">
                                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Approved Hook Pool</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {strategy.approvedPool.hooks.map((h, idx) => (
                                  <DropdownMenuItem key={idx} onClick={() => updateVariant(i, 'hook', h)} className="text-xs cursor-pointer py-2">
                                    {h}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <Input value={variant.hook} onChange={e => updateVariant(i, 'hook', e.target.value)} className="text-sm" placeholder="Paste or pick a hook..." />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-medium text-muted-foreground block">Caption</Label>
                          {strategy?.approvedPool?.captions && strategy.approvedPool.captions.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary gap-1.5 rounded-md hover:bg-primary/5">
                                  <BookOpen className="w-3 h-3" /> Pick from Approved Captions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[300px] max-h-[300px] overflow-y-auto">
                                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Approved Caption Pool</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {strategy.approvedPool.captions.map((c, idx) => (
                                  <DropdownMenuItem key={idx} onClick={() => updateVariant(i, 'caption', c)} className="text-xs cursor-pointer py-2">
                                    <div className="line-clamp-3">{c}</div>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <Textarea value={variant.caption} onChange={e => updateVariant(i, 'caption', e.target.value)} className="text-sm min-h-[120px]" placeholder="Paste or pick a caption..." />
                        <p className="text-[11px] text-muted-foreground/50 mt-1">{variant.caption?.length || 0} characters</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">Hashtags</Label>
                        <div className="rounded-xl border border-input bg-background px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {variant.hashtags.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => updateVariant(i, 'hashtags', variant.hashtags.filter(existing => existing !== tag))}
                                  className="text-primary/70 transition-colors hover:text-destructive"
                                  aria-label={`Remove ${tag}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            <input
                              value={hashtagInputs[variant.platform] ?? ''}
                              onChange={event => setHashtagInputs(prev => ({ ...prev, [variant.platform]: event.target.value }))}
                              onBlur={() => commitHashtagInput(variant.platform)}
                              onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ',') {
                                  event.preventDefault();
                                  commitHashtagInput(variant.platform);
                                }
                                if (event.key === 'Backspace' && !(hashtagInputs[variant.platform] ?? '').trim() && variant.hashtags.length > 0) {
                                  event.preventDefault();
                                  updateVariant(i, 'hashtags', variant.hashtags.slice(0, -1));
                                }
                              }}
                              className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                              placeholder="Type a hashtag and press Enter"
                              aria-label={`Hashtags for ${PLATFORM_LABELS[variant.platform]}`}
                            />
                          </div>
                        </div>
                        {variant.hashtags.length > 0 && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{variant.hashtags.length} tag{variant.hashtags.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Button onClick={handleSave} className="gap-2 rounded-xl" disabled={variants.length === 0}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
        </div>

      </CardContent>
    </Card>
  );
}

// Platform-specific content preview
function ContentPreview({ variant, idea }: { variant: PlatformVariant; idea: string }) {
  if (variant.platform === 'instagram') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/50 overflow-hidden max-w-sm mx-auto">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
            <Instagram className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">your_brand</p>
            <p className="text-[10px] text-zinc-500">Sponsored</p>
          </div>
        </div>
        <div className="w-full aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center p-6">
          <p className="text-sm text-center text-muted-foreground font-medium">{idea}</p>
        </div>
        <div className="px-3 py-2.5 space-y-1">
          <p className="text-xs text-zinc-900 dark:text-zinc-100">
            <span className="font-semibold">your_brand</span> {variant.caption.slice(0, 120)}{variant.caption.length > 120 ? '...' : ''}
          </p>
          {variant.hashtags.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400">{variant.hashtags.slice(0, 5).join(' ')}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant.platform === 'linkedin') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border/50 overflow-hidden max-w-md mx-auto p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your Brand</p>
            <p className="text-xs text-zinc-500">Company · Sponsored</p>
          </div>
        </div>
        <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{variant.caption}</p>
        {variant.hashtags.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{variant.hashtags.join(' ')}</p>
        )}
      </div>
    );
  }

  // Generic preview for other platforms
  return (
    <div className="bg-muted/30 rounded-xl border border-border/50 p-5 space-y-3 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        {PLATFORM_ICONS[variant.platform]}
        <span className="text-sm font-semibold">{PLATFORM_LABELS[variant.platform]} Preview</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Hook</p>
        <p className="text-sm font-medium">{variant.hook || '(empty)'}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Caption</p>
        <p className="text-sm whitespace-pre-wrap">{variant.caption || '(empty)'}</p>
      </div>
      {variant.hashtags.length > 0 && (
        <p className="text-xs text-blue-600 dark:text-blue-400">{variant.hashtags.join(' ')}</p>
      )}
    </div>
  );
}
