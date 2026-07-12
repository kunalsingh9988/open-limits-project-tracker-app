-- Open Limits Project Tracker Supabase schema
-- Run this in Supabase SQL Editor, or apply it as a migration.

create extension if not exists pgcrypto;

create table if not exists public.job_roles (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  username text not null unique,
  access_role text not null check (access_role in ('Admin', 'Employee')),
  job_role_id text references public.job_roles(id),
  role text not null default 'Team Member',
  color_tag text not null default '#5B5FEF',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.account_credentials (
  profile_id text primary key references public.profiles(id) on delete cascade,
  password text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  project_name text not null,
  client_username text not null default '',
  main_developer_id text references public.profiles(id),
  developer2_id text references public.profiles(id),
  designer_id text references public.profiles(id),
  deadline date,
  status text not null default 'Not Started',
  is_priority boolean not null default false,
  delay_blocker text,
  preview_link text,
  figma_link text,
  drive_assets_link text,
  checklist jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  brief_doc_link text,
  notes_last_update text,
  client_chats_link text,
  project_documents jsonb not null default '[]'::jsonb,
  project_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  person_id text not null references public.profiles(id),
  project_id text references public.projects(id) on delete set null,
  client_or_store text not null default '',
  task_description text not null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  deadline date,
  status text not null default 'To Do' check (status in ('To Do', 'In Progress', 'Done', 'Client Waiting')),
  notes text,
  assigned_by_id text references public.profiles(id),
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.daily_client_updates (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  date date not null,
  morning_update text,
  evening_update text,
  video_recording_link text,
  author_id text references public.profiles(id),
  unique (project_id, date)
);

create table if not exists public.calendar_slots (
  id text primary key,
  team_member_id text not null references public.profiles(id),
  account_id text references public.profiles(id),
  date date not null,
  start_time time not null,
  task_text text,
  status text check (status in ('To Do', 'Working', 'Done')),
  priority text check (priority in ('Low', 'Medium', 'High')),
  notes text,
  task_id text references public.tasks(id) on delete set null
);

create table if not exists public.resource_links (
  id text primary key,
  category text not null check (category in ('SOP', 'Tutorial', 'Tool', 'Figma', 'Account', 'Inspiration', 'General')),
  name text not null,
  value text not null,
  is_sensitive boolean not null default false
);

create table if not exists public.store_previews (
  id text primary key,
  store_name text not null,
  preview_link text,
  password text,
  google_search_link text
);

create table if not exists public.comments (
  id text primary key,
  entity_type text not null check (entity_type in ('project', 'task')),
  entity_id text not null,
  author_id text not null references public.profiles(id),
  text text not null,
  parent_id text references public.comments(id) on delete cascade,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id text primary key,
  entity_type text not null check (entity_type in ('project', 'task', 'account')),
  entity_id text not null,
  actor_id text not null references public.profiles(id),
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  recipient_id text not null references public.profiles(id),
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists projects_assignee_idx on public.projects(main_developer_id, developer2_id, designer_id);
create index if not exists tasks_person_idx on public.tasks(person_id);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists updates_project_date_idx on public.daily_client_updates(project_id, date);
create index if not exists calendar_member_date_idx on public.calendar_slots(team_member_id, date);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, read);

create or replace function public.current_profile_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles
  where auth_user_id = (select auth.uid())
    and active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = public.current_profile_id()
      and access_role = 'Admin'
      and active = true
  );
$$;

create or replace function public.is_assigned_project(project_row public.projects)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_id() in (
    project_row.main_developer_id,
    project_row.developer2_id,
    project_row.designer_id
  );
$$;

create or replace function public.can_access_project(project_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        public.is_admin()
        or public.current_profile_id() in (p.main_developer_id, p.developer2_id, p.designer_id)
      )
  );
$$;

alter table public.job_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.account_credentials enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_client_updates enable row level security;
alter table public.calendar_slots enable row level security;
alter table public.resource_links enable row level security;
alter table public.store_previews enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "job roles readable" on public.job_roles;
create policy "job roles readable" on public.job_roles
for select to authenticated
using (true);

drop policy if exists "admins manage job roles" on public.job_roles;
create policy "admins manage job roles" on public.job_roles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles visible to active users" on public.profiles;
create policy "profiles visible to active users" on public.profiles
for select to authenticated
using (
  public.is_admin()
  or id = public.current_profile_id()
  or active = true
);

drop policy if exists "users update own basic profile" on public.profiles;
create policy "users update own basic profile" on public.profiles
for update to authenticated
using (id = public.current_profile_id() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = public.current_profile_id()
    and access_role = (select access_role from public.profiles where id = public.current_profile_id())
  )
);

drop policy if exists "admins insert profiles" on public.profiles;
create policy "admins insert profiles" on public.profiles
for insert to authenticated
with check (public.is_admin());

drop policy if exists "first admin bootstrap" on public.profiles;
create policy "first admin bootstrap" on public.profiles
for insert to authenticated
with check (
  not exists (select 1 from public.profiles)
  and auth_user_id = (select auth.uid())
  and access_role = 'Admin'
  and active = true
);

drop policy if exists "admins delete profiles" on public.profiles;
create policy "admins delete profiles" on public.profiles
for delete to authenticated
using (public.is_admin());

drop policy if exists "admins read account credentials" on public.account_credentials;
create policy "admins read account credentials" on public.account_credentials
for select to authenticated
using (public.is_admin());

