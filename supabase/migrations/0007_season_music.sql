-- Additive soundtrack inheritance; existing scene music and RLS policies stay intact.
ALTER TABLE public.parts ADD COLUMN bgm_url text NOT NULL DEFAULT '';
ALTER TABLE public.parts ADD COLUMN bgm_title text NOT NULL DEFAULT '';
ALTER TABLE public.episodes ADD COLUMN bgm_mode text NOT NULL DEFAULT 'inherit' CHECK (bgm_mode IN ('inherit','custom','silent'));
ALTER TABLE public.episodes ADD COLUMN bgm_url text NOT NULL DEFAULT '';
ALTER TABLE public.episodes ADD COLUMN bgm_title text NOT NULL DEFAULT '';
