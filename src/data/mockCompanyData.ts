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

export const mockNotifications = [
  {
    id: '1',
    title: 'Auditoria atrasada',
    message: 'A auditoria do Almoxarifado está 1 dia atrasada',
    type: 'warning',
    read: false,
    created_at: '2025-01-21T10:00:00Z'
  },
  {
    id: '2',
    title: 'Novo plano de ação',
    message: '3 planos de ação gerados na Linha 1',
    type: 'info',
    read: false,
    created_at: '2025-01-21T09:00:00Z'
  },
  {
    id: '3',
    title: 'Usuário cadastrado',
    message: 'Maria Santos foi adicionada como Avaliadora',
    type: 'success',
    read: true,
    created_at: '2025-01-20T15:30:00Z'
  }
];

export const mockCompanyStats = {
  totalEnvironments: 8,
  totalUsers: 15,
  totalAudits: 45,
  averageScore: 7.8
};
