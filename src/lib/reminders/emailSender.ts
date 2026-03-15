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
