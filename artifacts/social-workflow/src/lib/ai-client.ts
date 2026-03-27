import { StrategyInput } from './content-generator';
import { BrandProfile, synthesizeBrandPersona } from './brand-memory';

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

// --- System prompt components ---

const OUTPUT_FORMAT = `
OUTPUT FORMAT — return ONLY a single valid JSON object. No markdown. No code fences. No explanation. No trailing text.

{
  "ideas": [
    "10 specific, immediately actionable content ideas for this niche — not generic titles, actual concepts"
  ],
  "hooks": [
    "10 opening lines — each must use one of: bold claim, counterintuitive statement, specific number, direct challenge, or in-progress story. No questions starting with helping verbs (Is, Are, Do, Can, Have, Has, Did). Each must reference the niche explicitly."
  ],
  "captions": [
    "5 full captions. First line of each = the hook. Max 2 sentences per paragraph. Exactly one CTA per caption. No em-dashes. Do not use: game-changer, elevate, unlock, dive into, in today's world."
  ],
  "reels": [
    "5 short-form video concepts. Each must include: hook for first 3 seconds, tension point, resolution, CTA. Must be shootable on a phone with no crew."
  ],
  "hashtags": {
    "Broad": ["3 broad hashtags without #"],
    "Niche": ["5 niche-specific hashtags without #"],
    "Brand": ["2 brand or campaign hashtags without #"]
  },
  "calendar": [
    {"day": 1, "type": "Reel", "idea": "specific content concept", "format": "Educational"}
  ]
}

The calendar must contain exactly 30 items. Types: Reel, Carousel, Single Post, Story. Formats: Educational, Engagement/Question, Promotional, Personal/Behind the Scenes.
`.trim();

const QUALITY_CONSTRAINTS = `
QUALITY CONSTRAINTS — enforce strictly:

HOOKS:
- Must use one of: bold claim | counterintuitive | specific number | direct challenge | in-progress story
- No opening questions that begin with: Is, Are, Do, Can, Have, Has, Did, Would, Could, Should
- Every hook must name or clearly imply the niche

CAPTIONS:
- Line 1 = the hook (must stop the scroll)
- Max 2 sentences per paragraph
- Exactly one CTA — end with it
- No em-dashes (—)
- Banned words: game-changer, elevate, unlock, dive into, in today's world, revolutionize, transform, journey, empower

VIDEO IDEAS:
- Structure every concept: Hook (0–3 sec) → Tension → Resolution → CTA
- Shootable on a single phone, no studio required
- Concept must be completable in under 90 seconds

HASHTAGS:
- Broad: exactly 3 (high-volume, general)
- Niche: exactly 5 (specific to industry/audience)
- Brand: exactly 2 (custom or campaign-specific)
- No # symbol in values

OUTPUT QUALITY:
- Every item must be immediately usable by a social media manager
- No filler, no meta-commentary, no placeholders like [Brand Name]
- All content must be specific to the niche and audience — nothing generic
`.trim();

// --- Prompt builders ---

function buildSystemPrompt(input: StrategyInput, brandProfile: BrandProfile | null): string {
  const sections: string[] = [];

  if (brandProfile) {
    sections.push(synthesizeBrandPersona(brandProfile));
    sections.push('');
  } else {
    sections.push(
      `You are an expert social media strategist writing content for a ${input.niche} brand.` +
      ` The brand tone is ${input.tone}. Write with precision, platform fluency, and zero filler.`
    );
    sections.push('');
  }

  sections.push(OUTPUT_FORMAT);
  sections.push('');
  sections.push(QUALITY_CONSTRAINTS);

  return sections.join('\n');
}

function buildUserPrompt(input: StrategyInput): string {
  const lines: string[] = [
    `Generate a complete 30-day social media strategy for the following:`,
    '',
    `Niche: ${input.niche}${input.customNiche ? ` (${input.customNiche})` : ''}`,
    `Target Audience: ${input.targetAudience}`,
    `Primary Goal: ${input.goal}`,
    `Platforms: ${input.platforms.join(', ')}`,
    `Content Focus: ${input.contentFocus}`,
  ];

  if (input.extraContext) {
    lines.push(`Additional Context: ${input.extraContext}`);
  }

  lines.push('');
  lines.push('Return only valid JSON. No explanation. No markdown.');

  return lines.join('\n');
}

// --- JSON parsing with extraction fallback ---

function parseAiJson(rawText: string): AiGenerationResult {
  // Step 1: strip markdown fences
  let text = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Step 2: try direct parse
  try {
    return JSON.parse(text) as AiGenerationResult;
  } catch {
    // Step 3: extract JSON object via regex
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as AiGenerationResult;
      } catch {
        // fall through
      }
    }

    // Step 4: try extracting a JSON array as last resort
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const arr = JSON.parse(arrayMatch[0]);
        if (Array.isArray(arr)) {
          throw new Error('Model returned malformed JSON. Try regenerating.');
        }
      } catch (innerErr: any) {
        if (innerErr.message === 'Model returned malformed JSON. Try regenerating.') {
          throw innerErr;
        }
      }
    }

    // Step 5: unrecoverable
    throw new Error('Model returned malformed JSON. Try regenerating.');
  }
}

// --- Types ---

export interface AiGenerationResult {
  ideas: string[];
  hooks: string[];
  captions: string[];
  reels: string[];
  hashtags: Record<string, string[]>;
  calendar: Array<{ day: number; type: string; idea: string; format: string }>;
}

// --- Main generation function ---

export async function generateWithAI(
  input: StrategyInput,
  brandProfile: BrandProfile | null,
  apiKey: string,
  onStep?: (step: string) => void
): Promise<AiGenerationResult> {
  if (!apiKey?.trim()) {
    throw new Error('NO_API_KEY');
  }

  onStep?.('Connecting to AI engine…');

  const systemPrompt = buildSystemPrompt(input, brandProfile);
  const userPrompt = buildUserPrompt(input);

  const response = await fetch(`${GEMINI_URL}?key=${apiKey.trim()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
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
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) throw new Error('EMPTY_RESPONSE');

  const parsed = parseAiJson(rawText);

  // Validate required arrays
  if (!Array.isArray(parsed.ideas) || !Array.isArray(parsed.hooks) || !Array.isArray(parsed.captions)) {
    throw new Error('Model returned malformed JSON. Try regenerating.');
  }

  // Pad calendar to 30 days if the model returned fewer
  if (!Array.isArray(parsed.calendar) || parsed.calendar.length < 28) {
    const existing = Array.isArray(parsed.calendar) ? parsed.calendar : [];
    const extras = Array.from({ length: 30 - existing.length }, (_, i) => ({
      day: existing.length + i + 1,
      type: (['Reel', 'Carousel', 'Single Post', 'Story'] as const)[i % 4],
      idea: parsed.ideas[i % Math.max(parsed.ideas.length, 1)] ?? 'Content piece',
      format: (['Educational', 'Engagement/Question', 'Promotional', 'Personal/Behind the Scenes'] as const)[i % 4],
    }));
    parsed.calendar = [...existing, ...extras];
  }

  return parsed;
}
