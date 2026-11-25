-- Ospod Milestone 2: uploading episodes, processing them, transcripts, AI drafts, usage tracking.

-- ---------------------------------------------------------------------------
-- Episodes: where the upload is and how far processing has got
-- ---------------------------------------------------------------------------
alter table public.episodes
  add column if not exists media_kind             text check (media_kind in ('audio', 'video')),
  -- Storage keys in the private media bucket (Cloudflare R2).
  add column if not exists original_key           text,
  add column if not exists original_filename      text,
  add column if not exists original_bytes         bigint,
  add column if not exists original_mime          text,
  add column if not exists upload_id              text,
  add column if not exists audio_key              text,
  add column if not exists processing_stage       text check (processing_stage in
                             ('uploading', 'queued', 'preparing', 'transcribing', 'writing', 'ready', 'failed')),
  add column if not exists processing_error       text,
  add column if not exists processing_run_id      text,
  add column if not exists processing_started_at  timestamptz,
  add column if not exists processing_finished_at timestamptz,
  -- True while the title is still the file name, so the AI's best title can replace it.
  add column if not exists title_auto             boolean not null default false,
  -- [{ "start": seconds, "title": "..." }]
  add column if not exists chapters               jsonb not null default '[]'::jsonb;

create index if not exists episodes_processing_idx on public.episodes (processing_stage)
  where processing_stage is not null and processing_stage not in ('ready', 'failed');

-- ---------------------------------------------------------------------------
-- Transcripts and AI drafts (written by the processing pipeline only)
-- ---------------------------------------------------------------------------
create table if not exists public.episode_transcripts (
  episode_id uuid primary key references public.episodes (id) on delete cascade,
  language   text,
  text       text not null,
  -- [{ "start": s, "end": s, "speaker": n, "text": "..." }]
  segments   jsonb not null default '[]'::jsonb,
  speakers   integer,
  provider   text not null default 'deepgram',
  created_at timestamptz not null default now()
);

create table if not exists public.episode_ai_drafts (
  episode_id  uuid primary key references public.episodes (id) on delete cascade,
  titles      jsonb not null default '[]'::jsonb,
  summary     text,
  show_notes  text,
  chapters    jsonb not null default '[]'::jsonb,
  keywords    text[] not null default '{}',
  -- Moments worth clipping, for Milestone 5: [{ "start", "end", "hook", "why" }]
  clip_ideas  jsonb not null default '[]'::jsonb,
  model       text,
  created_at  timestamptz not null default now()
);

alter table public.episode_transcripts enable row level security;
alter table public.episode_ai_drafts   enable row level security;

drop policy if exists "transcripts: members read" on public.episode_transcripts;
create policy "transcripts: members read" on public.episode_transcripts
  for select to authenticated
  using (public.has_workspace_role(public.show_workspace((select show_id from public.episodes e where e.id = episode_id)), 'viewer')
         or public.is_super_admin());

drop policy if exists "ai drafts: members read" on public.episode_ai_drafts;
create policy "ai drafts: members read" on public.episode_ai_drafts
  for select to authenticated
  using (public.has_workspace_role(public.show_workspace((select show_id from public.episodes e where e.id = episode_id)), 'viewer')
         or public.is_super_admin());

grant select on public.episode_transcripts, public.episode_ai_drafts to authenticated;

-- ---------------------------------------------------------------------------
-- Usage: what each workspace consumes (for plan limits and the admin console)
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id           bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  episode_id   uuid references public.episodes (id) on delete set null,
  kind         text not null check (kind in
                 ('upload_bytes', 'processing_seconds', 'transcription_seconds', 'ai_input_tokens', 'ai_output_tokens')),
  quantity     numeric not null,
  detail       text,
  created_at   timestamptz not null default now()
);
create index if not exists usage_events_workspace_idx on public.usage_events (workspace_id, created_at desc);
create index if not exists usage_events_created_idx on public.usage_events (created_at desc);

alter table public.usage_events enable row level security;
drop policy if exists "usage: super admins read" on public.usage_events;
create policy "usage: super admins read" on public.usage_events
  for select to authenticated using (public.is_super_admin());
grant select on public.usage_events to authenticated;

-- Usage totals for the admin console.
create or replace function public.admin_usage(days integer default 30)
returns table (kind text, quantity numeric, episodes bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select u.kind, sum(u.quantity), count(distinct u.episode_id)
  from public.usage_events u
  where u.created_at > now() - make_interval(days => greatest(days, 1))
  group by u.kind;
end;
$$;
revoke execute on function public.admin_usage(integer) from public, anon;
grant execute on function public.admin_usage(integer) to authenticated;

-- Processing jobs across the platform right now, for the admin console.
create or replace function public.admin_processing_summary()
returns table (stage text, episodes bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select e.processing_stage, count(*)
  from public.episodes e
  where e.processing_stage is not null
    and (e.processing_stage not in ('ready', 'failed') or e.processing_finished_at > now() - interval '7 days')
  group by e.processing_stage;
end;
$$;
revoke execute on function public.admin_processing_summary() from public, anon;
grant execute on function public.admin_processing_summary() to authenticated;
