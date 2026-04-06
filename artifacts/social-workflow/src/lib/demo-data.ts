import { generateId } from '@/lib/utils';
import { Client, type ClientProfile } from '@/modules/clients/lib/client-types';
import { ContentDraft, PlatformVariant } from '@/modules/pipeline/lib/pipeline-types';
import { StrategyOutput } from '@/lib/content-generator';
import { saveClient, setActiveClientId } from '@/modules/clients/lib/client-store';
import { saveDraftsBatch } from '@/modules/pipeline/lib/pipeline-store';

const DEMO_CLIENT: Client = {
  id: 'demo-client-kookiee',
  name: 'Sarah Baker',
  businessName: 'Kookiee',
  niche: 'Food & Beverage',
  status: 'active',
  strategyStatus: 'draft',
  brandProfile: {
    id: 'demo-bp-kookiee',
    brandName: 'Kookiee',
    niche: 'Food & Beverage',
    targetAudience: 'All genders aged 18-40 who love homemade cookies',
    tone: 'Empathetic & Supportive',
    writingStyle: 'storytelling',
    dos: ['Use warm, inviting language', 'Share personal baking stories', 'Include sensory descriptions'],
    donts: ['Never use aggressive sales language', 'Avoid diet culture messaging'],
    pastContent: 'Our cookies are baked fresh every morning with love and the finest ingredients.',
    keywords: ['cookies', 'baking', 'homemade', 'foodie', 'sweet treats'],
    themes: ['Recipes', 'Behind the Scenes', 'Customer Stories'],
    createdAt: new Date().toISOString(),
  },
  contacts: [
    { id: 'demo-contact-1', name: 'Sarah Baker', email: 'sarah@kookiee.com', role: 'approver' },
  ],
  metadata: {
    platforms: ['Instagram', 'LinkedIn', 'TikTok'],
    postingFrequency: '5x per week',
    contentPillars: ['Recipes', 'Behind the Scenes', 'Product Launches'],
    monthlyValue: 2500,
  },
  rawFormData: null,
  strategy: null,
  strategies: [],
  brandIntelligence: {
    preferredHookStyle: 'storytelling',
    preferredTonePatterns: ['warm', 'inviting', 'fresh-baked', 'homemade'],
    avoidedWords: ['diet', 'low-calorie', 'sugar-free'],
    highPerformingThemes: ['Behind the Scenes', 'Customer Stories', 'Recipes'],
    contentStyleNotes: 'Focus on sensory descriptions and personal baking stories',
    ctaPatterns: ['Save this recipe', 'Tag someone who loves cookies'],
    commonWords: ['cookies', 'baked', 'fresh', 'morning', 'love', 'homemade'],
    lastAnalyzed: new Date().toISOString(),
    patternScores: { themes: { 'Behind the Scenes': 5, 'Customer Stories': 3, 'Recipes': 4 }, hookTypes: { storytelling: 6, curiosity: 2 }, tonePatterns: { warm: 4, playful: 2 } },
    refinementCount: 2,
    approvalCount: 3,
    rejectionCount: 1,
    editCount: 5,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  onboardingStatus: 'completed',
  onboardingChecklist: {
    brandName: true,
    usp: true,
    platforms: true,
    contentPreferences: true,
    goals: true,
    messaging: true,
    targetAudience: true,
    challenges: true,
    geography: true,
    brandVoice: true,
  },
  onboardingNotes: 'Demo client with complete onboarding',
  onboardingCompletedAt: new Date().toISOString(),
  selectedPlan: '₹12,000 / month',
  monthlyPrice: 12000,
  servicesIncluded: ['15 posts', '2 platforms', 'Hashtags + timing'],
  internalNotes: '',
  clientProfile: {
    name: 'Kookiee',
    contactNumber: '',
    email: 'sarah@kookiee.com',
    brandName: 'Kookiee',
    goals: ['cookies', 'baking', 'homemade', 'foodie', 'sweet treats'],
    industry: 'Food & Beverage',
    targetAudience: 'All genders aged 18-40 who love homemade cookies',
    geography: '',
    brandGuidelines: 'Use warm, inviting language, Share personal baking stories, Include sensory descriptions | Never use aggressive sales language, Avoid diet culture messaging',
    brandVoice: 'Empathetic & Supportive',
    brandAssets: [],
    platforms: ['Instagram', 'LinkedIn', 'TikTok'],
    contentPreferences: ['Recipes', 'Behind the Scenes', 'Product Launches'],
    startDate: '',
    deadlines: '',
    hasInHouseTeam: 'unknown',
    communicationMethod: '',
    usp: '',
    messaging: 'Our cookies are baked fresh every morning with love and the finest ingredients.',
    challenges: [],
    complianceNotes: '',
    additionalNotes: 'Demo client with complete onboarding',
  } satisfies ClientProfile,
};

const DEMO_IDEAS = [
  'Behind the scenes: How we frost our signature cookies at 5AM',
  '3-ingredient cookie recipe that went viral on TikTok',
  'Customer spotlight: The couple who met over our snickerdoodles',
  'Why we switched to organic flour (and what changed)',
  'Cookie decorating fails that turned into bestsellers',
  'Our head baker\'s morning routine (honest version)',
  'The science behind the perfect chewy center',
  'How we package 500 orders a day without losing the handmade feel',
  'Ingredient deep-dive: Why vanilla extract matters',
  'Seasonal flavors we almost launched but didn\'t (and why)',
];

const DEMO_HOOKS = [
  'We wake up at 3AM for this reason and it\'s worth every minute.',
  'This one ingredient change made our cookies 10x better.',
  'A customer once told us our cookies saved their bad day.',
  'Our most popular cookie was actually a mistake.',
  'The secret to perfect cookies has nothing to do with the recipe.',
  'We almost quit baking last year. Here\'s what changed our minds.',
  'Everyone asks about our frosting. Here\'s the real answer.',
  'Our bakery smells like this every morning at 5AM.',
  'We tested 47 flour brands. Only one made the cut.',
  'The hardest part of running a cookie business isn\'t the baking.',
];

const DEMO_CAPTIONS = [
  'There\'s a moment every morning, right around 5AM, when the kitchen fills with the smell of butter and vanilla. That\'s when we know the day has started. We don\'t rush it. Every cookie gets the same attention it did on day one.\n\nSwipe to see our morning in 60 seconds. 🍪',
  'When we switched to organic flour, the texture changed. The first batch was crumbly. The second was too dense. By the third, we had something new — and honestly, better.\n\nSometimes the best version of your product comes from the mistakes.',
  'She ordered cookies for her wedding. He ordered the same ones for his. They got delivered to the same address. That\'s how they met.\n\nTwo years later, they came back to thank us. We cried.',
];

function createDemoDrafts(clientId: string): ContentDraft[] {
  const now = new Date().toISOString();
  const hashtags = ['#HomemadeCookies', '#BakingLife', '#Foodie', '#CookieLove', '#FreshBaked'];
  const platforms: Array<'instagram' | 'tiktok'> = ['instagram', 'tiktok'];

  return DEMO_IDEAS.slice(0, 5).map((idea, i) => {
    const platformVariants = platforms.map(platform => ({
      platform: platform as 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube_shorts',
      caption: DEMO_CAPTIONS[i % DEMO_CAPTIONS.length],
      hook: DEMO_HOOKS[i % DEMO_HOOKS.length],
      hashtags,
    }));

    return {
      id: generateId(),
      clientId,
      strategyId: 'demo-strategy-1',
      title: idea.substring(0, 30) + '...',
      briefId: null,
      approvalFlowId: null,
      sourceIdea: idea,
      source: 'ai',
      status: i === 0 ? 'client_review' : i === 1 ? 'approved' : 'draft',
      platformVariants,
      mediaUrl: null,
      mediaType: null,
      referenceLinks: [],
      referenceNotes: '',
      scheduledDate: i === 1 ? new Date(Date.now() + 3 * 86400000).toISOString() : null,
      deadline: null,
      contentIntent: null,
      designStatus: i <= 1 ? 'in_progress' as const : 'not_started' as const,
      designNotes: '',
      performanceRating: null,
      revisionCount: 0,
      lastReminderSentAt: null,
      createdBy: 'AI System',
      internalNotes: '',
      sourceType: 'ai',
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function loadDemoData(): { clientName: string; draftCount: number } {
  saveClient(DEMO_CLIENT);
  setActiveClientId(DEMO_CLIENT.id);
  const drafts = createDemoDrafts(DEMO_CLIENT.id);
  saveDraftsBatch(drafts);

  return { clientName: DEMO_CLIENT.name, draftCount: drafts.length };
}

export function hasDemoData(): boolean {
  try {
    const clients = JSON.parse(localStorage.getItem('socialidiots_clients') || '[]');
    return clients.some((c: Client) => c.id === DEMO_CLIENT.id);
  } catch {
    return false;
  }
}
