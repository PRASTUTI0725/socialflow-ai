import { generateId } from '@/lib/utils';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Client, 
  createEmptyClient, 
  PREDEFINED_CLIENT_PLANS, 
  createDefaultOnboardingChecklist,
  deriveOnboardingChecklistFromProfile,
} from '../lib/client-types';
import { useClients } from '../context/client-context';
import { useWorkflow } from '@/context/workflow-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X, Sparkles, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GoogleFormImportModal } from './google-form-import-modal';
import type { ParsedClientData } from '../lib/parse-google-form';
import { onFormImported } from '@/services/automation';

const TONES = [
  'Professional & Authoritative', 'Casual & Friendly', 'Bold & Disruptive',
  'Educational & Informative', 'Witty & Humorous', 'Inspirational & Motivational',
  'Empathetic & Supportive',
];

const NICHES = [
  'Fitness', 'SaaS', 'E-commerce', 'Personal Brand', 'Food & Beverage',
  'Real Estate', 'Education', 'Finance', 'Beauty', 'Travel',
  'Technology', 'Healthcare', 'Fashion', 'Gaming', 'Coaching',
];

const AUDIENCE_PRESETS = [
  'Young adults 18-25',
  'Professionals 25-40',
  'Parents 30-45',
  'Business owners',
  'Students and educators',
  'Health-conscious individuals',
];

const PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'Twitter/X', 'YouTube Shorts'];

const INDUSTRY_NONE = '__industry_none__';

function getInitialCustomNiche(ex: Client | null | undefined): string {
  if (!ex) return '';
  if (ex.niche && !NICHES.includes(ex.niche)) return ex.niche;
  const ind = (ex.clientProfile.industry || '').trim();
  if (ind && !NICHES.includes(ind)) return ind;
  return '';
}

function snapshotOnboardingForm(client: Client, customNiche: string, industryIsOther: boolean): string {
  return JSON.stringify({ client, customNiche, industryIsOther });
}

const SECTION_EDIT_LABELS: Record<string, string> = {
  name: 'Client Identity',
  niche: 'Industry',
  targetAudience: 'Target Audience',
  brandVoice: 'Brand Voice',
  brandGuidelines: 'Brand Voice',
  goals: 'Keywords / Goals',
  platforms: 'Platforms',
  messaging: 'Content Strategy',
  contentPreferences: 'Content Preferences',
  brandDetails: 'Brand Details',
  usp: 'Brand Details',
  geography: 'Brand Details',
  challenges: 'Content Strategy',
};

const TARGET_SECTION_FIELDS: Record<string, string[]> = {
  name: ['name', 'businessName', 'niche'],
  niche: ['niche'],
  targetAudience: ['targetAudience'],
  brandVoice: ['brandVoice', 'brandGuidelines'],
  brandGuidelines: ['brandVoice', 'brandGuidelines'],
  goals: ['goals'],
  platforms: ['platforms'],
  messaging: ['messaging', 'additionalNotes'],
  contentPreferences: ['contentPreferences'],
  brandDetails: ['usp', 'geography'],
  usp: ['usp'],
  geography: ['geography'],
  challenges: ['challenges'],
};

interface ClientOnboardingFormProps {
  existingClient?: Client | null;
  onComplete: () => void;
  onCancel: () => void;
  targetSection?: string | null;
}

