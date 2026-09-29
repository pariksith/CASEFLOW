# CaseFlow — Litigation Workflow for Advocates (Comprehensive Documentation)

> Converts a messy client story into a structured legal notice or petition.
> Supports **6 case types** across Indian civil and criminal litigation.

---

## 1. Introduction & Overview

CaseFlow is an AI-powered litigation workflow tool designed specifically for Indian advocates. It streamlines the process of drafting legal notices and petitions by converting a client's unstructured story into a chronological timeline and ultimately into a structured, court-ready legal document.

### Supported Case Types

| Case Type | Act / Law | Document Generated |
|---|---|---|
| **Cheque Bounce** | Section 138, NI Act, 1881 | Legal Notice (demand) |
| **Money Recovery** | Order 37, CPC | Legal Notice (summary suit) |
| **Consumer Complaint** | Consumer Protection Act, 2019 | Legal Notice (pre-complaint) |
| **Rent & Eviction** | Section 106, TP Act / State Rent Acts | Notice to Quit |
| **Motor Accident Claim** | Section 166, MV Act, 1988 | MACT Claim Petition |
| **Domestic Violence** | PWDVA, 2005 | Section 12 Application |

> **AI only writes narrative language. All legal sections, notice periods, and deadlines are hardcoded — never AI-generated.**

---

## 2. Core Architecture

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | OTP via Twilio Verify |
| AI | OpenAI GPT-4o (or compatible) |
| Doc Gen | `docx` npm package (server-side) |
| Email | Resend |
| Hosting | Vercel (with Cron) |

### System Components

1. **Frontend Layer**: Built using Next.js 14. Provides an interactive UI for advocates.
2. **AI Layer**: Connects to OpenAI. Extracts timelines without hallucinating facts.
3. **Database Layer**: Supabase PostgreSQL with strict Row Level Security (RLS).

---

## 3. Database Schema Reference

### Supabase Migrations

The project has several core directories. We will now comprehensively document every single file and its purpose, along with its complete source code for reference.


## Directory: `supabase/migrations`

### File: `supabase\migrations\001_users.sql`

**Description:** Source code for `supabase\migrations\001_users.sql`.

```sql
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

```

### File: `supabase\migrations\002_cases.sql`

**Description:** Source code for `supabase\migrations\002_cases.sql`.

```sql
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

```

### File: `supabase\migrations\003_case_parties.sql`

**Description:** Source code for `supabase\migrations\003_case_parties.sql`.

```sql
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

```

### File: `supabase\migrations\004_case_financials.sql`

**Description:** Source code for `supabase\migrations\004_case_financials.sql`.

```sql
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

```

### File: `supabase\migrations\005_event_timeline.sql`

**Description:** Source code for `supabase\migrations\005_event_timeline.sql`.

```sql
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

```

### File: `supabase\migrations\006_case_facts.sql`

**Description:** Source code for `supabase\migrations\006_case_facts.sql`.

```sql
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

```

### File: `supabase\migrations\007_generated_documents.sql`

**Description:** Source code for `supabase\migrations\007_generated_documents.sql`.

```sql
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

```

### File: `supabase\migrations\008_reminders.sql`

**Description:** Source code for `supabase\migrations\008_reminders.sql`.

```sql
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

```

### File: `supabase\migrations\009_multi_case_support.sql`

**Description:** Source code for `supabase\migrations\009_multi_case_support.sql`.

```sql
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

```


## Directory: `src/types`

### File: `src\types\case.types.ts`

**Description:** Source code for `src\types\case.types.ts`.

```typescript
import { CaseMetadata } from "./caseTypes";
import { GenericAnswers } from "./facts.types";

export type CaseStage =
  | "drafting"
  | "notice_generated"
  | "notice_served"
  | "waiting_period"
  | "complaint_eligible"
  | "limitation_warning"
  | "complaint_filed"
  | "closed";

export interface User {
  id: string;
  phone: string;
  name: string | null;
  enrollment_number: string | null;
  office_address: string | null;
  email: string | null;
  created_at: string;
}

export interface Case {
  id: string;
  advocate_id: string;
  case_type: string;
  case_number: string | null;
  stage: CaseStage;
  jurisdiction_city: string | null;
  notice_sent_date: string | null;
  notice_served_date: string | null;
  complaint_deadline: string | null;
  waiting_period_end: string | null;
  case_metadata: CaseMetadata | null;
  created_at: string;
  updated_at: string;
  // joined
  case_parties?: CaseParty[];
  case_financials?: CaseFinancials | null;
  case_facts?: CaseFacts | null;
}

export interface CaseParty {
  id: string;
  case_id: string;
  role: "client" | "opposite_party";
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
}

export interface CaseFinancials {
  id: string;
  case_id: string;
  cheque_number: string;
  cheque_date: string;
  cheque_amount: number;
  bank_name: string;
  dishonour_reason: string;
  return_memo_date: string;
}

export interface CaseFacts {
  id: string;
  case_id: string;
  // cheque-bounce columns (kept as-is)
  cheque_signed_by_drawer: boolean | null;
  statutory_notice_already_sent: boolean | null;
  part_payment_made: boolean | null;
  part_payment_amount: number | null;
  written_admission_available: boolean | null;
  notice_delivery_mode: "post" | "hand" | "email" | "unknown" | null;
  raw_story: string | null;
  // generic JSONB column for non-cheque types
  answers: GenericAnswers | null;
}

export interface CreateCasePayload {
  case_type: string;
  client_name: string;
  client_address: string;
  opposite_party_name: string;
  opposite_party_address: string;
  jurisdiction_city: string;

  // Cheque-bounce-only fields (optional for other types)
  cheque_number?: string;
  cheque_date?: string;
  cheque_amount?: number;
  bank_name?: string;
  dishonour_reason?: string;
  return_memo_date?: string;

  // Generic per-type structured details
  case_metadata?: CaseMetadata;
}

```

### File: `src\types\caseTypes.ts`

**Description:** Source code for `src\types\caseTypes.ts`.

```typescript
// Canonical identifiers for every supported case type.
// Add new ids here when introducing additional types.
export const CASE_TYPE_IDS = [
  "cheque_bounce",
  "money_recovery",
  "consumer_complaint",
  "rent_eviction",
  "motor_accident_claim",
  "domestic_violence",
] as const;

export type CaseTypeId = (typeof CASE_TYPE_IDS)[number];

export function isCaseTypeId(value: unknown): value is CaseTypeId {
  return typeof value === "string" && (CASE_TYPE_IDS as readonly string[]).includes(value);
}

// Per-type metadata stored in cases.case_metadata (JSONB). Each branch is
// optional so the column can be empty for cheque bounce (which still uses
// case_financials).
export interface RentEvictionMetadata {
  premises_address: string;
  monthly_rent: number;
  tenancy_start_date: string;
  ground_for_eviction: string;
  rent_arrears_months?: number | null;
}

export interface ConsumerComplaintMetadata {
  transaction_date: string;
  consideration_amount: number;
  service_or_goods_description: string;
  deficiency_description: string;
  forum: "district" | "state" | "national";
}

export interface MotorAccidentMetadata {
  accident_date: string;
  accident_location: string;
  vehicle_number: string;
  fir_number?: string | null;
  injury_description: string;
  medical_expenses?: number | null;
  loss_of_income?: number | null;
}

export interface MoneyRecoveryMetadata {
  principal_amount: number;
  transaction_date: string;
  instrument_type: string;
  default_description: string;
  interest_rate?: number | null;
}

export interface DomesticViolenceMetadata {
  relationship_type: string;
  shared_household: boolean;
  violence_type: string;
  incident_summary: string;
  jurisdiction_court: string;
}

export type CaseMetadata =
  | RentEvictionMetadata
  | ConsumerComplaintMetadata
  | MotorAccidentMetadata
  | MoneyRecoveryMetadata
  | DomesticViolenceMetadata
  | Record<string, unknown>;

```

### File: `src\types\document.types.ts`

**Description:** Source code for `src\types\document.types.ts`.

```typescript
export interface GeneratedDocument {
  id: string;
  case_id: string;
  document_type: "legal_notice" | "complaint" | "affidavit";
  file_name: string | null;
  file_url: string | null;
  generated_at: string;
  version: number;
}

```

### File: `src\types\facts.types.ts`

**Description:** Source code for `src\types\facts.types.ts`.

```typescript
// Existing cheque-bounce facts (kept exactly as before)
export interface CaseFactsAnswers {
  cheque_signed_by_drawer: boolean | null;
  statutory_notice_already_sent: boolean | null;
  part_payment_made: boolean | null;
  part_payment_amount: number | null;
  written_admission_available: boolean | null;
  notice_delivery_mode: "post" | "hand" | "email" | "unknown" | null;
}

export interface Question {
  id: keyof CaseFactsAnswers;
  text: string;
  type: "boolean" | "amount" | "select";
  options?: string[];
  condition?: (answers: Partial<CaseFactsAnswers>) => boolean;
}

// Generic answer shape used by all non-cheque case types.
// Stored in the case_facts.answers JSONB column.
export type GenericAnswerValue = boolean | number | string | null;
export type GenericAnswers = Record<string, GenericAnswerValue>;

export interface GenericQuestion {
  id: string;
  text: string;
  type: "boolean" | "amount" | "select" | "text" | "date";
  options?: string[];
  condition?: (answers: GenericAnswers) => boolean;
}

```

### File: `src\types\reminder.types.ts`

**Description:** Source code for `src\types\reminder.types.ts`.

```typescript
export type ReminderType =
  | "payment_wait_ending"
  | "complaint_deadline_warning"
  | "limitation_final_warning";

export type ReminderStatus = "pending" | "sent" | "failed";

export interface Reminder {
  id: string;
  case_id: string;
  advocate_id: string;
  reminder_type: ReminderType;
  trigger_date: string;
  status: ReminderStatus;
  sent_at: string | null;
}

```

### File: `src\types\speech-recognition.d.ts`

**Description:** Source code for `src\types\speech-recognition.d.ts`.

```typescript
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

```

### File: `src\types\timeline.types.ts`

**Description:** Source code for `src\types\timeline.types.ts`.

```typescript
export interface TimelineEvent {
  id?: string;
  case_id?: string;
  event_date: string;
  event_description: string;
  is_approximate: boolean;
  sequence_order?: number;
}

export interface AITimelineResponse {
  events: TimelineEvent[];
}

```


## Directory: `src/constants`

### File: `src\constants\caseStages.ts`

**Description:** Source code for `src\constants\caseStages.ts`.

```typescript
import { CaseStage } from "@/types/case.types";

export interface StageConfig {
  key: CaseStage;
  label: string;
  description: string;
  nextStage: CaseStage | null;
  primaryAction: string | null;
  color: string;
  order: number;
}

export const CASE_STAGES: Record<CaseStage, StageConfig> = {
  drafting: {
    key: "drafting",
    label: "Drafting",
    description: "Case created. Gathering facts and story.",
    nextStage: "notice_generated",
    primaryAction: "Generate Notice",
    color: "bg-gray-200 text-gray-700",
    order: 1,
  },
  notice_generated: {
    key: "notice_generated",
    label: "Notice Generated",
    description: "Legal notice has been drafted and is ready to send.",
    nextStage: "notice_served",
    primaryAction: "Mark Notice Served",
    color: "bg-blue-100 text-blue-700",
    order: 2,
  },
  notice_served: {
    key: "notice_served",
    label: "Notice Served",
    description: "Notice delivered to opposite party. 15-day wait begins.",
    nextStage: "waiting_period",
    primaryAction: null,
    color: "bg-yellow-100 text-yellow-700",
    order: 3,
  },
  waiting_period: {
    key: "waiting_period",
    label: "Waiting Period",
    description: "Waiting 15 days for payment from drawer.",
    nextStage: "complaint_eligible",
    primaryAction: null,
    color: "bg-orange-100 text-orange-700",
    order: 4,
  },
  complaint_eligible: {
    key: "complaint_eligible",
    label: "Complaint Eligible",
    description: "15-day period expired. You can now file a complaint.",
    nextStage: "complaint_filed",
    primaryAction: "Generate Complaint (Soon)",
    color: "bg-green-100 text-green-700",
    order: 5,
  },
  limitation_warning: {
    key: "limitation_warning",
    label: "⚠️ Limitation Warning",
    description: "Complaint deadline is within 3 days. File immediately.",
    nextStage: "complaint_filed",
    primaryAction: "File Complaint NOW",
    color: "bg-red-100 text-red-700",
    order: 6,
  },
  complaint_filed: {
    key: "complaint_filed",
    label: "Complaint Filed",
    description: "Complaint has been filed in court.",
    nextStage: "closed",
    primaryAction: null,
    color: "bg-purple-100 text-purple-700",
    order: 7,
  },
  closed: {
    key: "closed",
    label: "Closed",
    description: "Case has been closed.",
    nextStage: null,
    primaryAction: null,
    color: "bg-gray-100 text-gray-500",
    order: 8,
  },
};

export const ORDERED_STAGES: StageConfig[] = Object.values(CASE_STAGES).sort(
  (a, b) => a.order - b.order
);

```

### File: `src\constants\caseTypeRegistry.ts`

**Description:** Source code for `src\constants\caseTypeRegistry.ts`.

```typescript
import { CHEQUE_BOUNCE_LEGAL_MAP } from "./legalMapping";
import { MONEY_RECOVERY_LEGAL_MAP } from "./legalMappings/moneyRecovery";
import { CONSUMER_COMPLAINT_LEGAL_MAP } from "./legalMappings/consumerComplaint";
import { RENT_EVICTION_LEGAL_MAP } from "./legalMappings/rentEviction";
import { MOTOR_ACCIDENT_LEGAL_MAP } from "./legalMappings/motorAccidentClaim";
import { DOMESTIC_VIOLENCE_LEGAL_MAP } from "./legalMappings/domesticViolence";

import { CHEQUE_BOUNCE_QUESTIONS } from "./questionBank";
import { MONEY_RECOVERY_QUESTIONS } from "./questionBanks/moneyRecovery";
import { CONSUMER_COMPLAINT_QUESTIONS } from "./questionBanks/consumerComplaint";
import { RENT_EVICTION_QUESTIONS } from "./questionBanks/rentEviction";
import { MOTOR_ACCIDENT_QUESTIONS } from "./questionBanks/motorAccident";
import { DOMESTIC_VIOLENCE_QUESTIONS } from "./questionBanks/domesticViolence";

import { GenericQuestion } from "@/types/facts.types";
import { CaseTypeId } from "@/types/caseTypes";

export type LegalMapShape = {
  id?: string;
  act: string;
  sections: string[];
  description?: string;
  notice_period_days?: number;
  template_blocks?: string[];
  [key: string]: unknown;
};

export interface CaseTypeConfig {
  id: CaseTypeId;
  title: string;
  subtitle: string;
  description: string;
  available: boolean;
  legalMap: LegalMapShape;
  // The cheque-bounce question bank uses the strongly-typed Question[] shape;
  // every other case type uses GenericQuestion[]. We expose both for the
  // QuestionFlow component to consume uniformly.
  questions: GenericQuestion[];
}

// Adapter: convert the old strongly-typed cheque questions to the generic shape
// without breaking the existing QuestionFlow.
const chequeQuestionsAsGeneric: GenericQuestion[] = CHEQUE_BOUNCE_QUESTIONS.map((q) => ({
  id: q.id as string,
  text: q.text,
  type: q.type,
  options: q.options,
  condition: q.condition
    ? (answers) => q.condition!(answers as never)
    : undefined,
}));

export const CASE_TYPE_REGISTRY: Record<CaseTypeId, CaseTypeConfig> = {
  cheque_bounce: {
    id: "cheque_bounce",
    title: "Cheque Bounce",
    subtitle: "Section 138, NI Act",
    description:
      "Dishonour of cheque for insufficiency of funds or exceeding arranged amount.",
    available: true,
    legalMap: CHEQUE_BOUNCE_LEGAL_MAP,
    questions: chequeQuestionsAsGeneric,
  },
  money_recovery: {
    id: "money_recovery",
    title: "Money Recovery",
    subtitle: "Order 37, CPC",
    description:
      "Summary suit for recovery of liquidated debts — loans, unpaid invoices, promissory notes.",
    available: true,
    legalMap: MONEY_RECOVERY_LEGAL_MAP,
    questions: MONEY_RECOVERY_QUESTIONS,
  },
  consumer_complaint: {
    id: "consumer_complaint",
    title: "Consumer Complaint",
    subtitle: "Consumer Protection Act, 2019",
    description:
      "Deficiency in service or defective goods filed before District/State/National Commission.",
    available: true,
    legalMap: CONSUMER_COMPLAINT_LEGAL_MAP,
    questions: CONSUMER_COMPLAINT_QUESTIONS,
  },
  rent_eviction: {
    id: "rent_eviction",
    title: "Rent & Eviction",
    subtitle: "TP Act / State Rent Acts",
    description:
      "Tenant eviction for non-payment of rent or expiry of tenancy, with statutory notice period.",
    available: true,
    legalMap: RENT_EVICTION_LEGAL_MAP,
    questions: RENT_EVICTION_QUESTIONS,
  },
  motor_accident_claim: {
    id: "motor_accident_claim",
    title: "Motor Accident Claim",
    subtitle: "MV Act, 1988 (MACT)",
    description:
      "Claim petition before Motor Accident Claims Tribunal for compensation arising from a road accident.",
    available: true,
    legalMap: MOTOR_ACCIDENT_LEGAL_MAP,
    questions: MOTOR_ACCIDENT_QUESTIONS,
  },
  domestic_violence: {
    id: "domestic_violence",
    title: "Domestic Violence",
    subtitle: "PWDVA, 2005",
    description:
      "Application for protection, residence, or maintenance under the Domestic Violence Act.",
    available: true,
    legalMap: DOMESTIC_VIOLENCE_LEGAL_MAP,
    questions: DOMESTIC_VIOLENCE_QUESTIONS,
  },
};

export function getCaseTypeConfig(id: string): CaseTypeConfig | undefined {
  return (CASE_TYPE_REGISTRY as Record<string, CaseTypeConfig>)[id];
}

export function listCaseTypes(): CaseTypeConfig[] {
  return Object.values(CASE_TYPE_REGISTRY);
}

```

### File: `src\constants\legalMapping.ts`

**Description:** Source code for `src\constants\legalMapping.ts`.

```typescript
// ⚠️ HARDCODED LEGAL LOGIC — AI MUST NEVER MODIFY OR OVERRIDE THIS FILE

export const CHEQUE_BOUNCE_LEGAL_MAP = {
  act: "Negotiable Instruments Act, 1881",
  sections: ["Section 138", "Section 142"],
  description: "Dishonour of cheque for insufficiency of funds or if it exceeds the amount arranged to be paid",

  // Timeline rules (in days)
  notice_period_days: 30,           // Notice must be sent within 30 days of return memo
  payment_wait_days: 15,            // Drawer gets 15 days to pay after receiving notice
  complaint_window_days: 30,        // Complaint must be filed within 30 days after payment wait expires

  // Computed deadline helper labels
  deadline_labels: {
    notice_send_by: "Notice must be sent within 30 days of return memo date",
    payment_wait: "Allow 15 days for drawer to make payment after notice",
    complaint_file_by: "File complaint within 30 days after payment wait expires",
  },

  // Legal paragraph identifiers used in template library
  template_blocks: [
    "block_address_header",
    "block_legal_notice_title",
    "block_drawer_intro",
    "block_cheque_details",
    "block_dishonour_facts",
    "block_section_138_demand",
    "block_payment_demand",
    "block_consequence_warning",
    "block_closing",
  ],
};

export function computeDeadlines(returnMemoDate: string): {
  noticeSendBy: Date;
  waitingPeriodEnd: Date;
  complaintDeadline: Date;
} {
  const memo = new Date(returnMemoDate);

  const noticeSendBy = new Date(memo);
  noticeSendBy.setDate(memo.getDate() + CHEQUE_BOUNCE_LEGAL_MAP.notice_period_days);

  const waitingPeriodEnd = new Date(); // Set when notice is actually sent
  waitingPeriodEnd.setDate(waitingPeriodEnd.getDate() + CHEQUE_BOUNCE_LEGAL_MAP.payment_wait_days);

  const complaintDeadline = new Date(waitingPeriodEnd);
  complaintDeadline.setDate(waitingPeriodEnd.getDate() + CHEQUE_BOUNCE_LEGAL_MAP.complaint_window_days);

  return { noticeSendBy, waitingPeriodEnd, complaintDeadline };
}

export function computeDeadlinesFromNoticeDate(noticeSentDate: string): {
  waitingPeriodEnd: Date;
  complaintDeadline: Date;
} {
  const noticeDate = new Date(noticeSentDate);

  const waitingPeriodEnd = new Date(noticeDate);
  waitingPeriodEnd.setDate(noticeDate.getDate() + CHEQUE_BOUNCE_LEGAL_MAP.payment_wait_days);

  const complaintDeadline = new Date(waitingPeriodEnd);
  complaintDeadline.setDate(waitingPeriodEnd.getDate() + CHEQUE_BOUNCE_LEGAL_MAP.complaint_window_days);

  return { waitingPeriodEnd, complaintDeadline };
}

```

### File: `src\constants\legalMappings\consumerComplaint.ts`

**Description:** Source code for `src\constants\legalMappings\consumerComplaint.ts`.

```typescript
// ⚠️ HARDCODED LEGAL LOGIC — AI MUST NEVER MODIFY OR OVERRIDE THIS FILE

export const CONSUMER_COMPLAINT_LEGAL_MAP = {
  id: "consumer_complaint",
  act: "Consumer Protection Act, 2019",
  sections: ["Section 2(7)", "Section 35", "Section 47", "Section 58"],
  description:
    "Complaint for deficiency in service or defective goods before District/State/National Consumer Commission.",

  notice_period_days: 15, // Pre-litigation demand
  limitation_years: 2, // Section 69 — within 2 years from cause of action
  response_window_days: 30, // Service provider's typical response window

  pecuniary_jurisdiction: {
    district: "Up to Rs 50,00,000",
    state: "Above Rs 50,00,000 up to Rs 2,00,00,000",
    national: "Above Rs 2,00,00,000",
  },

  deadline_labels: {
    notice_send_by: "Demand notice should be served before filing complaint",
    limitation_warning: "Complaint must be filed within 2 years from cause of action",
    response_window: "Service provider gets ~30 days to respond after notice",
  },

  template_blocks: [
    "block_header",
    "block_subject",
    "block_intro",
    "block_service_facts",
    "block_deficiency",
    "block_relief_demand",
    "block_failure_clause",
    "block_closing",
    "block_annexures",
  ],
};

```

### File: `src\constants\legalMappings\domesticViolence.ts`

**Description:** Source code for `src\constants\legalMappings\domesticViolence.ts`.

```typescript
// ⚠️ HARDCODED LEGAL LOGIC — AI MUST NEVER MODIFY OR OVERRIDE THIS FILE

export const DOMESTIC_VIOLENCE_LEGAL_MAP = {
  id: "domestic_violence",
  act: "Protection of Women from Domestic Violence Act, 2005",
  sections: ["Section 12", "Section 18", "Section 19", "Section 20", "Section 22"],
  description:
    "Application for protection, residence, monetary relief, or compensation under PWDVA, 2005.",

  notice_period_days: 0, // Application is filed directly before Magistrate
  hearing_target_days: 60, // Section 12(5): endeavour to dispose within 60 days
  ex_parte_relief_available: true,

  reliefs_available: [
    "Protection Order (Section 18)",
    "Residence Order (Section 19)",
    "Monetary Relief (Section 20)",
    "Custody Order (Section 21)",
    "Compensation Order (Section 22)",
  ],

  deadline_labels: {
    application_filing: "Application filed before Judicial Magistrate of First Class / Metropolitan Magistrate",
    first_hearing: "Court endeavours to hold first hearing within 3 days of receipt of application",
    disposal_target: "Disposal targeted within 60 days from first hearing",
  },

  template_blocks: [
    "block_header",
    "block_subject",
    "block_intro",
    "block_relationship_facts",
    "block_incident_narrative",
    "block_relief_sought",
    "block_failure_clause",
    "block_closing",
    "block_annexures",
  ],
};

```

### File: `src\constants\legalMappings\moneyRecovery.ts`

**Description:** Source code for `src\constants\legalMappings\moneyRecovery.ts`.

```typescript
// ⚠️ HARDCODED LEGAL LOGIC — AI MUST NEVER MODIFY OR OVERRIDE THIS FILE

export const MONEY_RECOVERY_LEGAL_MAP = {
  id: "money_recovery",
  act: "Code of Civil Procedure, 1908",
  sections: ["Order 37, Rule 1 & 2"],
  description:
    "Summary suit for recovery of liquidated debts under written contract, promissory note, or bill of exchange.",

  // Statutory windows (in days)
  notice_period_days: 15, // Demand period before suit
  limitation_years: 3, // Article 35/36 of Limitation Act for written instruments
  leave_to_defend_days: 10, // Defendant's window after summons in summary suit

  deadline_labels: {
    notice_send_by: "Send demand notice before filing summary suit",
    limitation_warning: "Suit must be filed within 3 years from cause of action",
    leave_to_defend: "Defendant has 10 days to apply for leave to defend",
  },

  template_blocks: [
    "block_header",
    "block_subject",
    "block_intro",
    "block_debt_background",
    "block_default_facts",
    "block_demand",
    "block_failure_clause",
    "block_closing",
    "block_annexures",
  ],
};

```

### File: `src\constants\legalMappings\motorAccidentClaim.ts`

**Description:** Source code for `src\constants\legalMappings\motorAccidentClaim.ts`.

```typescript
// ⚠️ HARDCODED LEGAL LOGIC — AI MUST NEVER MODIFY OR OVERRIDE THIS FILE

export const MOTOR_ACCIDENT_LEGAL_MAP = {
  id: "motor_accident_claim",
  act: "Motor Vehicles Act, 1988",
  sections: ["Section 166", "Section 140", "Section 163A"],
  description:
    "Claim petition before Motor Accident Claims Tribunal for compensation arising from a road accident.",

  notice_period_days: 0, // No statutory pre-suit notice required
  limitation_months: 6, // Section 166(3) — preferable filing window (post-2019 amendment)
  interim_compensation_section: "Section 140 (no-fault liability)",

  deadline_labels: {
    file_within: "File claim petition before MACT having jurisdiction over accident site, claimant's residence, or respondent's place",
    early_filing: "Earlier filing improves chance of interim compensation",
    fir_required: "Attach certified copy of FIR and charge sheet (if filed)",
  },

  template_blocks: [
    "block_header",
    "block_subject",
    "block_intro",
    "block_accident_facts",
    "block_injury_loss",
    "block_compensation_claim",
    "block_failure_clause",
    "block_closing",
    "block_annexures",
  ],
};

```

### File: `src\constants\legalMappings\rentEviction.ts`

**Description:** Source code for `src\constants\legalMappings\rentEviction.ts`.

```typescript
// ⚠️ HARDCODED LEGAL LOGIC — AI MUST NEVER MODIFY OR OVERRIDE THIS FILE

export const RENT_EVICTION_LEGAL_MAP = {
  id: "rent_eviction",
  act: "Transfer of Property Act, 1882 (read with applicable State Rent Control Act)",
  sections: ["Section 106", "Section 111(g)", "Section 114"],
  description:
    "Termination of tenancy and eviction for non-payment of rent or expiry of tenancy.",

  notice_period_days: 15, // Section 106 (post-2002): 15 days for month-to-month tenancy
  rent_default_notice_days: 15, // Notice to pay or quit
  suit_limitation_years: 12, // Possession suits — Article 65, Limitation Act

  deadline_labels: {
    notice_send_by: "Statutory notice under Section 106 TP Act required before eviction suit",
    cure_period: "Tenant gets 15 days to pay arrears or vacate",
    limitation_warning: "Suit for possession lies within 12 years",
  },

  template_blocks: [
    "block_header",
    "block_subject",
    "block_intro",
    "block_tenancy_facts",
    "block_breach",
    "block_termination_demand",
    "block_failure_clause",
    "block_closing",
    "block_annexures",
  ],
};

```

### File: `src\constants\noticeTemplates\consumerComplaint.ts`

**Description:** Source code for `src\constants\noticeTemplates\consumerComplaint.ts`.

```typescript
export const CONSUMER_COMPLAINT_BLOCKS = {
  block_header: (data: { date: string; oppPartyName: string; oppPartyAddress: string }) => `
Date: ${data.date}

By Registered Post A/D / Speed Post / Email

To,
${data.oppPartyName}
Address: ${data.oppPartyAddress}
  `.trim(),

  block_subject: () =>
    `SUBJECT:
LEGAL NOTICE UNDER THE CONSUMER PROTECTION ACT, 2019 — DEMAND FOR REDRESSAL OF DEFICIENCY IN SERVICE / DEFECTIVE GOODS`,

  block_intro: (data: { clientName: string; clientAddress: string }) => `
Sir/Madam,

Under instructions from and on behalf of my client Mr./Ms. ${data.clientName}, residing at ${data.clientAddress}, who is a "consumer" within the meaning of Section 2(7) of the Consumer Protection Act, 2019, I hereby serve upon you this notice:
  `.trim(),

  block_service_facts: (data: {
    transactionDate: string;
    considerationAmount: string;
    serviceDescription: string;
    aiNarrative: string;
  }) => `
1. TRANSACTION

That on or about ${data.transactionDate}, my client availed your services / purchased goods upon payment of valuable consideration of Rs. ${data.considerationAmount} in respect of: ${data.serviceDescription}.

${data.aiNarrative}
  `.trim(),

  block_deficiency: (data: { deficiencyDescription: string }) => `
2. DEFICIENCY / DEFECT

That you committed deficiency in service / supplied defective goods in the following manner:

${data.deficiencyDescription}

The said acts and omissions amount to "deficiency" and/or "unfair trade practice" within the meaning of the Consumer Protection Act, 2019.
  `.trim(),

  block_relief_demand: (data: { reliefSought: string; claimAmount: string }) => `
3. DEMAND FOR REDRESSAL

You are hereby called upon to provide the following relief within 15 (fifteen) days of receipt of this notice:

${data.reliefSought}

Total relief claimed: Rs. ${data.claimAmount} (Rupees ${data.claimAmount} only), inclusive of compensation for mental agony, harassment, and litigation costs.
  `.trim(),

  block_failure_clause: () => `
4. FAILURE CLAUSE

Take notice that, failing compliance, my client shall be constrained to institute a consumer complaint before the competent District / State / National Consumer Disputes Redressal Commission praying, inter alia, for the said reliefs along with punitive damages and costs, entirely at your risk as to costs and consequences.
  `.trim(),

  block_closing: (data: {
    advocateName: string;
    advocateEnrollment: string;
    advocateAddress: string;
    advocateContact: string;
  }) => `
Yours faithfully,

(${data.advocateName})
Enrollment No.: ${data.advocateEnrollment}
Address: ${data.advocateAddress}
Contact: ${data.advocateContact}
  `.trim(),

  block_annexures: () => `
ANNEXURES (Recommended)
1. Copy of invoice / receipt of consideration
2. Copy of correspondence with the service provider
3. Photographs / reports evidencing the defect
4. Bank statement showing payment
  `.trim(),
};

```

### File: `src\constants\noticeTemplates\domesticViolence.ts`

**Description:** Source code for `src\constants\noticeTemplates\domesticViolence.ts`.

```typescript
export const DOMESTIC_VIOLENCE_BLOCKS = {
  block_header: (data: { date: string; courtName: string; jurisdictionCity: string }) => `
BEFORE THE LEARNED JUDICIAL MAGISTRATE OF FIRST CLASS / METROPOLITAN MAGISTRATE
${data.courtName.toUpperCase()}
AT ${data.jurisdictionCity.toUpperCase()}

APPLICATION No.: _______ of ${new Date().getFullYear()}

(Filed under Section 12 of the Protection of Women from Domestic Violence Act, 2005)

Date: ${data.date}
  `.trim(),

  block_subject: () =>
    `IN THE MATTER OF: APPLICATION FOR PROTECTION, RESIDENCE, AND MONETARY RELIEF UNDER THE PWDVA, 2005`,

  block_intro: (data: { clientName: string; clientAddress: string; oppPartyName: string }) => `
Smt. ${data.clientName}
Resident of ${data.clientAddress}
                                                          ... AGGRIEVED PERSON / APPLICANT

Versus

Shri ${data.oppPartyName}
                                                          ... RESPONDENT

The Applicant most respectfully submits as under:
  `.trim(),

  block_relationship_facts: (data: {
    relationshipType: string;
    sharedHousehold: string;
    aiNarrative: string;
  }) => `
1. DOMESTIC RELATIONSHIP

That the Applicant and the Respondent are in a domestic relationship as ${data.relationshipType.replace(/_/g, " ")}, within the meaning of Section 2(f) of the Protection of Women from Domestic Violence Act, 2005.

The Applicant ${data.sharedHousehold === "true" ? "is currently residing" : "had been residing"} in a shared household with the Respondent within the meaning of Section 2(s) of the said Act.

${data.aiNarrative}
  `.trim(),

  block_incident_narrative: (data: { incidentSummary: string; violenceType: string }) => `
2. ACTS OF DOMESTIC VIOLENCE

The Applicant has been subjected to ${data.violenceType.replace(/_/g, " ")} violence as defined under Section 3 of the Act. The particulars of the incidents are as follows:

${data.incidentSummary}
  `.trim(),

  block_relief_sought: (data: {
    protectionOrder: string;
    residenceOrder: string;
    monetaryRelief: string;
    monetaryAmount: string;
    custodyOrder: string;
  }) => `
3. RELIEF SOUGHT

The Applicant most respectfully prays that this Hon'ble Court may be pleased to grant the following reliefs:

${data.protectionOrder === "true" ? "(a) Protection Order under Section 18 restraining the Respondent from committing any further acts of domestic violence." : ""}
${data.residenceOrder === "true" ? "(b) Residence Order under Section 19 securing the Applicant's right to reside in the shared household." : ""}
${data.monetaryRelief === "true" ? `(c) Monetary Relief under Section 20 in the sum of Rs. ${data.monetaryAmount} towards expenses, loss of earnings, medical expenses, and maintenance.` : ""}
${data.custodyOrder === "true" ? "(d) Custody Order under Section 21 granting custody of minor children to the Applicant." : ""}
(e) Compensation under Section 22 for mental torture and emotional distress.
  `.trim(),

  block_failure_clause: () => `
4. PRAYER AND VERIFICATION

It is therefore most respectfully prayed that this Hon'ble Court be pleased to grant the reliefs prayed for above and pass such further or other order(s) as may be deemed fit and proper in the facts and circumstances of the case.

The Applicant shall verify the contents on oath at the time of filing.
  `.trim(),

  block_closing: (data: {
    advocateName: string;
    advocateEnrollment: string;
    advocateAddress: string;
    advocateContact: string;
  }) => `
APPLICANT

Through

