"use client";

import { useState } from "react";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import styles from "./story.module.css";

interface StoryTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const MIN_CHARS = 50;
const EXAMPLE_STORY =
  "My client Ramesh lent Rs 5 lakhs to Suresh in January 2024. Suresh gave a cheque dated March 15, 2024 from SBI Adyar branch as security. When the cheque was deposited on April 1, 2024 it bounced with insufficient funds. The bank gave a return memo on the same day. Suresh has not paid despite repeated requests.";

export default function StoryTextInput({
  value,
  onChange,
  onSubmit,
  loading,
}: StoryTextInputProps) {
  const [showExample, setShowExample] = useState(false);
  const charCount = value.length;
  const isValid = charCount >= MIN_CHARS;

  return (
    <div className={styles.stack}>
      <div className={styles.warning}>
        <AlertCircle className={styles.warningIcon} />
        <p className={styles.warningText}>
          <strong>Tell the story exactly as stated by the client.</strong> Include
          dates, amounts, and sequence of events. Extraction does not add facts.
        </p>
      </div>

      <div className={styles.rowHead}>
        <label className={styles.label}>Client Story</label>
        <button
          type="button"
          onClick={() => setShowExample((prev) => !prev)}
          className={styles.textAction}
        >
          {showExample ? "Hide example" : "See example"}
        </button>
      </div>

      {showExample && (
        <div className={styles.exampleBox}>
          <p className={styles.exampleText}>{EXAMPLE_STORY}</p>
          <button
            type="button"
            onClick={() => {
              onChange(EXAMPLE_STORY);
              setShowExample(false);
            }}
            className={styles.textAction}
          >
            Use this example
          </button>
        </div>
      )}

      <textarea
        className={styles.textarea}
        rows={9}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Narrate what happened in sequence: cheque issue, presentation, dishonour, memo receipt, post-dishonour events."
      />

      <div className={styles.metaRow}>
        <p className={isValid ? styles.validMeta : styles.metaText}>
          {charCount} characters{!isValid ? ` (minimum ${MIN_CHARS})` : ""}
        </p>
        {isValid && <p className={styles.validMeta}>Ready to extract</p>}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isValid || loading}
        className={styles.extractButton}
      >
        {loading ? <Loader2 className={styles.spin} /> : <FileText className={styles.icon16} />}
        {loading ? "Extracting Timeline..." : "Extract Legal Timeline"}
      </button>
    </div>
  );
}
