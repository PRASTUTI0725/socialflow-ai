import React, { useState } from 'react';
import { ContentDraft, ContentStatus, DesignStatus, STATUS_LABELS, DESIGN_LABELS, PLATFORM_LABELS, PlatformType, getBestVariantScore, getQualityColor, getDraftNextAction, STATUS_BORDER_COLORS, type DraftNextAction, DraftSource, MAX_REVISIONS } from '../lib/pipeline-types';
import { usePipeline } from '../context/pipeline-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Eye, CheckCircle2, CalendarDays, Sparkles, ArrowRight, X, Users, Plus, ThumbsUp, ThumbsDown, Palette, Trash2, Instagram, Linkedin, Music2, Twitter, Youtube, Edit3, Clock, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { useClients } from '@/modules/clients/context/client-context';
import { learnFromApproval } from '@/modules/clients/lib/brand-intelligence';
import { onPerformanceMarked } from '@/services/automation';

interface ContentDraftCardProps {
  draft: ContentDraft;
  onEdit: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  internal_review: 'bg-primary/10 text-primary border-primary/20',
  client_review: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-green-500/10 text-green-600 border-green-500/20',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  published: 'bg-green-600/10 text-green-700 border-green-600/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const SOURCE_LABELS: Record<DraftSource, string> = {
  ai: 'AI Generated',
  manual: 'Manual',
};

const SOURCE_COLORS: Record<DraftSource, string> = {
  ai: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  manual: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

const DESIGN_COLORS: Record<DesignStatus, string> = {
  not_started: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  in_progress: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ready: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const STATUS_NEXT: Partial<Record<ContentStatus, ContentStatus>> = {
  draft: 'internal_review',
  internal_review: 'client_review',
  client_review: 'approved',
  approved: 'scheduled',
  scheduled: 'published',
};

const STATUS_NEXT_LABEL: Partial<Record<ContentStatus, string>> = {
  draft: 'To Internal Review',
  internal_review: 'To Client Review',
  client_review: 'Approve',
  approved: 'Schedule',
  scheduled: 'Mark Published',
};

const DESIGN_CYCLE: DesignStatus[] = ['not_started', 'in_progress', 'ready'];

const PLATFORM_ICONS: Record<PlatformType, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
  tiktok: <Music2 className="w-3 h-3" />,
  twitter: <Twitter className="w-3 h-3" />,
  youtube_shorts: <Youtube className="w-3 h-3" />,
};

const NEXT_ACTION_ICONS: Record<DraftNextAction['icon'], React.ReactNode> = {
  review: <Eye className="w-3 h-3" />,
  clock: <CalendarDays className="w-3 h-3" />,
  calendar: <CalendarDays className="w-3 h-3" />,
  check: <CheckCircle2 className="w-3 h-3" />,
};

export function ContentDraftCard({ draft, onEdit, selected = false, onToggleSelect, showCheckbox = false }: ContentDraftCardProps) {
  const { changeStatus, updateDraft, deleteDraft, getApprovalFlow } = usePipeline();
  const { clients, activeClient, updateClient } = useClients();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const nextStatus = STATUS_NEXT[draft.status];
  const qualityScore = getBestVariantScore(draft);
  const scoreColor = getQualityColor(qualityScore);

  const approvalFlow = getApprovalFlow(draft.id);
  const approvalStatus = approvalFlow?.overallStatus;
  const nextAction = getDraftNextAction(draft, !!approvalFlow, approvalStatus);
  const borderClass = STATUS_BORDER_COLORS[draft.status];

  const handleSchedule = (date: Date | undefined) => {
    if (date) {
      updateDraft(draft.id, { scheduledDate: date.toISOString(), status: 'scheduled' });
      setCalendarOpen(false);
    }
  };

  const handleClearSchedule = () => {
    updateDraft(draft.id, { scheduledDate: null, status: 'approved' });
  };

  const handleDesignCycle = () => {
    const currentIdx = DESIGN_CYCLE.indexOf(draft.designStatus);
    const next = DESIGN_CYCLE[(currentIdx + 1) % DESIGN_CYCLE.length];
    updateDraft(draft.id, { designStatus: next });
  };

  const handleMarkPerformance = (rating: 'high' | 'low') => {
    const newRating = draft.performanceRating === rating ? null : rating;
    updateDraft(draft.id, { performanceRating: newRating });

    if (newRating && activeClient) {
      const hooks = (draft.platformVariants || []).map(v => v.hook).filter(Boolean);
      const ideas = [draft.sourceIdea];
      const intelligence = activeClient.brandIntelligence;

      if (newRating === 'high') {
        const updated = learnFromApproval(hooks, ideas, intelligence);
        updateClient({ ...activeClient, brandIntelligence: updated });
      }

      onPerformanceMarked(draft.clientId, draft.id, draft.title || draft.sourceIdea, newRating);
    }
  };

  const scheduledDateObj = draft.scheduledDate ? parseISO(draft.scheduledDate) : null;

  return (
    <div className={cn(
      "bg-card rounded-xl p-4 hover:shadow-sm transition-all duration-200 group border-l-4",
      borderClass,
      selected ? "border border-primary/50 ring-1 ring-primary/20" : "border border-border/50"
    )}>
      {/* Next Action Banner */}
      <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg mb-3 text-[11px] font-semibold", nextAction.color)}>
        {NEXT_ACTION_ICONS[nextAction.icon]}
        {nextAction.label}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {showCheckbox && (
            <button
              onClick={onToggleSelect}
              className={cn(
                "w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors",
                selected ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary/50"
              )}
              aria-label={selected ? 'Deselect' : 'Select'}
            >
              {selected && <span className="text-[10px]">✓</span>}
            </button>
          )}
          <p className="text-[13px] font-bold text-foreground leading-snug line-clamp-1 flex-1">
            {draft.title || 'Untitled Post'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {draft.performanceRating === 'high' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border bg-green-500/10 text-green-600 border-green-500/20">
              ★ High
            </span>
          )}
          {draft.performanceRating === 'low' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border bg-red-500/10 text-red-500 border-red-500/20">
              Low
            </span>
          )}
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", scoreColor)}>
            {qualityScore}
          </span>
        </div>
      </div>

      {/* Platform indicators */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(draft.platformVariants || []).map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40">
            {PLATFORM_ICONS[v.platform]}
            {PLATFORM_LABELS[v.platform]}
          </span>
        ))}
      </div>

