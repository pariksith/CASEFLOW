CREATE TABLE IF NOT EXISTS public.case_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'opposite_party')),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advocates manage own case parties"
  ON public.case_parties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_parties.case_id
      AND cases.advocate_id = auth.uid()
    )
  );
