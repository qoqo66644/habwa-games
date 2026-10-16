CREATE TABLE IF NOT EXISTS public.played_questions_backup_20260930 AS SELECT * FROM public.played_questions;
GRANT ALL ON public.played_questions_backup_20260930 TO service_role;
ALTER TABLE public.played_questions_backup_20260930 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.played_questions_backup_20260930 IS 'Backup of played history before assigning legacy rows to the PIN admin identity.';