      {/* Media & Ref Links */}
      {(draft.mediaUrl || (draft.referenceLinks || []).length > 0) && (
        <div className="flex gap-2 mb-3">
          {draft.mediaUrl ? (
            <div className="w-12 h-12 rounded-lg bg-muted border border-border/50 overflow-hidden shrink-0 flex items-center justify-center">
               <Upload className="w-4 h-4 text-muted-foreground/40" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted/30 border border-dashed border-border/40 shrink-0 flex items-center justify-center">
               <Sparkles className="w-4 h-4 text-primary/20" />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {(draft.referenceLinks || []).length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer">
                <Plus className="w-2.5 h-2.5" /> {(draft.referenceLinks || []).length} References
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/60 truncate">
              {draft.mediaType || 'No media'} attached
            </p>
          </div>
        </div>
      )}

      {/* Source badge */}
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="outline" className={cn("text-[10px]", SOURCE_COLORS[draft.source])}>
          {SOURCE_LABELS[draft.source]}
        </Badge>
        {draft.revisionCount > 0 && (
           <span className="text-[10px] font-medium text-amber-600">rev {draft.revisionCount}/{MAX_REVISIONS}</span>
        )}
      </div>

      {/* Revision count warning */}
      {draft.revisionCount > 0 && (
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg mb-2 text-[11px] font-medium",
          draft.revisionCount >= MAX_REVISIONS 
            ? "bg-red-500/10 border border-red-500/20 text-red-600"
            : draft.revisionCount >= 2
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-600"
              : "bg-blue-500/10 border border-blue-500/20 text-blue-600"
        )}>
          <span>Revision {draft.revisionCount}/{MAX_REVISIONS}</span>
          {draft.revisionCount >= MAX_REVISIONS && (
            <span className="font-bold">⚠️ Limit reached</span>
          )}
        </div>
      )}

      {/* Design status */}
      <div className="flex items-center gap-1.5 mb-2">
        <Palette className="w-3 h-3 text-muted-foreground/50" />
        <span className="text-[11px] text-muted-foreground">Design:</span>
        <button
          onClick={handleDesignCycle}
          className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md border cursor-pointer hover:opacity-80 transition-opacity", DESIGN_COLORS[draft.designStatus])}
        >
          {DESIGN_LABELS[draft.designStatus]}
        </button>
      </div>

      {/* Scheduled date */}
      {scheduledDateObj && (
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/10">
          <CalendarDays className="w-3 h-3 text-blue-500" />
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
            {format(scheduledDateObj as Date, 'dd MMM yyyy')}
          </span>
          <button onClick={handleClearSchedule} className="ml-auto text-blue-400 hover:text-destructive transition-colors" aria-label="Clear schedule">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Hook preview */}
      {(draft.platformVariants || [])[0]?.hook && !scheduledDateObj && (
        <p className="text-[12px] text-muted-foreground/70 mb-3 line-clamp-2 italic">
          "{(draft.platformVariants || [])[0].hook}"
        </p>
      )}

      {/* One-Click Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/30 flex-wrap">
        {nextStatus && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] rounded-lg text-primary hover:bg-primary/5 mr-auto" onClick={() => nextStatus && changeStatus(draft.id, nextStatus)}>
            <ArrowRight className="w-3 h-3 mr-1" /> {STATUS_NEXT_LABEL[draft.status] || 'Next'}
          </Button>
        )}
        {(draft.status === 'internal_review' || draft.status === 'client_review' || draft.status === 'approved') && (
          <div className="flex items-center gap-1.5 border-l border-border/40 pl-1.5 ml-1.5">
            {draft.status !== 'approved' && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] rounded-lg text-amber-600 hover:bg-amber-500/5 group/btn" onClick={() => changeStatus(draft.id, 'draft')}>
                Send Back
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/5 font-semibold" onClick={() => changeStatus(draft.id, 'rejected')}>
              Reject
            </Button>
          </div>
        )}
        {(draft.status === 'approved') && (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] rounded-lg text-blue-600 hover:bg-blue-500/5">
                <CalendarDays className="w-3 h-3 mr-1" /> Schedule
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={scheduledDateObj || undefined} onSelect={handleSchedule} initialFocus />
            </PopoverContent>
          </Popover>
        )}
        {/* Performance buttons - smaller, secondary */}
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className={cn("h-6 w-6 p-0 rounded-md", draft.performanceRating === 'high' ? 'text-green-600 bg-green-500/10' : 'text-muted-foreground hover:text-green-600')}
            onClick={() => handleMarkPerformance('high')}
            aria-label="Mark high performing"
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn("h-6 w-6 p-0 rounded-md", draft.performanceRating === 'low' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-red-500')}
            onClick={() => handleMarkPerformance('low')}
            aria-label="Mark low performing"
          >
            <ThumbsDown className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md text-muted-foreground" onClick={onEdit} aria-label="Edit draft">
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md text-muted-foreground hover:text-destructive" onClick={() => deleteDraft(draft.id)} aria-label="Delete draft">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
