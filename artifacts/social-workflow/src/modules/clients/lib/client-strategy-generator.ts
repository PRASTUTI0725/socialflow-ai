import { Client, ClientStrategy, ImprovementReason } from './client-types';
import { generateImprovementReasons } from './brand-intelligence';

// --- Building blocks for dynamic composition ---

const CURIOSITY_STARTERS = [
  'Here\'s what nobody tells you about',
  'The one thing about',
  'What happens when you actually',
  'This is why most',
  'The real reason behind',
  'You won\'t believe this about',
  'Stop ignoring this about',
  'This changes everything about',
];

const PAIN_PHRASES = [
  'struggling with',
  'tired of',
  'confused by',
  'overwhelmed by',
  'frustrated with',
  'worried about',
  'looking for answers about',
  'wishing they understood',
];

const NICHE_PILLARS: Record<string, string[]> = {
  Technology: ['Product Demos', 'Tech Tips', 'Industry News', 'Behind the Code', 'User Stories'],
  Fitness: ['Workout Tips', 'Nutrition Hacks', 'Motivation', 'Transformations', 'Form Guides'],
  'Food & Beverage': ['Recipes', 'Behind the Scenes', 'Ingredient Spotlight', 'Customer Stories', 'Seasonal Specials'],
  'E-commerce': ['Product Showcases', 'Unboxing', 'Customer Reviews', 'Sale Announcements', 'How-To Guides'],
  Education: ['Quick Lessons', 'Study Tips', 'Student Stories', 'Course Previews', 'Expert Interviews'],
  Finance: ['Money Tips', 'Market Insights', 'Myth Busting', 'Case Studies', 'Quick Calculations'],
  Beauty: ['Tutorials', 'Product Reviews', 'Before & After', 'Ingredient Deep-Dives', 'Trend Alerts'],
  Travel: ['Hidden Gems', 'Travel Tips', 'Itinerary Guides', 'Local Culture', 'Budget Hacks'],
  Fashion: ['Outfit Ideas', 'Styling Tips', 'Trend Reports', 'Behind the Design', 'Sustainable Fashion'],
  Gaming: ['Game Reviews', 'Tips & Tricks', 'Live Highlights', 'Community Polls', 'Setup Tours'],
  Healthcare: ['Health Myths', 'Wellness Tips', 'Patient Stories', 'Expert Q&A', 'Prevention Guides'],
  Coaching: ['Mindset Shifts', 'Goal Setting', 'Client Wins', 'Daily Habits', 'Accountability Tips'],
  'Real Estate': ['Market Updates', 'Home Tours', 'Buyer Tips', 'Neighborhood Guides', 'Investment Insights'],
  default: ['Educational Content', 'Behind the Scenes', 'Customer Stories', 'Tips & Tricks', 'Industry Insights'],
};

// Dynamic hook composition: curiosity + pain point + niche + audience
function composeHooks(niche: string, audience: string, tone: string, goals: string[]): string[] {
  const hooks: string[] = [];
  const shortNiche = niche.toLowerCase();
  const shortAudience = audience.length > 30 ? audience.split(' ').slice(0, 4).join(' ').toLowerCase() : audience.toLowerCase();

  // Curiosity-driven hooks
  for (let i = 0; i < 2; i++) {
    const starter = CURIOSITY_STARTERS[(goals.length + i) % CURIOSITY_STARTERS.length];
    hooks.push(`${starter} ${shortNiche}?`);
  }

  // Pain-point hooks
  if (goals.length > 0) {
    const pain = PAIN_PHRASES[goals.length % PAIN_PHRASES.length];
    hooks.push(`If you're ${pain} ${shortNiche}, this is for you.`);
  }

  // Audience-specific hooks
  hooks.push(`To every ${shortAudience} reading this — pay attention.`);
  hooks.push(`The ${shortNiche} advice that ${shortAudience} actually need.`);

  // Tone-specific hook
  if (tone.toLowerCase().includes('bold') || tone.toLowerCase().includes('disruptive')) {
    hooks.push(`Unpopular opinion: most ${shortNiche} advice is backwards.`);
  } else if (tone.toLowerCase().includes('casual') || tone.toLowerCase().includes('friendly')) {
    hooks.push(`Okay but why does nobody talk about this ${shortNiche} tip??`);
  } else if (tone.toLowerCase().includes('inspirational')) {
    hooks.push(`Your ${shortNiche} journey starts with this one step.`);
  }

  return hooks.slice(0, 5);
}

