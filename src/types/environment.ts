export interface Environment {
  id: string;
  company_id: string;
  name: string;
  icon: string;
  parent_id: string | null;
  responsible_user_id: string;
  responsible_name: string;
  responsible_email: string;
  responsible_avatar: string | null;
  status: 'active' | 'inactive';
  audits_count: number;
  description?: string;
  created_at: string;
}

export interface EnvironmentFormData {
  name: string;
  icon: string;
  parent_id: string | null;
  responsible_user_id: string;
  description: string;
  status: 'active' | 'inactive';
  isSubEnvironment: boolean;
}
