export interface AuditReportData {
  audit_id: string;
  company_name: string;
  location_name: string;
  area_name: string;
  environment_name: string;
  auditor_name: string;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  total_yes: number;
  total_no: number;
  score: number | null;
  score_level: string | null;
  observations: string | null;
  next_audit_date: string | null;
  items: AuditItemReportData[];
  senso_scores: SensoScore[];
}

export interface AuditItemReportData {
  id: string;
  question: string;
  answer: boolean | null;
  comment: string | null;
  photo_urls: string[];
  senso: string[];
}

export interface SensoScore {
  senso: string;
  name: string;
  score: number;
  total: number;
  conforme: number;
}

export interface CompanyReportData {
  company_id: string;
  company_name: string;
  period_start: string;
  period_end: string;
  total_audits: number;
  average_score: number;
  audits: AuditSummary[];
  senso_averages: SensoScore[];
  locations_ranking: LocationRanking[];
}

export interface AuditSummary {
  id: string;
  location_name: string;
  date: string;
  score: number | null;
  auditor_name: string;
}

export interface LocationRanking {
  location_id: string;
  location_name: string;
  average_score: number;
  audit_count: number;
}

// Senso metadata
export const SENSO_CONFIG = {
  '1S': { name: 'Seiri (Utilização)', color: '#EF4444' },
  '2S': { name: 'Seiton (Organização)', color: '#F97316' },
  '3S': { name: 'Seiso (Limpeza)', color: '#EAB308' },
  '4S': { name: 'Seiketsu (Padronização)', color: '#10B981' },
  '5S': { name: 'Shitsuke (Disciplina)', color: '#3B82F6' },
} as const;

export type SensoKey = keyof typeof SENSO_CONFIG;
