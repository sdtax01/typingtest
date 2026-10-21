# Known limitations and open questions

1. **ISM V6 is unverified.** No ISM installation was available. Automated tests prove the app preserves and scores Unicode text; they do not
   prove any particular ISM version/config works in any browser. Run the manual checklist on the target PC. Whether Scroll Lock is required
   depends on your ISM setup; the site cannot detect it.
2. **Official exam rules unknown.** Default counting is grapheme clusters, speed is *elements per minute*. No official WPM conversion or
   deduction rule for a specific Marathi exam (e.g. GCC-TBC) was supplied, so none is claimed. Policies are configurable
   (unit, accuracy formula, net-speed formula, elements-per-word) — confirm the exact rule and set it.
3. **Grapheme segmentation depends on the browser's ICU/Unicode version.** Older engines split conjuncts differently from newer ones.
   The chosen unit is stored with each result; use `akshara` for engine-independent counting.
4. **Half-typed aksharas count as a mismatch** in the live view (e.g. the consonant typed before its matra). Final results grade the finished text.
5. **Browser-side scoring is not tamper-proof.** Exam results are computed in the browser and could be forged by a technical user.
   For high-stakes exams, re-evaluate on a trusted backend (the engine is dependency-free and can be run in an Edge Function) and use
   `test_sessions` for server-recorded start times. The table exists and is RLS-protected but the UI does not yet write to it.
   Browser proctoring cannot prevent a second device or a different input source.
6. **Cloud mode, auth flows and admin UI were not exercised against a live Supabase project.** The schema and every RLS rule *were* run
   on real PostgreSQL 16 (34 assertions), with a shim for Supabase's `auth` schema; PostgREST/GoTrue behaviour itself was not tested.
   Playwright auth/authorization tests for signed-in users are therefore not included.
7. **Entered text is stored** with each cloud result (needed for the comparison view). A privacy notice/retention policy is the owner's decision;
   users can delete their own rows. Local results live in `localStorage` (cleared by "clear site data").
8. **Fonts:** Noto Sans Devanagari loads from Google Fonts; with no internet the app falls back to Mangal / Nirmala UI (present on Windows).
9. **Mobile:** result viewing and practice work, but the Windows ISM workflow is desktop-only.
10. Dependency audit: run `npm audit` in CI; see the completion report for the result at build time.
11. No virtual on-screen keyboard (deliberate: a second layout could conflict with ISM's Typewriter layout).
