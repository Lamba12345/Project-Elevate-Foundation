-- =====================================================================
-- PROJECT ELEVATE FOUNDATION
-- CREATE 'content_submissions' TABLE & RELOAD SUPABASE SCHEMA CACHE
-- =====================================================================
-- Run this in your Supabase SQL Editor to resolve:
-- "Could not find the table 'public.content_submissions' in the schema cache"
-- =====================================================================

-- 1. Create table public.content_submissions if not exists
create table if not exists public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type text not null default 'website_content',
  status text not null default 'APPROVED',
  created_at timestamptz not null default now()
);

-- 2. Safely add all required columns
alter table public.content_submissions 
  add column if not exists author_id uuid,
  add column if not exists user_id uuid,
  add column if not exists author_email text not null default '',
  add column if not exists author_name text not null default '',
  add column if not exists summary text not null default '',
  add column if not exists content text not null default '',
  add column if not exists image_url text not null default '',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists reviewer_id uuid,
  add column if not exists reviewer_email text not null default '',
  add column if not exists review_feedback text not null default '',
  add column if not exists submitted_at timestamptz default now(),
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Keep user_id and author_id in sync
update public.content_submissions set author_id = user_id where author_id is null and user_id is not null;
update public.content_submissions set user_id = author_id where user_id is null and author_id is not null;

-- 3. Create indices for fast querying
create index if not exists content_submissions_status_idx on public.content_submissions (status);
create index if not exists content_submissions_type_idx on public.content_submissions (content_type);
create index if not exists content_submissions_created_at_idx on public.content_submissions (created_at desc);

-- 4. Enable Row Level Security (RLS)
alter table public.content_submissions enable row level security;

-- Public can read approved live content; active staff can read everything
drop policy if exists "Content submissions select policy" on public.content_submissions;
create policy "Content submissions select policy"
  on public.content_submissions for select to anon, authenticated
  using (
    status = 'APPROVED'
    or public.is_active_staff()
  );

-- Both Super Admin and Normal Admin can insert and publish content
drop policy if exists "Content submissions insert policy" on public.content_submissions;
create policy "Content submissions insert policy"
  on public.content_submissions for insert to authenticated
  with check (
    public.is_active_staff()
  );

-- Both Super Admin and Normal Admin can update content
drop policy if exists "Content submissions update policy" on public.content_submissions;
create policy "Content submissions update policy"
  on public.content_submissions for update to authenticated
  using (
    public.is_active_staff()
  )
  with check (
    public.is_active_staff()
  );

-- Both Super Admin and Normal Admin can delete content
drop policy if exists "Content submissions delete policy" on public.content_submissions;
create policy "Content submissions delete policy"
  on public.content_submissions for delete to authenticated
  using (
    public.is_active_staff()
  );

-- 5. Grant permissions
grant select on public.content_submissions to anon, authenticated;
grant insert, update, delete on public.content_submissions to authenticated;

-- 6. CRITICAL: Force PostgREST to reload its schema cache immediately!
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

-- Confirmation
select 'TABLE_CREATED_AND_SCHEMA_CACHE_RELOADED' as status, count(*) as total_rows from public.content_submissions;
