-- Multi-case-type support
-- The cheque-bounce flow keeps using case_financials + columnar case_facts.
-- Non-cheque case types store their structured data in JSONB columns below.

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_metadata JSONB;

ALTER TABLE public.case_facts
  ADD COLUMN IF NOT EXISTS answers JSONB;

-- Allow new case types in the existing string column. case_type stays VARCHAR(50).
-- (No CHECK constraint exists on case_type, so no further DDL needed there.)

-- Helpful index for filtering by case type
CREATE INDEX IF NOT EXISTS idx_cases_case_type ON public.cases(case_type);

-- New reminder types for non-cheque flows
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'eviction_notice_expiry';
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'consumer_response_window';
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'mact_limitation_warning';
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'recovery_notice_expiry';
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'dv_hearing_reminder';