${data.advocateName}
Advocate, Enrollment No.: ${data.advocateEnrollment}
Address: ${data.advocateAddress}
Contact: ${data.advocateContact}
  `.trim(),

  block_annexures: () => `
ANNEXURES (Recommended)
1. Domestic Incident Report (Form I, if available)
2. Medical records and MLC (if any)
3. Photographs / WhatsApp / call records evidencing violence
4. Police complaint / FIR copies (if any)
5. Marriage certificate / proof of domestic relationship
6. Income proof of Respondent (for monetary relief)
7. Birth certificates of minor children (if custody sought)
  `.trim(),
};

```

### File: `src\constants\noticeTemplates\moneyRecovery.ts`

**Description:** Source code for `src\constants\noticeTemplates\moneyRecovery.ts`.

```typescript
export const MONEY_RECOVERY_BLOCKS = {
  block_header: (data: { date: string; oppPartyName: string; oppPartyAddress: string }) => `
Date: ${data.date}

By Registered Post A/D / Speed Post / Courier

To,
Mr./Ms. ${data.oppPartyName}
Address: ${data.oppPartyAddress}
  `.trim(),

  block_subject: () =>
    `SUBJECT:
LEGAL NOTICE FOR RECOVERY OF MONEY — INTENDED SUMMARY SUIT UNDER ORDER 37 CPC`,

  block_intro: (data: { clientName: string; clientAddress: string }) => `
Sir/Madam,

Under instructions and on behalf of my client Mr./Ms. ${data.clientName}, residing at ${data.clientAddress}, I hereby serve upon you the following legal notice:
  `.trim(),

  block_debt_background: (data: {
    principalAmount: string;
    instrumentType: string;
    transactionDate: string;
    aiNarrative: string;
  }) => `
1. BACKGROUND

That on ${data.transactionDate}, you availed a sum of Rs. ${data.principalAmount} from my client, evidenced by ${data.instrumentType}, thereby creating a legally enforceable debt and liability in favour of my client.

${data.aiNarrative}
  `.trim(),

  block_default_facts: (data: {
    interestRate: string;
    defaultDescription: string;
  }) => `
2. DEFAULT

That despite the agreed terms${data.interestRate ? ` (interest at ${data.interestRate}% per annum)` : ""}, you have committed default as follows:

${data.defaultDescription}

Despite repeated oral and written demands, you have failed and neglected to repay the said sum.
  `.trim(),

  block_demand: (data: { totalDue: string }) => `
3. DEMAND

You are hereby called upon to pay the sum of Rs. ${data.totalDue} (Rupees ${data.totalDue} only), being principal together with accrued interest and costs, within 15 (fifteen) days from the date of receipt of this notice.
  `.trim(),

  block_failure_clause: () => `
4. FAILURE CLAUSE

Take notice that on your failure to comply, my client shall be constrained to institute a summary suit under Order 37 of the Code of Civil Procedure, 1908, for recovery of the said sum together with interest and costs, entirely at your risk as to costs and consequences. My client also reserves the right to invoke any other civil and criminal remedies available in law.
  `.trim(),

  block_closing: (data: {
    advocateName: string;
    advocateEnrollment: string;
    advocateAddress: string;
    advocateContact: string;
  }) => `
Yours faithfully,

(${data.advocateName})
Enrollment No.: ${data.advocateEnrollment}
Address: ${data.advocateAddress}
Contact: ${data.advocateContact}
  `.trim(),

  block_annexures: () => `
ANNEXURES (Recommended)
1. Copy of promissory note / loan agreement / invoice
2. Bank statement evidencing the disbursement
3. Communication evidencing the demand
4. Acknowledgement of debt (if any)
  `.trim(),
};

```

### File: `src\constants\noticeTemplates\motorAccident.ts`

**Description:** Source code for `src\constants\noticeTemplates\motorAccident.ts`.

```typescript
export const MOTOR_ACCIDENT_BLOCKS = {
  block_header: (data: { date: string; tribunalName: string; jurisdictionCity: string }) => `
BEFORE THE MOTOR ACCIDENT CLAIMS TRIBUNAL
${data.tribunalName.toUpperCase()}
AT ${data.jurisdictionCity.toUpperCase()}

CLAIM PETITION No.: _______ of ${new Date().getFullYear()}

(Filed under Section 166 of the Motor Vehicles Act, 1988)

Date of filing: ${data.date}
  `.trim(),

  block_subject: () =>
    `IN THE MATTER OF: CLAIM FOR COMPENSATION ARISING OUT OF MOTOR VEHICLE ACCIDENT`,

  block_intro: (data: { clientName: string; clientAddress: string; oppPartyName: string }) => `
${data.clientName}, S/o / D/o / W/o ____________
Resident of ${data.clientAddress}
                                                          ... PETITIONER / CLAIMANT

Versus

${data.oppPartyName} (Driver / Owner / Insurer)
                                                          ... RESPONDENT(S)

The Petitioner most respectfully submits as under:
  `.trim(),

  block_accident_facts: (data: {
    accidentDate: string;
    accidentLocation: string;
    vehicleNumber: string;
    firNumber: string;
    aiNarrative: string;
  }) => `
1. PARTICULARS OF THE ACCIDENT

That on ${data.accidentDate}, at ${data.accidentLocation}, the offending vehicle bearing registration No. ${data.vehicleNumber} was driven in a rash and negligent manner by Respondent No. 1, resulting in the accident giving rise to this claim.

FIR No.: ${data.firNumber || "Not yet registered"}.

${data.aiNarrative}
  `.trim(),

  block_injury_loss: (data: {
    claimantRole: string;
    injuryDescription: string;
    medicalExpenses: string;
    lossOfIncome: string;
  }) => `
2. INJURY / LOSS

The Petitioner being the ${data.claimantRole}, has suffered the following:

${data.injuryDescription}

Medical expenses incurred: Rs. ${data.medicalExpenses || "0"}
Loss of income: Rs. ${data.lossOfIncome || "0"}
  `.trim(),

  block_compensation_claim: (data: { totalCompensation: string }) => `
3. COMPENSATION CLAIMED

The Petitioner claims compensation in the total sum of Rs. ${data.totalCompensation} (Rupees ${data.totalCompensation} only) under the following heads:

  (a) Medical and treatment expenses
  (b) Loss of income / loss of dependency
  (c) Pain, suffering, and loss of amenities
  (d) Future medical expenses, if any
  (e) Conveyance, attendant, and incidental charges
  (f) Interest from date of accident till realisation
  (g) Costs of the proceedings
  `.trim(),

  block_failure_clause: () => `
4. PRAYER

It is therefore most respectfully prayed that this Hon'ble Tribunal may be pleased to:

  (i) Award compensation of Rs. _______ together with interest at 9% per annum from the date of accident till realisation, jointly and severally against the Respondents;
  (ii) Pass an order for interim compensation under Section 140 of the Motor Vehicles Act, 1988;
  (iii) Award costs of these proceedings;
  (iv) Pass any other order as may be deemed fit and proper in the facts and circumstances of the case.
  `.trim(),

  block_closing: (data: {
    advocateName: string;
    advocateEnrollment: string;
    advocateAddress: string;
    advocateContact: string;
  }) => `
PETITIONER

Through

${data.advocateName}
Advocate, Enrollment No.: ${data.advocateEnrollment}
Address: ${data.advocateAddress}
Contact: ${data.advocateContact}
  `.trim(),

  block_annexures: () => `
ANNEXURES (Recommended)
1. Certified copy of FIR and charge sheet (if filed)
2. Copy of driving licence and registration certificate of offending vehicle
3. Insurance certificate of offending vehicle
4. Medical records, treatment papers, and bills
5. Salary slips / ITR / income proof
6. Disability certificate (where applicable)
7. Death certificate and post-mortem report (in case of fatal accident)
  `.trim(),
};

```

### File: `src\constants\noticeTemplates\rentEviction.ts`

**Description:** Source code for `src\constants\noticeTemplates\rentEviction.ts`.

```typescript
export const RENT_EVICTION_BLOCKS = {
  block_header: (data: { date: string; oppPartyName: string; oppPartyAddress: string }) => `
Date: ${data.date}

By Registered Post A/D / Speed Post / Courier

To,
Mr./Ms. ${data.oppPartyName}
Address: ${data.oppPartyAddress}
  `.trim(),

  block_subject: () =>
    `SUBJECT:
NOTICE TO QUIT AND VACATE UNDER SECTION 106 OF THE TRANSFER OF PROPERTY ACT, 1882`,

  block_intro: (data: { clientName: string; clientAddress: string }) => `
Sir/Madam,

Under instructions and on behalf of my client Mr./Ms. ${data.clientName}, residing at ${data.clientAddress}, the lawful owner of the premises hereinafter described, I hereby serve upon you the following legal notice:
  `.trim(),

  block_tenancy_facts: (data: {
    premisesAddress: string;
    monthlyRent: string;
    tenancyStartDate: string;
    aiNarrative: string;
  }) => `
1. TENANCY PARTICULARS

That you were inducted as a tenant in the premises situated at ${data.premisesAddress} with effect from ${data.tenancyStartDate}, on a monthly rent of Rs. ${data.monthlyRent}, payable in advance on or before the 5th of every English calendar month.

${data.aiNarrative}
  `.trim(),

  block_breach: (data: { groundForEviction: string; arrearsMonths: string; arrearsAmount: string }) => `
2. BREACH OF TENANCY

That you have committed default in the following manner: ${data.groundForEviction}.

You have failed and neglected to pay rent for ${data.arrearsMonths} months, leaving an arrears of Rs. ${data.arrearsAmount} as on date, despite repeated oral and written demands by my client.
  `.trim(),

  block_termination_demand: (data: { noticeDays: string }) => `
3. TERMINATION OF TENANCY AND DEMAND

You are hereby called upon to pay the entire arrears of rent and to vacate and hand over peaceful and vacant possession of the said premises within ${data.noticeDays} days from the date of receipt of this notice. By this notice, the tenancy stands terminated upon expiry of the said period in accordance with Section 106 of the Transfer of Property Act, 1882.
  `.trim(),

  block_failure_clause: () => `
4. FAILURE CLAUSE

Take notice that on your failure to comply, my client shall be constrained to file an eviction suit before the competent civil/rent court for recovery of possession, arrears of rent, mesne profits, and costs, entirely at your risk as to costs and consequences.
  `.trim(),

  block_closing: (data: {
    advocateName: string;
    advocateEnrollment: string;
    advocateAddress: string;
    advocateContact: string;
  }) => `
Yours faithfully,

(${data.advocateName})
Enrollment No.: ${data.advocateEnrollment}
Address: ${data.advocateAddress}
Contact: ${data.advocateContact}
  `.trim(),

  block_annexures: () => `
ANNEXURES (Recommended)
1. Copy of rent agreement (if any)
2. Rent receipts / ledger
3. Communication evidencing demand for rent
4. Title document of the landlord (optional)
  `.trim(),
};

```

### File: `src\constants\noticeTemplates.ts`

**Description:** Source code for `src\constants\noticeTemplates.ts`.

```typescript
export const NOTICE_TEMPLATE_BLOCKS = {
  block_header: (data: {
    date: string;
    oppPartyName: string;
    oppPartyAddress: string;
  }) => `
Date: ${data.date}

By Registered Post A/D / Speed Post / Courier

To,
Mr./Ms. ${data.oppPartyName}
S/o / D/o: Not Provided
Address: ${data.oppPartyAddress}
  `.trim(),

  block_subject: () =>
    `SUBJECT:
LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881 FOR DISHONOUR OF CHEQUE`,

  block_intro: (data: { clientName: string; clientAddress: string }) => `
Sir/Madam,

Under instructions and on behalf of my client Mr./Ms. ${data.clientName}, residing at ${data.clientAddress}, I hereby serve upon you the following legal notice:
  `.trim(),

  block_transaction_background: (data: {
    chequeAmount: string;
    transactionDate: string;
    transactionPurpose: string;
    aiNarrative: string;
  }) => `
1. TRANSACTION BACKGROUND

That you had approached my client and availed a sum of Rs. ${data.chequeAmount} (Rupees ${data.chequeAmount} only) on ${data.transactionDate} towards ${data.transactionPurpose}, thereby creating a legally enforceable debt/liability.

${data.aiNarrative}
  `.trim(),

  block_issuance_of_cheque: (data: {
    chequeNumber: string;
    chequeDate: string;
    chequeAmount: string;
    bankName: string;
  }) => `
2. ISSUANCE OF CHEQUE

In discharge of the aforesaid legally enforceable debt/liability, you issued the following cheque:

Cheque No.: ${data.chequeNumber}
Date: ${data.chequeDate}
Amount: Rs. ${data.chequeAmount}
Drawn on: ${data.bankName}

Assuring my client that the same would be honoured upon presentation.
  `.trim(),

  block_dishonour: (data: { returnMemoDate: string; dishonourReason: string }) => `
3. DISHONOUR OF CHEQUE

That my client presented the said cheque within its validity period through his/her banker. However, the cheque was returned unpaid by your bank vide return memo dated ${data.returnMemoDate} with the remarks:

"${data.dishonourReason}"

The dishonour clearly attracts the penal provisions of Section 138 of the Negotiable Instruments Act, 1881.
  `.trim(),

  block_demand: (data: { chequeAmount: string }) => `
4. DEMAND FOR PAYMENT

Therefore, through this notice, you are hereby called upon to make payment of the cheque amount of Rs. ${data.chequeAmount} (Rupees ${data.chequeAmount} only) within 15 (fifteen) days from the date of receipt of this notice.
  `.trim(),

  block_failure_clause: () => `
5. FAILURE CLAUSE

Take notice that if you fail to make the payment within the aforesaid statutory period of 15 days, my client shall be constrained to initiate appropriate criminal proceedings against you under Section 138 read with Section 142 of the Negotiable Instruments Act, 1881, before the competent court of law, at your entire risk as to costs and consequences.

My client also reserves the right to initiate separate civil proceedings for recovery of the amount along with interest and damages.

You are advised to treat this notice as most urgent.
  `.trim(),

  block_closing: (data: {
    advocateName: string;
    advocateEnrollment: string;
    advocateAddress: string;
    advocateContact: string;
  }) => `
Yours faithfully,

(${data.advocateName})
Enrollment No.: ${data.advocateEnrollment}
Address: ${data.advocateAddress}
Contact: ${data.advocateContact}
  `.trim(),

  block_annexures: () => `
ANNEXURES (Recommended)
1. Copy of dishonoured cheque
2. Copy of bank return memo
3. Copy of bank statement (optional but useful)
  `.trim(),
};

```

### File: `src\constants\questionBank.ts`

**Description:** Source code for `src\constants\questionBank.ts`.

```typescript
import { Question } from "@/types/facts.types";

export const CHEQUE_BOUNCE_QUESTIONS: Question[] = [
  {
    id: "cheque_signed_by_drawer",
    text: "Was the cheque signed by the drawer (opposite party)?",
    type: "boolean",
  },
  {
    id: "statutory_notice_already_sent",
    text: "Has a statutory legal notice under Section 138 already been sent?",
    type: "boolean",
  },
  {
    id: "part_payment_made",
    text: "Has the drawer made any part payment after dishonour?",
    type: "boolean",
  },
  {
    id: "part_payment_amount",
    text: "What was the part payment amount? (in ₹)",
    type: "amount",
    condition: (answers) => answers.part_payment_made === true,
  },
  {
    id: "written_admission_available",
    text: "Is there any written admission of the debt by the opposite party (WhatsApp, email, letter)?",
    type: "boolean",
  },
  {
    id: "notice_delivery_mode",
    text: "How will the legal notice be delivered?",
    type: "select",
    options: ["post", "hand", "email", "unknown"],
  },
];

```

### File: `src\constants\questionBanks\consumerComplaint.ts`

**Description:** Source code for `src\constants\questionBanks\consumerComplaint.ts`.

```typescript
import { GenericQuestion } from "@/types/facts.types";

export const CONSUMER_COMPLAINT_QUESTIONS: GenericQuestion[] = [
  {
    id: "complaint_type",
    text: "Is the grievance against goods or services?",
    type: "select",
    options: ["goods", "service", "both"],
  },
  {
    id: "consideration_paid",
    text: "Was consideration (payment) paid for the goods or services?",
    type: "boolean",
  },
  {
    id: "consideration_amount",
    text: "What amount was paid (in Rs)?",
    type: "amount",
    condition: (a) => a.consideration_paid === true,
  },
  {
    id: "deficiency_documented",
    text: "Is the defect or deficiency documented (photos, reports, communication)?",
    type: "boolean",
  },
  {
    id: "complaint_to_provider_made",
    text: "Has a written complaint already been made to the service provider?",
    type: "boolean",
  },
  {
    id: "provider_response_received",
    text: "Did the service provider respond to the complaint?",
    type: "boolean",
    condition: (a) => a.complaint_to_provider_made === true,
  },
  {
    id: "relief_sought",
    text: "Primary relief sought",
    type: "select",
    options: ["refund", "replacement", "repair", "compensation", "punitive_damages"],
  },
  {
    id: "claim_amount",
    text: "Total claim amount including compensation (in Rs)",
    type: "amount",
  },
];

```

### File: `src\constants\questionBanks\domesticViolence.ts`

**Description:** Source code for `src\constants\questionBanks\domesticViolence.ts`.

```typescript
import { GenericQuestion } from "@/types/facts.types";

export const DOMESTIC_VIOLENCE_QUESTIONS: GenericQuestion[] = [
  {
    id: "domestic_relationship_type",
    text: "Nature of the domestic relationship",
    type: "select",
    options: ["wife", "live_in_partner", "mother", "sister", "daughter", "other_relative"],
  },
  {
    id: "shared_household_currently",
    text: "Does the aggrieved person currently live in a shared household with the respondent?",
    type: "boolean",
  },
  {
    id: "violence_types",
    text: "Primary type of violence alleged",
    type: "select",
    options: ["physical", "sexual", "verbal_emotional", "economic", "multiple"],
  },
  {
    id: "police_complaint_filed",
    text: "Has a police complaint or FIR already been filed?",
    type: "boolean",
  },
  {
    id: "medical_evidence_available",
    text: "Is medical evidence (MLC, treatment records) available?",
    type: "boolean",
  },
  {
    id: "protection_order_required",
    text: "Is a protection order under Section 18 sought?",
    type: "boolean",
  },
  {
    id: "residence_order_required",
    text: "Is a residence order under Section 19 sought?",
    type: "boolean",
  },
  {
    id: "monetary_relief_required",
    text: "Is monetary relief under Section 20 sought?",
    type: "boolean",
  },
  {
    id: "monetary_relief_amount",
    text: "Total monetary relief claimed (in Rs)",
    type: "amount",
    condition: (a) => a.monetary_relief_required === true,
  },
  {
    id: "minor_children_involved",
    text: "Are minor children involved (custody / maintenance)?",
    type: "boolean",
  },
];

```

### File: `src\constants\questionBanks\moneyRecovery.ts`

**Description:** Source code for `src\constants\questionBanks\moneyRecovery.ts`.

```typescript
import { GenericQuestion } from "@/types/facts.types";

export const MONEY_RECOVERY_QUESTIONS: GenericQuestion[] = [
  {
    id: "written_instrument_available",
    text: "Is there a written instrument evidencing the debt (promissory note, loan agreement, invoice)?",
    type: "boolean",
  },
  {
    id: "instrument_type",
    text: "Which type of written instrument do you have?",
    type: "select",
    options: ["promissory_note", "loan_agreement", "invoice", "ledger", "email_admission", "other"],
    condition: (a) => a.written_instrument_available === true,
  },
  {
    id: "principal_amount",
    text: "What is the principal amount due (in Rs)?",
    type: "amount",
  },
  {
    id: "interest_agreed",
    text: "Was interest contractually agreed?",
    type: "boolean",
  },
  {
    id: "interest_rate",
    text: "What was the agreed annual interest rate (in %)?",
    type: "amount",
    condition: (a) => a.interest_agreed === true,
  },
  {
    id: "part_payment_received",
    text: "Has the defendant made any part payment after default?",
    type: "boolean",
  },
  {
    id: "cause_of_action_date",
    text: "Date the cause of action arose (last default / last acknowledgement)",
    type: "date",
  },
];

```

### File: `src\constants\questionBanks\motorAccident.ts`

**Description:** Source code for `src\constants\questionBanks\motorAccident.ts`.

```typescript
import { GenericQuestion } from "@/types/facts.types";

export const MOTOR_ACCIDENT_QUESTIONS: GenericQuestion[] = [
  {
    id: "fir_registered",
    text: "Has an FIR been registered for the accident?",
    type: "boolean",
  },
  {
    id: "fir_number",
    text: "FIR number (if available)",
    type: "text",
    condition: (a) => a.fir_registered === true,
  },
  {
    id: "claimant_role",
    text: "Role of the claimant in the accident",
    type: "select",
    options: ["injured", "legal_heir_of_deceased", "owner_of_damaged_property"],
  },
  {
    id: "vehicle_insured",
    text: "Was the offending vehicle insured at the time of accident?",
    type: "boolean",
  },
  {
    id: "insurance_company_known",
    text: "Is the insurance company known?",
    type: "boolean",
    condition: (a) => a.vehicle_insured === true,
  },
  {
    id: "medical_bills_collected",
    text: "Are medical bills and treatment records collected?",
    type: "boolean",
    condition: (a) => a.claimant_role === "injured" || a.claimant_role === "legal_heir_of_deceased",
  },
  {
    id: "loss_of_income_documented",
    text: "Is loss of income documented (salary slips, ITR, business records)?",
    type: "boolean",
  },
  {
    id: "estimated_compensation",
    text: "Estimated compensation claim (in Rs)",
    type: "amount",
  },
];

```

### File: `src\constants\questionBanks\rentEviction.ts`

**Description:** Source code for `src\constants\questionBanks\rentEviction.ts`.

```typescript
import { GenericQuestion } from "@/types/facts.types";

export const RENT_EVICTION_QUESTIONS: GenericQuestion[] = [
  {
    id: "ground_for_eviction",
    text: "Primary ground for eviction",
    type: "select",
    options: [
      "non_payment_of_rent",
      "expiry_of_tenancy",
      "subletting",
      "misuse_of_premises",
      "personal_requirement",
      "structural_alterations",
    ],
  },
  {
    id: "rent_agreement_in_writing",
    text: "Is there a written rent agreement?",
    type: "boolean",
  },
  {
    id: "monthly_rent",
    text: "Monthly rent amount (in Rs)",
    type: "amount",
  },
  {
    id: "rent_arrears_months",
    text: "Number of months rent is in arrears",
    type: "amount",
    condition: (a) => a.ground_for_eviction === "non_payment_of_rent",
  },
  {
    id: "tenancy_period_type",
    text: "Type of tenancy",
    type: "select",
    options: ["month_to_month", "fixed_term", "leave_and_license"],
  },
  {
    id: "previous_notice_sent",
    text: "Has a notice to quit / pay-or-quit already been sent?",
    type: "boolean",
  },
  {
    id: "tenant_in_possession",
    text: "Is the tenant currently in physical possession of the premises?",
    type: "boolean",
  },
];

```


## Directory: `src/lib`

### File: `src\lib\ai\extractTimeline.ts`

**Description:** Source code for `src\lib\ai\extractTimeline.ts`.

```typescript
import { TimelineEvent } from "@/types/timeline.types";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RawEvent {
  date?: string;
  event?: string;
  is_approximate?: boolean;
}

function fallbackNoticeNarrative(data: {
  clientName: string;
  oppPartyName: string;
  chequeAmount: number;
  chequeNumber: string;
  chequeDate: string;
  bankName: string;
  dishonourReason: string;
  returnMemoDate: string;
}): string {
  return `Under instructions from my client ${data.clientName}, it is stated that you, ${data.oppPartyName}, issued Cheque No. ${data.chequeNumber} dated ${data.chequeDate} for a sum of Rs ${data.chequeAmount.toLocaleString(
    "en-IN"
  )}, drawn on ${data.bankName}, towards discharge of a legally enforceable liability. The said cheque, upon presentation, was returned unpaid with the endorsement "${data.dishonourReason}" and return memo dated ${data.returnMemoDate}. Despite repeated demands, you have failed to make payment of the cheque amount to my client. This notice is therefore being issued calling upon you to make payment in accordance with law.`;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function splitSentences(story: string): string[] {
  return story
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean);
}

function extractDateFromSentence(sentence: string): {
  date: string;
  isApproximate: boolean;
} {
  const exactDate =
    sentence.match(
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:\d{1,2}\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4})\b/i
    ) || null;
  if (exactDate?.[0]) {
    return { date: exactDate[0], isApproximate: false };
  }

  const monthYear = sentence.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i
  );
  if (monthYear?.[0]) {
    return { date: `approximate ${monthYear[0]}`, isApproximate: true };
  }

  const yearOnly = sentence.match(/\b(19|20)\d{2}\b/);
  if (yearOnly?.[0]) {
    return { date: `approximate ${yearOnly[0]}`, isApproximate: true };
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return { date: `approximate ${yyyy}-${mm}-${dd} ${hh}:${min}`, isApproximate: true };
}

function describeSentence(sentence: string): string {
  const s = sentence.toLowerCase();
  if (s.includes("lent") || s.includes("loan") || s.includes("borrow")) {
    return sentence;
  }
  if (s.includes("cheque") && (s.includes("issued") || s.includes("gave"))) {
    return sentence;
  }
  if (
    s.includes("present") ||
    s.includes("deposit") ||
    s.includes("submitted to bank")
  ) {
    return sentence;
  }
  if (
    s.includes("dishonour") ||
    s.includes("bounced") ||
    s.includes("insufficient funds")
  ) {
    return sentence;
  }
  if (s.includes("memo")) {
    return sentence;
  }
  if (s.includes("notice")) {
    return sentence;
  }
  if (s.includes("payment") || s.includes("paid")) {
    return sentence;
  }
  return sentence;
}

function fallbackTimelineFromStory(story: string): TimelineEvent[] {
  const sentences = splitSentences(story);
  const picked = sentences.length > 0 ? sentences : [normalizeWhitespace(story)];

  const events = picked
    .slice(0, 12)
    .map((sentence, index) => {
      const { date, isApproximate } = extractDateFromSentence(sentence);
      const description = describeSentence(sentence);
      return {
        event_date: date,
        event_description: description,
        is_approximate: isApproximate,
        sequence_order: index + 1,
      } satisfies TimelineEvent;
    })
    .filter((e) => e.event_description.length > 0);

  return events.length > 0
    ? events
    : [
        {
          event_date: extractDateFromSentence(story).date,
          event_description: normalizeWhitespace(story),
          is_approximate: true,
          sequence_order: 1,
        },
      ];
}

export async function extractTimelineFromStory(
  story: string
): Promise<TimelineEvent[]> {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!apiUrl || !apiKey) {
    return fallbackTimelineFromStory(story);
  }

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are a legal fact extractor for Indian litigation. 
Your ONLY job is to convert a dispute story into a JSON array of chronological legal events.

STRICT RULES:
1. DO NOT add any facts not present in the story
2. DO NOT provide legal opinions or advice
3. DO NOT invent dates — use "approximate" or "unknown" if unclear
4. Output ONLY valid JSON array — no explanation, no markdown, no extra text
5. Each event must have: date (string), event (string), is_approximate (boolean)

Output format:
[
  {"date": "2024-01-15", "event": "Cheque issued by opposite party", "is_approximate": false},
  {"date": "approximate March 2024", "event": "Cheque presented for clearing", "is_approximate": true},
  {"date": "unknown", "event": "Cheque dishonoured by bank", "is_approximate": true}
]`,
    },
    {
      role: "user",
      content: `Extract chronological legal events from this dispute story:\n\n${story}`,
    },
  ];

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o",
        messages,
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return fallbackTimelineFromStory(story);
  }

  if (!response.ok) {
    return fallbackTimelineFromStory(story);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) return fallbackTimelineFromStory(story);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try extracting JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return fallbackTimelineFromStory(story);
    parsed = JSON.parse(match[0]);
  }

  // Normalize: handle both {events: [...]} and direct array
  const rawEvents: RawEvent[] =
    Array.isArray(parsed)
      ? parsed
      : (parsed as { events?: unknown[] }).events || [];

  const events: TimelineEvent[] = rawEvents.map((e, index) => ({
    event_date: e.date || "unknown",
    event_description: e.event || "",
    is_approximate: e.is_approximate ?? false,
    sequence_order: index + 1,
  }));

  const cleaned = events.filter(
    (e) => e.event_description && e.event_description.trim().length > 0
  );

  return cleaned.length > 0 ? cleaned : fallbackTimelineFromStory(story);
}

export async function generateNoticeNarrative(data: {
  clientName: string;
  oppPartyName: string;
  chequeAmount: number;
  chequeNumber: string;
  chequeDate: string;
  bankName: string;
  dishonourReason: string;
  returnMemoDate: string;
  timelineEvents: TimelineEvent[];
  caseFacts: Record<string, unknown>;
}): Promise<string> {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!apiUrl || !apiKey) {
    return fallbackNoticeNarrative(data);
  }

  const timelineSummary = data.timelineEvents
    .map((e) => `- ${e.event_date}: ${e.event_description}`)
    .join("\n");

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are a legal drafting assistant for Indian advocates.
Write a formal, professional narrative paragraph (3-4 sentences) for inclusion in a legal notice under Section 138 NI Act.

STRICT RULES:
1. Write in third person, formal legal English
2. DO NOT add sections, headings, or legal citations — those come from the template
3. DO NOT invent facts — only use what is provided
4. Keep it factual and concise — this is one paragraph only
5. Refer to the drawer as "you" and the payee as "my client"`,
    },
    {
      role: "user",
      content: `Write the narrative paragraph for a legal notice with these facts:

Client (Payee): ${data.clientName}
Opposite Party (Drawer): ${data.oppPartyName}
Cheque No: ${data.chequeNumber}
Cheque Date: ${data.chequeDate}
Amount: ₹${data.chequeAmount}
Bank: ${data.bankName}
Dishonour Reason: ${data.dishonourReason}
Return Memo Date: ${data.returnMemoDate}

Chronological Events:
${timelineSummary}

Additional Facts:
- Part payment made: ${data.caseFacts.part_payment_made ? `Yes — ₹${data.caseFacts.part_payment_amount}` : "No"}
- Written admission available: ${data.caseFacts.written_admission_available ? "Yes" : "No"}`,
    },
  ];

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o",
        messages,
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      return fallbackNoticeNarrative(data);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    return content || fallbackNoticeNarrative(data);
  } catch {
    return fallbackNoticeNarrative(data);
  }
}

```

### File: `src\lib\ai\genericNarrative.ts`

**Description:** Source code for `src\lib\ai\genericNarrative.ts`.

```typescript
import { TimelineEvent } from "@/types/timeline.types";
import { GenericAnswers } from "@/types/facts.types";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NarrativeInput {
  caseType: string;
  clientName: string;
  oppPartyName: string;
  timelineEvents: TimelineEvent[];
  metadata: Record<string, unknown>;
  answers: GenericAnswers;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  rent_eviction: `You are a legal drafting assistant for Indian advocates. Write a 3-4 sentence formal narrative paragraph for inclusion in an eviction notice under the Transfer of Property Act, 1882. Refer to the tenant as "you" and the landlord as "my client". Do not invent facts or add legal sections.`,
  consumer_complaint: `You are a legal drafting assistant. Write a 3-4 sentence formal narrative paragraph for a consumer complaint under the Consumer Protection Act, 2019. Refer to the consumer as "my client" and the service provider as "you". Do not invent facts or add legal sections.`,
  motor_accident_claim: `You are a legal drafting assistant. Write a 3-4 sentence factual paragraph describing the accident sequence for a MACT claim petition. Use third-person and refer to the claimant as "the Petitioner". Do not invent facts.`,
  money_recovery: `You are a legal drafting assistant. Write a 3-4 sentence formal demand paragraph for a money recovery notice under Order 37 CPC. Refer to the debtor as "you" and the creditor as "my client". Do not invent facts.`,
  domestic_violence: `You are a legal drafting assistant. Write a 3-4 sentence factual paragraph for a PWDVA application describing the relationship and shared household. Use formal third-person language ("the Applicant", "the Respondent"). Be factual, not emotive. Do not invent facts.`,
};

function fallbackNarrative(input: NarrativeInput): string {
  return `Under instructions from my client ${input.clientName}, the facts of the dispute concerning ${input.oppPartyName} are recorded as per the chronology of events submitted. My client has placed all documents on record in support of the case and now seeks redressal as prayed for.`;
}

export async function generateGenericNarrative(input: NarrativeInput): Promise<string> {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!apiUrl || !apiKey) return fallbackNarrative(input);

  const system = SYSTEM_PROMPTS[input.caseType] || SYSTEM_PROMPTS.money_recovery;

  const timelineSummary = input.timelineEvents
    .map((e) => `- ${e.event_date}: ${e.event_description}`)
    .join("\n");

  const answersSummary = Object.entries(input.answers)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const messages: AIMessage[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: `Client: ${input.clientName}
Opposite Party: ${input.oppPartyName}

Chronological events:
${timelineSummary || "(none provided)"}

Case-specific details:
${JSON.stringify(input.metadata, null, 2)}

Advocate's answers:
${answersSummary || "(none)"}

Write the narrative paragraph now.`,
    },
  ];

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o",
        messages,
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) return fallbackNarrative(input);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || fallbackNarrative(input);
  } catch {
    return fallbackNarrative(input);
  }
}

```

### File: `src\lib\auth\otpStore.ts`

**Description:** Source code for `src\lib\auth\otpStore.ts`.

```typescript
export const otpStore = new Map<string, { otp: string; expires: number }>();

```

### File: `src\lib\auth\phone.ts`

**Description:** Source code for `src\lib\auth\phone.ts`.

```typescript
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // India default: 10-digit local mobile input -> +91xxxxxxxxxx
  if (!hasPlus && digits.length === 10) {
    return `+91${digits}`;
  }

  // Common local prefix 0xxxxxxxxxx -> +91xxxxxxxxxx
  if (!hasPlus && digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  // 91xxxxxxxxxx entered without + -> +91xxxxxxxxxx
  if (!hasPlus && digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // Generic E.164-ish fallback
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function phoneVariants(raw: string): string[] {
  const normalized = normalizePhone(raw);
  if (!normalized) return [];
  const digits = normalized.replace(/\D/g, "");
  const variants = new Set<string>([normalized, digits]);
  if (digits.startsWith("91") && digits.length === 12) {
    variants.add(digits.slice(2));
    variants.add(`+91${digits.slice(2)}`);
  }
  return Array.from(variants);
}

```

### File: `src\lib\cache\clientDataCache.ts`

**Description:** Source code for `src\lib\cache\clientDataCache.ts`.

```typescript
"use client";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();

export function getClientCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setClientCache<T>(key: string, value: T, ttlMs = 60_000) {
  if (typeof window === "undefined") return;
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearClientCache(prefix?: string) {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}


```

### File: `src\lib\docgen\docxExporter.ts`

