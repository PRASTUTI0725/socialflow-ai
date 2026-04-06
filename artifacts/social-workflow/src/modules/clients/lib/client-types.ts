import { generateId } from '@/lib/utils';
import { BrandProfile } from '@/lib/brand-memory';
import { OnboardingStatus, OnboardingChecklist } from '@/lib/client-memory';
import { StrategyOutput } from '@/lib/content-generator';

export type { OnboardingStatus, OnboardingChecklist };

export type ClientStatus = 'lead' | 'onboarding' | 'active' | 'paused' | 'completed';
export type StrategyStatus = 'draft' | 'approved' | 'rejected';

export interface ClientContact {
  id: string;
  name: string;
  email: string;
  role: 'approver' | 'viewer' | 'editor';
}

export interface ClientMetadata {
  platforms: string[];
  postingFrequency: string;
  contentPillars: string[];
  monthlyValue?: number;
}

export interface ClientPlan {
  readonly name: string;
  readonly monthlyPrice: number;
  readonly servicesIncluded: readonly string[];
}

export const PREDEFINED_CLIENT_PLANS: readonly ClientPlan[] = [
  {
    name: '₹18,000 / month',
    monthlyPrice: 18000,
    servicesIncluded: ['12 text posts + 4 video posts', '2 platforms', 'DevRel strategy', 'AI tools access'],
  },
  {
    name: '₹12,000 / month',
    monthlyPrice: 12000,
    servicesIncluded: ['15 posts', '2 platforms', 'Hashtags + timing'],
  },
  {
    name: '₹11,000 Strategy Plan',
    monthlyPrice: 11000,
    servicesIncluded: ['6 months strategy', '15 posts', 'Monthly calendar'],
  },
  {
    name: '₹18,000 Tech/DevRel Plan',
    monthlyPrice: 18000,
    servicesIncluded: ['competitor analysis', 'devrel strategy', 'AI tools', '15 text + 6 video posts'],
  },
] as const;

export interface ClientStrategy {
  contentPillars: string[];
  contentIdeas: string[];
  hooks: string[];
  postingPlan: Array<{ day: string; type: string; topic: string }>;
  brandAngle: string;
  generatedAt: string;
  refinedByBrain?: boolean;
  improvementReasons?: ImprovementReason[];
}

export interface PatternScores {
  themes: Record<string, number>;
  hookTypes: Record<string, number>;
  tonePatterns: Record<string, number>;
}

export interface BrandIntelligence {
  preferredHookStyle: 'short' | 'long' | 'curiosity' | 'storytelling' | 'mixed';
  preferredTonePatterns: string[];
  avoidedWords: string[];
  highPerformingThemes: string[];
  contentStyleNotes: string;
  ctaPatterns: string[];
  commonWords: string[];
  lastAnalyzed: string | null;
  patternScores: PatternScores;
  refinementCount: number;
  approvalCount: number;
  rejectionCount: number;
  editCount: number;
}

export interface ImprovementReason {
  label: string;
  detail: string;
}

export function createEmptyIntelligence(): BrandIntelligence {
  return {
    preferredHookStyle: 'mixed',
    preferredTonePatterns: [],
    avoidedWords: [],
    highPerformingThemes: [],
    contentStyleNotes: '',
    ctaPatterns: [],
    commonWords: [],
    lastAnalyzed: null,
    patternScores: { themes: {}, hookTypes: {}, tonePatterns: {} },
    refinementCount: 0,
    approvalCount: 0,
    rejectionCount: 0,
    editCount: 0,
  };
}

