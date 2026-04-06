import { useTasks } from '../context/task-context';
import { Task, TaskStatus } from '../lib/task-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, Trash2, CalendarDays, User } from 'lucide-react';
import { format } from 'date-fns';
import { AddTaskDialog } from './add-task-dialog';

interface ClientTasksProps {
  clientId: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  todo: { 
    label: 'To Do', 
    icon: <Circle className="w-3.5 h-3.5" />, 
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' 
  },
  in_progress: { 
    label: 'In Progress', 
    icon: <Clock className="w-3.5 h-3.5" />, 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
  },
  done: { 
    label: 'Done', 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
    color: 'bg-green-500/10 text-green-600 border-green-500/20' 
  },
};

export function ClientTasks({ clientId }: ClientTasksProps) {
  const { tasksByClient, updateTask, deleteTask } = useTasks();
  const tasks = tasksByClient(clientId);

  const cycleStatus = (task: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    updateTask(task.id, { status: nextStatus[task.status] });
  };

  if (tasks.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tasks</CardTitle>
            <AddTaskDialog clientId={clientId} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No tasks yet. Add your first task to track work.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Tasks ({tasks.length})</CardTitle>
          <AddTaskDialog clientId={clientId} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.status];
            return (
              <div
                key={task.id}
                className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => cycleStatus(task)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border cursor-pointer hover:opacity-80 transition-opacity ${statusConfig.color}`}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </button>

                  {task.assignedTo && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <User className="w-3 h-3" />
                      {task.assignedTo}
                    </span>
                  )}

                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <CalendarDays className="w-3 h-3" />
                      {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
