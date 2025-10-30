export type CriterionSenso = '1S' | '2S' | '3S' | '4S' | '5S';
export type CriterionScoringType = '0-10' | 'conform-non-conform' | '0-5' | 'percentage';
export type CriterionOrigin = 'ifa' | 'custom';
export type CriterionStatus = 'active' | 'inactive';

export interface Criterion {
  id: string;
  company_id: string;
  master_criterion_id: string | null; // null se personalizado
  name: string;
  description: string;
  senso: CriterionSenso;
  scoring_type: CriterionScoringType;
  default_weight: number; // peso padrão (do IFA ou inicial do custom)
  custom_weight: number; // peso atual customizado
  origin: CriterionOrigin;
  origin_model_id: string | null;
  origin_model_name: string | null;
  linked_at?: string; // quando foi herdado
  status: CriterionStatus;
  tags: string[];
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  audits_using: number;
  average_score?: number;
  can_edit_content: boolean;
  can_edit_weight: boolean;
  can_delete: boolean;
  is_weight_customized: boolean;
}

export interface CriterionFormData {
  name: string;
  description: string;
  senso: CriterionSenso;
  scoring_type: CriterionScoringType;
  default_weight: number;
  tags: string[];
  status: CriterionStatus;
}