export function createDefaultOnboardingChecklist(): OnboardingChecklist {
  return {
    brandName: false,
    usp: false,
    platforms: false,
    contentPreferences: false,
    goals: false,
    messaging: false,
    targetAudience: false,
    challenges: false,
    geography: false,
    brandVoice: false,
  };
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasItems<T>(value: readonly T[] | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

export type HasInHouseTeam = boolean | 'unknown';

export interface ClientProfile {
  name: string;
  contactNumber: string;
  email: string;
  brandName: string;
  goals: string[];
  industry: string;
  targetAudience: string;
  geography: string;
  brandGuidelines: string;
  brandVoice: string;
  brandAssets: string[];
  platforms: string[];
  contentPreferences: string[];
  startDate: string;
  deadlines: string;
  hasInHouseTeam: HasInHouseTeam;
  communicationMethod: string;
  usp: string;
  messaging: string;
  challenges: string[];
  complianceNotes: string;
  additionalNotes: string;
}

export function createEmptyClientProfile(): ClientProfile {
  return {
    name: '',
    contactNumber: '',
    email: '',
    brandName: '', // This will map to businessName
    goals: [],
    industry: '',
    targetAudience: '',
    geography: '',
    brandGuidelines: '',
    brandVoice: '',
    brandAssets: [],
    platforms: [],
    contentPreferences: [],
    startDate: '',
    deadlines: '',
    hasInHouseTeam: 'unknown',
    communicationMethod: '',
    usp: '',
    messaging: '',
    challenges: [],
    complianceNotes: '',
    additionalNotes: '',
  };
}

function extractChallengesFromText(text: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => /challen?ges?|pain points?|struggl|frustrat|overwhelm(ed)?/i.test(l))
    .map(l => l.replace(/challen?ges?:?\s*/i, '').replace(/pain points?:?\s*/i, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function deriveClientProfileFromClient(client: Client): ClientProfile {
  const primaryEmail = client.contacts[0]?.email ?? '';
  const goals = client.brandProfile.keywords ?? [];
  const contentPreferences = client.metadata.contentPillars?.length > 0
    ? client.metadata.contentPillars
    : client.brandProfile.themes ?? [];

  return {
    name: client.name,
    contactNumber: '',
    email: primaryEmail,
    brandName: client.brandProfile.brandName || client.name,
    goals,
    industry: client.niche || client.brandProfile.niche,
    targetAudience: client.brandProfile.targetAudience,
    geography: '',
    brandGuidelines: [client.brandProfile.dos?.filter(Boolean).slice(0, 5).join(', ') ?? '', client.brandProfile.donts?.filter(Boolean).slice(0, 5).join(', ') ?? '']
      .filter(Boolean)
      .join(' | '),
    brandVoice: client.brandProfile.tone,
    brandAssets: [],
    platforms: client.metadata.platforms ?? [],
    contentPreferences,
    startDate: '',
    deadlines: '',
    hasInHouseTeam: 'unknown',
    communicationMethod: '',
    usp: '',
    messaging: client.brandProfile.pastContent ?? '',
    challenges: extractChallengesFromText(client.brandProfile.pastContent ?? ''),
    complianceNotes: '',
    additionalNotes: client.onboardingNotes ?? '',
  };
}

export function hasMeaningfulClientProfile(profile: ClientProfile): boolean {
  return (
    hasText(profile.brandName) ||
    hasText(profile.industry) ||
    hasText(profile.targetAudience) ||
    hasText(profile.geography) ||
    hasText(profile.brandGuidelines) ||
    hasText(profile.brandVoice) ||
    hasText(profile.usp) ||
    hasText(profile.messaging) ||
    hasText(profile.additionalNotes) ||
    hasItems(profile.goals) ||
    hasItems(profile.platforms) ||
    hasItems(profile.contentPreferences) ||
    hasItems(profile.challenges)
  );
}

export function deriveOnboardingChecklistFromProfile(profile: ClientProfile): OnboardingChecklist {
  return {
    brandName: hasText(profile.brandName) && !isIndustryValueMissing(profile.industry),
    usp: hasText(profile.usp),
    platforms: hasItems(profile.platforms),
    contentPreferences: hasItems(profile.contentPreferences),
    goals: hasItems(profile.goals),
    messaging: hasText(profile.messaging),
    targetAudience: hasText(profile.targetAudience),
    challenges: hasItems(profile.challenges),
    geography: hasText(profile.geography),
    brandVoice: hasText(profile.brandVoice),
  };
}

export const REQUIRED_CLIENT_PROFILE_FIELDS = [
  'brandName',
  'industry',
  'targetAudience',
  'brandVoice',
  'goals',
  'platforms',
  'usp',
  'messaging',
] as const;

export type RequiredClientProfileField = typeof REQUIRED_CLIENT_PROFILE_FIELDS[number];

export function getClientProfileFieldLabel(field: RequiredClientProfileField): string {
  const labels: Record<RequiredClientProfileField, string> = {
    brandName: 'Brand Name',
    industry: 'Industry',
    targetAudience: 'Target Audience',
    brandVoice: 'Brand Voice',
    goals: 'Goals',
    platforms: 'Platforms',
    usp: 'Unique Selling Proposition',
    messaging: 'Core Messaging/Past Content',
  };
  return labels[field];
}

function isIndustryValueMissing(industry: string): boolean {
  const normalized = industry.trim().toLowerCase();
  if (!normalized) return true;
  return normalized === 'other' || normalized === 'other (custom)';
}

export function getClientProfileMissingFields(profile: ClientProfile): RequiredClientProfileField[] {
  const missing: string[] = [];

  if (!profile.brandName.trim()) missing.push('brandName');
  if (isIndustryValueMissing(profile.industry)) missing.push('industry');
  if (!profile.targetAudience.trim()) missing.push('targetAudience');
  if (!profile.brandVoice.trim()) missing.push('brandVoice');
  if (!profile.goals || profile.goals.length === 0) missing.push('goals');
  if (!profile.platforms || profile.platforms.length === 0) missing.push('platforms');
  if (!profile.usp.trim()) missing.push('usp');
  if (!profile.messaging.trim()) missing.push('messaging');

  return missing as RequiredClientProfileField[];
}

export function getClientProfileMissingFieldLabels(profile: ClientProfile): string[] {
  return getClientProfileMissingFields(profile).map(getClientProfileFieldLabel);
}

export function isClientProfileComplete(profile: ClientProfile): boolean {
  return getClientProfileMissingFields(profile).length === 0;
}

export function calculateOnboardingProgress(client: Client): number {
  if (!client.clientProfile) return 0;

  const checklist = deriveOnboardingChecklistFromProfile(client.clientProfile);
  const values = Object.values(checklist);
  const completed = values.filter(Boolean).length;

  return Math.round((completed / values.length) * 100);
}


export interface Client {
  id: string;
  name: string; // Contact Person
  businessName: string; // Brand/Business
  niche: string;
  status: ClientStatus;
  strategyStatus: StrategyStatus;
  brandProfile: BrandProfile;
  brandIntelligence: BrandIntelligence;
  contacts: ClientContact[];
  metadata: ClientMetadata;
  rawFormData: Record<string, string> | null;
  strategy: ClientStrategy | null;
  strategies: StrategyOutput[];
  createdAt: string;
  updatedAt: string;
  onboardingStatus: OnboardingStatus;
  onboardingChecklist: OnboardingChecklist;
  onboardingNotes: string;
  onboardingCompletedAt: string | null;
  clientProfile: ClientProfile;
  selectedPlan: string;
  monthlyPrice: number;
  servicesIncluded: string[];
  internalNotes: string;
}

export function createEmptyClient(): Client {
  return {
    id: generateId(),
    name: '',
    niche: '',
    status: 'lead', // Default for new clients
    strategyStatus: 'draft',
    brandProfile: {
      id: generateId(),
      brandName: '',
      niche: '',
      targetAudience: '',
      tone: 'Professional & Authoritative',
      writingStyle: 'educational',
      dos: [''],
      donts: [''],
      pastContent: '',
      keywords: [],
      themes: [],
      createdAt: new Date().toISOString(),
    },
    contacts: [],
    metadata: {
      platforms: [],
      postingFrequency: '',
      contentPillars: [],
    },
    brandIntelligence: createEmptyIntelligence(),
    rawFormData: null,
    strategy: null,
    strategies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingStatus: 'not_started',
    onboardingChecklist: createDefaultOnboardingChecklist(),
    onboardingNotes: '',
    onboardingCompletedAt: null,
    clientProfile: createEmptyClientProfile(),
    selectedPlan: '',
    monthlyPrice: 0,
    servicesIncluded: [],
    internalNotes: '',
    businessName: '',
  };
}

export function clientToBrandProfile(client: Client): BrandProfile {
  return {
    ...client.brandProfile,
    brandName: client.businessName || client.name || client.brandProfile.brandName,
    niche: client.niche || client.brandProfile.niche,
  };
}
