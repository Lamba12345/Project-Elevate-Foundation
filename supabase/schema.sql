-- Run this script in Supabase SQL Editor to create or update the website tables, RLS, storage, and functions.
-- Never add a service_role or secret key to the website.

-- ─────────────────────────────────────────────────────────────
-- 1. PUBLIC WEBSITE ENGAGEMENT TABLES (PROTECTED FROM MANAGER)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  department text not null default 'general',
  message text not null,
  status text not null default 'new' check (status in ('new', 'read')),
  created_at timestamptz not null default now()
);

create table if not exists public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null default '',
  country text not null,
  role text not null,
  availability text not null,
  bio text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  amount numeric(12, 2) not null check (amount >= 5),
  currency text not null default 'GHS' check (currency = 'GHS'),
  frequency text not null check (frequency in ('one-time', 'monthly', 'annually')),
  program text not null default '',
  message text not null default '',
  payment_method text not null check (payment_method in ('momo', 'card', 'bank')),
  payment_reference text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

alter table public.donations
  add column if not exists payment_reference text;

create unique index if not exists donations_payment_reference_uidx
  on public.donations (payment_reference)
  where payment_reference is not null;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'active' check (status = 'active'),
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_lower_idx
  on public.newsletter_subscribers (lower(email));

-- Legacy admin users table: STRICTLY FOR SUPER ADMIN ONLY
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. USER ROLES & TEAM ACCOUNT MANAGEMENT
-- Two roles: 'super_admin' (Full website owner) and 'manager' (Content Manager)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null check (role in ('super_admin', 'admin', 'manager')),
  is_active boolean not null default true,
  can_manage_activities boolean not null default true,
  can_manage_events boolean not null default true,
  can_manage_news boolean not null default true,
  can_manage_books boolean not null default true,
  can_manage_gallery boolean not null default true,
  can_manage_content boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safely add granular permission columns if user_roles already existed
alter table public.user_roles 
  add column if not exists full_name text not null default '',
  add column if not exists is_active boolean not null default true,
  add column if not exists can_manage_activities boolean not null default true,
  add column if not exists can_manage_events boolean not null default true,
  add column if not exists can_manage_news boolean not null default true,
  add column if not exists can_manage_books boolean not null default true,
  add column if not exists can_manage_gallery boolean not null default true,
  add column if not exists can_manage_content boolean not null default true;

create unique index if not exists user_roles_email_lower_idx
  on public.user_roles (lower(email));

create index if not exists user_roles_user_id_idx
  on public.user_roles (user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. CONTENT SUBMISSIONS (ACTIVITIES, EVENTS, NEWS, BOOKS, GALLERY, CONTENT)
-- Statuses: 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'REVISION REQUESTED'
-- Types: 'activity', 'event', 'news_announcement', 'publication', 'gallery', 'website_content'
-- ─────────────────────────────────────────────────────────────

create table if not exists public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (
    content_type in ('activity', 'event', 'news_announcement', 'publication', 'gallery', 'website_content')
  ),
  title text not null,
  summary text not null default '',
  content text not null default '',
  image_url text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'APPROVED' check (
    status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'REVISION REQUESTED')
  ),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_email text not null default '',
  author_name text not null default '',
  reviewer_id uuid references auth.users (id) on delete set null,
  reviewer_email text not null default '',
  review_feedback text not null default '',
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_submissions_status_idx
  on public.content_submissions (status);

create index if not exists content_submissions_type_idx
  on public.content_submissions (content_type);

create index if not exists content_submissions_author_idx
  on public.content_submissions (author_id);

-- ─────────────────────────────────────────────────────────────
-- 4. ACTIVITY & AUDIT LOGS (SUPER ADMIN ONLY)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text not null default '',
  user_role text not null default '',
  action_type text not null,
  target_type text not null default '',
  target_id text not null default '',
  details text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 5. STORAGE BUCKET: content-media
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'application/pdf']
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760;

-- ─────────────────────────────────────────────────────────────
-- 6. SECURITY DEFINER FUNCTIONS (SERVER-SIDE AUTHORIZATION)
-- ─────────────────────────────────────────────────────────────

