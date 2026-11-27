-- Ospod Milestone 3 (part 1): public feeds, publishing, download counting, directory listings.

-- ---------------------------------------------------------------------------
-- Shows: when the Ospod feed went live, and (for imported shows) the move from the old host
-- ---------------------------------------------------------------------------
alter table public.shows
  add column if not exists feed_live_at       timestamptz,
  add column if not exists owner_verified_at  timestamptz,
  add column if not exists migrated_at        timestamptz;

-- ---------------------------------------------------------------------------
-- Where the show is listed (Apple Podcasts, Spotify, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.show_platforms (
  show_id    uuid not null references public.shows (id) on delete cascade,
  platform   text not null check (platform in
               ('apple', 'spotify', 'youtube_music', 'amazon', 'iheart', 'pocket_casts', 'podcast_index', 'deezer')),
  status     text not null default 'submitted' check (status in ('submitted', 'live')),
  url        text,
  updated_at timestamptz not null default now(),
  primary key (show_id, platform)
);
alter table public.show_platforms enable row level security;

drop policy if exists "platforms: members read" on public.show_platforms;
create policy "platforms: members read" on public.show_platforms
  for select to authenticated using (public.has_workspace_role(public.show_workspace(show_id), 'viewer') or public.is_super_admin());
drop policy if exists "platforms: editors write" on public.show_platforms;
create policy "platforms: editors write" on public.show_platforms
  for all to authenticated
  using (public.has_workspace_role(public.show_workspace(show_id), 'editor'))
  with check (public.has_workspace_role(public.show_workspace(show_id), 'editor'));
grant select, insert, update, delete on public.show_platforms to authenticated;
grant all on public.show_platforms to service_role;

-- ---------------------------------------------------------------------------
-- Downloads: one row per request for an episode's audio. Counted later with
-- IAB-style rules (one per listener per episode per day, bots excluded).
-- ---------------------------------------------------------------------------
create table if not exists public.episode_downloads (
  id           bigint generated always as identity primary key,
  episode_id   uuid not null references public.episodes (id) on delete cascade,
  show_id      uuid not null references public.shows (id) on delete cascade,
  -- Salted hash of the listener's IP address: lets us count unique listeners without storing IPs.
  listener     text not null,
  user_agent   text,
  country      text,
  range_start  bigint,
  created_at   timestamptz not null default now()
);
create index if not exists episode_downloads_show_idx on public.episode_downloads (show_id, created_at desc);
create index if not exists episode_downloads_episode_idx on public.episode_downloads (episode_id, created_at desc);

alter table public.episode_downloads enable row level security;
drop policy if exists "downloads: members read" on public.episode_downloads;
create policy "downloads: members read" on public.episode_downloads
  for select to authenticated using (public.has_workspace_role(public.show_workspace(show_id), 'viewer') or public.is_super_admin());
grant select on public.episode_downloads to authenticated;
grant all on public.episode_downloads to service_role;

-- ---------------------------------------------------------------------------
-- Public reads. Podcast apps aren't signed in, so these run with definer rights
-- and return only what a public feed may show.
-- ---------------------------------------------------------------------------

-- A show whose feed is public: new shows once their first episode is published,
-- imported shows once their owner has verified them.
create or replace function public.feed_is_public(s public.shows)
returns boolean language sql stable set search_path = ''
as $$
  select s.status <> 'archived'
     and s.feed_live_at is not null
     and (s.imported_from_feed is null or s.owner_verified_at is not null);
$$;

-- Everything an RSS feed needs, or null if the feed isn't public.
create or replace function public.public_feed(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'show', jsonb_build_object(
      'id', s.id, 'title', s.title, 'description', s.description, 'author', s.author,
      'owner_email', s.owner_email, 'language', s.language, 'category', s.category,
      'subcategory', s.subcategory, 'explicit', s.explicit, 'artwork_url', s.artwork_url,
      'website_url', s.website_url, 'copyright', s.copyright, 'show_type', s.show_type,
      'feed_slug', s.feed_slug, 'updated_at', s.updated_at),
    'episodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'guid', e.guid, 'title', e.title, 'description', e.description,
        'published_at', e.published_at, 'episode_type', e.episode_type,
        'season_number', e.season_number, 'episode_number', e.episode_number,
        'explicit', e.explicit, 'duration_seconds', e.duration_seconds,
        'artwork_url', e.artwork_url, 'link', e.link,
        'audio_bytes', coalesce(case when e.audio_key is not null then e.audio_bytes end, e.audio_bytes),
        'has_chapters', jsonb_array_length(e.chapters) > 0,
        'has_transcript', exists (select 1 from public.episode_transcripts t where t.episode_id = e.id)
      ) order by e.published_at desc)
      from public.episodes e
      where e.show_id = s.id
        and e.status in ('published', 'scheduled')
        and e.published_at <= now()
        and (e.audio_key is not null or e.source_media_url is not null or e.audio_url is not null)
    ), '[]'::jsonb)
  )
  from public.shows s
  where s.feed_slug::text = lower(p_slug) and public.feed_is_public(s);
$$;

-- Records a download and says where the audio is. Returns nothing for episodes that aren't public.
create or replace function public.record_download(
  p_episode uuid, p_listener text, p_user_agent text, p_country text, p_range_start bigint
)
returns table (audio_key text, source_url text)
language plpgsql security definer set search_path = ''
as $$
declare
  ep record;
begin
  select e.id, e.show_id, e.audio_key, coalesce(e.source_media_url, e.audio_url) as source
  into ep
  from public.episodes e
  join public.shows s on s.id = e.show_id
  where e.id = p_episode
    and e.status in ('published', 'scheduled')
    and e.published_at <= now()
    and public.feed_is_public(s);
  if not found then
    return;
  end if;

  insert into public.episode_downloads (episode_id, show_id, listener, user_agent, country, range_start)
  values (ep.id, ep.show_id, left(p_listener, 64), left(p_user_agent, 400), left(p_country, 2), p_range_start);

  return query select ep.audio_key, ep.source;
end;
$$;

-- Chapters and transcript of a public episode (for podcast:chapters / podcast:transcript).
create or replace function public.public_episode_extras(p_episode uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'title', e.title,
    'chapters', e.chapters,
    'segments', (select t.segments from public.episode_transcripts t where t.episode_id = e.id)
  )
  from public.episodes e
  join public.shows s on s.id = e.show_id
  where e.id = p_episode
    and e.status in ('published', 'scheduled')
    and e.published_at <= now()
    and public.feed_is_public(s);
$$;

revoke execute on function public.feed_is_public(public.shows) from public, anon;
grant execute on function public.feed_is_public(public.shows) to authenticated, service_role;
grant execute on function public.public_feed(text) to anon, authenticated, service_role;
grant execute on function public.record_download(uuid, text, text, text, bigint) to anon, authenticated, service_role;
grant execute on function public.public_episode_extras(uuid) to anon, authenticated, service_role;
