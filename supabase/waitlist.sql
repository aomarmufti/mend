-- Waitlist for the landing page. Run once in the Supabase SQL editor.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
-- No policies: only the server (service role key) can read or write it.
