import { Client, BrandIntelligence, ImprovementReason, createEmptyIntelligence } from './client-types';

// --- Stop words to filter out ---

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or',
  'if', 'while', 'this', 'that', 'these', 'those', 'it', 'its', 'we',
  'our', 'you', 'your', 'they', 'their', 'my', 'me', 'i', 'he', 'she',
  'about', 'up', 'like', 'what', 'who', 'which', 'also', 'get', 'make',
  'know', 'take', 'come', 'see', 'want', 'look', 'think', 'say', 'tell',
  'give', 'use', 'find', 'need', 'try', 'keep', 'let', 'help', 'show',
]);

// --- Common CTA phrases to detect ---

const CTA_PATTERNS = [
  'save this', 'share this', 'tag someone', 'comment below', 'tell me',
  'let me know', 'what do you think', 'follow for more', 'check out',
  'click the link', 'link in bio', 'swipe up', 'drop a comment',
  'double tap', 'send this to', 'try this', 'subscribe', 'join',
];

// --- Keyword extraction ---

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  // Count frequency
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Sort by frequency, return top 15
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);
}

// --- Theme extraction from content ---

function extractThemes(text: string): string[] {
  if (!text) return [];
  const themes: string[] = [];
  const lower = text.toLowerCase();

  // Look for common content themes
  const themePatterns: Record<string, RegExp[]> = {
    'Behind the Scenes': [/behind the scenes/i, /how we/i, /our process/i, /day in the life/i],
    'Customer Stories': [/customer/i, /client/i, /testimonial/i, /success story/i, /review/i],
    'Educational': [/how to/i, /tips/i, /guide/i, /tutorial/i, /learn/i, /explain/i],
    'Motivational': [/motivation/i, /inspire/i, /believe/i, /journey/i, /never give up/i],
    'Product Focus': [/product/i, /launch/i, /new feature/i, /announcement/i, /update/i],
    'Community': [/community/i, /together/i, /join us/i, /our team/i, /family/i],
    'Humor': [/funny/i, /joke/i, /lol/i, /hilarious/i, /comedy/i, /meme/i],
    'Controversial': [/unpopular opinion/i, /hot take/i, /debate/i, /controversial/i],
    'Before/After': [/before and after/i, /transformation/i, /results/i, /changed/i],
    'Quick Tips': [/quick tip/i, /hack/i, /trick/i, /secret/i, /\d+ tips/i],
  };

  for (const [theme, patterns] of Object.entries(themePatterns)) {
    if (patterns.some(p => p.test(lower))) {
      themes.push(theme);
    }
  }

  return themes;
}

// --- Detect CTA patterns ---

function detectCtas(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return CTA_PATTERNS.filter(cta => lower.includes(cta));
}

// --- Detect hook style preference ---

function detectHookStyle(captions: string[], hooks: string[]): BrandIntelligence['preferredHookStyle'] {
  const allText = [...captions, ...hooks].join(' ').toLowerCase();

  const avgLength = allText.length / Math.max(captions.length + hooks.length, 1);

  if (/\bstory\b|\bonce upon\b|\bjourney\b|\bstarted\b|\bgrew\b/.test(allText)) return 'storytelling';
  if (/\bwhy\b|\bhow\b|\bwhat happens\b|\bhere.s why\b/.test(allText)) return 'curiosity';
  if (avgLength < 80) return 'short';
  if (avgLength > 200) return 'long';

  return 'mixed';
}

// --- Detect tone patterns ---

function detectTonePatterns(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const patterns: string[] = [];

  const toneKeywords: Record<string, string[]> = {
    'warm': ['warm', 'cozy', 'comfort', 'love', 'heart', 'home', 'family', 'together'],
    'energetic': ['exciting', 'amazing', 'incredible', 'wow', 'awesome', 'fire', 'let.s go'],
    'professional': ['expert', 'industry', 'data', 'research', 'proven', 'strategic', 'evidence'],
    'casual': ['hey', 'okay', 'lol', 'tbh', 'ngl', 'vibe', 'chill', 'real talk'],
    'bold': ['stop', 'never', 'always', 'must', 'need', 'demand', 'challenge', 'disrupt'],
    'empathetic': ['understand', 'feel', 'struggle', 'support', 'care', 'help', 'together'],
    'playful': ['fun', 'play', 'game', 'joke', 'laugh', 'silly', 'creative', 'imagine'],
  };

  for (const [tone, keywords] of Object.entries(toneKeywords)) {
    const matches = keywords.filter(k => lower.includes(k)).length;
    if (matches >= 2) patterns.push(tone);
  }

  return patterns.length > 0 ? patterns : ['neutral'];
}

