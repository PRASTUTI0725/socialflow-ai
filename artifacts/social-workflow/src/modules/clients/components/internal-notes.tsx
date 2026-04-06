import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, FileText } from 'lucide-react';
import { useClients } from '../context/client-context';

interface InternalNotesProps {
  clientId: string;
  currentNotes: string;
}

export function InternalNotes({ clientId, currentNotes }: InternalNotesProps) {
  const { clients, updateClient } = useClients();
  const [notes, setNotes] = useState(currentNotes);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      updateClient({ ...client, internalNotes: notes });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNotes(currentNotes);
    setIsEditing(false);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Internal Notes
          </CardTitle>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this client..."
              className="min-h-[150px]"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save Notes
              </Button>
            </div>
          </div>
        ) : notes ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No internal notes yet. Add notes to track important information about this client.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
