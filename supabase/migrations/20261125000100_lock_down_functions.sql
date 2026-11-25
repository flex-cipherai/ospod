-- Ospod: only expose the database functions that are meant to be called.
--
-- Supabase lets every role run new functions by default. Signed-out visitors (anon)
-- may only preview an invite link; trigger functions are callable by nobody.

revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- Trigger functions: run by the database itself, never through the API.
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.handle_user_email_change() from authenticated;
revoke execute on function public.add_workspace_owner() from authenticated;
revoke execute on function public.enforce_show_limit() from authenticated;
revoke execute on function public.set_updated_at() from authenticated;

-- The one function a signed-out visitor needs (to see what an invite link is for).
grant execute on function public.invite_preview(text) to anon;