// --- Detect hook type label ---

function classifyHookType(hook: string): string {
  const lower = hook.toLowerCase();
  if (/\d+%|\d+ out of|\d+x/.test(lower)) return 'data-driven';
  if (/^\b(why|how|what|when|who)\b/.test(lower) || /\?/.test(hook)) return 'question';
  if (/\b(story|journey|started|began|once|remember)\b/.test(lower)) return 'storytelling';
  if (/\b(stop|never|always|must|unpopular)\b/.test(lower)) return 'bold-statement';
  if (/\b(secret|hack|trick|tip|one thing)\b/.test(lower)) return 'curiosity';
  return 'statement';
}

// --- Main analysis function ---

export function analyzePastContent(client: Client): BrandIntelligence {
  const pastContent = client.brandProfile.pastContent || '';
  const dos = client.brandProfile.dos.filter(Boolean).join(' ');
  const donts = client.brandProfile.donts.filter(Boolean).join(' ');
  const keywords = client.brandProfile.keywords.join(' ');

  // Combine all text sources
  const allText = [pastContent, dos, keywords].join('\n');

  // Split past content into captions/lines for analysis
  const lines = pastContent.split('\n').filter(l => l.trim().length > 10);
  const captionLines = pastContent
    .split('---')
    .map(c => c.trim())
    .filter(Boolean);

  // Extract intelligence
  const commonWords = extractKeywords(allText);
  const themes = extractThemes(allText);
  const ctaPatterns = detectCtas(allText);
  const hookStyle = detectHookStyle(captionLines, lines);
  const tonePatterns = detectTonePatterns(allText);

  // Extract avoided words from donts
  const avoidedWords = donts
    .split(/[,.]/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && w.length < 30)
    .slice(0, 10);

  // Preserve learning counters from existing intelligence
  const existing = client.brandIntelligence;

  return {
    preferredHookStyle: hookStyle,
    preferredTonePatterns: tonePatterns,
    avoidedWords,
    highPerformingThemes: themes,
    contentStyleNotes: existing?.contentStyleNotes || '',
    ctaPatterns,
    commonWords,
    lastAnalyzed: new Date().toISOString(),
    patternScores: existing?.patternScores || { themes: {}, hookTypes: {}, tonePatterns: {} },
    refinementCount: existing?.refinementCount || 0,
    approvalCount: existing?.approvalCount || 0,
    rejectionCount: existing?.rejectionCount || 0,
    editCount: existing?.editCount || 0,
  };
}

// --- Utility: merge intelligence (manual + analyzed) ---

export function mergeIntelligence(
  existing: BrandIntelligence | null,
  analyzed: BrandIntelligence
): BrandIntelligence {
  if (!existing) return analyzed;

  return {
    preferredHookStyle: existing.contentStyleNotes ? existing.preferredHookStyle : analyzed.preferredHookStyle,
    preferredTonePatterns: [...new Set([...existing.preferredTonePatterns, ...analyzed.preferredTonePatterns])].slice(0, 8),
    avoidedWords: [...new Set([...existing.avoidedWords, ...analyzed.avoidedWords])].slice(0, 15),
    highPerformingThemes: [...new Set([...existing.highPerformingThemes, ...analyzed.highPerformingThemes])].slice(0, 10),
    contentStyleNotes: existing.contentStyleNotes,
    ctaPatterns: [...new Set([...existing.ctaPatterns, ...analyzed.ctaPatterns])].slice(0, 10),
    commonWords: analyzed.commonWords,
    lastAnalyzed: new Date().toISOString(),
    patternScores: {
      themes: { ...analyzed.patternScores.themes, ...existing.patternScores.themes },
      hookTypes: { ...analyzed.patternScores.hookTypes, ...existing.patternScores.hookTypes },
      tonePatterns: { ...analyzed.patternScores.tonePatterns, ...existing.patternScores.tonePatterns },
    },
    refinementCount: existing.refinementCount,
    approvalCount: existing.approvalCount,
    rejectionCount: existing.rejectionCount,
    editCount: existing.editCount,
  };
}

