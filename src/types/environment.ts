export interface Environment {
  id: string;
  company_id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  status: 'active' | 'inactive';
  audits_count: number;
  description?: string;
  created_at: string;
}

export interface EnvironmentFormData {
  name: string;
  icon: string;
  parent_id: string | null;
  description: string;
  status: 'active' | 'inactive';
  type: 'environment' | 'sector';
}
