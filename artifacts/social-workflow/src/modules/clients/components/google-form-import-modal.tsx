import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { parseGoogleFormResponse, ParsedClientData } from '../lib/parse-google-form';
import { detectFieldWarnings } from '../lib/client-strategy-generator';
import { cn } from '@/lib/utils';

interface GoogleFormImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ParsedClientData, rawText: string) => void;
}

type Step = 'paste' | 'preview';

export function GoogleFormImportModal({ open, onClose, onImport }: GoogleFormImportModalProps) {
  const [step, setStep] = useState<Step>('paste');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedClientData | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleParse = () => {
    if (!text.trim()) {
      setError('Please paste a Google Form response');
      return;
    }

    setError(null);

    try {
      const result = parseGoogleFormResponse(text);
      const hasData = result.name || result.niche || result.platforms.length > 0 || result.email;
      if (!hasData) {
        setError('Could not detect fields properly. Make sure you pasted a Google Form individual response.');
        return;
      }

      const fieldWarnings = detectFieldWarnings(result.rawFields);
      setParsed(result);
      setWarnings(fieldWarnings);
      setStep('preview');
    } catch {
      setError('Could not detect fields properly. Check the format and try again.');
    }
  };

  const handleConfirm = () => {
    if (!parsed) return;
    onImport(parsed, text);
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setError(null);
    setParsed(null);
    setWarnings([]);
    setStep('paste');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-lg", step === 'preview' && "max-w-xl")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {step === 'paste' ? 'Import from Google Form' : 'Preview Parsed Data'}
          </DialogTitle>
          <DialogDescription>
            {step === 'paste'
              ? 'Paste the individual response text from Google Forms.'
              : 'Review detected fields before auto-filling the form.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'paste' ? (
          <div className="space-y-4">
            <Textarea
              value={text}
              onChange={e => { setText(e.target.value); setError(null); }}
              placeholder={`Name: Prateek
Brand name: Safescreen
Email address: prateek@example.com
Industry Focus: Tech
Primary Goals:
Build a community
Increase brand awareness
Target Audience:
Younger (18–25)
Brand Voice:
Playful & casual
Platforms:
Instagram
YouTube
Content Types:
Short-form videos
Carousels`}
              className="min-h-[280px] text-sm font-mono resize-y"
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-3">
              <Button onClick={handleParse} disabled={!text.trim()} className="gap-2 rounded-xl">
                <ChevronRight className="w-4 h-4" /> Preview Fields
              </Button>
              <Button variant="outline" onClick={handleClose} className="rounded-xl">Cancel</Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: Google Form → Responses → Click individual response → Copy all text
            </p>
          </div>
        ) : parsed ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Detected fields */}
            <div className="grid grid-cols-2 gap-3">
              {parsed.name && <PreviewField label="Name" value={parsed.name} />}
              {parsed.niche && <PreviewField label="Niche" value={parsed.niche} />}
              {parsed.targetAudience && <PreviewField label="Audience" value={parsed.targetAudience} />}
              {parsed.tone && <PreviewField label="Tone" value={parsed.tone} />}
              {parsed.email && <PreviewField label="Email" value={parsed.email} />}
              {parsed.platforms.length > 0 && (
                <PreviewField label="Platforms" value={parsed.platforms.join(', ')} />
              )}
              {parsed.contentPillars.length > 0 && (
                <PreviewField label="Content Types" value={parsed.contentPillars.join(', ')} />
              )}
              {parsed.keywords.length > 0 && (
                <PreviewField label="Keywords" value={parsed.keywords.join(', ')} />
              )}
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-amber-500/[0.06] border border-amber-500/10 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  <AlertTriangle className="w-3 h-3" /> {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                </div>
                {warnings.slice(0, 5).map((w, i) => (
                  <p key={i} className="text-xs text-amber-600/80 dark:text-amber-400/70">{w}</p>
                ))}
              </div>
            )}

            {/* Unknown fields count */}
            {Object.keys(parsed.rawFields).length > 10 && (
              <p className="text-xs text-muted-foreground">
                {Object.keys(parsed.rawFields).length} total fields detected in response
              </p>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-border/40">
              <Button onClick={handleConfirm} className="gap-2 rounded-xl">
                <CheckCircle2 className="w-4 h-4" /> Auto-fill Data
              </Button>
              <Button variant="outline" onClick={() => setStep('paste')} className="rounded-xl">
                Back
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
