CREATE TYPE reminder_type AS ENUM (
  'payment_wait_ending',
  'complaint_deadline_warning',
  'limitation_final_warning'
);

CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  advocate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reminder_type reminder_type NOT NULL,
  trigger_date DATE NOT NULL,
  status reminder_status DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advocates manage own reminders"
  ON public.reminders FOR ALL
  USING (auth.uid() = advocate_id);
