import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const view = req.nextUrl.searchParams.get("view") || "full";
    const supabase = createServiceRoleClient();

    const selectMap: Record<string, string> = {
      full: `
        *,
        case_parties (*),
        case_financials (*),
        case_facts (*),
        event_timeline (*),
        generated_documents (*)
      `,
      core: `
        id,
        advocate_id,
        case_type,
        stage,
        jurisdiction_city,
        notice_sent_date,
        notice_served_date,
        complaint_deadline,
        waiting_period_end,
        created_at,
        updated_at,
        case_parties (
          role,
          name,
          address
        ),
        case_financials (
          cheque_number,
          cheque_date,
          cheque_amount,
          bank_name,
          dishonour_reason,
          return_memo_date
        )
      `,
      facts: `
        id,
        stage,
        case_facts (
          cheque_signed_by_drawer,
          statutory_notice_already_sent,
          part_payment_made,
          part_payment_amount,
          written_admission_available,
          notice_delivery_mode
        )
      `,
      story: `
        id,
        case_facts (
          raw_story
        ),
        event_timeline (
          id,
          case_id,
          event_date,
          event_description,
          is_approximate,
          sequence_order
        )
      `,
      timeline: `
        id,
        case_parties (
          role,
          name
        ),
        event_timeline (
          id,
          case_id,
          event_date,
          event_description,
          is_approximate,
          sequence_order
        )
      `,
      notice: `
        id,
        stage,
        case_parties (
          role,
          name
        ),
        case_financials (
          cheque_number,
          cheque_amount,
          bank_name,
          dishonour_reason
        ),
        case_facts (
          raw_story,
          notice_delivery_mode
        )
      `,
    };

    const selectClause = selectMap[view] || selectMap.full;

    const { data, error } = await supabase
      .from("cases")
      .select(selectClause)
      .eq("id", params.caseId)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const response = NextResponse.json({ case: data });
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("Get case error:", error);
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const body = await req.json();
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("cases")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", params.caseId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ case: data });
  } catch (error) {
    console.error("Update case error:", error);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}
