CREATE TYPE case_stage AS ENUM (
  'drafting',
  'notice_generated',
  'notice_served',
  'waiting_period',
  'complaint_eligible',
  'limitation_warning',
  'complaint_filed',
  'closed'
);

CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advocate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  case_type VARCHAR(50) NOT NULL DEFAULT 'cheque_bounce',
  case_number VARCHAR(100),
  stage case_stage NOT NULL DEFAULT 'drafting',
  jurisdiction_city VARCHAR(255),
  notice_sent_date DATE,
  notice_served_date DATE,
  complaint_deadline DATE,
  waiting_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advocates manage own cases"
  ON public.cases FOR ALL
  USING (auth.uid() = advocate_id);
