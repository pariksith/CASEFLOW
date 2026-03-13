CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(255),
  enrollment_number VARCHAR(100),
  office_address TEXT,
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);
