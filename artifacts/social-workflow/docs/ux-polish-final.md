# UX Polish — Final Pass

## 1. + Add Client Bug (CRITICAL)
**Before:** “Add Client” could still land the user in an edit form for the current active client (because onboarding editing state could re-trigger `ClientsPage`’s effect).  
**After:** “Add Client” now always:
- clears `editingClient`
- clears `onboardingEditingSection`
- sets `isCreating=true`
- resets scroll to the top and attempts to focus the first input
`ClientsPage`’s onboarding edit effect is also guarded to not run while `isCreating` is true.

**Assumptions:** The sporadic “wrong form” behavior was caused by `onboardingEditingSection` + `activeClient` re-triggering the `useEffect` edit-mode logic.

## 2. Cancel Button Safety
**Before:** Cancel could discard edits silently (or with non-specific messaging).  
**After:** When the form is dirty, Cancel (and the header “X”) shows:
- “Discard changes? Your edits will be lost.”
and proceeds only if confirmed.

**Assumptions:** `isDirty` correctly reflects whether the form meaningfully changed (snapshot-based).

## 3. Required Field Indicators
**Before:** Users couldn’t tell which fields were required to generate a strategy.  
**After:**
- Added `*` to required fields: `brandName` (Client Name), `industry`, `targetAudience`, `brandVoice`, `goals`, `platforms`
- Added a small top note: `* Required fields to generate strategy`

**Assumptions:** “Client Name *” maps to required `brandName` via the existing `updateField('name', ...)` logic.

## 4. Strategy Output Navigation Confusion
**Before:** Clicking “Strategy Output” while the selected client had no strategy could silently redirect to the Create page via `OutputResults` logic.  
**After:** No silent redirect:
- If the selected client has no strategy, `OutputResults` shows an empty state:
  - Title: “No strategy yet”
  - Button: “Generate Strategy”
- If a strategy exists, output renders directly.

**Assumptions:** Redirect was coming from `output-results.tsx`’s “move user away from stale output” logic.

## 5. Header State Consistency
**Before:** The system guidance messaging/CTA varied based on multiple heuristics (stuck drafts, pipeline states, strategy approval status), making it feel unpredictable.  
**After:** The guidance banner is now strictly condition-based for the key states:
- Incomplete onboarding: “Complete onboarding for [Client]” + CTA “Complete Profile”
- Onboarding complete but no strategy: “Ready to generate strategy for [Client]” + CTA “Generate Strategy”
- Strategy exists: “Viewing strategy for [Client]” + CTA “View / Regenerate”

**Assumptions:** The UX issue referred to the top system guidance banner (not the page title).

## 6. Active Client Toggle UX
**Before:** UI showed “Set Active” vs “Clear Active”, which was easy to misunderstand.  
**After:** The toggle is now always “Set Active”. If the client is already active, the button is disabled (non-clickable).

## 7. Client Name Overflow
**Before:** Some client names could overflow without a tooltip for the full value.  
**After:** Added ellipsis + `title` tooltips for full names in:
- `ClientSelector`
- `ClientDetail` header
- `ClientPortal` header

## 8. Fix Blank State After Delete
**Before:** After deleting the active client, views could show stale strategy UI or appear blank depending on routing/state.  
**After:** `OutputResults` now explicitly treats “no active client” or “no strategy for this client” as the empty state, so the user never sees stale content.

**Assumptions:** Most “blank/stale after delete” reports came from `OutputResults` rendering a previous client’s strategy while the active client was cleared.

## 9. Employee / Client Toggle
**Before:** The Employee/Client toggle existed but was considered non-actionable / confusing.  
**After:** The toggle UI is hidden completely (no half-baked control).

**Assumptions:** Default `viewMode` behavior (employee) is acceptable for the final UX polish.

## 10. “Fix Now” / “Continue Onboarding” Consistency
**Before:** Labels varied between “Fix Now” and “Continue Onboarding”.  
**After:** Standardized to “Complete Profile” across:
- `create-strategy.tsx` (incomplete profile CTA)
- `layout.tsx` (system guidance CTA)
- `flow-health.ts` (overdue draft action label)

## Remaining minor UX risks
- Snapshot-based dirty detection (`JSON.stringify`) could, in edge cases, mark the form dirty due to unrelated object churn.
- Output empty state assumes “selected client has no strategy” is the intended interpretation; if strategy is stored differently, it may still show empty until the client strategy sync runs.

