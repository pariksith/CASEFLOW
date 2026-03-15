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
  cheque_signed_by_drawer: boolean | null;
  statutory_notice_already_sent: boolean | null;
  part_payment_made: boolean | null;
  part_payment_amount: number | null;
  written_admission_available: boolean | null;
  notice_delivery_mode: "post" | "hand" | "email" | "unknown" | null;
  raw_story: string | null;
}

export interface CreateCasePayload {
  client_name: string;
  client_address: string;
  opposite_party_name: string;
  opposite_party_address: string;
  cheque_number: string;
  cheque_date: string;
  cheque_amount: number;
  bank_name: string;
  dishonour_reason: string;
  return_memo_date: string;
  jurisdiction_city: string;
}
