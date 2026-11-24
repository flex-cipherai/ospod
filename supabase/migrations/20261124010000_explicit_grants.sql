-- Ospod: explicit table and function privileges.
--
-- Newer Supabase projects don't automatically grant table access to the `anon` and
-- `authenticated` roles. Row level security (in the first migration) decides WHICH
-- rows someone can see; these grants decide WHETHER the role may use the table at all.
-- `anon` (signed-out visitors) gets nothing. Safe to run more than once.

grant usage on schema public to authenticated;

-- profiles: read (RLS limits to self/teammates); edit own name and avatar only.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- workspaces: read and delete (RLS: members / owner); create; rename only.
grant select, delete on public.workspaces to authenticated;
grant insert (name, owner_id) on public.workspaces to authenticated;
grant update (name) on public.workspaces to authenticated;

-- workspace_members: read, add, remove; change role only.
grant select, insert, delete on public.workspace_members to authenticated;
grant update (role) on public.workspace_members to authenticated;

-- shows and episodes: full access, limited by RLS to the workspace's editors.
grant select, insert, update, delete on public.shows to authenticated;
grant select, insert, update, delete on public.episodes to authenticated;

-- audit log: super admins only (RLS), append-only.
grant select, insert on public.admin_audit_log to authenticated;
grant usage on all sequences in schema public to authenticated;

-- Helper functions used inside the row level security policies.
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.has_workspace_role(uuid, public.member_role) to authenticated;
grant execute on function public.show_workspace(uuid) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
