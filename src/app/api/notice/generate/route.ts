import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildNotice } from "@/lib/docgen/noticeBuilder";
import { exportNoticeToDocx } from "@/lib/docgen/docxExporter";
import { exportNoticeToPdf } from "@/lib/docgen/pdfExporter";
import { computeDeadlinesFromNoticeDate } from "@/constants/legalMapping";
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

    // Fetch all required data
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

    const caseData = caseResult.data;
    const advocate = advocateResult.data;
    if (timelineResult.error) throw timelineResult.error;
    const timeline = timelineResult.data || [];

    const client = caseData.case_parties?.find((p: { role: string }) => p.role === "client");
    const oppParty = caseData.case_parties?.find((p: { role: string }) => p.role === "opposite_party");
    const financials = caseData.case_financials;
    const facts = caseData.case_facts;

    if (!client || !oppParty || !financials) {
      return NextResponse.json(
        { error: "Incomplete case data. Ensure client, opposite party, and financials are saved." },
        { status: 422 }
      );
    }

    // Build notice
    const notice = await buildNotice({
      advocate,
      caseData,
      client,
      oppParty,
      financials,
      facts: facts || {},
      timeline,
    });

    const fileExt = exportFormat === "pdf" ? "pdf" : "docx";
    const fileName = `notice_${caseId.slice(0, 8)}_${Date.now()}.${fileExt}`;

    let fileBuffer: Buffer;
    let contentType: string;
    if (exportFormat === "pdf") {
      fileBuffer = await exportNoticeToPdf(notice.fullText);
      contentType = "application/pdf";
    } else {
      fileBuffer = await exportNoticeToDocx(notice.fullText, notice.metadata);
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    const fileBytes = new Uint8Array(fileBuffer);

    // Save generated document record
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

    // Update case stage and deadlines
    const { waitingPeriodEnd, complaintDeadline } =
      computeDeadlinesFromNoticeDate(today);

    const { error: updateCaseError } = await supabase
      .from("cases")
      .update({
        stage: "notice_generated",
        notice_sent_date: format(new Date(), "yyyy-MM-dd"),
        waiting_period_end: format(waitingPeriodEnd, "yyyy-MM-dd"),
        complaint_deadline: format(complaintDeadline, "yyyy-MM-dd"),
        updated_at: today,
      })
      .eq("id", caseId);
    if (updateCaseError) throw updateCaseError;

    // Schedule reminders
    const { error: reminderError } = await supabase.from("reminders").insert([
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
    if (reminderError) {
      console.warn("Could not schedule reminders:", reminderError.message);
    }

    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Notice-Metadata": JSON.stringify(notice.metadata),
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