export function ClientOnboardingForm({ existingClient, onComplete, onCancel, targetSection = null }: ClientOnboardingFormProps) {
  const { createClient, updateClient } = useClients();
  const { setClientFormDirty } = useWorkflow();
  const { toast } = useToast();
  const isEditing = !!existingClient;

  const initialClient = existingClient || createEmptyClient();
  const initialCustom = getInitialCustomNiche(existingClient);
  const initialOther = Boolean(initialCustom);

  const [form, setForm] = useState<Client>(() => initialClient);
  const [customNiche, setCustomNiche] = useState(initialCustom);
  const [industryIsOther, setIndustryIsOther] = useState(initialOther);
  const [baseline, setBaseline] = useState(() =>
    snapshotOnboardingForm(initialClient, initialCustom, initialOther)
  );
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const [flashSection, setFlashSection] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [contentPreferenceInput, setContentPreferenceInput] = useState('');
  const [challengeInput, setChallengeInput] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const targetAudienceInputRef = useRef<HTMLInputElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [contentLinks, setContentLinks] = useState<string[]>([]);
  const [contentCaptions, setContentCaptions] = useState<string[]>([]);
  const [contentNotes, setContentNotes] = useState('');
  const [contentLinkInput, setContentLinkInput] = useState('');

  const selectedPlan = PREDEFINED_CLIENT_PLANS.find(plan => plan.name === form.selectedPlan) ?? null;
  const onboardingChecklist = useMemo(
    () => deriveOnboardingChecklistFromProfile(form.clientProfile),
    [form.clientProfile]
  );

  const industrySelectValue = useMemo(() => {
    const n = (form.niche || form.clientProfile.industry || '').trim();
    if (industryIsOther) return 'Other';
    if (!n) return INDUSTRY_NONE;
    if (NICHES.includes(form.niche)) return form.niche;
    if (NICHES.includes(n)) return n;
    return 'Other';
  }, [form.niche, form.clientProfile.industry, industryIsOther]);

  const isDirty = useMemo(
    () => snapshotOnboardingForm(form, customNiche, industryIsOther) !== baseline,
    [form, customNiche, industryIsOther, baseline]
  );

  useEffect(() => {
    setClientFormDirty(isDirty);
    return () => setClientFormDirty(false);
  }, [isDirty, setClientFormDirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const flashClass = (id: string) =>
    flashSection === id
      ? 'rounded-xl ring-2 ring-primary/45 shadow-[0_0_24px_hsl(var(--primary)/0.18)] transition-[box-shadow,ring-color] duration-300'
      : '';

  const isTargetField = (field: string): boolean =>
    !!targetSection && (TARGET_SECTION_FIELDS[targetSection] ?? []).includes(field);

  const getTargetFieldClass = (field: string): string => {
    if (!isTargetField(field)) return '';

    const isComplete = (() => {
      if (field === 'name') return form.name.trim().length > 0;
      if (field === 'businessName') return (form.businessName || form.clientProfile.brandName).trim().length > 0;
      if (field === 'niche') return onboardingChecklist.brandName;
      if (field === 'brandGuidelines') return form.clientProfile.brandGuidelines.trim().length > 0;
      if (field === 'additionalNotes') return form.clientProfile.additionalNotes.trim().length > 0;
      if (field === 'goals') return onboardingChecklist.goals;
      if (field === 'platforms') return onboardingChecklist.platforms;
      if (field === 'contentPreferences') return onboardingChecklist.contentPreferences;
      if (field === 'challenges') return onboardingChecklist.challenges;
      if (field === 'messaging') return onboardingChecklist.messaging;
      if (field === 'targetAudience') return onboardingChecklist.targetAudience;
      if (field === 'brandVoice') return onboardingChecklist.brandVoice;
      if (field === 'usp') return onboardingChecklist.usp;
      if (field === 'geography') return onboardingChecklist.geography;
      return false;
    })();

    return isComplete
      ? 'border-green-500/60 ring-2 ring-green-500/25 bg-green-500/[0.03]'
      : 'border-red-500/60 ring-2 ring-red-500/25 bg-red-500/[0.03]';
  };

  useEffect(() => {
    if (!targetSection) return;

    const target = targetSection;
    const scrollTo = () => {
      const el = sectionRefs.current[target];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const scrollTimer = window.setTimeout(() => {
      scrollTo();
      requestAnimationFrame(() => requestAnimationFrame(scrollTo));
    }, 120);

    setFlashSection(target);
    const flashClear = window.setTimeout(() => setFlashSection(null), 2800);

    const sectionEl = () => sectionRefs.current[target];
    const focusInput = () => {
      if (target === 'name') nameInputRef.current?.focus();
      if (target === 'niche') {
        const combo = sectionEl()?.querySelector('button[role="combobox"]') as HTMLButtonElement | null;
        combo?.focus();
      }
      if (target === 'targetAudience') targetAudienceInputRef.current?.focus();
      if (target === 'goals') keywordInputRef.current?.focus();
      if (target === 'brandVoice' || target === 'brandGuidelines') {
        const combo = sectionEl()?.querySelector('button[role="combobox"]') as HTMLButtonElement | null;
        combo?.focus();
      }
      if (target === 'platforms') {
        const firstButton = sectionEl()?.querySelector('button') as HTMLButtonElement | null;
        firstButton?.focus();
      }
    };

    const focusTimer = window.setTimeout(focusInput, 280);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(flashClear);
      window.clearTimeout(focusTimer);
    };
  }, [targetSection]);

  const requestCancel = () => {
    if (isDirty && !window.confirm('Discard changes? Your edits will be lost.')) return;
    setClientFormDirty(false);
    onCancel();
  };

  const updateClientProfileField = <K extends keyof Client['clientProfile']>(key: K, value: Client['clientProfile'][K]) => {
    setForm(prev => ({
      ...prev,
      clientProfile: { ...prev.clientProfile, [key]: value },
    }));
  };

  // Sync core fields so the rest of the app doesn't break
  const updateField = <K extends keyof Client>(key: K, value: Client[K]) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'name') updated.clientProfile = { ...updated.clientProfile, name: value as string };
      if (key === 'businessName') updated.clientProfile = { ...updated.clientProfile, brandName: value as string };
      if (key === 'niche') updated.clientProfile = { ...updated.clientProfile, industry: value as string };
      return updated;
    });
  };

  const handleSave = async () => {
    const pendingContentPreferences = contentPreferenceInput.trim()
      ? normalizeStringList([...form.clientProfile.contentPreferences, ...normalizeDelimitedInput(contentPreferenceInput)])
      : form.clientProfile.contentPreferences;
    const pendingChallenges = challengeInput.trim()
      ? normalizeStringList([...form.clientProfile.challenges, ...normalizeDelimitedInput(challengeInput)])
      : form.clientProfile.challenges;
    const finalName = form.name;
    const finalBusinessName = form.businessName || form.clientProfile.brandName;

    const clientToSave: Client = {
      ...form,
      name: finalName,
      businessName: finalBusinessName,
      niche: form.clientProfile.industry || form.niche,
      clientProfile: {
        ...form.clientProfile,
        name: finalName,
        brandName: finalBusinessName,
        contentPreferences: pendingContentPreferences,
        challenges: pendingChallenges,
      },
    };

    // Dynamically derive onboarding checklist flags to correctly match the completed profile fields
    // ONLY for existing clients (onboarding actions). For new clients, keep it at 0%.
    if (isEditing) {
      clientToSave.onboardingChecklist = deriveOnboardingChecklistFromProfile(clientToSave.clientProfile);
    } else {
      clientToSave.onboardingChecklist = createDefaultOnboardingChecklist();
    }

    console.log('[CLIENT FORM] handleSave called');
    console.log('[CLIENT FORM] isEditing:', isEditing);
    console.log('[CLIENT FORM] Client to save:', JSON.stringify(clientToSave, null, 2));

    try {
      if (isEditing) {
        await updateClient(clientToSave);
        console.log('[CLIENT FLOW] Update complete - ready to navigate');
        toast({ title: 'Client updated', description: `${finalBusinessName || finalName} has been updated.` });
      } else {
        await createClient(clientToSave);
        console.log('[CLIENT FLOW] Create complete - ready to navigate');
        toast({ title: 'Client created', description: `${finalBusinessName || finalName} has been added.` });
      }
      
      setClientFormDirty(false);
      onComplete();
      console.log('[CLIENT FLOW] Navigation executed');
    } catch (error) {
      console.error('[CLIENT FORM] Failed to save client:', error);
      toast({ 
        title: 'Failed to save client', 
        description: 'Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const togglePlatform = (platform: string) => {
    const current = new Set(form.clientProfile.platforms || []);
    if (current.has(platform)) current.delete(platform);
    else current.add(platform);
    updateClientProfileField('platforms', Array.from(current));
  };

  const addKeyword = (value: string) => {
    const word = value.trim();
    if (!word) return;
    const current = new Set(form.clientProfile.goals || []);
    if (!current.has(word)) {
      updateClientProfileField('goals', [...(form.clientProfile.goals || []), word]);
    }
    setKeywordInput('');
  };

  const removeKeyword = (index: number) => {
    updateClientProfileField('goals', (form.clientProfile.goals || []).filter((_, i) => i !== index));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(keywordInput);
    }
    if (e.key === 'Backspace' && !keywordInput && (form.clientProfile.goals || []).length > 0) {
      removeKeyword(form.clientProfile.goals.length - 1);
    }
  };

  const addContentPreference = (value: string) => {
    const nextItems = normalizeDelimitedInput(value);
    if (nextItems.length === 0) return;
    updateClientProfileField(
      'contentPreferences',
      normalizeStringList([...(form.clientProfile.contentPreferences || []), ...nextItems])
    );
    setContentPreferenceInput('');
  };
  
  const addChallenge = (value: string) => {
    const nextItems = normalizeDelimitedInput(value);
    if (nextItems.length === 0) return;
    updateClientProfileField(
      'challenges',
      normalizeStringList([...(form.clientProfile.challenges || []), ...nextItems])
    );
    setChallengeInput('');
  };

  const handleGoogleFormImport = (data: ParsedClientData, rawText: string) => {
    const highlighted = new Set<string>();

    setForm(prev => ({ ...prev, rawFormData: data.rawFields }));

    if (data.name) {
      updateField('name', data.name);
      highlighted.add('name');
    }

    if (data.niche) {
      updateField('niche', data.niche);
      if (!NICHES.includes(data.niche)) {
        setCustomNiche(data.niche);
        setIndustryIsOther(true);
      } else {
        setCustomNiche('');
        setIndustryIsOther(false);
      }
      highlighted.add('niche');
    }

    if (data.targetAudience) {
      updateClientProfileField('targetAudience', data.targetAudience);
      highlighted.add('targetAudience');
    }

    if (data.tone) {
      updateClientProfileField('brandVoice', data.tone);
      highlighted.add('tone');
    }

    if (data.platforms.length > 0) {
      updateClientProfileField('platforms', data.platforms);
      highlighted.add('platforms');
    }

    if (data.contentPillars.length > 0) {
      updateClientProfileField('contentPreferences', data.contentPillars);
      highlighted.add('contentPillars');
    }

    if (data.keywords.length > 0) {
      updateClientProfileField('goals', data.keywords);
      highlighted.add('keywords');
    }

    if (data.pastContent) {
      updateClientProfileField('messaging', data.pastContent);
      highlighted.add('messaging');
    }

    if (data.email) {
      updateClientProfileField('email', data.email);
      setForm(prev => ({
        ...prev,
        contacts: [{ id: generateId(), name: data.name || 'Contact', email: data.email, role: 'approver' as const }],
      }));
      highlighted.add('email');
    }

    if (data.challenges.length > 0) {
      updateClientProfileField('challenges', data.challenges);
      highlighted.add('challenges');
    }

    setHighlightedFields(highlighted);
    setTimeout(() => setHighlightedFields(new Set()), 3000);
    onFormImported(data.name || 'unnamed', data.name || 'Unnamed', Object.keys(data.rawFields).length);

    toast({
      title: 'Client data imported successfully',
      description: `${data.platforms.length > 0 ? data.platforms.length + ' platforms, ' : ''}${data.name ? data.name : 'Fields'} auto-filled.`,
    });
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border/50 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-xl font-display">
          <Sparkles className="w-5 h-5 text-primary" />
          {isEditing ? `Editing: ${form.name || '...'}` : 'New Client'}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={requestCancel} className="rounded-xl" aria-label="Close form">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {targetSection && (
          <p className="text-sm font-medium text-primary -mt-2 mb-2" role="status">
            You&apos;re editing: {SECTION_EDIT_LABELS[targetSection] ?? targetSection}
          </p>
        )}
        <p className="text-xs text-muted-foreground -mt-4" aria-label="Required fields note">
          * Required fields to generate strategy
        </p>
        {/* Import button */}
        <div className="flex items-center gap-3 pb-4 border-b border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="gap-2 rounded-xl"
          >
            <Upload className="w-3.5 h-3.5" /> Import from Google Form
          </Button>
          <span className="text-xs text-muted-foreground">Auto-fill from a Google Form response</span>
        </div>

        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Client Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div
              ref={el => { sectionRefs.current.name = el; }}
              className={cn('p-1 -m-1', flashClass('name'))}
            >
              <Label className="text-sm font-semibold mb-1.5 block">Client Name (Person) *</Label>
              <Input
                ref={nameInputRef}
                value={form.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="e.g. Jane Doe"
                className={cn("text-sm transition-all duration-500", highlightedFields.has('name') && "ring-2 ring-primary/40 bg-primary/[0.02]", getTargetFieldClass('name'))}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Business Name (Brand) *</Label>
              <Input
                value={form.businessName || form.clientProfile.brandName}
                onChange={e => updateField('businessName', e.target.value)}
                placeholder="e.g. SafeScreen, Q3 Fitness"
                className={cn("text-sm transition-all duration-500", highlightedFields.has('businessName') && "ring-2 ring-primary/40 bg-primary/[0.02]", getTargetFieldClass('businessName'))}
              />
            </div>
            <div
              ref={el => { sectionRefs.current.niche = el; }}
              className={cn('p-1 -m-1', flashClass('niche'))}
            >
              <Label className="text-sm font-semibold mb-1.5 block">Industry *</Label>
              <Select
                value={industrySelectValue}
                onValueChange={val => {
                  if (val === INDUSTRY_NONE) {
                    setIndustryIsOther(false);
                    setCustomNiche('');
                    updateField('niche', '');
                    updateClientProfileField('industry', '');
                    return;
                  }
                  if (val === 'Other') {
                    setIndustryIsOther(true);
                    setCustomNiche('');
                    updateField('niche', '');
                    updateClientProfileField('industry', '');
                    return;
                  }
                  setIndustryIsOther(false);
                  setCustomNiche('');
                  updateField('niche', val);
                }}
              >
                <SelectTrigger className={cn("text-sm", getTargetFieldClass('niche'))}>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INDUSTRY_NONE}>Select industry</SelectItem>
                  {NICHES.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other (custom)</SelectItem>
                </SelectContent>
              </Select>
              {industrySelectValue === 'Other' && (
                <Input
                  value={customNiche}
                  onChange={e => {
                    const v = e.target.value;
                    setCustomNiche(v);
                    updateField('niche', v);
                  }}
                  placeholder="Describe your industry…"
                  className={cn("text-sm mt-2", getTargetFieldClass('niche'))}
                  aria-label="Custom industry"
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Select Plan</Label>
              <Select
                value={form.selectedPlan || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setForm(prev => ({
                      ...prev,
                      selectedPlan: '',
                      monthlyPrice: 0,
                      servicesIncluded: [],
                      metadata: { ...prev.metadata, monthlyValue: 0 },
                    }));
                    return;
                  }
                  const plan = PREDEFINED_CLIENT_PLANS.find(p => p.name === value);
                  if (!plan) return;
                  setForm(prev => ({
                    ...prev,
                    selectedPlan: plan.name,
                    monthlyPrice: plan.monthlyPrice,
                    servicesIncluded: [...plan.servicesIncluded],
                    metadata: { ...prev.metadata, monthlyValue: plan.monthlyPrice },
                  }));
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No plan selected</SelectItem>
                  {PREDEFINED_CLIENT_PLANS.map(plan => (
                    <SelectItem key={plan.name} value={plan.name}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedPlan && (
            <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Services Included</p>
              <ul className="space-y-1">
                {selectedPlan.servicesIncluded.map((service) => (
                  <li key={service} className="text-sm text-foreground">- {service}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Brand Voice */}
        <div
          ref={el => { sectionRefs.current.targetAudience = el; sectionRefs.current.brandVoice = el; sectionRefs.current.brandGuidelines = el; }}
          className={cn('p-1 -m-1 rounded-xl', flashClass('targetAudience'), flashClass('brandVoice'), flashClass('brandGuidelines'))}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Brand Voice</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Target Audience *</Label>
              <Input
                ref={targetAudienceInputRef}
                value={form.clientProfile.targetAudience}
                onChange={e => updateClientProfileField('targetAudience', e.target.value)}
                placeholder="e.g. Women 25-35 interested in wellness"
                className={cn("text-sm transition-all duration-500", highlightedFields.has('targetAudience') && "ring-2 ring-primary/40 bg-primary/[0.02]", getTargetFieldClass('targetAudience'))}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {AUDIENCE_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateClientProfileField('targetAudience', preset)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                      form.clientProfile.targetAudience === preset
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted hover:bg-muted/80 border-transparent text-muted-foreground"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Tone / Brand Voice *</Label>
              <Select value={form.clientProfile.brandVoice} onValueChange={val => updateClientProfileField('brandVoice', val)}>
                <SelectTrigger className={cn("text-sm", getTargetFieldClass('brandVoice'))}><SelectValue placeholder="Select tone" /></SelectTrigger>
                <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-semibold mb-1.5 block">Brand Guidelines & Voice Details</Label>
              <Textarea 
                value={form.clientProfile.brandGuidelines} 
                onChange={e => updateClientProfileField('brandGuidelines', e.target.value)} 
                placeholder="Do's, Dont's, writing style..." 
                className={cn("text-sm min-h-[80px]", getTargetFieldClass('brandGuidelines'))}
              />
            </div>
          </div>
        </div>

        {/* Brand Details */}
        <div
          ref={el => { sectionRefs.current.brandDetails = el; sectionRefs.current.usp = el; sectionRefs.current.geography = el; }}
          className={cn('p-1 -m-1 rounded-xl', flashClass('brandDetails'), flashClass('usp'), flashClass('geography'))}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Brand Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Geography</Label>
              <Input
                value={form.clientProfile.geography}
                onChange={e => updateClientProfileField('geography', e.target.value)}
                placeholder="e.g. US & Canada, Global, Local (NYC)"
                className={cn("text-sm", getTargetFieldClass('geography'))}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Unique Selling Proposition (USP)</Label>
              <Input
                value={form.clientProfile.usp}
                onChange={e => updateClientProfileField('usp', e.target.value)}
                placeholder="What sets them apart?"
                className={cn("text-sm", getTargetFieldClass('usp'))}
              />
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div ref={el => { sectionRefs.current.platforms = el; }} className={cn('p-1 -m-1 rounded-xl', flashClass('platforms'))}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Platforms *</h3>
          <div className={cn("flex flex-wrap gap-2 rounded-xl p-2 -m-2 transition-all", getTargetFieldClass('platforms'))}>
            {PLATFORMS.map(platform => {
              const isSelected = (form.clientProfile.platforms || []).includes(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50 text-foreground'
                  }`}
                >
                  {platform}
                </button>
              );
            })}
          </div>
        </div>

        {/* Keywords */}
        <div ref={el => { sectionRefs.current.goals = el; }} className={cn('p-1 -m-1 rounded-xl', flashClass('goals'))}>
          <Label className="text-sm font-semibold mb-1.5 block">Keywords / Goals *</Label>
          <div
            className={cn(
              "flex flex-wrap gap-1.5 p-2.5 rounded-lg border bg-background min-h-[42px] cursor-text transition-all",
              highlightedFields.has('keywords') ? "ring-2 ring-primary/40" : "border-border",
              getTargetFieldClass('goals')
            )}
            onClick={() => keywordInputRef.current?.focus()}
          >
            {form.clientProfile.goals && form.clientProfile.goals.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                {kw}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeKeyword(i); }}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={keywordInputRef}
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              onBlur={() => { if (keywordInput.trim()) addKeyword(keywordInput); }}
              placeholder={(!form.clientProfile.goals || form.clientProfile.goals.length === 0) ? "Type and press Enter or comma..." : ""}
              className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <p className="text-[11px] text-muted-foreground/50 mt-1">Press Enter or comma to add. Backspace to remove last.</p>
        </div>

        {/* Content Strategy */}
        <div ref={el => { sectionRefs.current.messaging = el; }} className={cn('p-1 -m-1 rounded-xl', flashClass('messaging'), flashClass('challenges'))}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Content Strategy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
            <div ref={el => { sectionRefs.current.contentPreferences = el; }} className={cn('rounded-lg', flashClass('contentPreferences'))}>
              <Label className="text-xs font-medium mb-1.5 block">Content Preferences (Pillars)</Label>
              <div className={cn("flex flex-wrap gap-1.5 mt-2 rounded-xl p-2 -m-2 transition-all", getTargetFieldClass('contentPreferences'))}>
                {form.clientProfile.contentPreferences && form.clientProfile.contentPreferences.map((pref, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                    {pref}
                    <button type="button" onClick={() => updateClientProfileField('contentPreferences', form.clientProfile.contentPreferences.filter((_, idx) => idx !== i))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  id="contentPreferenceInput"
                  value={contentPreferenceInput}
                  onChange={e => setContentPreferenceInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addContentPreference(contentPreferenceInput);
                    }
                  }}
                  onBlur={() => {
                    if (contentPreferenceInput.trim()) {
                      addContentPreference(contentPreferenceInput);
                    }
                  }}
                  placeholder="Add pillar and hit Enter..."
                  className={cn("text-sm", getTargetFieldClass('contentPreferences'))}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Challenges (Pain Points)</Label>
              <div className={cn("flex flex-wrap gap-1.5 mt-2 rounded-xl p-2 -m-2 transition-all", getTargetFieldClass('challenges'))}>
                {form.clientProfile.challenges && form.clientProfile.challenges.map((chal, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-700 border border-red-500/20">
                    {chal}
                    <button type="button" onClick={() => updateClientProfileField('challenges', form.clientProfile.challenges.filter((_, idx) => idx !== i))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  id="challengeInput"
                  value={challengeInput}
                  onChange={e => setChallengeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChallenge(challengeInput);
                    }
                  }}
                  onBlur={() => {
                    if (challengeInput.trim()) {
                      addChallenge(challengeInput);
                    }
                  }}
                  placeholder="Add challenge and hit Enter..."
                  className={cn("text-sm", getTargetFieldClass('challenges'))}
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs font-medium mb-1.5 block">Messaging & Past Content Examples</Label>
            <Textarea
              value={form.clientProfile.messaging}
              onChange={e => updateClientProfileField('messaging', e.target.value)}
              placeholder="Paste examples of successful past content, core messaging statements, or hooks..."
              className={cn("text-sm min-h-[80px] resize-none", getTargetFieldClass('messaging'))}
            />
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Additional notes</Label>
            <Textarea
              value={form.clientProfile.additionalNotes}
              onChange={e => updateClientProfileField('additionalNotes', e.target.value)}
              placeholder="Any challenges, brand guidelines, or context for the team..."
              className={cn("text-sm min-h-[60px] resize-none", getTargetFieldClass('additionalNotes'))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-border/50">
          <Button onClick={handleSave} className="gap-2 rounded-xl shadow-md shadow-primary/20">
            <Save className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Create Client'}
          </Button>
          <Button variant="outline" onClick={requestCancel} className="rounded-xl">
            Cancel
          </Button>
        </div>
      </CardContent>

      <GoogleFormImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleGoogleFormImport}
      />
    </Card>
  );
}

function normalizeDelimitedInput(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeStringList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(trimmed);
  }

  return next;
}
