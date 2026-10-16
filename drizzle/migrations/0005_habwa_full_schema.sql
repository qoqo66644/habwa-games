CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon_key TEXT DEFAULT 'Star',
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can write categories" ON public.categories;
CREATE POLICY "Public can write categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (200, 400, 600)),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  image_url TEXT,
  answer_image_url TEXT,
  video_url TEXT,
  answer_video_url TEXT,
  qr_enabled BOOLEAN NOT NULL DEFAULT false,
  qr_token UUID NOT NULL DEFAULT gen_random_uuid(),
  qr_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read questions" ON public.questions;
CREATE POLICY "Public can read questions" ON public.questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can write questions" ON public.questions;
CREATE POLICY "Public can write questions" ON public.questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_level ON public.questions(level);
CREATE UNIQUE INDEX IF NOT EXISTS questions_qr_token_key ON public.questions (qr_token);

CREATE TABLE IF NOT EXISTS public.activation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  remaining_uses INTEGER NOT NULL DEFAULT 999,
  used_question_ids TEXT[] NOT NULL DEFAULT '{}',
  help_pit_used BOOLEAN NOT NULL DEFAULT false,
  help_call_used BOOLEAN NOT NULL DEFAULT false,
  help_two_answers_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_keys TO anon, authenticated;
GRANT ALL ON public.activation_keys TO service_role;
ALTER TABLE public.activation_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read activation keys" ON public.activation_keys;
CREATE POLICY "Public can read activation keys" ON public.activation_keys FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can write activation keys" ON public.activation_keys;
CREATE POLICY "Public can write activation keys" ON public.activation_keys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_activation_keys_active ON public.activation_keys(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.played_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT UNIQUE NOT NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.played_questions TO anon, authenticated;
GRANT ALL ON public.played_questions TO service_role;
ALTER TABLE public.played_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read played questions" ON public.played_questions;
CREATE POLICY "Public can read played questions" ON public.played_questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can write played questions" ON public.played_questions;
CREATE POLICY "Public can write played questions" ON public.played_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.activation_keys (key, is_active, remaining_uses) VALUES
  ('HABWA-2024', true, 999),
  ('HABWA-PREMIUM', true, 999),
  ('HABWA-DEMO', true, 5)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  pin TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_key TEXT NOT NULL REFERENCES public.activation_keys(key) ON UPDATE CASCADE ON DELETE CASCADE,
  game_name TEXT NOT NULL DEFAULT 'لعبة حبوة',
  selected_categories TEXT[] NOT NULL DEFAULT '{}',
  active_board JSONB NOT NULL DEFAULT '{}'::jsonb,
  team_names TEXT[] NOT NULL DEFAULT '{}',
  starting_team_index INTEGER NOT NULL DEFAULT 0 CHECK (starting_team_index IN (0, 1)),
  replay_count INTEGER NOT NULL DEFAULT 0 CHECK (replay_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_sessions_key_created ON public.game_sessions(activation_key, created_at DESC);
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.start_habwa_game(
  p_key TEXT,
  p_game_name TEXT,
  p_selected_categories TEXT[],
  p_active_board JSONB,
  p_team_names TEXT[],
  p_starting_team_index INTEGER
)
RETURNS TABLE(game_id UUID, remaining_uses INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT := upper(trim(p_key));
  v_remaining INTEGER;
  v_game_id UUID;
BEGIN
  SELECT ak.remaining_uses
    INTO v_remaining
    FROM public.activation_keys AS ak
   WHERE ak.key = v_key
     AND ak.is_active = true
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_ACTIVATION_KEY';
  END IF;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'NO_REMAINING_GAMES';
  END IF;

  INSERT INTO public.game_sessions (
    activation_key, game_name, selected_categories, active_board,
    team_names, starting_team_index
  ) VALUES (
    v_key, COALESCE(NULLIF(p_game_name, ''), 'لعبة حبوة'),
    COALESCE(p_selected_categories, '{}'), COALESCE(p_active_board, '{}'::jsonb),
    COALESCE(p_team_names, '{}'), COALESCE(p_starting_team_index, 0)
  )
  RETURNING id INTO v_game_id;

  UPDATE public.activation_keys AS ak
     SET remaining_uses = ak.remaining_uses - 1
   WHERE ak.key = v_key;

  RETURN QUERY SELECT v_game_id, v_remaining - 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.replay_habwa_game(p_key TEXT, p_game_id UUID)
RETURNS SETOF public.game_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT := upper(trim(p_key));
BEGIN
  UPDATE public.game_sessions
     SET replay_count = replay_count + 1,
         updated_at = now()
   WHERE id = p_game_id
     AND activation_key = v_key;

  RETURN QUERY
  SELECT * FROM public.game_sessions
   WHERE id = p_game_id
     AND activation_key = v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_habwa_games(p_key TEXT)
RETURNS SETOF public.game_sessions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gs.*
    FROM public.game_sessions gs
   WHERE gs.activation_key = upper(trim(p_key))
   ORDER BY gs.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.start_habwa_game(TEXT, TEXT, TEXT[], JSONB, TEXT[], INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replay_habwa_game(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_habwa_games(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_habwa_qr_content(p_token uuid)
RETURNS TABLE (
  answer text,
  answer_image_url text,
  answer_video_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.answer, q.answer_image_url, q.answer_video_url
  FROM public.questions AS q
  WHERE q.qr_token = p_token
    AND q.qr_enabled = true
    AND (q.qr_expires_at IS NULL OR q.qr_expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_habwa_qr_content(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_habwa_qr_content(uuid) TO anon, authenticated, service_role;
