export interface LinkedCompany {
  id: string;
  name: string;
}

export interface Auditor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive';
  linked_companies: LinkedCompany[];
  environments_count: number;
  created_at: string;
  last_access: string | null;
}

export interface AuditorFormData {
  name: string;
  email: string;
  phone: string;
  linked_companies: string[]; // company IDs
  password_type: 'auto' | 'manual';
  password?: string;
  send_email: boolean;
}
