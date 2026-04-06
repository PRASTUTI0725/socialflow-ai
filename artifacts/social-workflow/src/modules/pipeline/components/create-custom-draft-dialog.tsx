import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sparkles } from 'lucide-react';
import { usePipeline } from '../context/pipeline-context';
import { PlatformType, PLATFORM_LABELS } from '../lib/pipeline-types';

interface CreateCustomDraftDialogProps {
  clientId: string;
  strategyId: string;
}

export function CreateCustomDraftDialog({ clientId, strategyId }: CreateCustomDraftDialogProps) {
  const { createCustomDraft } = usePipeline();
  const [open, setOpen] = useState(false);
  
  const [idea, setIdea] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('instagram');
  const [caption, setCaption] = useState('');
  const [hook, setHook] = useState('');
  const [hashtags, setHashtags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!idea.trim() || !caption.trim()) return;

    const hashtagArray = hashtags
      .split(',')
      .map(h => h.trim())
      .filter(h => h.length > 0)
      .map(h => h.startsWith('#') ? h : `#${h}`);

    createCustomDraft(clientId, strategyId, idea, platform, caption, hook, hashtagArray);
    
    // Reset form
    setIdea('');
    setPlatform('instagram');
    setCaption('');
    setHook('');
    setHashtags('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Custom Draft
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Draft</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="idea">Content Idea *</Label>
            <Textarea
              id="idea"
              placeholder="What's this content about?"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              required
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PLATFORM_LABELS) as PlatformType[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hook">Hook / Headline</Label>
            <Input
              id="hook"
              placeholder="Attention-grabbing opening line"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Optional - leave blank to add later</p>
          </div>

          <div>
            <Label htmlFor="caption">Caption *</Label>
            <Textarea
              id="caption"
              placeholder="Write your caption here..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              required
              className="min-h-[150px]"
            />
          </div>

          <div>
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              placeholder="#marketing, #socialmedia, #growth (comma-separated)"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Separate with commas, # will be added automatically</p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              <Sparkles className="w-4 h-4 mr-2" />
              Create Draft
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
