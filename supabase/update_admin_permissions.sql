-- =====================================================================
-- PROJECT ELEVATE FOUNDATION
-- COMPLETE SUPABASE SCHEMA & PERMISSIONS FIX
-- Resolves 'column "user_id" does not exist' and configures all permissions
-- =====================================================================
-- Safe to run repeatedly (Idempotent). Run in Supabase SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1: ENSURE admin_users TABLE & user_id COLUMN EXIST
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
    created_at timestamptz not null default now()
);

-- Safely add user_id column if missing on admin_users
alter table public.admin_users
add column if not exists user_id uuid;

-- If admin_users had an 'id' column, populate user_id from id
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'admin_users' and column_name = 'id'
  ) then
    update public.admin_users set user_id = id where user_id is null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- STEP 2: ENSURE user_roles TABLE & user_id + ALL PERMISSION COLUMNS EXIST
-- ---------------------------------------------------------------------
create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid (),
    email text not null unique,
    role text not null default 'manager'
);

-- Safely add user_id column to user_roles
alter table public.user_roles
add column if not exists user_id uuid;

-- Safely add all other permission and profile columns to user_roles
alter table public.user_roles
add column if not exists full_name text not null default '',
add column if not exists role text not null default 'manager',
add column if not exists is_active boolean not null default true,
add column if not exists can_manage_activities boolean not null default true,
add column if not exists can_manage_events boolean not null default true,
add column if not exists can_manage_news boolean not null default true,
add column if not exists can_manage_books boolean not null default true,
add column if not exists can_manage_gallery boolean not null default true,
add column if not exists can_manage_content boolean not null default true,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

-- Ensure role constraint allows 'super_admin', 'admin', and 'manager'
do $$
begin
  alter table public.user_roles drop constraint if exists user_roles_role_check;
  alter table public.user_roles add constraint user_roles_role_check 
    check (role in ('super_admin', 'admin', 'manager'));
exception
  when others then null;
end $$;

-- ---------------------------------------------------------------------
-- STEP 3: ENSURE content_submissions TABLE & COLUMNS EXIST
-- ---------------------------------------------------------------------
create table if not exists public.content_submissions (
    id uuid primary key default gen_random_uuid (),
    title text not null,
    content_type text not null default 'website_content',
    status text not null default 'APPROVED',
    created_at timestamptz not null default now()
);

-- Ensure author_id and user_id both exist on content_submissions
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
update public.content_submissions
set
    author_id = user_id
where
    author_id is null
    and user_id is not null;

update public.content_submissions
set
    user_id = author_id
where
    user_id is null
    and author_id is not null;

-- ---------------------------------------------------------------------
-- STEP 4: AUTO-LINK user_roles.user_id FROM auth.users BY EMAIL
-- ---------------------------------------------------------------------
update public.user_roles ur
set
    user_id = au.id,
    updated_at = now()
from auth.users au
where
    ur.user_id is null
    and lower(trim(ur.email)) = lower(trim(au.email));

-- ---------------------------------------------------------------------
-- STEP 5: SECURITY DEFINER ROLE VERIFICATION FUNCTIONS
-- ---------------------------------------------------------------------

