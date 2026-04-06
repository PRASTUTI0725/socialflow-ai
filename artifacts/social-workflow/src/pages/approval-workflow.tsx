import React, { useState } from 'react';
import { usePipeline } from '@/modules/pipeline/context/pipeline-context';
import { useClients } from '@/modules/clients/context/client-context';
import { useWorkflow } from '@/context/workflow-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import {
  CheckCircle2, MessageSquare, ArrowLeft, Clock, AlertCircle,
  ChevronRight, Send, RotateCcw, History, User
} from 'lucide-react';
import { ApprovalFlow, getFlowProgress, getUnresolvedCommentCount } from '@/lib/approval-workflow';
import type { ContentDraft } from '@/modules/pipeline/lib/pipeline-types';

function StepCard({
  step,
  index,
  isActive,
  onApprove,
  onRequestChanges,
  onAddComment,
  onResolveComment,
}: {
  step: ApprovalFlow['steps'][0];
  index: number;
  isActive: boolean;
  onApprove: () => void;
  onRequestChanges: (comment: string) => void;
  onAddComment: (text: string) => void;
  onResolveComment: (commentId: string) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [showChangesInput, setShowChangesInput] = useState(false);
  const [changesText, setChangesText] = useState('');

  const stepLabel = step.type === 'internal_review' ? 'Internal Review' : 'Client Review';
  const statusColor = step.status === 'approved'
    ? 'text-green-500'
    : step.status === 'changes_requested'
      ? 'text-amber-500'
      : isActive
        ? 'text-primary'
        : 'text-muted-foreground';

  return (
    <Card className={`border-border/60 ${isActive ? 'border-primary/50 shadow-sm' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step.status === 'approved' ? 'bg-green-500 text-white' :
              step.status === 'changes_requested' ? 'bg-amber-500 text-white' :
              isActive ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {step.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <div>
              <CardTitle className="text-base">{stepLabel}</CardTitle>
              <p className="text-xs text-muted-foreground">Assigned to: {step.assignedTo}</p>
            </div>
          </div>
          <Badge variant={step.status === 'approved' ? 'default' : step.status === 'changes_requested' ? 'destructive' : 'secondary'}>
            {step.status === 'approved' ? 'Approved' : step.status === 'changes_requested' ? 'Changes Requested' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {step.comments.length > 0 && (
          <div className="space-y-2">
            {step.comments.map((comment) => (
              <div key={comment.id} className={`flex gap-2 p-3 rounded-lg ${comment.resolved ? 'opacity-50' : comment.authorRole === 'client' ? 'bg-blue-500/[0.06] border border-blue-500/15' : 'bg-muted/50'}`}>
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={`text-[10px] ${comment.authorRole === 'client' ? 'bg-blue-500/20 text-blue-600' : ''}`}>
                    {comment.authorRole === 'client' ? <User className="w-3 h-3" /> : comment.authorName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {comment.authorRole === 'client' ? 'Client said:' : comment.authorName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 ${comment.authorRole === 'client' ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-muted-foreground'}`}>{comment.text}</p>
                </div>
                {!comment.resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResolveComment(comment.id)}
                    className="shrink-0 h-6 text-xs"
                  >
                    Resolve
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending Client Response indicator */}
        {step.type === 'client_review' && step.status === 'pending' && isActive && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/[0.04] border border-blue-500/10">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Waiting for client response</p>
          </div>
        )}

        {isActive && step.status !== 'approved' && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[60px] text-sm"
                aria-label="Add comment"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                disabled={!commentText.trim()}
                onClick={() => {
                  onAddComment(commentText);
                  setCommentText('');
                }}
              >
                <MessageSquare className="w-3 h-3 mr-1" /> Comment
              </Button>
              <Button
                size="sm"
                onClick={onApprove}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowChangesInput(!showChangesInput)}
              >
                <AlertCircle className="w-3 h-3 mr-1" /> Request Changes
              </Button>
            </div>
            {showChangesInput && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Describe the changes needed..."
                  value={changesText}
                  onChange={(e) => setChangesText(e.target.value)}
                  className="min-h-[60px] text-sm"
                  aria-label="Changes description"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!changesText.trim()}
                  onClick={() => {
                    onRequestChanges(changesText);
                    setChangesText('');
                    setShowChangesInput(false);
                  }}
                  className="shrink-0"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ApprovalWorkflowPage() {
  const { drafts, getApprovalFlow, approveDraft, requestDraftChanges, addDraftComment, resolveDraftComment, addDraftRevision } = usePipeline();
  const { activeClient } = useClients();
  const { setView } = useWorkflow();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState('');

  const clientDrafts = activeClient
    ? drafts.filter(d => d.clientId === activeClient.id && (d.status === 'internal_review' || d.status === 'client_review' || d.status === 'draft'))
    : [];

  const selectedDraft = selectedDraftId
    ? drafts.find(d => d.id === selectedDraftId) ?? null
    : null;

  const flow = selectedDraftId ? getApprovalFlow(selectedDraftId) : null;

  if (!activeClient) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <Card className="border-border/60">
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No client selected</h3>
            <p className="text-muted-foreground mb-4">Select a client to manage approvals.</p>
            <Button onClick={() => setView('clients')} variant="outline">
              Go to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full pb-20">
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => setView('pipeline')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Pipeline
        </Button>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Approvals — {activeClient.businessName || activeClient.name}
        </h1>
        <p className="text-muted-foreground text-lg">
          Review content drafts, approve, or request changes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Reviews ({clientDrafts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {clientDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No drafts pending review
                </p>
              ) : (
                clientDrafts.map((draft) => {
                  const draftFlow = getApprovalFlow(draft.id);
                  const progress = draftFlow ? getFlowProgress(draftFlow) : 0;
                  const unresolved = draftFlow ? getUnresolvedCommentCount(draftFlow) : 0;

                  return (
                    <button
                      key={draft.id}
                      onClick={() => setSelectedDraftId(draft.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${
                        selectedDraftId === draft.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                      aria-label={`Review draft: ${draft.sourceIdea.slice(0, 30)}`}
                    >
                      <p className="text-sm font-medium truncate">{draft.sourceIdea}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {draft.status}
                        </Badge>
                        {draft.revisionCount > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <RotateCcw className="w-2.5 h-2.5" /> v{draft.revisionCount + 1}
                          </span>
                        )}
                        {unresolved > 0 && (
                          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                            <MessageSquare className="w-2.5 h-2.5" /> {unresolved}
                          </span>
                        )}
                      </div>
                      {draftFlow && (
                        <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedDraft && flow ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Draft Content</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedDraft.platformVariants[0]?.platform || 'unknown'}</Badge>
                      {selectedDraft.revisionCount > 0 && (
                        <Badge variant="secondary">
                          <History className="w-3 h-3 mr-1" /> Rev {selectedDraft.revisionCount + 1}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-2">{selectedDraft.sourceIdea}</p>
                  {selectedDraft.platformVariants[0] && (
                    <div className="space-y-2">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Hook</p>
                        <p className="text-sm">{selectedDraft.platformVariants[0].hook}</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Caption</p>
                        <p className="text-sm whitespace-pre-wrap">{selectedDraft.platformVariants[0].caption}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-3">
                {flow.steps.map((step, i) => (
                  <StepCard
                    key={i}
                    step={step}
                    index={i}
                    isActive={i === flow.currentStepIndex}
                    onApprove={() => approveDraft(selectedDraft.id)}
                    onRequestChanges={(comment) => requestDraftChanges(selectedDraft.id, comment, 'Team Lead', 'employee')}
                    onAddComment={(text) => addDraftComment(selectedDraft.id, i, text, 'Team Lead', 'employee')}
                    onResolveComment={(commentId) => resolveDraftComment(selectedDraft.id, i, commentId)}
                  />
                ))}
              </div>

              {flow.revisionHistory.length > 0 && (
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" /> Revision History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {flow.revisionHistory.map((rev) => (
                      <div key={rev.version} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                        <Badge variant="outline">v{rev.version}</Badge>
                        <div className="flex-1">
                          <p className="text-sm">{rev.changes}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {rev.authorName} · {new Date(rev.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {flow.overallStatus === 'changes_requested' && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-3">
                      Changes have been requested. Submit a revision to restart the approval flow.
                    </p>
                    <Textarea
                      placeholder="Describe what was changed..."
                      value={revisionText}
                      onChange={(e) => setRevisionText(e.target.value)}
                      className="min-h-[60px] text-sm mb-2"
                      aria-label="Revision description"
                    />
                    <Button
                      size="sm"
                      disabled={!revisionText.trim()}
                      onClick={() => {
                        addDraftRevision(selectedDraft.id, revisionText, 'Team Lead');
                        setRevisionText('');
                      }}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Submit Revision
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a draft to review</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a draft from the list to start the approval workflow.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
