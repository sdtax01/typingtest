-- Negative + positive isolation tests. Run after the migration. Any failure raises and aborts (ON_ERROR_STOP).
\set ON_ERROR_STOP on
begin;

create schema t;
grant usage on schema t to public;
create function t.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
  perform set_config('role', 'authenticated', true); end $$;
create function t.as_anon() returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('role', 'anon', true); end $$;
create function t.as_su() returns void language plpgsql as $$ begin perform set_config('role', 'postgres', true); end $$;
create function t.n(q text) returns bigint language plpgsql as $$ declare r bigint; begin execute q into r; return r; end $$;
create function t.eq(label text, actual bigint, expected bigint) returns void language plpgsql as $$ begin
  if actual is distinct from expected then raise exception 'FAIL [%]: expected %, got %', label, expected, actual; end if;
  raise notice 'ok   - %', label; end $$;
create function t.fails(label text, q text, code text default null) returns void language plpgsql as $$ begin
  begin
    execute q;
    raise exception 'EXPECTED_FAILURE_DID_NOT_HAPPEN';
  exception when others then
    if sqlerrm = 'EXPECTED_FAILURE_DID_NOT_HAPPEN' then raise exception 'FAIL [%]: statement succeeded but must be denied', label; end if;
    if code is not null and sqlstate <> code then raise exception 'FAIL [%]: wrong error % (%)', label, sqlstate, sqlerrm; end if;
  end;
  raise notice 'ok   - % (denied)', label; end $$;
create function t.res(u uuid, sub uuid, acc numeric default 90) returns text language sql as $$
  select format($f$insert into public.test_results (user_id, client_submission_id, passage_title, passage_version, reference_snapshot, entered_text, mode,
    started_at, completed_at, configured_duration_sec, elapsed_ms, finish_reason, normalization_policy, segmentation_policy, evaluation_policy, engine_version,
    accuracy, gross_speed, net_speed, correct_count, substitution_count, missing_count, extra_count, reference_total, entered_total, passed, lesson_id)
    values (%L, %L, 'p', 1, 'संदर्भ', 'सराव', 'practice', now() - interval '1 minute', now(), 60, 60000, 'manual', '{}', 'grapheme', '{}', '1.0.0',
    %s, 10, 8, 8, 1, 1, 0, 10, 10, true, (select id from public.typing_lessons limit 1))$f$, u, sub, acc) $$;

-- fixtures (as superuser)
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@x'), ('bbbbbbbb-0000-0000-0000-000000000002', 'b@x'), ('cccccccc-0000-0000-0000-000000000003', 'admin@x');
select t.eq('profile auto-created for each user', t.n('select count(*) from public.profiles'), 3);
update public.profiles set role = 'admin' where id = 'cccccccc-0000-0000-0000-000000000003';
insert into public.typing_passages (id, title, body, published) values
  ('11111111-1111-1111-1111-111111111111', 'सार्वजनिक', 'हा प्रकाशित उतारा आहे.', true),
  ('22222222-2222-2222-2222-222222222222', 'मसुदा', 'हा अप्रकाशित उतारा आहे.', false);
insert into public.typing_lessons (passage_id, title, published) values ('11111111-1111-1111-1111-111111111111', 'धडा', true);

-- anonymous
select t.as_anon();
select t.eq('anon sees only published passages', t.n('select count(*) from public.typing_passages'), 1);
select t.eq('anon sees published lessons', t.n('select count(*) from public.typing_lessons'), 1);
select t.fails('anon cannot read test_results', 'select * from public.test_results', '42501');
select t.fails('anon cannot read profiles', 'select * from public.profiles', '42501');
select t.fails('anon cannot insert results', t.res('aaaaaaaa-0000-0000-0000-000000000001', gen_random_uuid()), '42501');
select t.fails('anon cannot call admin stats', 'select * from public.admin_usage_stats()', '42501');
select t.as_su();

