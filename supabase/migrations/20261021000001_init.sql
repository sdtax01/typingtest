-- Marathi Typing Test — schema, constraints, indexes, RLS.
-- Ownership model: every private row carries user_id = auth.uid(). Admin role lives in profiles.role
-- and can ONLY be granted by the service role / SQL editor, never by a client.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Trusted admin check. SECURITY DEFINER so policies on other tables can call it without
-- recursing into profiles' own RLS. search_path pinned to prevent hijacking.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 80))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- passages & lessons (public read of published rows, admin write) ----------
create table public.typing_passages (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 10 and 20000),
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  version integer not null default 1 check (version >= 1),
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index typing_passages_pub_idx on public.typing_passages (published, difficulty);

create or replace function public.bump_passage_version() returns trigger
language plpgsql as $$
begin
  if new.body is distinct from old.body then new.version = old.version + 1; end if;
  new.updated_at = now();
  return new;
end $$;
create trigger typing_passages_version before update on public.typing_passages for each row execute function public.bump_passage_version();

create table public.typing_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  passage_id uuid not null references public.typing_passages(id) on delete restrict,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  mode text not null default 'practice' check (mode in ('practice','exam')),
  duration_sec integer not null default 300 check (duration_sec between 30 and 3600),
  min_accuracy numeric(5,2) not null default 90 check (min_accuracy between 0 and 100),
  min_net_speed numeric(7,2) not null default 0 check (min_net_speed >= 0),
  require_completion boolean not null default false,
  segmentation text not null default 'grapheme' check (segmentation in ('grapheme','akshara','codepoint')),
  published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index typing_lessons_pub_idx on public.typing_lessons (published, sort_order);
create index typing_lessons_passage_idx on public.typing_lessons (passage_id);
create trigger typing_lessons_updated before update on public.typing_lessons for each row execute function public.set_updated_at();

-- ---------- test_sessions (server-recorded start; reserved for server-timed exams) ----------
create table public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id uuid references public.typing_passages(id) on delete set null,
  lesson_id uuid references public.typing_lessons(id) on delete set null,
  mode text not null check (mode in ('practice','exam')),
  configured_duration_sec integer not null check (configured_duration_sec between 30 and 3600),
  started_at timestamptz not null default now(),
  status text not null default 'started' check (status in ('started','completed','abandoned'))
);
create index test_sessions_user_idx on public.test_sessions (user_id, started_at desc);

-- ---------- test_results (immutable snapshot of each completed attempt) ----------
create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_submission_id uuid not null,
  session_id uuid references public.test_sessions(id) on delete set null,
  passage_id uuid references public.typing_passages(id) on delete set null,
  lesson_id uuid references public.typing_lessons(id) on delete set null,
  passage_title text not null check (char_length(passage_title) <= 120),
  passage_version integer not null check (passage_version >= 1),
  reference_snapshot text not null check (char_length(reference_snapshot) <= 20000),
  entered_text text check (entered_text is null or char_length(entered_text) <= 60000),
  mode text not null check (mode in ('practice','exam')),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  configured_duration_sec integer not null check (configured_duration_sec between 30 and 3600),
  elapsed_ms integer not null check (elapsed_ms >= 0 and elapsed_ms <= 3600000 + 5000),
  finish_reason text not null check (finish_reason in ('expired','manual','completed')),
  normalization_policy jsonb not null,
  segmentation_policy text not null check (segmentation_policy in ('grapheme','akshara','codepoint')),
  evaluation_policy jsonb not null,
  engine_version text not null,
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  gross_speed numeric(9,2) not null check (gross_speed >= 0),
  net_speed numeric(9,2) not null check (net_speed >= 0),
  correct_count integer not null check (correct_count >= 0),
  substitution_count integer not null check (substitution_count >= 0),
  missing_count integer not null check (missing_count >= 0),
  extra_count integer not null check (extra_count >= 0),
  reference_total integer not null check (reference_total >= 0),
  entered_total integer not null check (entered_total >= 0),
  criteria jsonb not null default '{}'::jsonb,
  passed boolean not null,
  failures jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  -- duplicate-submission protection: a retry/double click can never create a second row
  constraint test_results_dedupe unique (user_id, client_submission_id),
  constraint test_results_time_order check (completed_at >= started_at)
);
create index test_results_user_idx on public.test_results (user_id, completed_at desc);
create index test_results_lesson_idx on public.test_results (lesson_id) where lesson_id is not null;

