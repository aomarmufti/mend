-- Waitlist for the landing page. Already applied to the "reknit" Supabase project.
-- Anyone can add an address (public form); nobody but the project owner can read, change or delete them.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_format check (
    email = lower(email)
    and length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'
  )
);

create unique index waitlist_email_key on public.waitlist (email);

alter table public.waitlist enable row level security;

create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);

revoke all on public.waitlist from anon, authenticated;
grant insert (email, source) on public.waitlist to anon;