// Dynamic content ideas based on goals + audience
function composeIdeas(niche: string, audience: string, goals: string[], challenges: string[]): string[] {
  const ideas: string[] = [];

  // Goal-based ideas
  for (const goal of goals.slice(0, 2)) {
    ideas.push(`How ${audience} can ${goal.toLowerCase()} using ${niche.toLowerCase()}`);
  }

  // Challenge-based ideas
  for (const challenge of challenges.slice(0, 2)) {
    ideas.push(`Solving ${challenge.toLowerCase()} — a step-by-step guide`);
  }

  // Niche defaults
  const defaults = NICHE_IDEAS[niche] || NICHE_IDEAS.default;
  const needed = 5 - ideas.length;
  for (let i = 0; i < needed && i < defaults.length; i++) {
    ideas.push(defaults[i].replace('{niche}', niche).replace('{audience}', audience));
  }

  return ideas.slice(0, 5);
}

const NICHE_IDEAS: Record<string, string[]> = {
  Technology: [
    'How our product solved a real problem for a customer',
    'The tech stack behind our daily operations',
    'Common misconceptions about {niche} explained',
    'A day in the life of our engineering team',
    'Why we chose this technology over alternatives',
  ],
  Fitness: [
    '5-minute morning routine that changes your whole day',
    'What I eat in a day as a fitness professional',
    'The #1 mistake beginners make at the gym',
    'How to stay consistent when motivation fades',
    'Before and after: 90-day transformation story',
  ],
  default: [
    'Behind the scenes of how we work',
    'Customer success story that inspires us',
    'Common mistakes in {niche} and how to avoid them',
    'Our top 5 tips for {audience}',
    'The story behind our brand\'s mission',
  ],
};

// Improved brand angle with personalization
function generateBrandAngle(client: Client): string {
  const name = client.name || 'Our brand';
  const niche = client.niche || 'this industry';
  const audience = client.brandProfile.targetAudience || 'our audience';
  const tone = client.brandProfile.tone || 'professional';
  const goals = client.brandProfile.keywords.slice(0, 2);
  const challenges = extractChallenges(client.brandProfile.pastContent);
  const dos = client.brandProfile.dos.filter(Boolean).slice(0, 2);

  const parts: string[] = [];

  // Core positioning
  parts.push(`${name} speaks to ${audience} in the ${niche} space.`);

  // Voice
  const toneAdjective = tone.toLowerCase().includes('casual') ? 'approachable and relatable'
    : tone.toLowerCase().includes('bold') ? 'fearless and direct'
    : tone.toLowerCase().includes('educational') ? 'informative and clear'
    : tone.toLowerCase().includes('witty') ? 'clever and entertaining'
    : tone.toLowerCase().includes('inspirational') ? 'motivating and uplifting'
    : tone.toLowerCase().includes('empathetic') ? 'warm and supportive'
    : 'credible and trustworthy';
  parts.push(`The brand voice should be ${toneAdjective}.`);

  // Goals
  if (goals.length > 0) {
    parts.push(`Priority goals: ${goals.join(', ')}.`);
  }

  // Challenges
  if (challenges.length > 0) {
    parts.push(`Key challenges to address: ${challenges.join(', ')}.`);
  }

  // Do's
  if (dos.length > 0) {
    parts.push(`Always: ${dos.join(', ')}.`);
  }

  parts.push(`Every piece of content should feel authentic to ${name}'s identity and provide real value to ${audience}.`);

  return parts.join(' ');
}

function extractChallenges(text: string): string[] {
  if (!text) return [];
  return text.split('\n')
    .filter(l => l.toLowerCase().includes('challenge') || l.toLowerCase().includes('struggle') || l.toLowerCase().includes('pain'))
    .map(l => l.replace(/challenges?:?\s*/i, '').replace(/pain points?:?\s*/i, '').trim())
    .filter(Boolean)
    .slice(0, 2);
}

