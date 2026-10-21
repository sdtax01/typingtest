# मराठी टायपिंग टेस्ट — Marathi Typing Test

React + TypeScript + Vite + Tailwind, optional Supabase. Evaluates Unicode Devanagari typed through **ISM V6** (Typewriter layout) or any Unicode input.

```bash
npm install
npm run dev          # http://localhost:5173 — local mode, no setup needed
npm run typecheck && npm test && npm run build
npm run test:e2e     # builds, serves, runs Playwright in Chromium
```

## Enable cloud mode (accounts, saved results, admin)
1. Create a Supabase project.
2. SQL editor: run `supabase/migrations/20261021000001_init.sql`, then optionally `supabase/seed.sql`.
3. Copy `.env.example` → `.env.local`, fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon key only!).
4. Make yourself admin (SQL editor only — clients cannot):
   `update public.profiles set role='admin' where id=(select id from auth.users where email='you@example.com');`
5. Auth → URL configuration: add your deployed site URL.

## Deploy
Static hosting. Vercel (`vercel.json`) or Netlify/Cloudflare Pages (`public/_redirects`) provide SPA fallback.
Build command `npm run build`, output `dist`. Set the two `VITE_SUPABASE_*` variables in the host's dashboard. Never add a service-role key.

## Docs
* `docs/ARCHITECTURE.md` — design, formulas, tie-breaking, security model
* `docs/ISM_V6_SETUP.md` — setup, troubleshooting, manual Windows QA checklist
* `docs/KNOWN_LIMITATIONS.md` — what is not verified or not done
* `docs/COMPLETION_REPORT.md` — what was built and exactly what was run

## Database tests (needs a local Postgres 14+)
```bash
createdb mtt
psql -d mtt -f supabase/tests/00_supabase_shim.sql   # test-only stand-in for Supabase auth/roles
psql -d mtt -f supabase/migrations/20261021000001_init.sql
psql -d mtt -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
```
