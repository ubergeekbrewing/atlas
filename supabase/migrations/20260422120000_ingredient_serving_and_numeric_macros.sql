-- Decimal macros; optional serving size + unit label (e.g. 2 · scoop, 30 · g).

alter table public.ingredients
  add column if not exists serving_size numeric(14,4),
  add column if not exists units text not null default '';

alter table public.ingredients
  alter column calories type numeric(14,4) using calories::numeric,
  alter column protein_g type numeric(14,4) using protein_g::numeric,
  alter column carb_g type numeric(14,4) using carb_g::numeric,
  alter column fat_g type numeric(14,4) using fat_g::numeric;