**Description:** Source code for `src\lib\docgen\docxExporter.ts`.

```typescript
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";

export async function exportNoticeToDocx(
  fullText: string,
  metadata: {
    act: string;
    sections: string[];
    noticeSentDate: string;
    waitingPeriodEnd?: string;
    complaintDeadline?: string;
  }
): Promise<Buffer> {
  const lines = fullText.split("\n").filter((l) => l.trim() !== "");

  const paragraphs: Paragraph[] = [];

  // Title paragraph
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "LEGAL NOTICE",
          bold: true,
          size: 28,
          color: "1a1a2e",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      border: {
        bottom: {
          color: "b8860b",
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Under Section 138 & 142 of the ${metadata.act}`,
          italics: true,
          size: 20,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Body paragraphs
  for (const line of lines) {
    const isTitle = line.toUpperCase() === line && line.length > 10;
    const isEmpty = line.trim() === "";

    if (isEmpty) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: isTitle,
            size: isTitle ? 22 : 20,
            font: "Times New Roman",
          }),
        ],
        alignment: isTitle ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        spacing: { after: 160, line: 360 },
      })
    );
  }

  // Deadline table
  paragraphs.push(
    new Paragraph({
      text: "",
      spacing: { before: 400 },
    })
  );

  const deadlineTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "KEY DEADLINES", bold: true, size: 18 })],
              }),
            ],
            shading: { type: ShadingType.CLEAR, fill: "1a47f5", color: "ffffff" },
            columnSpan: 2,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Notice Sent Date", bold: true, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: metadata.noticeSentDate, size: 18 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "15-Day Wait Ends", bold: true, size: 18 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: metadata.waitingPeriodEnd ?? "—", size: 18 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Complaint Must Be Filed By", bold: true, size: 18, color: "cc0000" })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: metadata.complaintDeadline ?? "—", bold: true, size: 18, color: "cc0000" })] })],
          }),
        ],
      }),
    ],
  });

  paragraphs.push(
    new Paragraph({
      children: [],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [...paragraphs, deadlineTable],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

```

### File: `src\lib\docgen\genericNoticeBuilder.ts`

**Description:** Source code for `src\lib\docgen\genericNoticeBuilder.ts`.

```typescript
import { format } from "date-fns";
import { Case, CaseParty, User } from "@/types/case.types";
import { GenericAnswers } from "@/types/facts.types";
import {
  RentEvictionMetadata,
  ConsumerComplaintMetadata,
  MotorAccidentMetadata,
  MoneyRecoveryMetadata,
  DomesticViolenceMetadata,
} from "@/types/caseTypes";
import { TimelineEvent } from "@/types/timeline.types";

import { RENT_EVICTION_BLOCKS } from "@/constants/noticeTemplates/rentEviction";
import { CONSUMER_COMPLAINT_BLOCKS } from "@/constants/noticeTemplates/consumerComplaint";
import { MOTOR_ACCIDENT_BLOCKS } from "@/constants/noticeTemplates/motorAccident";
import { MONEY_RECOVERY_BLOCKS } from "@/constants/noticeTemplates/moneyRecovery";
import { DOMESTIC_VIOLENCE_BLOCKS } from "@/constants/noticeTemplates/domesticViolence";

import { RENT_EVICTION_LEGAL_MAP } from "@/constants/legalMappings/rentEviction";
import { CONSUMER_COMPLAINT_LEGAL_MAP } from "@/constants/legalMappings/consumerComplaint";
import { MOTOR_ACCIDENT_LEGAL_MAP } from "@/constants/legalMappings/motorAccidentClaim";
import { MONEY_RECOVERY_LEGAL_MAP } from "@/constants/legalMappings/moneyRecovery";
import { DOMESTIC_VIOLENCE_LEGAL_MAP } from "@/constants/legalMappings/domesticViolence";

export interface GenericNoticeInput {
  advocate: User;
  caseData: Case;
  client: CaseParty;
  oppParty: CaseParty;
  answers: GenericAnswers;
  timeline: TimelineEvent[];
  aiNarrative: string;
}

export interface BuiltGenericNotice {
  fullText: string;
  sections: string[];
  metadata: {
    act: string;
    sections: string[];
    noticeSentDate: string;
    waitingPeriodEnd?: string;
    complaintDeadline?: string;
  };
}

const formatINR = (n: number | undefined | null): string =>
  ((n ?? 0) as number).toLocaleString("en-IN");

const safeDate = (value: string | null | undefined): string => {
  if (!value) return "__ / __ / 20__";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "__ / __ / 20__" : format(d, "dd / MM / yyyy");
};

const advocateBlock = (user: User) => ({
  advocateName: user.name || "Advocate",
  advocateEnrollment: user.enrollment_number || "Not Provided",
  advocateAddress: user.office_address || "Not Provided",
  advocateContact: user.phone || "Not Provided",
});

function buildRentEvictionNotice(input: GenericNoticeInput): BuiltGenericNotice {
  const today = format(new Date(), "dd MMMM yyyy");
  const todayNumeric = format(new Date(), "dd / MM / yyyy");
  const meta = (input.caseData.case_metadata || {}) as RentEvictionMetadata;
  const a = input.answers;

  const arrears = Number(a.rent_arrears_months || 0);
  const monthlyRent = Number(meta.monthly_rent || a.monthly_rent || 0);
  const arrearsAmount = arrears * monthlyRent;

  const sections = [
    RENT_EVICTION_BLOCKS.block_header({
      date: todayNumeric,
      oppPartyName: input.oppParty.name,
      oppPartyAddress: input.oppParty.address,
    }),
    RENT_EVICTION_BLOCKS.block_subject(),
    RENT_EVICTION_BLOCKS.block_intro({
      clientName: input.client.name,
      clientAddress: input.client.address,
    }),
    RENT_EVICTION_BLOCKS.block_tenancy_facts({
      premisesAddress: meta.premises_address || input.oppParty.address,
      monthlyRent: formatINR(monthlyRent),
      tenancyStartDate: safeDate(meta.tenancy_start_date),
      aiNarrative: input.aiNarrative,
    }),
    RENT_EVICTION_BLOCKS.block_breach({
      groundForEviction: String(a.ground_for_eviction || meta.ground_for_eviction || "non payment of rent").replace(/_/g, " "),
      arrearsMonths: String(arrears),
      arrearsAmount: formatINR(arrearsAmount),
    }),
    RENT_EVICTION_BLOCKS.block_termination_demand({
      noticeDays: String(RENT_EVICTION_LEGAL_MAP.notice_period_days),
    }),
    RENT_EVICTION_BLOCKS.block_failure_clause(),
    RENT_EVICTION_BLOCKS.block_closing(advocateBlock(input.advocate)),
    RENT_EVICTION_BLOCKS.block_annexures(),
  ];

  return {
    fullText: sections.join("\n\n"),
    sections,
    metadata: {
      act: RENT_EVICTION_LEGAL_MAP.act,
      sections: RENT_EVICTION_LEGAL_MAP.sections,
      noticeSentDate: today,
    },
  };
}

function buildConsumerComplaintNotice(input: GenericNoticeInput): BuiltGenericNotice {
  const today = format(new Date(), "dd MMMM yyyy");
  const todayNumeric = format(new Date(), "dd / MM / yyyy");
  const meta = (input.caseData.case_metadata || {}) as ConsumerComplaintMetadata;
  const a = input.answers;

  const sections = [
    CONSUMER_COMPLAINT_BLOCKS.block_header({
      date: todayNumeric,
      oppPartyName: input.oppParty.name,
      oppPartyAddress: input.oppParty.address,
    }),
    CONSUMER_COMPLAINT_BLOCKS.block_subject(),
    CONSUMER_COMPLAINT_BLOCKS.block_intro({
      clientName: input.client.name,
      clientAddress: input.client.address,
    }),
    CONSUMER_COMPLAINT_BLOCKS.block_service_facts({
      transactionDate: safeDate(meta.transaction_date),
      considerationAmount: formatINR(Number(meta.consideration_amount || a.consideration_amount || 0)),
      serviceDescription: meta.service_or_goods_description || "the goods/services availed",
      aiNarrative: input.aiNarrative,
    }),
    CONSUMER_COMPLAINT_BLOCKS.block_deficiency({
      deficiencyDescription: meta.deficiency_description || "Deficiency as per attached records.",
    }),
    CONSUMER_COMPLAINT_BLOCKS.block_relief_demand({
      reliefSought: String(a.relief_sought || "refund").replace(/_/g, " "),
      claimAmount: formatINR(Number(a.claim_amount || 0)),
    }),
    CONSUMER_COMPLAINT_BLOCKS.block_failure_clause(),
    CONSUMER_COMPLAINT_BLOCKS.block_closing(advocateBlock(input.advocate)),
    CONSUMER_COMPLAINT_BLOCKS.block_annexures(),
  ];

  return {
    fullText: sections.join("\n\n"),
    sections,
    metadata: {
      act: CONSUMER_COMPLAINT_LEGAL_MAP.act,
      sections: CONSUMER_COMPLAINT_LEGAL_MAP.sections,
      noticeSentDate: today,
    },
  };
}

function buildMotorAccidentPetition(input: GenericNoticeInput): BuiltGenericNotice {
  const today = format(new Date(), "dd MMMM yyyy");
  const todayNumeric = format(new Date(), "dd / MM / yyyy");
  const meta = (input.caseData.case_metadata || {}) as MotorAccidentMetadata;
  const a = input.answers;
  const jurisdictionCity = input.caseData.jurisdiction_city || "Not Provided";

  const sections = [
    MOTOR_ACCIDENT_BLOCKS.block_header({
      date: todayNumeric,
      tribunalName: `Motor Accident Claims Tribunal, ${jurisdictionCity}`,
      jurisdictionCity,
    }),
    MOTOR_ACCIDENT_BLOCKS.block_subject(),
    MOTOR_ACCIDENT_BLOCKS.block_intro({
      clientName: input.client.name,
      clientAddress: input.client.address,
      oppPartyName: input.oppParty.name,
    }),
    MOTOR_ACCIDENT_BLOCKS.block_accident_facts({
      accidentDate: safeDate(meta.accident_date),
      accidentLocation: meta.accident_location || "Not Provided",
      vehicleNumber: meta.vehicle_number || "Not Provided",
      firNumber: String(a.fir_number || meta.fir_number || ""),
      aiNarrative: input.aiNarrative,
    }),
    MOTOR_ACCIDENT_BLOCKS.block_injury_loss({
      claimantRole: String(a.claimant_role || "injured").replace(/_/g, " "),
      injuryDescription: meta.injury_description || "Injuries as detailed in medical records.",
      medicalExpenses: formatINR(Number(meta.medical_expenses || 0)),
      lossOfIncome: formatINR(Number(meta.loss_of_income || 0)),
    }),
    MOTOR_ACCIDENT_BLOCKS.block_compensation_claim({
      totalCompensation: formatINR(Number(a.estimated_compensation || 0)),
    }),
    MOTOR_ACCIDENT_BLOCKS.block_failure_clause(),
    MOTOR_ACCIDENT_BLOCKS.block_closing(advocateBlock(input.advocate)),
    MOTOR_ACCIDENT_BLOCKS.block_annexures(),
  ];

  return {
    fullText: sections.join("\n\n"),
    sections,
    metadata: {
      act: MOTOR_ACCIDENT_LEGAL_MAP.act,
      sections: MOTOR_ACCIDENT_LEGAL_MAP.sections,
      noticeSentDate: today,
    },
  };
}

function buildMoneyRecoveryNotice(input: GenericNoticeInput): BuiltGenericNotice {
  const today = format(new Date(), "dd MMMM yyyy");
  const todayNumeric = format(new Date(), "dd / MM / yyyy");
  const meta = (input.caseData.case_metadata || {}) as MoneyRecoveryMetadata;
  const a = input.answers;

  const principal = Number(meta.principal_amount || a.principal_amount || 0);
  const rate = Number(a.interest_rate || meta.interest_rate || 0);

  const sections = [
    MONEY_RECOVERY_BLOCKS.block_header({
      date: todayNumeric,
      oppPartyName: input.oppParty.name,
      oppPartyAddress: input.oppParty.address,
    }),
    MONEY_RECOVERY_BLOCKS.block_subject(),
    MONEY_RECOVERY_BLOCKS.block_intro({
      clientName: input.client.name,
      clientAddress: input.client.address,
    }),
    MONEY_RECOVERY_BLOCKS.block_debt_background({
      principalAmount: formatINR(principal),
      instrumentType: String(a.instrument_type || meta.instrument_type || "the written instrument").replace(/_/g, " "),
      transactionDate: safeDate(meta.transaction_date),
      aiNarrative: input.aiNarrative,
    }),
    MONEY_RECOVERY_BLOCKS.block_default_facts({
      interestRate: rate ? rate.toString() : "",
      defaultDescription: meta.default_description || "Failure to repay the principal amount within the agreed period.",
    }),
    MONEY_RECOVERY_BLOCKS.block_demand({
      totalDue: formatINR(principal),
    }),
    MONEY_RECOVERY_BLOCKS.block_failure_clause(),
    MONEY_RECOVERY_BLOCKS.block_closing(advocateBlock(input.advocate)),
    MONEY_RECOVERY_BLOCKS.block_annexures(),
  ];

  return {
    fullText: sections.join("\n\n"),
    sections,
    metadata: {
      act: MONEY_RECOVERY_LEGAL_MAP.act,
      sections: MONEY_RECOVERY_LEGAL_MAP.sections,
      noticeSentDate: today,
    },
  };
}

function buildDomesticViolenceApplication(input: GenericNoticeInput): BuiltGenericNotice {
  const today = format(new Date(), "dd MMMM yyyy");
  const todayNumeric = format(new Date(), "dd / MM / yyyy");
  const meta = (input.caseData.case_metadata || {}) as DomesticViolenceMetadata;
  const a = input.answers;
  const jurisdictionCity = input.caseData.jurisdiction_city || "Not Provided";

  const sections = [
    DOMESTIC_VIOLENCE_BLOCKS.block_header({
      date: todayNumeric,
      courtName: meta.jurisdiction_court || `Magistrate's Court, ${jurisdictionCity}`,
      jurisdictionCity,
    }),
    DOMESTIC_VIOLENCE_BLOCKS.block_subject(),
    DOMESTIC_VIOLENCE_BLOCKS.block_intro({
      clientName: input.client.name,
      clientAddress: input.client.address,
      oppPartyName: input.oppParty.name,
    }),
    DOMESTIC_VIOLENCE_BLOCKS.block_relationship_facts({
      relationshipType: String(a.domestic_relationship_type || meta.relationship_type || "wife"),
      sharedHousehold: String(Boolean(a.shared_household_currently ?? meta.shared_household)),
      aiNarrative: input.aiNarrative,
    }),
    DOMESTIC_VIOLENCE_BLOCKS.block_incident_narrative({
      incidentSummary: meta.incident_summary || input.aiNarrative,
      violenceType: String(a.violence_types || meta.violence_type || "physical"),
    }),
    DOMESTIC_VIOLENCE_BLOCKS.block_relief_sought({
      protectionOrder: String(Boolean(a.protection_order_required)),
      residenceOrder: String(Boolean(a.residence_order_required)),
      monetaryRelief: String(Boolean(a.monetary_relief_required)),
      monetaryAmount: formatINR(Number(a.monetary_relief_amount || 0)),
      custodyOrder: String(Boolean(a.minor_children_involved)),
    }),
    DOMESTIC_VIOLENCE_BLOCKS.block_failure_clause(),
    DOMESTIC_VIOLENCE_BLOCKS.block_closing(advocateBlock(input.advocate)),
    DOMESTIC_VIOLENCE_BLOCKS.block_annexures(),
  ];

  return {
    fullText: sections.join("\n\n"),
    sections,
    metadata: {
      act: DOMESTIC_VIOLENCE_LEGAL_MAP.act,
      sections: DOMESTIC_VIOLENCE_LEGAL_MAP.sections,
      noticeSentDate: today,
    },
  };
}

export async function buildGenericNotice(
  caseType: string,
  input: GenericNoticeInput
): Promise<BuiltGenericNotice> {
  switch (caseType) {
    case "rent_eviction":
      return buildRentEvictionNotice(input);
    case "consumer_complaint":
      return buildConsumerComplaintNotice(input);
    case "motor_accident_claim":
      return buildMotorAccidentPetition(input);
    case "money_recovery":
      return buildMoneyRecoveryNotice(input);
    case "domestic_violence":
      return buildDomesticViolenceApplication(input);
    default:
      throw new Error(`Unsupported case type for generic builder: ${caseType}`);
  }
}

```

### File: `src\lib\docgen\noticeBuilder.ts`

**Description:** Source code for `src\lib\docgen\noticeBuilder.ts`.

```typescript
import { NOTICE_TEMPLATE_BLOCKS } from "@/constants/noticeTemplates";
import { CHEQUE_BOUNCE_LEGAL_MAP, computeDeadlinesFromNoticeDate } from "@/constants/legalMapping";
import { Case, CaseParty, CaseFinancials, CaseFacts, User } from "@/types/case.types";
import { TimelineEvent } from "@/types/timeline.types";
import { generateNoticeNarrative } from "@/lib/ai/extractTimeline";
import { format } from "date-fns";

export interface NoticeInput {
  advocate: User;
  caseData: Case;
  client: CaseParty;
  oppParty: CaseParty;
  financials: CaseFinancials;
  facts: CaseFacts;
  timeline: TimelineEvent[];
}

export interface BuiltNotice {
  fullText: string;
  sections: string[];
  metadata: {
    act: string;
    sections: string[];
    noticeSentDate: string;
    waitingPeriodEnd: string;
    complaintDeadline: string;
  };
}

export async function buildNotice(input: NoticeInput): Promise<BuiltNotice> {
  const today = format(new Date(), "dd MMMM yyyy");
  const todayNumeric = format(new Date(), "dd / MM / yyyy");
  const { waitingPeriodEnd, complaintDeadline } =
    computeDeadlinesFromNoticeDate(new Date().toISOString());

  const safeFormatDate = (value: string | null | undefined): string => {
    if (!value) return "__ / __ / 20__";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "__ / __ / 20__" : format(d, "dd / MM / yyyy");
  };

  // 1. Generate AI narrative paragraph
  const aiNarrative = await generateNoticeNarrative({
    clientName: input.client.name,
    oppPartyName: input.oppParty.name,
    chequeAmount: input.financials.cheque_amount,
    chequeNumber: input.financials.cheque_number,
    chequeDate: input.financials.cheque_date,
    bankName: input.financials.bank_name,
    dishonourReason: input.financials.dishonour_reason,
    returnMemoDate: input.financials.return_memo_date,
    timelineEvents: input.timeline,
    caseFacts: {
      part_payment_made: input.facts.part_payment_made,
      part_payment_amount: input.facts.part_payment_amount,
      written_admission_available: input.facts.written_admission_available,
    },
  });

  // 2. Build sections from hardcoded template blocks
  const chequeAmount = input.financials.cheque_amount.toLocaleString("en-IN");
  const transactionDate = input.timeline?.[0]?.event_date || safeFormatDate(input.financials.cheque_date);
  const transactionPurpose = "loan / legally enforceable liability";

  const sections: string[] = [
    NOTICE_TEMPLATE_BLOCKS.block_header({
      date: todayNumeric,
      oppPartyName: input.oppParty.name,
      oppPartyAddress: input.oppParty.address,
    }),

    NOTICE_TEMPLATE_BLOCKS.block_subject(),

    NOTICE_TEMPLATE_BLOCKS.block_intro({
      clientName: input.client.name,
      clientAddress: input.client.address,
    }),

    NOTICE_TEMPLATE_BLOCKS.block_transaction_background({
      chequeAmount,
      transactionDate,
      transactionPurpose,
      aiNarrative,
    }),

    NOTICE_TEMPLATE_BLOCKS.block_issuance_of_cheque({
      chequeNumber: input.financials.cheque_number,
      chequeDate: safeFormatDate(input.financials.cheque_date),
      chequeAmount,
      bankName: `${input.financials.bank_name} Branch`,
    }),

    NOTICE_TEMPLATE_BLOCKS.block_dishonour({
      dishonourReason: input.financials.dishonour_reason,
      returnMemoDate: safeFormatDate(input.financials.return_memo_date),
    }),

    NOTICE_TEMPLATE_BLOCKS.block_demand({
      chequeAmount,
    }),

    NOTICE_TEMPLATE_BLOCKS.block_failure_clause(),

    NOTICE_TEMPLATE_BLOCKS.block_closing({
      advocateName: input.advocate.name || "Advocate",
      advocateEnrollment: input.advocate.enrollment_number || "Not Provided",
      advocateAddress: input.advocate.office_address || "Not Provided",
      advocateContact: input.advocate.phone || "Not Provided",
    }),

    NOTICE_TEMPLATE_BLOCKS.block_annexures(),
  ];

  const fullText = sections.join("\n\n");

  return {
    fullText,
    sections,
    metadata: {
      act: CHEQUE_BOUNCE_LEGAL_MAP.act,
      sections: CHEQUE_BOUNCE_LEGAL_MAP.sections,
      noticeSentDate: today,
      waitingPeriodEnd: format(waitingPeriodEnd, "dd MMMM yyyy"),
      complaintDeadline: format(complaintDeadline, "dd MMMM yyyy"),
    },
  };
}

```

### File: `src\lib\docgen\pdfExporter.ts`

**Description:** Source code for `src\lib\docgen\pdfExporter.ts`.

```typescript
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 36;
const CONTENT_LEFT = 52;
const CONTENT_RIGHT = PAGE_WIDTH - 52;
const CONTENT_TOP = 690;
const CONTENT_BOTTOM = 58;
const LINE_HEIGHT = 15;

function esc(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function estimateCharWidth(ch: string, fontSize: number): number {
  if (ch === " ") return fontSize * 0.28;
  if (/[A-Z]/.test(ch)) return fontSize * 0.62;
  if (/[a-z]/.test(ch)) return fontSize * 0.52;
  if (/[0-9]/.test(ch)) return fontSize * 0.55;
  return fontSize * 0.5;
}

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) width += estimateCharWidth(ch, fontSize);
  return width;
}

function wrapTextByWidth(line: string, fontSize: number, maxWidth: number): string[] {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const out: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (estimateTextWidth(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      if (current) out.push(current);
      current = w;
    }
  }
  if (current) out.push(current);
  return out;
}

function normalizeLines(fullText: string): string[] {
  const maxLineWidth = CONTENT_RIGHT - CONTENT_LEFT - 10;
  return fullText
    .split("\n")
    .map((l) => l.trim())
    .flatMap((line) => {
      if (!line) return [""];
      const isHeading = isSectionHeading(line);
      const fontSize = isHeading ? 12 : 11;
      return wrapTextByWidth(line, fontSize, maxLineWidth);
    });
}

function isSectionHeading(line: string): boolean {
  return (
    /^\d+\.\s+[A-Z]/.test(line) ||
    line.startsWith("SUBJECT:") ||
    line.startsWith("ANNEXURES")
  );
}

function pageFrame(): string {
  return [
    "q",
    "0.8 w",
    "0.22 0.22 0.22 RG",
    `${PAGE_MARGIN} ${PAGE_MARGIN} ${PAGE_WIDTH - PAGE_MARGIN * 2} ${PAGE_HEIGHT - PAGE_MARGIN * 2} re S`,
    "0.45 w",
    "0.35 0.35 0.35 RG",
    `${PAGE_MARGIN + 6} ${PAGE_HEIGHT - 102} ${PAGE_WIDTH - (PAGE_MARGIN + 6) * 2} 58 re S`,
    "Q",
  ].join("\n");
}

function headerBlock(): string {
  const title = "LEGAL NOTICE";
  const sub = "Section 138 / 142 - Negotiable Instruments Act, 1881";

  return [
    "BT",
    "/F2 20 Tf",
    "0.1 0.1 0.1 rg",
    `${(PAGE_WIDTH / 2) - 86} ${PAGE_HEIGHT - 70} Td`,
    `(${esc(title)}) Tj`,
    "ET",
    "BT",
    "/F1 10 Tf",
    "0.32 0.32 0.32 rg",
    `${(PAGE_WIDTH / 2) - 128} ${PAGE_HEIGHT - 88} Td`,
    `(${esc(sub)}) Tj`,
    "ET",
    "q",
    "1 w",
    "0.45 0.45 0.45 RG",
    `${PAGE_MARGIN + 20} ${PAGE_HEIGHT - 108} m ${PAGE_WIDTH - PAGE_MARGIN - 20} ${PAGE_HEIGHT - 108} l S`,
    "Q",
  ].join("\n");
}

function buildPageContent(lines: string[], pageNo: number): string {
  const ops: string[] = [pageFrame(), headerBlock()];
  let y = CONTENT_TOP;

  ops.push("BT");
  for (const line of lines) {
    if (y < CONTENT_BOTTOM) break;

    if (line === "") {
      y -= LINE_HEIGHT - 3;
      continue;
    }

    const isHeading = isSectionHeading(line);
    const fontSize = isHeading ? 12 : 11;
    if (isHeading) {
      ops.push(`/F2 ${fontSize} Tf`);
      ops.push("0.14 0.14 0.14 rg");
    } else {
      ops.push(`/F1 ${fontSize} Tf`);
      ops.push("0.08 0.08 0.08 rg");
    }

    ops.push(`1 0 0 1 ${CONTENT_LEFT} ${y} Tm`);
    ops.push(`(${esc(line)}) Tj`);
    y -= LINE_HEIGHT;
  }
  ops.push("ET");

  ops.push(
    "BT",
    "/F1 9 Tf",
    "0.4 0.4 0.4 rg",
    `1 0 0 1 ${PAGE_WIDTH - 96} ${PAGE_MARGIN + 10} Tm`,
    `(Page ${pageNo}) Tj`,
    "ET"
  );

  return ops.join("\n");
}

function buildObjects(contents: string[]): string[] {
  const pageCount = contents.length;
  const firstPageId = 3;
  const fontRegularId = firstPageId + pageCount * 2;
  const fontBoldId = fontRegularId + 1;
  const totalObjects = fontBoldId;

  const objects: string[] = new Array(totalObjects + 1).fill("");
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;

  const kids: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const pageId = firstPageId + i * 2;
    const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);

    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`;

    const stream = contents[i];
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  }

  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`;
  objects[fontRegularId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  objects[fontBoldId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;

  return objects;
}

function toPdf(objects: string[]): Buffer {
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function exportNoticeToPdf(fullText: string): Promise<Buffer> {
  const lines = normalizeLines(fullText);

  const linesPerPage = Math.max(1, Math.floor((CONTENT_TOP - CONTENT_BOTTOM) / LINE_HEIGHT));
  const pageChunks: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pageChunks.push(lines.slice(i, i + linesPerPage));
  }
  if (pageChunks.length === 0) {
    pageChunks.push([" "]);
  }

  const contents = pageChunks.map((chunk, idx) => buildPageContent(chunk, idx + 1));
  const objects = buildObjects(contents);
  return toPdf(objects);
}

```

### File: `src\lib\firebase\admin.ts`

**Description:** Source code for `src\lib\firebase\admin.ts`.

```typescript
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

export async function verifyFirebasePhoneIdToken(idToken: string) {
  const auth = getAuth(getFirebaseAdminApp());
  return auth.verifyIdToken(idToken, true);
}

```

### File: `src\lib\firebase\client.ts`

**Description:** Source code for `src\lib\firebase\client.ts`.

```typescript
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

function assertFirebaseClientEnv() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase client env vars: ${missing.join(", ")}`);
  }
}

export function getFirebaseClientAuth() {
  assertFirebaseClientEnv();
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

```

### File: `src\lib\reminders\emailSender.ts`

**Description:** Source code for `src\lib\reminders\emailSender.ts`.

```typescript
import { Resend } from "resend";
import { Case } from "@/types/case.types";
import { ReminderType } from "@/types/reminder.types";

function getReminderContent(
  type: ReminderType,
  caseData: Case & { client_name?: string }
): { subject: string; html: string } {
  const caseRef = caseData.case_number || caseData.id.slice(0, 8).toUpperCase();
  const client = caseData.client_name || "Your client";

  switch (type) {
    case "payment_wait_ending":
      return {
        subject: `⚠️ CaseFlow Alert: 15-Day Wait Ending — Case #${caseRef}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">⚖️ CaseFlow Alert</h1>
            </div>
            <div style="background: #fff8e6; border: 1px solid #f5a623; padding: 24px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #b8860b; margin-top: 0;">15-Day Payment Wait Ending</h2>
              <p>The 15-day payment waiting period for <strong>Case #${caseRef}</strong> (${client}) is ending.</p>
              <p>If payment has not been received, you are now eligible to file a criminal complaint under <strong>Section 138, NI Act</strong>.</p>
              <p style="color: #cc0000;"><strong>Action Required:</strong> Log in to CaseFlow to check the case status and proceed.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="display: inline-block; background: #1a47f5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">
                Open CaseFlow
              </a>
            </div>
          </div>`,
      };

    case "complaint_deadline_warning":
      return {
        subject: `🚨 URGENT: Complaint Deadline in 3 Days — Case #${caseRef}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #cc0000; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">🚨 URGENT — CaseFlow Deadline Alert</h1>
            </div>
            <div style="background: #fff5f5; border: 1px solid #cc0000; padding: 24px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #cc0000; margin-top: 0;">Complaint Deadline in 3 Days</h2>
              <p>The limitation period for filing a complaint in <strong>Case #${caseRef}</strong> (${client}) expires in <strong>3 days</strong>.</p>
              <p>Failure to file before the deadline will result in the case becoming <strong>time-barred</strong> under Section 142, NI Act.</p>
              <p><strong>File the complaint immediately.</strong></p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="display: inline-block; background: #cc0000; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">
                Open CaseFlow Now
              </a>
            </div>
          </div>`,
      };

    case "limitation_final_warning":
      return {
        subject: `🔴 FINAL WARNING: Complaint Deadline TOMORROW — Case #${caseRef}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7b0000; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">🔴 FINAL WARNING — CaseFlow</h1>
            </div>
            <div style="background: #fff0f0; border: 2px solid #7b0000; padding: 24px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #7b0000; margin-top: 0;">Complaint Deadline is TOMORROW</h2>
              <p>Case <strong>#${caseRef}</strong> (${client}) complaint limitation period expires <strong>tomorrow</strong>.</p>
              <p style="color: #7b0000; font-weight: bold;">FILE THE COMPLAINT TODAY — NO EXTENSIONS POSSIBLE</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="display: inline-block; background: #7b0000; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">
                Open CaseFlow Immediately
              </a>
            </div>
          </div>`,
      };
  }
}

export async function sendReminderEmail(
  to: string,
  type: ReminderType,
  caseData: Case & { client_name?: string }
): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log("[DEV] RESEND_API_KEY missing - skipping email");
      return false;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { subject, html } = getReminderContent(type, caseData);

    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@caseflow.in",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Email sender error:", err);
    return false;
  }
}

```

### File: `src\lib\reminders\whatsappSender.ts`

**Description:** Source code for `src\lib\reminders\whatsappSender.ts`.

```typescript
import { ReminderType } from "@/types/reminder.types";

function getWhatsAppMessage(
  type: ReminderType,
  caseRef: string,
  clientName: string
): string {
  switch (type) {
    case "payment_wait_ending":
      return `⚖️ *CaseFlow Alert*\n\n15-day payment wait is ending for Case #${caseRef} (${clientName}).\n\nIf no payment received, you may now file a complaint under Sec 138 NI Act.\n\nOpen CaseFlow: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

    case "complaint_deadline_warning":
      return `🚨 *URGENT — CaseFlow*\n\nComplaint deadline in *3 days* for Case #${caseRef} (${clientName}).\n\nFile immediately or case becomes time-barred.\n\nOpen CaseFlow: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

    case "limitation_final_warning":
      return `🔴 *FINAL WARNING — CaseFlow*\n\nComplaint deadline is *TOMORROW* for Case #${caseRef} (${clientName}).\n\n*FILE TODAY — NO EXTENSIONS POSSIBLE*\n\n${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
  }
}

export async function sendWhatsAppReminder(
  phone: string,
  type: ReminderType,
  caseRef: string,
  clientName: string
): Promise<boolean> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_API_URL) {
    console.log("[DEV] WhatsApp not configured — skipping");
    return false;
  }

  try {
    const message = getWhatsAppMessage(type, caseRef, clientName);

    const response = await fetch(process.env.WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace("+", ""),
        type: "text",
        text: { body: message },
      }),
    });

    return response.ok;
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return false;
  }
}

```

### File: `src\lib\supabase\client.ts`

**Description:** Source code for `src\lib\supabase\client.ts`.

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    // Allow static build/prerender in environments where public env vars are not set.
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-key");
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}

```

### File: `src\lib\supabase\middleware.ts`

**Description:** Source code for `src\lib\supabase\middleware.ts`.

```typescript
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes should never be redirected by page auth logic.
  if (pathname.startsWith("/api")) {
    return NextResponse.next({ request });
  }

  const userId = request.cookies.get("cf_user_id")?.value;
  const publicPaths = ["/login", "/verify"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!userId && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (userId && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

```

### File: `src\lib\supabase\server.ts`

**Description:** Source code for `src\lib\supabase\server.ts`.

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = cookies();

  if (!supabaseUrl || !supabaseAnonKey) {
    // Allow static build/prerender in environments where public env vars are not set.
    return createServerClient("https://placeholder.supabase.co", "placeholder-key", {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    });
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey
  );
}

```

### File: `src\lib\utils\dateUtils.ts`

**Description:** Source code for `src\lib\utils\dateUtils.ts`.

```typescript
import { differenceInDays, format, isPast, addDays } from "date-fns";

export function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  return differenceInDays(target, new Date());
}

export function isExpired(dateString: string | null): boolean {
  if (!dateString) return false;
  return isPast(new Date(dateString));
}

export function formatDisplayDate(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd MMM yyyy");
  } catch {
    return dateString;
  }
}

export function addDaysToDate(dateString: string, days: number): Date {
  return addDays(new Date(dateString), days);
}

export function getUrgencyLevel(
  daysLeft: number | null
): "safe" | "warning" | "critical" | "expired" {
  if (daysLeft === null) return "safe";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 1) return "critical";
  if (daysLeft <= 3) return "warning";
  return "safe";
}

```

### File: `src\lib\utils\formatters.ts`

**Description:** Source code for `src\lib\utils\formatters.ts`.

```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAmountWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  if (amount === 0) return "Zero";

  function convertBelow1000(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertBelow1000(n % 100) : "");
  }

  let result = "";
  if (amount >= 10000000) {
    result += convertBelow1000(Math.floor(amount / 10000000)) + " Crore ";
    amount %= 10000000;
  }
  if (amount >= 100000) {
    result += convertBelow1000(Math.floor(amount / 100000)) + " Lakh ";
    amount %= 100000;
  }
  if (amount >= 1000) {
    result += convertBelow1000(Math.floor(amount / 1000)) + " Thousand ";
    amount %= 1000;
  }
  if (amount > 0) {
    result += convertBelow1000(amount);
  }

  return result.trim() + " Only";
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}

