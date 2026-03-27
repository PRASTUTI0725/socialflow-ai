# SocialFlow AI — Project Overview

## 1. App Overview

SocialFlow AI is a frontend-only SaaS internal tool built for social media agencies. It generates complete 30-day content strategies — including content ideas, viral hooks, captions, short-form video scripts, hashtags, and a full execution guide — powered by real Google Gemini AI with smart template fallback.

The tool is designed to feel like a production-grade SaaS product: clean information hierarchy (Notion/Linear style), role-based views for agency employees and client-facing reports, a full Brand Intelligence Layer, strategy persistence, and real AI integration.

---

## 2. Features

### Core Features
- **Strategy Generator** — Form-based input (niche, audience, tone, platforms, goal) that produces a full 30-day content strategy
- **Content Ideas** — 10 niche-specific content concepts per strategy
- **Viral Hooks** — 10 scroll-stopping opening lines optimised per niche and brand
- **High-Converting Captions** — 4–5 long-form caption templates per strategy
- **Short-Form Video Ideas** — 5 reel/TikTok concepts with production direction
- **Hashtag Bank** — Categorised (Broad / Niche / Action) hashtag sets
- **30-Day Content Calendar** — Day-by-day schedule with format, theme, and content type
- **Execution Guide** — Step-by-step workflow with AI tool prompts (ChatGPT, Perplexity, Claude, Canva, Buffer)
- **Content Repurposing** — One idea → LinkedIn (professional long-form), Instagram (emotional CTA), Twitter (thread format)
- **Before vs After Comparison** — Generic AI output vs Brand-Aware output in tabbed view

### AI Features (Gemini Integration)
- **Real AI Generation** — Google Gemini 1.5 Flash produces all strategy content when API key is provided
- **Brand-Aware Prompting** — Brand profile data is injected into the system prompt for tone/audience/style alignment
- **Smart Template Fallback** — If no API key or Gemini fails, high-quality niche templates are used automatically
- **Multi-Step Loading UI** — Visual progress with labelled steps: Analyzing brand voice → Understanding audience psychology → Generating strategy → Finalizing calendar
- **Error Handling** — Clear messages for invalid keys, rate limits, network errors; automatic fallback to templates

### Brand Intelligence Features
- **Client Brain Page** — Full CRUD for brand profiles stored in localStorage
- **Brand Score** (0–100) — Logic-based scoring: identity, audience clarity, voice definition, content guidelines, keyword depth, content examples
- **Voice Summary** — Auto-derived from profile: Tone Style, Sentence Pattern, Emotional Style, CTA Behaviour
- **Content Breakdown** — Analyses past content for Hook Type, Tone Pattern, Structure, Sentence Rhythm
- **Brand-Aware Output** — Active profile's tone, keywords, audience injected into generation; separate brand-tuned captions/hooks in output
- **Active Profile Indicator** — Green dot in sidebar, banner on Create Strategy page

### Dashboard Features
- **Employee View**: Strategy history (persisted), weekly bar chart, content type mix, quick-create CTA
- **Client View**: Monthly report with follower growth, engagement rate, reach, published count, Before vs After metrics, weekly chart, campaign progress
- **Demo Data Labels** — All Client Dashboard numbers clearly marked "Demo data — replace with real metrics"
- **Empty State** — Honest message when no real performance data is connected

---

## 3. AI Integration Details

### Gemini Usage
- **Model**: `gemini-1.5-flash` (fast, free tier available)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **API Key**: Stored in `localStorage` under key `gemini_api_key`; entered in Create Strategy page; never sent to any server other than Google
- **Response format**: `application/json` via `responseMimeType` config — no markdown stripping required, but implemented as safety fallback

### Prompt Structure
```
SYSTEM CONTEXT (Brand Profile if active):
  - Brand Name, Niche, Target Audience, Tone, Writing Style
  - Do's / Don'ts, Keywords, Past High-Performing Content

USER INPUT:
  - Industry/Niche, Target Audience, Tone
  - Primary Goal, Platforms, Content Focus, Extra Context

OUTPUT (strict JSON):
  {
    ideas: string[10],
    hooks: string[10],
    captions: string[5],
    reels: string[5],
    hashtags: { Broad: [], Niche: [], Action: [] },
    calendar: [{ day, type, idea, format }] × 30
  }
```

