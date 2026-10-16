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

CREATE INDEX IF NOT EXISTS idx_game_sessions_key_created
  ON public.game_sessions(activation_key, created_at DESC);

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