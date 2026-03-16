import { AlertCircle, Scale } from "lucide-react";
import styles from "./notice.module.css";

interface NoticePreviewProps {
  noticeText: string;
  metadata?: {
    act: string;
    sections: string[];
    noticeSentDate: string;
    waitingPeriodEnd: string;
    complaintDeadline: string;
  };
}

export default function NoticePreview({ noticeText, metadata }: NoticePreviewProps) {
  return (
    <div className={styles.stack}>
      {metadata && (
        <div className={styles.metaGrid}>
          {[
            { label: "Act", value: "NI Act, 1881" },
            { label: "Sections", value: metadata.sections.join(", ") },
            { label: "15-Day Wait Ends", value: metadata.waitingPeriodEnd },
          ].map(({ label, value }) => (
            <div key={label} className={styles.metaItem}>
              <p className={styles.metaLabel}>{label}</p>
              <p className={styles.metaValue}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {metadata && (
        <div className={styles.deadlineBox}>
          <AlertCircle className={styles.icon14} />
          <p>
            <strong>Complaint Deadline:</strong> {metadata.complaintDeadline}. File
            the complaint before this date to avoid limitation risk.
          </p>
        </div>
      )}

      <div className={styles.previewBox}>
        <div className={styles.previewHead}>
          <Scale className={styles.icon14} />
          <p>Legal Notice Preview</p>
        </div>
        <pre className={styles.previewText}>{noticeText}</pre>
      </div>

      <p className={styles.previewFoot}>
        Preview only. Downloaded `.docx` contains the formatted final version.
      </p>
    </div>
  );
}
