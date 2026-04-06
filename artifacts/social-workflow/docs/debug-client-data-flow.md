## Client Data Flow Debug Report

### 1. Read Sources Audit

#### Dashboard
- **Before**: Aggregated data from `clients`, `drafts`, and `strategies`; no direct use of `clientProfile` for display.
- **Now**: Still reads only high-level metrics from `clients`, `drafts`, and `strategies`. No profile fields are rendered here, so `clientProfile` remains the indirect driver only via strategy generation and health scoring.

#### Onboarding (`onboarding-dashboard.tsx`)
- **Before**: Onboarding status conceptually tied to legacy `onboardingChecklist` and separate onboarding state.
- **Now**: 
  - Reads **only** from `activeClient.clientProfile`:
    - `profile = activeClient.clientProfile`
    - Completion percentage: derived from `ONBOARDING_ITEMS` and `isFieldComplete(profile, key)`.
    - Missing items: `getMissingItems(profile)`.
    - Warnings: `getOnboardingWarnings(profile)`.
    - Strategy readiness: `getStrategyReadiness(profile)`.
  - The checklist UI items all compute completion dynamically from `clientProfile` — no boolean checklist flags are read for UI.

#### Client Brain / Brand Profile (`brand-profile.tsx`)
- **Before**:
  - Display sections (identity, audience, strategy inputs, differentiation, challenges, notes) read from `activeClient.clientProfile` in some places and legacy brand structures in others.
  - Brain strength meter based on `activeClient.brandIntelligence`.
- **Now**:
  - All profile fields shown in the Client Brain UI read directly from `activeClient.clientProfile`:
    - Identity: `brandName`, `industry`, `geography`.
    - Audience: `targetAudience`.
    - Voice: `brandVoice`, `brandGuidelines`.
    - Strategy inputs: `platforms`, `contentPreferences`, `goals`.
    - Differentiation: `usp`, `messaging`.
    - Challenges: `challenges`.
    - Notes: `additionalNotes`.
  - The only non‑`clientProfile` read is the learning/strength visualization:
    - Brain strength bar uses `activeClient.brandIntelligence` (learned behavior over time, not editable profile data).
    - This is treated as analytics/telemetry, not a parallel profile system.

#### Client Detail View (`client-detail.tsx`)
- **Before**:
  - Overview section:
    - Niche: `client.niche`.
    - Target audience: `client.brandProfile.targetAudience`.
  - Brand voice section:
    - Tone: `client.brandProfile.tone`.
    - Writing style: `client.brandProfile.writingStyle`.
  - Platforms card:
    - Platforms: `client.metadata.platforms`.
  - Result: multiple UI reads bypassed `clientProfile`, causing mismatches with onboarding/profile edits.
- **Now**:
  - A local `profile` reference is taken from `client.clientProfile` and used as the primary source:
    - Niche: `profile.industry || client.niche`.
    - Target audience: `profile.targetAudience`.
    - Tone: `profile.brandVoice || client.brandProfile.tone` (profile wins; legacy tone is a fallback only when profile has not been filled yet).
    - Platforms card: `profile.platforms`.
  - All client-facing profile fields in this view now resolve through `client.clientProfile` first, with legacy fields used only as compatibility fallbacks when profile data is still empty.

### 2. Write Flow Audit

#### Create / Edit Client (`client-onboarding-form.tsx`)
- **Write target**:
  - Local form state is a full `Client` object; profile edits go through:
    - `updateClientProfileField<K extends keyof Client['clientProfile']>(key, value)` → `setForm(prev => ({ ...prev, clientProfile: { ...prev.clientProfile, [key]: value } }))`.
  - Core identity fields also keep `clientProfile` in sync:
    - When `name` changes:
      - `client.name` is updated.
      - `client.clientProfile.name` is updated.
      - `client.clientProfile.brandName` is backfilled if empty.
    - When `niche` changes:
      - `client.niche` is updated.
      - `client.clientProfile.industry` is kept in sync.
- **Submit path**:
  - `handleSave` builds a `Client` instance:
    - Resolves final name: `finalName = form.clientProfile.name || form.name`.
    - Resolves niche: `niche = form.clientProfile.industry || form.niche`.
    - Writes a `clientProfile` object that includes all edited fields (arrays and strings) plus `name` normalized to `finalName`.
  - **Create**:
    - `createClient(clientToSave)` (via context) → `saveClient(clientToSave)` (store).
  - **Update**:
    - `updateClient(clientToSave)` (via context) → `saveClient(clientToSave)` (store).
