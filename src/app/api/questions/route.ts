import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CaseFactsAnswers } from "@/types/facts.types";

export async function POST(req: NextRequest) {
  try {
    const body: { caseId: string; answers: CaseFactsAnswers } = await req.json();
    const { caseId, answers } = body;

    if (!caseId) {
      return NextResponse.json({ error: "Case ID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("case_facts")
      .update({
        cheque_signed_by_drawer: answers.cheque_signed_by_drawer,
        statutory_notice_already_sent: answers.statutory_notice_already_sent,
        part_payment_made: answers.part_payment_made,
        part_payment_amount: answers.part_payment_amount,
        written_admission_available: answers.written_admission_available,
        notice_delivery_mode: answers.notice_delivery_mode,
        updated_at: new Date().toISOString(),
      })
      .eq("case_id", caseId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, facts: data });
  } catch (error) {
    console.error("Save questions error:", error);
    return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
  }
}
