/**
 * Google Form Response Parser
 * 
 * Parses individual Google Form response text (copied from response view)
 * into structured data that maps to the client onboarding form fields.
 * 
 * Google Form response format:
 *   Question Label:
 *   Answer text (may span multiple lines)
 *   Next Question Label:
 *   Next answer...
 */

export interface ParsedClientData {
  name: string;
  niche: string;
  targetAudience: string;
  tone: string;
  platforms: string[];
  contentPillars: string[];
  keywords: string[];
  pastContent: string;
  email: string;
  phone: string;
  goals: string[];
  challenges: string[];
  usp: string[];
  rawFields: Record<string, string>;
}

// Parses the raw text into key-value pairs
function extractFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentKey: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    // A line ending with ":" is a question label
    if (line.endsWith(':') && !line.includes('@') && line.length < 80) {
      // Save previous field
      if (currentKey) {
        fields[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = line.slice(0, -1).trim();
      currentValue = [];
    } else if (currentKey) {
      currentValue.push(line);
    }
  }

  // Save last field
  if (currentKey) {
    fields[currentKey] = currentValue.join('\n').trim();
  }

  return fields;
}

// Finds a field value by fuzzy key matching
function findField(fields: Record<string, string>, ...keywords: string[]): string {
  const keys = Object.keys(fields);
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    // Exact match first
    const exact = keys.find(k => k.toLowerCase() === kwLower);
    if (exact) return fields[exact];
    // Contains match
    const contains = keys.find(k => k.toLowerCase().includes(kwLower));
    if (contains) return fields[contains];
    // Partial word match
    const partial = keys.find(k => {
      const kLower = k.toLowerCase();
      return kwLower.split(' ').some(w => kLower.includes(w));
    });
    if (partial) return fields[partial];
  }
  return '';
}

// Normalize platform names from Google Form to system values
function normalizePlatform(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('tiktok')) return 'TikTok';
  if (lower.includes('twitter') || lower === 'x') return 'Twitter/X';
  if (lower.includes('youtube')) return 'YouTube Shorts';
  return null;
}

// Normalize tone from Google Form to system values
function normalizeTone(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('professional') || lower.includes('authoritative') || lower.includes('formal'))
    return 'Professional & Authoritative';
  if (lower.includes('casual') || lower.includes('friendly') || lower.includes('approachable'))
    return 'Casual & Friendly';
  if (lower.includes('bold') || lower.includes('disruptive') || lower.includes('edgy'))
    return 'Bold & Disruptive';
  if (lower.includes('educational') || lower.includes('informative'))
    return 'Educational & Informative';
  if (lower.includes('witty') || lower.includes('humorous') || lower.includes('funny'))
    return 'Witty & Humorous';
  if (lower.includes('inspirational') || lower.includes('motivational'))
    return 'Inspirational & Motivational';
  if (lower.includes('empathetic') || lower.includes('supportive') || lower.includes('playful') || lower.includes('warm'))
    return 'Empathetic & Supportive';
  return 'Professional & Authoritative';
}

// Normalize niche from Google Form to system values
function normalizeNiche(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('tech') || lower.includes('saas') || lower.includes('software')) return 'Technology';
  if (lower.includes('fit') || lower.includes('gym') || lower.includes('health') || lower.includes('wellness')) return 'Fitness';
  if (lower.includes('food') || lower.includes('beverage') || lower.includes('restaurant') || lower.includes('bakery')) return 'Food & Beverage';
  if (lower.includes('e-commerce') || lower.includes('ecommerce') || lower.includes('shop') || lower.includes('retail')) return 'E-commerce';
  if (lower.includes('real estate') || lower.includes('property')) return 'Real Estate';
  if (lower.includes('education') || lower.includes('school') || lower.includes('learning')) return 'Education';
  if (lower.includes('finance') || lower.includes('bank') || lower.includes('invest')) return 'Finance';
  if (lower.includes('beauty') || lower.includes('cosmetic') || lower.includes('skincare')) return 'Beauty';
  if (lower.includes('travel') || lower.includes('tourism') || lower.includes('hotel')) return 'Travel';
  if (lower.includes('fashion') || lower.includes('clothing') || lower.includes('apparel')) return 'Fashion';
  if (lower.includes('gaming') || lower.includes('game')) return 'Gaming';
  if (lower.includes('coach') || lower.includes('consult') || lower.includes('personal brand')) return 'Coaching';
  if (lower.includes('healthcare') || lower.includes('medical') || lower.includes('pharma')) return 'Healthcare';
  // Return as-is if no match
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// Normalize audience from Google Form
function normalizeAudience(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('18-25') || lower.includes('younger') || lower.includes('gen z') || lower.includes('gen-z'))
    return 'Young adults 18-25';
  if (lower.includes('25-40') || lower.includes('millennial'))
    return 'Professionals 25-40';
  if (lower.includes('parent') || lower.includes('30-45') || lower.includes('family'))
    return 'Parents 30-45';
  if (lower.includes('business') || lower.includes('entrepreneur') || lower.includes('owner'))
    return 'Business owners';
  if (lower.includes('student') || lower.includes('education') || lower.includes('learner'))
    return 'Students and educators';
  if (lower.includes('health') || lower.includes('fitness') || lower.includes('wellness'))
    return 'Health-conscious individuals';
  return raw;
}

