## Validation Unification

### Final Required Fields

The app now uses one required-field set for readiness checks:

- `brandName`
- `industry`
- `targetAudience`
- `brandVoice`
- `goals`
- `platforms`

### Single Validation Logic Used Across App

- Source of truth function: `getClientProfileMissingFields(clientProfile)` in `src/modules/clients/lib/client-types.ts`
- Label helper: `getClientProfileFieldLabel()` and `getClientProfileMissingFieldLabels()`

Unified usage:

- Onboarding completion percentage (`OnboardingDashboard`)
- Strategy readiness (`CreateStrategy`)
- Onboarding warnings + readiness gate (`lib/onboarding.ts` -> `canTriggerStrategy`, `getOnboardingWarnings`, `getStrategyReadiness`)
- Guidance routing for “Continue Onboarding” (`layout.tsx` first-missing-field flow)

### Edge Case Handling

- **Industry = "Other" / "Other (custom)"**:
  - treated as missing by `getClientProfileMissingFields`
  - this ensures onboarding and strategy pages both mark it incomplete until a real custom industry value is entered
- **No active client**:
  - readiness checks do not run against null client; existing no-client UI remains
- **Fully completed profile**:
  - missing list is empty everywhere, onboarding and strategy now both show completed state

