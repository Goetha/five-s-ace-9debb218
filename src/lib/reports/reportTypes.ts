export interface AuditReportData {
  audit_id: string;
  company_name: string;
  location_name: string;
  sector_name: string;   // Setor (level 1 in 3-tier hierarchy)
  local_name: string;    // Local (level 2 in 3-tier hierarchy)
  full_location_path: string;
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
  criterion_name?: string;
  tags?: string[];
}

export interface SensoScore {
  senso: string;
  name: string;
  score: number;
  total: number;
  conforme: number;
}

// Environment hierarchy for company tree view
export interface EnvironmentNode {
  id: string;
  name: string;
  parent_id: string | null;
  children: EnvironmentNode[];
  level: number;
}

// Environment with Senso scores for hierarchical table
// 3-tier hierarchy: Empresa (root) > Setor (level 1) > Local (level 2)
export interface EnvironmentSensoRow {
  id: string;
  name: string;
  level: number;  // 0 = root (company node), 1 = setor, 2 = local
  parent_id: string | null;
  senso_scores: {
    '1S': number | null;
    '2S': number | null;
    '3S': number | null;
    '4S': number | null;
    '5S': number | null;
  };
  average_score: number | null;
  has_audits: boolean;
}

// Non-conformity with full details for company report
export interface NonConformityDetail {
  audit_id: string;
  audit_date: string;
  location_path: string;
  location_name: string;
  auditor_name: string;
  criterion_name: string;
  question: string;
  comment: string | null;
  photo_urls: string[];
  senso: string[];
}

// Extended audit summary with items
export interface ExtendedAuditSummary {
  id: string;
  location_id: string;
  location_name: string;
  location_path: string;
  date: string;
  score: number | null;
  score_level: string | null;
  auditor_name: string;
  total_questions: number;
  total_yes: number;
  total_no: number;
  observations: string | null;
}

export interface CompanyReportData {
  company_id: string;
  company_name: string;
  period_start: string;
  period_end: string;
  total_audits: number;
  average_score: number;
  audits: ExtendedAuditSummary[];
  senso_averages: SensoScore[];
  locations_ranking: LocationRanking[];
  environment_tree: EnvironmentNode[];
  environment_senso_table: EnvironmentSensoRow[];
  non_conformities: NonConformityDetail[];
  total_conformities: number;
  total_non_conformities: number;
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
  location_path: string;
  average_score: number;
  audit_count: number;
}

// Senso metadata
export const SENSO_CONFIG = {
  '1S': { name: 'Seiri (Utilizacao)', color: '#EF4444' },
  '2S': { name: 'Seiton (Organizacao)', color: '#F97316' },
  '3S': { name: 'Seiso (Limpeza)', color: '#EAB308' },
  '4S': { name: 'Seiketsu (Padronizacao)', color: '#10B981' },
  '5S': { name: 'Shitsuke (Disciplina)', color: '#3B82F6' },
} as const;

export type SensoKey = keyof typeof SENSO_CONFIG;

// Helper to sanitize text for PDF (remove emojis and special characters)
export function sanitizeTextForPDF(text: string): string {
  if (!text) return '';
  // Remove emojis and non-ASCII characters that jsPDF can't render
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .trim();
}
