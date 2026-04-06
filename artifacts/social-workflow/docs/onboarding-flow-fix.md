## Onboarding Flow Fix

### Checklist to Profile Field Mapping

- Checklist item clicks now map to targeted edit sections in the existing client form:
  - `targetAudience` -> `targetAudience`
  - `goals` -> `goals`
  - `brandVoice` -> `brandVoice`
  - `brandAssets` / `logos` / `accessLinks` -> `brandGuidelines`
  - `competitors` -> `messaging`
  - fallback -> `name`

### Navigation to Edit Form

- Onboarding checklist actions no longer trigger passive behavior.
- Clicking `Add Data` or `Edit` now:
  1. sets `onboardingEditingSection` in workflow context
  2. navigates to `clients` view
  3. auto-opens the active client in the existing edit form

- "Continue Onboarding" guidance button now:
  1. computes first missing field from `activeClient.clientProfile`
  2. maps it to an edit section
  3. navigates to the client edit form directly

### Section Focus Handling

- `ClientOnboardingForm` accepts `targetSection`.
- On load/change of `targetSection`:
  - scrolls to the mapped section with smooth scrolling
  - focuses best available control:
    - name input
    - target audience input
    - goals input
    - brand voice select trigger
    - first platform button

### Edge Cases

- **No active client**: no forced edit open; onboarding keeps existing no-client behavior.
- **Fully completed profile**: fallback target is `name`; edit form still opens and is usable.
- **User cancels/back from form**: `onboardingEditingSection` is cleared to avoid stale redirects.

