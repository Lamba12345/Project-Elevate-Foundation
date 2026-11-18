-- ============================================================
-- PROJECT ELEVATE FOUNDATION — CORRECTED AUTHORIZATION FIX
-- ============================================================
-- Compatible with schema:
--   - admin_users (user_id, created_at)  [NO email column]
--   - user_roles  (id, user_id, email, full_name, role, is_active, permissions...)
--
-- Super Admin UID: a284316b-6e82-4c47-96cd-4d01d28368eb
-- ============================================================

-- 1. Ensure Super Admin is registered in admin_users
insert into public.admin_users (user_id)
values ('a284316b-6e82-4c47-96cd-4d01d28368eb'::uuid)
on conflict (user_id) do nothing;

-- 2. One-time link: Connect manager's auth UID to user_roles if user_id is NULL
update public.user_roles ur
set user_id = au.id,
    updated_at = now()
from auth.users au
where ur.user_id is null
  and lower(trim(ur.email)) = lower(trim(au.email));

-- 3. Super Admin check: Strictly uses admin_users.user_id and auth.uid()
--    (Completely eliminates references to admin_users.email and prevents RLS recursion)
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

-- 4. Manager check: Validates manager role and active status
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_roles
    where (
      (user_id is not null and user_id = auth.uid())
      or (email is not null and lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', ''))))
    )
      and role = 'manager'
      and is_active = true
  );
$$;

-- 5. Active staff check: Super Admin or active Manager
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.is_super_admin() or public.is_manager();
$$;

-- 6. Content permission check for granular actions
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
  -- Super Admin always has full content permissions
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
      and ur.role = 'manager'
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

-- 7. Profile retrieval RPC:
--    - Identifies Super Admin via admin_users.user_id
--    - Auto-links user_roles.user_id if NULL upon manager sign-in
--    - Preserves existing manager permissions and active status
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
  if _uid is null then
    return;
  end if;

  -- Step A: Super Admin check strictly by admin_users.user_id
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

  -- Step B: Auto-link user_id in user_roles if NULL and email matches verified auth token
  if _email <> '' then
    update public.user_roles
    set user_id = _uid,
        updated_at = now()
    where user_id is null 
      and lower(trim(email)) = _email;
  end if;

  -- Step C: Return manager profile from user_roles
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
  where ur.user_id = _uid
     or (_email <> '' and lower(trim(ur.email)) = _email)
  order by (case when ur.user_id = _uid then 0 else 1 end)
  limit 1;
end;
$$;

-- 8. Helper RPC get_my_role
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

-- 9. Refresh function execution permissions
grant execute on function public.is_super_admin() to authenticated, anon;
grant execute on function public.is_manager() to authenticated, anon;
grant execute on function public.is_active_staff() to authenticated, anon;
grant execute on function public.has_content_permission(text) to authenticated;
grant execute on function public.get_my_profile() to authenticated, anon;
grant execute on function public.get_my_role() to authenticated, anon;

-- 10. ROW LEVEL SECURITY (RLS) FOR user_roles
--     - Managers can ONLY read their own role record
--     - Managers CANNOT insert, update, or delete roles or permissions
--     - ONLY Super Admin can insert, update, or delete roles and permissions
alter table public.user_roles enable row level security;

drop policy if exists "Users can view their own role" on public.user_roles;
create policy "Users can view their own role"
  on public.user_roles for select to authenticated
  using (
    (user_id is not null and user_id = auth.uid()) 
    or (email is not null and lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', ''))))
    or public.is_super_admin()
  );

-- Drop any previous update policy for non-admins so managers CANNOT modify roles or permissions
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

-- 11. ROW LEVEL SECURITY (RLS) FOR admin_users
alter table public.admin_users enable row level security;

drop policy if exists "Super Admin read admin_users" on public.admin_users;
create policy "Super Admin read admin_users"
  on public.admin_users for select to authenticated
  using (public.is_super_admin());
