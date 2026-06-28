create table if not exists public.account_credentials (
  profile_id text primary key references public.profiles(id) on delete cascade,
  password text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.account_credentials enable row level security;

drop policy if exists "admins read account credentials" on public.account_credentials;
create policy "admins read account credentials" on public.account_credentials
for select to authenticated
using (public.is_admin());

drop policy if exists "admins manage account credentials" on public.account_credentials;
create policy "admins manage account credentials" on public.account_credentials
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.account_credentials to authenticated;
