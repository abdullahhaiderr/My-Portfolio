-- Creative Haider portfolio database
-- Apply to the dedicated Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title text,
  bio text,
  email text,
  phone text,
  whatsapp text,
  linkedin_url text,
  avatar_url text,
  hero_image_url text,
  about_image_url text,
  resume_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  image_url text,
  project_url text,
  is_published boolean not null default false,
  is_draft boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text,
  issue_date date,
  credential_url text,
  credential_id text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.certifications enable row level security;
alter table public.messages enable row level security;
alter table public.profiles add column if not exists hero_image_url text;
alter table public.profiles add column if not exists about_image_url text;
alter table public.profiles add column if not exists resume_url text;
alter table public.certifications add column if not exists credential_id text;

create policy "profiles_public_read"
on public.profiles for select
to anon
using (true);

create policy "projects_public_read_published"
on public.projects for select
to anon
using (is_published = true);

create policy "certifications_public_read"
on public.certifications for select
to anon
using (true);

create policy "messages_public_insert"
on public.messages for insert
to anon
with check (true);

create policy "profiles_admin_all"
on public.profiles for all
to authenticated
using ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid)
with check ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

create policy "projects_admin_all"
on public.projects for all
to authenticated
using ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid)
with check ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

create policy "certifications_admin_all"
on public.certifications for all
to authenticated
using ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid)
with check ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

create policy "messages_admin_all"
on public.messages for all
to authenticated
using ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid)
with check ((select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "media_admin_select" on storage.objects;
create policy "media_admin_select"
on storage.objects for select
to authenticated
using (bucket_id = 'media' and (select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media' and (select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'media' and (select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid)
with check (bucket_id = 'media' and (select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'media' and (select auth.uid()) = 'a562e609-18a3-4472-9e4f-65f0299d5092'::uuid);

-- Seed current public content so the visual portfolio remains populated
insert into public.profiles
(name, role_title, bio, email, phone, whatsapp, linkedin_url, avatar_url)
select
  'Abdullah Haider',
  'Web Designer & Developer',
  'I work across web development and interface design, with an emphasis on making websites and digital tools easy to understand, practical to use and responsive across devices.',
  'contact.abdullahhaider@gmail.com',
  '+92 311 543 4787',
  '923115434787',
  'https://linkedin.com/in/abdullah-haider-sales-closer',
  null
where not exists (select 1 from public.profiles);

insert into public.projects
(title, description, category, image_url, project_url, is_published, is_draft, sort_order)
select * from (values
  ('5 Star Restaurant','Elegant restaurant website with food gallery, menu, and reservation system.','web','/images/optimized/project-65d2745e2ea1-960.webp',null,true,false,0),
  ('Business Consultant','Professional consulting firm website with modern corporate design and case studies.','web','/images/optimized/project-9ccb99d7e6c7-960.webp',null,true,false,1),
  ('Creative Portfolio','Vibrant creative agency portfolio with bold illustrations and playful design.','brand','/images/optimized/project-79f112a1d483-960.webp',null,true,false,2),
  ('Digital Art Portfolio','Minimalist art director portfolio showcasing creative projects with clean layout.','brand','/images/optimized/project-4be8a0f8d425-960.webp',null,true,false,3),
  ('Mobile Shop','Dark-themed e-commerce store for smartphones and accessories with product filters.','ecommerce','/images/optimized/project-23151587b922-960.webp',null,true,false,4),
  ('Online Tutor','Educational platform with playful design, course features, and student dashboard.','web','/images/optimized/project-51465a65aa06-960.webp',null,true,false,5),
  ('Artisan Restaurant','Elegant restaurant website with reservation system, menu showcase, and chef profiles.','web','/images/optimized/project-f3a8091241d6-960.webp',null,true,false,6),
  ('Therapist Website','Warm and welcoming therapy practice website with online booking and resources.','web','/images/optimized/project-63b6737aac23-960.webp',null,true,false,7),
  ('Therapeutic Mechanics website','A complete full-stack mental health clinic website showcasing the public experience, appointment request system, therapist profiles, and secure staff dashboard','web','/images/optimized/project-86d708fa1935-960.webp',null,true,false,8)
) as seed(title,description,category,image_url,project_url,is_published,is_draft,sort_order)
where not exists (select 1 from public.projects);
