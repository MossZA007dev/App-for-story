CREATE TABLE public.account_profiles (
 user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '' CHECK(char_length(display_name)<=60),
 bio text NOT NULL DEFAULT '' CHECK(char_length(bio)<=300),
 avatar_path text NOT NULL DEFAULT '',
 updated_at text NOT NULL
);
CREATE TABLE public.bookmarks (
 id text PRIMARY KEY,
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 scene_id text REFERENCES public.scenes(id) ON DELETE CASCADE,
 block_index integer NOT NULL DEFAULT 0 CHECK(block_index>=0),
 note text NOT NULL DEFAULT '' CHECK(char_length(note)<=500),
 created_at text NOT NULL
);
CREATE UNIQUE INDEX bookmarks_unique_position ON public.bookmarks(user_id,project_id,coalesce(scene_id,''));
ALTER TABLE public.account_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_profiles,public.bookmarks FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.account_profiles,public.bookmarks TO authenticated;
CREATE POLICY own_profile ON public.account_profiles FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND (avatar_path='' OR avatar_path LIKE auth.uid()::text||'/%'));
CREATE POLICY own_bookmarks ON public.bookmarks FOR ALL TO authenticated USING(user_id=auth.uid() AND public.can_read_project(project_id)) WITH CHECK(user_id=auth.uid() AND public.can_read_project(project_id) AND (scene_id IS NULL OR EXISTS(SELECT 1 FROM public.scenes s JOIN public.parts p ON p.id=s.part_id WHERE s.id=scene_id AND p.project_id=bookmarks.project_id)));
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('account-avatars','account-avatars',false,2097152,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY avatar_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='account-avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY avatar_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='account-avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY avatar_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='account-avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
