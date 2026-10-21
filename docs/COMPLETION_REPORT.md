# Completion report

Date: 2026-10-21. Repository was empty at start (greenfield), so there was nothing to preserve or migrate.

## Implemented
* Evaluation engine (`src/engine`): NFC normalization, three segmentation units, deterministic Levenshtein alignment with traceback,
  correct/substituted/missing/extra classification, 3 accuracy formulas, gross/net speed (+ deduction policy, + guarded WPM),
  full vs typed-prefix scope, lesson pass/fail with every failure reason, size guard.
* Monotonic `TestTimer` (pause/resume, idempotent finish, expiry clamping).
* UI: dashboard, configuration, typing workspace (live metrics, progress, pause, restart, finish, paste block, exam leave-warning,
  minute-level screen-reader announcements), results (diff, policy, print, retry), history + trend chart, ISM V6 setup/diagnostic page,
  login, admin (passages, lessons, publish toggle, aggregate stats).
* Supabase: migration with 6 tables, constraints, indexes, trigger-maintained progress, passage versioning, RLS on every table, admin stats RPC; seed file.
* Local mode (no backend) and cloud mode behind one repository interface.
* Docs: README, architecture, ISM setup + manual QA checklist, known limitations, this report. Vercel/Netlify SPA config.

## Executed checks (all run in this session)
| Check | Result |
|---|---|
| `tsc -b --noEmit` (strict) | pass |
| Vitest: engine (79) + diagnostics (8) + workspace/results component tests (7) | **94 / 94 pass** |
| `vite build` | pass |
| Playwright (Chromium 1194, production build): config, passage rendering, Unicode round-trip, expiry, completion mode, paste block, anonymous practice + persistence, ISM diagnostic, admin redirect, no-overflow at 375/768/1280 | **14 / 14 pass** |
| PostgreSQL 16: migration applied, 34 RLS/constraint/trigger assertions (cross-user isolation, anon denial, immutability, role-escalation block, dedupe, admin cannot read others' text, cascade) | **all pass** |
| `seed.sql` | runs, creates 3 passages + 3 lessons |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` (incl. dev) | high/moderate findings in Tailwind 3's glob/postcss tooling (`braces`, `postcss-selector-parser`). Build-time only, not shipped. Fix requires a breaking move to Tailwind 4; deliberately not applied. |
| Visual QA | Screenshots of home, test, results, ISM page at 1280 and 390 px reviewed. Devanagari rendered correctly. |

## Failures found and fixed during the work
* Two of my own tests were wrong (sliced strings mid-akshara); the engine behaved correctly. Tests corrected.
* Visual QA showed absurd live speeds in the first second (2100/min). Live speed now shows "—" for the first 5 s.
* Removed an unused state variable and a dynamic-import warning.

## Not done / manual QA still required
* **Real ISM V6 on Windows** — run `docs/ISM_V6_SETUP.md` checklist. This is the main unverified item.
* Live Supabase project (GoTrue/PostgREST), sign-up/sign-in, admin UI against real data, signed-in Playwright tests.
* Confirm the target examination's counting unit and speed/penalty formula, then set the policy.
* Server-side re-evaluation for tamper-resistant exams.
* Real-browser check of Firefox/Safari (only Chromium was run).
* Screen-reader pass with an actual assistive technology (semantics and live regions are in place but untested with one).
