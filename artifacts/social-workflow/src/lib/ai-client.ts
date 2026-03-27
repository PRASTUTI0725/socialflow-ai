import { StrategyInput } from './content-generator';
import { BrandProfile } from './brand-memory';

const API_KEY_STORAGE = 'gemini_api_key';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function storeApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

function buildSystemPrompt(input: StrategyInput, brandProfile: BrandProfile | null): string {
  const brandContext = brandProfile
    ? `
ACTIVE BRAND PROFILE:
- Brand Name: ${brandProfile.brandName}
- Niche: ${brandProfile.niche}
- Target Audience: ${brandProfile.targetAudience}
- Brand Tone: ${brandProfile.tone}${brandProfile.customTone ? ` (${brandProfile.customTone})` : ''}
- Writing Style: ${brandProfile.writingStyle}
${brandProfile.dos.filter(Boolean).length > 0 ? `- Brand Do's: ${brandProfile.dos.filter(Boolean).join(', ')}` : ''}
${brandProfile.donts.filter(Boolean).length > 0 ? `- Brand Don'ts: ${brandProfile.donts.filter(Boolean).join(', ')}` : ''}
${brandProfile.keywords.length > 0 ? `- Keywords & Themes: ${brandProfile.keywords.join(', ')}` : ''}
${brandProfile.pastContent ? `- High-Performing Past Content Examples:\n${brandProfile.pastContent}` : ''}

IMPORTANT: All output MUST reflect this brand's voice, tone, audience, and guidelines exactly.
`
    : `No brand profile active. Use a professional, engaging, platform-optimised tone.`;

  return `You are an expert social media strategist for a professional agency. Generate a complete 30-day content strategy.

${brandContext}

USER STRATEGY REQUEST:
- Industry / Niche: ${input.niche}${input.customNiche ? ` (${input.customNiche})` : ''}
- Target Audience: ${input.targetAudience}
- Brand Tone: ${input.tone}
- Primary Goal: ${input.goal}
- Platforms: ${input.platforms.join(', ')}
- Content Focus: ${input.contentFocus}
${input.extraContext ? `- Additional Context: ${input.extraContext}` : ''}

Return ONLY a valid JSON object with NO markdown, NO code fences, NO explanation. Use this EXACT structure:

{
  "ideas": ["10 specific content ideas relevant to this niche"],
  "hooks": ["10 viral opening lines that stop the scroll — punchy, specific, platform-native"],
  "captions": ["5 full captions — each 100-200 words, platform-appropriate, with a clear CTA"],
  "reels": ["5 short-form video concepts with production direction"],
  "hashtags": {
    "Broad": ["5 broad hashtags"],
    "Niche": ["4 niche hashtags"],
    "Action": ["3 action hashtags"]
  },
  "calendar": [
    {"day": 1, "type": "Reel", "idea": "content concept", "format": "Educational"},
    ... (30 items total, types: Reel/Carousel/Single Post/Story, formats: Educational/Engagement\\/Question/Promotional/Personal\\/Behind the Scenes)
  ]
}

Write in ${input.tone} voice. Make everything specific to ${input.niche} and ${input.targetAudience}. The content must feel real, agency-grade, and immediately usable — not generic.`;
}

export interface AiGenerationResult {
  ideas: string[];
  hooks: string[];
  captions: string[];
  reels: string[];
  hashtags: Record<string, string[]>;
  calendar: Array<{ day: number; type: string; idea: string; format: string }>;
}

export async function generateWithAI(
  input: StrategyInput,
  brandProfile: BrandProfile | null,
  apiKey: string,
  onStep?: (step: string) => void
): Promise<AiGenerationResult> {
  if (!apiKey?.trim()) {
    throw new Error('NO_API_KEY');
  }

  const prompt = buildSystemPrompt(input, brandProfile);

  onStep?.('Connecting to AI engine…');

  const response = await fetch(`${GEMINI_URL}?key=${apiKey.trim()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as any)?.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 400) throw new Error(`INVALID_KEY: ${msg}`);
    if (response.status === 429) throw new Error('RATE_LIMITED');
    throw new Error(`API_ERROR: ${msg}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) throw new Error('EMPTY_RESPONSE');

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: AiGenerationResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('PARSE_ERROR');
  }

  // Validate structure
  if (!Array.isArray(parsed.ideas) || !Array.isArray(parsed.hooks) || !Array.isArray(parsed.captions)) {
    throw new Error('INVALID_STRUCTURE');
  }

  // Ensure calendar has 30 items
  if (!Array.isArray(parsed.calendar) || parsed.calendar.length < 28) {
    const extras = Array.from({ length: 30 - (parsed.calendar?.length ?? 0) }, (_, i) => ({
      day: (parsed.calendar?.length ?? 0) + i + 1,
      type: ['Reel', 'Carousel', 'Single Post', 'Story'][i % 4],
      idea: parsed.ideas[i % parsed.ideas.length] ?? 'Content piece',
      format: ['Educational', 'Engagement/Question', 'Promotional', 'Personal/Behind the Scenes'][i % 4],
    }));
    parsed.calendar = [...(parsed.calendar ?? []), ...extras];
  }

  return parsed;
}
