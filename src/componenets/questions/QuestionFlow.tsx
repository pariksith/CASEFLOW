"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { CHEQUE_BOUNCE_QUESTIONS } from "@/constants/questionBank";
import { CaseFactsAnswers } from "@/types/facts.types";
import QuestionCard from "./QuestionCard";
import styles from "./questions.module.css";

interface QuestionFlowProps {
  caseId: string;
  initialAnswers?: Partial<CaseFactsAnswers>;
  onComplete: (answers: CaseFactsAnswers) => void;
}

const defaultAnswers: CaseFactsAnswers = {
  cheque_signed_by_drawer: null,
  statutory_notice_already_sent: null,
  part_payment_made: null,
  part_payment_amount: null,
  written_admission_available: null,
  notice_delivery_mode: null,
};

export default function QuestionFlow({
  caseId,
  initialAnswers,
  onComplete,
}: QuestionFlowProps) {
  const [answers, setAnswers] = useState<CaseFactsAnswers>({
    ...defaultAnswers,
    ...initialAnswers,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const visibleQuestions = CHEQUE_BOUNCE_QUESTIONS.filter(
    (q) => !q.condition || q.condition(answers)
  );

  const handleChange = (
    questionId: keyof CaseFactsAnswers,
    value: boolean | number | string | null
  ) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };
      if (questionId === "part_payment_made" && value === false) {
        updated.part_payment_amount = null;
      }
      return updated;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, answers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaved(true);
      toast.success("Answers saved");
      onComplete(answers);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const answeredCount = visibleQuestions.filter(
    (q) => answers[q.id] !== null && answers[q.id] !== undefined
  ).length;
  const progress = visibleQuestions.length
    ? (answeredCount / visibleQuestions.length) * 100
    : 0;

  return (
    <div className={styles.flow}>
      <div className={styles.progressRow}>
        <p className={styles.progressText}>
          {answeredCount} of {visibleQuestions.length} questions answered
        </p>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {visibleQuestions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          value={answers[question.id] as boolean | number | string | null}
          onChange={(val) => handleChange(question.id, val)}
          index={index}
        />
      ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ""}`}
      >
        {saving ? (
          <Loader2 className={styles.spin} />
        ) : saved ? (
          <CheckCircle className={styles.icon14} />
        ) : (
          <Save className={styles.icon14} />
        )}
        {saved ? "Answers Saved" : "Save Answers & Continue"}
      </button>
    </div>
  );
}
