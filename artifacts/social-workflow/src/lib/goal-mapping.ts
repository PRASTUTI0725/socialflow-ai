export type BusinessGoal = 'awareness' | 'engagement' | 'leads' | 'sales' | 'authority';

export interface GoalBreakdown {
  primary: BusinessGoal;
  distribution: Record<BusinessGoal, number>;
  label: string;
}

const GOAL_KEYWORDS: Record<BusinessGoal, string[]> = {
  awareness: ['followers', 'grow', 'reach', 'visibility', 'brand', 'awareness', 'audience'],
  engagement: ['engagement', 'community', '互动', 'comments', 'likes', 'shares', 'interact', 'connect'],
  leads: ['leads', 'lead', 'subscribers', 'email', 'signups', 'newsletter', 'downloads', 'freebie'],
  sales: ['sales', 'revenue', 'conversion', 'purchase', 'buy', 'product', 'launch', 'sell', 'ecommerce'],
  authority: ['authority', 'expert', 'thought', 'leader', 'credibility', 'trust', 'professional', 'influence'],
};

const GOAL_LABELS: Record<BusinessGoal, string> = {
  awareness: 'Brand Awareness',
  engagement: 'Community Engagement',
  leads: 'Lead Generation',
  sales: 'Sales & Conversion',
  authority: 'Thought Leadership',
};

const GOAL_DISTRIBUTIONS: Record<string, Record<BusinessGoal, number>> = {
  'Grow Followers': { awareness: 50, engagement: 30, leads: 10, sales: 5, authority: 5 },
  'Drive Sales': { awareness: 10, engagement: 15, leads: 20, sales: 45, authority: 10 },
  'Build Authority': { awareness: 15, engagement: 20, leads: 15, sales: 10, authority: 40 },
  'Increase Engagement': { awareness: 20, engagement: 50, leads: 10, sales: 10, authority: 10 },
  'Launch Product': { awareness: 25, engagement: 15, leads: 15, sales: 35, authority: 10 },
};

const PILLAR_TO_GOAL: Record<string, BusinessGoal> = {
  'Workouts': 'engagement',
  'Nutrition': 'awareness',
  'Motivation': 'engagement',
  'Form Tips': 'authority',
  'Tutorials': 'authority',
  'Tool Reviews': 'leads',
  'Industry News': 'awareness',
  'Career Tips': 'authority',
  'Product Tips': 'sales',
  'Case Studies': 'leads',
  'Industry Insights': 'authority',
  'How-To Guides': 'engagement',
  'Product Showcases': 'sales',
  'Behind the Scenes': 'engagement',
  'Customer Stories': 'sales',
  'Promotions': 'sales',
  'Recipes': 'engagement',
  'Restaurant Reviews': 'awareness',
  'Cooking Tips': 'engagement',
  'Personal Stories': 'engagement',
  'Lessons Learned': 'authority',
  'Industry Takes': 'authority',
  'Day in Life': 'awareness',
  'Success Stories': 'authority',
  'Mindset Tips': 'engagement',
  'Actionable Frameworks': 'leads',
  'Destinations': 'awareness',
  'Travel Tips': 'engagement',
  'Photo Diaries': 'awareness',
  'Market Updates': 'authority',
  'Property Tours': 'leads',
  'Buying Tips': 'leads',
  'Money Tips': 'leads',
  'Investment Basics': 'authority',
  'Study Tips': 'engagement',
  'Skincare Routines': 'engagement',
  'Trends': 'awareness',
};

export function detectGoalType(goal: string): BusinessGoal {
  const lower = goal.toLowerCase();
  for (const [goalType, keywords] of Object.entries(GOAL_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return goalType as BusinessGoal;
    }
  }
  return 'awareness';
}

export function getGoalBreakdown(goal: string): GoalBreakdown {
  const primary = detectGoalType(goal);
  const distribution = GOAL_DISTRIBUTIONS[goal] || {
    awareness: primary === 'awareness' ? 50 : 15,
    engagement: primary === 'engagement' ? 50 : 20,
    leads: primary === 'leads' ? 50 : 15,
    sales: primary === 'sales' ? 50 : 10,
    authority: primary === 'authority' ? 50 : 10,
  };

  return {
    primary,
    distribution,
    label: GOAL_LABELS[primary],
  };
}

export function getGoalLabel(goal: BusinessGoal): string {
  return GOAL_LABELS[goal];
}

export function getGoalColor(goal: BusinessGoal): string {
  const colors: Record<BusinessGoal, string> = {
    awareness: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    engagement: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
    leads: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    sales: 'text-green-600 bg-green-500/10 border-green-500/20',
    authority: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
  };
  return colors[goal];
}

export function mapContentPillarToGoal(pillar: string): BusinessGoal {
  return PILLAR_TO_GOAL[pillar] || 'awareness';
}

export function calculatePillarGoalDistribution(contentPillars: string[]): Record<BusinessGoal, number> {
  const dist: Record<BusinessGoal, number> = { awareness: 0, engagement: 0, leads: 0, sales: 0, authority: 0 };
  if (contentPillars.length === 0) return dist;
  for (const pillar of contentPillars) {
    dist[mapContentPillarToGoal(pillar)]++;
  }
  const total = contentPillars.length;
  for (const key of Object.keys(dist) as BusinessGoal[]) {
    dist[key] = Math.round((dist[key] / total) * 100);
  }
  return dist;
}

export const BUSINESS_GOALS: BusinessGoal[] = ['awareness', 'engagement', 'leads', 'sales', 'authority'];
