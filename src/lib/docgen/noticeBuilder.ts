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
