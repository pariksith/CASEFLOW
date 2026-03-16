"use client";

import clsx from "clsx";
import { CaseFactsAnswers, Question } from "@/types/facts.types";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import styles from "./questions.module.css";

interface QuestionCardProps {
  question: Question;
  value: boolean | number | string | null;
  onChange: (value: boolean | number | string | null) => void;
  index: number;
}

export default function QuestionCard({
  question,
  value,
  onChange,
  index,
}: QuestionCardProps) {
  if (question.type === "boolean") {
    return (
      <div className={styles.card}>
        <div className={styles.qHead}>
          <div className={styles.qIndex}>{index + 1}</div>
          <p className={styles.qText}>{question.text}</p>
        </div>

        <div className={styles.booleanRow}>
          <button
            type="button"
            onClick={() => onChange(true)}
            className={clsx(styles.choiceBtn, value === true && styles.yesActive)}
          >
            <CheckCircle2 className={styles.icon14} />
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange(false)}
            className={clsx(styles.choiceBtn, value === false && styles.noActive)}
          >
            <XCircle className={styles.icon14} />
            No
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className={clsx(
              styles.choiceBtn,
              value === null && styles.unknownActive
            )}
          >
            <HelpCircle className={styles.icon14} />
            Unknown
          </button>
        </div>
      </div>
    );
  }

  if (question.type === "amount") {
    return (
      <div className={styles.card}>
        <div className={styles.qHead}>
          <div className={styles.qIndex}>{index + 1}</div>
          <p className={styles.qText}>{question.text}</p>
        </div>

        <div className={styles.amountWrap}>
          <div className={styles.amountInner}>
            <span className={styles.rupee}>Rs</span>
            <input
              type="number"
              className={styles.amountInput}
              placeholder="Enter amount"
              value={(value as number) || ""}
              onChange={(e) =>
                onChange(e.target.value ? parseFloat(e.target.value) : null)
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "select" && question.options) {
    return (
      <div className={styles.card}>
        <div className={styles.qHead}>
          <div className={styles.qIndex}>{index + 1}</div>
          <p className={styles.qText}>{question.text}</p>
        </div>

        <div className={styles.selectGrid}>
          {question.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={clsx(
                styles.selectBtn,
                value === opt && styles.selectActive
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
