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
