export const currentCompany = {
  id: 'company-001',
  name: 'Indústria Metalúrgica ABC Ltda',
  logo: null,
  cnpj: '12.345.678/0001-90'
};

export const currentCompanyAdmin = {
  id: 'user-001',
  name: 'João Silva',
  email: 'doket43879@lovleo.com',
  role: 'company_admin',
  avatar: null,
  company_id: 'company-001'
};

// Empty notifications
export const mockNotifications: any[] = [];

// Stats with zero values
export const mockCompanyStats = {
  totalEnvironments: 0,
  totalUsers: 0,
  totalAudits: 0,
  averageScore: 0
};
