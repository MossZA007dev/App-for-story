CREATE TABLE public.project_invitations(id text PRIMARY KEY,project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,token_hash text NOT NULL UNIQUE,role text NOT NULL CHECK(role IN('reader','editor')),created_by uuid NOT NULL DEFAULT auth.uid(),expires_at timestamptz NOT NULL,revoked boolean NOT NULL DEFAULT false,accepted_by uuid REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_invitations FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.project_invitations TO authenticated;
CREATE POLICY manage_invites ON public.project_invitations FOR ALL TO authenticated USING(public.owns_project(project_id)) WITH CHECK(public.owns_project(project_id) AND created_by=auth.uid());
CREATE FUNCTION public.accept_story_invitation(secret_hash text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE invitation public.project_invitations; actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT * INTO invitation FROM public.project_invitations WHERE token_hash=secret_hash FOR UPDATE;
 IF NOT FOUND OR invitation.revoked OR invitation.expires_at<=now() THEN RAISE EXCEPTION 'INVITATION_UNAVAILABLE'; END IF;
 IF invitation.accepted_by IS NOT NULL AND invitation.accepted_by<>actor THEN RAISE EXCEPTION 'INVITATION_USED'; END IF;
 IF invitation.accepted_by=actor THEN RETURN invitation.project_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=invitation.project_id AND owner_id=actor) THEN
 INSERT INTO public.project_members(id,project_id,user_id,role,created_at) VALUES(gen_random_uuid()::text,invitation.project_id,actor,invitation.role,now()::text) ON CONFLICT(project_id,user_id) DO NOTHING;
 END IF;
 UPDATE public.project_invitations SET accepted_by=actor WHERE id=invitation.id;
 RETURN invitation.project_id;
END $$;
REVOKE ALL ON FUNCTION public.accept_story_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_story_invitation(text) TO authenticated;
CREATE FUNCTION public.story_members(target text) RETURNS TABLE(user_id uuid,email text,display_name text,role text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.owns_project(target) THEN RAISE EXCEPTION 'OWNER_REQUIRED'; END IF;
 RETURN QUERY SELECT m.user_id,u.email::text,coalesce(p.display_name,''),m.role FROM public.project_members m JOIN auth.users u ON u.id=m.user_id LEFT JOIN public.account_profiles p ON p.user_id=m.user_id WHERE m.project_id=target;
END $$;
REVOKE ALL ON FUNCTION public.story_members(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.story_members(text) TO authenticated;
CREATE TABLE public.media_asset_projects(asset_id text NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,PRIMARY KEY(asset_id,project_id));
ALTER TABLE public.media_asset_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_asset_projects FROM anon;
GRANT SELECT,INSERT,DELETE ON public.media_asset_projects TO authenticated;
CREATE POLICY media_grant_read ON public.media_asset_projects FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY media_grant_insert ON public.media_asset_projects FOR INSERT TO authenticated WITH CHECK(public.can_write_project(project_id) AND EXISTS(SELECT 1 FROM public.media_assets a WHERE a.id=asset_id AND a.owner_id=auth.uid()));
CREATE POLICY media_grant_delete ON public.media_asset_projects FOR DELETE TO authenticated USING(public.owns_project(project_id));
CREATE OR REPLACE FUNCTION public.can_read_asset(target text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.media_assets a WHERE a.id=target AND (a.owner_id=auth.uid() OR public.can_read_project(a.project_id) OR EXISTS(SELECT 1 FROM public.media_asset_projects g WHERE g.asset_id=a.id AND public.can_read_project(g.project_id)) OR EXISTS(SELECT 1 FROM public.characters c WHERE c.avatar_url='/api/images/'||a.id AND public.can_read_project(c.project_id))));
$$;
REVOKE ALL ON FUNCTION public.can_read_asset(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_asset(text) TO authenticated;
DROP POLICY asset_read ON public.media_assets;
CREATE POLICY asset_read ON public.media_assets FOR SELECT TO authenticated USING(public.can_read_asset(id));
DROP POLICY asset_delete ON public.media_assets;
CREATE POLICY asset_delete ON public.media_assets FOR DELETE TO authenticated USING(owner_id=auth.uid());
DROP POLICY story_download ON storage.objects;
CREATE POLICY story_download ON storage.objects FOR SELECT TO authenticated USING(bucket_id='story-media' AND EXISTS(SELECT 1 FROM public.media_assets a WHERE a.storage_path=name));
