ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS answer_video_url TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS qr_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS qr_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS qr_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS questions_qr_token_key
  ON public.questions (qr_token);

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

COMMENT ON COLUMN public.questions.qr_token IS 'Unpredictable public lookup token used only for QR answer content.';
COMMENT ON COLUMN public.questions.qr_expires_at IS 'Optional expiry for public QR answer access.';
COMMENT ON FUNCTION public.get_habwa_qr_content(uuid) IS 'Returns only answer content for a valid enabled, unexpired QR token.';