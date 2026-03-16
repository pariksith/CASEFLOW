import clsx from "clsx";
import { AlertCircle, Calendar, CheckCircle, Clock } from "lucide-react";
import { TimelineEvent } from "@/types/timeline.types";
import styles from "./story.module.css";

interface TimelineViewProps {
  events: TimelineEvent[];
  emptyMessage?: string;
}

export default function TimelineView({
  events,
  emptyMessage = "No timeline events yet. Extracted events will appear here.",
}: TimelineViewProps) {
  if (!events || events.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <Calendar className={styles.emptyIcon} />
        <p className={styles.emptyText}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.timelineList}>
        {events.map((event, index) => (
          <article key={index} className={styles.timelineItem}>
            <div
              className={clsx(
                styles.dot,
                event.is_approximate ? styles.dotApprox : styles.dotExact
              )}
            >
              {event.is_approximate ? (
                <AlertCircle className={styles.dotIcon} />
              ) : (
                <CheckCircle className={styles.dotIcon} />
              )}
            </div>

            <div className={styles.timelineBody}>
              <p
                className={clsx(
                  styles.dateTag,
                  event.is_approximate ? styles.dateTagApprox : styles.dateTagExact
                )}
              >
                <Clock className={styles.icon12} />
                {event.event_date}
                {event.is_approximate ? " (approx)" : ""}
              </p>
              <p className={styles.eventText}>{event.event_description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
