-- Ospod: initial schema (Milestone 0)
--
-- Accounts, workspaces (the billing unit), team members, shows and episodes,
-- plus the super admin role and the functions behind the admin console.
--
-- Security model
--   * Row level security on every table. People only see workspaces they belong to.
--   * Super admins (profiles.platform_role = 'super_admin') can read everything.
--     Nobody can make themselves a super admin from the app: that column can only
--     be changed from the Supabase SQL editor (see README, "Make yourself super admin").
--   * Plan and billing columns can only be written by the server (service role),
--     never by a signed-in user.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.platform_role  as enum ('user', 'super_admin');
create type public.plan_tier      as enum ('starter', 'creator', 'pro', 'studio', 'network');
create type public.plan_status    as enum ('trialing', 'active', 'past_due', 'canceled');
-- Declared from most to least powerful, so "role <= 'editor'" means "editor or above".
create type public.member_role    as enum ('owner', 'admin', 'editor', 'viewer');
create type public.show_format    as enum ('audio', 'video');
create type public.show_status    as enum ('draft', 'active', 'archived');
create type public.episode_status as enum ('draft', 'processing', 'scheduled', 'published', 'failed');
create type public.episode_type   as enum ('full', 'trailer', 'bonus');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         extensions.citext not null,
  full_name     text check (char_length(full_name) <= 120),
  avatar_url    text,
  platform_role public.platform_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (email);

