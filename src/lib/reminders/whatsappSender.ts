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