-- user A writes; dedupe
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.test_results (user_id, client_submission_id, passage_title, passage_version, reference_snapshot, entered_text, mode, started_at, completed_at, configured_duration_sec, elapsed_ms, finish_reason, normalization_policy, segmentation_policy, evaluation_policy, engine_version, accuracy, gross_speed, net_speed, correct_count, substitution_count, missing_count, extra_count, reference_total, entered_total, passed, lesson_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001','p',1,'संदर्भ','सराव','practice',now()-interval '1 minute',now(),60,60000,'manual','{}','grapheme','{}','1.0.0',90,10,8,8,1,1,0,10,10,true,(select id from public.typing_lessons limit 1);
select t.eq('A can insert own result', t.n('select count(*) from public.test_results'), 1);
select t.fails('duplicate client_submission_id is rejected (23505)', t.res('aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001'), '23505');
select t.fails('A cannot insert a row owned by B (RLS WITH CHECK)', t.res('bbbbbbbb-0000-0000-0000-000000000002', gen_random_uuid()), '42501');
select t.fails('accuracy > 100 violates CHECK', t.res('aaaaaaaa-0000-0000-0000-000000000001', gen_random_uuid(), 150), '23514');
update public.test_results set accuracy = 100;
select t.eq('results are immutable: UPDATE affects 0 rows', t.n($$select count(*) from public.test_results where accuracy = 100$$), 0);
select t.eq('progress row created by trigger', t.n('select count(*) from public.user_progress'), 1);
select t.fails('client cannot write user_progress', $$insert into public.user_progress (user_id, lesson_id, attempts) values ('aaaaaaaa-0000-0000-0000-000000000001', (select id from public.typing_lessons limit 1), 99)$$, '42501');
select t.fails('A cannot promote self to admin', $$update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501');
select t.eq('A cannot see draft passages', t.n($$select count(*) from public.typing_passages where published = false$$), 0);
select t.fails('A cannot insert passages', $$insert into public.typing_passages (title, body) values ('x', 'xxxxxxxxxxxxxxx')$$, '42501');
select t.eq('A cannot update passages (0 rows)', t.n($$with u as (update public.typing_passages set title = 'hacked' returning 1) select count(*) from u$$), 0);
select t.fails('A cannot call admin stats', 'select * from public.admin_usage_stats()', '42501');
update public.profiles set display_name = 'Alpha' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.eq('A can edit own display_name', t.n($$select count(*) from public.profiles where display_name = 'Alpha'$$), 1);
select t.as_su();

-- user B cannot see or touch A's data
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select t.eq('B sees 0 of A results', t.n('select count(*) from public.test_results'), 0);
select t.eq('B sees 0 of A progress', t.n('select count(*) from public.user_progress'), 0);
select t.eq('B sees only own profile', t.n('select count(*) from public.profiles'), 1);
select t.eq('B cannot delete A results (0 rows)', t.n('with d as (delete from public.test_results returning 1) select count(*) from d'), 0);
select t.fails('B cannot create a session for A', $$insert into public.test_sessions (user_id, mode, configured_duration_sec) values ('aaaaaaaa-0000-0000-0000-000000000001','practice',60)$$, '42501');
select t.as_su();

-- admin
select t.as_user('cccccccc-0000-0000-0000-000000000003');
select t.eq('admin sees draft + published passages', t.n('select count(*) from public.typing_passages'), 2);
insert into public.typing_passages (title, body, published) values ('नवीन', 'हा नवीन उतारा आहे.', false);
select t.eq('admin can insert passage', t.n('select count(*) from public.typing_passages'), 3);
update public.typing_passages set body = 'सुधारित उतारा मजकूर येथे.' where title = 'नवीन';
select t.eq('passage version bumps when body changes', t.n($$select version from public.typing_passages where title = 'नवीन'$$), 2);
update public.typing_passages set title = 'नवीन२' where title = 'नवीन';
select t.eq('version unchanged when only title changes', t.n($$select version from public.typing_passages where title = 'नवीन२'$$), 2);
select t.eq('admin stats works (counts all attempts)', t.n('select total_attempts from public.admin_usage_stats()'), 1);
select t.eq('admin CANNOT read other users typed text/results', t.n('select count(*) from public.test_results'), 0);
select t.eq('admin sees all profiles', t.n('select count(*) from public.profiles'), 3);
select t.as_su();

-- cascade on account deletion
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t.eq('deleting a user cascades to results', t.n('select count(*) from public.test_results'), 0);
select t.eq('deleting a user cascades to progress', t.n('select count(*) from public.user_progress'), 0);

select 'ALL RLS TESTS PASSED' as result;
rollback;
