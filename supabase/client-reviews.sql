-- Creative Haider portfolio: complete client review setup.
-- Run once in Supabase Dashboard > SQL Editor > New query > Run.
-- Public submissions are pending by default. Moderation is restricted to authenticated dashboard users.

create table if not exists public.client_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  role text check (role is null or char_length(role) <= 100),
  review text not null check (char_length(trim(review)) between 12 and 1200),
  rating smallint not null default 5 check (rating between 1 and 5),
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.client_reviews add column if not exists image_url text;
alter table public.client_reviews enable row level security;
grant select, insert on public.client_reviews to anon, authenticated;
grant update, delete on public.client_reviews to authenticated;

drop policy if exists "Anyone can submit pending client reviews" on public.client_reviews;
create policy "Anyone can submit pending client reviews"
on public.client_reviews for insert to anon, authenticated
with check (status = 'pending');

drop policy if exists "Public can read approved client reviews" on public.client_reviews;
create policy "Public can read approved client reviews"
on public.client_reviews for select to anon, authenticated
using (status = 'approved');

drop policy if exists "Authenticated dashboard can read all reviews" on public.client_reviews;
create policy "Authenticated dashboard can read all reviews"
on public.client_reviews for select to authenticated using (true);

drop policy if exists "Authenticated dashboard can moderate reviews" on public.client_reviews;
create policy "Authenticated dashboard can moderate reviews"
on public.client_reviews for update to authenticated using (true) with check (status in ('pending','approved','rejected'));

drop policy if exists "Authenticated dashboard can delete reviews" on public.client_reviews;
create policy "Authenticated dashboard can delete reviews"
on public.client_reviews for delete to authenticated using (true);

-- Dedicated public bucket for review photos, limited to 3 MB and supported image formats.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-images', 'review-images', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload review photos" on storage.objects;
create policy "Public can upload review photos"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'review-images' and name like 'review-submissions/%');

drop policy if exists "Authenticated dashboard can delete review photos" on storage.objects;
create policy "Authenticated dashboard can delete review photos"
on storage.objects for delete to authenticated using (bucket_id = 'review-images');
