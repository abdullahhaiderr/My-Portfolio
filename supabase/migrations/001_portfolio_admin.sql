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
using (true)
with check (true);

create policy "projects_admin_all"
on public.projects for all
to authenticated
using (true)
with check (true);

create policy "certifications_admin_all"
on public.certifications for all
to authenticated
using (true)
with check (true);

create policy "messages_admin_all"
on public.messages for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;

create policy "media_admin_select"
on storage.objects for select
to authenticated
using (bucket_id = 'media');

create policy "media_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media');

create policy "media_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'media')
with check (bucket_id = 'media');

create policy "media_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'media');

-- Seed current public content so the visual portfolio remains populated
insert into public.profiles
(name, role_title, bio, email, phone, whatsapp, linkedin_url, avatar_url)
select
  'Abdullah Haider',
  'Sales Closer & Digital Designer',
  'Results-driven professional with 4+ years in high-performance sales closing and expertise in UI/UX design and web development. Transforming ideas into premium digital experiences that drive revenue and engagement.',
  'contact.abdullahhaider@gmail.com',
  '+92 327 901 3092',
  '+92 327 901 3092',
  'https://linkedin.com/in/abdullah-haider-sales-closer',
  'images/hero-image.png'
where not exists (select 1 from public.profiles);

insert into public.projects
(title, description, category, image_url, project_url, is_published, is_draft, sort_order)
select * from (values
  ('5 Star Restaurant','Elegant restaurant website with food gallery, menu, and reservation system.','web','images/5_star_resturant.png',null,true,false,0),
  ('Business Consultant','Professional consulting firm website with modern corporate design and case studies.','web','images/buisness_consultant.png',null,true,false,1),
  ('Creative Portfolio','Vibrant creative agency portfolio with bold illustrations and playful design.','brand','images/creative_poprtfolio.png',null,true,false,2),
  ('Digital Art Portfolio','Minimalist art director portfolio showcasing creative projects with clean layout.','brand','images/Digital_art_portfolio.png',null,true,false,3),
  ('Mobile Shop','Dark-themed e-commerce store for smartphones and accessories with product filters.','ecommerce','images/mobile_shop_webite.png',null,true,false,4),
  ('Online Tutor','Educational platform with playful design, course features, and student dashboard.','web','images/online_tutor.png',null,true,false,5),
  ('Artisan Restaurant','Elegant restaurant website with reservation system, menu showcase, and chef profiles.','web','images/Resturant_Website.png',null,true,false,6),
  ('Therapist Website','Warm and welcoming therapy practice website with online booking and resources.','web','images/therapist_website.png',null,true,false,7)
) as seed(title,description,category,image_url,project_url,is_published,is_draft,sort_order)
where not exists (select 1 from public.projects);