// Posting plan with platform awareness
function generatePostingPlan(niche: string, platforms: string[], pillars: string[]): Array<{ day: string; type: string; topic: string }> {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hasReels = platforms.some(p => /instagram|tiktok|youtube/i.test(p));
  const hasLinkedIn = platforms.some(p => /linkedin/i.test(p));
  const hasTwitter = platforms.some(p => /twitter/i.test(p));

  const typeMap: Record<string, string> = {
    Monday: hasLinkedIn ? 'LinkedIn Article' : 'Educational Post',
    Tuesday: 'Single Post',
    Wednesday: hasReels ? 'Short-form Video' : 'Carousel',
    Thursday: 'Story / Engagement',
    Friday: hasLinkedIn ? 'Carousel' : (hasTwitter ? 'Thread' : 'Single Post'),
    Saturday: 'Community Post / Poll',
    Sunday: 'Rest / Repurpose Best',
  };

  return days.map((day, i) => ({
    day,
    type: typeMap[day],
    topic: pillars[i % pillars.length],
  }));
}

// --- Main Generator ---

export function generateClientStrategy(client: Client): ClientStrategy {
  const niche = client.niche || 'General';
  const audience = client.brandProfile.targetAudience || 'our audience';
  const tone = client.brandProfile.tone || 'Professional & Authoritative';
  const platforms = client.metadata.platforms.length > 0 ? client.metadata.platforms : ['Instagram'];
  const keywords = client.brandProfile.keywords;
  const challenges = extractChallenges(client.brandProfile.pastContent);

  // Dynamic composition
  const hooks = composeHooks(niche, audience, tone, keywords);
  const ideas = composeIdeas(niche, audience, keywords, challenges);

  // Pillars: use client's if available, else niche defaults
  const defaultPillars = NICHE_PILLARS[niche] || NICHE_PILLARS.default;
  const contentPillars = client.metadata.contentPillars.length > 0
    ? client.metadata.contentPillars
    : defaultPillars.slice(0, 5);

  const postingPlan = generatePostingPlan(niche, platforms, contentPillars);
  const brandAngle = generateBrandAngle(client);

  return {
    contentPillars,
    contentIdeas: ideas,
    hooks,
    postingPlan,
    brandAngle,
    generatedAt: new Date().toISOString(),
  };
}

// --- Intelligence-Refined Strategy Generation ---

function filterByAvoidedWords(texts: string[], avoidedWords: string[]): string[] {
  if (avoidedWords.length === 0) return texts;
  const lowerAvoided = avoidedWords.map(w => w.toLowerCase());
  return texts.filter(text => {
    const lower = text.toLowerCase();
    return !lowerAvoided.some(w => lower.includes(w));
  });
}

function adjustHooksForStyle(hooks: string[], style: string): string[] {
  switch (style) {
    case 'short':
      return hooks.map(h => h.length > 80 ? h.slice(0, 77) + '...' : h);
    case 'curiosity':
      // Add curiosity starters to hooks that don't have them
      return hooks.map(h => {
        if (/^here.s|^why|^how|^what|^the (one|real|secret)/i.test(h)) return h;
        return `Here's why ${h.charAt(0).toLowerCase() + h.slice(1)}`;
      });
    case 'storytelling':
      return hooks.map(h => {
        if (/\b(journey|started|began|once|grew|learned)\b/i.test(h)) return h;
        return `The story behind ${h.charAt(0).toLowerCase() + h.slice(1)}`;
      });
    default:
      return hooks;
  }
}

function prioritizeThemes(ideas: string[], themes: string[], niche: string): string[] {
  if (themes.length === 0) return ideas;

  // Generate theme-based ideas to prepend
  const themeIdeas: string[] = [];
  for (const theme of themes.slice(0, 2)) {
    if (theme === 'Behind the Scenes') themeIdeas.push(`Behind the scenes: How we operate in ${niche.toLowerCase()}`);
    else if (theme === 'Customer Stories') themeIdeas.push(`Customer spotlight: A real success story in ${niche.toLowerCase()}`);
    else if (theme === 'Educational') themeIdeas.push(`${niche} fundamentals that most people skip`);
    else if (theme === 'Quick Tips') themeIdeas.push(`3 quick ${niche.toLowerCase()} tips for immediate results`);
  }

  // Prepend theme ideas, keep rest
  const combined = [...themeIdeas, ...ideas];
  return [...new Set(combined)].slice(0, 5);
}

