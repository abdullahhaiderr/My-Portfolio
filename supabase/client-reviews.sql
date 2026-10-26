-- Creative Haider portfolio: public client review submissions
-- Run this script once in Supabase Dashboard > SQL Editor.
-- Public submissions are always pending. Only an authenticated project owner/admin
-- should change status to 'approved' after verifying the review and permission to publish it.

create table if not exists public.client_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  role text check (role is null or char_length(role) <= 100),
  review text not null check (char_length(trim(review)) between 12 and 1200),
  rating smallint not null default 5 check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.client_reviews enable row level security;

grant select, insert on public.client_reviews to anon, authenticated;

drop policy if exists "Anyone can submit pending client reviews" on public.client_reviews;
create policy "Anyone can submit pending client reviews"
on public.client_reviews for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "Public can read approved client reviews" on public.client_reviews;
create policy "Public can read approved client reviews"
on public.client_reviews for select
to anon, authenticated
using (status = 'approved');

-- Do not create public UPDATE or DELETE policies. Approve/reject reviews from the
-- Supabase dashboard using an authorized admin account only.
