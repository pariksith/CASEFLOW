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