drop policy if exists "admins manage account credentials" on public.account_credentials;
create policy "admins manage account credentials" on public.account_credentials
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "project scoped read" on public.projects;
create policy "project scoped read" on public.projects
for select to authenticated
using (public.is_admin() or public.is_assigned_project(projects));

drop policy if exists "admins write projects" on public.projects;
create policy "admins write projects" on public.projects
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "assigned employees limited project update" on public.projects;
create policy "assigned employees limited project update" on public.projects
for update to authenticated
using (public.is_assigned_project(projects))
with check (public.is_assigned_project(projects));

drop policy if exists "task scoped read" on public.tasks;
create policy "task scoped read" on public.tasks
for select to authenticated
using (
  public.is_admin()
  or (
    person_id = public.current_profile_id()
    and (project_id is null or public.can_access_project(project_id))
  )
);

drop policy if exists "admins write tasks" on public.tasks;
create policy "admins write tasks" on public.tasks
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "employees update own tasks" on public.tasks;
create policy "employees update own tasks" on public.tasks
for update to authenticated
using (person_id = public.current_profile_id())
with check (person_id = public.current_profile_id());

drop policy if exists "updates scoped read" on public.daily_client_updates;
create policy "updates scoped read" on public.daily_client_updates
for select to authenticated
using (public.is_admin() or public.can_access_project(project_id));

drop policy if exists "updates scoped write" on public.daily_client_updates;
create policy "updates scoped write" on public.daily_client_updates
for all to authenticated
using (public.is_admin() or public.can_access_project(project_id))
with check (public.is_admin() or public.can_access_project(project_id));

drop policy if exists "calendar scoped read" on public.calendar_slots;
create policy "calendar scoped read" on public.calendar_slots
for select to authenticated
using (public.is_admin() or team_member_id = public.current_profile_id());

drop policy if exists "calendar scoped write" on public.calendar_slots;
create policy "calendar scoped write" on public.calendar_slots
for all to authenticated
using (public.is_admin() or team_member_id = public.current_profile_id())
with check (public.is_admin() or team_member_id = public.current_profile_id());

drop policy if exists "resources readable" on public.resource_links;
create policy "resources readable" on public.resource_links
for select to authenticated
using (true);

drop policy if exists "admins manage resources" on public.resource_links;
create policy "admins manage resources" on public.resource_links
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "stores readable" on public.store_previews;
create policy "stores readable" on public.store_previews
for select to authenticated
using (true);

drop policy if exists "admins manage stores" on public.store_previews;
create policy "admins manage stores" on public.store_previews
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "comments scoped read" on public.comments;
create policy "comments scoped read" on public.comments
for select to authenticated
using (
  public.is_admin()
  or (entity_type = 'project' and public.can_access_project(entity_id))
  or (entity_type = 'task' and exists (
    select 1 from public.tasks t
    where t.id = comments.entity_id
      and t.person_id = public.current_profile_id()
  ))
);

drop policy if exists "comments scoped insert" on public.comments;
create policy "comments scoped insert" on public.comments
for insert to authenticated
with check (
  author_id = public.current_profile_id()
  and (
    public.is_admin()
    or (entity_type = 'project' and public.can_access_project(entity_id))
    or (entity_type = 'task' and exists (
      select 1 from public.tasks t
      where t.id = comments.entity_id
        and t.person_id = public.current_profile_id()
    ))
  )
);

drop policy if exists "comments scoped update" on public.comments;
create policy "comments scoped update" on public.comments
for update to authenticated
using (
  public.is_admin()
  or (entity_type = 'project' and public.can_access_project(entity_id))
  or (entity_type = 'task' and exists (
    select 1 from public.tasks t
    where t.id = comments.entity_id
      and t.person_id = public.current_profile_id()
  ))
)
with check (
  public.is_admin()
  or (entity_type = 'project' and public.can_access_project(entity_id))
  or (entity_type = 'task' and exists (
    select 1 from public.tasks t
    where t.id = comments.entity_id
      and t.person_id = public.current_profile_id()
  ))
);

drop policy if exists "activity scoped read" on public.activity_log;
create policy "activity scoped read" on public.activity_log
for select to authenticated
using (public.is_admin() or actor_id = public.current_profile_id());

drop policy if exists "activity insert self" on public.activity_log;
create policy "activity insert self" on public.activity_log
for insert to authenticated
with check (actor_id = public.current_profile_id() or public.is_admin());

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications
for select to authenticated
using (recipient_id = public.current_profile_id() or public.is_admin());

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications
for update to authenticated
using (recipient_id = public.current_profile_id() or public.is_admin())
with check (recipient_id = public.current_profile_id() or public.is_admin());

drop policy if exists "admins insert notifications" on public.notifications;
create policy "admins insert notifications" on public.notifications
for insert to authenticated
with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.job_roles to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.account_credentials to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.daily_client_updates to authenticated;
grant select, insert, update, delete on public.calendar_slots to authenticated;
grant select, insert, update, delete on public.resource_links to authenticated;
grant select, insert, update, delete on public.store_previews to authenticated;
grant select, insert, update on public.comments to authenticated;
grant select, insert on public.activity_log to authenticated;
grant select, insert, update on public.notifications to authenticated;

do $$
begin
  alter publication supabase_realtime add table
    public.job_roles,
    public.profiles,
    public.account_credentials,
    public.projects,
    public.tasks,
    public.daily_client_updates,
    public.calendar_slots,
    public.resource_links,
    public.store_previews,
    public.comments,
    public.activity_log,
    public.notifications;
exception
  when duplicate_object then null;
end $$;
