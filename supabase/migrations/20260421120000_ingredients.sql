-- Pantry / base ingredients: macros, where to find, optional cost per user.

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  calories integer not null default 0,
  protein_g integer not null default 0,
  carb_g integer not null default 0,
  fat_g integer not null default 0,
  where_to_find text not null default '',
  cost numeric(10,2),
  created_at timestamptz not null default now()
);

create index if not exists ingredients_user_name_idx on public.ingredients (user_id, lower(name));

alter table public.ingredients enable row level security;

create policy "ingredients_select_own" on public.ingredients for select using (auth.uid() = user_id);
create policy "ingredients_insert_own" on public.ingredients for insert with check (auth.uid() = user_id);
create policy "ingredients_update_own" on public.ingredients for update using (auth.uid() = user_id);
create policy "ingredients_delete_own" on public.ingredients for delete using (auth.uid() = user_id);
