alter table public.profiles
  add column if not exists hero_image_url text,
  add column if not exists about_image_url text,
  add column if not exists resume_url text;

update public.profiles
set
  hero_image_url = coalesce(nullif(hero_image_url,''), '/images/hero-profile.webp'),
  about_image_url = coalesce(nullif(about_image_url,''), '/images/about-profile.webp'),
  resume_url = coalesce(nullif(resume_url,''), '/assets/Abdullah-Haider-Resume.pdf'),
  updated_at = now();
