-- ATLAS tracker: profiles, meals, workouts with RLS.
-- Run in Supabase SQL Editor or via `supabase db push` if you use the Supabase CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now(),
  display_name text not null default '',
  daily_calorie_goal integer not null default 2000,
  protein_goal_g integer not null default 130,
  carb_goal_g integer not null default 220,
  fat_goal_g integer not null default 70,
  weight_kg numeric,
  height_cm integer,
  weekly_workout_goal integer not null default 4,
  activity_level text not null default 'moderate'
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  meal_type text not null,
  name text not null,
  calories integer not null default 0,
  protein_g integer not null default 0,
  carb_g integer not null default 0,
  fat_g integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meals_user_entry_idx on public.meals (user_id, entry_date desc);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  title text not null,
  duration_min integer not null default 0,
  intensity text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_entry_idx on public.workouts (user_id, entry_date desc);

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.workouts enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "meals_select_own" on public.meals for select using (auth.uid() = user_id);
create policy "meals_insert_own" on public.meals for insert with check (auth.uid() = user_id);
create policy "meals_update_own" on public.meals for update using (auth.uid() = user_id);
create policy "meals_delete_own" on public.meals for delete using (auth.uid() = user_id);

create policy "workouts_select_own" on public.workouts for select using (auth.uid() = user_id);
create policy "workouts_insert_own" on public.workouts for insert with check (auth.uid() = user_id);
create policy "workouts_update_own" on public.workouts for update using (auth.uid() = user_id);
create policy "workouts_delete_own" on public.workouts for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
