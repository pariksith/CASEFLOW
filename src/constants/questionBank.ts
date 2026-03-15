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
