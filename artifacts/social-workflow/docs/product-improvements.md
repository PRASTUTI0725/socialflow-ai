## Product Improvements

### 1) Dashboard Data Scoping Fix

- Dashboard metrics are now scoped to `activeClient` in employee mode:
  - Strategies, drafts, approvals, scheduling, performance, bottlenecks, priorities, and follow-ups are all filtered to the active client.
- When no active client is selected:
  - Dashboard shows a clear prompt to select one.
  - Global data is isolated into a separate **Agency Overview** card (total monthly revenue only).
- Added explicit revenue rows:
  - **Monthly Revenue from Active Client**
  - **Total Monthly Revenue (All Clients)** (context line, optional aggregate).

### 2) Naming Changes (Non-Technical Friendly)

- Updated labels:
  - `Client Brain` -> `Client Insights`
  - `Results` -> `Strategy Output`
  - `New Strategy` -> `Create Strategy`
- Applied in sidebar navigation, route headers, and major user-facing text where these names appear.

### 3) Onboarding UX Improvement Approach

- Checklist rows now have explicit visible action text per item:
  - `Add Data` for incomplete items
  - `Edit` for completed items
- Clicking an item still routes directly to onboarding edit flow, but now the CTA is obvious and not hover-only.
- This keeps logic unchanged while making missing-data actions discoverable for non-technical users.

### 4) Plan + Revenue System Structure

- Extended client model with:
  - `selectedPlan: string`
  - `monthlyPrice: number`
  - `servicesIncluded: string[]`
- Added predefined plans in client types (exact plans provided).
- Client Create/Edit:
  - Added **Select Plan** dropdown.
  - Auto-fills price and services.
  - Price is editable and kept synced to `metadata.monthlyValue` for compatibility.
- Client Detail View:
  - Added **Plan & Revenue** card showing selected plan, monthly revenue, and included services.
- Validation + migration safety:
  - Added schema defaults for new fields.
  - Added migration defaults in client-store profile migration path.

### 5) Assumptions

- Existing workflow keeps both `monthlyPrice` and `metadata.monthlyValue`; `monthlyPrice` is treated as source for new business displays.
- No backend billing integration is required; values are local state/storage only.
- Onboarding edit action remains route-based (not inline input) to keep changes minimal and avoid broad form refactors.

