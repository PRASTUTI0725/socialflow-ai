import { OnboardingData, createDefaultOnboardingChecklist } from './client-memory';
import { ClientProfile, REQUIRED_CLIENT_PROFILE_FIELDS, getClientProfileFieldLabel, getClientProfileMissingFields } from '@/modules/clients/lib/client-types';

export interface OnboardingItem {
  key: keyof ClientProfile;
  label: string;
  description: string;
  category: 'brand' | 'strategy' | 'audience';
}

export interface NicheSuggestion {
  audiences: string[];
  contentPillars: string[];
  tones: string[];
}

const NICHE_SUGGESTIONS: Record<string, NicheSuggestion> = {
  fitness: {
    audiences: ['Young adults 18-30', 'Busy professionals 25-40', 'Parents 30-45'],
    contentPillars: ['Workouts', 'Nutrition', 'Motivation', 'Form Tips'],
    tones: ['Casual & Friendly', 'Inspirational & Motivational', 'Bold & Disruptive'],
  },
  tech: {
    audiences: ['Developers 22-35', 'Tech enthusiasts 18-40', 'Startup founders 25-45'],
    contentPillars: ['Tutorials', 'Tool Reviews', 'Industry News', 'Career Tips'],
    tones: ['Educational & Informative', 'Professional & Authoritative', 'Casual & Friendly'],
  },
  saas: {
    audiences: ['Business owners 28-50', 'Product managers 25-40', 'Startup founders 25-45'],
    contentPillars: ['Product Tips', 'Case Studies', 'Industry Insights', 'How-To Guides'],
    tones: ['Professional & Authoritative', 'Educational & Informative', 'Casual & Friendly'],
  },
  ecommerce: {
    audiences: ['Online shoppers 18-35', 'Small business owners 25-45', 'Bargain hunters 20-40'],
    contentPillars: ['Product Showcases', 'Behind the Scenes', 'Customer Stories', 'Promotions'],
    tones: ['Casual & Friendly', 'Witty & Humorous', 'Inspirational & Motivational'],
  },
  food: {
    audiences: ['Food lovers 18-40', 'Home cooks 25-50', 'Health-conscious 22-35'],
    contentPillars: ['Recipes', 'Restaurant Reviews', 'Cooking Tips', 'Food Photography'],
    tones: ['Casual & Friendly', 'Inspirational & Motivational', 'Witty & Humorous'],
  },
  beauty: {
    audiences: ['Women 18-35', 'Beauty enthusiasts 16-30', 'Skincare fans 22-40'],
    contentPillars: ['Tutorials', 'Product Reviews', 'Skincare Routines', 'Trends'],
    tones: ['Casual & Friendly', 'Inspirational & Motivational', 'Witty & Humorous'],
  },
  realestate: {
    audiences: ['First-time buyers 25-40', 'Investors 30-55', 'Renters 22-35'],
    contentPillars: ['Market Updates', 'Property Tours', 'Buying Tips', 'Investment Advice'],
    tones: ['Professional & Authoritative', 'Educational & Informative', 'Empathetic & Supportive'],
  },
  finance: {
    audiences: ['Young professionals 22-35', 'Investors 28-50', 'Students 18-25'],
    contentPillars: ['Money Tips', 'Investment Basics', 'Market Insights', 'Budgeting'],
    tones: ['Professional & Authoritative', 'Educational & Informative', 'Empathetic & Supportive'],
  },
  education: {
    audiences: ['Students 16-25', 'Teachers 25-50', 'Lifelong learners 20-60'],
    contentPillars: ['Study Tips', 'Course Highlights', 'Career Advice', 'Quick Facts'],
    tones: ['Educational & Informative', 'Inspirational & Motivational', 'Empathetic & Supportive'],
  },
  travel: {
    audiences: ['Solo travelers 22-35', 'Families 30-45', 'Adventure seekers 18-40'],
    contentPillars: ['Destinations', 'Travel Tips', 'Photo Diaries', 'Budget Hacks'],
    tones: ['Inspirational & Motivational', 'Casual & Friendly', 'Witty & Humorous'],
  },
  personalbrand: {
    audiences: ['Professionals 25-40', 'Entrepreneurs 22-45', 'Creators 18-35'],
    contentPillars: ['Personal Stories', 'Lessons Learned', 'Industry Takes', 'Day in Life'],
    tones: ['Casual & Friendly', 'Bold & Disruptive', 'Inspirational & Motivational'],
  },
  coaching: {
    audiences: ['Professionals 25-45', 'Entrepreneurs 28-50', 'People seeking growth 22-40'],
    contentPillars: ['Success Stories', 'Mindset Tips', 'Actionable Frameworks', 'Q&A'],
    tones: ['Inspirational & Motivational', 'Empathetic & Supportive', 'Professional & Authoritative'],
  },
};

export function getNicheSuggestions(niche: string): NicheSuggestion | null {
  const lower = niche.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, value] of Object.entries(NICHE_SUGGESTIONS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }
  return null;
}

