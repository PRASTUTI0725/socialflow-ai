# Unified Client Profile Data Architecture

## Overview
This document outlines the architecture for the `ClientProfile` object within the `Client` data model. The `ClientProfile` serves as the single source of truth for all client-related intelligence, onboarding state, and strategy triggers in the system, eliminating disconnected and redundant data flows.

## Core Principles
1. **Single Source of Truth**: All UI inputs (Create Client form, Onboarding) must write directly to `activeClient.clientProfile`.
2. **Data-Driven Workflows**: States such as `Onboarding checklist` completion are derived conditionally from the structure and presence of data in `clientProfile`, removing manual checkbox/toggle behaviors.
3. **No Redundant State**: Temporary states (like `onboardingChecklist`) previously bridging forms and dashboards are deprecated in favor of reading the structured data exactly as saved.

## Anatomy of ClientProfile
The `ClientProfile` is structured as a single comprehensive object containing all fields necessary to generate a strategy:

```ts
export interface ClientProfile {
  // Identity
  brandName: string;
  industry: string;
  usp: string;

  // Audience
  targetAudience: string;
  challenges: string;
  geography: string;
  brandVoice: string;

  // Strategy
  goals: string;
  contentPreferences: string[];
  platforms: string[];
  messaging: string;
}
```

## Workflows Mapped

### 1. Onboarding Checklist mapping
Legacy disconnected properties like `brandAssets`, `competitors`, etc., have been mapped directly to corresponding fields in `ClientProfile`. Validations mapping:
- **Brand Identity**: checks `usp` and `brandName`.
- **Target Audience**: checks `targetAudience`, `challenges`, `geography`, `brandVoice`.
- **Strategy Ready**: To trigger strategy generation, `goals`, `targetAudience`, and `brandVoice` must be hydrated.

### 2. Client Creation & Onboarding Path
- Previously, initial submission spawned an entity with loosely gathered metadata, and an independent onboarding entity handled additional variables.
- Now, when users fill out "Quick Input", "Import via Google Forms", or manual onboarding entries, the handlers uniformly invoke `editClientProfile` (or write straight to the unified store) targeting these exact fields.

### 3. Strategy Readiness function
```ts
export function isFieldComplete(profile: ClientProfile, key: keyof ClientProfile): boolean {
  // Array values check length
  // String values check trim().length
}
```
All system UI components now render the checklist via dynamic iterations across `ONBOARDING_ITEMS`, powered sequentially by `isFieldComplete` validations rather than persistent boolean toggles. This intrinsically enforces consistency between what data is saved and what the dashboard visualizes.
