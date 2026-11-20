DROP FUNCTION public.story_members(text);
CREATE FUNCTION public.story_members(target text) RETURNS TABLE(user_id uuid,email text,display_name text,role text,has_avatar boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.owns_project(target) THEN RAISE EXCEPTION 'OWNER_REQUIRED'; END IF;
 RETURN QUERY SELECT m.user_id,u.email::text,coalesce(p.display_name,''),m.role,coalesce(p.avatar_path,'')<>'' FROM public.project_members m JOIN auth.users u ON u.id=m.user_id LEFT JOIN public.account_profiles p ON p.user_id=m.user_id WHERE m.project_id=target;
END $$;
REVOKE ALL ON FUNCTION public.story_members(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.story_members(text) TO authenticated;
CREATE FUNCTION public.story_member_avatar(target text,member uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.owns_project(target) THEN RAISE EXCEPTION 'OWNER_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.project_members WHERE project_id=target AND user_id=member) THEN RETURN NULL; END IF;
 RETURN (SELECT avatar_path FROM public.account_profiles WHERE user_id=member);
END $$;
REVOKE ALL ON FUNCTION public.story_member_avatar(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.story_member_avatar(text,uuid) TO authenticated;
-- Project owners may view the profile image of accepted members, without exposing profiles publicly.
CREATE POLICY member_avatar_owner_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='account-avatars' AND EXISTS(SELECT 1 FROM public.project_members m WHERE m.user_id::text=(storage.foldername(name))[1] AND public.owns_project(m.project_id)));
