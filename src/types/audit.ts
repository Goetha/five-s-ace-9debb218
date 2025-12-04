export type AuditStatus = 'in_progress' | 'completed';
export type ScoreLevel = 'low' | 'medium' | 'high';

export interface Audit {
  id: string;
  company_id: string;
  location_id: string;
  auditor_id: string;
  status: AuditStatus;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  total_yes: number;
  total_no: number;
  score: number | null;
  score_level: ScoreLevel | null;
  next_audit_date: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditItem {
  id: string;
  audit_id: string;
  criterion_id: string;
  question: string;
  answer: boolean | null;
  photo_url: string | null; // JSON array of URLs stored as string
  comment: string | null;
  created_at: string;
  photo_urls?: string[]; // Parsed array for easy access in components
  senso?: string[] | null; // Senso from company_criteria
}

export interface AuditWithDetails extends Audit {
  location_name: string;
  auditor_name: string;
  company_name: string;
  items?: AuditItem[];
}

export interface CreateAuditData {
  company_id: string;
  location_id: string;
}

export interface UpdateAuditItemData {
  answer: boolean;
  photo_url?: string; // JSON array as string
  comment?: string;
}

export interface CompleteAuditData {
  observations?: string;
  next_audit_date?: string;
}
