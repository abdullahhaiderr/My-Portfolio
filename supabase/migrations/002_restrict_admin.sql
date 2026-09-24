-- Restrict admin CRUD/storage access to the single Creative Haider admin account.
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "projects_admin_all" on public.projects;
drop policy if exists "certifications_admin_all" on public.certifications;
drop policy if exists "messages_admin_all" on public.messages;

create policy "profiles_admin_all"
on public.profiles for all
to authenticated
using ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com')
with check ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');

create policy "projects_admin_all"
on public.projects for all
to authenticated
using ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com')
with check ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');

create policy "certifications_admin_all"
on public.certifications for all
to authenticated
using ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com')
with check ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');

create policy "messages_admin_all"
on public.messages for all
to authenticated
using ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com')
with check ((auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');

drop policy if exists "media_admin_select" on storage.objects;
drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_admin_update" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;

create policy "media_admin_select"
on storage.objects for select
to authenticated
using (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');

create policy "media_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');

create policy "media_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com')
with check (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');

create policy "media_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'contact.abdullahhaider@gmail.com');
