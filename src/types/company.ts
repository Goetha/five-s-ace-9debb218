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
}

export interface CompanyFormData {
  name: string;
  phone: string;
  email: string;
  adminName: string;
  adminEmail: string;
}
