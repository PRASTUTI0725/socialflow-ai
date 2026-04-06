import { Client, ClientStrategy } from '@/modules/clients/lib/client-types';
import { generateClientStrategy as templateGenerate } from '@/modules/clients/lib/client-strategy-generator';

// --- Config ---

function getApiKey(): string | null {
  return localStorage.getItem('ai_api_key') || import.meta.env.VITE_AI_API_KEY || null;
}

function getModel(): string {
  return localStorage.getItem('ai_model') || 'gpt-4o-mini';
}

function getApiProvider(): 'openai' | 'anthropic' {
  const key = getApiKey() || '';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  return 'openai';
}

// --- Types ---

interface AiStrategyResponse {
  contentPillars: string[];
  contentIdeas: string[];
  hooks: string[];
  postingPlan: Array<{ day: string; type: string; topic: string }>;
  brandAngle: string;
}

export type GenerationType = 'ai' | 'template';

export interface GenerationResult {
  strategy: ClientStrategy;
  source: GenerationType;
  error?: string;
}

// --- Prompt Builder ---

function buildPrompt(client: Client): string {
  const name = client.name || 'the brand';
  const niche = client.niche || 'general business';
  const audience = client.brandProfile.targetAudience || 'general audience';
  const tone = client.brandProfile.tone || 'Professional & Authoritative';
  const goals = client.brandProfile.keywords.join(', ') || 'grow audience';
  const platforms = client.metadata.platforms.join(', ') || 'Instagram';
  const challenges = client.brandProfile.pastContent
    .split('\n')
    .filter(l => l.trim())
    .slice(0, 5)
    .join('; ') || 'none specified';
  const dos = client.brandProfile.dos.filter(Boolean).join(', ');
  const donts = client.brandProfile.donts.filter(Boolean).join(', ');

  return `You are a social media content strategist. Generate a content strategy for a brand.

Brand: ${name}
Niche: ${niche}
Target Audience: ${audience}
Brand Tone: ${tone}
Goals: ${goals}
Platforms: ${platforms}
Challenges: ${challenges}
Do's: ${dos || 'none'}
Don'ts: ${donts || 'none'}

Respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "contentPillars": ["pillar1", "pillar2", "pillar3", "pillar4", "pillar5"],
  "contentIdeas": ["idea1", "idea2", "idea3", "idea4", "idea5"],
  "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"],
  "postingPlan": [
    {"day": "Monday", "type": "Post type", "topic": "Topic"},
    {"day": "Tuesday", "type": "Post type", "topic": "Topic"},
    {"day": "Wednesday", "type": "Post type", "topic": "Topic"},
    {"day": "Thursday", "type": "Post type", "topic": "Topic"},
    {"day": "Friday", "type": "Post type", "topic": "Topic"},
    {"day": "Saturday", "type": "Post type", "topic": "Topic"},
    {"day": "Sunday", "type": "Post type", "topic": "Topic"}
  ],
  "brandAngle": "A 2-3 sentence positioning statement"
}

Requirements:
- Hooks should be curiosity-driven, using the brand's tone
- Content ideas should be specific to the niche and audience
- Posting plan should match the platforms specified
- Brand angle should reference the brand name, audience, and goals`;
}

// --- API Callers ---

async function callOpenAI(prompt: string, apiKey: string): Promise<AiStrategyResponse> {
  const model = getModel();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  return parseAiResponse(content);
}

async function callAnthropic(prompt: string, apiKey: string): Promise<AiStrategyResponse> {
  const model = getModel();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Empty response from Anthropic');

  return parseAiResponse(content);
}

// --- Response Parser ---

function parseAiResponse(raw: string): AiStrategyResponse {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  const parsed = JSON.parse(cleaned);

  // Validate structure
  if (!Array.isArray(parsed.contentPillars) || !Array.isArray(parsed.contentIdeas) ||
      !Array.isArray(parsed.hooks) || !Array.isArray(parsed.postingPlan) ||
      typeof parsed.brandAngle !== 'string') {
    throw new Error('Invalid AI response structure');
  }

  // Ensure minimum data
  if (parsed.contentPillars.length < 3) throw new Error('Too few content pillars');
  if (parsed.hooks.length < 3) throw new Error('Too few hooks');
  if (parsed.postingPlan.length < 7) throw new Error('Posting plan must have 7 days');

  return {
    contentPillars: parsed.contentPillars.slice(0, 5),
    contentIdeas: parsed.contentIdeas.slice(0, 5),
    hooks: parsed.hooks.slice(0, 5),
    postingPlan: parsed.postingPlan.slice(0, 7),
    brandAngle: parsed.brandAngle,
  };
}

function toClientStrategy(response: AiStrategyResponse): ClientStrategy {
  return {
    ...response,
    generatedAt: new Date().toISOString(),
  };
}

// --- Main Export ---

export async function generateStrategy(client: Client): Promise<GenerationResult> {
  const apiKey = getApiKey();
  const provider = getApiProvider();

  // No API key → fallback to template
  if (!apiKey) {
    return {
      strategy: templateGenerate(client),
      source: 'template',
    };
  }

  try {
    const prompt = buildPrompt(client);
    let response: AiStrategyResponse;

    if (provider === 'anthropic') {
      response = await callAnthropic(prompt, apiKey);
    } else {
      response = await callOpenAI(prompt, apiKey);
    }

    return {
      strategy: toClientStrategy(response),
      source: 'ai',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('AI generation failed, falling back to template:', message);

    return {
      strategy: templateGenerate(client),
      source: 'template',
      error: message,
    };
  }
}

// --- Settings helpers ---

export function setApiKey(key: string): void {
  localStorage.setItem('ai_api_key', key);
}

export function getStoredApiKey(): string | null {
  return getApiKey();
}

export function clearApiKey(): void {
  localStorage.removeItem('ai_api_key');
}

export function setModel(model: string): void {
  localStorage.setItem('ai_model', model);
}

export function getStoredModel(): string {
  return getModel();
}

export function isAiEnabled(): boolean {
  return !!getApiKey();
}