-- Check if current user is Super Admin (exists in admin_users)
-- Strict separation: Super Admin is defined via admin_users (user_id = auth.uid()) to prevent RLS recursion
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- Check if current user is active Manager
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
    select 1
    from public.user_roles
    where ((user_id is not null and user_id = _uid)
           or (_email <> '' and lower(trim(email)) = _email))
      and role in ('manager', 'admin')
      and is_active = true
  );
end;
$$;

-- Check if current user is active staff (Super Admin or Manager)
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_super_admin() or public.is_manager();
$$;

-- Server-side check for granular content permissions
create or replace function public.has_content_permission(ctype text)
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
  -- Super admin has all permissions
  if public.is_super_admin() then
    return true;
  end if;

  if _uid is null and _email = '' then
    return false;
  end if;

  return exists (
    select 1
    from public.user_roles ur
    where ((ur.user_id is not null and ur.user_id = _uid)
           or (_email <> '' and lower(trim(ur.email)) = _email))
      and ur.role in ('manager', 'admin')
      and ur.is_active = true
      and (
        (ctype = 'activity' and ur.can_manage_activities = true) or
        (ctype = 'event' and ur.can_manage_events = true) or
        (ctype = 'news_announcement' and ur.can_manage_news = true) or
        (ctype = 'publication' and ur.can_manage_books = true) or
        (ctype = 'gallery' and ur.can_manage_gallery = true) or
        (ctype = 'website_content' and ur.can_manage_content = true)
      )
  );
end;
$$;

-- Check function for legacy admin tables (STRICTLY SUPER ADMIN ONLY)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_super_admin();
$$;

-- Returns profile & permissions for the current user session
-- Handles Super Admin from admin_users, auto-links user_id in user_roles when NULL,
-- and returns active manager permissions safely without RLS recursion.
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

  -- 1. Check if user is Super Admin in admin_users (strictly user_id match)
  if exists (select 1 from public.admin_users where user_id = _uid) then
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

  -- 3. Return manager profile from user_roles
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

-- Returns profile as a JSON object (alias helper)
create or replace function public.get_my_role()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _prof record;
begin
  select * into _prof from public.get_my_profile();
  if _prof.role is not null then
    return to_jsonb(_prof);
  end if;
  return null;
end;
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated, anon;

revoke all on function public.is_manager() from public;
grant execute on function public.is_manager() to authenticated, anon;

revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated, anon;

revoke all on function public.has_content_permission(text) from public;
grant execute on function public.has_content_permission(text) to authenticated;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated, anon;

revoke all on function public.get_my_role() from public;
grant execute on function public.get_my_role() to authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────

alter table public.contact_messages enable row level security;
alter table public.volunteer_applications enable row level security;
alter table public.donations enable row level security;
alter table public.donations force row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.admin_users enable row level security;
alter table public.user_roles enable row level security;
alter table public.content_submissions enable row level security;
alter table public.activity_logs enable row level security;

-- 7.1 Public Inquiries & Visitor Messages (Shared: Super Admin & Content Manager)
drop policy if exists "Admins can read contact messages" on public.contact_messages;
drop policy if exists "Staff can read contact messages" on public.contact_messages;
create policy "Staff can read contact messages"
  on public.contact_messages for select to authenticated
  using (true);

drop policy if exists "Public can submit contact messages" on public.contact_messages;
create policy "Public can submit contact messages"
  on public.contact_messages for insert to anon, authenticated
  with check (true);

drop policy if exists "Admins can read volunteer applications" on public.volunteer_applications;
drop policy if exists "Staff can read volunteer applications" on public.volunteer_applications;
create policy "Staff can read volunteer applications"
  on public.volunteer_applications for select to authenticated
  using (true);

drop policy if exists "Public can submit volunteer applications" on public.volunteer_applications;
create policy "Public can submit volunteer applications"
  on public.volunteer_applications for insert to anon, authenticated
  with check (true);

drop policy if exists "Admins can read donations" on public.donations;
create policy "Admins can read donations"
  on public.donations for select to authenticated
  using (public.is_super_admin());

revoke all on table public.donations from public, anon, authenticated;
grant select on table public.donations to authenticated;

drop policy if exists "Admins can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can read newsletter subscribers"
  on public.newsletter_subscribers for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Public can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Public can subscribe to newsletter"
  on public.newsletter_subscribers for insert to anon, authenticated
  with check (status = 'active');

