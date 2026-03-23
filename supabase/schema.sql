create table if not exists public.wallet_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.wallet_snapshots enable row level security;

create policy "Users can read their own wallet snapshot"
on public.wallet_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own wallet snapshot"
on public.wallet_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own wallet snapshot"
on public.wallet_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);