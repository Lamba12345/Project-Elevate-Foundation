-- =====================================================================
-- PROJECT ELEVATE FOUNDATION - STORAGE BUCKET INITIALIZATION
-- Run this script in your Supabase SQL Editor to create and configure
-- the 'content-media' storage bucket for photos, banners, and documents.
-- =====================================================================

-- 1. Create the 'content-media' storage bucket if it does not exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  10485760, -- 10MB file limit
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'video/mp4',
      'application/pdf'
    ];

-- 2. Public Read: Anyone can view pictures & media on the live website
drop policy if exists "Public read content-media" on storage.objects;
create policy "Public read content-media"
  on storage.objects for select to public, anon, authenticated
  using (bucket_id = 'content-media');

-- 3. Authorized Uploads: Only authenticated Super Admin and Normal Admin can upload
-- (Anonymous visitors & ordinary authenticated users CANNOT upload)
drop policy if exists "Authorized staff upload content-media" on storage.objects;
drop policy if exists "Allow uploads to content-media" on storage.objects;
create policy "Authorized staff upload content-media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'content-media'
    and public.is_active_staff()
  );

-- 4. Authorized Updates: Only authenticated Super Admin and Normal Admin can update
drop policy if exists "Authorized staff update content-media" on storage.objects;
drop policy if exists "Allow updates in content-media" on storage.objects;
create policy "Authorized staff update content-media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'content-media'
    and public.is_active_staff()
  )
  with check (
    bucket_id = 'content-media'
    and public.is_active_staff()
  );

-- 5. Authorized Deletions: Only authenticated Super Admin and Normal Admin can delete
drop policy if exists "Authorized staff delete content-media" on storage.objects;
drop policy if exists "Allow deletes in content-media" on storage.objects;
create policy "Authorized staff delete content-media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'content-media'
    and public.is_active_staff()
  );

-- Output confirmation
select id, name, public, created_at from storage.buckets where id = 'content-media';