-- ---------- user_progress (maintained ONLY by trigger; clients cannot write it) ----------
create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.typing_lessons(id) on delete cascade,
  attempts integer not null default 0,
  best_accuracy numeric(5,2) not null default 0,
  best_net_speed numeric(9,2) not null default 0,
  first_passed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create or replace function public.update_progress() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.lesson_id is null then return new; end if;
  insert into public.user_progress as up (user_id, lesson_id, attempts, best_accuracy, best_net_speed, first_passed_at)
  values (new.user_id, new.lesson_id, 1, new.accuracy, new.net_speed, case when new.passed then new.completed_at end)
  on conflict (user_id, lesson_id) do update set
    attempts = up.attempts + 1,
    best_accuracy = greatest(up.best_accuracy, excluded.best_accuracy),
    best_net_speed = greatest(up.best_net_speed, excluded.best_net_speed),
    first_passed_at = coalesce(up.first_passed_at, excluded.first_passed_at),
    updated_at = now();
  return new;
end $$;
create trigger test_results_progress after insert on public.test_results for each row execute function public.update_progress();

-- ---------- admin aggregates (no raw typed text exposed) ----------
create or replace function public.admin_usage_stats()
returns table (total_attempts bigint, unique_users bigint, avg_accuracy numeric, avg_net_speed numeric, pass_rate numeric)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select count(*)::bigint, count(distinct user_id)::bigint,
           coalesce(round(avg(accuracy), 2), 0), coalesce(round(avg(net_speed), 2), 0),
           coalesce(round(100.0 * avg((passed)::int), 2), 0)
    from public.test_results;
end $$;
revoke all on function public.admin_usage_stats() from public, anon;
grant execute on function public.admin_usage_stats() to authenticated;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.typing_passages enable row level security;
alter table public.typing_lessons enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_results enable row level security;
alter table public.user_progress enable row level security;

-- profiles: read/update own row; admins read all. Role is not client-writable (column grants below).
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

-- passages / lessons: anyone reads published; only admins read drafts and write.
create policy passages_read on public.typing_passages for select to anon, authenticated using (published or public.is_admin());
create policy passages_admin_ins on public.typing_passages for insert to authenticated with check (public.is_admin());
create policy passages_admin_upd on public.typing_passages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy passages_admin_del on public.typing_passages for delete to authenticated using (public.is_admin());

create policy lessons_read on public.typing_lessons for select to anon, authenticated using (published or public.is_admin());
create policy lessons_admin_ins on public.typing_lessons for insert to authenticated with check (public.is_admin());
create policy lessons_admin_upd on public.typing_lessons for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lessons_admin_del on public.typing_lessons for delete to authenticated using (public.is_admin());

-- sessions: strictly own rows.
create policy sessions_own_select on public.test_sessions for select to authenticated using (user_id = auth.uid());
create policy sessions_own_insert on public.test_sessions for insert to authenticated with check (user_id = auth.uid());
create policy sessions_own_update on public.test_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- results: own rows only; append-only for users (no UPDATE policy => results are immutable); user may delete own data.
-- Even admins cannot read other users' typed text; they use admin_usage_stats().
create policy results_own_select on public.test_results for select to authenticated using (user_id = auth.uid());
create policy results_own_insert on public.test_results for insert to authenticated with check (user_id = auth.uid());
create policy results_own_delete on public.test_results for delete to authenticated using (user_id = auth.uid());

-- progress: read own; no client writes at all (trigger only).
create policy progress_own_select on public.user_progress for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.user_progress from authenticated, anon;

-- Anonymous callers get no access to private tables.
revoke all on public.test_sessions, public.test_results, public.user_progress, public.profiles from anon;
