"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Download, Loader2 } from "lucide-react";
import styles from "./notice.module.css";

interface DownloadButtonProps {
  caseId: string;
  advocateId: string;
  onGenerated?: (metadata: Record<string, string>) => void;
  hasExistingNotice?: boolean;
}

export default function DownloadButton({
  caseId,
  advocateId,
  onGenerated,
  hasExistingNotice = false,
}: DownloadButtonProps) {
  const [generatingFormat, setGeneratingFormat] = useState<"docx" | "pdf" | null>(null);

  const handleGenerate = async (format: "docx" | "pdf") => {
    setGeneratingFormat(format);
    try {
      const res = await fetch("/api/notice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, advocateId, format }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const metadataHeader = res.headers.get("X-Notice-Metadata");
      const metadata = metadataHeader ? JSON.parse(metadataHeader) : {};

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legal_notice_${caseId.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Legal notice downloaded as ${format.toUpperCase()}`);
      onGenerated?.(metadata);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Notice generation failed");
    } finally {
      setGeneratingFormat(null);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.buttonRow}>
        <button
          type="button"
          onClick={() => handleGenerate("docx")}
          disabled={generatingFormat !== null}
          className={styles.generateBtn}
        >
          {generatingFormat === "docx" ? (
            <Loader2 className={styles.spin} />
          ) : (
            <Download className={styles.icon16} />
          )}
          {generatingFormat === "docx"
            ? "Generating DOCX..."
            : hasExistingNotice
            ? "Re-generate as DOCX"
            : "Generate Notice (.docx)"}
        </button>

        <button
          type="button"
          onClick={() => handleGenerate("pdf")}
          disabled={generatingFormat !== null}
          className={styles.generateBtnAlt}
        >
          {generatingFormat === "pdf" ? (
            <Loader2 className={styles.spin} />
          ) : (
            <Download className={styles.icon16} />
          )}
          {generatingFormat === "pdf"
            ? "Generating PDF..."
            : hasExistingNotice
            ? "Re-generate as PDF"
            : "Generate Notice (.pdf)"}
        </button>
      </div>

      <div className={styles.hintBox}>
        <p>
          <strong>Next:</strong> Stage moves to Notice Generated. After service,
          mark notice served to start the 15-day wait period.
        </p>
      </div>
    </div>
  );
}
