## Strategy System Debug

### 1) Strategy Generation Flow

1. User clicks `Generate Strategy` in `create-strategy.tsx`.
2. The page calls `generateStrategy(...)` from `useWorkflow`.
3. `WorkflowProvider.generateFullStrategy` sets generation state:
   - `generationPhase = 'generating'`
   - clears prior errors/failed sections
   - updates progress text through `generationStep`.
4. In prototype mode, generation is completed via `generateContent(input, activeProfile)`.
5. Generated result is written into:
   - `strategy` state in workflow context
   - strategy history (`history`)
   - active client strategies (`activeClient.strategies`) through `updateClient`.
6. `generationPhase` is moved to `complete`.
7. Results rendering happens in `output-results.tsx` from workflow context state (`strategy`, `sectionConfidence`, etc.).

### 2) Hooks Fix Explanation

#### Root cause
- `CreateStrategy` had a hook-order violation:
  - `if (isGenerating) return ...` happened **before** `useMemo(...)` for `profileMissing`.
  - During generation, React executed fewer hooks than in non-generating renders.
  - This caused the crash: **"Rendered fewer hooks than expected"**.

#### Fix applied
- Moved these hook-dependent values above the early return:
  - `mode`
  - `hasKey`
  - `profileMissing` (`useMemo`)
  - `profileComplete`
- Result: hook count/order is stable across all render paths (generating + non-generating).

### 3) Results Page Data Flow

#### Source of displayed strategy
- `OutputResults` reads from workflow context `strategy`.
- Active client comes from `useClients().activeClient`.

#### How it now reacts to client switch
- Added client-switch synchronization effect in `output-results.tsx`:
  - Tracks previous client id via `useRef`.
  - On active client change:
    - resets local UI states (`repurposed`, selected idea, edited day markers, pipeline-created flag).
    - if new active client has strategies, loads newest strategy with `viewStrategy(...)`.
    - if new active client has no strategy, redirects to `create` and shows a toast.
- This prevents stale strategy content from remaining visible after client switch.

### 4) Edge Cases

- **No strategy for selected client**
  - Results page will not keep old strategy.
  - User is redirected to Create Strategy with a clear message.

- **Rapid client switching**
  - Sync effect runs on each client-id change.
  - It deterministically picks latest strategy for that client (or redirects if none).
  - Local per-result UI state is reset on each switch to avoid cross-client artifacts.

- **Generation in progress**
  - Hook order remains valid because hooks are declared before generating-screen early return.
  - No crash from render-path switching while `isGenerating` toggles.