```


## Directory: `src/components`

### File: `src\components\auth\OtpForm.tsx`

**Description:** Source code for `src\components\auth\OtpForm.tsx`.

```typescript

```

### File: `src\components\auth\VerifyForm.tsx`

**Description:** Source code for `src\components\auth\VerifyForm.tsx`.

```typescript

```

### File: `src\components\cases\CaseCard.tsx`

**Description:** Source code for `src\components\cases\CaseCard.tsx`.

```typescript
"use client";

import { useRouter } from "next/navigation";
import { Case } from "@/types/case.types";
import { StageBadge } from "@/components/ui/Badge";
import Countdown from "@/components/ui/Countdown";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import { CASE_STAGES } from "@/constants/caseStages";
import { ChevronRight, Calendar, IndianRupee } from "lucide-react";

interface CaseCardProps {
  caseData: Case;
}

export default function CaseCard({ caseData }: CaseCardProps) {
  const router = useRouter();

  const client = caseData.case_parties?.find((p) => p.role === "client");
  const oppParty = caseData.case_parties?.find((p) => p.role === "opposite_party");
  const financials = caseData.case_financials;
  const stageConfig = CASE_STAGES[caseData.stage];

  const nextAction = stageConfig?.primaryAction || "View case";

  return (
    <div
      onClick={() => router.push(`/cases/${caseData.id}`)}
      onMouseEnter={() => router.prefetch(`/cases/${caseData.id}`)}
      onTouchStart={() => router.prefetch(`/cases/${caseData.id}`)}
      className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 cursor-pointer p-5"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900 truncate">
              {client?.name || "Unknown Client"}
            </p>
            <span className="text-gray-300">vs</span>
            <p className="text-gray-600 truncate text-sm">
              {oppParty?.name || "Unknown Party"}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Case #{caseData.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StageBadge stage={caseData.stage} />
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Financial Row */}
      {financials && (
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-800">
              {formatCurrency(financials.cheque_amount)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Cheque: {formatDisplayDate(financials.cheque_date)}</span>
          </div>
        </div>
      )}

      {/* Deadlines Row */}
      {caseData.complaint_deadline && (
        <div className="mb-3">
          <Countdown
            label="Complaint Deadline"
            date={caseData.complaint_deadline}
            showIcon
          />
        </div>
      )}

      {/* Next Action */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Created: {formatDisplayDate(caseData.created_at)}
        </p>
        <p className="text-xs font-semibold text-brand-600">
          → {nextAction}
        </p>
      </div>
    </div>
  );
}

```

### File: `src\components\cases\CaseForm.tsx`

**Description:** Source code for `src\components\cases\CaseForm.tsx`.

```typescript
﻿"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CreateCasePayload } from "@/types/case.types";
import { IndianRupee, FileText, Building2, ArrowRight, Loader2, User, UserRound } from "lucide-react";
import styles from "./newcase-content.module.css";

interface CaseFormProps {
  onBack: () => void;
}

const DISHONOUR_REASONS = [
  "Insufficient funds",
  "Account closed",
  "Payment stopped by drawer",
  "Signature mismatch",
  "Cheque date expired (stale cheque)",
  "Amount in words and figures differ",
  "Drawer account dormant",
  "Refer to drawer",
];

export default function CaseForm({ onBack }: CaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateCasePayload>({
    case_type: "cheque_bounce",
    client_name: "",
    client_address: "",
    opposite_party_name: "",
    opposite_party_address: "",
    cheque_number: "",
    cheque_date: "",
    cheque_amount: 0,
    bank_name: "",
    dishonour_reason: "",
    return_memo_date: "",
    jurisdiction_city: "",
  });

  const update = (field: keyof CreateCasePayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const advocateId = localStorage.getItem("cf_user_id");
    if (!advocateId) {
      toast.error("Session expired. Please login again.");
      router.push("/login");
      return;
    }

    const chequeAmount = form.cheque_amount ?? 0;
    if (!chequeAmount || chequeAmount <= 0) {
      toast.error("Cheque amount must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, advocate_id: advocateId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create case");

      toast.success("Case created successfully!");
      router.push(`/cases/${data.caseId}/story`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.block}>
      <div className={styles.formTop}>
        <div>
          <h2 className={styles.formTitle}>Case Details</h2>
          <p className={styles.formSub}>Cheque Bounce - Section 138, NI Act</p>
        </div>
        <button type="button" onClick={onBack} className={styles.textLink}>
          Change type
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <User size={14} /> Client (Payee)
        </h3>
        <div className={styles.field}>
          <label className={styles.label}>Client Full Name</label>
          <input
            className={styles.input}
            value={form.client_name}
            onChange={(e) => update("client_name", e.target.value)}
            placeholder="e.g. Ramesh Subramaniam"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Client Address</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.client_address}
            onChange={(e) => update("client_address", e.target.value)}
            placeholder="Full address of your client"
            required
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <UserRound size={14} /> Opposite Party (Drawer)
        </h3>
        <div className={styles.field}>
          <label className={styles.label}>Opposite Party Full Name</label>
          <input
            className={styles.input}
            value={form.opposite_party_name}
            onChange={(e) => update("opposite_party_name", e.target.value)}
            placeholder="e.g. Suresh Krishnan"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Opposite Party Address</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.opposite_party_address}
            onChange={(e) => update("opposite_party_address", e.target.value)}
            placeholder="Full address for notice delivery"
            required
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <FileText size={14} /> Cheque Details
        </h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Cheque Number</label>
            <input
              className={styles.input}
              value={form.cheque_number}
              onChange={(e) => update("cheque_number", e.target.value)}
              placeholder="e.g. 001234"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Cheque Date</label>
            <input
              className={styles.input}
              type="date"
              value={form.cheque_date}
              onChange={(e) => update("cheque_date", e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Cheque Amount</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f3d89f]" />
            <input
              className={`${styles.input} pl-9`}
              type="number"
              value={form.cheque_amount ?? ""}
              onChange={(e) => update("cheque_amount", Number.parseFloat(e.target.value) || 0)}
              placeholder="e.g. 500000"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Bank Name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#f3d89f]" />
            <input
              className={`${styles.input} pl-9`}
              value={form.bank_name}
              onChange={(e) => update("bank_name", e.target.value)}
              placeholder="e.g. State Bank of India, Chennai Branch"
              required
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>Dishonour and Jurisdiction</h3>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Reason for Dishonour</label>
            <select
              className={styles.select}
              value={form.dishonour_reason}
              onChange={(e) => update("dishonour_reason", e.target.value)}
              required
            >
              <option value="">Select dishonour reason</option>
              {DISHONOUR_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Return Memo Date</label>
            <input
              className={styles.input}
              type="date"
              value={form.return_memo_date}
              onChange={(e) => update("return_memo_date", e.target.value)}
              required
            />
            <p className={styles.hint}>Date shown on bank dishonour memo</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Jurisdiction City</label>
          <input
            className={styles.input}
            value={form.jurisdiction_city || ""}
            onChange={(e) => update("jurisdiction_city", e.target.value)}
            placeholder="e.g. Chennai"
            required
          />
          <p className={styles.hint}>City where complaint will be filed</p>
        </div>
      </section>

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Saving case...
          </>
        ) : (
          <>
            Save Case and Continue <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

```

### File: `src\components\cases\CaseTypeSelector.tsx`

**Description:** Source code for `src\components\cases\CaseTypeSelector.tsx`.

```typescript
﻿import {
  Scale,
  ChevronRight,
  Landmark,
  Banknote,
  ShoppingBag,
  Home,
  Car,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import styles from "./newcase-content.module.css";
import { CASE_TYPE_REGISTRY } from "@/constants/caseTypeRegistry";
import { CaseTypeId } from "@/types/caseTypes";

interface CaseTypeSelectorProps {
  onSelect: (type: CaseTypeId) => void;
}

const ICONS: Record<CaseTypeId, LucideIcon> = {
  cheque_bounce: Landmark,
  money_recovery: Banknote,
  consumer_complaint: ShoppingBag,
  rent_eviction: Home,
  motor_accident_claim: Car,
  domestic_violence: ShieldAlert,
};

export default function CaseTypeSelector({ onSelect }: CaseTypeSelectorProps) {
  const types = Object.values(CASE_TYPE_REGISTRY);

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <h2 className={styles.title}>Select Case Type</h2>
        <p className={styles.subtitle}>
          Choose the type of case you want to draft. Each type uses its own legal
          framework, question bank, and notice template.
        </p>
      </div>

      <div className={styles.selectorList}>
        {types.map((option) => {
          const Icon = ICONS[option.id];
          const cardClass = option.available
            ? styles.typeCard
            : `${styles.typeCard} ${styles.typeCardDisabled}`;
          const badgeClass = option.available
            ? `${styles.badge} ${styles.badgeLive}`
            : `${styles.badge} ${styles.badgeSoon}`;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => option.available && onSelect(option.id)}
              disabled={!option.available}
              aria-disabled={!option.available}
              className={cardClass}
            >
              <div className={styles.typeRow}>
                <div className={styles.typeMain}>
                  <span className={styles.iconWrap}>
                    <Icon size={17} />
                  </span>
                  <div>
                    <p className={styles.typeTitle}>{option.title}</p>
                    <div className={styles.metaRow}>
                      <p className={styles.typeSubtitle}>{option.subtitle}</p>
                      <span className={badgeClass}>
                        {option.available ? "Available" : "Coming Soon"}
                      </span>
                    </div>
                    <p className={styles.desc}>{option.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.note}>
        <Scale className="w-4 h-4 inline-block mr-1.5 align-text-top" />
        <strong>Legal Mapping:</strong> All sections, notice periods, and
        deadlines are hardcoded - not AI-generated. AI only writes the
        notice language.
      </div>
    </div>
  );
}

```

### File: `src\components\cases\GenericCaseForm.tsx`

**Description:** Source code for `src\components\cases\GenericCaseForm.tsx`.

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight, Loader2, User, UserRound, FileText } from "lucide-react";
import styles from "./newcase-content.module.css";
import { CaseTypeId, CaseMetadata } from "@/types/caseTypes";
import { CASE_TYPE_REGISTRY } from "@/constants/caseTypeRegistry";

interface GenericCaseFormProps {
  caseType: CaseTypeId;
  onBack: () => void;
}

interface BaseFormState {
  client_name: string;
  client_address: string;
  opposite_party_name: string;
  opposite_party_address: string;
  jurisdiction_city: string;
}

const EMPTY_BASE: BaseFormState = {
  client_name: "",
  client_address: "",
  opposite_party_name: "",
  opposite_party_address: "",
  jurisdiction_city: "",
};

// Per-type metadata field config (drives the dynamic section).
type FieldKind = "text" | "textarea" | "number" | "date" | "select";
interface MetadataField {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

const METADATA_FIELDS: Record<Exclude<CaseTypeId, "cheque_bounce">, MetadataField[]> = {
  rent_eviction: [
    { key: "premises_address", label: "Premises Address", kind: "textarea", required: true },
    { key: "monthly_rent", label: "Monthly Rent (Rs)", kind: "number", required: true },
    { key: "tenancy_start_date", label: "Tenancy Start Date", kind: "date", required: true },
    {
      key: "ground_for_eviction",
      label: "Ground for Eviction",
      kind: "select",
      required: true,
      options: [
        "non_payment_of_rent",
        "expiry_of_tenancy",
        "subletting",
        "misuse_of_premises",
        "personal_requirement",
        "structural_alterations",
      ],
    },
    { key: "rent_arrears_months", label: "Months in Arrears", kind: "number" },
  ],
  consumer_complaint: [
    { key: "transaction_date", label: "Transaction Date", kind: "date", required: true },
    { key: "consideration_amount", label: "Amount Paid (Rs)", kind: "number", required: true },
    { key: "service_or_goods_description", label: "Goods / Services Description", kind: "textarea", required: true },
    { key: "deficiency_description", label: "Deficiency / Defect Description", kind: "textarea", required: true },
    {
      key: "forum",
      label: "Target Forum (by claim value)",
      kind: "select",
      required: true,
      options: ["district", "state", "national"],
    },
  ],
  motor_accident_claim: [
    { key: "accident_date", label: "Date of Accident", kind: "date", required: true },
    { key: "accident_location", label: "Location of Accident", kind: "text", required: true },
    { key: "vehicle_number", label: "Offending Vehicle Number", kind: "text", required: true },
    { key: "fir_number", label: "FIR Number (if any)", kind: "text" },
    { key: "injury_description", label: "Injury / Loss Description", kind: "textarea", required: true },
    { key: "medical_expenses", label: "Medical Expenses (Rs)", kind: "number" },
    { key: "loss_of_income", label: "Loss of Income (Rs)", kind: "number" },
  ],
  money_recovery: [
    { key: "principal_amount", label: "Principal Amount (Rs)", kind: "number", required: true },
    { key: "transaction_date", label: "Transaction Date", kind: "date", required: true },
    {
      key: "instrument_type",
      label: "Written Instrument Type",
      kind: "select",
      required: true,
      options: ["promissory_note", "loan_agreement", "invoice", "ledger", "email_admission", "other"],
    },
    { key: "default_description", label: "Default Description", kind: "textarea", required: true },
    { key: "interest_rate", label: "Interest Rate (% p.a.)", kind: "number" },
  ],
  domestic_violence: [
    {
      key: "relationship_type",
      label: "Relationship to Respondent",
      kind: "select",
      required: true,
      options: ["wife", "live_in_partner", "mother", "sister", "daughter", "other_relative"],
    },
    {
      key: "shared_household",
      label: "Currently in Shared Household?",
      kind: "select",
      required: true,
      options: ["yes", "no"],
    },
    {
      key: "violence_type",
      label: "Primary Type of Violence",
      kind: "select",
      required: true,
      options: ["physical", "sexual", "verbal_emotional", "economic", "multiple"],
    },
    { key: "incident_summary", label: "Brief Incident Summary", kind: "textarea", required: true },
    { key: "jurisdiction_court", label: "Magistrate Court", kind: "text" },
  ],
};

export default function GenericCaseForm({ caseType, onBack }: GenericCaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState<BaseFormState>(EMPTY_BASE);
  const [meta, setMeta] = useState<Record<string, string>>({});

  const config = CASE_TYPE_REGISTRY[caseType];
  const fields = METADATA_FIELDS[caseType as Exclude<CaseTypeId, "cheque_bounce">] || [];

  const updateBase = (k: keyof BaseFormState, v: string) =>
    setBase((p) => ({ ...p, [k]: v }));

  const updateMeta = (k: string, v: string) => setMeta((p) => ({ ...p, [k]: v }));

  const buildMetadata = (): CaseMetadata => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = meta[f.key];
      if (raw === undefined || raw === "") {
        out[f.key] = null;
        continue;
      }
      if (f.kind === "number") out[f.key] = Number(raw) || 0;
      else if (f.key === "shared_household") out[f.key] = raw === "yes";
      else out[f.key] = raw;
    }
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const advocateId = localStorage.getItem("cf_user_id");
    if (!advocateId) {
      toast.error("Session expired. Please login again.");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        case_type: caseType,
        ...base,
        case_metadata: buildMetadata(),
        advocate_id: advocateId,
      };

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create case");

      toast.success("Case created successfully!");
      router.push(`/cases/${data.caseId}/story`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (f: MetadataField) => {
    const v = meta[f.key] ?? "";
    if (f.kind === "select" && f.options) {
      return (
        <select
          className={styles.select}
          value={v}
          required={f.required}
          onChange={(e) => updateMeta(f.key, e.target.value)}
        >
          <option value="">Select…</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      );
    }
    if (f.kind === "textarea") {
      return (
        <textarea
          className={styles.textarea}
          rows={2}
          value={v}
          required={f.required}
          placeholder={f.placeholder}
          onChange={(e) => updateMeta(f.key, e.target.value)}
        />
      );
    }
    return (
      <input
        className={styles.input}
        type={f.kind === "number" ? "number" : f.kind === "date" ? "date" : "text"}
        value={v}
        required={f.required}
        placeholder={f.placeholder}
        onChange={(e) => updateMeta(f.key, e.target.value)}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit} className={styles.block}>
      <div className={styles.formTop}>
        <div>
          <h2 className={styles.formTitle}>Case Details</h2>
          <p className={styles.formSub}>
            {config.title} — {config.subtitle}
          </p>
        </div>
        <button type="button" onClick={onBack} className={styles.textLink}>
          Change type
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <User size={14} /> Client
        </h3>
        <div className={styles.field}>
          <label className={styles.label}>Client Full Name</label>
          <input
            className={styles.input}
            value={base.client_name}
            onChange={(e) => updateBase("client_name", e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Client Address</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={base.client_address}
            onChange={(e) => updateBase("client_address", e.target.value)}
            required
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <UserRound size={14} /> Opposite Party
        </h3>
        <div className={styles.field}>
          <label className={styles.label}>Opposite Party Full Name</label>
          <input
            className={styles.input}
            value={base.opposite_party_name}
            onChange={(e) => updateBase("opposite_party_name", e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Opposite Party Address</label>
          <textarea
            className={styles.textarea}
            rows={2}
            value={base.opposite_party_address}
            onChange={(e) => updateBase("opposite_party_address", e.target.value)}
            required
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>
          <FileText size={14} /> Case-Specific Details
        </h3>
        {fields.map((f) => (
          <div key={f.key} className={styles.field}>
            <label className={styles.label}>{f.label}</label>
            {renderField(f)}
            {f.hint && <p className={styles.hint}>{f.hint}</p>}
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionHead}>Jurisdiction</h3>
        <div className={styles.field}>
          <label className={styles.label}>Jurisdiction City</label>
          <input
            className={styles.input}
            value={base.jurisdiction_city}
            onChange={(e) => updateBase("jurisdiction_city", e.target.value)}
            required
          />
          <p className={styles.hint}>City where the matter will be filed</p>
        </div>
      </section>

      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Saving case...
          </>
        ) : (
          <>
            Save Case and Continue <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

```

### File: `src\components\cases\newcase-content.module.css`

**Description:** Source code for `src\components\cases\newcase-content.module.css`.

```css
﻿.block {
  color: #fdfbf6;
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(176, 138, 60, 0.5);
  border-radius: 14px;
  padding: 14px;
}

.header {
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 28px;
  line-height: 1;
  color: #ffffff;
}

.subtitle {
  margin: 8px 0 0;
  color: rgba(248, 245, 239, 0.86);
  font-size: 14px;
}

.selectorList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.typeCard {
  width: 100%;
  text-align: left;
  border-radius: 14px;
  border: 1px solid rgba(212, 176, 107, 0.72);
  background: rgba(6, 6, 6, 0.78);
  color: #fff;
  padding: 14px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.typeCard:hover {
  transform: translateY(-1px);
  border-color: #e4c07b;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.36);
}

.typeCardDisabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.typeRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.typeMain {
  display: flex;
  gap: 12px;
  min-width: 0;
}

.iconWrap {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(212, 176, 107, 0.2);
  border: 1px solid rgba(212, 176, 107, 0.56);
}

.typeTitle {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.metaRow {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.typeSubtitle {
  margin: 0;
  color: #f3d89f;
  font-size: 13px;
  letter-spacing: 0.03em;
}

.badge {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.badgeLive {
  background: rgba(32, 133, 70, 0.26);
  border: 1px solid rgba(70, 183, 105, 0.56);
  color: #dcffe9;
}

.badgeSoon {
  background: rgba(248, 245, 239, 0.16);
  border: 1px solid rgba(248, 245, 239, 0.34);
  color: rgba(248, 245, 239, 0.9);
}

.desc {
  margin: 6px 0 0;
  color: rgba(248, 245, 239, 0.78);
  font-size: 13px;
}

.note {
  margin-top: 14px;
  border: 1px solid rgba(143, 29, 29, 0.72);
  background: rgba(143, 29, 29, 0.3);
  border-radius: 12px;
  padding: 11px 12px;
  color: #ffe7e7;
  font-size: 12px;
  line-height: 1.4;
}

.formTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.formTitle {
  margin: 0;
  font-size: 24px;
  line-height: 1;
  color: #fff;
}

.formSub {
  margin: 8px 0 0;
  color: rgba(248, 245, 239, 0.72);
  font-size: 14px;
}

.textLink {
  border: none;
  background: none;
  color: #f3d89f;
  font-size: 13px;
  cursor: pointer;
}

.section {
  border: 1px solid rgba(176, 138, 60, 0.58);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.5);
  padding: 12px;
  margin-bottom: 12px;
}

.sectionHead {
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #f3d89f;
}

.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field {
  margin-bottom: 10px;
}

.label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: rgba(248, 245, 239, 0.92);
}

.input,
.select,
.textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(176, 138, 60, 0.66);
  background: rgba(0, 0, 0, 0.58);
  color: #ffffff;
  padding: 10px 11px;
  outline: none;
}

.textarea {
  resize: vertical;
}

.input:focus,
.select:focus,
.textarea:focus {
  border-color: #d4b06b;
  box-shadow: 0 0 0 3px rgba(176, 138, 60, 0.28);
}

.hint {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(248, 245, 239, 0.66);
}

.submit {
  width: 100%;
  margin-top: 8px;
  border: 1px solid #dec48c;
  background: linear-gradient(120deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .grid2 {
    grid-template-columns: 1fr;
  }

  .formTop {
    flex-direction: column;
    align-items: stretch;
  }
}

```

### File: `src\components\cases\StageTracker.tsx`

**Description:** Source code for `src\components\cases\StageTracker.tsx`.

```typescript
import { CaseStage } from "@/types/case.types";
import { ORDERED_STAGES } from "@/constants/caseStages";
import { Check } from "lucide-react";
import clsx from "clsx";

interface StageTrackerProps {
  currentStage: CaseStage;
}

// Simplified linear stages for display
const DISPLAY_STAGES: CaseStage[] = [
  "drafting",
  "notice_generated",
  "notice_served",
  "waiting_period",
  "complaint_eligible",
  "complaint_filed",
];

export default function StageTracker({ currentStage }: StageTrackerProps) {
  const currentOrder =
    ORDERED_STAGES.find((s) => s.key === currentStage)?.order || 1;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-brand-500 z-0 transition-all duration-500"
          style={{
            width: `${
              ((currentOrder - 1) / (DISPLAY_STAGES.length - 1)) * 100
            }%`,
          }}
        />

        {DISPLAY_STAGES.map((stage) => {
          const config = ORDERED_STAGES.find((s) => s.key === stage);
          if (!config) return null;

          const isPast = config.order < currentOrder;
          const isCurrent = config.key === currentStage;
          const isFuture = config.order > currentOrder;

          return (
            <div
              key={stage}
              className="flex flex-col items-center z-10 flex-1 first:items-start last:items-end"
            >
              {/* Circle */}
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isPast &&
                    "bg-brand-600 border-brand-600 text-white",
                  isCurrent &&
                    "bg-white border-brand-600 ring-4 ring-brand-100",
                  isFuture && "bg-white border-gray-300 text-gray-400"
                )}
              >
                {isPast ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span
                    className={clsx(
                      "text-xs font-bold",
                      isCurrent ? "text-brand-600" : "text-gray-400"
                    )}
                  >
                    {config.order}
                  </span>
                )}
              </div>

              {/* Label */}
              <p
                className={clsx(
                  "text-xs font-medium mt-2 text-center max-w-[70px] leading-tight",
                  isCurrent ? "text-brand-700" : isPast ? "text-gray-600" : "text-gray-400"
                )}
              >
                {config.label.replace("⚠️ ", "")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

```

### File: `src\components\layout\AppShell.tsx`

**Description:** Source code for `src\components\layout\AppShell.tsx`.

```typescript
"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { User } from "@/types/case.types";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { clearClientCache } from "@/lib/cache/clientDataCache";

interface AppShellProps {
  children: React.ReactNode;
  profile: User | null;
}

export default function AppShell({ children, profile }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isStoryRoute = /^\/cases\/[^/]+\/story$/.test(pathname);
  const isQuestionsRoute = /^\/cases\/[^/]+\/questions$/.test(pathname);
  const isNoticeRoute = /^\/cases\/[^/]+\/notice$/.test(pathname);
  const isCaseDetailRoute = /^\/cases\/[^/]+$/.test(pathname);
  const isProfileRoute = pathname === "/profile";
  const isSinglePageMode =
    pathname === "/dashboard" ||
    pathname === "/cases/new" ||
    isProfileRoute ||
    isCaseDetailRoute ||
    isStoryRoute ||
    isQuestionsRoute ||
    isNoticeRoute;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.clear();
    sessionStorage.clear();
    clearClientCache();
    toast.success("Signed out");
    router.push("/");
  };

  if (isSinglePageMode) {
    return (
      <div className="h-screen overflow-hidden bg-[radial-gradient(1200px_520px_at_78%_-12%,rgba(176,138,60,0.22),transparent_60%),radial-gradient(800px_420px_at_-8%_22%,rgba(143,29,29,0.18),transparent_62%),#060606]">
        <div className="pointer-events-none fixed right-4 top-4 z-50 md:right-5">
          <button
            type="button"
            onClick={handleLogout}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-black/55 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-100 shadow-sm transition-colors hover:border-amber-200 hover:text-amber-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
        <div className="h-full overflow-auto p-4 md:p-5">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(1200px_520px_at_78%_-12%,rgba(176,138,60,0.22),transparent_60%),radial-gradient(800px_420px_at_-8%_22%,rgba(143,29,29,0.18),transparent_62%),#060606]">
      <Sidebar />
      <div className="relative flex flex-col flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <Topbar profile={profile} />
        <main className="relative z-10 flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

```

### File: `src\components\layout\PageWrapper.tsx`

**Description:** Source code for `src\components\layout\PageWrapper.tsx`.

```typescript
import clsx from "clsx";

interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const widths = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-full",
};

export default function PageWrapper({
  children,
  maxWidth = "lg",
  className,
}: PageWrapperProps) {
  return (
    <div className={clsx("mx-auto w-full", widths[maxWidth], className)}>
      {children}
    </div>
  );
}

```

### File: `src\components\layout\Sidebar.module.css`

**Description:** Source code for `src\components\layout\Sidebar.module.css`.

```css
.aside {
  width: 256px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #050505 0%, #111111 55%, #050505 100%);
  border-right: 1px solid #3e3219;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.42);
}

.logoWrap {
  padding: 24px;
  border-bottom: 1px solid #3e3219;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logoIcon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #b08a3c;
  box-shadow: 0 8px 16px rgba(176, 138, 60, 0.3);
}

.title {
  color: #fff;
  font-weight: 700;
  font-size: 24px;
  line-height: 1;
  margin: 0;
}

.subtitle {
  margin: 4px 0 0;
  color: #d8c49c;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  color: #dfdfdf;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.active {
  background: #b08a3c;
  color: #111;
  box-shadow: 0 8px 18px rgba(176, 138, 60, 0.28);
}

.footer {
  padding: 16px;
  border-top: 1px solid #3e3219;
}

.logout {
  width: 100%;
  border: 1px solid #68502a;
  background: transparent;
  color: #e7d8b6;
  border-radius: 10px;
  padding: 11px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.logout:hover {
  background: #b08a3c;
  border-color: #b08a3c;
  color: #111;
}

```

### File: `src\components\layout\Sidebar.tsx`

**Description:** Source code for `src\components\layout\Sidebar.tsx`.

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { clearClientCache } from "@/lib/cache/clientDataCache";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cases", icon: FolderOpen, label: "All Cases" },
  { href: "/cases/new", icon: PlusCircle, label: "New Case" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.clear();
    sessionStorage.clear();
    clearClientCache();
    toast.success("Signed out");
    router.push("/");
  };

  return (
    <aside className="w-64 h-full flex flex-col bg-gradient-to-b from-black via-zinc-950 to-black border-r border-[#3e3219] shadow-2xl">
      <div className="p-6 border-b border-[#3e3219]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg grid place-items-center bg-[#b08a3c] shadow-md shadow-[#b08a3c]/30">
            <Scale size={20} color="#fff" />
          </div>
          <div>
            <h1 className="m-0 text-white font-bold text-2xl leading-none">CaseFlow</h1>
            <p className="mt-1 text-[#d8c49c] text-[11px] tracking-[0.08em] uppercase">Advocate Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all",
                isActive
                  ? "bg-[#b08a3c] text-black shadow-md shadow-[#b08a3c]/30"
                  : "text-[#dfdfdf] hover:text-white hover:bg-white/10"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#3e3219]">
        <button
          onClick={handleLogout}
          className="w-full border border-[#68502a] bg-transparent text-[#e7d8b6] rounded-lg px-3 py-2.5 flex items-center gap-3 text-sm font-semibold transition-all hover:bg-[#b08a3c] hover:text-black hover:border-[#b08a3c]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

```

### File: `src\components\layout\Topbar.module.css`

**Description:** Source code for `src\components\layout\Topbar.module.css`.

```css
.header {
  height: 64px;
  border-bottom: 1px solid #3f3219;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.welcome {
  margin: 0;
  color: #d7ccb6;
  font-size: 14px;
}

.name {
  color: #f8f5ef;
  font-weight: 700;
}

.right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bellBtn {
  border: 1px solid #4d3f23;
  background: transparent;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.profile {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #4d3f23;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;
  padding: 6px 10px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #b08a3c;
}

.profileName {
  margin: 0;
  color: #f8f5ef;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.profileMeta {
  margin: 4px 0 0;
  color: #b8ac95;
  font-size: 11px;
  line-height: 1;
}

```

### File: `src\components\layout\Topbar.tsx`

**Description:** Source code for `src\components\layout\Topbar.tsx`.

```typescript
"use client";

import { User as UserIcon, Bell } from "lucide-react";
import { User } from "@/types/case.types";

interface TopbarProps {
  profile: User | null;
}

export default function Topbar({ profile }: TopbarProps) {
  return (
    <header className="h-16 shrink-0 border-b border-[#3f3219] bg-black/35 backdrop-blur-md flex items-center justify-between px-6">
      <div>
        <p className="m-0 text-sm text-[#d7ccb6]">
          Welcome back,{" "}
          <span className="text-[#f8f5ef] font-semibold">
            {profile?.name ? `Adv. ${profile.name}` : "Advocate"}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        <button className="w-[38px] h-[38px] rounded-[10px] grid place-items-center border border-[#4d3f23] bg-transparent hover:bg-white/10 transition-colors">
          <Bell size={18} color="#d4b06a" />
        </button>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] border border-[#4d3f23] bg-black/35">
          <div className="w-7 h-7 rounded-full grid place-items-center bg-[#b08a3c]">
            <UserIcon size={16} color="#fff" />
          </div>
          <div>
            <p className="m-0 text-xs leading-none text-[#f8f5ef] font-semibold">
              {profile?.name || "Advocate"}
            </p>
            {profile?.enrollment_number && (
              <p className="mt-1 mb-0 text-[11px] leading-none text-[#b8ac95]">{profile.enrollment_number}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

```

### File: `src\components\notice\DownloadButton.tsx`

**Description:** Source code for `src\components\notice\DownloadButton.tsx`.

```typescript
"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Download, Loader2 } from "lucide-react";
import styles from "./notice.module.css";

interface DownloadButtonProps {
  caseId: string;
  advocateId: string;
  onGenerated?: (metadata: Record<string, string>) => void;
  hasExistingNotice?: boolean;
}

export default function DownloadButton({
  caseId,
  advocateId,
  onGenerated,
  hasExistingNotice = false,
}: DownloadButtonProps) {
  const [generatingFormat, setGeneratingFormat] = useState<"docx" | "pdf" | null>(null);

  const handleGenerate = async (format: "docx" | "pdf") => {
    setGeneratingFormat(format);
    try {
      const res = await fetch("/api/notice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, advocateId, format }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const metadataHeader = res.headers.get("X-Notice-Metadata");
      const metadata = metadataHeader ? JSON.parse(metadataHeader) : {};

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legal_notice_${caseId.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Legal notice downloaded as ${format.toUpperCase()}`);
      onGenerated?.(metadata);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Notice generation failed");
    } finally {
      setGeneratingFormat(null);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.buttonRow}>
        <button
          type="button"
          onClick={() => handleGenerate("docx")}
          disabled={generatingFormat !== null}
          className={styles.generateBtn}
        >
          {generatingFormat === "docx" ? (
            <Loader2 className={styles.spin} />
          ) : (
            <Download className={styles.icon16} />
          )}
          {generatingFormat === "docx"
            ? "Generating DOCX..."
            : hasExistingNotice
            ? "Re-generate as DOCX"
            : "Generate Notice (.docx)"}
        </button>

        <button
          type="button"
          onClick={() => handleGenerate("pdf")}
          disabled={generatingFormat !== null}
          className={styles.generateBtnAlt}
        >
          {generatingFormat === "pdf" ? (
            <Loader2 className={styles.spin} />
          ) : (
            <Download className={styles.icon16} />
          )}
          {generatingFormat === "pdf"
            ? "Generating PDF..."
            : hasExistingNotice
            ? "Re-generate as PDF"
            : "Generate Notice (.pdf)"}
        </button>
      </div>

      <div className={styles.hintBox}>
        <p>
          <strong>Next:</strong> Stage moves to Notice Generated. After service,
          mark notice served to start the 15-day wait period.
        </p>
      </div>
    </div>
  );
}

```

### File: `src\components\notice\notice.module.css`

**Description:** Source code for `src\components\notice\notice.module.css`.

```css
.stack {
  display: grid;
  gap: 10px;
}

.buttonRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.generateBtn {
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.generateBtnAlt {
  border: 1px solid rgba(248, 245, 239, 0.35);
  background: rgba(255, 255, 255, 0.06);
  color: #f8f5ef;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.generateBtn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.generateBtnAlt:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.infoBox {
  border: 1px solid rgba(248, 245, 239, 0.25);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: rgba(248, 245, 239, 0.84);
  font-size: 13px;
  line-height: 1.4;
}

.hintBox {
  border: 1px solid rgba(186, 145, 69, 0.45);
  border-radius: 10px;
  background: rgba(186, 145, 69, 0.12);
  padding: 10px;
  color: rgba(248, 245, 239, 0.84);
  font-size: 13px;
  line-height: 1.4;
}

.metaGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.metaItem {
  border: 1px solid rgba(248, 245, 239, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  padding: 10px;
}

.metaLabel {
  margin: 0;
  color: rgba(248, 245, 239, 0.58);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metaValue {
  margin: 4px 0 0;
  color: #f8f5ef;
  font-size: 14px;
  font-weight: 700;
}

.deadlineBox {
  border: 1px solid rgba(168, 84, 84, 0.62);
  border-radius: 10px;
  background: rgba(126, 37, 37, 0.24);
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #f2dddd;
  font-size: 13px;
  line-height: 1.45;
}

.previewBox {
  border: 1px solid rgba(186, 145, 69, 0.5);
  border-radius: 12px;
  background: rgba(6, 6, 6, 0.7);
  padding: 12px;
}

.previewHead {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #e3c98d;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 8px;
}

.previewText {
  margin: 0;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(248, 245, 239, 0.86);
  font-family: Georgia, "Times New Roman", serif;
}

.previewFoot {
  margin: 2px 0 0;
  color: rgba(248, 245, 239, 0.5);
  font-size: 12px;
  text-align: center;
}

.icon14 {
  width: 14px;
  height: 14px;
}

.icon16 {
  width: 16px;
  height: 16px;
}

.spin {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .buttonRow {
    grid-template-columns: 1fr;
  }

  .metaGrid {
    grid-template-columns: 1fr;
  }
}

```

### File: `src\components\notice\NoticePreview.tsx`

**Description:** Source code for `src\components\notice\NoticePreview.tsx`.

```typescript
import { AlertCircle, Scale } from "lucide-react";
import styles from "./notice.module.css";

interface NoticePreviewProps {
  noticeText: string;
  metadata?: {
    act: string;
    sections: string[];
    noticeSentDate: string;
    waitingPeriodEnd: string;
    complaintDeadline: string;
  };
}

export default function NoticePreview({ noticeText, metadata }: NoticePreviewProps) {
  return (
    <div className={styles.stack}>
      {metadata && (
        <div className={styles.metaGrid}>
          {[
            { label: "Act", value: "NI Act, 1881" },
            { label: "Sections", value: metadata.sections.join(", ") },
            { label: "15-Day Wait Ends", value: metadata.waitingPeriodEnd },
          ].map(({ label, value }) => (
            <div key={label} className={styles.metaItem}>
              <p className={styles.metaLabel}>{label}</p>
              <p className={styles.metaValue}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {metadata && (
        <div className={styles.deadlineBox}>
          <AlertCircle className={styles.icon14} />
          <p>
            <strong>Complaint Deadline:</strong> {metadata.complaintDeadline}. File
            the complaint before this date to avoid limitation risk.
          </p>
        </div>
      )}

      <div className={styles.previewBox}>
        <div className={styles.previewHead}>
          <Scale className={styles.icon14} />
          <p>Legal Notice Preview</p>
        </div>
        <pre className={styles.previewText}>{noticeText}</pre>
      </div>

      <p className={styles.previewFoot}>
        Preview only. Downloaded `.docx` contains the formatted final version.
      </p>
    </div>
  );
}

```

### File: `src\components\questions\QuestionCard.tsx`

**Description:** Source code for `src\components\questions\QuestionCard.tsx`.

```typescript
"use client";

import clsx from "clsx";
import { GenericQuestion, GenericAnswerValue } from "@/types/facts.types";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import styles from "./questions.module.css";

interface QuestionCardProps {
  question: GenericQuestion;
  value: GenericAnswerValue;
  onChange: (value: GenericAnswerValue) => void;
  index: number;
}

export default function QuestionCard({
  question,
  value,
  onChange,
  index,
}: QuestionCardProps) {
  if (question.type === "boolean") {
    return (
      <div className={styles.card}>
        <div className={styles.qHead}>
          <div className={styles.qIndex}>{index + 1}</div>
          <p className={styles.qText}>{question.text}</p>
        </div>

        <div className={styles.booleanRow}>
          <button
            type="button"
            onClick={() => onChange(true)}
            className={clsx(styles.choiceBtn, value === true && styles.yesActive)}
          >
            <CheckCircle2 className={styles.icon14} />
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={clsx(styles.choiceBtn, value === false && styles.noActive)}
          >
            <XCircle className={styles.icon14} />
            No
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className={clsx(
              styles.choiceBtn,
              (value === null || value === undefined) && styles.unknownActive
            )}
          >
            <HelpCircle className={styles.icon14} />
            Unknown
          </button>
        </div>
      </div>
    );
  }

  if (question.type === "amount" || question.type === "text" || question.type === "date") {
    const inputType =
      question.type === "amount" ? "number" : question.type === "date" ? "date" : "text";
    const placeholder =
      question.type === "amount"
        ? "Enter amount"
        : question.type === "date"
          ? "YYYY-MM-DD"
          : "Enter value";

    return (
      <div className={styles.card}>
        <div className={styles.qHead}>
          <div className={styles.qIndex}>{index + 1}</div>
          <p className={styles.qText}>{question.text}</p>
        </div>

        <div className={styles.amountWrap}>
          <div className={styles.amountInner}>
            {question.type === "amount" && <span className={styles.rupee}>Rs</span>}
            <input
              type={inputType}
              className={styles.amountInput}
              placeholder={placeholder}
              value={value === null || value === undefined ? "" : String(value)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  onChange(null);
                  return;
                }
                onChange(question.type === "amount" ? parseFloat(raw) : raw);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "select" && question.options) {
    return (
      <div className={styles.card}>
        <div className={styles.qHead}>
          <div className={styles.qIndex}>{index + 1}</div>
          <p className={styles.qText}>{question.text}</p>
        </div>

        <div className={styles.selectGrid}>
          {question.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={clsx(
                styles.selectBtn,
                value === opt && styles.selectActive
              )}
            >
              {opt.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

```

### File: `src\components\questions\QuestionFlow.tsx`

**Description:** Source code for `src\components\questions\QuestionFlow.tsx`.

```typescript
"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { CaseFactsAnswers, GenericAnswers, GenericAnswerValue } from "@/types/facts.types";
import { CASE_TYPE_REGISTRY } from "@/constants/caseTypeRegistry";
import { CaseTypeId, isCaseTypeId } from "@/types/caseTypes";
import QuestionCard from "./QuestionCard";
import styles from "./questions.module.css";

interface QuestionFlowProps {
  caseId: string;
  caseType?: string; // when omitted, defaults to cheque_bounce for backwards compatibility
  initialAnswers?: Partial<CaseFactsAnswers> | GenericAnswers;
  onComplete: (answers: CaseFactsAnswers | GenericAnswers) => void;
}

export default function QuestionFlow({
  caseId,
  caseType,
  initialAnswers,
  onComplete,
}: QuestionFlowProps) {
  const resolvedType: CaseTypeId = isCaseTypeId(caseType) ? caseType : "cheque_bounce";
  const config = CASE_TYPE_REGISTRY[resolvedType];

  const [answers, setAnswers] = useState<GenericAnswers>(() => {
    const seed: GenericAnswers = {};
    for (const q of config.questions) seed[q.id] = null;
    return { ...seed, ...(initialAnswers as GenericAnswers) };
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const visibleQuestions = useMemo(
    () => config.questions.filter((q) => !q.condition || q.condition(answers)),
    [config.questions, answers]
  );

  const handleChange = (id: string, value: GenericAnswerValue) => {
    setAnswers((prev) => {
      const updated: GenericAnswers = { ...prev, [id]: value };
      // Clear dependent fields when their parent toggles to false/null
      for (const q of config.questions) {
        if (q.condition && !q.condition(updated)) {
          updated[q.id] = null;
        }
      }
      return updated;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, caseType: resolvedType, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaved(true);
      toast.success("Answers saved");
      onComplete(answers as CaseFactsAnswers | GenericAnswers);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const answeredCount = visibleQuestions.filter(
    (q) => answers[q.id] !== null && answers[q.id] !== undefined
  ).length;
  const progress = visibleQuestions.length
    ? (answeredCount / visibleQuestions.length) * 100
    : 0;

  return (
    <div className={styles.flow}>
      <div className={styles.progressRow}>
        <p className={styles.progressText}>
          {answeredCount} of {visibleQuestions.length} questions answered
        </p>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {visibleQuestions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          value={answers[question.id]}
          onChange={(val) => handleChange(question.id, val)}
          index={index}
        />
      ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ""}`}
      >
        {saving ? (
          <Loader2 className={styles.spin} />
        ) : saved ? (
          <CheckCircle className={styles.icon14} />
        ) : (
          <Save className={styles.icon14} />
        )}
        {saved ? "Answers Saved" : "Save Answers & Continue"}
      </button>
    </div>
  );
}

```

### File: `src\components\questions\questions.module.css`

**Description:** Source code for `src\components\questions\questions.module.css`.

```css
.flow {
  display: grid;
  gap: 12px;
}

.progressRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.progressText {
  margin: 0;
  color: rgba(248, 245, 239, 0.72);
  font-size: 13px;
}

.progressTrack {
  width: 180px;
  height: 8px;
  border-radius: 999px;
  background: rgba(248, 245, 239, 0.14);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(120deg, #f3e4c3, #c59b4f);
  transition: width 0.25s ease;
}

.card {
  border: 1px solid rgba(186, 145, 69, 0.5);
  border-radius: 14px;
  background: rgba(8, 8, 8, 0.72);
  padding: 12px;
}

.qHead {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.qIndex {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(186, 145, 69, 0.65);
  background: rgba(186, 145, 69, 0.16);
  color: #e6c88f;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.qText {
  margin: 2px 0 0;
  color: #f8f5ef;
  font-size: 15px;
  line-height: 1.4;
}

.booleanRow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-left: 38px;
}

.choiceBtn {
  border: 1px solid rgba(248, 245, 239, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(248, 245, 239, 0.82);
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.yesActive {
  border-color: #6ab377;
  background: rgba(64, 128, 73, 0.28);
  color: #d8f2de;
}

.noActive {
  border-color: #b56b6b;
  background: rgba(145, 60, 60, 0.28);
  color: #f3dede;
}

.unknownActive {
  border-color: rgba(248, 245, 239, 0.5);
  background: rgba(248, 245, 239, 0.16);
  color: #f8f5ef;
}

.amountWrap {
  margin-left: 38px;
}

.amountInput {
  width: 100%;
  border: 1px solid rgba(186, 145, 69, 0.46);
  border-radius: 10px;
  background: rgba(4, 4, 4, 0.75);
  color: #f8f5ef;
  padding: 10px 12px 10px 26px;
  font-size: 14px;
  outline: none;
}

.amountInput:focus {
  border-color: #d2b06a;
  box-shadow: 0 0 0 2px rgba(210, 176, 106, 0.2);
}

.rupee {
  position: absolute;
  left: 9px;
  top: 8px;
  color: rgba(248, 245, 239, 0.52);
  font-size: 14px;
}

.amountInner {
  position: relative;
}

.selectGrid {
  margin-left: 38px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.selectBtn {
  border: 1px solid rgba(248, 245, 239, 0.26);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(248, 245, 239, 0.82);
  padding: 9px 10px;
  font-size: 13px;
  font-weight: 700;
  text-transform: capitalize;
  cursor: pointer;
}

.selectActive {
  border-color: #dec48c;
  background: linear-gradient(120deg, #f7ecd6, #d4b06b);
  color: #111;
}

.saveBtn {
  width: 100%;
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.saveBtnSaved {
  border: 1px solid rgba(248, 245, 239, 0.35);
  background: rgba(255, 255, 255, 0.08);
  color: #f8f5ef;
}

.saveBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon14 {
  width: 14px;
  height: 14px;
}

.spin {
  width: 14px;
  height: 14px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .booleanRow {
    margin-left: 0;
    grid-template-columns: 1fr;
  }

  .selectGrid {
    margin-left: 0;
    grid-template-columns: 1fr;
  }

  .amountWrap {
    margin-left: 0;
  }
}

```

### File: `src\components\story\story.module.css`

**Description:** Source code for `src\components\story\story.module.css`.

```css
.stack {
  display: grid;
  gap: 12px;
}

.warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid rgba(186, 145, 69, 0.45);
  border-radius: 12px;
  background: rgba(186, 145, 69, 0.12);
  padding: 10px;
}

.warningIcon {
  width: 16px;
  height: 16px;
  color: #d7b269;
  margin-top: 2px;
  flex-shrink: 0;
}

.warningText {
  margin: 0;
  color: rgba(248, 245, 239, 0.86);
  font-size: 13px;
  line-height: 1.45;
}

.rowHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.label {
  color: rgba(248, 245, 239, 0.84);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.textAction {
  border: 0;
  background: transparent;
  color: #e3c98d;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.textAction:hover {
  color: #f0dab2;
}

.exampleBox {
  border: 1px solid rgba(248, 245, 239, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  padding: 10px;
}

.exampleText {
  margin: 0 0 8px;
  color: rgba(248, 245, 239, 0.76);
  font-size: 13px;
  line-height: 1.45;
}

.textarea {
  width: 100%;
  border: 1px solid rgba(186, 145, 69, 0.46);
  border-radius: 12px;
  background: rgba(4, 4, 4, 0.75);
  color: #f8f5ef;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
  min-height: 170px;
}

.textarea::placeholder {
  color: rgba(248, 245, 239, 0.4);
}

.textarea:focus {
  border-color: #d2b06a;
  box-shadow: 0 0 0 2px rgba(210, 176, 106, 0.2);
}

.metaRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.metaText {
  margin: 0;
  font-size: 12px;
  color: rgba(248, 245, 239, 0.5);
}

.validMeta {
  margin: 0;
  font-size: 12px;
  color: #d4bf90;
  font-weight: 600;
}

.extractButton {
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.extractButton:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.icon16 {
  width: 16px;
  height: 16px;
}

.icon12 {
  width: 12px;
  height: 12px;
}

.spin {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.unsupported {
  border: 1px solid rgba(248, 245, 239, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(248, 245, 239, 0.74);
  font-size: 13px;
}

.voiceRow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.voiceStart,
.voiceStop {
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.voiceStart {
  border: 1px solid rgba(248, 245, 239, 0.28);
  background: rgba(255, 255, 255, 0.04);
  color: #f8f5ef;
}

.voiceStop {
  border: 1px solid rgba(153, 42, 42, 0.7);
  background: rgba(153, 42, 42, 0.22);
  color: #f7dddd;
}

.recordingPill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(153, 42, 42, 0.7);
  color: #ffdbdb;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
}

.recordDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ec5353;
}

.liveTranscript {
  border: 1px solid rgba(186, 145, 69, 0.45);
  border-radius: 12px;
  background: rgba(186, 145, 69, 0.1);
  padding: 10px;
}

.liveTitle {
  margin: 0 0 5px;
  color: #e1c88f;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.liveText {
  margin: 0;
  color: rgba(248, 245, 239, 0.88);
  font-size: 14px;
  line-height: 1.45;
}

.hint {
  margin: 0;
  color: rgba(248, 245, 239, 0.56);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.emptyWrap {
  border: 1px dashed rgba(248, 245, 239, 0.22);
  border-radius: 12px;
  min-height: 220px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 16px;
}

.emptyIcon {
  width: 28px;
  height: 28px;
  color: rgba(248, 245, 239, 0.36);
  margin-bottom: 8px;
}

.emptyText {
  margin: 0;
  color: rgba(248, 245, 239, 0.62);
  font-size: 13px;
}

.timelineList {
  display: grid;
  gap: 10px;
}

.timelineItem {
  border: 1px solid rgba(248, 245, 239, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dotExact {
  border: 1px solid rgba(248, 245, 239, 0.44);
  color: #f8f5ef;
  background: rgba(248, 245, 239, 0.12);
}

.dotApprox {
  border: 1px solid rgba(186, 145, 69, 0.62);
  color: #efce89;
  background: rgba(186, 145, 69, 0.22);
}

.dotIcon {
  width: 12px;
  height: 12px;
}

.timelineBody {
  min-width: 0;
}

.dateTag {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 4px 8px;
}

.dateTagExact {
  color: #f8f5ef;
  border: 1px solid rgba(248, 245, 239, 0.25);
  background: rgba(248, 245, 239, 0.1);
}

.dateTagApprox {
  color: #efce89;
  border: 1px solid rgba(186, 145, 69, 0.5);
  background: rgba(186, 145, 69, 0.18);
}

.eventText {
  margin: 0;
  color: rgba(248, 245, 239, 0.86);
  font-size: 14px;
  line-height: 1.45;
}

.legend {
  margin: 12px 0 0;
  color: rgba(248, 245, 239, 0.56);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

```

### File: `src\components\story\StoryTextInput.tsx`

**Description:** Source code for `src\components\story\StoryTextInput.tsx`.

```typescript
"use client";

import { useState } from "react";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import styles from "./story.module.css";

interface StoryTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const MIN_CHARS = 50;
const EXAMPLE_STORY =
  "My client Ramesh lent Rs 5 lakhs to Suresh in January 2024. Suresh gave a cheque dated March 15, 2024 from SBI Adyar branch as security. When the cheque was deposited on April 1, 2024 it bounced with insufficient funds. The bank gave a return memo on the same day. Suresh has not paid despite repeated requests.";

export default function StoryTextInput({
  value,
  onChange,
  onSubmit,
  loading,
}: StoryTextInputProps) {
  const [showExample, setShowExample] = useState(false);
  const charCount = value.length;
  const isValid = charCount >= MIN_CHARS;

  return (
    <div className={styles.stack}>
      <div className={styles.warning}>
        <AlertCircle className={styles.warningIcon} />
        <p className={styles.warningText}>
          <strong>Tell the story exactly as stated by the client.</strong> Include
          dates, amounts, and sequence of events. Extraction does not add facts.
        </p>
      </div>

      <div className={styles.rowHead}>
        <label className={styles.label}>Client Story</label>
        <button
          type="button"
          onClick={() => setShowExample((prev) => !prev)}
          className={styles.textAction}
        >
          {showExample ? "Hide example" : "See example"}
        </button>
      </div>

      {showExample && (
        <div className={styles.exampleBox}>
          <p className={styles.exampleText}>{EXAMPLE_STORY}</p>
          <button
            type="button"
            onClick={() => {
              onChange(EXAMPLE_STORY);
              setShowExample(false);
            }}
            className={styles.textAction}
          >
            Use this example
          </button>
        </div>
      )}

      <textarea
        className={styles.textarea}
        rows={9}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Narrate what happened in sequence: cheque issue, presentation, dishonour, memo receipt, post-dishonour events."
      />

      <div className={styles.metaRow}>
        <p className={isValid ? styles.validMeta : styles.metaText}>
          {charCount} characters{!isValid ? ` (minimum ${MIN_CHARS})` : ""}
        </p>
        {isValid && <p className={styles.validMeta}>Ready to extract</p>}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isValid || loading}
        className={styles.extractButton}
      >
        {loading ? <Loader2 className={styles.spin} /> : <FileText className={styles.icon16} />}
        {loading ? "Extracting Timeline..." : "Extract Legal Timeline"}
      </button>
    </div>
  );
}

```

### File: `src\components\story\TimelineView.tsx`

**Description:** Source code for `src\components\story\TimelineView.tsx`.

```typescript
import clsx from "clsx";
import { AlertCircle, Calendar, CheckCircle, Clock } from "lucide-react";
import { TimelineEvent } from "@/types/timeline.types";
import styles from "./story.module.css";

interface TimelineViewProps {
  events: TimelineEvent[];
  emptyMessage?: string;
}

export default function TimelineView({
  events,
  emptyMessage = "No timeline events yet. Extracted events will appear here.",
}: TimelineViewProps) {
  if (!events || events.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <Calendar className={styles.emptyIcon} />
        <p className={styles.emptyText}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.timelineList}>
        {events.map((event, index) => (
          <article key={index} className={styles.timelineItem}>
            <div
              className={clsx(
                styles.dot,
                event.is_approximate ? styles.dotApprox : styles.dotExact
              )}
            >
              {event.is_approximate ? (
                <AlertCircle className={styles.dotIcon} />
              ) : (
                <CheckCircle className={styles.dotIcon} />
              )}
            </div>

            <div className={styles.timelineBody}>
              <p
                className={clsx(
                  styles.dateTag,
                  event.is_approximate ? styles.dateTagApprox : styles.dateTagExact
                )}
              >
                <Clock className={styles.icon12} />
                {event.event_date}
                {event.is_approximate ? " (approx)" : ""}
              </p>
              <p className={styles.eventText}>{event.event_description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

```

### File: `src\components\story\VoiceRecorder.tsx`

**Description:** Source code for `src\components\story\VoiceRecorder.tsx`.

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, MicOff, Square } from "lucide-react";
import styles from "./story.module.css";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

export default function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [liveText, setLiveText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionApi: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      setLiveText(interim);
      if (final) {
        onTranscript(final);
        setLiveText("");
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setLiveText("");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveText("");
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    setIsRecording(true);
    setLiveText("");
    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsRecording(false);
    setLiveText("");
  };

  if (!isSupported) {
    return (
      <div className={styles.unsupported}>
        <AlertCircle className={styles.icon16} />
        <p>Voice input is not supported in this browser. Use Chrome or Edge.</p>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.voiceRow}>
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={isRecording ? styles.voiceStop : styles.voiceStart}
        >
          {isRecording ? <Square className={styles.icon16} /> : <Mic className={styles.icon16} />}
          {isRecording ? "Stop Recording" : "Start Voice Input"}
        </button>

        {isRecording && (
          <span className={styles.recordingPill}>
            <span className={styles.recordDot} />
            Recording
          </span>
        )}
      </div>

      {liveText && (
        <div className={styles.liveTranscript}>
          <p className={styles.liveTitle}>Live transcript</p>
          <p className={styles.liveText}>{liveText}</p>
        </div>
      )}

      <p className={styles.hint}>
        <MicOff className={styles.icon12} />
        English (India). Stop recording to append transcript into the story.
      </p>
    </div>
  );
}

```

### File: `src\components\ui\Badge.tsx`

**Description:** Source code for `src\components\ui\Badge.tsx`.

```typescript
import clsx from "clsx";
import { CaseStage } from "@/types/case.types";
import { CASE_STAGES } from "@/constants/caseStages";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    neutral: "bg-gray-50 text-gray-500 border border-gray-200",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StageBadgeProps {
  stage: CaseStage;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const config = CASE_STAGES[stage];
  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
        config?.color || "bg-gray-100 text-gray-600"
      )}
    >
      {config?.label || stage}
    </span>
  );
}

```

### File: `src\components\ui\Button.tsx`

**Description:** Source code for `src\components\ui\Button.tsx`.

```typescript
import { Loader2 } from "lucide-react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-sm",
    secondary:
      "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 focus:ring-gray-300",
    danger:
      "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm",
    ghost:
      "bg-transparent hover:bg-gray-100 text-gray-600 focus:ring-gray-300",
    outline:
      "bg-transparent border border-brand-500 text-brand-600 hover:bg-brand-50 focus:ring-brand-400",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };

  return (
    <button
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

```

### File: `src\components\ui\Card.tsx`

**Description:** Source code for `src\components\ui\Card.tsx`.

```typescript
import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className,
  padding = "md",
  hover = false,
  onClick,
}: CardProps) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-xl border border-gray-200 shadow-sm",
        paddings[padding],
        hover && "hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

```

### File: `src\components\ui\Countdown.tsx`

**Description:** Source code for `src\components\ui\Countdown.tsx`.

```typescript
"use client";

import { daysUntil, getUrgencyLevel } from "@/lib/utils/dateUtils";
import clsx from "clsx";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";

interface CountdownProps {
  label: string;
  date: string | null;
  showIcon?: boolean;
}

export default function Countdown({ label, date, showIcon = true }: CountdownProps) {
  const days = daysUntil(date);
  const urgency = getUrgencyLevel(days);

  const config = {
    safe: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      icon: <CheckCircle className="w-4 h-4" />,
      label: `${days} days left`,
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-300",
      text: "text-yellow-700",
      icon: <AlertTriangle className="w-4 h-4" />,
      label: `${days} days left — Act soon`,
    },
    critical: {
      bg: "bg-red-50 border-red-400",
      text: "text-red-700",
      icon: <AlertTriangle className="w-4 h-4 animate-pulse" />,
      label: days === 0 ? "Due TODAY" : `${days} day left — URGENT`,
    },
    expired: {
      bg: "bg-gray-100 border-gray-300",
      text: "text-gray-500",
      icon: <XCircle className="w-4 h-4" />,
      label: "Deadline passed",
    },
  };

  const c = config[urgency];

  if (!date) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <Clock className="w-4 h-4 text-gray-400" />
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-xs font-medium text-gray-500">Not set</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-3 py-2 border rounded-lg",
        c.bg
      )}
    >
      {showIcon && <span className={c.text}>{c.icon}</span>}
      <div>
        <p className={clsx("text-xs font-medium", c.text)}>{label}</p>
        <p className={clsx("text-sm font-bold", c.text)}>{c.label}</p>
      </div>
    </div>
  );
}

```

### File: `src\components\ui\Input.tsx`

**Description:** Source code for `src\components\ui\Input.tsx`.

```typescript
import clsx from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startAdornment?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, startAdornment, suffix, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {startAdornment && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {startAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "input-field",
              startAdornment && "pl-9",
              suffix && "pr-9",
              error && "border-red-400 focus:ring-red-300",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;

```

### File: `src\components\ui\Modal.tsx`

**Description:** Source code for `src\components\ui\Modal.tsx`.

```typescript
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: ModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className={clsx(
          "relative w-full bg-white rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh]",
          sizes[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

```

### File: `src\components\ui\Spinner.tsx`

**Description:** Source code for `src\components\ui\Spinner.tsx`.

```typescript
import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export default function Spinner({ size = "md", className, label }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={clsx("animate-spin text-brand-600", sizes[size])} />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label={label || "Loading..."} />
    </div>
  );
}

```


## Directory: `src/hooks`

### File: `src\hooks\useCase.ts`

**Description:** Source code for `src\hooks\useCase.ts`.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Case } from "@/types/case.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

interface UseCaseReturn {
  caseData: Case | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStage: (stage: string, extra?: Record<string, string>) => Promise<void>;
}

export function useCase(caseId: string | null): UseCaseReturn {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    const cacheKey = `case:${caseId}:full`;
    const cachedCase = getClientCache<Case>(cacheKey);
    const hasCachedCase = Boolean(cachedCase);
    if (cachedCase) {
      setCaseData(cachedCase);
      setLoading(false);
    }
    if (!hasCachedCase) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error("Case not found");
      const data = await res.json();
      const nextCase = data.case || null;
      setCaseData(nextCase);
      if (nextCase) {
        setClientCache(cacheKey, nextCase, 45_000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const updateStage = useCallback(
    async (stage: string, extra?: Record<string, string>) => {
      if (!caseId) return;
      try {
        const res = await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage, ...extra }),
        });
        if (!res.ok) throw new Error("Update failed");
        const data = await res.json();
        const nextCase = data.case || null;
        setCaseData(nextCase);
        if (nextCase) {
          setClientCache(`case:${caseId}:full`, nextCase, 45_000);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Update failed");
        throw err;
      }
    },
    [caseId]
  );

  return { caseData, loading, error, refetch: fetchCase, updateStage };
}

```

### File: `src\hooks\useCases.ts`

**Description:** Source code for `src\hooks\useCases.ts`.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Case } from "@/types/case.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

interface UseCasesReturn {
  cases: Case[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalAmount: number;
  urgentCount: number;
  activeCount: number;
}

export function useCases(): UseCasesReturn {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    const advocateId =
      typeof window !== "undefined"
        ? localStorage.getItem("cf_user_id")
        : null;

    if (!advocateId) {
      setLoading(false);
      return;
    }

    const cacheKey = `cases:summary:${advocateId}`;
    const cachedCases = getClientCache<Case[]>(cacheKey);
    const hasCachedCases = Boolean(cachedCases);
    if (cachedCases) {
      setCases(cachedCases);
      setLoading(false);
    }

    if (!hasCachedCases) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/cases?advocate_id=${advocateId}&view=summary`);
      if (!res.ok) throw new Error("Failed to fetch cases");
      const data = await res.json();
      const nextCases = data.cases || [];
      setCases(nextCases);
      setClientCache(cacheKey, nextCases, 45_000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const totalAmount = cases.reduce(
    (sum, c) => sum + (c.case_financials?.cheque_amount || 0),
    0
  );

  const urgentCount = cases.filter((c) => {
    if (!c.complaint_deadline) return false;
    const days =
      (new Date(c.complaint_deadline).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  }).length;

  const activeCount = cases.filter(
    (c) => !["closed", "complaint_filed"].includes(c.stage)
  ).length;

  return {
    cases,
    loading,
    error,
    refetch: fetchCases,
    totalAmount,
    urgentCount,
    activeCount,
  };
}

```

### File: `src\hooks\useCountdown.ts`

**Description:** Source code for `src\hooks\useCountdown.ts`.

```typescript
"use client";

import { useState, useEffect } from "react";
import { differenceInDays, differenceInHours, isPast } from "date-fns";

interface CountdownState {
  daysLeft: number | null;
  hoursLeft: number | null;
  isExpired: boolean;
  isUrgent: boolean;
  isCritical: boolean;
  label: string;
  colorClass: string;
}

export function useCountdown(dateString: string | null): CountdownState {
  const [state, setState] = useState<CountdownState>({
    daysLeft: null,
    hoursLeft: null,
    isExpired: false,
    isUrgent: false,
    isCritical: false,
    label: "Not set",
    colorClass: "text-gray-400",
  });

  useEffect(() => {
    if (!dateString) return;

    const compute = () => {
      const target = new Date(dateString);
      const expired = isPast(target);
      const days = differenceInDays(target, new Date());
      const hours = differenceInHours(target, new Date());

      let label = "";
      let colorClass = "";

      if (expired) {
        label = "Deadline passed";
        colorClass = "text-gray-500";
      } else if (days === 0) {
        label = `${hours} hours left — TODAY`;
        colorClass = "text-red-700";
      } else if (days === 1) {
        label = "1 day left — TOMORROW";
        colorClass = "text-red-600";
      } else if (days <= 3) {
        label = `${days} days left — Act soon`;
        colorClass = "text-orange-600";
      } else if (days <= 7) {
        label = `${days} days left`;
        colorClass = "text-yellow-600";
      } else {
        label = `${days} days left`;
        colorClass = "text-green-600";
      }

      setState({
        daysLeft: days,
        hoursLeft: hours,
        isExpired: expired,
        isUrgent: !expired && days <= 7,
        isCritical: !expired && days <= 3,
        label,
        colorClass,
      });
    };

    compute();
    // Refresh every hour
    const interval = setInterval(compute, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dateString]);

  return state;
}

```

### File: `src\hooks\useVoiceInput.ts`

**Description:** Source code for `src\hooks\useVoiceInput.ts`.

```typescript
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceInputReturn {
  isRecording: boolean;
  isSupported: boolean;
  liveTranscript: string;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
}

export function useVoiceInput(
  onFinalTranscript: (text: string) => void
): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionApi: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      setLiveTranscript(interim);

      if (finalText.trim()) {
        onFinalTranscript(finalText.trim());
        setLiveTranscript("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Voice error: ${event.error}`);
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
  }, [onFinalTranscript]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setLiveTranscript("");
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch {
      setError("Could not start recording");
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsRecording(false);
    setLiveTranscript("");
  }, []);

  return {
    isRecording,
    isSupported,
    liveTranscript,
    startRecording,
    stopRecording,
    error,
  };
}

```


## Directory: `src/app`

### File: `src\app\(auth)\login\login.module.css`

**Description:** Source code for `src\app\(auth)\login\login.module.css`.

```css
.page {
  min-height: 100vh;
  background: radial-gradient(1100px 500px at 75% -10%, rgba(176, 138, 60, 0.25), transparent 60%),
    radial-gradient(700px 400px at -10% 20%, rgba(143, 29, 29, 0.2), transparent 60%),
    #060606;
  color: #f8f5ef;
  overflow: hidden;
}

.page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 28px 28px;
}

.shell {
  position: relative;
  z-index: 1;
  margin: 0 auto;
  width: min(1400px, 100%);
  min-height: 100vh;
  padding: 22px 30px 28px;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 11px;
  color: rgba(248, 245, 239, 0.6);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav {
  display: flex;
  gap: 34px;
}

.main {
  flex: 1;
  display: grid;
  gap: 48px;
  grid-template-columns: 1.15fr 0.85fr;
  align-items: center;
}

.heroTitle {
  margin: 0;
  line-height: 0.86;
  font-size: clamp(56px, 9vw, 138px);
}

.heroMuted {
  display: block;
  color: rgba(248, 245, 239, 0.52);
}

.heroSub {
  margin-top: 22px;
  max-width: 680px;
  color: rgba(248, 245, 239, 0.62);
  font-size: clamp(17px, 2vw, 31px);
  line-height: 1.34;
}

.panel {
  border: 1px solid rgba(176, 138, 60, 0.5);
  background: linear-gradient(160deg, rgba(248, 245, 239, 0.1), rgba(248, 245, 239, 0.04));
  backdrop-filter: blur(12px);
  border-radius: 26px;
  padding: 28px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(248, 245, 239, 0.06) inset;
}

.kicker {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: rgba(248, 245, 239, 0.62);
}

.logo {
  margin: 6px 0 0;
  line-height: 1;
  font-size: clamp(40px, 5vw, 62px);
}

.desc {
  margin: 10px 0 0;
  font-size: 14px;
  color: rgba(248, 245, 239, 0.7);
}

.modeTabs {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.modeTab {
  border-radius: 10px;
  border: 1px solid rgba(248, 245, 239, 0.2);
  background: rgba(0, 0, 0, 0.28);
  color: rgba(248, 245, 239, 0.8);
  padding: 9px 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.modeTabActive {
  border-color: rgba(176, 138, 60, 0.65);
  background: linear-gradient(120deg, rgba(247, 236, 214, 0.12), rgba(212, 176, 107, 0.22));
  color: #f8f5ef;
}

.form {
  margin-top: 28px;
}

.registerGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.span2 {
  grid-column: span 2;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(248, 245, 239, 0.75);
}

.inputWrap {
  position: relative;
}

.inputIcon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(248, 245, 239, 0.45);
}

.input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(176, 138, 60, 0.62);
  background: rgba(0, 0, 0, 0.38);
  color: #f8f5ef;
  padding: 12px 14px 12px 40px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input::placeholder {
  color: rgba(248, 245, 239, 0.36);
}

.input:focus {
  border-color: #d4b06b;
  box-shadow: 0 0 0 3px rgba(176, 138, 60, 0.24);
}

.textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(176, 138, 60, 0.62);
  background: rgba(0, 0, 0, 0.38);
  color: #f8f5ef;
  padding: 12px 14px;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.textarea:focus {
  border-color: #d4b06b;
  box-shadow: 0 0 0 3px rgba(176, 138, 60, 0.24);
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(248, 245, 239, 0.55);
}

.submit {
  margin-top: 16px;
  width: 100%;
  border: 1px solid #dec48c;
  background: linear-gradient(120deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.16s ease, filter 0.16s ease;
}

.submit:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notice {
  margin-top: 16px;
  border: 1px solid rgba(143, 29, 29, 0.6);
  background: rgba(143, 29, 29, 0.2);
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 12px;
  color: #f6dddd;
}

.foot {
  margin-top: 14px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(248, 245, 239, 0.46);
}

@media (max-width: 980px) {
  .shell {
    padding: 18px 16px 20px;
  }

  .nav {
    display: none;
  }

  .main {
    grid-template-columns: 1fr;
    gap: 28px;
    align-items: start;
    padding-top: 20px;
  }

  .panel {
    max-width: 100%;
  }

  .registerGrid {
    grid-template-columns: 1fr;
  }

  .span2 {
    grid-column: span 1;
  }
}

```

### File: `src\app\(auth)\login\page.tsx`

**Description:** Source code for `src\app\(auth)\login\page.tsx`.

```typescript
﻿"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Scale, Phone, ArrowRight, Loader2 } from "lucide-react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import styles from "./login.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

async function parseApiJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response. Please restart dev server and try again.");
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON response from server.");
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  const formatPhone = (value: string) => {
    return value.replace(/[^\d+]/g, "");
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = phone.startsWith("+") ? phone : `+91${phone}`;

    if (cleaned.replace("+91", "").length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });

      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error || "Failed to send OTP"));

      sessionStorage.setItem("cf_phone", cleaned);
      sessionStorage.removeItem("cf_dev_otp");
      sessionStorage.removeItem("cf_registration_data");

      const devOtp = String(data.devOtp || "");
      if (devOtp) {
        sessionStorage.setItem("cf_dev_otp", devOtp);
        toast.success(`OTP sent. Dev OTP: ${devOtp}`);
      } else {
        toast.success("OTP sent to your mobile number");
      }

      router.push("/verify");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = phone.length >= 10;

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <Scale className="h-4 w-4" />
            <span>Caseflow Studio</span>
          </div>
          <div>IN {timeLabel}</div>
        </header>

        <main className={styles.main}>
          <section>
            <h1 className={`${displayFont.className} ${styles.heroTitle}`}>
              Creating
              <span className={styles.heroMuted}>Litigation</span>
              <span className="block">Experiences</span>
            </h1>
            <p className={styles.heroSub}>
              A focused legal workspace for advocates to structure facts, guide timelines, and
              draft action-ready notices with precision.
            </p>
          </section>

          <section className={styles.panel}>
            <p className={styles.kicker}>Secure Sign In</p>
            <h2 className={`${displayFont.className} ${styles.logo}`}>CaseFlow</h2>
            <p className={styles.desc}>Login with your mobile number and verify via OTP.</p>

            <form onSubmit={handleSendOTP} className={styles.form}>
              <div>
                <label className={styles.label}>Mobile Number</label>
                <div className={styles.inputWrap}>
                  <Phone className={`${styles.inputIcon} h-4 w-4`} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="9876543210"
                    maxLength={13}
                    className={styles.input}
                    required
                    autoFocus
                  />
                </div>
                <p className={styles.hint}>Indian numbers: enter 10 digits (without +91)</p>
              </div>

              <button type="submit" disabled={loading || !canSubmit} className={styles.submit}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin inline-block" />
                ) : (
                  <>
                    Login via OTP
                    <ArrowRight className="h-4 w-4 inline-block" />
                  </>
                )}
              </button>
            </form>

            <div className={styles.notice}>
              <p>
                <span className="font-semibold text-white">Advocates only.</span> This platform is
                for licensed advocates managing litigation cases.
              </p>
            </div>
            <p className={styles.foot}>CaseFlow MVP v1 · Cheque Bounce (NI Act)</p>
          </section>
        </main>
      </div>
    </div>
  );
}


```

### File: `src\app\(auth)\verify\page.tsx`

**Description:** Source code for `src\app\(auth)\verify\page.tsx`.

```typescript
﻿"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Scale, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import styles from "./verify.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

async function parseApiJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response. Please restart dev server and try again.");
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON response from server.");
  }
}

export default function VerifyPage() {
  const router = useRouter();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [timeLabel, setTimeLabel] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedPhone = sessionStorage.getItem("cf_phone");
    if (!storedPhone) {
      router.push("/login");
      return;
    }

    setPhone(storedPhone);
  }, [router]);

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp: otpString,
        }),
      });

      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error || "Verification failed"));

      localStorage.setItem("cf_user_id", String(data.userId || ""));
      localStorage.setItem("cf_phone", phone);

      toast.success("Verified successfully!");
      sessionStorage.removeItem("cf_registration_data");
      sessionStorage.removeItem("cf_auth_mode");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error || "Failed to resend OTP"));

      const devOtp = String(data.devOtp || "");
      if (devOtp) {
        sessionStorage.setItem("cf_dev_otp", devOtp);
        toast.success(`OTP resent. Dev OTP: ${devOtp}`);
      } else {
        toast.success("OTP resent!");
      }

      setCountdown(30);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <Scale className="h-4 w-4" />
            <span>Caseflow Studio</span>
          </div>
          <div>IN {timeLabel}</div>
        </header>

        <main className={styles.main}>
          <section>
            <h1 className={`${displayFont.className} ${styles.heroTitle}`}>
              Verify
              <span className={styles.heroMuted}>Secure</span>
              <span className="block">Access</span>
            </h1>
            <p className={styles.heroSub}>
              Continue to your litigation workspace with a one-time verification code delivered to
              your registered number.
            </p>
          </section>

          <section className={styles.panel}>
            <button onClick={() => router.push("/login")} className={styles.back}>
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>

            <p className={styles.kicker}>One-Time Passcode</p>
            <h2 className={`${displayFont.className} ${styles.logo}`}>Enter OTP</h2>
            <p className={styles.desc}>
              We sent a 6-digit code to <span className={styles.phone}>{phone}</span>
            </p>

            <div className={styles.otpRow} onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={styles.otpInput}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || otp.join("").length !== 6}
              className={styles.submit}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin inline-block" />
              ) : (
                "Verify & Continue"
              )}
            </button>

            <div className={styles.resendWrap}>
              {countdown > 0 ? (
                <p className={styles.countdown}>
                  Resend OTP in <strong>{countdown}s</strong>
                </p>
              ) : (
                <button onClick={handleResend} disabled={resending} className={styles.resend}>
                  {resending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Resend OTP
                </button>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}


```

### File: `src\app\(auth)\verify\verify.module.css`

**Description:** Source code for `src\app\(auth)\verify\verify.module.css`.

```css
.page {
  min-height: 100vh;
  background: radial-gradient(1100px 500px at 75% -10%, rgba(176, 138, 60, 0.25), transparent 60%),
    radial-gradient(700px 400px at -10% 20%, rgba(143, 29, 29, 0.2), transparent 60%),
    #060606;
  color: #f8f5ef;
  overflow: hidden;
}

.page::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 28px 28px;
}

.shell {
  position: relative;
  z-index: 1;
  margin: 0 auto;
  width: min(1400px, 100%);
  min-height: 100vh;
  padding: 22px 30px 28px;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 11px;
  color: rgba(248, 245, 239, 0.6);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main {
  flex: 1;
  display: grid;
  gap: 48px;
  grid-template-columns: 1.15fr 0.85fr;
  align-items: center;
}

.heroTitle {
  margin: 0;
  line-height: 0.86;
  font-size: clamp(56px, 9vw, 128px);
}

.heroMuted {
  display: block;
  color: rgba(248, 245, 239, 0.52);
}

.heroSub {
  margin-top: 22px;
  max-width: 680px;
  color: rgba(248, 245, 239, 0.62);
  font-size: clamp(17px, 2vw, 30px);
  line-height: 1.34;
}

.panel {
  border: 1px solid rgba(176, 138, 60, 0.5);
  background: linear-gradient(160deg, rgba(248, 245, 239, 0.1), rgba(248, 245, 239, 0.04));
  backdrop-filter: blur(12px);
  border-radius: 26px;
  padding: 28px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(248, 245, 239, 0.06) inset;
}

.back {
  border: 1px solid rgba(248, 245, 239, 0.28);
  background: rgba(0, 0, 0, 0.28);
  color: rgba(248, 245, 239, 0.86);
  border-radius: 10px;
  padding: 8px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.kicker {
  margin-top: 14px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: rgba(248, 245, 239, 0.62);
}

.logo {
  margin: 6px 0 0;
  line-height: 1;
  font-size: clamp(40px, 5vw, 62px);
}

.desc {
  margin: 12px 0 0;
  font-size: 14px;
  color: rgba(248, 245, 239, 0.7);
}

.phone {
  color: #f3d89f;
}

.otpRow {
  margin-top: 18px;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.otpInput {
  width: 100%;
  height: 54px;
  text-align: center;
  font-size: 26px;
  font-weight: 700;
  border-radius: 10px;
  border: 1px solid rgba(176, 138, 60, 0.7);
  background: rgba(0, 0, 0, 0.38);
  color: #f8f5ef;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.otpInput:focus {
  border-color: #d4b06b;
  box-shadow: 0 0 0 3px rgba(176, 138, 60, 0.24);
}

.submit {
  margin-top: 14px;
  width: 100%;
  border: 1px solid #dec48c;
  background: linear-gradient(120deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px;
  font-weight: 700;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.resendWrap {
  margin-top: 12px;
  text-align: center;
}

.countdown {
  font-size: 13px;
  color: rgba(248, 245, 239, 0.64);
}

.countdown strong {
  color: #f3d89f;
}

.resend {
  border: none;
  background: none;
  color: #f3d89f;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

@media (max-width: 980px) {
  .shell {
    padding: 18px 16px 20px;
  }

  .main {
    grid-template-columns: 1fr;
    gap: 28px;
    align-items: start;
    padding-top: 20px;
  }

  .panel {
    max-width: 100%;
  }
}

```

### File: `src\app\(dashboard)\cases\new\newcase.module.css`

**Description:** Source code for `src\app\(dashboard)\cases\new\newcase.module.css`.

```css
.page {
  max-width: 1180px;
  margin: 0 auto;
  color: #f8f5ef;
}

.chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: rgba(248, 245, 239, 0.65);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero {
  border: 1px solid #b4914f;
  border-radius: 22px;
  background:
    radial-gradient(800px 340px at 85% 0%, rgba(176, 138, 60, 0.26), transparent 60%),
    linear-gradient(130deg, #060606, #151311 65%, #241a10);
  padding: 18px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
}

.heroHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.title {
  margin: 0;
  font-size: clamp(40px, 6vw, 82px);
  line-height: 0.9;
}

.muted {
  display: block;
  color: rgba(248, 245, 239, 0.5);
}

.sub {
  margin: 10px 0 0;
  color: rgba(248, 245, 239, 0.72);
  max-width: 690px;
}

.stepPill {
  border: 1px solid rgba(176, 138, 60, 0.56);
  border-radius: 12px;
  background: rgba(248, 245, 239, 0.08);
  padding: 10px 12px;
  min-width: 220px;
}

.stepTitle {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(248, 245, 239, 0.75);
}

.stepText {
  margin: 6px 0 0;
  color: #f3d89f;
  font-weight: 600;
}

.steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.stepItem {
  border: 1px solid rgba(248, 245, 239, 0.24);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.24);
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.stepDot {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid rgba(248, 245, 239, 0.35);
  color: rgba(248, 245, 239, 0.8);
}

.stepActive .stepDot {
  border-color: #d4b06b;
  color: #111;
  background: #f3d89f;
}

.stepDone .stepDot {
  border-color: #d4b06b;
  color: #111;
  background: #d4b06b;
}

.stepLabel {
  font-size: 14px;
  color: rgba(248, 245, 239, 0.8);
}

.panel {
  margin-top: 12px;
  border: 1px solid rgba(176, 138, 60, 0.56);
  border-radius: 20px;
  background: rgba(248, 245, 239, 0.08);
  backdrop-filter: blur(8px);
  padding: 16px;
}

@media (max-width: 900px) {
  .heroHead {
    flex-direction: column;
  }

  .stepPill {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .steps {
    grid-template-columns: 1fr;
  }
}

```

### File: `src\app\(dashboard)\cases\new\page.tsx`

**Description:** Source code for `src\app\(dashboard)\cases\new\page.tsx`.

```typescript
﻿"use client";

import { useState } from "react";
import CaseTypeSelector from "@/components/cases/CaseTypeSelector";
import CaseForm from "@/components/cases/CaseForm";
import GenericCaseForm from "@/components/cases/GenericCaseForm";
import { Scale } from "lucide-react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import clsx from "clsx";
import styles from "./newcase.module.css";
import { CaseTypeId } from "@/types/caseTypes";

type Step = "select_type" | "fill_form";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function NewCasePage() {
  const [step, setStep] = useState<Step>("select_type");
  const [selectedType, setSelectedType] = useState<CaseTypeId | null>(null);

  const handleTypeSelect = (type: CaseTypeId) => {
    setSelectedType(type);
    setStep("fill_form");
  };

  const handleBack = () => setStep("select_type");

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className="inline-flex items-center gap-2">
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroHead}>
          <div>
            <h1 className={`${displayFont.className} ${styles.title}`}>
              Build
              <span className={styles.muted}>New</span>
              <span className="block">Case File</span>
            </h1>
            <p className={styles.sub}>
              Start a structured litigation file with guided workflow and clear legal milestones.
            </p>
          </div>

          <div className={styles.stepPill}>
            <p className={styles.stepTitle}>Progress</p>
            <p className={styles.stepText}>
              Step {step === "select_type" ? "1" : "2"} of 2
            </p>
          </div>
        </div>

        <div className={styles.steps}>
          <div
            className={clsx(
              styles.stepItem,
              step === "select_type" && styles.stepActive,
              step === "fill_form" && styles.stepDone
            )}
          >
            <div className={styles.stepDot}>
              {step === "fill_form" ? "✓" : "1"}
            </div>
            <span className={styles.stepLabel}>Select case type</span>
          </div>

          <div
            className={clsx(
              styles.stepItem,
              step === "fill_form" && styles.stepActive
            )}
          >
            <div className={styles.stepDot}>2</div>
            <span className={styles.stepLabel}>Fill case details</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        {step === "select_type" && (
          <CaseTypeSelector onSelect={handleTypeSelect} />
        )}
        {step === "fill_form" && selectedType === "cheque_bounce" && (
          <CaseForm onBack={handleBack} />
        )}
        {step === "fill_form" && selectedType && selectedType !== "cheque_bounce" && (
          <GenericCaseForm caseType={selectedType} onBack={handleBack} />
        )}
      </section>
    </div>
  );
}

```

### File: `src\app\(dashboard)\cases\page.tsx`

**Description:** Source code for `src\app\(dashboard)\cases\page.tsx`.

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Case } from "@/types/case.types";
import CaseCard from "@/components/cases/CaseCard";
import { FullPageSpinner } from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { PlusCircle, Search, FolderOpen } from "lucide-react";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

const STAGE_FILTERS = [
  { key: "all", label: "All" },
  { key: "drafting", label: "Drafting" },
  { key: "notice_generated", label: "Notice Generated" },
  { key: "waiting_period", label: "Waiting" },
  { key: "complaint_eligible", label: "Complaint Eligible" },
  { key: "limitation_warning", label: "Urgent" },
  { key: "complaint_filed", label: "Filed" },
  { key: "closed", label: "Closed" },
];

export default function CasesListPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    const advocateId = localStorage.getItem("cf_user_id");
    if (!advocateId) return;

    const cacheKey = `cases:summary:${advocateId}`;
    const cachedCases = getClientCache<Case[]>(cacheKey);
    if (cachedCases) {
      setCases(cachedCases);
      setLoading(false);
    }

    fetch(`/api/cases?advocate_id=${advocateId}&view=summary`)
      .then((r) => r.json())
      .then((data) => {
        const nextCases = data.cases || [];
        setCases(nextCases);
        setClientCache(cacheKey, nextCases, 45_000);
        nextCases.slice(0, 10).forEach((c: Case) => {
          router.prefetch(`/cases/${c.id}`);
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const filtered = cases.filter((c) => {
    const client = c.case_parties?.find((p) => p.role === "client");
    const opp = c.case_parties?.find((p) => p.role === "opposite_party");
    const matchesSearch =
      !search ||
      client?.name.toLowerCase().includes(search.toLowerCase()) ||
      opp?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.includes(search.toLowerCase());
    const matchesStage =
      stageFilter === "all" || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  if (loading) return <FullPageSpinner label="Loading cases..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Cases</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {cases.length} total cases
          </p>
        </div>
        <Button
          onClick={() => router.push("/cases/new")}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          New Case
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by client or party name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startAdornment={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {STAGE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStageFilter(key)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                stageFilter === key
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FolderOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No cases found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || stageFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first case to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CaseCard key={c.id} caseData={c} />
          ))}
        </div>
      )}
    </div>
  );
}

```

### File: `src\app\(dashboard)\cases\[caseId]\notice\page.module.css`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\notice\page.module.css`.

```css
.page {
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 16px);
  color: #f8f5ef;
}

.chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: rgba(248, 245, 239, 0.66);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.chromeLeft {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero {
  border: 1px solid #b4914f;
  border-radius: 24px;
  background:
    radial-gradient(900px 420px at 88% 0%, rgba(176, 138, 60, 0.28), transparent 60%),
    linear-gradient(130deg, #060606, #151311 65%, #241a10);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
}

.kicker {
  margin: 0;
  color: rgba(248, 245, 239, 0.64);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.title {
  margin: 4px 0 0;
  font-size: clamp(42px, 6vw, 94px);
  line-height: 0.9;
}

.muted {
  display: block;
  color: rgba(248, 245, 239, 0.48);
}

.subtitle {
  margin: 10px 0 0;
  max-width: 700px;
  color: rgba(248, 245, 239, 0.72);
  font-size: clamp(16px, 1.6vw, 25px);
  line-height: 1.3;
}

.heroMeta {
  border: 1px solid rgba(186, 145, 69, 0.55);
  border-radius: 16px;
  background: rgba(248, 245, 239, 0.08);
  padding: 14px;
  min-width: 230px;
  align-self: start;
}

.metaBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(248, 245, 239, 0.28);
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.caseCode {
  margin: 10px 0 12px;
  color: #f8f5ef;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.backBtn {
  border: 1px solid rgba(248, 245, 239, 0.32);
  background: rgba(255, 255, 255, 0.05);
  color: #f8f5ef;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.panel {
  margin-top: 12px;
  border: 1px solid rgba(186, 145, 69, 0.6);
  border-radius: 18px;
  background: rgba(7, 7, 7, 0.8);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  padding: 14px;
}

.panelHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.panelTitle {
  margin: 0;
  font-size: 40px;
  line-height: 0.92;
}

.panelSub {
  margin: 5px 0 0;
  color: rgba(248, 245, 239, 0.62);
  font-size: 13px;
}

.frameworkGrid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.frameworkItem {
  border: 1px solid rgba(248, 245, 239, 0.22);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
}

.frameworkLabel {
  margin: 0;
  color: rgba(248, 245, 239, 0.6);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.frameworkValue {
  margin: 4px 0 0;
  color: #f8f5ef;
  font-size: 14px;
  font-weight: 700;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.checks {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.checkRow {
  border: 1px solid rgba(248, 245, 239, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkText {
  color: #f8f5ef;
  font-size: 13px;
}

.checkTextWarn {
  color: #efcf8f;
  font-size: 13px;
}

.checkDone {
  color: #79c28a;
}

.checkWarn {
  color: #efcf8f;
}

.badgeWarn {
  margin-left: auto;
  border: 1px solid rgba(239, 207, 143, 0.6);
  color: #efcf8f;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.alertBox {
  margin-top: 10px;
  border: 1px solid rgba(239, 207, 143, 0.45);
  border-radius: 10px;
  background: rgba(186, 145, 69, 0.12);
  color: rgba(248, 245, 239, 0.86);
  padding: 10px;
  font-size: 13px;
}

.summaryGrid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.summaryItem {
  border: 1px solid rgba(248, 245, 239, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 9px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summaryLabel {
  color: rgba(248, 245, 239, 0.58);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.summaryValue {
  color: #f8f5ef;
  font-size: 14px;
  font-weight: 600;
}

.icon14 {
  width: 14px;
  height: 14px;
}

.icon16 {
  width: 16px;
  height: 16px;
  color: rgba(248, 245, 239, 0.72);
}

@media (max-width: 1080px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .heroMeta {
    min-width: 0;
  }

  .frameworkGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .chrome {
    font-size: 10px;
  }

  .hero,
  .panel {
    border-radius: 16px;
    padding: 12px;
  }

  .panelTitle {
    font-size: 32px;
  }

  .frameworkGrid,
  .summaryGrid {
    grid-template-columns: 1fr;
  }
}

```

### File: `src\app\(dashboard)\cases\[caseId]\notice\page.tsx`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\notice\page.tsx`.

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Scale,
  Shield,
} from "lucide-react";
import { FullPageSpinner } from "@/components/ui/Spinner";
import DownloadButton from "@/components/notice/DownloadButton";
import NoticePreview from "@/components/notice/NoticePreview";
import { Case } from "@/types/case.types";
import { CHEQUE_BOUNCE_LEGAL_MAP } from "@/constants/legalMapping";
import { getCaseTypeConfig } from "@/constants/caseTypeRegistry";
import { formatCurrency } from "@/lib/utils/formatters";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./page.module.css";

interface NoticeMeta {
  act: string;
  sections: string[];
  noticeSentDate: string;
  waitingPeriodEnd: string;
  complaintDeadline: string;
}

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function NoticePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedMeta, setGeneratedMeta] = useState<NoticeMeta | null>(null);
  const [timeLabel, setTimeLabel] = useState("");
  const advocateId =
    typeof window !== "undefined" ? localStorage.getItem("cf_user_id") : null;

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const cacheKey = `case:${caseId}:notice`;
    const cached = getClientCache<Case>(cacheKey);
    if (cached) {
      setCaseData(cached);
      setLoading(false);
    }

    fetch(`/api/cases/${caseId}?view=notice`)
      .then((r) => r.json())
      .then((data) => {
        const nextCase = data.case || null;
        setCaseData(nextCase);
        if (nextCase) {
          setClientCache(cacheKey, nextCase, 45_000);
        }
        setLoading(false);
      });
  }, [caseId]);

  const handleGenerated = (metadata: Record<string, string>) => {
    setGeneratedMeta(metadata as unknown as NoticeMeta);
    fetch(`/api/cases/${caseId}?view=notice`)
      .then((r) => r.json())
      .then((data) => {
        const nextCase = data.case || null;
        setCaseData(nextCase);
        if (nextCase) {
          setClientCache(`case:${caseId}:notice`, nextCase, 45_000);
        }
      });
  };

  if (loading) return <FullPageSpinner label="Loading notice workspace..." />;

  const shortCaseId = (caseId || "").slice(0, 8).toUpperCase();
  const caseType = caseData?.case_type || "cheque_bounce";
  const config = getCaseTypeConfig(caseType);
  const client = caseData?.case_parties?.find((p) => p.role === "client");
  const oppParty = caseData?.case_parties?.find((p) => p.role === "opposite_party");
  const financials = caseData?.case_financials;
  const facts = caseData?.case_facts;
  const hasExistingNotice = caseData?.stage !== "drafting" && caseData?.stage !== undefined;

  const isCheque = caseType === "cheque_bounce";

  const checks = isCheque
    ? [
        { label: "Client and opposite party details", done: !!(client && oppParty) },
        { label: "Cheque and dishonour details", done: !!financials },
        { label: "Client story captured", done: !!facts?.raw_story },
        {
          label: "Case facts completed",
          done: facts?.notice_delivery_mode !== null && facts?.notice_delivery_mode !== undefined,
        },
      ]
    : [
        { label: "Client and opposite party details", done: !!(client && oppParty) },
        { label: "Case-specific details captured", done: !!caseData?.case_metadata && Object.keys(caseData.case_metadata).length > 0 },
        { label: "Client story captured", done: !!facts?.raw_story },
        {
          label: "Case facts completed",
          done: !!facts?.answers && Object.values(facts.answers).some((v) => v !== null && v !== undefined && v !== ""),
        },
      ];
  const isReady = checks.every((c) => c.done);

  const frameworkItems = isCheque
    ? [
        { label: "Act", value: "NI Act, 1881" },
        { label: "Sections", value: CHEQUE_BOUNCE_LEGAL_MAP.sections.join(", ") },
        { label: "Notice Period", value: `${CHEQUE_BOUNCE_LEGAL_MAP.notice_period_days} days` },
        { label: "Payment Wait", value: `${CHEQUE_BOUNCE_LEGAL_MAP.payment_wait_days} days` },
      ]
    : [
        { label: "Act", value: config?.legalMap.act || "Not Provided" },
        { label: "Sections", value: (config?.legalMap.sections || []).join(", ") || "—" },
        {
          label: "Notice Period",
          value:
            typeof config?.legalMap.notice_period_days === "number"
              ? `${config.legalMap.notice_period_days} days`
              : "Not applicable",
        },
        { label: "Type", value: config?.title || caseType },
      ];

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className={styles.chromeLeft}>
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Document Generation</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Generate Legal
            <span className={styles.muted}>Notice</span>
          </h1>
          <p className={styles.subtitle}>
            Produce a court-ready demand notice grounded in fixed legal rules
            and validated case facts.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.metaBadge}>
            <FileText className={styles.icon14} />
            Step 3 of 3
          </div>
          <p className={styles.caseCode}>Case #{shortCaseId}</p>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}`)}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back to Case
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Applied Legal Framework</h2>
          <Shield className={styles.icon16} />
        </div>
        <p className={styles.panelSub}>Hardcoded legal mapping. Not generated by AI.</p>
        <div className={styles.frameworkGrid}>
          {frameworkItems.map(({ label, value }) => (
            <article key={label} className={styles.frameworkItem}>
              <p className={styles.frameworkLabel}>{label}</p>
              <p className={styles.frameworkValue}>{value}</p>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Notice Readiness</h2>
          </div>
          <p className={styles.panelSub}>All checkpoints must pass before generation.</p>

          <div className={styles.checks}>
            {checks.map(({ label, done }) => (
              <div key={label} className={styles.checkRow}>
                {done ? (
                  <CheckCircle2 className={`${styles.icon16} ${styles.checkDone}`} />
                ) : (
                  <AlertCircle className={`${styles.icon16} ${styles.checkWarn}`} />
                )}
                <span className={done ? styles.checkText : styles.checkTextWarn}>{label}</span>
                {!done && <span className={styles.badgeWarn}>Incomplete</span>}
              </div>
            ))}
          </div>

          {!isReady && (
            <div className={styles.alertBox}>
              Complete all required items before generating the notice.
            </div>
          )}
        </section>

        {financials && client && oppParty && isCheque && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Verify Before Generating</h2>
            </div>
            <p className={styles.panelSub}>Final fact review.</p>
            <div className={styles.summaryGrid}>
              {[
                { label: "Client", value: client.name },
                { label: "Opposite Party", value: oppParty.name },
                { label: "Cheque No.", value: financials.cheque_number },
                { label: "Amount", value: formatCurrency(financials.cheque_amount) },
                { label: "Bank", value: financials.bank_name },
                { label: "Dishonour", value: financials.dishonour_reason },
              ].map(({ label, value }) => (
                <div key={label} className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{label}</span>
                  <span className={styles.summaryValue}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isCheque && client && oppParty && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Verify Before Generating</h2>
            </div>
            <p className={styles.panelSub}>Final fact review.</p>
            <div className={styles.summaryGrid}>
              {[
                { label: "Client", value: client.name },
                { label: "Opposite Party", value: oppParty.name },
                { label: "Type", value: config?.title || caseType },
                { label: "Jurisdiction", value: caseData?.jurisdiction_city || "—" },
              ].map(({ label, value }) => (
                <div key={label} className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{label}</span>
                  <span className={styles.summaryValue}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {isReady && advocateId && (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Generate Notice</h2>
            <Scale className={styles.icon16} />
          </div>
          <p className={styles.panelSub}>AI drafts language. Legal structure remains deterministic.</p>
          <DownloadButton
            caseId={caseId as string}
            advocateId={advocateId}
            onGenerated={handleGenerated}
            hasExistingNotice={hasExistingNotice}
          />
        </section>
      )}

      {generatedMeta && (
        <section className={styles.panel}>
          <NoticePreview
            noticeText="Notice generated and downloaded. Open the .docx file to view the fully formatted legal notice."
            metadata={generatedMeta}
          />
        </section>
      )}
    </div>
  );
}

```

### File: `src\app\(dashboard)\cases\[caseId]\page.module.css`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\page.module.css`.

```css
.page {
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 16px);
  color: #f8f5ef;
}

.chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: rgba(248, 245, 239, 0.66);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.chromeLeft {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero {
  border: 1px solid #b4914f;
  border-radius: 24px;
  background:
    radial-gradient(900px 420px at 88% 0%, rgba(176, 138, 60, 0.28), transparent 60%),
    linear-gradient(130deg, #060606, #151311 65%, #241a10);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
}

.kicker {
  margin: 0;
  color: rgba(248, 245, 239, 0.64);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.title {
  margin: 4px 0 0;
  font-size: clamp(42px, 6vw, 94px);
  line-height: 0.9;
}

.muted {
  display: block;
  color: rgba(248, 245, 239, 0.48);
}

.subtitle {
  margin: 10px 0 0;
  max-width: 760px;
  color: rgba(248, 245, 239, 0.72);
  font-size: clamp(16px, 1.6vw, 24px);
  line-height: 1.3;
}

.heroMeta {
  border: 1px solid rgba(186, 145, 69, 0.55);
  border-radius: 16px;
  background: rgba(248, 245, 239, 0.08);
  padding: 14px;
  min-width: 250px;
  align-self: start;
}

.stagePill {
  display: inline-flex;
  border: 1px solid rgba(248, 245, 239, 0.28);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stageDesc {
  margin: 10px 0 12px;
  color: rgba(248, 245, 239, 0.72);
  font-size: 13px;
  line-height: 1.4;
}

.backBtn {
  border: 1px solid rgba(248, 245, 239, 0.32);
  background: rgba(255, 255, 255, 0.05);
  color: #f8f5ef;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.panel {
  margin-top: 12px;
  border: 1px solid rgba(186, 145, 69, 0.6);
  border-radius: 18px;
  background: rgba(7, 7, 7, 0.8);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  padding: 14px;
}

.panelHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.panelTitle {
  margin: 0;
  font-size: 40px;
  line-height: 0.92;
}

.panelSub {
  margin: 6px 0 0;
  color: rgba(248, 245, 239, 0.62);
  font-size: 13px;
}

.stageTrack {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.stageItem {
  border: 1px solid rgba(248, 245, 239, 0.18);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.stageDot,
.stageDotActive {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stageDot {
  background: rgba(248, 245, 239, 0.3);
}

.stageDotActive {
  background: #e0c485;
}

.stageLabel,
.stageLabelActive {
  font-size: 12px;
  line-height: 1.2;
}

.stageLabel {
  color: rgba(248, 245, 239, 0.56);
}

.stageLabelActive {
  color: #f8f5ef;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.actions {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.actionBtn {
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 11px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  cursor: pointer;
}

.actionBtn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mutedText {
  margin: 0;
  color: rgba(248, 245, 239, 0.56);
  font-size: 13px;
}

.deadlineList {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.deadlineItem {
  border: 1px solid rgba(248, 245, 239, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 9px 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.deadlineLabel {
  color: rgba(248, 245, 239, 0.62);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.deadlineValue {
  color: #f8f5ef;
  font-size: 14px;
  font-weight: 700;
}

.summaryGrid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.summaryItem,
.summaryItemWide {
  border: 1px solid rgba(248, 245, 239, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 9px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summaryItemWide {
  grid-column: span 2;
}

.summaryLabel {
  color: rgba(248, 245, 239, 0.58);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.summaryValue {
  color: #f8f5ef;
  font-size: 14px;
  font-weight: 700;
}

.summarySub {
  color: rgba(248, 245, 239, 0.65);
  font-size: 12px;
}

.workflowGrid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.workflowBtn {
  border: 1px solid rgba(248, 245, 239, 0.26);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #f8f5ef;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
}

.workflowBtn:hover {
  border-color: rgba(222, 196, 140, 0.62);
}

.icon14 {
  width: 14px;
  height: 14px;
}

.icon16 {
  width: 16px;
  height: 16px;
  color: rgba(248, 245, 239, 0.72);
}

.empty {
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
  color: rgba(248, 245, 239, 0.7);
}

@media (max-width: 1080px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .heroMeta {
    min-width: 0;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .stageTrack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workflowGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .chrome {
    font-size: 10px;
  }

  .hero,
  .panel {
    border-radius: 16px;
    padding: 12px;
  }

  .panelTitle {
    font-size: 32px;
  }

  .stageTrack,
  .summaryGrid,
  .workflowGrid {
    grid-template-columns: 1fr;
  }

  .summaryItemWide {
    grid-column: auto;
  }
}

```

### File: `src\app\(dashboard)\cases\[caseId]\page.tsx`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\page.tsx`.

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import toast from "react-hot-toast";
import { Case } from "@/types/case.types";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { CASE_STAGES } from "@/constants/caseStages";
import { formatCurrency } from "@/lib/utils/formatters";
import { formatDisplayDate } from "@/lib/utils/dateUtils";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Download,
  FileText,
  HelpCircle,
  MessageSquare,
  Scale,
} from "lucide-react";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ORDERED_STAGES = [
  "drafting",
  "notice_generated",
  "notice_served",
  "waiting_period",
  "complaint_eligible",
  "limitation_warning",
  "complaint_filed",
  "closed",
] as const;

interface CaseAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

export default function CasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingServed, setMarkingServed] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  const fetchCase = async () => {
    const cacheKey = `case:${caseId}:core`;
    const cached = getClientCache<Case>(cacheKey);
    if (cached) {
      setCaseData(cached);
      setLoading(false);
    }

    const res = await fetch(`/api/cases/${caseId}?view=core`);
    const data = await res.json();
    const nextCase = data.case || null;
    setCaseData(nextCase);
    if (nextCase) {
      setClientCache(cacheKey, nextCase, 45_000);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    router.prefetch(`/cases/${caseId}/story`);
    router.prefetch(`/cases/${caseId}/questions`);
    router.prefetch(`/cases/${caseId}/timeline`);
    router.prefetch(`/cases/${caseId}/notice`);
  }, [caseId, router]);

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkServed = async () => {
    setMarkingServed(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "notice_served",
          notice_served_date: today,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Notice marked as served. 15-day countdown started.");
      await fetchCase();
    } catch {
      toast.error("Failed to update case");
    } finally {
      setMarkingServed(false);
    }
  };

  if (loading) return <FullPageSpinner label="Loading case..." />;
  if (!caseData) {
    return <div className={styles.empty}>Case not found.</div>;
  }

  const client = caseData.case_parties?.find((p) => p.role === "client");
  const oppParty = caseData.case_parties?.find((p) => p.role === "opposite_party");
  const financials = caseData.case_financials;
  const stageConfig = CASE_STAGES[caseData.stage];
  const shortCaseId = caseData.id.slice(0, 8).toUpperCase();
  const currentStageIndex = ORDERED_STAGES.indexOf(caseData.stage);

  const nextActions: CaseAction[] = (() => {
    if (caseData.stage === "drafting") {
      return [
        {
          label: "Enter Client Story",
          icon: <MessageSquare className={styles.icon14} />,
          onClick: () => router.push(`/cases/${caseId}/story`),
        },
        {
          label: "Answer Questions",
          icon: <HelpCircle className={styles.icon14} />,
          onClick: () => router.push(`/cases/${caseId}/questions`),
        },
        {
          label: "Generate Notice",
          icon: <Download className={styles.icon14} />,
          onClick: () => router.push(`/cases/${caseId}/notice`),
        },
      ];
    }
    if (caseData.stage === "notice_generated") {
      return [
        {
          label: markingServed ? "Marking..." : "Mark Notice as Served",
          icon: <CheckCircle2 className={styles.icon14} />,
          onClick: handleMarkServed,
          disabled: markingServed,
        },
      ];
    }
    if (["complaint_eligible", "limitation_warning"].includes(caseData.stage)) {
      return [
        {
          label: "Generate Complaint (Coming Soon)",
          icon: <FileText className={styles.icon14} />,
          onClick: () => toast("Complaint generation coming in next version"),
        },
      ];
    }
    return [];
  })();

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className={styles.chromeLeft}>
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Case Command</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            {client?.name || "Unknown"}
            <span className={styles.muted}>vs {oppParty?.name || "Unknown"}</span>
          </h1>
          <p className={styles.subtitle}>
            Case #{shortCaseId} | Cheque Bounce | {caseData.jurisdiction_city || "Jurisdiction not set"}
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.stagePill}>{stageConfig?.label || caseData.stage}</span>
          <p className={styles.stageDesc}>{stageConfig?.description}</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Case Progress</h2>
        </div>
        <div className={styles.stageTrack}>
          {ORDERED_STAGES.map((stage, idx) => {
            const active = idx <= currentStageIndex;
            return (
              <div key={stage} className={styles.stageItem}>
                <span className={active ? styles.stageDotActive : styles.stageDot} />
                <span className={active ? styles.stageLabelActive : styles.stageLabel}>
                  {CASE_STAGES[stage].label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Next Action</h2>
            <ArrowRight className={styles.icon16} />
          </div>
          <p className={styles.panelSub}>{stageConfig?.description}</p>
          <div className={styles.actions}>
            {nextActions.length === 0 ? (
              <p className={styles.mutedText}>No immediate action required.</p>
            ) : (
              nextActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={styles.actionBtn}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Deadlines</h2>
            <Clock3 className={styles.icon16} />
          </div>
          <div className={styles.deadlineList}>
            <div className={styles.deadlineItem}>
              <span className={styles.deadlineLabel}>15-Day Wait Ends</span>
              <span className={styles.deadlineValue}>
                {formatDisplayDate(caseData.waiting_period_end) || "Not set"}
              </span>
            </div>
            <div className={styles.deadlineItem}>
              <span className={styles.deadlineLabel}>Complaint Deadline</span>
              <span className={styles.deadlineValue}>
                {formatDisplayDate(caseData.complaint_deadline) || "Not set"}
              </span>
            </div>
            <div className={styles.deadlineItem}>
              <span className={styles.deadlineLabel}>Notice Sent</span>
              <span className={styles.deadlineValue}>
                {formatDisplayDate(caseData.notice_sent_date) || "Not yet"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Parties</h2>
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Client</span>
              <span className={styles.summaryValue}>{client?.name || "Unknown"}</span>
              <span className={styles.summarySub}>{client?.address || "Address not set"}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Opposite Party</span>
              <span className={styles.summaryValue}>{oppParty?.name || "Unknown"}</span>
              <span className={styles.summarySub}>{oppParty?.address || "Address not set"}</span>
            </div>
          </div>
        </section>

        {financials && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Cheque Details</h2>
              <Calendar className={styles.icon16} />
            </div>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Cheque No.</span>
                <span className={styles.summaryValue}>{financials.cheque_number}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Amount</span>
                <span className={styles.summaryValue}>{formatCurrency(financials.cheque_amount)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Cheque Date</span>
                <span className={styles.summaryValue}>{formatDisplayDate(financials.cheque_date)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Return Memo Date</span>
                <span className={styles.summaryValue}>{formatDisplayDate(financials.return_memo_date)}</span>
              </div>
              <div className={styles.summaryItemWide}>
                <span className={styles.summaryLabel}>Bank</span>
                <span className={styles.summaryValue}>{financials.bank_name}</span>
              </div>
              <div className={styles.summaryItemWide}>
                <span className={styles.summaryLabel}>Dishonour Reason</span>
                <span className={styles.summaryValue}>{financials.dishonour_reason}</span>
              </div>
            </div>
          </section>
        )}
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={`${displayFont.className} ${styles.panelTitle}`}>Workflow</h2>
        </div>
        <div className={styles.workflowGrid}>
          <button onClick={() => router.push(`/cases/${caseId}/story`)} className={styles.workflowBtn}>
            <MessageSquare className={styles.icon16} /> Client Story
          </button>
          <button onClick={() => router.push(`/cases/${caseId}/questions`)} className={styles.workflowBtn}>
            <HelpCircle className={styles.icon16} /> Case Facts
          </button>
          <button onClick={() => router.push(`/cases/${caseId}/timeline`)} className={styles.workflowBtn}>
            <Clock3 className={styles.icon16} /> Timeline
          </button>
          <button onClick={() => router.push(`/cases/${caseId}/notice`)} className={styles.workflowBtn}>
            <FileText className={styles.icon16} /> Legal Notice
          </button>
        </div>
      </section>
    </div>
  );
}

```

### File: `src\app\(dashboard)\cases\[caseId]\questions\page.module.css`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\questions\page.module.css`.

```css
.page {
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 16px);
  color: #f8f5ef;
}

.chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: rgba(248, 245, 239, 0.66);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.chromeLeft {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero {
  border: 1px solid #b4914f;
  border-radius: 24px;
  background:
    radial-gradient(900px 420px at 88% 0%, rgba(176, 138, 60, 0.28), transparent 60%),
    linear-gradient(130deg, #060606, #151311 65%, #241a10);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
}

.kicker {
  margin: 0;
  color: rgba(248, 245, 239, 0.64);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.title {
  margin: 4px 0 0;
  font-size: clamp(42px, 6vw, 94px);
  line-height: 0.9;
}

.muted {
  display: block;
  color: rgba(248, 245, 239, 0.48);
}

.subtitle {
  margin: 10px 0 0;
  max-width: 700px;
  color: rgba(248, 245, 239, 0.72);
  font-size: clamp(16px, 1.6vw, 25px);
  line-height: 1.3;
}

.heroMeta {
  border: 1px solid rgba(186, 145, 69, 0.55);
  border-radius: 16px;
  background: rgba(248, 245, 239, 0.08);
  padding: 14px;
  min-width: 230px;
  align-self: start;
}

.metaBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(248, 245, 239, 0.28);
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.caseCode {
  margin: 10px 0 12px;
  color: #f8f5ef;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.backBtn {
  border: 1px solid rgba(248, 245, 239, 0.32);
  background: rgba(255, 255, 255, 0.05);
  color: #f8f5ef;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.panel {
  margin-top: 12px;
  border: 1px solid rgba(186, 145, 69, 0.6);
  border-radius: 18px;
  background: rgba(7, 7, 7, 0.8);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  padding: 14px;
}

.info {
  border: 1px solid rgba(186, 145, 69, 0.45);
  border-radius: 12px;
  background: rgba(186, 145, 69, 0.12);
  padding: 10px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 12px;
}

.infoIcon {
  width: 16px;
  height: 16px;
  color: #d7b269;
  margin-top: 2px;
  flex-shrink: 0;
}

.infoTitle {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8f5ef;
}

.infoText {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(248, 245, 239, 0.76);
  line-height: 1.4;
}

.footerAction {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.nextBtn {
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.icon14 {
  width: 14px;
  height: 14px;
}

@media (max-width: 1020px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .heroMeta {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .chrome {
    font-size: 10px;
  }

  .hero,
  .panel {
    border-radius: 16px;
    padding: 12px;
  }

  .footerAction {
    justify-content: stretch;
  }

  .nextBtn {
    width: 100%;
    justify-content: center;
  }
}

```

### File: `src\app\(dashboard)\cases\[caseId]\questions\page.tsx`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\questions\page.tsx`.

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import { ChevronLeft, ChevronRight, HelpCircle, Scale, Shield } from "lucide-react";
import { FullPageSpinner } from "@/components/ui/Spinner";
import QuestionFlow from "@/components/questions/QuestionFlow";
import { CaseFactsAnswers, GenericAnswers } from "@/types/facts.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface CachedFacts {
  caseType: string;
  answers: Partial<CaseFactsAnswers> | GenericAnswers;
  completed: boolean;
}

export default function QuestionsPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [caseType, setCaseType] = useState<string>("cheque_bounce");
  const [initialAnswers, setInitialAnswers] = useState<
    Partial<CaseFactsAnswers> | GenericAnswers
  >();
  const [completed, setCompleted] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const cacheKey = `case:${caseId}:facts`;
    const cached = getClientCache<CachedFacts>(cacheKey);
    if (cached) {
      setCaseType(cached.caseType);
      setInitialAnswers(cached.answers);
      setCompleted(cached.completed);
      setLoading(false);
    }

    fetch(`/api/cases/${caseId}?view=facts`)
      .then((r) => r.json())
      .then((data) => {
        const c = data.case;
        if (!c) return;

        const facts = c.case_facts;
        const ct = c.case_type || "cheque_bounce";
        setCaseType(ct);

        if (ct === "cheque_bounce") {
          const answers: Partial<CaseFactsAnswers> = {
            cheque_signed_by_drawer: facts?.cheque_signed_by_drawer,
            statutory_notice_already_sent: facts?.statutory_notice_already_sent,
            part_payment_made: facts?.part_payment_made,
            part_payment_amount: facts?.part_payment_amount,
            written_admission_available: facts?.written_admission_available,
            notice_delivery_mode: facts?.notice_delivery_mode,
          };
          setInitialAnswers(answers);
          const isComplete =
            facts?.notice_delivery_mode !== null && facts?.notice_delivery_mode !== undefined;
          setCompleted(isComplete);
          setClientCache<CachedFacts>(
            cacheKey,
            { caseType: ct, answers, completed: isComplete },
            45_000
          );
        } else {
          const answers = (facts?.answers as GenericAnswers) || {};
          const isComplete = Object.values(answers).some(
            (v) => v !== null && v !== undefined && v !== ""
          );
          setInitialAnswers(answers);
          setCompleted(isComplete);
          setClientCache<CachedFacts>(
            cacheKey,
            { caseType: ct, answers, completed: isComplete },
            45_000
          );
        }
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  const shortCaseId = useMemo(
    () => (caseId || "").slice(0, 8).toUpperCase(),
    [caseId]
  );

  if (loading) return <FullPageSpinner label="Loading case facts..." />;

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className={styles.chromeLeft}>
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Case Qualification</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Case Facts
            <span className={styles.muted}>Validation</span>
          </h1>
          <p className={styles.subtitle}>
            Record essential case facts before generating a structured and
            enforceable legal document.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.metaBadge}>
            <HelpCircle className={styles.icon14} />
            Step 2 of 3
          </div>
          <p className={styles.caseCode}>Case #{shortCaseId}</p>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}/story`)}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back to Story
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.info}>
          <Shield className={styles.infoIcon} />
          <div>
            <p className={styles.infoTitle}>These answers shape your legal document</p>
            <p className={styles.infoText}>
              Rules and deadlines come from fixed legal logic. These answers
              are used for factual drafting and completeness only.
            </p>
          </div>
        </div>

        <QuestionFlow
          caseId={caseId as string}
          caseType={caseType}
          initialAnswers={initialAnswers}
          onComplete={() => setCompleted(true)}
        />
      </section>

      {completed && (
        <div className={styles.footerAction}>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}/notice`)}
            className={styles.nextBtn}
          >
            Continue to Generate Notice
            <ChevronRight className={styles.icon14} />
          </button>
        </div>
      )}
    </div>
  );
}

```

### File: `src\app\(dashboard)\cases\[caseId]\story\page.module.css`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\story\page.module.css`.

```css
.page {
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 16px);
  color: #f8f5ef;
}

.chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: rgba(248, 245, 239, 0.66);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.chromeLeft {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero {
  border: 1px solid #b4914f;
  border-radius: 24px;
  background:
    radial-gradient(900px 420px at 88% 0%, rgba(176, 138, 60, 0.28), transparent 60%),
    linear-gradient(130deg, #060606, #151311 65%, #241a10);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
}

.kicker {
  margin: 0;
  color: rgba(248, 245, 239, 0.64);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.title {
  margin: 4px 0 0;
  font-size: clamp(42px, 6vw, 94px);
  line-height: 0.9;
}

.muted {
  display: block;
  color: rgba(248, 245, 239, 0.48);
}

.subtitle {
  margin: 10px 0 0;
  max-width: 700px;
  color: rgba(248, 245, 239, 0.72);
  font-size: clamp(16px, 1.7vw, 26px);
  line-height: 1.3;
}

.heroMeta {
  border: 1px solid rgba(186, 145, 69, 0.55);
  border-radius: 16px;
  background: rgba(248, 245, 239, 0.08);
  padding: 14px;
  min-width: 230px;
  align-self: start;
}

.caseCode {
  margin: 0;
  color: #f8f5ef;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.step {
  margin: 4px 0 12px;
  color: rgba(248, 245, 239, 0.62);
  font-size: 13px;
}

.backBtn {
  border: 1px solid rgba(248, 245, 239, 0.32);
  background: rgba(255, 255, 255, 0.05);
  color: #f8f5ef;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel {
  border: 1px solid rgba(186, 145, 69, 0.6);
  border-radius: 18px;
  background: rgba(7, 7, 7, 0.8);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  padding: 14px;
}

.panelHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.panelKicker {
  margin: 0;
  color: rgba(248, 245, 239, 0.64);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.toggle {
  border: 1px solid rgba(248, 245, 239, 0.2);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 3px;
  display: inline-flex;
  gap: 4px;
}

.toggleBtn,
.toggleActive {
  border: 0;
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toggleBtn {
  background: transparent;
  color: rgba(248, 245, 239, 0.72);
}

.toggleActive {
  background: linear-gradient(120deg, #f7ecd6, #d4b06b);
  color: #111;
}

.voiceBlock {
  display: grid;
  gap: 12px;
}

.transcriptBlock {
  border: 1px solid rgba(248, 245, 239, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
}

.transcriptText {
  margin-top: 8px;
  border: 1px solid rgba(186, 145, 69, 0.4);
  border-radius: 10px;
  background: rgba(4, 4, 4, 0.76);
  color: rgba(248, 245, 239, 0.86);
  padding: 10px;
  font-size: 14px;
  line-height: 1.5;
  max-height: 210px;
  overflow: auto;
}

.extractSecondary {
  margin-top: 10px;
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 11px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.extractSecondary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.panelTitle {
  margin: 0;
  font-size: 46px;
  line-height: 0.92;
}

.panelSub {
  margin: 5px 0 0;
  color: rgba(248, 245, 239, 0.6);
  font-size: 13px;
}

.badge {
  border: 1px solid rgba(248, 245, 239, 0.32);
  border-radius: 999px;
  padding: 5px 9px;
  color: #f8f5ef;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.clockIcon {
  width: 17px;
  height: 17px;
  color: rgba(248, 245, 239, 0.38);
}

.footerAction {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.nextBtn {
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.icon14 {
  width: 14px;
  height: 14px;
}

.spin {
  width: 14px;
  height: 14px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1020px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .heroMeta {
    min-width: 0;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page {
    min-height: auto;
  }

  .chrome {
    font-size: 10px;
  }

  .hero,
  .panel {
    border-radius: 16px;
    padding: 12px;
  }

  .panelTitle {
    font-size: 34px;
  }

  .toggle {
    width: 100%;
  }

  .toggleBtn,
  .toggleActive {
    flex: 1;
    justify-content: center;
  }

  .footerAction {
    justify-content: stretch;
  }

  .nextBtn {
    width: 100%;
    justify-content: center;
  }
}

```

### File: `src\app\(dashboard)\cases\[caseId]\story\page.tsx`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\story\page.tsx`.

```typescript
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Mic,
  RefreshCw,
  Scale,
} from "lucide-react";
import toast from "react-hot-toast";
import StoryTextInput from "@/components/story/StoryTextInput";
import TimelineView from "@/components/story/TimelineView";
import VoiceRecorder from "@/components/story/VoiceRecorder";
import { TimelineEvent } from "@/types/timeline.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function StoryPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [story, setStory] = useState("");
  const [activeInput, setActiveInput] = useState<"text" | "voice">("text");
  const [extracting, setExtracting] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [extracted, setExtracted] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const cacheKey = `case:${caseId}:story`;
    const cached = getClientCache<{ timeline: TimelineEvent[]; rawStory: string }>(cacheKey);
    if (cached) {
      if (cached.timeline.length > 0) {
        setEvents(cached.timeline);
        setExtracted(true);
      }
      if (cached.rawStory) setStory(cached.rawStory);
    }

    fetch(`/api/cases/${caseId}?view=story`)
      .then((r) => r.json())
      .then((data) => {
        const timeline = data.case?.event_timeline || [];
        if (timeline.length > 0) {
          setEvents(timeline);
          setExtracted(true);
        }
        const rawStory = data.case?.case_facts?.raw_story;
        if (rawStory) setStory(rawStory);
        setClientCache(cacheKey, { timeline, rawStory: rawStory || "" }, 45_000);
      });
  }, [caseId]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setStory((prev) => prev + (prev ? " " : "") + text);
  }, []);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await fetch("/api/story/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, story }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEvents(data.events || []);
      setExtracted(true);
      toast.success(`${data.count} events extracted from story`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const shortCaseId = useMemo(
    () => (caseId || "").slice(0, 8).toUpperCase(),
    [caseId]
  );

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className={styles.chromeLeft}>
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Case Story Builder</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Client Story
            <span className={styles.muted}>Intelligence</span>
          </h1>
          <p className={styles.subtitle}>
            Convert a plain narration into a structured legal event timeline
            with verifiable sequence and dates.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <p className={styles.caseCode}>Case #{shortCaseId}</p>
          <p className={styles.step}>Step 1 of 3</p>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}`)}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back to Case
          </button>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelKicker}>Input Mode</p>
            <div className={styles.toggle}>
              <button
                type="button"
                onClick={() => setActiveInput("text")}
                className={
                  activeInput === "text" ? styles.toggleActive : styles.toggleBtn
                }
              >
                <FileText className={styles.icon14} />
                Type Story
              </button>
              <button
                type="button"
                onClick={() => setActiveInput("voice")}
                className={
                  activeInput === "voice" ? styles.toggleActive : styles.toggleBtn
                }
              >
                <Mic className={styles.icon14} />
                Voice Input
              </button>
            </div>
          </div>

          {activeInput === "text" ? (
            <StoryTextInput
              value={story}
              onChange={setStory}
              onSubmit={handleExtract}
              loading={extracting}
            />
          ) : (
            <div className={styles.voiceBlock}>
              <VoiceRecorder onTranscript={handleVoiceTranscript} />
              {story && (
                <div className={styles.transcriptBlock}>
                  <p className={styles.panelKicker}>Transcribed Story</p>
                  <div className={styles.transcriptText}>{story}</div>
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={extracting}
                    className={styles.extractSecondary}
                  >
                    <RefreshCw className={extracting ? styles.spin : styles.icon14} />
                    {extracting ? "Extracting..." : "Extract Timeline from Story"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={`${displayFont.className} ${styles.panelTitle}`}>
                Extracted Timeline
              </h2>
              <p className={styles.panelSub}>
                {extracted
                  ? `${events.length} event${events.length === 1 ? "" : "s"} found`
                  : "Timeline appears after extraction"}
              </p>
            </div>
            {extracted ? (
              <span className={styles.badge}>Extracted</span>
            ) : (
              <Clock className={styles.clockIcon} />
            )}
          </div>
          <TimelineView events={events} />
        </section>
      </div>

      {extracted && (
        <div className={styles.footerAction}>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}/questions`)}
            className={styles.nextBtn}
          >
            Continue to Case Facts
            <ChevronRight className={styles.icon14} />
          </button>
        </div>
      )}
    </div>
  );
}

```

### File: `src\app\(dashboard)\cases\[caseId]\timeline\page.tsx`

**Description:** Source code for `src\app\(dashboard)\cases\[caseId]\timeline\page.tsx`.

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TimelineView from "@/components/story/TimelineView";
import Card, { CardHeader } from "@/components/ui/Card";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { TimelineEvent } from "@/types/timeline.types";
import Button from "@/components/ui/Button";
import { Clock, RefreshCw, MessageSquare } from "lucide-react";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

export default function TimelinePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [oppPartyName, setOppPartyName] = useState("");

  useEffect(() => {
    const cacheKey = `case:${caseId}:timeline`;
    const cached = getClientCache<{
      events: TimelineEvent[];
      clientName: string;
      oppPartyName: string;
    }>(cacheKey);
    if (cached) {
      setEvents(cached.events);
      setClientName(cached.clientName);
      setOppPartyName(cached.oppPartyName);
      setLoading(false);
    }

    fetch(`/api/cases/${caseId}?view=timeline`)
      .then((r) => r.json())
      .then((data) => {
        const timeline = data.case?.event_timeline || [];
        const sorted = [...timeline].sort(
          (a: TimelineEvent, b: TimelineEvent) =>
            (a.sequence_order || 0) - (b.sequence_order || 0)
        );
        setEvents(sorted);

        const client = data.case?.case_parties?.find(
          (p: { role: string }) => p.role === "client"
        );
        const opp = data.case?.case_parties?.find(
          (p: { role: string }) => p.role === "opposite_party"
        );
        const nextClientName = client?.name || "";
        const nextOppName = opp?.name || "";
        setClientName(nextClientName);
        setOppPartyName(nextOppName);
        setClientCache(
          cacheKey,
          { events: sorted, clientName: nextClientName, oppPartyName: nextOppName },
          45_000
        );
        setLoading(false);
      });
  }, [caseId]);

  if (loading) return <FullPageSpinner label="Loading timeline..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Case Timeline
            </h1>
            {clientName && (
              <p className="text-sm text-gray-500 mt-0.5">
                {clientName} vs {oppPartyName}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back to Case
        </button>
      </div>

      {/* Timeline Card */}
      <Card>
        <CardHeader
          title="Chronological Events"
          subtitle={
            events.length > 0
              ? `${events.length} events extracted from client story`
              : "No events extracted yet"
          }
          action={
            <span className="text-xs text-gray-400">
              AI extracted · Advocate verified
            </span>
          }
        />
        <TimelineView
          events={events}
          emptyMessage="No timeline yet. Go to Client Story to extract events."
        />
      </Card>

      {/* Legal Notice Note */}
      {events.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> These events are AI-extracted from the
            client's story. Review them carefully. They will be referenced in
            the narrative portion of the legal notice. Legal sections and
            deadlines are determined separately from hardcoded rules.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => router.push(`/cases/${caseId}/story`)}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Re-extract Story
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push(`/cases/${caseId}/story`)}
          icon={<MessageSquare className="w-4 h-4" />}
        >
          Edit Story
        </Button>
      </div>
    </div>
  );
}

```

### File: `src\app\(dashboard)\dashboard\dashboard.module.css`

**Description:** Source code for `src\app\(dashboard)\dashboard\dashboard.module.css`.

```css
﻿.page {
  max-width: 1280px;
  margin: 0 auto;
  color: #f8f5ef;
  min-height: calc(100vh - 16px);
  display: flex;
  flex-direction: column;
}

.chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: rgba(248, 245, 239, 0.65);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero {
  border: 1px solid #b4914f;
  border-radius: 24px;
  background:
    radial-gradient(900px 420px at 88% 0%, rgba(176, 138, 60, 0.28), transparent 60%),
    linear-gradient(130deg, #060606, #151311 65%, #241a10);
  padding: 22px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
}

.heroGrid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
  align-items: start;
}

.heroTitle {
  margin: 0;
  font-size: clamp(44px, 6.6vw, 104px);
  line-height: 0.9;
}

.heroMuted {
  display: block;
  color: rgba(248, 245, 239, 0.48);
}

.heroSub {
  margin: 12px 0 0;
  max-width: 680px;
  color: rgba(248, 245, 239, 0.72);
  font-size: clamp(18px, 1.9vw, 28px);
  line-height: 1.3;
}

.quickPanel {
  border: 1px solid rgba(176, 138, 60, 0.5);
  border-radius: 16px;
  background: rgba(248, 245, 239, 0.07);
  padding: 14px;
  backdrop-filter: blur(8px);
}

.quickHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.quickActions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.profileBtn {
  border: 1px solid rgba(248, 245, 239, 0.35);
  background: rgba(255, 255, 255, 0.06);
  color: #f8f5ef;
  border-radius: 11px;
  padding: 9px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  cursor: pointer;
}

.profileBtn:hover {
  border-color: #dec48c;
  color: #fff;
}

.kicker {
  margin: 0;
  color: rgba(248, 245, 239, 0.7);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.newCaseBtn {
  border: 1px solid #dec48c;
  background: linear-gradient(120deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 11px;
  padding: 9px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  cursor: pointer;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat {
  border: 1px solid rgba(248, 245, 239, 0.24);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.24);
  padding: 10px;
}

.statLabel {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(248, 245, 239, 0.62);
}

.statValue {
  margin: 4px 0 0;
  font-size: clamp(26px, 3vw, 40px);
  line-height: 1;
  font-weight: 700;
}

.sections {
  display: grid;
  gap: 14px;
  grid-template-columns: 1.25fr 0.75fr;
  margin-top: 10px;
  flex: 1;
  min-height: 0;
}

.panel {
  border: 1px solid #d9bc7a;
  border-radius: 20px;
  background: #f8f5ef;
  color: #161616;
  padding: 14px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
}

.panelHead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.panelTitle {
  margin: 0;
  font-size: 44px;
  line-height: 0.9;
}

.panelMeta {
  margin: 0;
  color: #8a795d;
  font-size: 12px;
}

.caseList {
  display: flex;
  flex-direction: column;
  gap: 9px;
  max-height: 34vh;
  overflow: auto;
  padding-right: 4px;
}

.caseRow {
  border: 1px solid #d8c8a6;
  border-radius: 14px;
  background: #fff;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  transition: transform .14s ease, box-shadow .14s ease;
}

.caseRow:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(128, 92, 25, 0.18);
}

.caseMain {
  min-width: 0;
}

.caseParties {
  margin: 0;
  font-size: 17px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.caseMeta {
  margin: 4px 0 0;
  color: #7a6c55;
  font-size: 13px;
}

.stage {
  border: 1px solid #d2b477;
  color: #7b5d21;
  background: #f8ead0;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  font-weight: 700;
}

.deadlineList {
  display: flex;
  flex-direction: column;
  gap: 9px;
  max-height: 34vh;
  overflow: auto;
  padding-right: 4px;
}

.deadlineItem {
  border: 1px solid #ddb1b1;
  border-radius: 12px;
  background: #fff1f1;
  padding: 10px 11px;
}

.deadlineName {
  margin: 0;
  font-weight: 700;
}

.deadlineText {
  margin: 4px 0 0;
  font-size: 12px;
  color: #7f2c2c;
}

.empty {
  border: 1px dashed #d9c18e;
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: #78674b;
}

.loading {
  min-height: calc(100vh - 200px);
  display: grid;
  place-items: center;
  color: rgba(248, 245, 239, 0.76);
  font-weight: 600;
}

@media (max-width: 1080px) {
  .heroGrid {
    grid-template-columns: 1fr;
  }

  .sections {
    grid-template-columns: 1fr;
  }

  .caseList,
  .deadlineList {
    max-height: none;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 16px;
  }

  .chrome {
    font-size: 10px;
  }

  .stats {
    grid-template-columns: 1fr 1fr;
  }

  .quickActions {
    width: 100%;
    justify-content: flex-end;
  }

  .panelTitle {
    font-size: 34px;
  }
}

```

### File: `src\app\(dashboard)\dashboard\page.tsx`

**Description:** Source code for `src\app\(dashboard)\dashboard\page.tsx`.

```typescript
﻿"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Case } from "@/types/case.types";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import { PlusCircle, AlertTriangle, ArrowRight, Scale } from "lucide-react";
import { daysUntil, formatDisplayDate } from "@/lib/utils/dateUtils";
import { formatCurrency } from "@/lib/utils/formatters";
import { CASE_STAGES } from "@/constants/caseStages";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./dashboard.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const advocateId = localStorage.getItem("cf_user_id");
    if (!advocateId) {
      router.push("/login");
      return;
    }

    const cacheKey = `cases:summary:${advocateId}`;
    const cachedCases = getClientCache<Case[]>(cacheKey);
    if (cachedCases) {
      setCases(cachedCases);
      setLoading(false);
    }

    fetch(`/api/cases?advocate_id=${advocateId}&view=summary`)
      .then((r) => r.json())
      .then((data) => {
        const nextCases = data.cases || [];
        setCases(nextCases);
        setClientCache(cacheKey, nextCases, 45_000);
        nextCases.slice(0, 6).forEach((c: Case) => {
          router.prefetch(`/cases/${c.id}`);
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div className={`${uiFont.className} ${styles.loading}`}>Loading your litigation workspace...</div>;
  }

  const totalCases = cases.length;
  const activeCases = cases.filter(
    (c) => !["closed", "complaint_filed"].includes(c.stage)
  ).length;
  const urgentCases = cases.filter((c) => {
    const days = daysUntil(c.complaint_deadline);
    return days !== null && days <= 3 && days >= 0;
  });
  const totalAmount = cases.reduce((sum, c) => {
    return sum + (c.case_financials?.cheque_amount || 0);
  }, 0);

  const sortedCases = [...cases].sort((a, b) => {
    const da = daysUntil(a.complaint_deadline) ?? 999;
    const db = daysUntil(b.complaint_deadline) ?? 999;
    return da - db;
  });

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className="inline-flex items-center gap-2">
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <h1 className={`${displayFont.className} ${styles.heroTitle}`}>
              Creating
              <span className={styles.heroMuted}>Litigation</span>
              <span className="block">Experiences</span>
            </h1>
            <p className={styles.heroSub}>
              A focused legal workspace for advocates to structure facts, guide
              timelines, and draft action-ready notices with precision.
            </p>
          </div>

          <div className={styles.quickPanel}>
            <div className={styles.quickHead}>
              <p className={styles.kicker}>Command Panel</p>
              <div className={styles.quickActions}>
                <button
                  onClick={() => router.push("/cases/new")}
                  className={styles.newCaseBtn}
                >
                  <PlusCircle className="w-4 h-4" />
                  New Case
                </button>
              </div>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Total Cases</p>
                <p className={styles.statValue}>{totalCases}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Active Cases</p>
                <p className={styles.statValue}>{activeCases}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Urgent</p>
                <p className={styles.statValue}>{urgentCases.length}</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statLabel}>Portfolio Value</p>
                <p className={styles.statValue}>{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.sections}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>
              Active Matters
            </h2>
            <p className={styles.panelMeta}>Sorted by urgency</p>
          </div>

          {sortedCases.length === 0 ? (
            <div className={styles.empty}>
              No cases yet. Start by creating your first case file.
            </div>
          ) : (
            <div className={styles.caseList}>
              {sortedCases.map((c) => {
                const client = c.case_parties?.find((p) => p.role === "client");
                const oppParty = c.case_parties?.find((p) => p.role === "opposite_party");
                const stageLabel = CASE_STAGES[c.stage]?.label || c.stage.replaceAll("_", " ");

                return (
                  <article
                    key={c.id}
                    className={styles.caseRow}
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <div className={styles.caseMain}>
                      <p className={styles.caseParties}>
                        <strong>{client?.name || "Unknown Client"}</strong> vs {oppParty?.name || "Unknown Party"}
                      </p>
                      <p className={styles.caseMeta}>
                        Complaint deadline: {formatDisplayDate(c.complaint_deadline)} | Amount: {formatCurrency(c.case_financials?.cheque_amount || 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={styles.stage}>{stageLabel}</span>
                      <ArrowRight className="w-4 h-4 text-[#7a6032]" />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={`${displayFont.className} ${styles.panelTitle}`}>
              Immediate Attention
            </h2>
            <p className={styles.panelMeta}>Critical deadlines</p>
          </div>

          {urgentCases.length === 0 ? (
            <div className={styles.empty}>No immediate deadline pressure. Keep progressing active cases.</div>
          ) : (
            <div className={styles.deadlineList}>
              {urgentCases.map((c) => {
                const client = c.case_parties?.find((p) => p.role === "client");
                const days = daysUntil(c.complaint_deadline);
                return (
                  <div key={c.id} className={styles.deadlineItem}>
                    <p className={styles.deadlineName}>{client?.name || "Unknown Client"}</p>
                    <p className={styles.deadlineText}>
                      <AlertTriangle className="w-3 h-3 inline-block mr-1" />
                      {days === 0
                        ? "Deadline is today"
                        : `${days} day${days !== 1 ? "s" : ""} remaining`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

```

### File: `src\app\(dashboard)\layout.tsx`

**Description:** Source code for `src\app\(dashboard)\layout.tsx`.

```typescript
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userId = cookieStore.get("cf_user_id")?.value;

  if (!userId) redirect("/login");

  let profile = null;
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("users")
      .select("id, name, enrollment_number")
      .eq("id", userId)
      .single();
    profile = data;
  } catch {}

  return (
    <AppShell profile={profile}>{children}</AppShell>
  );
}

```

### File: `src\app\(dashboard)\profile\page.module.css`

**Description:** Source code for `src\app\(dashboard)\profile\page.module.css`.

```css
.page {
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 16px);
  color: #f8f5ef;
}

.chrome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: rgba(248, 245, 239, 0.66);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.chromeLeft {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero {
  border: 1px solid #b4914f;
  border-radius: 24px;
  background:
    radial-gradient(900px 420px at 88% 0%, rgba(176, 138, 60, 0.28), transparent 60%),
    linear-gradient(130deg, #060606, #151311 65%, #241a10);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
}

.kicker {
  margin: 0;
  color: rgba(248, 245, 239, 0.64);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.title {
  margin: 4px 0 0;
  font-size: clamp(42px, 6vw, 92px);
  line-height: 0.9;
}

.muted {
  display: block;
  color: rgba(248, 245, 239, 0.48);
}

.subtitle {
  margin: 10px 0 0;
  max-width: 700px;
  color: rgba(248, 245, 239, 0.72);
  font-size: clamp(16px, 1.6vw, 24px);
  line-height: 1.3;
}

.heroBadge {
  border: 1px solid rgba(248, 245, 239, 0.24);
  border-radius: 999px;
  padding: 8px 12px;
  align-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #f8f5ef;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel {
  margin-top: 12px;
  border: 1px solid rgba(186, 145, 69, 0.6);
  border-radius: 18px;
  background: rgba(7, 7, 7, 0.8);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
  padding: 14px;
}

.form {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  color: rgba(248, 245, 239, 0.84);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.input,
.textarea {
  width: 100%;
  border: 1px solid rgba(186, 145, 69, 0.46);
  border-radius: 12px;
  background: rgba(4, 4, 4, 0.75);
  color: #f8f5ef;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
}

.input::placeholder,
.textarea::placeholder {
  color: rgba(248, 245, 239, 0.42);
}

.input:focus,
.textarea:focus {
  border-color: #d2b06a;
  box-shadow: 0 0 0 2px rgba(210, 176, 106, 0.2);
}

.textarea {
  resize: vertical;
  min-height: 96px;
}

.note {
  border: 1px solid rgba(186, 145, 69, 0.45);
  border-radius: 10px;
  background: rgba(186, 145, 69, 0.12);
  padding: 10px;
}

.note p {
  margin: 0;
  color: rgba(248, 245, 239, 0.84);
  font-size: 13px;
  line-height: 1.4;
}

.saveBtn {
  border: 1px solid #dec48c;
  background: linear-gradient(130deg, #f7ecd6, #d4b06b);
  color: #111;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.saveBtn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.icon14 {
  width: 14px;
  height: 14px;
}

.icon16 {
  width: 16px;
  height: 16px;
}

.loading {
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
  color: rgba(248, 245, 239, 0.78);
  font-weight: 600;
  gap: 10px;
}

.spin {
  width: 22px;
  height: 22px;
  animation: spin 0.8s linear infinite;
}

.spinSmall {
  width: 14px;
  height: 14px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1020px) {
  .hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .chrome {
    font-size: 10px;
  }

  .hero,
  .panel {
    border-radius: 16px;
    padding: 12px;
  }
}

```

### File: `src\app\(dashboard)\profile\page.tsx`

**Description:** Source code for `src\app\(dashboard)\profile\page.tsx`.

```typescript
"use client";

import { useEffect, useState } from "react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, Save, Scale, User } from "lucide-react";
import { User as UserType } from "@/types/case.types";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Partial<UserType>>({
    name: "",
    enrollment_number: "",
    office_address: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = localStorage.getItem("cf_user_id");
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("users").select("*").eq("id", userId).single();
      if (data) setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const userId = localStorage.getItem("cf_user_id");
    if (!userId) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        name: profile.name,
        enrollment_number: profile.enrollment_number,
        office_address: profile.office_address,
        email: profile.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved successfully");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className={`${uiFont.className} ${styles.loading}`}>
        <Loader2 className={styles.spin} />
        Loading profile...
      </div>
    );
  }

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className={styles.chromeLeft}>
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Advocate Identity</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Advocate
            <span className={styles.muted}>Profile</span>
          </h1>
          <p className={styles.subtitle}>
            This information appears on generated legal notices and court-facing
            documents.
          </p>
        </div>
        <div className={styles.heroBadge}>
          <User className={styles.icon16} />
          Practice Credentials
        </div>
      </section>

      <section className={styles.panel}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name *</label>
            <input
              type="text"
              className={styles.input}
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="e.g. Rajesh Kumar"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bar Enrollment Number *</label>
            <input
              type="text"
              className={styles.input}
              value={profile.enrollment_number || ""}
              onChange={(e) =>
                setProfile({ ...profile, enrollment_number: e.target.value })
              }
              placeholder="e.g. TN/2018/12345"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Office Address *</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={profile.office_address || ""}
              onChange={(e) =>
                setProfile({ ...profile, office_address: e.target.value })
              }
              placeholder="Chamber address for correspondence"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={styles.input}
              value={profile.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="advocate@example.com"
            />
          </div>

          <div className={styles.note}>
            <p>
              <strong>Important:</strong> Name, enrollment number, and office
              address are printed on generated legal notices. Keep them accurate.
            </p>
          </div>

          <button type="submit" disabled={saving} className={styles.saveBtn}>
            {saving ? <Loader2 className={styles.spinSmall} /> : <Save className={styles.icon14} />}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>
    </div>
  );
}

```

### File: `src\app\(dashboard)\shell.module.css`

**Description:** Source code for `src\app\(dashboard)\shell.module.css`.

```css
.root {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(1200px 520px at 78% -12%, rgba(176, 138, 60, 0.22), transparent 60%),
    radial-gradient(800px 420px at -8% 22%, rgba(143, 29, 29, 0.18), transparent 62%),
    #060606;
}

.content {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.content::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 28px 28px;
}

.main {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

```

### File: `src\app\api\auth\logout\route.ts`

**Description:** Source code for `src\app\api\auth\logout\route.ts`.

```typescript
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "cf_user_id",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

```

### File: `src\app\api\auth\send-otp\route.ts`

**Description:** Source code for `src\app\api\auth\send-otp\route.ts`.

```typescript
﻿import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth/phone";
import { otpStore } from "@/lib/auth/otpStore";

const OTP_TTL_MS = 5 * 60 * 1000;

function hasRealCredential(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !normalized.startsWith("your-") &&
    !normalized.includes("replace_with") &&
    !normalized.includes("placeholder") &&
    !normalized.includes("example")
  );
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpWithTwilio(phone: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return false;
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        Channel: "sms",
      }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(String(data?.message || "Failed to send OTP"));
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    let phone = "";

    try {
      const body = await req.json();
      phone = String(body?.phone || "");
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    const provider = (process.env.OTP_PROVIDER || "twilio").toLowerCase();
    const allowDevOtpFallback = process.env.ALLOW_DEV_OTP_FALLBACK === "true";

    if (provider === "twilio") {
      const twilioConfigured = Boolean(
        hasRealCredential(process.env.TWILIO_ACCOUNT_SID) &&
          hasRealCredential(process.env.TWILIO_AUTH_TOKEN) &&
          hasRealCredential(process.env.TWILIO_VERIFY_SERVICE_SID)
      );

      if (twilioConfigured) {
        try {
          await sendOtpWithTwilio(normalizedPhone);
          return NextResponse.json({ success: true });
        } catch (error) {
          if (process.env.NODE_ENV === "production" || !allowDevOtpFallback) {
            throw error;
          }
          console.warn("Twilio send failed in non-production; using local OTP fallback.");
        }
      }

      if (process.env.NODE_ENV === "production" || !allowDevOtpFallback) {
        return NextResponse.json(
          { error: "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID." },
          { status: 503 }
        );
      }
    }

    const otp = generateOtp();
    otpStore.set(normalizedPhone, { otp, expires: Date.now() + OTP_TTL_MS });

    return NextResponse.json({
      success: true,
      devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}


```

### File: `src\app\api\auth\verify-otp\route.ts`

**Description:** Source code for `src\app\api\auth\verify-otp\route.ts`.

```typescript
﻿import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizePhone, phoneVariants } from "@/lib/auth/phone";
import { otpStore } from "@/lib/auth/otpStore";

function hasRealCredential(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !normalized.startsWith("your-") &&
    !normalized.includes("replace_with") &&
    !normalized.includes("placeholder") &&
    !normalized.includes("example")
  );
}

async function verifyOtpWithTwilio(phone: string, otp: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return false;
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        Code: otp,
      }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(String(data?.message || "Failed to verify OTP"));
  }

  const data = (await res.json().catch(() => null)) as { status?: string } | null;
  return data?.status === "approved";
}

function verifyOtpFromLocalStore(phone: string, otp: string) {
  const record = otpStore.get(phone);
  if (!record) return false;

  if (record.expires < Date.now()) {
    otpStore.delete(phone);
    return false;
  }

  if (record.otp !== otp) {
    return false;
  }

  otpStore.delete(phone);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    let phone = "";
    let otp = "";

    try {
      const body = await req.json();
      phone = String(body?.phone || "");
      otp = String(body?.otp || "");
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    if (!otp || otp.length < 4) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    const provider = (process.env.OTP_PROVIDER || "twilio").toLowerCase();
    const allowDevOtpFallback = process.env.ALLOW_DEV_OTP_FALLBACK === "true";
    const twilioConfigured = Boolean(
      hasRealCredential(process.env.TWILIO_ACCOUNT_SID) &&
        hasRealCredential(process.env.TWILIO_AUTH_TOKEN) &&
        hasRealCredential(process.env.TWILIO_VERIFY_SERVICE_SID)
    );

    let otpVerified = false;
    if (provider === "twilio" && twilioConfigured) {
      try {
        otpVerified = await verifyOtpWithTwilio(normalizedPhone, otp);
      } catch (error) {
        if (process.env.NODE_ENV === "production" || !allowDevOtpFallback) {
          throw error;
        }
        console.warn("Twilio verify failed in non-production; using local OTP fallback.");
        otpVerified = verifyOtpFromLocalStore(normalizedPhone, otp);
      }
    } else {
      otpVerified = verifyOtpFromLocalStore(normalizedPhone, otp);
    }

    if (!otpVerified) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Server auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        },
        { status: 503 }
      );
    }

    const supabase = createServiceRoleClient();

    const candidates = phoneVariants(normalizedPhone);
    const { data: existingUsers, error: existingUserError } = await supabase
      .from("users")
      .select("*")
      .in("phone", candidates)
      .limit(1);

    if (existingUserError?.code === "PGRST205") {
      return NextResponse.json(
        {
          error:
            "Database is not initialized. Missing table public.users. Run Supabase migrations (starting with supabase/migrations/001_users.sql).",
        },
        { status: 503 }
      );
    }

    if (existingUserError && existingUserError.code !== "PGRST116") {
      throw existingUserError;
    }

    const existingUser = existingUsers?.[0] || null;
    let userId: string;

    if (!existingUser) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        phone_confirm: true,
      });

      if (authError || !authData?.user) {
        const { data: userListData, error: userListError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (userListError) throw authError ?? userListError;

        const existingAuthUser = userListData.users.find(
          (user: { phone?: string | null; id: string }) =>
            normalizePhone(user.phone || "") === normalizedPhone
        );
        if (!existingAuthUser) throw authError ?? new Error("Failed to create or find auth user");

        userId = existingAuthUser.id;
      } else {
        userId = authData.user.id;
      }

      const { error: insertUserError } = await supabase.from("users").insert({
        id: userId,
        phone: normalizedPhone,
        name: null,
        enrollment_number: null,
        office_address: null,
        email: null,
      });

      if (insertUserError && insertUserError.code !== "23505") {
        throw insertUserError;
      }
    } else {
      userId = existingUser.id;
    }

    const response = NextResponse.json({
      success: true,
      userId,
      phone: normalizedPhone,
      isNewUser: !existingUser,
    });

    response.cookies.set({
      name: "cf_user_id",
      value: userId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}


```

### File: `src\app\api\cases\route.ts`

**Description:** Source code for `src\app\api\cases\route.ts`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CreateCasePayload } from "@/types/case.types";
import { computeDeadlines } from "@/constants/legalMapping";
import { isCaseTypeId } from "@/types/caseTypes";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const body: CreateCasePayload & { advocate_id: string } = await req.json();

    const {
      advocate_id,
      case_type,
      client_name,
      client_address,
      opposite_party_name,
      opposite_party_address,
      jurisdiction_city,
      // cheque-bounce fields
      cheque_number,
      cheque_date,
      cheque_amount,
      bank_name,
      dishonour_reason,
      return_memo_date,
      // generic structured details
      case_metadata,
    } = body;

    if (!advocate_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedCaseType = isCaseTypeId(case_type) ? case_type : "cheque_bounce";

    const supabase = createServiceRoleClient();

    // 1. Create the case (with metadata for non-cheque types)
    const { data: newCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        advocate_id,
        case_type: resolvedCaseType,
        stage: "drafting",
        jurisdiction_city,
        case_metadata: resolvedCaseType === "cheque_bounce" ? null : case_metadata || {},
      })
      .select()
      .single();

    if (caseError) throw caseError;
    const caseId = newCase.id;

    // 2. Insert client party
    const { error: clientError } = await supabase.from("case_parties").insert({
      case_id: caseId,
      role: "client",
      name: client_name,
      address: client_address,
    });
    if (clientError) throw clientError;

    // 3. Insert opposite party
    const { error: oppError } = await supabase.from("case_parties").insert({
      case_id: caseId,
      role: "opposite_party",
      name: opposite_party_name,
      address: opposite_party_address,
    });
    if (oppError) throw oppError;

    let noticeSendBy: Date | null = null;

    // 4. For cheque_bounce, persist financials and compute notice deadline
    if (resolvedCaseType === "cheque_bounce") {
      if (!cheque_number || !cheque_date || !cheque_amount || !bank_name || !dishonour_reason || !return_memo_date) {
        return NextResponse.json(
          { error: "Cheque bounce requires all cheque/dishonour fields." },
          { status: 422 }
        );
      }

      const { error: finError } = await supabase.from("case_financials").insert({
        case_id: caseId,
        cheque_number,
        cheque_date,
        cheque_amount,
        bank_name,
        dishonour_reason,
        return_memo_date,
      });
      if (finError) throw finError;

      noticeSendBy = computeDeadlines(return_memo_date).noticeSendBy;
    }

    // 5. Create initial case_facts record (carries either columnar fields or JSONB answers)
    await supabase.from("case_facts").insert({ case_id: caseId, answers: {} });

    return NextResponse.json({
      success: true,
      caseId,
      caseType: resolvedCaseType,
      noticeSendBy: noticeSendBy ? format(noticeSendBy, "yyyy-MM-dd") : null,
    });
  } catch (error) {
    console.error("Create case error:", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const advocateId = searchParams.get("advocate_id");
    const view = searchParams.get("view") || "full";

    if (!advocateId) {
      return NextResponse.json({ error: "advocate_id required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const summarySelect = `
      id,
      advocate_id,
      case_type,
      stage,
      jurisdiction_city,
      notice_sent_date,
      notice_served_date,
      complaint_deadline,
      waiting_period_end,
      case_metadata,
      created_at,
      updated_at,
      case_parties (
        role,
        name,
        address
      ),
      case_financials (
        cheque_amount,
        cheque_date
      )
    `;

    const fullSelect = `
      *,
      case_parties (*),
      case_financials (*),
      case_facts (*)
    `;

    const { data: cases, error } = await supabase
      .from("cases")
      .select(view === "summary" ? summarySelect : fullSelect)
      .eq("advocate_id", advocateId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const response = NextResponse.json({ cases });
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return response;
  } catch (error) {
    console.error("Get cases error:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

```

### File: `src\app\api\cases\[caseId]\route.ts`

**Description:** Source code for `src\app\api\cases\[caseId]\route.ts`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const view = req.nextUrl.searchParams.get("view") || "full";
    const supabase = createServiceRoleClient();

    const selectMap: Record<string, string> = {
      full: `
        *,
        case_parties (*),
        case_financials (*),
        case_facts (*),
        event_timeline (*),
        generated_documents (*)
      `,
      core: `
        id,
        advocate_id,
        case_type,
        stage,
        jurisdiction_city,
        notice_sent_date,
        notice_served_date,
        complaint_deadline,
        waiting_period_end,
        created_at,
        updated_at,
        case_parties (
          role,
          name,
          address
        ),
        case_financials (
          cheque_number,
          cheque_date,
          cheque_amount,
          bank_name,
          dishonour_reason,
          return_memo_date
        )
      `,
      facts: `
        id,
        stage,
        case_type,
        case_metadata,
        case_facts (
          cheque_signed_by_drawer,
          statutory_notice_already_sent,
          part_payment_made,
          part_payment_amount,
          written_admission_available,
          notice_delivery_mode,
          answers
        )
      `,
      story: `
        id,
        case_facts (
          raw_story
        ),
        event_timeline (
          id,
          case_id,
          event_date,
          event_description,
          is_approximate,
          sequence_order
        )
      `,
      timeline: `
        id,
        case_parties (
          role,
          name
        ),
        event_timeline (
          id,
          case_id,
          event_date,
          event_description,
          is_approximate,
          sequence_order
        )
      `,
      notice: `
        id,
        stage,
        case_type,
        case_metadata,
        jurisdiction_city,
        case_parties (
          role,
          name,
          address
        ),
        case_financials (
          cheque_number,
          cheque_amount,
          bank_name,
          dishonour_reason
        ),
        case_facts (
          raw_story,
          notice_delivery_mode,
          answers
        )
      `,
    };

    const selectClause = selectMap[view] || selectMap.full;

    const { data, error } = await supabase
      .from("cases")
      .select(selectClause)
      .eq("id", params.caseId)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const response = NextResponse.json({ case: data });
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("Get case error:", error);
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const body = await req.json();
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("cases")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", params.caseId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ case: data });
  } catch (error) {
    console.error("Update case error:", error);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}

```

### File: `src\app\api\notice\generate\route.ts`

**Description:** Source code for `src\app\api\notice\generate\route.ts`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildNotice } from "@/lib/docgen/noticeBuilder";
import { buildGenericNotice } from "@/lib/docgen/genericNoticeBuilder";
import { exportNoticeToDocx } from "@/lib/docgen/docxExporter";
import { exportNoticeToPdf } from "@/lib/docgen/pdfExporter";
import { computeDeadlinesFromNoticeDate } from "@/constants/legalMapping";
import { generateGenericNarrative } from "@/lib/ai/genericNarrative";
import { format } from "date-fns";

type NoticeFormat = "docx" | "pdf";

export async function POST(req: NextRequest) {
  try {
    const { caseId, advocateId, format: rawFormat } = await req.json();
    const exportFormat: NoticeFormat =
      rawFormat === "pdf" || rawFormat === "docx" ? rawFormat : "docx";

    if (!caseId || !advocateId) {
      return NextResponse.json({ error: "caseId and advocateId required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const [caseResult, advocateResult, timelineResult] = await Promise.all([
      supabase
        .from("cases")
        .select(`*, case_parties(*), case_financials(*), case_facts(*)`)
        .eq("id", caseId)
        .single(),
      supabase.from("users").select("*").eq("id", advocateId).single(),
      supabase
        .from("event_timeline")
        .select("*")
        .eq("case_id", caseId)
        .order("sequence_order"),
    ]);

    if (caseResult.error) throw caseResult.error;
    if (advocateResult.error) throw advocateResult.error;
    if (timelineResult.error) throw timelineResult.error;

    const caseData = caseResult.data;
    const advocate = advocateResult.data;
    const timeline = timelineResult.data || [];

    const client = caseData.case_parties?.find((p: { role: string }) => p.role === "client");
    const oppParty = caseData.case_parties?.find((p: { role: string }) => p.role === "opposite_party");
    const facts = caseData.case_facts;

    if (!client || !oppParty) {
      return NextResponse.json(
        { error: "Incomplete case data. Ensure client and opposite party are saved." },
        { status: 422 }
      );
    }

    const caseType: string = caseData.case_type || "cheque_bounce";
    let fullText: string;
    let metadata: {
      act: string;
      sections: string[];
      noticeSentDate: string;
      waitingPeriodEnd?: string;
      complaintDeadline?: string;
    };

    if (caseType === "cheque_bounce") {
      const financials = caseData.case_financials;
      if (!financials) {
        return NextResponse.json(
          { error: "Cheque financials missing for cheque bounce case." },
          { status: 422 }
        );
      }
      const notice = await buildNotice({
        advocate,
        caseData,
        client,
        oppParty,
        financials,
        facts: facts || {},
        timeline,
      });
      fullText = notice.fullText;
      metadata = notice.metadata;
    } else {
      const aiNarrative = await generateGenericNarrative({
        caseType,
        clientName: client.name,
        oppPartyName: oppParty.name,
        timelineEvents: timeline,
        metadata: caseData.case_metadata || {},
        answers: facts?.answers || {},
      });

      const notice = await buildGenericNotice(caseType, {
        advocate,
        caseData,
        client,
        oppParty,
        answers: facts?.answers || {},
        timeline,
        aiNarrative,
      });
      fullText = notice.fullText;
      metadata = notice.metadata;
    }

    const fileExt = exportFormat === "pdf" ? "pdf" : "docx";
    const fileName = `notice_${caseId.slice(0, 8)}_${Date.now()}.${fileExt}`;

    let fileBuffer: Buffer;
    let contentType: string;
    if (exportFormat === "pdf") {
      fileBuffer = await exportNoticeToPdf(fullText);
      contentType = "application/pdf";
    } else {
      fileBuffer = await exportNoticeToDocx(fullText, metadata);
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    const fileBytes = new Uint8Array(fileBuffer);

    const today = new Date().toISOString();

    const { data: docRecord, error: docRecordError } = await supabase
      .from("generated_documents")
      .insert({
        case_id: caseId,
        document_type: "legal_notice",
        file_name: fileName,
        generated_at: today,
      })
      .select()
      .single();
    if (docRecordError) {
      console.warn("Could not create generated_documents record:", docRecordError.message);
    }

    // Stage + deadline updates only apply to cheque_bounce out of the box.
    // Other types just move to notice_generated; reminders are scheduled below.
    const updateFields: Record<string, unknown> = {
      stage: "notice_generated",
      notice_sent_date: format(new Date(), "yyyy-MM-dd"),
      updated_at: today,
    };

    if (caseType === "cheque_bounce") {
      const { waitingPeriodEnd, complaintDeadline } =
        computeDeadlinesFromNoticeDate(today);
      updateFields.waiting_period_end = format(waitingPeriodEnd, "yyyy-MM-dd");
      updateFields.complaint_deadline = format(complaintDeadline, "yyyy-MM-dd");

      await supabase.from("reminders").insert([
        {
          case_id: caseId,
          advocate_id: advocateId,
          reminder_type: "payment_wait_ending",
          trigger_date: format(waitingPeriodEnd, "yyyy-MM-dd"),
          status: "pending",
        },
        {
          case_id: caseId,
          advocate_id: advocateId,
          reminder_type: "complaint_deadline_warning",
          trigger_date: format(
            new Date(complaintDeadline.getTime() - 3 * 24 * 60 * 60 * 1000),
            "yyyy-MM-dd"
          ),
          status: "pending",
        },
        {
          case_id: caseId,
          advocate_id: advocateId,
          reminder_type: "limitation_final_warning",
          trigger_date: format(
            new Date(complaintDeadline.getTime() - 1 * 24 * 60 * 60 * 1000),
            "yyyy-MM-dd"
          ),
          status: "pending",
        },
      ]);
    }

    const { error: updateCaseError } = await supabase
      .from("cases")
      .update(updateFields)
      .eq("id", caseId);
    if (updateCaseError) throw updateCaseError;

    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Notice-Metadata": JSON.stringify(metadata),
        "X-Document-Id": docRecord?.id || "",
      },
    });
  } catch (error) {
    console.error("Notice generation error:", error);
    const message =
      error instanceof Error ? error.message : "Notice generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

### File: `src\app\api\questions\route.ts`

**Description:** Source code for `src\app\api\questions\route.ts`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CaseFactsAnswers, GenericAnswers } from "@/types/facts.types";

interface QuestionsPayload {
  caseId: string;
  caseType?: string;
  // For cheque_bounce keep the typed payload; for everything else send generic answers.
  answers: CaseFactsAnswers | GenericAnswers;
}

export async function POST(req: NextRequest) {
  try {
    const body: QuestionsPayload = await req.json();
    const { caseId, caseType, answers } = body;

    if (!caseId) {
      return NextResponse.json({ error: "Case ID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const isCheque = !caseType || caseType === "cheque_bounce";

    const update = isCheque
      ? {
          // Columnar update (legacy cheque-bounce path)
          cheque_signed_by_drawer: (answers as CaseFactsAnswers).cheque_signed_by_drawer ?? null,
          statutory_notice_already_sent: (answers as CaseFactsAnswers).statutory_notice_already_sent ?? null,
          part_payment_made: (answers as CaseFactsAnswers).part_payment_made ?? null,
          part_payment_amount: (answers as CaseFactsAnswers).part_payment_amount ?? null,
          written_admission_available: (answers as CaseFactsAnswers).written_admission_available ?? null,
          notice_delivery_mode: (answers as CaseFactsAnswers).notice_delivery_mode ?? null,
          updated_at: new Date().toISOString(),
        }
      : {
          // JSONB update (every other case type)
          answers: answers as GenericAnswers,
          updated_at: new Date().toISOString(),
        };

    const { data, error } = await supabase
      .from("case_facts")
      .update(update)
      .eq("case_id", caseId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, facts: data });
  } catch (error) {
    console.error("Save questions error:", error);
    return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
  }
}

```

### File: `src\app\api\reminders\trigger\route.ts`

**Description:** Source code for `src\app\api\reminders\trigger\route.ts`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/reminders/emailSender";
import { sendWhatsAppReminder } from "@/lib/reminders/whatsappSender";
import { ReminderType } from "@/types/reminder.types";
import { format } from "date-fns";

// This route is called daily by Vercel Cron (see vercel.json)
export async function GET(req: NextRequest) {
  // Secure the cron endpoint
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = format(new Date(), "yyyy-MM-dd");

  try {
    // Fetch all pending reminders due today or earlier
    const { data: reminders, error } = await supabase
      .from("reminders")
      .select(`
        *,
        cases (
          *,
          case_parties (*)
        )
      `)
      .eq("status", "pending")
      .lte("trigger_date", today);

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ message: "No reminders due today", count: 0 });
    }

    const results = { sent: 0, failed: 0 };

    for (const reminder of reminders) {
      try {
        const caseData = reminder.cases;
        if (!caseData) continue;

        // Get advocate info
        const { data: advocate } = await supabase
          .from("users")
          .select("*")
          .eq("id", reminder.advocate_id)
          .single();

        if (!advocate) continue;

        const client = caseData.case_parties?.find(
          (p: { role: string }) => p.role === "client"
        );
        const enrichedCase = {
          ...caseData,
          client_name: client?.name || "Client",
        };

        let emailSent = false;
        let whatsappSent = false;

        // Send email if advocate has email
        if (advocate.email) {
          emailSent = await sendReminderEmail(
            advocate.email,
            reminder.reminder_type as ReminderType,
            enrichedCase
          );
        }

        // Send WhatsApp if advocate has phone
        if (advocate.phone) {
          whatsappSent = await sendWhatsAppReminder(
            advocate.phone,
            reminder.reminder_type as ReminderType,
            caseData.case_number || caseData.id.slice(0, 8),
            enrichedCase.client_name
          );
        }

        // Update reminder status
        await supabase
          .from("reminders")
          .update({
            status: emailSent || whatsappSent ? "sent" : "failed",
            sent_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        // Update case stage if waiting period has ended
        if (
          reminder.reminder_type === "payment_wait_ending" &&
          caseData.stage === "notice_served"
        ) {
          await supabase
            .from("cases")
            .update({ stage: "waiting_period", updated_at: new Date().toISOString() })
            .eq("id", caseData.id);
        }

        // Update case to limitation_warning if complaint deadline is near
        if (
          reminder.reminder_type === "complaint_deadline_warning" &&
          caseData.stage === "complaint_eligible"
        ) {
          await supabase
            .from("cases")
            .update({
              stage: "limitation_warning",
              updated_at: new Date().toISOString(),
            })
            .eq("id", caseData.id);
        }

        results.sent++;
      } catch (err) {
        console.error("Reminder processing error:", err);
        results.failed++;
      }
    }

    return NextResponse.json({
      message: "Reminder run complete",
      date: today,
      ...results,
    });
  } catch (error) {
    console.error("Reminder trigger error:", error);
    return NextResponse.json({ error: "Reminder trigger failed" }, { status: 500 });
  }
}

```

### File: `src\app\api\story\extract\route.ts`

**Description:** Source code for `src\app\api\story\extract\route.ts`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractTimelineFromStory } from "@/lib/ai/extractTimeline";

export async function POST(req: NextRequest) {
  try {
    const { caseId, story } = await req.json();

    if (!caseId || !story || story.trim().length < 20) {
      return NextResponse.json(
        { error: "Case ID and story (minimum 20 chars) are required" },
        { status: 400 }
      );
    }

    // Extract timeline from AI
    const events = await extractTimelineFromStory(story);

    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: "Could not extract timeline from story" },
        { status: 422 }
      );
    }

    const supabase = createServiceRoleClient();

    // Delete existing timeline events for this case
    const { error: deleteError } = await supabase
      .from("event_timeline")
      .delete()
      .eq("case_id", caseId);
    if (deleteError) throw deleteError;

    // Insert new timeline events
    const timelineRecords = events.map((event, index) => ({
      case_id: caseId,
      event_date: event.event_date,
      event_description: event.event_description,
      is_approximate: event.is_approximate,
      sequence_order: index + 1,
    }));

    const { error: insertError } = await supabase
      .from("event_timeline")
      .insert(timelineRecords);

    if (insertError) throw insertError;

    // Save raw story to case_facts
    const { error: updateError } = await supabase
      .from("case_facts")
      .update({ raw_story: story })
      .eq("case_id", caseId);
    if (updateError) {
      console.warn("Could not update raw_story in case_facts:", updateError.message);
    }

    return NextResponse.json({ success: true, events, count: events.length });
  } catch (error) {
    console.error("Story extract error:", error);
    const message =
      error instanceof Error ? error.message : "Timeline extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

```

### File: `src\app\globals.css`

**Description:** Source code for `src\app\globals.css`.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --lux-black: #0a0a0a;
    --lux-white: #f8f5ef;
    --lux-gold: #b08a3c;
    --lux-gold-soft: #e8dcc2;
    --lux-red: #8f1d1d;
    --lux-red-soft: #f5dddd;
  }

  * {
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    background: radial-gradient(circle at top right, #fffaf0 0%, var(--lux-white) 35%, #f3eee2 100%);
    color: #171717;
    @apply antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold tracking-tight;
  }
}

@layer components {
  .btn-primary {
    @apply bg-black hover:bg-zinc-900 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
    border: 1px solid var(--lux-gold);
    box-shadow: 0 8px 22px rgba(176, 138, 60, 0.2);
  }

  .btn-secondary {
    @apply bg-white border text-gray-800 font-medium px-4 py-2 rounded-lg transition-all duration-200;
    border-color: #d9c69c;
  }

  .btn-secondary:hover {
    background: #fff8ea;
  }

  .btn-danger {
    @apply text-white font-medium px-4 py-2 rounded-lg transition-all duration-200;
    background: var(--lux-red);
    border: 1px solid #6f1616;
  }

  .btn-danger:hover {
    background: #761717;
  }

  .card {
    @apply bg-white rounded-xl border shadow-sm p-6;
    border-color: #e6dcc8;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
  }

  .input-field {
    @apply w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all;
    border-color: #d4c7aa;
    background: #fffdf9;
  }

  .input-field:focus {
    --tw-ring-color: rgba(176, 138, 60, 0.35);
  }

  .label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }

  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }

  .stage-pill {
    @apply px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide;
  }
}

@layer utilities {
  /* Map non-brand semantic colors to luxury palette. */
  [class*="text-blue-"],
  [class*="text-green-"],
  [class*="text-yellow-"],
  [class*="text-amber-"],
  [class*="text-orange-"],
  [class*="text-purple-"],
  [class*="text-pink-"],
  [class*="text-indigo-"],
  [class*="text-teal-"],
  [class*="text-cyan-"] {
    color: #8a6a2b !important;
  }

  [class*="text-red-"] {
    color: #8f1d1d !important;
  }

  [class*="bg-blue-"],
  [class*="bg-green-"],
  [class*="bg-yellow-"],
  [class*="bg-amber-"],
  [class*="bg-orange-"],
  [class*="bg-purple-"],
  [class*="bg-pink-"],
  [class*="bg-indigo-"],
  [class*="bg-teal-"],
  [class*="bg-cyan-"] {
    background-color: #fff7e8 !important;
  }

  [class*="bg-red-"] {
    background-color: #fbe7e7 !important;
  }

  [class*="border-blue-"],
  [class*="border-green-"],
  [class*="border-yellow-"],
  [class*="border-amber-"],
  [class*="border-orange-"],
  [class*="border-purple-"],
  [class*="border-pink-"],
  [class*="border-indigo-"],
  [class*="border-teal-"],
  [class*="border-cyan-"] {
    border-color: #e0cd9d !important;
  }

  [class*="border-red-"] {
    border-color: #d8a6a6 !important;
  }

  [class*="ring-blue-"],
  [class*="ring-green-"],
  [class*="ring-yellow-"],
  [class*="ring-amber-"],
  [class*="ring-orange-"],
  [class*="ring-purple-"],
  [class*="ring-pink-"],
  [class*="ring-indigo-"],
  [class*="ring-teal-"],
  [class*="ring-cyan-"] {
    --tw-ring-color: rgba(176, 138, 60, 0.35) !important;
  }

  [class*="ring-red-"] {
    --tw-ring-color: rgba(143, 29, 29, 0.3) !important;
  }

  [class*="from-blue-"],
  [class*="from-green-"],
  [class*="from-red-"],
  [class*="from-yellow-"],
  [class*="from-amber-"],
  [class*="from-orange-"],
  [class*="from-purple-"],
  [class*="from-pink-"],
  [class*="from-indigo-"],
  [class*="from-teal-"],
  [class*="from-cyan-"] {
    --tw-gradient-from: rgb(10 10 10) var(--tw-gradient-from-position) !important;
    --tw-gradient-to: rgb(10 10 10 / 0) var(--tw-gradient-to-position) !important;
    --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
  }

  [class*="via-blue-"],
  [class*="via-green-"],
  [class*="via-red-"],
  [class*="via-yellow-"],
  [class*="via-amber-"],
  [class*="via-orange-"],
  [class*="via-purple-"],
  [class*="via-pink-"],
  [class*="via-indigo-"],
  [class*="via-teal-"],
  [class*="via-cyan-"] {
    --tw-gradient-stops: var(--tw-gradient-from), rgb(94 74 37) var(--tw-gradient-via-position), var(--tw-gradient-to) !important;
  }

  [class*="to-blue-"],
  [class*="to-green-"],
  [class*="to-red-"],
  [class*="to-yellow-"],
  [class*="to-amber-"],
  [class*="to-orange-"],
  [class*="to-purple-"],
  [class*="to-pink-"],
  [class*="to-indigo-"],
  [class*="to-teal-"],
  [class*="to-cyan-"] {
    --tw-gradient-to: rgb(139 114 60) var(--tw-gradient-to-position) !important;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}

```

### File: `src\app\layout.tsx`

**Description:** Source code for `src\app\layout.tsx`.

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CaseFlow — Litigation Workflow for Advocates",
  description: "Convert client stories into structured legal cases. Built for advocates.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#0a0a0a",
              color: "#f8f5ef",
              border: "1px solid #b08a3c",
              borderRadius: "10px",
              fontSize: "14px",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}

```

### File: `src\app\page.tsx`

**Description:** Source code for `src\app\page.tsx`.

```typescript
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const cookieStore = cookies();
  const userId = cookieStore.get("cf_user_id")?.value;

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

```


## Comprehensive Project Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/caseflow.git
cd caseflow
npm install
```

### 2. Environment Variables
You must set up `.env.local` accurately.
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Auth (Twilio Verify)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...

# AI (OpenAI-compatible)
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=...
AI_MODEL=gpt-4o

# Email (Resend)
RESEND_API_KEY=...
```