export function generateRefinedStrategy(client: Client): ClientStrategy {
  const intelligence = client.brandIntelligence;
  const baseStrategy = generateClientStrategy(client);

  if (!intelligence || !intelligence.lastAnalyzed) {
    return { ...baseStrategy, refinedByBrain: true, improvementReasons: generateImprovementReasons(intelligence) };
  }

  // Refine hooks based on preferred style
  let refinedHooks = adjustHooksForStyle(baseStrategy.hooks, intelligence.preferredHookStyle);

  // Filter hooks by avoided words
  refinedHooks = filterByAvoidedWords(refinedHooks, intelligence.avoidedWords);

  // If filtering removed hooks, regenerate
  while (refinedHooks.length < 5) {
    const extra = composeHooks(
      client.niche || 'General',
      client.brandProfile.targetAudience || 'audience',
      client.brandProfile.tone || 'Professional',
      client.brandProfile.keywords
    );
    const filtered = filterByAvoidedWords(extra, intelligence.avoidedWords);
    for (const h of filtered) {
      if (refinedHooks.length >= 5) break;
      if (!refinedHooks.includes(h)) refinedHooks.push(h);
    }
    if (refinedHooks.length >= 5 || filtered.length === 0) break;
  }

  // Refine ideas — prioritize high-performing themes
  let refinedIdeas = prioritizeThemes(
    baseStrategy.contentIdeas,
    intelligence.highPerformingThemes,
    client.niche || 'General'
  );

  // Filter ideas by avoided words
  refinedIdeas = filterByAvoidedWords(refinedIdeas, intelligence.avoidedWords);

  // Refine brand angle — add tone patterns and style notes
  let refinedAngle = baseStrategy.brandAngle;
  if (intelligence.preferredTonePatterns.length > 0) {
    refinedAngle += ` Detected tone patterns: ${intelligence.preferredTonePatterns.join(', ')}.`;
  }
  if (intelligence.contentStyleNotes) {
    refinedAngle += ` Style notes: ${intelligence.contentStyleNotes}.`;
  }

  return {
    contentPillars: intelligence.highPerformingThemes.length > 0
      ? [...new Set([...intelligence.highPerformingThemes, ...baseStrategy.contentPillars])].slice(0, 5)
      : baseStrategy.contentPillars,
    contentIdeas: refinedIdeas,
    hooks: refinedHooks.slice(0, 5),
    postingPlan: baseStrategy.postingPlan,
    brandAngle: refinedAngle,
    generatedAt: new Date().toISOString(),
    refinedByBrain: true,
    improvementReasons: generateImprovementReasons(intelligence),
  };
}

// --- Field Detection Warnings ---

export function detectFieldWarnings(parsed: Record<string, string>): string[] {
  const warnings: string[] = [];
  const knownLabels = [
    'name', 'brand', 'email', 'contact', 'phone',
    'industry', 'niche', 'sector',
    'goals', 'objective',
    'audience', 'who',
    'voice', 'tone',
    'platforms', 'channels', 'social',
    'content type', 'content format',
    'guidelines', 'assets', 'usp', 'challenges', 'notes', 'compliance',
    'timeline', 'team', 'communication', 'messaging', 'launch',
  ];

  for (const key of Object.keys(parsed)) {
    const keyLower = key.toLowerCase();
    const isKnown = knownLabels.some(k => keyLower.includes(k));
    if (!isKnown) {
      warnings.push(`Unknown field: "${key}" — not mapped to form fields`);
    }
  }

  const importantFields = ['name', 'brand', 'email', 'industry', 'platforms'];
  for (const field of importantFields) {
    const hasField = Object.keys(parsed).some(k => k.toLowerCase().includes(field));
    const hasValue = Object.entries(parsed).some(([k, v]) =>
      k.toLowerCase().includes(field) && v.trim().length > 0
    );
    if (hasField && !hasValue) {
      warnings.push(`"${field}" field is empty`);
    }
  }

  return warnings;
}
