import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractTimelineFromStory } from "@/lib/ai/extractTimeline";

export async function POST(req: NextRequest) {
  try {
    const { caseId, story } = await req.json();

    if (!caseId || !story || story.trim().length < 20) {
      return NextResponse.json(
        { error: "Case ID and story (minimum 20 chars) are required" },
        { status: 400 }
      );
    }

    // Extract timeline from AI
    const events = await extractTimelineFromStory(story);

    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: "Could not extract timeline from story" },
        { status: 422 }
      );
    }

    const supabase = createServiceRoleClient();

    // Delete existing timeline events for this case
    const { error: deleteError } = await supabase
      .from("event_timeline")
      .delete()
      .eq("case_id", caseId);
    if (deleteError) throw deleteError;

    // Insert new timeline events
    const timelineRecords = events.map((event, index) => ({
      case_id: caseId,
      event_date: event.event_date,
      event_description: event.event_description,
      is_approximate: event.is_approximate,
      sequence_order: index + 1,
    }));

    const { error: insertError } = await supabase
      .from("event_timeline")
      .insert(timelineRecords);

    if (insertError) throw insertError;

    // Save raw story to case_facts
    const { error: updateError } = await supabase
      .from("case_facts")
      .update({ raw_story: story })
      .eq("case_id", caseId);
    if (updateError) {
      console.warn("Could not update raw_story in case_facts:", updateError.message);
    }

    return NextResponse.json({ success: true, events, count: events.length });
  } catch (error) {
    console.error("Story extract error:", error);
    const message =
      error instanceof Error ? error.message : "Timeline extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
