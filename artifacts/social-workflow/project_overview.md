# SocialFlow AI — Project Overview

## 1. App Overview

SocialFlow AI is a frontend-only internal tool built for social media agencies. It generates comprehensive 30-day content strategies for clients — including content ideas, viral hooks, captions, short-form video scripts, hashtags, and a full execution guide — all powered by in-browser logic with no backend or API dependencies.

The tool is designed to feel like a real SaaS product: clean information hierarchy, Notion/Linear-style aesthetics, and role-based views for both agency employees and client-facing reports.

---

## 2. Features

### Core Workflow
- **Strategy Generator** — Form-based input (niche, audience, tone, platforms, goal) that produces a full 30-day content strategy
- **Content Ideas** — 10 niche-specific content concepts per strategy
- **Viral Hooks** — 10 scroll-stopping opening lines optimised per niche
- **High-Converting Captions** — 4–5 long-form caption templates per strategy
- **Short-Form Video Ideas** — 5 reel/TikTok concepts with production direction
- **Hashtag Bank** — Categorised (Broad / Niche / Action) hashtag sets
- **30-Day Content Calendar** — Day-by-day schedule with format, theme, and content type
- **Execution Guide** — Step-by-step workflow with AI tool prompts (ChatGPT, Perplexity, Claude, Canva, Buffer)

### Brand Memory System (Client Brain)
- Create and save unlimited brand profiles in localStorage
- Fields: Brand Name, Niche, Target Audience, Tone, Writing Style, Do's, Don'ts, Past High-Performing Content, Keywords/Themes
- Set an active profile — content generation is influenced by the active brand's voice and style
- Green dot indicator in sidebar when a profile is active

### Before vs After Comparison
- When a brand profile is active, captions are shown in two tabs: **Brand-Aware** (tuned output) vs **Generic AI** (baseline)
- Visual badge labels make the difference immediately clear

### Content Repurposing
- Select any content idea from the generated strategy
- One click generates three platform-specific versions:
  - **LinkedIn** — professional, data-backed, long-form with CTA
  - **Instagram** — emotional, visual, conversational with engagement prompts
  - **Twitter/X** — thread format, opinionated, direct with retweet hook

### Profile Analyzer
- Paste an Instagram bio to receive an AI-simulated score (0–100)
- Breakdown by: Clarity, Niche Focus, CTA, Emoji Usage, Keyword Density
- Actionable improvement suggestions per category

### Dashboard
- **Employee View**: Strategy history, weekly bar chart, content type mix chart, quick-create CTA
- **Client View**: Monthly report with follower growth, engagement rate, total reach, published content, before/after metrics comparison, weekly growth chart, campaign progress tracker

### UX & Accessibility
- **Dark / Light mode** — persisted via localStorage, toggleable in header
- **Employee / Client view mode** — toggle in header, affects Dashboard layout
- Framer Motion page transitions, hover elevate effects, spring animations
- Fully responsive layout (sidebar collapses on mobile)
- Copy-to-clipboard on all content blocks, individual prompt copying, PDF export via print dialog

---

## 3. UI Structure

```
App
├── ThemeProvider (dark/light)
│   └── WorkflowProvider (global state)
│       └── Layout (sidebar + header)
│           ├── Sidebar nav: Dashboard, Create Strategy, Profile Analyzer, Client Brain, Output Results
│           ├── Active brand profile indicator (sidebar)
│           └── Header: page title, Employee/Client toggle, dark mode toggle
│
├── Pages
│   ├── Dashboard (employee view + client view)
│   ├── Create Strategy (react-hook-form + zod validation)
│   ├── Profile Analyzer (bio analysis + score)
│   ├── Client Brain / Brand Profile (CRUD brand profiles)
│   └── Output Results
│       ├── Content Concepts
│       ├── Viral Hooks (brand-aware when profile active)
│       ├── Captions — Before vs After tabs (when brand profile active)
│       ├── Short-Form Video Ideas
│       ├── Hashtag Bank
│       ├── Repurpose Idea (LinkedIn / Instagram / Twitter)
│       ├── Execution Guide with copyable prompts
│       └── 30-Day Calendar table
```

---

## 4. User Workflow

```
1. (Optional) Create a Brand Profile in Client Brain
   └── Set it as active — sidebar shows green indicator

2. Go to Create Strategy
   └── Fill in niche, audience, tone, platforms, goal
   └── Click "Generate Strategy" (2-second simulated generation)

3. View Output Results
   ├── If brand profile active: hooks and captions are brand-tuned
   ├── Captions show "Brand-Aware" vs "Generic AI" tab comparison
   └── Copy individual captions, prompts, or full strategy to clipboard

4. Repurpose a Content Idea
   └── Select idea → generate LinkedIn / Instagram / Twitter variants

5. Export
   └── Copy Calendar, Copy Execution Guide, Copy Strategy, Export PDF
```

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix primitives) |
| Animations | Framer Motion |
| Forms | react-hook-form + Zod |
| Routing | Wouter (lightweight client router) |
| Icons | Lucide React |
| State | React Context API |
| Persistence | localStorage (no backend) |

---

## 6. State Management Approach

All state is managed via **React Context API** with a single `WorkflowProvider`:

- `view` — current active page (`dashboard | create | analyzer | brand-profile | output`)
- `viewMode` — `employee | client` (affects Dashboard rendering)
- `strategy` — current `StrategyOutput | null`
- `history` — array of past generated strategies (in-memory, session-only)
- `isGenerating` — loading state for the 2-second generation simulation
- `activeProfile` — currently selected `BrandProfile | null`
- `profiles` — all saved brand profiles (loaded from localStorage)

Brand profiles are independently managed in `localStorage` via `src/lib/brand-memory.ts`, which exposes pure utility functions (`loadProfiles`, `saveProfile`, `deleteProfile`, `setActiveProfileId`, etc.).

---

## 7. Simulated vs Real

| Feature | Status |
|---|---|
| Content generation | **Simulated** — deterministic templates per niche with conditional brand voice transforms |
| Brand voice application | **Simulated** — string replacement rules based on profile fields |
| Profile scoring | **Simulated** — heuristic scoring based on bio length/structure |
| Platform repurposing | **Simulated** — structured templates per platform |
| Data persistence | **Real** — localStorage (survives page refresh) |
| Authentication | **None** — hardcoded placeholder user (Jane Doe) |
| Analytics data | **Simulated** — static demo values in Client Dashboard |

---

## 8. Future Improvements

### Near-Term
- Integrate a real AI API (OpenAI, Claude, Gemini) for true generation
- Replace mock dashboard analytics with real social API data
- Add user authentication (Replit Auth or Clerk)
- Persist strategy history across sessions (localStorage or database)

### Medium-Term
- Multi-client workspace with project folders per client
- Scheduled content calendar export to Google Calendar / Notion
- PDF/CSV export of full strategy with branded styling
- Instagram bio paste → real API profile scraping

### Long-Term
- Backend service for team collaboration (multi-seat agency plan)
- Webhook integration with Buffer, Hootsuite, or Meta Business Suite
- Performance tracking: connect to Instagram/TikTok API insights
- A/B hook testing module: track which hooks get better engagement

---

*Last updated: March 2026*
