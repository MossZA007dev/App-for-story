CREATE OR REPLACE FUNCTION public.can_read_project(target text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.projects p WHERE p.id=target AND (p.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.project_members m WHERE m.project_id=p.id AND m.user_id=auth.uid())));
$$;
CREATE OR REPLACE FUNCTION public.can_write_project(target text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.projects p WHERE p.id=target AND (p.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.project_members m WHERE m.project_id=p.id AND m.user_id=auth.uid() AND m.role='editor')));
$$;
CREATE OR REPLACE FUNCTION public.owns_project(target text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.projects WHERE id=target AND owner_id=auth.uid()); $$;
REVOKE ALL ON FUNCTION public.can_read_project(text),public.can_write_project(text),public.owns_project(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_project(text),public.can_write_project(text),public.owns_project(text) TO authenticated;
CREATE UNIQUE INDEX project_members_unique_user ON public.project_members(project_id,user_id);
CREATE UNIQUE INDEX media_assets_unique_path ON public.media_assets(storage_path);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['projects','characters','abilities','relationships','parts','episodes','scenes','scene_versions','change_logs','continuity_ledgers','images','collaborators','sound_effects','app_settings','project_members','media_assets','private_documents','scene_narrations','reading_progress'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
 END LOOP;
END $$;
CREATE POLICY project_read ON public.projects FOR SELECT TO authenticated USING(public.can_read_project(id));
CREATE POLICY project_insert ON public.projects FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid());
CREATE POLICY project_update ON public.projects FOR UPDATE TO authenticated USING(public.can_write_project(id)) WITH CHECK(public.can_write_project(id));
CREATE POLICY project_delete ON public.projects FOR DELETE TO authenticated USING(owner_id=auth.uid());
-- An editor cannot change the owner to another account via direct REST calls.
CREATE OR REPLACE FUNCTION public.keep_project_owner() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN IF NEW.owner_id<>OLD.owner_id THEN RAISE EXCEPTION 'Ownership transfer is not enabled'; END IF; RETURN NEW; END $$;
CREATE TRIGGER keep_project_owner BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.keep_project_owner();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['characters','parts','sound_effects'] LOOP
  EXECUTE format('CREATE POLICY read_access ON public.%I FOR SELECT TO authenticated USING(public.can_read_project(project_id))',t);
  EXECUTE format('CREATE POLICY write_access ON public.%I FOR ALL TO authenticated USING(public.can_write_project(project_id)) WITH CHECK(public.can_write_project(project_id))',t);
 END LOOP;
END $$;
CREATE POLICY member_read ON public.project_members FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY member_write ON public.project_members FOR ALL TO authenticated USING(public.owns_project(project_id)) WITH CHECK(public.owns_project(project_id));
CREATE POLICY episode_read ON public.episodes FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY episode_write ON public.episodes FOR ALL TO authenticated USING(public.can_write_project(project_id)) WITH CHECK(public.can_write_project(project_id) AND EXISTS(SELECT 1 FROM public.parts p WHERE p.id=part_id AND p.project_id=episodes.project_id));
CREATE POLICY scene_read ON public.scenes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.parts p WHERE p.id=part_id AND public.can_read_project(p.project_id)));
CREATE POLICY scene_write ON public.scenes FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.parts p WHERE p.id=part_id AND public.can_write_project(p.project_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.parts p WHERE p.id=part_id AND public.can_write_project(p.project_id)) AND (episode_id IS NULL OR EXISTS(SELECT 1 FROM public.episodes e WHERE e.id=episode_id AND e.part_id=scenes.part_id)));
CREATE POLICY version_read ON public.scene_versions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND public.can_read_project(p.project_id)));
CREATE POLICY version_write ON public.scene_versions FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND public.can_write_project(p.project_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND public.can_write_project(p.project_id)));
CREATE POLICY ability_read ON public.abilities FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND public.can_read_project(c.project_id)));
CREATE POLICY ability_write ON public.abilities FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND public.can_write_project(c.project_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND public.can_write_project(c.project_id)));
CREATE POLICY change_read ON public.change_logs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.parts p WHERE p.id=part_id AND public.can_read_project(p.project_id)));
CREATE POLICY change_write ON public.change_logs FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.parts p WHERE p.id=part_id AND public.can_write_project(p.project_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.parts p JOIN public.characters c ON c.project_id=p.project_id WHERE p.id=part_id AND c.id=character_id AND public.can_write_project(p.project_id)));
CREATE POLICY relationship_read ON public.relationships FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY relationship_write ON public.relationships FOR ALL TO authenticated USING(public.can_write_project(project_id)) WITH CHECK(public.can_write_project(project_id) AND EXISTS(SELECT 1 FROM public.characters c WHERE c.id=char_a AND c.project_id=relationships.project_id) AND EXISTS(SELECT 1 FROM public.characters c WHERE c.id=char_b AND c.project_id=relationships.project_id));
CREATE POLICY image_read ON public.images FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY image_write ON public.images FOR ALL TO authenticated USING(public.can_write_project(project_id)) WITH CHECK(public.can_write_project(project_id) AND (scene_id IS NULL OR EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND p.project_id=images.project_id)) AND (character_id IS NULL OR EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.project_id=images.project_id)));
CREATE POLICY collab_read ON public.collaborators FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY collab_write ON public.collaborators FOR ALL TO authenticated USING(public.can_write_project(project_id)) WITH CHECK(public.can_write_project(project_id) AND (character_id IS NULL OR EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.project_id=collaborators.project_id)));
CREATE POLICY ledger_read ON public.continuity_ledgers FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY ledger_write ON public.continuity_ledgers FOR ALL TO authenticated USING(public.can_write_project(project_id)) WITH CHECK(public.can_write_project(project_id) AND (part_id IS NULL OR EXISTS(SELECT 1 FROM public.parts p WHERE p.id=part_id AND p.project_id=continuity_ledgers.project_id)) AND (scene_id IS NULL OR EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND p.project_id=continuity_ledgers.project_id)));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['app_settings','private_documents'] LOOP EXECUTE format('CREATE POLICY account_private ON public.%I FOR ALL TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid())',t); END LOOP; END $$;
CREATE POLICY asset_read ON public.media_assets FOR SELECT TO authenticated USING(owner_id=auth.uid() OR (project_id IS NOT NULL AND public.can_read_project(project_id)));
CREATE POLICY asset_insert ON public.media_assets FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid() AND storage_path LIKE auth.uid()::text||'/%' AND (project_id IS NULL OR public.can_write_project(project_id)));
CREATE POLICY asset_delete ON public.media_assets FOR DELETE TO authenticated USING(owner_id=auth.uid() OR public.can_write_project(project_id));
CREATE POLICY narration_read ON public.scene_narrations FOR SELECT TO authenticated USING(public.can_read_project(project_id));
CREATE POLICY narration_write ON public.scene_narrations FOR ALL TO authenticated USING(public.can_write_project(project_id)) WITH CHECK(public.can_write_project(project_id) AND EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND p.project_id=scene_narrations.project_id));
CREATE POLICY progress_private ON public.reading_progress FOR ALL TO authenticated USING(user_id=auth.uid() AND public.can_read_project(project_id)) WITH CHECK(user_id=auth.uid() AND public.can_read_project(project_id) AND block_index>=0 AND EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND p.project_id=reading_progress.project_id));
