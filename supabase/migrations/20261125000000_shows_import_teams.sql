-- Ospod Milestone 1: shows, importing from other hosts, team invites, cover art storage.

-- ---------------------------------------------------------------------------
-- Shows and episodes: fields that come from (and go back into) RSS feeds
-- ---------------------------------------------------------------------------
alter table public.shows
  add column if not exists subcategory text,
  add column if not exists copyright   text,
  add column if not exists show_type   text not null default 'episodic' check (show_type in ('episodic', 'serial')),
  add column if not exists imported_at timestamptz;

-- The same feed can't be imported twice into one workspace.
create unique index if not exists shows_workspace_import_feed_idx
  on public.shows (workspace_id, imported_from_feed) where imported_from_feed is not null;

alter table public.episodes
  add column if not exists link             text,
  -- Where the audio/video lived on the previous host. Copied to Ospod storage when the show moves (Milestone 3).
  add column if not exists source_media_url text,
  add column if not exists imported         boolean not null default false;

-- ---------------------------------------------------------------------------
-- Plan limits: how many shows a workspace may have
-- ---------------------------------------------------------------------------
create or replace function public.workspace_show_limit(ws uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select case
    when w.plan = 'network'          then null   -- unlimited
    when w.plan_status = 'trialing'  then 3      -- trials can try everything
    when w.plan = 'studio'           then 3
    else 1
  end
  from public.workspaces w where w.id = ws;
$$;

create or replace function public.enforce_show_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  max_shows integer := public.workspace_show_limit(new.workspace_id);
  status public.plan_status;
begin
  select plan_status into status from public.workspaces where id = new.workspace_id;
  if status = 'canceled' then
    raise exception 'This workspace''s plan is cancelled. Choose a plan to add shows.'
      using errcode = 'P0001', hint = 'plan_canceled';
  end if;
  if max_shows is not null
     and (select count(*) from public.shows where workspace_id = new.workspace_id) >= max_shows then
    raise exception 'Your plan allows % show(s). Upgrade to add more.', max_shows
      using errcode = 'P0001', hint = 'show_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists shows_enforce_limit on public.shows;
create trigger shows_enforce_limit before insert on public.shows
for each row execute function public.enforce_show_limit();

-- ---------------------------------------------------------------------------
-- Team invites (shareable links; emailed invites come with the email sender)
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role         public.member_role not null default 'editor' check (role <> 'owner'),
  -- Optional label so admins remember who the link was for.
  email        extensions.citext,
  -- SHA-256 of the secret token in the link. The token itself is never stored.
  token_hash   text not null unique,
  invited_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id) on delete set null
);
create index if not exists workspace_invites_workspace_idx on public.workspace_invites (workspace_id);

alter table public.workspace_invites enable row level security;

drop policy if exists "invites: admins read" on public.workspace_invites;
create policy "invites: admins read" on public.workspace_invites
  for select to authenticated using (public.has_workspace_role(workspace_id, 'admin'));
drop policy if exists "invites: admins create" on public.workspace_invites;
create policy "invites: admins create" on public.workspace_invites
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin') and invited_by = (select auth.uid()));
drop policy if exists "invites: admins revoke" on public.workspace_invites;
create policy "invites: admins revoke" on public.workspace_invites
  for delete to authenticated using (public.has_workspace_role(workspace_id, 'admin'));

revoke all on public.workspace_invites from anon, authenticated;
grant select, delete on public.workspace_invites to authenticated;
grant insert (workspace_id, role, email, token_hash, invited_by) on public.workspace_invites to authenticated;

-- What an invite link is for. Callable before signing in, but only with the secret link.
create or replace function public.invite_preview(p_token_hash text)
returns table (workspace_name text, role public.member_role, invited_by_name text, valid boolean)
language sql stable security definer set search_path = ''
as $$
  select w.name, i.role, coalesce(p.full_name, split_part(p.email::text, '@', 1)),
         i.accepted_at is null and i.expires_at > now()
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = p_token_hash;
$$;

-- Join the workspace an invite link points to. Returns the workspace id.
create or replace function public.accept_invite(p_token_hash text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  inv public.workspace_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  select * into inv from public.workspace_invites
  where token_hash = p_token_hash
  for update;

  if not found or inv.accepted_at is not null or inv.expires_at <= now() then
    raise exception 'This invite link has expired or was already used.' using errcode = 'P0001', hint = 'invite_invalid';
  end if;

  -- Already a member: keep whichever role is higher.
  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id)
  do update set role = least(public.workspace_members.role, excluded.role);

  update public.workspace_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = inv.id;

  return inv.workspace_id;
end;
$$;

revoke execute on function public.invite_preview(text) from public;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.invite_preview(text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;
revoke execute on function public.workspace_show_limit(uuid) from public, anon;
grant execute on function public.workspace_show_limit(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cover art storage. Public bucket; files live under <workspace_id>/<show_id>/.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('show-artwork', 'show-artwork', true, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_edit_storage_folder(object_name text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  ws uuid;
begin
  begin
    ws := split_part(object_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.has_workspace_role(ws, 'editor');
end;
$$;
grant execute on function public.can_edit_storage_folder(text) to authenticated;

drop policy if exists "show-artwork: editors upload" on storage.objects;
create policy "show-artwork: editors upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'show-artwork' and public.can_edit_storage_folder(name));
drop policy if exists "show-artwork: editors replace" on storage.objects;
create policy "show-artwork: editors replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'show-artwork' and public.can_edit_storage_folder(name))
  with check (bucket_id = 'show-artwork' and public.can_edit_storage_folder(name));
drop policy if exists "show-artwork: editors delete" on storage.objects;
create policy "show-artwork: editors delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'show-artwork' and public.can_edit_storage_folder(name));
