import React, { useState } from 'react';
import { ContentDraft, ContentStatus } from '../lib/pipeline-types';
import { usePipeline } from '../context/pipeline-context';
import { useClients } from '@/modules/clients/context/client-context';
import { useWorkflow } from '@/context/workflow-context';
import { PipelineBoard } from '../components/pipeline-board';
import { ContentEditor } from '../components/content-editor';
import { Button } from '@/components/ui/button';
import { Pencil, RefreshCw, CheckSquare, Trash2, Eye, CheckCircle2, CalendarDays, X, AlertTriangle, Clock, Plus, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { getStuckDrafts } from '@/lib/flow-health';

export function PipelinePage() {
  const { drafts, refreshDrafts, bulkDelete, bulkChangeStatus, bulkSchedule, createCustomDraft } = usePipeline();
  const { activeClient } = useClients();
  const { setView } = useWorkflow();
  const { toast } = useToast();
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkCalendarOpen, setBulkCalendarOpen] = useState(false);

  const safeDrafts = Array.isArray(drafts) ? drafts : [];
  const visibleDrafts = activeClient
    ? safeDrafts.filter(d => d && d.clientId === activeClient.id)
    : safeDrafts;

  const stuckDrafts = getStuckDrafts(visibleDrafts) || [];
  const approvedUnscheduled = visibleDrafts.filter(d => d && d.status === 'approved');
  const draftStuckCount = visibleDrafts.filter(d => d && d.status === 'draft').length;

  const selectedCount = selectedIds.size;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(visibleDrafts.map(d => d.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBulkAction = (action: () => void, label: string) => {
    action();
    toast({ title: `${label}`, description: `${selectedCount} draft${selectedCount > 1 ? 's' : ''} updated.` });
    clearSelection();
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">Content Pipeline</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {activeClient ? `Managing content for ${activeClient.businessName || activeClient.name}` : 'All content drafts across clients'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeClient && (
            <Button 
              onClick={() => {
                const newDraft = createCustomDraft(
                  activeClient.id,
                  'manual', 
                  '', 
                  'instagram',
                  '',
                  '',
                  []
                );
                setEditingDraft(newDraft);
              }}
              className="rounded-xl gap-2 h-9"
            >
              <Plus className="w-4 h-4" /> Create Draft
            </Button>
          )}
          <span className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-lg font-medium">
            {visibleDrafts.length} draft{visibleDrafts.length !== 1 ? 's' : ''}
          </span>
          {visibleDrafts.length > 0 && (
            <Button
              variant={selectMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }}
              className="rounded-xl gap-2"
            >
              <CheckSquare className="w-3.5 h-3.5" /> {selectMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { refreshDrafts(); toast({ title: 'Pipeline refreshed', description: 'Latest draft data loaded.' }); }} className="rounded-xl gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stuck state warnings */}
      {(stuckDrafts.length > 0 || approvedUnscheduled.length > 0) && (
        <div className="mb-4 space-y-2">
          {stuckDrafts.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-sm flex-1 text-amber-700 dark:text-amber-400">
                {stuckDrafts.length} draft{stuckDrafts.length > 1 ? 's' : ''} stuck for 3+ days — review or move them forward
              </p>
              <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs rounded-lg border-amber-500/30"
                onClick={() => bulkChangeStatus(stuckDrafts.map(s => s.draft.id), 'internal_review')}>
                Move All to Review
              </Button>
            </div>
          )}
          {approvedUnscheduled.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/[0.06] border border-green-500/15">
              <Clock className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm flex-1 text-green-700 dark:text-green-400">
                {approvedUnscheduled.length} approved draft{approvedUnscheduled.length > 1 ? 's' : ''} waiting to be scheduled
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectMode && selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
              <span className="text-sm font-medium text-primary mr-2">{selectedCount} selected</span>
              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg gap-1" onClick={selectAll}>
                Select All
              </Button>
              <div className="w-px h-5 bg-border/50 mx-1" />
              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg gap-1 text-amber-600 hover:bg-amber-500/5"
                onClick={() => handleBulkAction(() => bulkChangeStatus(Array.from(selectedIds), 'internal_review'), 'Moved to Review')}>
                <Eye className="w-3 h-3" /> Move to Review
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg gap-1 text-green-600 hover:bg-green-500/5"
                onClick={() => handleBulkAction(() => bulkChangeStatus(Array.from(selectedIds), 'approved'), 'Approved')}>
                <CheckCircle2 className="w-3 h-3" /> Approve
              </Button>
              <Popover open={bulkCalendarOpen} onOpenChange={setBulkCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg gap-1 text-blue-600 hover:bg-blue-500/5">
                    <CalendarDays className="w-3 h-3" /> Schedule
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    onSelect={(date) => {
                      if (date) {
                        handleBulkAction(() => bulkSchedule(Array.from(selectedIds), date.toISOString()), 'Scheduled');
                        setBulkCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="w-px h-5 bg-border/50 mx-1" />
              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg gap-1 text-destructive hover:bg-destructive/5"
                onClick={() => handleBulkAction(() => bulkDelete(Array.from(selectedIds)), 'Deleted')}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg ml-auto" onClick={clearSelection}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {editingDraft ? (
          <motion.div key="editor" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <ContentEditor draft={editingDraft} onClose={() => setEditingDraft(null)} />
          </motion.div>
        ) : (
          <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PipelineBoard
              drafts={visibleDrafts}
              onEditDraft={setEditingDraft}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              showCheckboxes={selectMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