export const ONBOARDING_ITEMS: OnboardingItem[] = [
  {
    key: 'brandName',
    label: 'Brand Identity',
    description: 'Name, industry, and core profile details',
    category: 'brand',
  },
  {
    key: 'usp',
    label: 'Unique Selling Proposition',
    description: 'What sets them apart from the competition',
    category: 'brand',
  },
  {
    key: 'platforms',
    label: 'Platforms',
    description: 'Targeted social media platforms',
    category: 'strategy',
  },
  {
    key: 'contentPreferences',
    label: 'Content Preferences',
    description: 'Content pillars and preferences',
    category: 'strategy',
  },
  {
    key: 'goals',
    label: 'Goals',
    description: 'Business objectives, KPIs, success metrics',
    category: 'strategy',
  },
  {
    key: 'messaging',
    label: 'Messaging & Assets',
    description: 'Past content, core messaging, styling guides',
    category: 'strategy',
  },
  {
    key: 'targetAudience',
    label: 'Target Audience',
    description: 'Demographics, psychographics',
    category: 'audience',
  },
  {
    key: 'challenges',
    label: 'Challenges',
    description: 'Pain points and obstacles',
    category: 'audience',
  },
  {
    key: 'geography',
    label: 'Geography',
    description: 'Target locations for audience',
    category: 'audience',
  },
  {
    key: 'brandVoice',
    label: 'Brand Voice',
    description: 'Tone, personality, words to use/avoid',
    category: 'audience',
  },
];

export function isFieldComplete(profile: ClientProfile, key: keyof ClientProfile): boolean {
  const val = profile[key];
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'string') return val.trim().length > 0;
  return !!val;
}

export function getItemsByCategory(items: OnboardingItem[], category: string): OnboardingItem[] {
  return items.filter(item => item.category === category);
}

export function getMissingItems(profile: ClientProfile): OnboardingItem[] {
  return ONBOARDING_ITEMS.filter(item => !isFieldComplete(profile, item.key));
}

export function getCompletedItems(profile: ClientProfile): OnboardingItem[] {
  return ONBOARDING_ITEMS.filter(item => isFieldComplete(profile, item.key));
}

export function getCategoryCompletion(
  profile: ClientProfile,
  category: string
): number {
  const categoryItems = getItemsByCategory(ONBOARDING_ITEMS, category);
  if (categoryItems.length === 0) return 0;
  const completed = categoryItems.filter(item => isFieldComplete(profile, item.key)).length;
  return Math.round((completed / categoryItems.length) * 100);
}

export function getOnboardingWarnings(profile: ClientProfile): string[] {
  const warnings: string[] = [];
  const missing = getClientProfileMissingFields(profile);

  if (missing.includes('brandName')) {
    warnings.push('Brand identity incomplete — strategy may lack distinction');
  }
  if (missing.includes('goals')) {
    warnings.push('Goals not set — content will lack strategic direction');
  }
  if (missing.includes('targetAudience')) {
    warnings.push('Target audience undefined — hooks may miss the mark');
  }
  if (missing.includes('brandVoice')) {
    warnings.push('Brand voice not defined — tone may be inconsistent');
  }
  if (missing.includes('industry')) {
    warnings.push('Industry not set — strategy context will be too broad');
  }
  if (missing.includes('platforms')) {
    warnings.push('Platforms missing — strategy cannot map content distribution');
  }

  return warnings;
}

export function canTriggerStrategy(profile: ClientProfile): boolean {
  return getClientProfileMissingFields(profile).length === 0;
}

export function createOnboardingData(): OnboardingData {
  return {
    status: 'not_started',
    checklist: createDefaultOnboardingChecklist(),
    completedAt: null,
    notes: '',
  };
}

export function getQuickOnboardingChecklist(): Partial<ClientProfile> {
  return {}; // Not used anymore since fields are direct inputs
}

export function getStrategyReadiness(profile: ClientProfile): {
  ready: boolean;
  score: number;
  missingCritical: string[];
  missingOptional: string[];
} {
  const critical = getClientProfileMissingFields(profile).map(getClientProfileFieldLabel);
  const optional: Array<{ key: keyof ClientProfile; label: string }> = [
    { key: 'usp', label: 'USP' },
    { key: 'contentPreferences', label: 'Content Preferences' },
    { key: 'messaging', label: 'Messaging' },
    { key: 'challenges', label: 'Challenges' },
    { key: 'geography', label: 'Geography' },
  ];

  const missingCritical = critical;
  const missingOptional = optional.filter(c => !isFieldComplete(profile, c.key)).map(c => c.label);
  const totalItems = REQUIRED_CLIENT_PROFILE_FIELDS.length + optional.length;
  const completedItems = (REQUIRED_CLIENT_PROFILE_FIELDS.length - missingCritical.length) + optional.filter(c => isFieldComplete(profile, c.key)).length;
  const score = Math.round((completedItems / totalItems) * 100);

  return {
    ready: missingCritical.length === 0,
    score,
    missingCritical,
    missingOptional,
  };
}