// Normalize content types
function normalizeContentTypes(raw: string): string[] {
  const types: string[] = [];
  const lower = raw.toLowerCase();
  if (lower.includes('short-form') || lower.includes('reel') || lower.includes('video') || lower.includes('short video'))
    types.push('Reels');
  if (lower.includes('carousel') || lower.includes('swipe') || lower.includes('slideshow'))
    types.push('Carousels');
  if (lower.includes('story') || lower.includes('stories'))
    types.push('Stories');
  if (lower.includes('long-form') || lower.includes('long video'))
    types.push('Long-form Video');
  if (lower.includes('blog') || lower.includes('article') || lower.includes('written'))
    types.push('Blog Posts');
  if (lower.includes('live') || lower.includes('streaming'))
    types.push('Live Streams');
  if (types.length === 0 && raw.trim()) types.push(raw.trim());
  return types;
}

/**
 * Main parser function
 * Takes raw Google Form response text and returns structured ParsedClientData
 */
export function parseGoogleFormResponse(text: string): ParsedClientData {
  const fields = extractFields(text);

  // Extract raw values with fuzzy matching
  const rawName = findField(fields, 'name', 'client name', 'contact name');
  const rawBrand = findField(fields, 'brand name', 'brand', 'company name', 'business name');
  const rawEmail = findField(fields, 'email', 'email address');
  const rawPhone = findField(fields, 'contact number', 'phone', 'mobile', 'telephone');
  const rawNiche = findField(fields, 'industry focus', 'industry', 'niche', 'sector');
  const rawGoals = findField(fields, 'primary goals', 'goals', 'objective');
  const rawAudience = findField(fields, 'target audience', 'audience', 'who');
  const rawVoice = findField(fields, 'brand voice', 'voice', 'tone', 'brand tone');
  const rawPlatforms = findField(fields, 'platforms', 'social media', 'channels');
  const rawContentTypes = findField(fields, 'content types', 'content format', 'types of content');
  const rawGuidelines = findField(fields, 'brand guidelines', 'guidelines');
  const rawUSP = findField(fields, 'usp', 'unique selling', 'unique value');
  const rawChallenges = findField(fields, 'challenges', 'pain points', 'struggles');

  // Normalize platforms
  const platformLines = rawPlatforms.split('\n').map(l => l.trim()).filter(Boolean);
  const platforms = platformLines
    .map(normalizePlatform)
    .filter((p): p is string => p !== null);

  // Normalize content types
  const contentTypes = normalizeContentTypes(rawContentTypes);

  // Build keywords from goals + USP + challenges
  const goalsList = rawGoals.split('\n').map(l => l.trim()).filter(Boolean);
  const challengesList = rawChallenges.split('\n').map(l => l.trim()).filter(Boolean);
  const uspList = rawUSP.split('\n').map(l => l.trim()).filter(Boolean);
  const keywords = [...goalsList.slice(0, 3), ...uspList.slice(0, 2)].map(k =>
    k.length > 40 ? k.slice(0, 37) + '...' : k
  );

  // Build pastContent from guidelines + notes
  const notes = findField(fields, 'notes', 'additional', 'comments');
  const pastContentParts = [rawGuidelines, notes].filter(Boolean);
  const pastContent = pastContentParts.join('\n\n');

  return {
    name: rawBrand || rawName,
    niche: rawNiche ? normalizeNiche(rawNiche) : '',
    targetAudience: rawAudience ? normalizeAudience(rawAudience) : '',
    tone: rawVoice ? normalizeTone(rawVoice) : 'Professional & Authoritative',
    platforms,
    contentPillars: contentTypes,
    keywords,
    pastContent,
    email: rawEmail,
    phone: rawPhone,
    goals: goalsList,
    challenges: challengesList,
    usp: uspList,
    rawFields: fields,
  };
}

// Re-export for testing
export { extractFields, normalizePlatform, normalizeTone, normalizeNiche, normalizeAudience };