// --- Learning: capture patterns from user edits ---

export function learnFromEdits(
  original: string[],
  edited: string[],
  intelligence: BrandIntelligence
): BrandIntelligence {
  const updated = { ...intelligence };
  updated.editCount = (updated.editCount || 0) + 1;
  const scores = {
    themes: { ...updated.patternScores.themes },
    hookTypes: { ...updated.patternScores.hookTypes },
    tonePatterns: { ...updated.patternScores.tonePatterns },
  };

  for (let i = 0; i < Math.min(original.length, edited.length); i++) {
    if (original[i] === edited[i]) continue;

    const editedText = edited[i];

    // Learn hook type from edits
    const hookType = classifyHookType(editedText);
    scores.hookTypes[hookType] = (scores.hookTypes[hookType] || 0) + 1;

    // Learn tone from edits
    const tones = detectTonePatterns(editedText);
    for (const t of tones) {
      scores.tonePatterns[t] = (scores.tonePatterns[t] || 0) + 1;
    }

    // Learn themes from edits
    const editThemes = extractThemes(editedText);
    for (const th of editThemes) {
      scores.themes[th] = (scores.themes[th] || 0) + 1;
    }

    // Detect new avoided words from what user removed
    const origWords = new Set(original[i].toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const editWords = new Set(editedText.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const removed = [...origWords].filter(w => !editWords.has(w) && !STOP_WORDS.has(w));
    if (removed.length > 0 && removed.length <= 3) {
      const newAvoided = removed.filter(w => !updated.avoidedWords.includes(w));
      updated.avoidedWords = [...updated.avoidedWords, ...newAvoided].slice(0, 15);
    }
  }

  // Update preferred hook style based on accumulated scores
  const topHookType = Object.entries(scores.hookTypes).sort((a, b) => b[1] - a[1])[0];
  if (topHookType && topHookType[1] >= 3) {
    const styleMap: Record<string, BrandIntelligence['preferredHookStyle']> = {
      'curiosity': 'curiosity',
      'storytelling': 'storytelling',
      'data-driven': 'short',
      'bold-statement': 'short',
      'question': 'curiosity',
      'statement': 'mixed',
    };
    updated.preferredHookStyle = styleMap[topHookType[0]] || 'mixed';
  }

  updated.patternScores = scores;
  return updated;
}

// --- Learning: boost patterns on approval ---

export function learnFromApproval(
  hooks: string[],
  ideas: string[],
  intelligence: BrandIntelligence
): BrandIntelligence {
  const updated = { ...intelligence };
  updated.approvalCount = (updated.approvalCount || 0) + 1;
  const scores = {
    themes: { ...updated.patternScores.themes },
    hookTypes: { ...updated.patternScores.hookTypes },
    tonePatterns: { ...updated.patternScores.tonePatterns },
  };

  // Boost hook types that were approved
  for (const hook of hooks) {
    const type = classifyHookType(hook);
    scores.hookTypes[type] = (scores.hookTypes[type] || 0) + 2;
  }

  // Boost themes found in approved ideas
  for (const idea of ideas) {
    const ideaThemes = extractThemes(idea);
    for (const th of ideaThemes) {
      scores.themes[th] = (scores.themes[th] || 0) + 2;
    }
    const tones = detectTonePatterns(idea);
    for (const t of tones) {
      scores.tonePatterns[t] = (scores.tonePatterns[t] || 0) + 1;
    }
  }

  // Update high performing themes from scores
  const topThemes = Object.entries(scores.themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);
  updated.highPerformingThemes = [...new Set([...topThemes, ...updated.highPerformingThemes])].slice(0, 10);

  updated.patternScores = scores;
  return updated;
}

// --- Learning: reduce patterns on rejection ---

export function learnFromRejection(
  hooks: string[],
  ideas: string[],
  intelligence: BrandIntelligence
): BrandIntelligence {
  const updated = { ...intelligence };
  updated.rejectionCount = (updated.rejectionCount || 0) + 1;
  const scores = {
    themes: { ...updated.patternScores.themes },
    hookTypes: { ...updated.patternScores.hookTypes },
    tonePatterns: { ...updated.patternScores.tonePatterns },
  };

  // Reduce hook type scores for rejected hooks
  for (const hook of hooks) {
    const type = classifyHookType(hook);
    scores.hookTypes[type] = Math.max(0, (scores.hookTypes[type] || 0) - 1);
  }

  // Reduce theme scores for rejected ideas
  for (const idea of ideas) {
    const ideaThemes = extractThemes(idea);
    for (const th of ideaThemes) {
      scores.themes[th] = Math.max(0, (scores.themes[th] || 0) - 1);
    }
  }

  updated.patternScores = scores;
  return updated;
}

// --- Learning Progress calculation ---

export function calculateLearningProgress(intelligence: BrandIntelligence | null): {
  percentage: number;
  label: string;
  factors: Array<{ name: string; value: number; max: number }>;
} {
  if (!intelligence) {
    return { percentage: 0, label: 'No Data', factors: [] };
  }

  const factors = [
    {
      name: 'Past content analyzed',
      value: intelligence.commonWords.length > 0 ? 1 : 0,
      max: 1,
    },
    {
      name: 'Refinements done',
      value: Math.min(intelligence.refinementCount, 5),
      max: 5,
    },
    {
      name: 'Strategies approved',
      value: Math.min(intelligence.approvalCount, 5),
      max: 5,
    },
    {
      name: 'Content edits made',
      value: Math.min(intelligence.editCount, 10),
      max: 10,
    },
    {
      name: 'Tone patterns learned',
      value: Math.min(Object.keys(intelligence.patternScores.tonePatterns).length, 5),
      max: 5,
    },
    {
      name: 'Pattern Analysis',
      value: Math.min(Object.keys(intelligence.patternScores.hookTypes).length, 4),
      max: 4,
    },
    {
      name: 'Avoided words tracked',
      value: Math.min(intelligence.avoidedWords.length, 5),
      max: 5,
    },
  ];

  const totalValue = factors.reduce((sum, f) => sum + f.value, 0);
  const totalMax = factors.reduce((sum, f) => sum + f.max, 0);
  const percentage = totalMax > 0 ? Math.round((totalValue / totalMax) * 100) : 0;

  const label = percentage >= 80 ? 'Strong' : percentage >= 50 ? 'Growing' : percentage >= 20 ? 'Warming Up' : 'No Data';

  return { percentage, label, factors };
}

// --- Generate improvement reasons from refinement ---

export function generateImprovementReasons(
  intelligence: BrandIntelligence | null
): ImprovementReason[] {
  if (!intelligence) return [];
  const reasons: ImprovementReason[] = [];

  // Hook style
  if (intelligence.preferredHookStyle && intelligence.preferredHookStyle !== 'mixed') {
    const styleLabels: Record<string, string> = {
      storytelling: 'Using storytelling hook style',
      curiosity: 'Using curiosity-driven hooks',
      short: 'Keeping hooks short and punchy',
      long: 'Using longer, detailed hooks',
    };
    reasons.push({
      label: styleLabels[intelligence.preferredHookStyle] || `Hook style: ${intelligence.preferredHookStyle}`,
      detail: `Based on ${intelligence.editCount} edits and ${intelligence.approvalCount} approvals`,
    });
  }

  // Avoided words
  if (intelligence.avoidedWords.length > 0) {
    const removed = intelligence.avoidedWords.slice(0, 5);
    reasons.push({
      label: `Avoided words: ${removed.join(', ')} removed`,
      detail: 'Words you removed in previous edits are now filtered out',
    });
  }

  // High performing themes
  if (intelligence.highPerformingThemes.length > 0) {
    const top = intelligence.highPerformingThemes.slice(0, 3);
    reasons.push({
      label: `Prioritized themes: ${top.join(', ')}`,
      detail: 'Themes from your approved strategies are now prioritized',
    });
  }

  // Tone patterns
  if (intelligence.preferredTonePatterns.length > 0) {
    const tones = intelligence.preferredTonePatterns.slice(0, 3);
    reasons.push({
      label: `Tone matched: ${tones.join(' / ')}`,
      detail: 'Detected from your past content and edits',
    });
  }

  return reasons;
}
