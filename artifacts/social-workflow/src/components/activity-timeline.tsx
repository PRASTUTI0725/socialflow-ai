import React from 'react';
import { ActivityEntry, formatActivityMessage, formatTimestamp } from '@/services/activity-log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, XCircle, Sparkles, Pencil, Zap, UserPlus, CalendarDays, RefreshCw, Upload, Eye, Send, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  entries: ActivityEntry[];
  maxItems?: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CLIENT_CREATED: <UserPlus className="w-3.5 h-3.5 text-green-500" />,
  CLIENT_ACTIVATED: <Check className="w-3.5 h-3.5 text-green-500" />,
  CLIENT_UPDATED: <Pencil className="w-3.5 h-3.5 text-amber-500" />,
  STRATEGY_GENERATED: <Sparkles className="w-3.5 h-3.5 text-primary" />,
  STRATEGY_APPROVED: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  STRATEGY_REJECTED: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  PIPELINE_CREATED: <Zap className="w-3.5 h-3.5 text-violet-500" />,
  DRAFT_CREATED: <Plus className="w-3.5 h-3.5 text-blue-500" />,
  DRAFT_EDITED: <Pencil className="w-3.5 h-3.5 text-blue-500" />,
  DRAFT_DELETED: <Trash2 className="w-3.5 h-3.5 text-destructive" />,
  DRAFT_STATUS_CHANGED: <RefreshCw className="w-3.5 h-3.5 text-slate-500" />,
  DRAFT_APPROVED: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  DRAFT_REJECTED: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  DRAFT_SCHEDULED: <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />,
  DRAFT_PUBLISHED: <Send className="w-3.5 h-3.5 text-emerald-500" />,
  PERFORMANCE_MARKED: <Activity className="w-3.5 h-3.5 text-orange-500" />,
  FORM_IMPORTED: <Upload className="w-3.5 h-3.5 text-blue-500" />,
};

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function ActivityTimeline({ entries, maxItems = 15 }: ActivityTimelineProps) {
  const visible = entries.slice(0, maxItems);

  if (visible.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/20 border-b border-border/30 pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" /> Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">No activity yet</p>
          <p className="text-xs text-muted-foreground/60">Manage clients or pipeline items to see events here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="bg-muted/20 border-b border-border/30 pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" /> Pipeline Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border/40" />

          <ul className="divide-y divide-border/20">
            {visible.map((entry) => {
              const { text, bold } = formatActivityMessage(entry);
              return (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                  <div className="w-7 h-7 rounded-sm bg-muted flex items-center justify-center shrink-0 relative z-10 border border-border/50">
                    {ACTION_ICONS[entry.action] || <Activity className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground leading-snug">
                      <span className="font-bold text-foreground">{bold}</span> {text}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap pt-0.5">
                    {formatTimestamp(entry.createdAt || entry.timestamp || '')}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