-- Check if current user is Super Admin (checks admin_users or user_roles)
create or replace function public.is_super_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  _uid uuid := auth.uid();
  _email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if _uid is null and _email = '' then
    return false;
  end if;

  -- 1. Check admin_users
  if exists (
    select 1 from public.admin_users where user_id = _uid
  ) then
    return true;
  end if;

  -- 2. Check user_roles for super_admin
  if exists (
    select 1 from public.user_roles 
    where (
      (user_id is not null and user_id = _uid)
      or (_email <> '' and lower(trim(email)) = _email)
    )
    and role = 'super_admin'
    and is_active = true
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- Check if current user is Normal Admin / Manager
create or replace function public.is_manager()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  _uid uuid := auth.uid();
  _email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if _uid is null and _email = '' then
    return false;
  end if;

  return exists (
    select 1 from public.user_roles 
    where (
      (user_id is not null and user_id = _uid)
      or (_email <> '' and lower(trim(email)) = _email)
    )
    and role in ('manager', 'admin')
    and is_active = true
  );
end;
$$;

-- Check if current user is Active Staff (Super Admin or Normal Admin)
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_super_admin() or public.is_manager();
$$;

-- Content permission check (both Super Admin & Normal Admin have full publishing rights)
create or replace function public.has_content_permission(ctype text default null)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_active_staff();
$$;

-- Legacy check function
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_active_staff();
$$;

-- Grant execution permissions
grant
execute on function public.is_super_admin () to authenticated,
anon;

grant execute on function public.is_manager () to authenticated, anon;

grant
execute on function public.is_active_staff () to authenticated,
anon;

grant
execute on function public.has_content_permission (text) to authenticated,
anon;

grant execute on function public.is_admin () to authenticated, anon;

-- ---------------------------------------------------------------------
-- STEP 6: ROW LEVEL SECURITY FOR content_submissions
-- ---------------------------------------------------------------------
alter table public.content_submissions enable row level security;

-- Public can read approved live content; active staff can read all content
drop policy if exists "Content submissions select policy" on public.content_submissions;

create policy "Content submissions select policy" on public.content_submissions for
select to anon, authenticated using (
        status = 'APPROVED'
        or public.is_active_staff ()
    );

-- Both Super Admin and Normal Admin can insert and publish content
-- (Anonymous visitors & unauthorized users are blocked)
drop policy if exists "Content submissions insert policy" on public.content_submissions;

create policy "Content submissions insert policy" on public.content_submissions for
insert
    to authenticated
with
    check (public.is_active_staff ());

-- Both Super Admin and Normal Admin can update and publish content
-- (Anonymous visitors & unauthorized users are blocked)
drop policy if exists "Content submissions update policy" on public.content_submissions;

create policy "Content submissions update policy" on public.content_submissions for
update to authenticated using (public.is_active_staff ())
with
    check (public.is_active_staff ());

-- Both Super Admin and Normal Admin can delete content
drop policy if exists "Content submissions delete policy" on public.content_submissions;

create policy "Content submissions delete policy" on public.content_submissions for delete to authenticated using (public.is_active_staff ());

grant select on public.content_submissions to anon, authenticated;

grant
insert
,
update,
delete on public.content_submissions to authenticated;

-- ---------------------------------------------------------------------
-- STEP 7: ROW LEVEL SECURITY FOR user_roles & admin_users
-- ---------------------------------------------------------------------
alter table public.user_roles enable row level security;

drop policy if exists "Users can view their own role" on public.user_roles;

create policy "Users can view their own role" on public.user_roles for
select to authenticated using (
        (
            user_id is not null
            and user_id = auth.uid ()
        )
        or (
            email is not null
            and lower(trim(email)) = lower(
                trim(
                    coalesce(auth.jwt () ->> 'email', '')
                )
            )
        )
        or public.is_super_admin ()
    );

drop policy if exists "Super Admin manage user_roles" on public.user_roles;

create policy "Super Admin manage user_roles" on public.user_roles for all to authenticated using (public.is_super_admin ())
with
    check (public.is_super_admin ());

grant
select,
insert
,
update,
delete on public.user_roles to authenticated;

alter table public.admin_users enable row level security;

drop policy if exists "Super Admin read admin_users" on public.admin_users;

create policy "Super Admin read admin_users" on public.admin_users for
select to authenticated using (public.is_super_admin ());

grant select on public.admin_users to authenticated;

-- ---------------------------------------------------------------------
-- STEP 8: SUPABASE STORAGE: 'content-media' BUCKET & POLICIES
-- ---------------------------------------------------------------------

-- Ensure storage bucket exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  10485760, -- 10MB limit
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

-- Public Read: Anyone can view pictures & media on the live website
drop policy if exists "Public read content-media" on storage.objects;

create policy "Public read content-media" on storage.objects for
select to public, anon, authenticated using (bucket_id = 'content-media');

-- Secure Upload: Only Super Admin and Normal Admin can upload images
drop policy if exists "Authorized staff upload content-media" on storage.objects;

drop policy if exists "Allow uploads to content-media" on storage.objects;

create policy "Authorized staff upload content-media" on storage.objects for
insert
    to authenticated
with
    check (
        bucket_id = 'content-media'
        and public.is_active_staff ()
    );

-- Secure Update: Only Super Admin and Normal Admin can update images
drop policy if exists "Authorized staff update content-media" on storage.objects;

drop policy if exists "Allow updates in content-media" on storage.objects;

create policy "Authorized staff update content-media" on storage.objects for
update to authenticated using (
    bucket_id = 'content-media'
    and public.is_active_staff ()
)
with
    check (
        bucket_id = 'content-media'
        and public.is_active_staff ()
    );

-- Secure Delete: Only Super Admin and Normal Admin can delete images
drop policy if exists "Authorized staff delete content-media" on storage.objects;

drop policy if exists "Allow deletes in content-media" on storage.objects;

create policy "Authorized staff delete content-media" on storage.objects for delete to authenticated using (
    bucket_id = 'content-media'
    and public.is_active_staff ()
);

-- ---------------------------------------------------------------------
-- STEP 9: PROFILE RPC FUNCTIONS FOR CLIENT LOGIN
-- ---------------------------------------------------------------------
create or replace function public.get_my_profile()
returns table (
  role text,
  is_active boolean,
  full_name text,
  email text,
  can_manage_activities boolean,
  can_manage_events boolean,
  can_manage_news boolean,
  can_manage_books boolean,
  can_manage_gallery boolean,
  can_manage_content boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _uid uuid := auth.uid();
  _email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if _uid is null and _email = '' then
    return;
  end if;

  -- 1. Check if user is Super Admin in admin_users or user_roles
  if exists (select 1 from public.admin_users where user_id = _uid) or
     exists (
       select 1 from public.user_roles 
       where ((user_id is not null and user_id = _uid) or (_email <> '' and lower(trim(email)) = _email)) 
         and role = 'super_admin' 
         and is_active = true
     ) then
    return query
    select 
      'super_admin'::text as role,
      true as is_active,
      'Super Admin'::text as full_name,
      coalesce(nullif(_email, ''), 'admin@projectelevate.org') as email,
      true as can_manage_activities,
      true as can_manage_events,
      true as can_manage_news,
      true as can_manage_books,
      true as can_manage_gallery,
      true as can_manage_content;
    return;
  end if;

  -- 2. Auto-link user_id in user_roles if NULL and email matches verified JWT email
  if _uid is not null and _email <> '' then
    update public.user_roles
    set user_id = _uid,
        updated_at = now()
    where user_id is null 
      and lower(trim(email)) = _email;
  end if;

  -- 3. Return admin/manager profile from user_roles
  return query
  select 
    ur.role,
    ur.is_active,
    ur.full_name,
    ur.email,
    ur.can_manage_activities,
    ur.can_manage_events,
    ur.can_manage_news,
    ur.can_manage_books,
    ur.can_manage_gallery,
    ur.can_manage_content
  from public.user_roles ur
  where (ur.user_id is not null and ur.user_id = _uid)
     or (_email <> '' and lower(trim(ur.email)) = _email)
  order by (case when ur.user_id = _uid then 0 else 1 end)
  limit 1;
end;
$$;

grant
execute on function public.get_my_profile () to authenticated,
anon;

create or replace function public.get_my_role()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _profile record;
begin
  select * into _profile from public.get_my_profile() limit 1;
  if _profile.role is null then
    return jsonb_build_object('role', null, 'is_active', false);
  end if;
  return to_jsonb(_profile);
end;
$$;

grant
execute on function public.get_my_role () to authenticated,
anon;

-- CRITICAL: Force PostgREST to reload its schema cache immediately!
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

-- Confirmation output
select 'ALL_SUPABASE_ERRORS_RESOLVED' as status, now() as executed_at;