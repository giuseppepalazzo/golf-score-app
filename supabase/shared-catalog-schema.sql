create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text,
  hcp numeric,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'first_name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'player_name'
  ) then
    alter table public.profiles rename column first_name to player_name;
  end if;
end
$$;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text not null,
  holes_count integer not null,
  total_par integer not null,
  holes_json jsonb not null,
  structure_hash text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  saved_name text,
  competition_name text,
  formatted_date text,
  gross_total integer,
  net_total integer,
  stableford_total integer,
  estimated_hcp_after_round numeric,
  scores jsonb,
  manual_received_shots jsonb,
  total_competition_holes integer,
  start_hole integer,
  player_hcp numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.course_reports (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  reported_by uuid not null references auth.users(id) on delete cascade,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.favorite_courses (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create index if not exists rounds_user_id_idx on public.rounds(user_id);
create index if not exists course_reports_course_id_idx on public.course_reports(course_id);
create index if not exists course_reports_reported_by_idx on public.course_reports(reported_by);
create index if not exists courses_name_normalized_idx on public.courses(name_normalized);
create index if not exists courses_structure_hash_idx on public.courses(structure_hash);

alter table public.courses
  add constraint courses_name_normalized_unique unique (name_normalized);

alter table public.courses
  add constraint courses_structure_hash_unique unique (structure_hash);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.rounds enable row level security;
alter table public.course_reports enable row level security;
alter table public.favorite_courses enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles
for delete
using (public.is_admin());

drop policy if exists "courses_select_authenticated" on public.courses;
create policy "courses_select_authenticated"
on public.courses
for select
using (auth.role() = 'authenticated');

drop policy if exists "courses_insert_authenticated" on public.courses;
create policy "courses_insert_authenticated"
on public.courses
for insert
with check (
  auth.role() = 'authenticated'
  and created_by = auth.uid()
);

drop policy if exists "courses_update_admin" on public.courses;
create policy "courses_update_admin"
on public.courses
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "courses_delete_admin" on public.courses;
create policy "courses_delete_admin"
on public.courses
for delete
using (public.is_admin());

drop policy if exists "rounds_select_own" on public.rounds;
create policy "rounds_select_own"
on public.rounds
for select
using (auth.uid() = user_id);

drop policy if exists "rounds_insert_own" on public.rounds;
create policy "rounds_insert_own"
on public.rounds
for insert
with check (auth.uid() = user_id);

drop policy if exists "rounds_update_own" on public.rounds;
create policy "rounds_update_own"
on public.rounds
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "rounds_delete_own" on public.rounds;
create policy "rounds_delete_own"
on public.rounds
for delete
using (auth.uid() = user_id);

drop policy if exists "course_reports_insert_authenticated" on public.course_reports;
create policy "course_reports_insert_authenticated"
on public.course_reports
for insert
with check (
  auth.role() = 'authenticated'
  and reported_by = auth.uid()
);

drop policy if exists "course_reports_select_admin" on public.course_reports;
create policy "course_reports_select_admin"
on public.course_reports
for select
using (public.is_admin());

drop policy if exists "course_reports_update_admin" on public.course_reports;
create policy "course_reports_update_admin"
on public.course_reports
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "favorite_courses_select_own" on public.favorite_courses;
create policy "favorite_courses_select_own"
on public.favorite_courses
for select
using (auth.uid() = user_id);

drop policy if exists "favorite_courses_insert_own" on public.favorite_courses;
create policy "favorite_courses_insert_own"
on public.favorite_courses
for insert
with check (auth.uid() = user_id);

drop policy if exists "favorite_courses_delete_own" on public.favorite_courses;
create policy "favorite_courses_delete_own"
on public.favorite_courses
for delete
using (auth.uid() = user_id);
