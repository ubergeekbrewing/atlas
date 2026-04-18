-- Lab abnormality lines per blood draw (manual entry). RLS: own rows only.

create table if not exists public.lab_abnormals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  draw_date date not null,
  test_name text not null,
  value text not null,
  flag text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists lab_abnormals_user_draw_idx on public.lab_abnormals (user_id, draw_date desc);

alter table public.lab_abnormals enable row level security;

create policy "lab_abnormals_select_own" on public.lab_abnormals for select using (auth.uid() = user_id);
create policy "lab_abnormals_insert_own" on public.lab_abnormals for insert with check (auth.uid() = user_id);
create policy "lab_abnormals_update_own" on public.lab_abnormals for update using (auth.uid() = user_id);
create policy "lab_abnormals_delete_own" on public.lab_abnormals for delete using (auth.uid() = user_id);
