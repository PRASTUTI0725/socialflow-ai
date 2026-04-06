# UX fixes — pass 1

## What was fixed

### 1. Active client vs account status (client list)

- **Before:** Every non-archived client showed an “Active” account-status chip with a green icon, while the selected workflow client also showed an “Active” badge — two different meanings, looked like multiple active clients.
- **After:** Only the **workflow** active client gets the strong **border + ring** and the **“Active”** badge. Account status for `status === 'active'` is labeled **“Live”** with a neutral icon so it is not confused with “current strategy client.”

### 2. Delete client confirmation

- **Before:** Delete ran immediately from the header trash action.
- **After:** A **Dialog** blocks deletion until the user confirms. Title **“Delete Client?”**, body includes the client name and **cannot be undone**, **Cancel** / destructive **Delete**.

### 3. Industry / “Other (custom)”

- **Before:** Empty or custom industry mapped the select to **Other** in a way that hid the placeholder and made “no selection” unclear; custom flow was easy to misread.
- **After:** First option is **“Select industry”** (sentinel value, clears industry). **“Other (custom)”** shows an **input under the select**; typed value is stored as **niche** and **clientProfile.industry**. Empty custom while on Other counts as missing for existing completion rules. **`industryIsOther`** keeps the select on Other while the custom field is still empty (no bogus stored value).

### 4. Onboarding → client form (scroll + highlight + label)

- **Before:** Scroll-to-section sometimes ran before layout/refs were ready.
- **After:** **Delayed scroll + double `requestAnimationFrame`** retry, **~2.8s** ring/glow on the target section, and **“You’re editing: [section]”** at the top of the form. Section keys expanded for **industry, platforms, USP, geography, content preferences, challenges**, etc.

### 5. Unsaved changes

- **Before:** Cancel/close could discard edits silently; sidebar navigation could switch views without warning.
- **After:** **Dirty** detection (form snapshot + custom industry mode). **Cancel** and the **header X** prompt: *“You have unsaved changes. Leave without saving?”* **`beforeunload`** for tab close/refresh. **`setClientFormDirty`** + wrapped **`setView`** in workflow context prompts when navigating away while the form is dirty.

### 6. Strategy output — client context

- **Before:** Header leaned on niche + strategy settings only; client name and client profile fallbacks were easy to miss without the sidebar.
- **After:** **“Strategy for: [Client name]”** when an active client exists; subtitle uses **tone** and **audience** from client profile or strategy settings; platform chips use **strategy platforms**, or **client profile platforms** if the strategy list is empty.

### 7. Client Insights labels

- **Before:** Numbered titles (e.g. **“1. Brand Overview”**).
- **After:** Titles without numeric prefixes (**“Brand Overview”**, etc.).

### 8. Onboarding checklist buttons

- **Before/after:** Rows already used **“Add Data”** vs **“Edit”** from completion; mapping fixes ensure jumps land on the right form section for each checklist key.

### 9. Default industry

- **Before:** Implicit default could feel like “Other” or an unintended preset.
- **After:** New clients start with **no industry** until the user picks **Select industry**, a preset, or **Other (custom)** + text.

### 10. Client form remount

- **After:** Stable **`key`** on `ClientOnboardingForm` (`editingClient.id` or `new-client`) so create vs edit and client switches reset state predictably.

## Assumptions

- **`window.confirm`** is acceptable for unsaved and navigation guards (no new modal system).
- **Sentinel `INDUSTRY_NONE`** is only a Select value; it is not persisted on the client record.
- **`setClientFormDirty`** is only wired from the client onboarding form; other future forms would need to call it if they should block `setView`.

## Remaining UX risks

- **Dirty detection** uses `JSON.stringify` of the form object; unusual non-serializable churn is unlikely but could theoretically desync perception of “dirty.”
- **Double confirmation** is possible in edge flows (e.g. `setView` guard after cancel already cleared dirty — mitigated by clearing dirty before `onCancel` / `onComplete`).
- **Strategy header** still shows the niche-based **“{niche} Strategy”** title; if niche and brand diverge, users rely on **“Strategy for: [name]”** for identity.
- **Live** vs **Active** vocabulary may need training copy elsewhere (email/help) if “Live” is new for the team.
