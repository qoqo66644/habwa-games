CREATE TABLE public.categories (
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
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can write categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.questions (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (200, 400, 600)),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  image_url TEXT,
  answer_image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read questions" ON public.questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can write questions" ON public.questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_questions_category ON public.questions(category_id);
CREATE INDEX idx_questions_level ON public.questions(level);

CREATE TABLE public.activation_keys (
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
CREATE POLICY "Public can read activation keys" ON public.activation_keys FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can write activation keys" ON public.activation_keys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_activation_keys_active ON public.activation_keys(is_active) WHERE is_active = true;

CREATE TABLE public.played_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT UNIQUE NOT NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.played_questions TO anon, authenticated;
GRANT ALL ON public.played_questions TO service_role;
ALTER TABLE public.played_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read played questions" ON public.played_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can write played questions" ON public.played_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.activation_keys (key, is_active, remaining_uses) VALUES
  ('HABWA-2024', true, 999),
  ('HABWA-PREMIUM', true, 999),
  ('HABWA-DEMO', true, 5);