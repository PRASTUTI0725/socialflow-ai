# SocialFlow AI — Assistant Instructions

## 1. Project Overview

SocialFlow AI is a **frontend-only** React app for social media agencies.  
It generates complete 30-day content strategies (hooks, captions, reels, hashtags, calendar) using real Gemini AI, with brand-aware prompting via a "Client Brain" profile system.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI | Google Gemini 1.5 Flash (via `fetch`, no SDK) |
| State | React Context API |
| Persistence | `localStorage` only — no backend |

---

## 3. How to Run Locally

```bash
# From the workspace root
pnpm install
pnpm --filter @workspace/social-workflow run dev
```

The app runs on the port set by the `PORT` env variable.

**Gemini API key**: enter it in the "Create Strategy" page. It is stored in `localStorage` under the key `gemini_api_key`. Get a free key at https://aistudio.google.com/app/apikey.

---

## 4. Project Structure (important files)

```
artifacts/social-workflow/src/
├── lib/
│   ├── ai-client.ts          # Gemini API calls, prompt building, JSON parsing
│   ├── brand-memory.ts       # BrandProfile type, CRUD, synthesizeBrandPersona()
│   └── content-generator.ts  # Template fallback generation (no API key)
├── context/
│   └── workflow-context.tsx  # Main orchestration: generation flow, history, state
└── pages/
    ├── dashboard.tsx         # Employee + Client view
    ├── create-strategy.tsx   # Strategy form + loading screen
    ├── brand-profile.tsx     # Client Brain CRUD + intelligence view
    ├── output-results.tsx    # Strategy output, repurposing, before/after
    └── profile-analyzer.tsx  # Bio scoring heuristics
```

---

## 5. AI Architecture

### Brand Persona Synthesis
`synthesizeBrandPersona(profile: BrandProfile): string` in `brand-memory.ts`  
Converts a stored brand profile into a coherent system persona string:
- Role statement (brand name + niche)
- Personality paragraph (derived from tone + writing style — prose, not a list)
- Vocabulary blacklist (from Don'ts field)
- Affirmative style guide (from Do's field)
- Past content calibration excerpt (max 600 chars)
- Audience framing ("The reader is X. Write as if you know them personally.")

### Prompt Structure
```
system_instruction:
  synthesizeBrandPersona()   ← brand persona (if profile active)
  + OUTPUT_FORMAT block      ← strict JSON schema
  + QUALITY_CONSTRAINTS      ← hook types, caption rules, banned words

contents[user]:
  Task input only            ← niche, platforms, goal, audience
  "Return only valid JSON. No explanation. No markdown."
```

### JSON Parsing (`parseAiJson()` in `ai-client.ts`)
1. Strip markdown fences (` ```json `)
2. Try `JSON.parse()`
3. On failure: extract with `/\{[\s\S]*\}/` regex
4. On failure: extract with `/\[[\s\S]*\]/` regex
5. On failure: throw `"Model returned malformed JSON. Try regenerating."`  
   **No silent fallback to templates.**

### Response Schema
```json
{
  "ideas": ["10 items"],
  "hooks": ["10 items"],
  "captions": ["5 items"],
  "reels": ["5 items"],
  "hashtags": { "Broad": ["3"], "Niche": ["5"], "Brand": ["2"] },
  "calendar": [{ "day": 1, "type": "Reel", "idea": "...", "format": "Educational" }]
}
```
Calendar must be exactly 30 items. Missing entries are padded from `ideas[]`.

---

## 6. Rules for AI Assistants

- **Do NOT change UI** unless explicitly asked
- **Do NOT add new pages or features** unless specified
- **Do NOT change layout, colors, or component structure** unless asked
- Focus improvements on: prompt quality, persona synthesis, JSON robustness
- The JSON response schema must remain exactly as defined — other code depends on it
- The fallback path (`content-generator.ts`) must remain working at all times
- Do not remove `synthesizeBrandPersona` — it is the core of the brand layer

---

## 7. Known Limitations

- No backend — all logic runs in the browser
- All data (profiles, strategies, API key) lives in `localStorage`; clearing it resets everything
- Gemini API key is required for real AI generation; without it, templates are used
- Dashboard analytics are static demo data — no real social media API connected
- No authentication — single-user only

---

## 8. Next Improvement Direction

- Strengthen `synthesizeBrandPersona()` with richer style inference
- Improve hook quality constraints (more pattern types, anti-patterns)
- Improve caption CTA variation (currently a single instruction)
- Add prompt versioning so output quality regressions are detectable
- Do **not** add new UI pages or backend infrastructure
