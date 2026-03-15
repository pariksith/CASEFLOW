import { TimelineEvent } from "@/types/timeline.types";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RawEvent {
  date?: string;
  event?: string;
  is_approximate?: boolean;
}

function fallbackNoticeNarrative(data: {
  clientName: string;
  oppPartyName: string;
  chequeAmount: number;
  chequeNumber: string;
  chequeDate: string;
  bankName: string;
  dishonourReason: string;
  returnMemoDate: string;
}): string {
  return `Under instructions from my client ${data.clientName}, it is stated that you, ${data.oppPartyName}, issued Cheque No. ${data.chequeNumber} dated ${data.chequeDate} for a sum of Rs ${data.chequeAmount.toLocaleString(
    "en-IN"
  )}, drawn on ${data.bankName}, towards discharge of a legally enforceable liability. The said cheque, upon presentation, was returned unpaid with the endorsement "${data.dishonourReason}" and return memo dated ${data.returnMemoDate}. Despite repeated demands, you have failed to make payment of the cheque amount to my client. This notice is therefore being issued calling upon you to make payment in accordance with law.`;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function splitSentences(story: string): string[] {
  return story
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => normalizeWhitespace(s))
    .filter(Boolean);
}

function extractDateFromSentence(sentence: string): {
  date: string;
  isApproximate: boolean;
} {
  const exactDate =
    sentence.match(
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:\d{1,2}\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4})\b/i
    ) || null;
  if (exactDate?.[0]) {
    return { date: exactDate[0], isApproximate: false };
  }

  const monthYear = sentence.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i
  );
  if (monthYear?.[0]) {
    return { date: `approximate ${monthYear[0]}`, isApproximate: true };
  }

  const yearOnly = sentence.match(/\b(19|20)\d{2}\b/);
  if (yearOnly?.[0]) {
    return { date: `approximate ${yearOnly[0]}`, isApproximate: true };
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return { date: `approximate ${yyyy}-${mm}-${dd} ${hh}:${min}`, isApproximate: true };
}

function describeSentence(sentence: string): string {
  const s = sentence.toLowerCase();
  if (s.includes("lent") || s.includes("loan") || s.includes("borrow")) {
    return sentence;
  }
  if (s.includes("cheque") && (s.includes("issued") || s.includes("gave"))) {
    return sentence;
  }
  if (
    s.includes("present") ||
    s.includes("deposit") ||
    s.includes("submitted to bank")
  ) {
    return sentence;
  }
  if (
    s.includes("dishonour") ||
    s.includes("bounced") ||
    s.includes("insufficient funds")
  ) {
    return sentence;
  }
  if (s.includes("memo")) {
    return sentence;
  }
  if (s.includes("notice")) {
    return sentence;
  }
  if (s.includes("payment") || s.includes("paid")) {
    return sentence;
  }
  return sentence;
}

function fallbackTimelineFromStory(story: string): TimelineEvent[] {
  const sentences = splitSentences(story);
  const picked = sentences.length > 0 ? sentences : [normalizeWhitespace(story)];

  const events = picked
    .slice(0, 12)
    .map((sentence, index) => {
      const { date, isApproximate } = extractDateFromSentence(sentence);
      const description = describeSentence(sentence);
      return {
        event_date: date,
        event_description: description,
        is_approximate: isApproximate,
        sequence_order: index + 1,
      } satisfies TimelineEvent;
    })
    .filter((e) => e.event_description.length > 0);

  return events.length > 0
    ? events
    : [
        {
          event_date: extractDateFromSentence(story).date,
          event_description: normalizeWhitespace(story),
          is_approximate: true,
          sequence_order: 1,
        },
      ];
}

export async function extractTimelineFromStory(
  story: string
): Promise<TimelineEvent[]> {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!apiUrl || !apiKey) {
    return fallbackTimelineFromStory(story);
  }

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are a legal fact extractor for Indian litigation. 
Your ONLY job is to convert a dispute story into a JSON array of chronological legal events.

STRICT RULES:
1. DO NOT add any facts not present in the story
2. DO NOT provide legal opinions or advice
3. DO NOT invent dates — use "approximate" or "unknown" if unclear
4. Output ONLY valid JSON array — no explanation, no markdown, no extra text
5. Each event must have: date (string), event (string), is_approximate (boolean)

Output format:
[
  {"date": "2024-01-15", "event": "Cheque issued by opposite party", "is_approximate": false},
  {"date": "approximate March 2024", "event": "Cheque presented for clearing", "is_approximate": true},
  {"date": "unknown", "event": "Cheque dishonoured by bank", "is_approximate": true}
]`,
    },
    {
      role: "user",
      content: `Extract chronological legal events from this dispute story:\n\n${story}`,
    },
  ];

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o",
        messages,
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return fallbackTimelineFromStory(story);
  }

  if (!response.ok) {
    return fallbackTimelineFromStory(story);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) return fallbackTimelineFromStory(story);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try extracting JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return fallbackTimelineFromStory(story);
    parsed = JSON.parse(match[0]);
  }

  // Normalize: handle both {events: [...]} and direct array
  const rawEvents: RawEvent[] =
    Array.isArray(parsed)
      ? parsed
      : (parsed as { events?: unknown[] }).events || [];

  const events: TimelineEvent[] = rawEvents.map((e, index) => ({
    event_date: e.date || "unknown",
    event_description: e.event || "",
    is_approximate: e.is_approximate ?? false,
    sequence_order: index + 1,
  }));

  const cleaned = events.filter(
    (e) => e.event_description && e.event_description.trim().length > 0
  );

  return cleaned.length > 0 ? cleaned : fallbackTimelineFromStory(story);
}

export async function generateNoticeNarrative(data: {
  clientName: string;
  oppPartyName: string;
  chequeAmount: number;
  chequeNumber: string;
  chequeDate: string;
  bankName: string;
  dishonourReason: string;
  returnMemoDate: string;
  timelineEvents: TimelineEvent[];
  caseFacts: Record<string, unknown>;
}): Promise<string> {
  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!apiUrl || !apiKey) {
    return fallbackNoticeNarrative(data);
  }

  const timelineSummary = data.timelineEvents
    .map((e) => `- ${e.event_date}: ${e.event_description}`)
    .join("\n");

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are a legal drafting assistant for Indian advocates.
Write a formal, professional narrative paragraph (3-4 sentences) for inclusion in a legal notice under Section 138 NI Act.

STRICT RULES:
1. Write in third person, formal legal English
2. DO NOT add sections, headings, or legal citations — those come from the template
3. DO NOT invent facts — only use what is provided
4. Keep it factual and concise — this is one paragraph only
5. Refer to the drawer as "you" and the payee as "my client"`,
    },
    {
      role: "user",
      content: `Write the narrative paragraph for a legal notice with these facts:

Client (Payee): ${data.clientName}
Opposite Party (Drawer): ${data.oppPartyName}
Cheque No: ${data.chequeNumber}
Cheque Date: ${data.chequeDate}
Amount: ₹${data.chequeAmount}
Bank: ${data.bankName}
Dishonour Reason: ${data.dishonourReason}
Return Memo Date: ${data.returnMemoDate}

Chronological Events:
${timelineSummary}

Additional Facts:
- Part payment made: ${data.caseFacts.part_payment_made ? `Yes — ₹${data.caseFacts.part_payment_amount}` : "No"}
- Written admission available: ${data.caseFacts.written_admission_available ? "Yes" : "No"}`,
    },
  ];

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o",
        messages,
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      return fallbackNoticeNarrative(data);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    return content || fallbackNoticeNarrative(data);
  } catch {
    return fallbackNoticeNarrative(data);
  }
}
