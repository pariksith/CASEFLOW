export interface GeneratedDocument {
  id: string;
  case_id: string;
  document_type: "legal_notice" | "complaint" | "affidavit";
  file_name: string | null;
  file_url: string | null;
  generated_at: string;
  version: number;
}
