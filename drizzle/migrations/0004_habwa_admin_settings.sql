CREATE TABLE public.admin_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  pin TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;