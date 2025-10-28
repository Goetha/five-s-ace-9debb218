export type CompanyUserRole = 'company_admin' | 'auditor' | 'area_manager' | 'viewer';

export interface CompanyUser {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  role: CompanyUserRole;
  role_label: string;
  avatar: string | null;
  status: 'active' | 'inactive';
  linked_environments: string[];
  last_access: string | null;
  created_at: string;
  position?: string;
  audits_performed?: number;
}

export interface CompanyUserFormData {
  name: string;
  email: string;
  phone: string;
  position: string;
  role: CompanyUserRole;
  linked_environments: string[];
  status: 'active' | 'inactive';
  avatar: File | null;
  password_type: 'auto' | 'manual';
  password?: string;
  confirm_password?: string;
  send_email: boolean;
}
