CREATE TABLE IF NOT EXISTS public.case_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  cheque_signed_by_drawer BOOLEAN,
  statutory_notice_already_sent BOOLEAN,
  part_payment_made BOOLEAN,
  part_payment_amount NUMERIC(12,2),
  written_admission_available BOOLEAN,
  notice_delivery_mode VARCHAR(20) CHECK (notice_delivery_mode IN ('post', 'hand', 'email', 'unknown')),
  raw_story TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advocates manage own case facts"
  ON public.case_facts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_facts.case_id
      AND cases.advocate_id = auth.uid()
    )
  );
