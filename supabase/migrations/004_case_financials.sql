CREATE TABLE IF NOT EXISTS public.case_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  cheque_number VARCHAR(50) NOT NULL,
  cheque_date DATE NOT NULL,
  cheque_amount NUMERIC(12,2) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  dishonour_reason VARCHAR(255) NOT NULL,
  return_memo_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advocates manage own case financials"
  ON public.case_financials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_financials.case_id
      AND cases.advocate_id = auth.uid()
    )
  );