- **Persistence (`client-store.ts`)**:
  - **Before**:
    - `saveClient` always overwrote `client.clientProfile` with `deriveClientProfileFromClient(client)` from legacy `brandProfile`/`metadata`/`onboardingNotes`.
    - `loadClients` → `ensureOnboardingFields` always re‑derived `clientProfile` from the legacy fields, discarding direct writes from the onboarding form.
    - Result: only name/industry and a few mapped fields appeared stable; arrays like `platforms`, `goals`, `contentPreferences`, `challenges` could be lost or reset.
  - **Now**:
    - `ensureOnboardingFields`:
      - Ensures `client.clientProfile` exists.
      - Detects whether a “real” unified profile is present:
        - Checks for any of:
          - `brandName` non-empty.
          - `industry` non-empty.
          - `targetAudience` non-empty.
          - `goals.length > 0`.
          - `platforms.length > 0`.
      - **Only if all of these are empty** (legacy clients with no unified profile yet), it derives a profile from legacy data:
        - `typed.clientProfile = deriveClientProfileFromClient(typed);`
      - Otherwise, it **preserves** the stored `clientProfile` exactly as written.
    - `saveClient`:
      - Receives a `Client` whose `clientProfile` was built by the form.
      - Reuses that `clientProfile` whenever it contains any real data (same checks as above).
      - Only falls back to `deriveClientProfileFromClient(client)` if `clientProfile` is effectively empty (for pre-unification clients).
      - This makes `client.clientProfile` the **single write source of truth** for profile data.

#### Edit Profile Consistency
- **Load path**:
  - Editing uses `existingClient` passed into `ClientOnboardingForm`, which now contains the exact persisted `clientProfile` (no re-derivation on load when data exists).
  - All fields (including arrays) are initialized from `existingClient.clientProfile`.
- **Save path**:
  - On save, the same `clientProfile` object (with updated fields) is passed through `updateClient` to the store, and is written unchanged to localStorage (no legacy overwrite).
  - No default tones, platforms, or other legacy values can override stored values on edit, because the derive step is bypassed for non-empty profiles.

### 3. Removed / Deprioritized Parallel Systems

- **Legacy `clientProfile` derivation overrides**:
  - Behavior where `clientProfile` was always recomputed from:
    - `client.brandProfile`
    - `client.metadata.platforms`
    - `client.onboardingNotes`
  - has been **removed for clients that already have real `clientProfile` data**.
  - Derivation now runs only as a **one-time backfill** for older clients whose profile is still effectively empty.

- **Client Detail view legacy reads**:
  - UI reads for:
    - Niche (`client.niche` only).
    - Target audience (`client.brandProfile.targetAudience`).
    - Platforms (`client.metadata.platforms`).
  - have been replaced so that `client.clientProfile` is the primary source for these surfaces.

- **Onboarding checklist booleans**:
  - The visual onboarding state on `OnboardingDashboard` now ignores legacy boolean checklists.
  - Completion, missing items, and readiness are computed dynamically from `clientProfile` structure and presence.

### 4. Known Risks / Edge Cases

- **Legacy clients with no unified `clientProfile`**:
  - For clients created before the unified profile system, `clientProfile` may be empty on first load.
  - In these cases, the system still derives a profile snapshot from:
    - Brand profile keywords/themes/targetAudience/tone.
    - Metadata platforms.
    - Onboarding notes.
  - Once the user edits and saves via the Client Onboarding form, derived values will no longer overwrite user-entered data.

- **Fallback reads in Client Detail + Brain**:
  - Some analytics/learning surfaces still depend on additional structures:
    - `brandIntelligence` (for brain strength and learning counters).
    - `brandProfile` (for writing style and historical do’s/don’ts).
  - These do not feed **editable** profile fields but they are still separate analytic layers. If future requirements demand absolutely every piece of displayed brand information flow through `clientProfile`, these can be further mirrored into `clientProfile` and the UI adjusted accordingly.

- **Partially filled profiles**:
  - The “real profile” detection currently keys off a small set of critical fields (name/industry/targetAudience/goals/platforms).
  - If a migrated client has some derived data in those fields but the user has never edited them, the system will still treat that as a “real” profile and stop re-deriving from legacy brand data.
  - This is intentional to avoid unexpected overwrites, but it means a one-time migration may need to clean up or normalize these profiles if legacy data is low quality.

