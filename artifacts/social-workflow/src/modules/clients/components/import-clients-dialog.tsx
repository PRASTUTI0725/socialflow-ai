import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, XCircle, AlertTriangle, Sheet, AlertCircle } from 'lucide-react';
import { syncClientsFromSheets, type ImportResult } from '../lib/client-importer';
import { useClients } from '../context/client-context';

export function ImportClientsDialog() {
  const { refreshClients } = useClients();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sheetId, setSheetId] = useState('demo-sheet-123');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSyncClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmSync = async () => {
    setShowConfirmation(false);
    setLoading(true);
    setResult(null);
    
    try {
      console.log('[IMPORT] Starting client sync...');
      const importResult = await syncClientsFromSheets(sheetId);
      console.log(`[IMPORT] Sync complete: ${importResult.added} added, ${importResult.skipped} skipped`);
      setResult(importResult);
      await refreshClients();
    } catch (error) {
      console.error('[IMPORT] Sync failed:', error);
      setResult({
        added: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        clients: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Sheet className="w-4 h-4" />
          Sync Clients
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync Clients from Google Sheets</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="sheetId">Google Sheet ID</Label>
              <input
                id="sheetId"
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter sheet ID or URL"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For demo: uses mock data. Later connects to real Google Sheets API.
              </p>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
              <p className="font-medium">What will be imported:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Client name and contact info</li>
                <li>Brand name and niche</li>
                <li>Phone number</li>
                <li>Status automatically set to "lead"</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                ✓ Duplicate emails are automatically skipped
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSyncClick} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Import Results</span>
                <Badge variant={result.added > 0 ? 'default' : 'secondary'}>
                  {result.added} added
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-400">{result.added} new clients</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-slate-500/10 border border-slate-500/20">
                  <AlertTriangle className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-700 dark:text-slate-400">{result.skipped} skipped</span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Errors ({result.errors.length})
                  </p>
                  <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i} className="bg-red-500/10 p-2 rounded">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.clients.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Added Clients:</p>
                  <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {result.clients.map((client) => (
                      <li key={client.id} className="bg-muted/50 p-2 rounded flex items-center justify-between">
                        <span className="font-medium">{client.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {client.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirm Client Sync
            </DialogTitle>
            <DialogDescription>
              This will import new clients from Google Sheets. Existing clients will NOT be deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">What will happen:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>New clients will be added with status "lead"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>Duplicate emails will be automatically skipped</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>All existing clients remain unchanged</span>
              </li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSync}>
              <Upload className="w-4 h-4 mr-2" />
              Confirm Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
