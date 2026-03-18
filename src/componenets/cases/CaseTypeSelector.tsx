import { Scale, ChevronRight, Landmark } from "lucide-react";
import styles from "./newcase-content.module.css";

interface CaseTypeSelectorProps {
  onSelect: (type: string) => void;
}

const CASE_TYPE = {
  id: "cheque_bounce",
  title: "Cheque Bounce",
  subtitle: "Section 138, NI Act",
  description:
    "Dishonour of cheque for insufficiency of funds or exceeding arranged amount.",
};

export default function CaseTypeSelector({ onSelect }: CaseTypeSelectorProps) {
  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <h2 className={styles.title}>Select Case Type</h2>
        <p className={styles.subtitle}>Only Cheque Bounce (NI Act) is supported in this version.</p>
      </div>

      <div className={styles.selectorList}>
        <button
          onClick={() => onSelect(CASE_TYPE.id)}
          className={styles.typeCard}
        >
          <div className={styles.typeRow}>
            <div className={styles.typeMain}>
              <span className={styles.iconWrap}>
                <Landmark size={17} />
              </span>
              <div>
                <p className={styles.typeTitle}>{CASE_TYPE.title}</p>
                <div className={styles.metaRow}>
                  <p className={styles.typeSubtitle}>{CASE_TYPE.subtitle}</p>
                  <span className={`${styles.badge} ${styles.badgeLive}`}>
                    Available
                  </span>
                </div>
                <p className={styles.desc}>{CASE_TYPE.description}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </div>
        </button>
      </div>

      <div className={styles.note}>
        <Scale className="w-4 h-4 inline-block mr-1.5 align-text-top" />
        <strong>Legal Mapping:</strong> All sections, notice periods, and
        deadlines are hardcoded - not AI-generated. AI only writes the
        notice language.
      </div>
    </div>
  );
}
