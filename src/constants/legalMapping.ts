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
