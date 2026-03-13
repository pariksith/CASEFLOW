CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('legal_notice', 'complaint', 'affidavit')),
  file_name VARCHAR(255),
  file_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advocates manage own documents"
  ON public.generated_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = generated_documents.case_id
      AND cases.advocate_id = auth.uid()
    )
  );
