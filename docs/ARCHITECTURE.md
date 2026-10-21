# Architecture

## Layers
```
src/engine/   Pure TypeScript. No React, no DOM. normalize → segment → align → evaluate → lesson
src/lib/      timer (monotonic), storage (localStorage), repo (local | Supabase), auth, diagnostics
src/pages/    Home, Configure, Test, Results, History, IsmSetup, Login, Admin (lazy)
src/components/  Layout, Metric, DiffView
supabase/     migrations (schema + RLS), seed.sql, tests (shim + RLS negative tests)
e2e/          Playwright
```

## Routes
| Route | Purpose |
|---|---|
| `/` | Dashboard: start practice/exam, lessons, recent results, ISM check indicator |
| `/configure` | Mode, passage, duration (1/3/5/10/15), accuracy/speed thresholds, options |
| `/test` | Workspace: reference, textarea, timer, live metrics, pause/restart/finish |
| `/results/:id` | Metrics, pass/fail reasons, diff, policy, print, retry |
| `/history` | Attempts table and trend chart |
| `/ism-setup` | ISM V6 steps, input diagnostic, troubleshooting checklist |
| `/login`, `/admin` | Only meaningful when Supabase is configured |

## Two run modes
* **Local mode** (no env vars): bundled passages/lessons, results in this browser's `localStorage`. No account.
* **Cloud mode** (`VITE_SUPABASE_*` set): passages/lessons from Postgres, signed-in results stored per user with RLS.
  Anonymous visitors in cloud mode still practise; their results stay in `localStorage` only.

## Evaluation pipeline (src/engine)
1. **normalize** — Unicode NFC on both strings (CRLF→LF by default). Spaces, matras, virama, punctuation are never stripped.
   Whitespace collapsing/trimming exist but are OFF by default and are explicit policy switches.
2. **segment** — `grapheme` (Intl.Segmenter, default), `akshara` (deterministic, engine independent), `codepoint`.
   Falls back to `akshara` if `Intl.Segmenter` is missing.
3. **align** — Levenshtein with full traceback, O(m·n) time, O(m·n) bytes of direction codes. Guarded by `maxAlignmentCells` (default 40 M).
   *Tie-break (deterministic):* match > substitution > missing > extra. In `typed-prefix` scope the longest equally-cheap reference prefix wins.
4. **evaluate** — counts, accuracy, gross/net speed.

### Formulas (defaults)
* Accuracy % = correct ÷ reference elements in scope × 100 (`reference`). Alternatives: `entered`, `edit-distance`.
* Gross = entered elements ÷ elapsed minutes. Net = correct elements ÷ elapsed minutes (`correct-per-minute`).
  Alternative `deduction`: max(0, entered − penalty × errors) ÷ minutes. Speeds are never mixed.
* Speed unit is elements/min. WPM exists only when an official `elementsPerWord` is supplied; it is rejected otherwise.
* Reference scope: `full` (untyped tail = missing; used with "complete the passage") or `typed-prefix` (timed tests: grades what was reached).

### Time
`TestTimer` derives elapsed time from clock differences (`performance.now`), never from counting ticks, so throttled background tabs
cannot drift. `finish()` is idempotent (first call wins), and the workspace has a second guard against duplicate submits.

## Security model
* Browser only holds the public anon key. No service-role key anywhere in the frontend.
* All authorization is RLS: users see only their rows; results are append-only for users; `user_progress` is trigger-maintained;
  `profiles.role` is not client-writable (column grant); admins write passages/lessons, and read only aggregates of results
  (`admin_usage_stats()`), never other users' typed text. The `/admin` redirect is a UX convenience, not authorization.
* Duplicate submissions: `UNIQUE (user_id, client_submission_id)` + `ignoreDuplicates` upsert.
* Passage text is rendered by React text nodes (no `dangerouslySetInnerHTML`).
