import React, { useState } from 'react';
import { ContentDraft, ContentStatus, PIPELINE_STATUSES, STATUS_LABELS } from '../lib/pipeline-types';
import { ContentDraftCard } from './content-draft-card';
import { motion } from 'framer-motion';
import { Pencil, Eye, CheckCircle2, CalendarDays, Sparkles, ArrowRight, X, Users, Plus, ThumbsUp, ThumbsDown, Palette, Trash2, Instagram, Linkedin, Music2, Twitter, Youtube, Edit3, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PipelineBoardProps {
  drafts: ContentDraft[];
  onEditDraft: (draft: ContentDraft) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  showCheckboxes: boolean;
}

const COLUMN_CONFIG: Record<ContentStatus, { icon: React.ReactNode; color: string; headerBg: string }> = {
  draft: { icon: <Pencil className="w-4 h-4" />, color: 'text-slate-500', headerBg: 'bg-slate-500/5' },
  internal_review: { icon: <Eye className="w-4 h-4" />, color: 'text-primary', headerBg: 'bg-primary/5' },
  client_review: { icon: <Users className="w-4 h-4" />, color: 'text-amber-500', headerBg: 'bg-amber-500/5' },
  approved: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500', headerBg: 'bg-green-500/5' },
  scheduled: { icon: <CalendarDays className="w-4 h-4" />, color: 'text-blue-500', headerBg: 'bg-blue-500/5' },
  published: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600', headerBg: 'bg-green-600/5' },
  rejected: { icon: <X className="w-4 h-4" />, color: 'text-red-500', headerBg: 'bg-red-500/5' },
};

export function PipelineBoard({ drafts = [], onEditDraft, selectedIds, onToggleSelect, showCheckboxes }: PipelineBoardProps) {
  const safeDrafts = Array.isArray(drafts) ? drafts : [];
  
  const columns = PIPELINE_STATUSES.map(status => ({
    status,
    drafts: safeDrafts.filter(d => d && d.status === status),
  }));

  const totalCount = safeDrafts.length;

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-primary/60" />
        </div>
        <h3 className="text-xl font-display font-bold mb-2">No content yet</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          Start by creating content drafts from your strategy, then review and approve them here.
        </p>
        <div className="flex gap-4 mb-8">
          <Button onClick={() => window.dispatchEvent(new CustomEvent('set-view', { detail: 'create' }))} variant="outline" className="gap-2 rounded-xl">
             <Sparkles className="w-4 h-4" /> Create from Strategy
          </Button>
          <Button onClick={() => onEditDraft({} as any)} className="gap-2 rounded-xl">
             <Plus className="w-4 h-4" /> Create Manual Draft
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="px-3 py-1.5 rounded-lg bg-muted font-medium">1. Create Draft</span>
          <ArrowRight className="w-4 h-4" />
          <span className="px-3 py-1.5 rounded-lg bg-muted font-medium">2. Agency Review</span>
          <ArrowRight className="w-4 h-4" />
          <span className="px-3 py-1.5 rounded-lg bg-muted font-medium">3. Client Approval</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-muted">
      <div className="flex gap-5 min-w-[1400px]">
        {columns.map(({ status, drafts: columnDrafts }) => {
          const config = COLUMN_CONFIG[status];
          return (
            <div key={status} className="flex flex-col w-[320px] flex-shrink-0">
              <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3", config.headerBg)}>
                <span className={config.color}>{config.icon}</span>
                <span className="text-sm font-semibold whitespace-nowrap">{STATUS_LABELS[status]}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-background/60 px-2 py-0.5 rounded-md font-medium">
                  {columnDrafts.length}
                </span>
              </div>
              <div className="space-y-3 flex-1 min-h-[500px] border border-transparent hover:border-border/20 rounded-xl transition-colors p-1">
                {columnDrafts.map((draft, i) => (
                  <motion.div key={draft.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                    <ContentDraftCard
                      draft={draft}
                      onEdit={() => onEditDraft(draft)}
                      selected={selectedIds.has(draft.id)}
                      onToggleSelect={() => onToggleSelect(draft.id)}
                      showCheckbox={showCheckboxes}
                    />
                  </motion.div>
                ))}
                {columnDrafts.length === 0 && (
                  <div className="border border-dashed border-border/20 rounded-xl p-8 text-center flex flex-col items-center justify-center h-40">
                    <p className="text-xs text-muted-foreground/30 font-medium">No items in {STATUS_LABELS[status].toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
