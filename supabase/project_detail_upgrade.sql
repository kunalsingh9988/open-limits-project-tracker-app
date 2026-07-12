-- Open Limits project detail upgrade
-- Run this once in Supabase SQL Editor for an existing database.

alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add column if not exists project_documents jsonb not null default '[]'::jsonb,
  add column if not exists project_links jsonb not null default '[]'::jsonb;

alter table public.comments
  add column if not exists parent_id text references public.comments(id) on delete cascade,
  add column if not exists reactions jsonb not null default '{}'::jsonb;

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

grant select, insert, update on public.comments to authenticated;
