"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TimelineView from "@/components/story/TimelineView";
import Card, { CardHeader } from "@/components/ui/Card";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { TimelineEvent } from "@/types/timeline.types";
import Button from "@/components/ui/Button";
import { Clock, RefreshCw, MessageSquare } from "lucide-react";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

export default function TimelinePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [oppPartyName, setOppPartyName] = useState("");

  useEffect(() => {
    const cacheKey = `case:${caseId}:timeline`;
    const cached = getClientCache<{
      events: TimelineEvent[];
      clientName: string;
      oppPartyName: string;
    }>(cacheKey);
    if (cached) {
      setEvents(cached.events);
      setClientName(cached.clientName);
      setOppPartyName(cached.oppPartyName);
      setLoading(false);
    }

    fetch(`/api/cases/${caseId}?view=timeline`)
      .then((r) => r.json())
      .then((data) => {
        const timeline = data.case?.event_timeline || [];
        const sorted = [...timeline].sort(
          (a: TimelineEvent, b: TimelineEvent) =>
            (a.sequence_order || 0) - (b.sequence_order || 0)
        );
        setEvents(sorted);

        const client = data.case?.case_parties?.find(
          (p: { role: string }) => p.role === "client"
        );
        const opp = data.case?.case_parties?.find(
          (p: { role: string }) => p.role === "opposite_party"
        );
        const nextClientName = client?.name || "";
        const nextOppName = opp?.name || "";
        setClientName(nextClientName);
        setOppPartyName(nextOppName);
        setClientCache(
          cacheKey,
          { events: sorted, clientName: nextClientName, oppPartyName: nextOppName },
          45_000
        );
        setLoading(false);
      });
  }, [caseId]);

  if (loading) return <FullPageSpinner label="Loading timeline..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Case Timeline
            </h1>
            {clientName && (
              <p className="text-sm text-gray-500 mt-0.5">
                {clientName} vs {oppPartyName}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back to Case
        </button>
      </div>

      {/* Timeline Card */}
      <Card>
        <CardHeader
          title="Chronological Events"
          subtitle={
            events.length > 0
              ? `${events.length} events extracted from client story`
              : "No events extracted yet"
          }
          action={
            <span className="text-xs text-gray-400">
              AI extracted · Advocate verified
            </span>
          }
        />
        <TimelineView
          events={events}
          emptyMessage="No timeline yet. Go to Client Story to extract events."
        />
      </Card>

      {/* Legal Notice Note */}
      {events.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> These events are AI-extracted from the
            client's story. Review them carefully. They will be referenced in
            the narrative portion of the legal notice. Legal sections and
            deadlines are determined separately from hardcoded rules.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => router.push(`/cases/${caseId}/story`)}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Re-extract Story
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push(`/cases/${caseId}/story`)}
          icon={<MessageSquare className="w-4 h-4" />}
        >
          Edit Story
        </Button>
      </div>
    </div>
  );
}
