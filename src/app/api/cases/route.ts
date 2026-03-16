import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CreateCasePayload } from "@/types/case.types";
import { computeDeadlines } from "@/constants/legalMapping";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const body: CreateCasePayload & { advocate_id: string } = await req.json();

    const {
      advocate_id,
      client_name,
      client_address,
      opposite_party_name,
      opposite_party_address,
      cheque_number,
      cheque_date,
      cheque_amount,
      bank_name,
      dishonour_reason,
      return_memo_date,
      jurisdiction_city,
    } = body;

    if (!advocate_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Compute notice deadline from return memo date
    const { noticeSendBy } = computeDeadlines(return_memo_date);

    // 1. Create the case
    const { data: newCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        advocate_id,
        case_type: "cheque_bounce",
        stage: "drafting",
        jurisdiction_city,
      })
      .select()
      .single();

    if (caseError) throw caseError;

    const caseId = newCase.id;

    // 2. Insert client party
    const { error: clientError } = await supabase.from("case_parties").insert({
      case_id: caseId,
      role: "client",
      name: client_name,
      address: client_address,
    });
    if (clientError) throw clientError;

    // 3. Insert opposite party
    const { error: oppError } = await supabase.from("case_parties").insert({
      case_id: caseId,
      role: "opposite_party",
      name: opposite_party_name,
      address: opposite_party_address,
    });
    if (oppError) throw oppError;

    // 4. Insert financials
    const { error: finError } = await supabase.from("case_financials").insert({
      case_id: caseId,
      cheque_number,
      cheque_date,
      cheque_amount,
      bank_name,
      dishonour_reason,
      return_memo_date,
    });
    if (finError) throw finError;

    // 5. Create initial case_facts record
    await supabase.from("case_facts").insert({ case_id: caseId });

    return NextResponse.json({
      success: true,
      caseId,
      noticeSendBy: format(noticeSendBy, "yyyy-MM-dd"),
    });
  } catch (error) {
    console.error("Create case error:", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const advocateId = searchParams.get("advocate_id");
    const view = searchParams.get("view") || "full";

    if (!advocateId) {
      return NextResponse.json({ error: "advocate_id required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const summarySelect = `
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
        cheque_amount,
        cheque_date
      )
    `;

    const fullSelect = `
      *,
      case_parties (*),
      case_financials (*),
      case_facts (*)
    `;

    const { data: cases, error } = await supabase
      .from("cases")
      .select(view === "summary" ? summarySelect : fullSelect)
      .eq("advocate_id", advocateId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const response = NextResponse.json({ cases });
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return response;
  } catch (error) {
    console.error("Get cases error:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
