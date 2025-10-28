export interface Company5SData {
  linked_models: string[]; // IDs dos modelos vinculados
  total_audits: number;
  pending_audits: number;
  completed_audits: number;
  average_5s_score: number; // Score médio geral (0-10)
  scores_by_senso: {
    "1S": number;
    "2S": number;
    "3S": number;
    "4S": number;
    "5S": number;
  };
  action_plans: {
    total: number;
    open: number;
    in_progress: number;
    overdue: number;
    closed: number;
  };
  last_audit_date: string | null;
  compliance_trend: 'improving' | 'stable' | 'declining';
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  logo: string | null;
  admin: {
    name: string;
    email: string;
  };
  total_users: number;
  created_at: string;
  last_activity: string | null;
  status: 'active' | 'inactive';
  address: string;
  city?: string;
  state?: string;
  cep?: string;
  phone: string;
  email?: string;
  fiveSData?: Company5SData; // Dados de 5S
}

export interface CompanyFormData {
  name: string;
  phone: string;
  email: string;
  adminName: string;
  adminEmail: string;
}
