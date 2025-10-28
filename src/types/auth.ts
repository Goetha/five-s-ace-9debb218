export type AppRole = 'ifa_admin' | 'company_admin' | 'auditor';

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  created_at: string;
}
