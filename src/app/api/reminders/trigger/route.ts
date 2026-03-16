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