drop policy if exists "Super Admin read admin_users" on public.admin_users;
create policy "Super Admin read admin_users"
  on public.admin_users for select to authenticated
  using (public.is_super_admin());

-- 7.2 User Roles Policies
drop policy if exists "Users can view their own role" on public.user_roles;
create policy "Users can view their own role"
  on public.user_roles for select to authenticated
  using (
    (user_id is not null and user_id = auth.uid()) 
    or (email is not null and lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', ''))))
    or public.is_super_admin()
  );

-- Ensure non-admins cannot update roles, active status, or permissions
drop policy if exists "Users can link their user_id" on public.user_roles;

drop policy if exists "Super Admin can insert roles" on public.user_roles;
create policy "Super Admin can insert roles"
  on public.user_roles for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "Super Admin can update roles" on public.user_roles;
create policy "Super Admin can update roles"
  on public.user_roles for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super Admin can delete roles" on public.user_roles;
create policy "Super Admin can delete roles"
  on public.user_roles for delete to authenticated
  using (public.is_super_admin());

-- 7.3 Content Submissions Policies (Full Manager + Super Admin Permissions)
-- SELECT: Public views APPROVED content. Active staff views ALL content.
drop policy if exists "Content submissions select policy" on public.content_submissions;
create policy "Content submissions select policy"
  on public.content_submissions for select to anon, authenticated
  using (
    status = 'APPROVED'
    or public.is_active_staff()
  );

-- INSERT: Super Admin or active Manager can insert and publish content
drop policy if exists "Content submissions insert policy" on public.content_submissions;
create policy "Content submissions insert policy"
  on public.content_submissions for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_active_staff()
      and public.has_content_permission(content_type)
    )
  );

-- UPDATE: Super Admin or active Manager can edit and publish content
drop policy if exists "Content submissions update policy" on public.content_submissions;
create policy "Content submissions update policy"
  on public.content_submissions for update to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_staff()
      and public.has_content_permission(content_type)
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_active_staff()
      and public.has_content_permission(content_type)
    )
  );

-- DELETE: Super Admin or active Manager with permissions can delete content
drop policy if exists "Content submissions delete policy" on public.content_submissions;
create policy "Content submissions delete policy"
  on public.content_submissions for delete to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_staff()
      and public.has_content_permission(content_type)
    )
  );

-- 7.4 Activity Logs Policies (Super Admin Only)
drop policy if exists "Active staff can insert activity logs" on public.activity_logs;
create policy "Active staff can insert activity logs"
  on public.activity_logs for insert to authenticated
  with check (public.is_active_staff());

drop policy if exists "Super Admin can view activity logs" on public.activity_logs;
create policy "Super Admin can view activity logs"
  on public.activity_logs for select to authenticated
  using (public.is_super_admin());

-- 7.5 Storage Policies: content-media bucket
drop policy if exists "Public read content-media" on storage.objects;
create policy "Public read content-media"
  on storage.objects for select to public, anon, authenticated
  using (bucket_id = 'content-media');

drop policy if exists "Authorized staff upload content-media" on storage.objects;
create policy "Authorized staff upload content-media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'content-media'
    and public.is_active_staff()
  );

drop policy if exists "Authorized staff update content-media" on storage.objects;
create policy "Authorized staff update content-media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'content-media'
    and public.is_active_staff()
  );

drop policy if exists "Authorized staff delete content-media" on storage.objects;
create policy "Authorized staff delete content-media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'content-media'
    and public.is_active_staff()
  );

-- ─────────────────────────────────────────────────────────────
-- 8. TABLE GRANTS
-- ─────────────────────────────────────────────────────────────

grant insert on public.contact_messages, public.volunteer_applications,
  public.newsletter_subscribers to anon, authenticated;

grant select on public.contact_messages, public.volunteer_applications,
  public.donations, public.newsletter_subscribers to authenticated;

grant select on public.content_submissions to anon, authenticated;
grant insert, update, delete on public.content_submissions to authenticated;

grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert on public.activity_logs to authenticated;

-- Automatic trigger to link user_id upon sign-in if created via email
create or replace function public.handle_user_role_user_id_sync()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.user_roles
  set user_id = new.id
  where lower(email) = lower(new.email)
    and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_roles on auth.users;
create trigger on_auth_user_created_sync_roles
  after insert on auth.users
  for each row execute function public.handle_user_role_user_id_sync();