### Data Flow
```
User fills form
  ↓
CreateStrategy.onSubmit()
  ↓
WorkflowProvider.generateStrategy()
  ↓ (if API key present)
  → ai-client.generateWithAI()  ← Gemini API call
    ↓ success
    Merge AI result with local base (calendar padding, fallback fields)
    ↓ error
    Toast error + automatic fallback to template generation
  ↓ (if no API key)
  → content-generator.generateContent() with brand transforms
  ↓
Strategy stored in localStorage + React state
  ↓
Navigate to OutputResults page
```

---

## 4. UI Structure

```
App
├── ThemeProvider (dark/light, localStorage)
│   └── WorkflowProvider (global state, localStorage persistence)
│       └── Layout (sidebar + header)
│           ├── Sidebar: Dashboard, Create Strategy, Profile Analyzer,
│           │            Client Brain, Output Results
│           ├── Active brand profile indicator (green dot + card)
│           └── Header: page title, Employee/Client toggle, dark/light toggle
│
├── Pages
│   ├── Dashboard
│   │   ├── Employee View: stats, bar chart, content mix, strategy history
│   │   └── Client View: metrics (demo-labelled), before/after, weekly chart, campaign
│   ├── Create Strategy
│   │   ├── AI Config section (Gemini API key input, status indicator)
│   │   ├── Active brand profile banner
│   │   ├── Strategy form (niche, audience, platforms, tone, goal, context)
│   │   └── Multi-step generating screen
│   ├── Profile Analyzer (bio scoring, heuristic analysis)
│   ├── Client Brain / Brand Profile
│   │   ├── Profile list (cards with brand score bar)
│   │   ├── Intelligence View (score breakdown, voice summary, content breakdown)
│   │   └── Profile editor (identity, voice, guidelines, past content, keywords)
│   └── Output Results
│       ├── Content Concepts (ideas list)
│       ├── Viral Hooks (brand-tuned when profile active)
│       ├── Captions — Before vs After tabs (brand-aware vs generic)
│       ├── Short-Form Video Ideas
│       ├── Hashtag Bank
│       ├── Repurpose Idea (LinkedIn / Instagram / Twitter)
│       ├── Execution Guide with copyable AI prompts
│       └── 30-Day Calendar table
```

---

## 5. User Workflow

```
Step 1 (Optional): Create a Brand Profile in Client Brain
  └── Fill: brand name, niche, audience, tone, style, guidelines, keywords, past content
  └── Set it as "Active" — sidebar shows green dot

Step 2 (Optional): Add Gemini API key in Create Strategy
  └── Key saved to browser localStorage only
  └── Status badge shows "AI connected" or "using templates"

Step 3: Go to Create Strategy
  └── Active brand profile pre-fills tone/audience fields
  └── Select niche, platforms, goal, content focus
  └── Click "Generate 30-Day Strategy"

Step 4: Multi-step generation (2–10 seconds)
  ├── If API key: Gemini 1.5 Flash generates unique content
  └── If no key: Smart niche templates with brand voice transforms

Step 5: View Output Results
  ├── Brand profile active → hooks and captions are brand-tuned
  ├── Captions tab: "Brand-Aware" vs "Generic AI" comparison
  ├── Repurpose any idea → LinkedIn / Instagram / Twitter
  └── Copy individual items, full strategy, calendar, or execution prompts

Step 6: Export
  └── Copy Calendar, Copy Execution Guide, Copy Strategy, Export PDF
```

---

## 6. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix primitives) |
| Animations | Framer Motion |
| Forms | react-hook-form + Zod |
| Routing | Wouter (lightweight client router) |
| Icons | Lucide React |
| State | React Context API |
| AI | Google Gemini 1.5 Flash (via fetch, no SDK dependency) |
| Persistence | localStorage (strategies, brand profiles, API key, theme) |

---

## 7. State Management

All state is managed via **React Context API** with a single `WorkflowProvider`:

