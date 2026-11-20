-- ============================================================
-- PROJECT ELEVATE FOUNDATION — CONTACT & VOLUNTEER RLS PERMISSIONS FIX
-- ============================================================
-- Ensures:
-- 1. Visitors can insert contact messages and volunteer applications without RLS block
-- 2. All authorized staff (Super Admin and Content Manager) can view contact and volunteer messages
-- ============================================================

-- A. Grant table permissions
grant insert on public.contact_messages to anon, authenticated;
grant insert on public.volunteer_applications to anon, authenticated;

grant select on public.contact_messages to authenticated;
grant select on public.volunteer_applications to authenticated;

-- B. RLS on contact_messages
alter table public.contact_messages enable row level security;

drop policy if exists "Public can submit contact messages" on public.contact_messages;
create policy "Public can submit contact messages"
  on public.contact_messages for insert to anon, authenticated
  with check (true);

drop policy if exists "Admins can read contact messages" on public.contact_messages;
drop policy if exists "Staff can read contact messages" on public.contact_messages;
create policy "Staff can read contact messages"
  on public.contact_messages for select to authenticated
  using (true);

-- C. RLS on volunteer_applications
alter table public.volunteer_applications enable row level security;

drop policy if exists "Public can submit volunteer applications" on public.volunteer_applications;
create policy "Public can submit volunteer applications"
  on public.volunteer_applications for insert to anon, authenticated
  with check (true);

drop policy if exists "Admins can read volunteer applications" on public.volunteer_applications;
drop policy if exists "Staff can read volunteer applications" on public.volunteer_applications;
create policy "Staff can read volunteer applications"
  on public.volunteer_applications for select to authenticated
  using (true);
