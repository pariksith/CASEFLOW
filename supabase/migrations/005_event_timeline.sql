CREATE TABLE IF NOT EXISTS public.event_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_date VARCHAR(50),
  event_description TEXT NOT NULL,
  is_approximate BOOLEAN DEFAULT false,
  sequence_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.event_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advocates manage own timelines"
  ON public.event_timeline FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = event_timeline.case_id
      AND cases.advocate_id = auth.uid()
    )
  );