| State | Type | Persistence |
|---|---|---|
| `view` | `'dashboard' \| 'create' \| 'analyzer' \| 'brand-profile' \| 'output'` | Session only |
| `viewMode` | `'employee' \| 'client'` | Session only |
| `strategy` | `StrategyOutput \| null` | Session (loaded from localStorage) |
| `history` | `StrategyOutput[]` | **localStorage** (last 20) |
| `isGenerating` | `boolean` | Session only |
| `generationStep` | `string` | Session only |
| `activeProfile` | `BrandProfile \| null` | **localStorage** (via `setActiveProfileId`) |
| `profiles` | `BrandProfile[]` | **localStorage** (all profiles) |

Brand profiles live in `localStorage` key `socialflow_brand_profiles`.
Strategies live in `localStorage` key `socialflow_strategies` (max 20).
Active profile ID lives in `localStorage` key `socialflow_active_profile`.
Gemini API key lives in `localStorage` key `gemini_api_key`.

---

## 8. Real vs Simulated

| Feature | Status | Notes |
|---|---|---|
| Content generation (with API key) | **Real** | Gemini 1.5 Flash, unique every call |
| Content generation (no API key) | **Simulated** | Deterministic niche templates |
| Brand voice application | **Real logic** | String transforms from profile fields |
| Brand Score | **Simulated (logic-based)** | Completeness heuristics, not ML |
| Voice Summary | **Simulated (rule-based)** | Derived from profile tone/style |
| Content Breakdown | **Simulated (heuristic)** | Regex/word-count pattern analysis |
| Profile Analyzer scoring | **Simulated** | Heuristic bio analysis |
| Strategy persistence | **Real** | localStorage, survives page refresh |
| Client Dashboard analytics | **Simulated** | Static demo values, clearly labelled |
| Authentication | **None** | Hardcoded placeholder user |
| Multi-user / team workspace | **Not implemented** | Future feature |

---

## 9. Architecture Explanation

### Brand Intelligence Layer (`src/lib/brand-memory.ts`)
- Stores and retrieves `BrandProfile` objects from localStorage
- Exports transform functions: `applyBrandVoice`, `applyBrandHook`, `repurposeIdea`
- Intelligence functions (in `brand-profile.tsx`): `computeBrandScore`, `deriveVoiceSummary`, `analyzeContent`
- Acts as the data model and logic engine for all brand-related features

### AI Layer (`src/lib/ai-client.ts`)
- Builds structured prompt from `StrategyInput` + `BrandProfile`
- Calls Gemini 1.5 Flash API via `fetch` (no SDK dependency = zero bundle bloat)
- Validates and sanitises the JSON response; pads calendar to 30 days if needed
- Exports: `getStoredApiKey`, `storeApiKey`, `clearApiKey`, `generateWithAI`

### UI Layer (`src/pages/`, `src/components/`)
- All pages are pure React components, no server-side dependencies
- `WorkflowProvider` (`src/context/workflow-context.tsx`) is the orchestration layer:
  - Calls AI layer → merges result with template base → stores to localStorage
  - Exposes `generationStep` for the animated loading UI
  - Falls back to templates on any AI error, with descriptive toast messages
- Layout (`src/components/layout.tsx`) handles routing, active profile display, theme toggle

---

## 10. Future Improvements

### Near-Term
- Replace mock dashboard analytics with real social API data (Instagram Graph API, LinkedIn Analytics)
- Add user authentication (Replit Auth or Clerk) for multi-user workspaces
- Export strategies as branded PDF using a headless PDF library

### Medium-Term
- Multi-client workspace with project folders per client
- Scheduled content calendar export to Google Calendar / Notion
- Real-time brand score updates as profile is edited (live preview)
- Strategy comparison: run two strategies and diff the outputs

### Long-Term
- Backend service for team collaboration (multi-seat agency plan)
- Webhook integration with Buffer, Hootsuite, or Meta Business Suite
- Performance tracking: connect to Instagram/TikTok API insights
- Fine-tuned AI model trained on high-performing social content

---

*Last updated: March 2026*
