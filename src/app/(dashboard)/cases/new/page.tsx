"use client";

import { useState } from "react";
import CaseTypeSelector from "@/components/cases/CaseTypeSelector";
import CaseForm from "@/components/cases/CaseForm";
import { Scale } from "lucide-react";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import clsx from "clsx";
import styles from "./newcase.module.css";

type Step = "select_type" | "fill_form";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function NewCasePage() {
  const [step, setStep] = useState<Step>("select_type");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setStep("fill_form");
  };

  return (
    <div className={`${uiFont.className} ${styles.page}`}>
      <div className={styles.chrome}>
        <span className="inline-flex items-center gap-2">
          <Scale size={14} /> CASEFLOW STUDIO
        </span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroHead}>
          <div>
            <h1 className={`${displayFont.className} ${styles.title}`}>
              Build
              <span className={styles.muted}>New</span>
              <span className="block">Case File</span>
            </h1>
            <p className={styles.sub}>
              Start a structured litigation file with guided workflow and clear legal milestones.
            </p>
          </div>

          <div className={styles.stepPill}>
            <p className={styles.stepTitle}>Progress</p>
            <p className={styles.stepText}>
              Step {step === "select_type" ? "1" : "2"} of 2
            </p>
          </div>
        </div>

        <div className={styles.steps}>
          <div
            className={clsx(
              styles.stepItem,
              step === "select_type" && styles.stepActive,
              step === "fill_form" && styles.stepDone
            )}
          >
            <div className={styles.stepDot}>
              {step === "fill_form" ? "✓" : "1"}
            </div>
            <span className={styles.stepLabel}>Select case type</span>
          </div>

          <div
            className={clsx(
              styles.stepItem,
              step === "fill_form" && styles.stepActive
            )}
          >
            <div className={styles.stepDot}>2</div>
            <span className={styles.stepLabel}>Fill case details</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        {step === "select_type" && (
          <CaseTypeSelector onSelect={handleTypeSelect} />
        )}
        {step === "fill_form" && selectedType && (
          <CaseForm onBack={() => setStep("select_type")} />
        )}
      </section>
    </div>
  );
}
