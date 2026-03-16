"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Mic,
  RefreshCw,
  Scale,
} from "lucide-react";
import toast from "react-hot-toast";
import StoryTextInput from "@/components/story/StoryTextInput";
import TimelineView from "@/components/story/TimelineView";
import VoiceRecorder from "@/components/story/VoiceRecorder";
import { TimelineEvent } from "@/types/timeline.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";
import styles from "./page.module.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function StoryPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [story, setStory] = useState("");
  const [activeInput, setActiveInput] = useState<"text" | "voice">("text");
  const [extracting, setExtracting] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [extracted, setExtracted] = useState(false);
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const label = new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setTimeLabel(label);
    };

    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const cacheKey = `case:${caseId}:story`;
    const cached = getClientCache<{ timeline: TimelineEvent[]; rawStory: string }>(cacheKey);
    if (cached) {
      if (cached.timeline.length > 0) {
        setEvents(cached.timeline);
        setExtracted(true);
      }
      if (cached.rawStory) setStory(cached.rawStory);
    }

    fetch(`/api/cases/${caseId}?view=story`)
      .then((r) => r.json())
      .then((data) => {
        const timeline = data.case?.event_timeline || [];
        if (timeline.length > 0) {
          setEvents(timeline);
          setExtracted(true);
        }
        const rawStory = data.case?.case_facts?.raw_story;
        if (rawStory) setStory(rawStory);
        setClientCache(cacheKey, { timeline, rawStory: rawStory || "" }, 45_000);
      });
  }, [caseId]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setStory((prev) => prev + (prev ? " " : "") + text);
  }, []);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await fetch("/api/story/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, story }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEvents(data.events || []);
      setExtracted(true);
      toast.success(`${data.count} events extracted from story`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const shortCaseId = useMemo(
    () => (caseId || "").slice(0, 8).toUpperCase(),
    [caseId]
  );

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className={styles.chromeLeft}>
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
        <span>IN {timeLabel}</span>
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Case Story Builder</p>
          <h1 className={`${displayFont.className} ${styles.title}`}>
            Client Story
            <span className={styles.muted}>Intelligence</span>
          </h1>
          <p className={styles.subtitle}>
            Convert a plain narration into a structured legal event timeline
            with verifiable sequence and dates.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <p className={styles.caseCode}>Case #{shortCaseId}</p>
          <p className={styles.step}>Step 1 of 3</p>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}`)}
            className={styles.backBtn}
          >
            <ChevronLeft className={styles.icon14} />
            Back to Case
          </button>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelKicker}>Input Mode</p>
            <div className={styles.toggle}>
              <button
                type="button"
                onClick={() => setActiveInput("text")}
                className={
                  activeInput === "text" ? styles.toggleActive : styles.toggleBtn
                }
              >
                <FileText className={styles.icon14} />
                Type Story
              </button>
              <button
                type="button"
                onClick={() => setActiveInput("voice")}
                className={
                  activeInput === "voice" ? styles.toggleActive : styles.toggleBtn
                }
              >
                <Mic className={styles.icon14} />
                Voice Input
              </button>
            </div>
          </div>

          {activeInput === "text" ? (
            <StoryTextInput
              value={story}
              onChange={setStory}
              onSubmit={handleExtract}
              loading={extracting}
            />
          ) : (
            <div className={styles.voiceBlock}>
              <VoiceRecorder onTranscript={handleVoiceTranscript} />
              {story && (
                <div className={styles.transcriptBlock}>
                  <p className={styles.panelKicker}>Transcribed Story</p>
                  <div className={styles.transcriptText}>{story}</div>
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={extracting}
                    className={styles.extractSecondary}
                  >
                    <RefreshCw className={extracting ? styles.spin : styles.icon14} />
                    {extracting ? "Extracting..." : "Extract Timeline from Story"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={`${displayFont.className} ${styles.panelTitle}`}>
                Extracted Timeline
              </h2>
              <p className={styles.panelSub}>
                {extracted
                  ? `${events.length} event${events.length === 1 ? "" : "s"} found`
                  : "Timeline appears after extraction"}
              </p>
            </div>
            {extracted ? (
              <span className={styles.badge}>Extracted</span>
            ) : (
              <Clock className={styles.clockIcon} />
            )}
          </div>
          <TimelineView events={events} />
        </section>
      </div>

      {extracted && (
        <div className={styles.footerAction}>
          <button
            type="button"
            onClick={() => router.push(`/cases/${caseId}/questions`)}
            className={styles.nextBtn}
          >
            Continue to Case Facts
            <ChevronRight className={styles.icon14} />
          </button>
        </div>
      )}
    </div>
  );
}
