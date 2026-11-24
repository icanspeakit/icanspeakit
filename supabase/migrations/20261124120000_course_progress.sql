-- One row per learner and course: a snapshot of that course's learning state from the
-- browser (apps/<course>/src/lib/account/sync.js). One account for every course on
-- icanspeak.it; each course keeps its own progress.
create table if not exists public.course_progress (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course     text not null check (course in ('english', 'espanol', 'francais', 'portugues', 'italiano')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, course),
  constraint course_progress_data_size check (pg_column_size(data) < 2000000)
);

alter table public.course_progress enable row level security;

-- A learner sees and changes only their own rows. Nobody signed out gets anything.
drop policy if exists "own rows: select" on public.course_progress;
drop policy if exists "own rows: insert" on public.course_progress;
drop policy if exists "own rows: update" on public.course_progress;
drop policy if exists "own rows: delete" on public.course_progress;
create policy "own rows: select" on public.course_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows: insert" on public.course_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows: update" on public.course_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows: delete" on public.course_progress for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.course_progress from anon;
grant select, insert, update, delete on public.course_progress to authenticated;
