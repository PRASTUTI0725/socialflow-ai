export interface BrandProfile {
  id: string;
  brandName: string;
  niche: string;
  targetAudience: string;
  tone: string;
  customTone?: string;
  writingStyle: 'short' | 'storytelling' | 'punchy' | 'educational';
  dos: string[];
  donts: string[];
  pastContent: string;
  keywords: string[];
  themes: string[];
  createdAt: string;
}

export interface RepurposedContent {
  linkedin: string;
  instagram: string;
  twitter: string;
}

const STORAGE_KEY = 'socialflow_brand_profiles';
const ACTIVE_KEY = 'socialflow_active_profile';

export function loadProfiles(): BrandProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfile(profile: BrandProfile): void {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function deleteProfile(id: string): void {
  const profiles = loadProfiles().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  if (getActiveProfileId() === id) clearActiveProfile();
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProfileId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function clearActiveProfile(): void {
  localStorage.removeItem(ACTIVE_KEY);
}

export function createEmptyProfile(): BrandProfile {
  return {
    id: Math.random().toString(36).substr(2, 9),
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
  };
}

// Maps writing style enum to a natural language description of how this brand writes
function describeWritingStyle(style: BrandProfile['writingStyle']): string {
  switch (style) {
    case 'educational':
      return 'structured and methodical — it leads with context, supports with data, and closes with a clear takeaway. Each piece teaches something concrete.';
    case 'storytelling':
      return 'narrative-driven — it opens with a scene or moment, builds through tension, and resolves with a human insight. Emotion is the mechanism; information is the payload.';
    case 'punchy':
      return 'high-impact and compressed — it uses short lines, strong verbs, and rhythm. Every sentence earns its place. Nothing is wasted.';
    case 'short':
      return 'scannable and immediate — it uses fragments, bullets, and line breaks. The reader absorbs it in seconds and acts on it.';
  }
}

// Maps tone to a natural description of how this brand thinks and sounds
function describeTone(tone: string, customTone?: string): string {
  if (tone === 'Custom' && customTone) return customTone;
  const map: Record<string, string> = {
    'Professional & Authoritative': 'confident, precise, and credible — it speaks from expertise without being cold. It earns trust through substance, not volume.',
    'Casual & Friendly': 'warm, direct, and genuinely human — it sounds like a knowledgeable friend, not a brand. It uses natural language and never performs.',
    'Bold & Disruptive': 'unapologetically direct and energised — it challenges assumptions, says what others avoid, and creates forward motion.',
    'Educational & Informative': 'clear, patient, and methodical — it breaks complexity into clarity. The reader always leaves knowing something useful.',
    'Witty & Humorous': 'sharp and culturally literate — it earns laughs through timing and specificity, not forced cheerfulness.',
    'Inspirational & Motivational': 'purposeful and action-oriented — it speaks to what people want to become and gives them permission to pursue it.',
    'Empathetic & Supportive': 'grounded and affirming — it meets the reader where they are, validates the struggle, and offers a way forward without pressure.',
  };
  return map[tone] ?? 'professional and considered';
}

/**
 * Synthesizes a coherent system persona string from a BrandProfile.
 * Used as the system prompt block in all Gemini generation calls.
 */
export function synthesizeBrandPersona(profile: BrandProfile): string {
  const lines: string[] = [];

  lines.push(`You are not an AI assistant generating content. You are the voice of ${profile.brandName || 'this brand'}. You have a specific worldview, a specific reader you are talking to, and a specific way you never communicate.`);
  lines.push('');

  let target = profile.targetAudience || 'my audience';
  lines.push(`My reader is ${target}. I assume they are informed. I do not explain basics to them.`);
  
  let toneBehavior = "I communicate like a person, not a brand. Specific over general. Direct over diplomatic.";
  const toneLower = profile.tone.toLowerCase();
  
  if (toneLower.includes("witty")) {
    toneBehavior = "I make the point and then undercut it slightly — the joke is in the gap, not the punchline.";
  } else if (toneLower.includes("professional")) {
    toneBehavior = "I lead with the insight, then the evidence. Never the reverse.";
  } else if (toneLower.includes("casual")) {
    toneBehavior = "I write like I'm texting someone smart. No performance, no structure theater.";
  } else if (toneLower.includes("authoritative")) {
    toneBehavior = "I state positions. I do not hedge. The reader can disagree but I will not apologize for having a view.";
  }

  lines.push(`My tone is ${profile.tone}. In practice this means: ${toneBehavior}`);
  
  if (profile.keywords && profile.keywords.length > 0) {
    lines.push(`I gravitate toward themes of ${profile.keywords.join(', ')}.`);
  }

  const donts = profile.donts.filter(Boolean);
  if (donts.length > 0) {
    lines.push(`I never sound like: a generic marketer who relies on concepts like ${donts.join(', ')}.`);
  }

  if (profile.pastContent && profile.pastContent.trim().length > 10) {
    const excerpt = profile.pastContent.trim().slice(0, 600);
    lines.push(`My proven content voice sounds like this: ${excerpt}. Match this register.`);
  }

  return lines.join('\n');
}

// Applies brand profile personality modifiers to a caption
export function applyBrandVoice(caption: string, profile: BrandProfile): string {
  let result = caption;

  if (profile.brandName) {
    result = result.replace('our office', `the ${profile.brandName} team`);
    result = result.replace('our process', `the ${profile.brandName} process`);
  }

  if (profile.writingStyle === 'punchy') {
    result = result.replace(/\n\n/g, '\n').replace(/\. We/g, '.\n\nWe');
  }

  if (profile.writingStyle === 'short') {
    const lines = result.split('\n').filter(Boolean);
    result = lines.slice(0, 3).join('\n');
  }

  if (profile.writingStyle === 'storytelling') {
    result = result + "\n\nThis is the story of how we got here — and why we haven't looked back.";
  }

  if (profile.keywords.length > 0) {
    const kw = profile.keywords[0];
    result = result.replace(/this space/gi, `the ${kw} space`);
    result = result.replace(/our industry/gi, `the ${kw} industry`);
  }

  if (profile.targetAudience) {
    result = result.replace(/your community/gi, `our community of ${profile.targetAudience}`);
  }

  return result;
}

// Generates brand-aware hooks using profile data
export function applyBrandHook(hook: string, profile: BrandProfile): string {
  let result = hook;

  if (profile.tone.toLowerCase().includes('funny') || profile.tone.toLowerCase().includes('bold')) {
    result = result.replace('The biggest lie', 'The hottest take');
    result = result.replace('Stop doing', 'Please, STOP doing');
  }

  if (profile.tone.toLowerCase().includes('professional') || profile.tone.toLowerCase().includes('educational')) {
    result = result.replace('nobody talks about', 'most professionals overlook');
    result = result.replace("I can't live without", 'our team relies on daily');
  }

  if (profile.brandName) {
    result = result.replace('I spent 5 years', `The ${profile.brandName} team spent years`);
  }

  if (profile.keywords.length > 0) {
    const kw = profile.keywords[0];
    result = result.replace(/\[niche\]/gi, kw);
    result = result.replace(/\[industry\]/gi, kw);
  }

  return result;
}

// Repurposes a single content idea into platform-specific formats
export function repurposeIdea(
  idea: string,
  niche: string,
  profile: BrandProfile | null
): RepurposedContent {
  const brand = profile?.brandName || 'We';
  const audience = profile?.targetAudience || 'our audience';
  const keywords = profile?.keywords?.join(', ') || niche;
  const style = profile?.writingStyle || 'educational';

  const linkedin = `${brand === 'We' ? 'Sharing' : `${brand} is sharing`} something we've been testing with ${audience}:

📌 ${idea}

Here's what we've learned after implementing this consistently:

→ It removes the guesswork from content planning
→ It aligns your messaging with what your audience actually wants
→ It builds compounding brand trust over time

The key insight: most ${niche} brands focus on output volume. The ones that win focus on strategic clarity first.

What's your approach to this? Drop your thoughts below.

#${niche.replace(/\s+/g, '')} #ContentStrategy #${keywords.split(',')[0]?.trim()?.replace(/\s+/g, '') || 'Growth'}`;

  const igStyle = style === 'punchy' || style === 'short'
    ? `${idea} — here's the truth nobody tells you.\n\nSave this. Share it. Come back to it.\n\n👇 Try this this week and tell me how it goes.`
    : `Let's talk about something real in the ${niche} space: ${idea.toLowerCase()}.\n\nThis isn't just a trend. This is a shift in how ${audience} expect to see brands show up.\n\nIf you're not thinking about this yet — you will be soon.\n\nDouble tap if this resonates. 💛\nComment below: what's your take?\n\n📌 Save this for your next content session.`;

  const instagram = igStyle;

  const twitter = `🧵 Thread: ${idea} (and why it matters for ${niche} brands right now)

1/ Most people get this wrong. Here's the thing about ${idea.toLowerCase()}...

2/ The surface-level version: it's just another tactic. The deeper version: it's a complete rethink of how you connect with ${audience}.

3/ What actually works:
→ Lead with context, not just content
→ Repeat your core message in different formats
→ Measure resonance, not just reach

4/ The brands winning in ${niche} right now aren't posting more. They're posting smarter.

5/ Take this one idea, build 5 variations of it, and schedule it across 2 weeks. Watch what happens.

— That's it. RT if this was useful.`;

  return { linkedin, instagram, twitter };
}