create table public.workspaces (
  id                         uuid primary key default gen_random_uuid(),
  name                       text not null check (char_length(name) between 1 and 80),
  owner_id                   uuid not null references public.profiles (id) on delete restrict,
  plan                       public.plan_tier   not null default 'starter',
  plan_status                public.plan_status not null default 'trialing',
  billing_interval           text not null default 'month' check (billing_interval in ('month', 'year')),
  trial_ends_at              timestamptz default (now() + interval '14 days'),
  current_period_end         timestamptz,
  -- First 500 waitlist signups: 50% off for life (applied in billing, Milestone 6).
  founding_member            boolean not null default false,
  paystack_customer_code     text,
  paystack_subscription_code text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index workspaces_owner_idx on public.workspaces (owner_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         public.member_role not null default 'editor',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.shows (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 200),
  description        text,
  author             text,
  owner_email        extensions.citext,
  language           text not null default 'en',
  category           text,
  explicit           boolean not null default false,
  artwork_url        text,
  format             public.show_format not null default 'audio',
  -- Public feed address: https://feeds.ospod.io/<feed_slug>. Permanent once published.
  feed_slug          extensions.citext not null unique
                     check (feed_slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
  website_url        text,
  imported_from_feed text,
  status             public.show_status not null default 'draft',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index shows_workspace_idx on public.shows (workspace_id);

create table public.episodes (
  id               uuid primary key default gen_random_uuid(),
  show_id          uuid not null references public.shows (id) on delete cascade,
  -- RSS <guid>. Never changes once published, or apps show the episode twice.
  guid             text not null default gen_random_uuid()::text,
  title            text not null check (char_length(title) between 1 and 300),
  description      text,
  episode_type     public.episode_type not null default 'full',
  season_number    integer check (season_number > 0),
  episode_number   integer check (episode_number > 0),
  explicit         boolean,
  status           public.episode_status not null default 'draft',
  publish_at       timestamptz,
  published_at     timestamptz,
  audio_url        text,
  audio_bytes      bigint,
  audio_mime       text,
  video_url        text,
  duration_seconds integer check (duration_seconds >= 0),
  artwork_url      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (show_id, guid)
);
create index episodes_show_published_idx on public.episodes (show_id, published_at desc);
create index episodes_status_idx on public.episodes (status);

create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (used by the policies below)
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and platform_role = 'super_admin'
  );
$$;

-- True when the signed-in user has at least `min_role` in the workspace.
create or replace function public.has_workspace_role(ws uuid, min_role public.member_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role <= min_role
  );
$$;

create or replace function public.show_workspace(show uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select workspace_id from public.shows where id = show;
$$;

create or replace function public.shares_workspace_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at   before update on public.profiles   for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger shows_updated_at      before update on public.shows      for each row execute function public.set_updated_at();
create trigger episodes_updated_at   before update on public.episodes   for each row execute function public.set_updated_at();

-- Whoever owns a workspace is always a member of it.
create or replace function public.add_workspace_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger workspaces_add_owner after insert on public.workspaces
for each row execute function public.add_workspace_owner();

-- New sign-up: create the profile and a first workspace on a 14-day trial.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  display_name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, display_name, new.raw_user_meta_data ->> 'avatar_url');

  insert into public.workspaces (name, owner_id)
  values (left(coalesce(display_name, split_part(new.email, '@', 1)) || '''s workspace', 80), new.id);

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep profiles.email in step when someone changes their email address.
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.shows             enable row level security;
alter table public.episodes          enable row level security;
alter table public.admin_audit_log   enable row level security;

-- profiles
create policy "profiles: read self, teammates, or as super admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id) or public.is_super_admin());
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces
create policy "workspaces: read as member or super admin" on public.workspaces
  for select to authenticated
  using (public.has_workspace_role(id, 'viewer') or public.is_super_admin());
create policy "workspaces: create own" on public.workspaces
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "workspaces: admins rename" on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, 'admin')) with check (public.has_workspace_role(id, 'admin'));
create policy "workspaces: owner deletes" on public.workspaces
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- workspace_members (the owner row is managed by triggers only)
create policy "members: read as member or super admin" on public.workspace_members
  for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer') or public.is_super_admin());
create policy "members: admins add" on public.workspace_members
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin') and role <> 'owner');
create policy "members: admins change roles" on public.workspace_members
  for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin') and role <> 'owner')
  with check (public.has_workspace_role(workspace_id, 'admin') and role <> 'owner');
create policy "members: admins remove, anyone leaves" on public.workspace_members
  for delete to authenticated
  using (role <> 'owner' and (public.has_workspace_role(workspace_id, 'admin') or user_id = (select auth.uid())));

-- shows
create policy "shows: read as member or super admin" on public.shows
  for select to authenticated
  using (public.has_workspace_role(workspace_id, 'viewer') or public.is_super_admin());
create policy "shows: editors create" on public.shows
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'editor'));
create policy "shows: editors update" on public.shows
  for update to authenticated
  using (public.has_workspace_role(workspace_id, 'editor'))
  with check (public.has_workspace_role(workspace_id, 'editor'));
create policy "shows: admins delete" on public.shows
  for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- episodes
create policy "episodes: read as member or super admin" on public.episodes
  for select to authenticated
  using (public.has_workspace_role(public.show_workspace(show_id), 'viewer') or public.is_super_admin());
create policy "episodes: editors create" on public.episodes
  for insert to authenticated
  with check (public.has_workspace_role(public.show_workspace(show_id), 'editor'));
create policy "episodes: editors update" on public.episodes
  for update to authenticated
  using (public.has_workspace_role(public.show_workspace(show_id), 'editor'))
  with check (public.has_workspace_role(public.show_workspace(show_id), 'editor'));
create policy "episodes: editors delete" on public.episodes
  for delete to authenticated
  using (public.has_workspace_role(public.show_workspace(show_id), 'editor'));

-- admin_audit_log
create policy "audit: super admins read" on public.admin_audit_log
  for select to authenticated using (public.is_super_admin());
create policy "audit: super admins write own entries" on public.admin_audit_log
  for insert to authenticated with check (public.is_super_admin() and actor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Column privileges: signed-in users may only write these columns.
-- (platform_role and every plan/billing column are server-only.)
-- ---------------------------------------------------------------------------
revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

revoke insert, update on public.workspaces from anon, authenticated;
grant insert (name, owner_id) on public.workspaces to authenticated;
grant update (name) on public.workspaces to authenticated;

revoke all on public.workspace_members from anon;
revoke update on public.workspace_members from authenticated;
grant update (role) on public.workspace_members to authenticated;

revoke all on public.shows, public.episodes, public.admin_audit_log from anon;
revoke update on public.admin_audit_log from authenticated;
revoke delete on public.admin_audit_log from authenticated;

-- ---------------------------------------------------------------------------
-- Admin console functions (super admins only)
-- ---------------------------------------------------------------------------

-- Platform totals for the admin overview.
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users_total',          (select count(*) from public.profiles),
    'users_new_7d',         (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_new_30d',        (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'users_active_7d',      (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'workspaces_total',     (select count(*) from public.workspaces),
    'shows_total',          (select count(*) from public.shows),
    'episodes_total',       (select count(*) from public.episodes),
    'episodes_published_30d', (select count(*) from public.episodes
                               where status = 'published' and published_at > now() - interval '30 days'),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'plan', plan, 'status', plan_status, 'interval', billing_interval,
        'founding', founding_member, 'count', n))
      from (
        select plan, plan_status, billing_interval, founding_member, count(*) as n
        from public.workspaces
        group by 1, 2, 3, 4
      ) s
    ), '[]'::jsonb),
    'signups_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c.n, 0)) order by d)
      from generate_series((current_date - 29)::timestamp, current_date::timestamp, interval '1 day') d
      left join (
        select created_at::date as day, count(*) as n
        from public.profiles
        where created_at >= current_date - 29
        group by 1
      ) c on c.day = d::date
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Searchable list of everyone on the platform, with their workspace and plan.
create or replace function public.admin_list_users(search text default null, page_size int default 50, page int default 0)
returns table (
  id uuid,
  email text,
  full_name text,
  platform_role public.platform_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  workspace_id uuid,
  workspace_name text,
  plan public.plan_tier,
  plan_status public.plan_status,
  total_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    p.id, p.email::text, p.full_name, p.platform_role, p.created_at,
    u.last_sign_in_at, u.email_confirmed_at is not null,
    w.id, w.name, w.plan, w.plan_status,
    count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select ws.id, ws.name, ws.plan, ws.plan_status
    from public.workspaces ws
    where ws.owner_id = p.id
    order by ws.created_at
    limit 1
  ) w on true
  where search is null or search = ''
     or p.email::text ilike '%' || search || '%'
     or p.full_name ilike '%' || search || '%'
  order by p.created_at desc
  limit least(greatest(page_size, 1), 200)
  offset greatest(page, 0) * least(greatest(page_size, 1), 200);
end;
$$;

revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_list_users(text, int, int) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
