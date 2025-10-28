import { Company } from "@/types/company";

export const mockCompanies: Company[] = [
  {
    id: '001',
    name: 'Indústria Metalúrgica ABC Ltda',
    cnpj: '12.345.678/0001-90',
    logo: null,
    admin: {
      name: 'João Silva',
      email: 'joao.silva@abc.com.br'
    },
    total_users: 15,
    created_at: '2024-12-15T10:00:00Z',
    last_activity: '2025-01-20T14:30:00Z',
    status: 'active',
    address: 'Rua Industrial, 1000',
    city: 'São Paulo',
    state: 'SP',
    cep: '01234-567',
    phone: '(11) 3456-7890',
    email: 'contato@abc.com.br'
  },
  {
    id: '002',
    name: 'Fábrica Modelo Norte S.A.',
    cnpj: '98.765.432/0001-10',
    logo: null,
    admin: {
      name: 'Maria Santos',
      email: 'maria.santos@modelonorte.com.br'
    },
    total_users: 22,
    created_at: '2024-11-20T09:00:00Z',
    last_activity: '2025-01-21T09:15:00Z',
    status: 'active',
    address: 'Av. das Américas, 500',
    city: 'Manaus',
    state: 'AM',
    cep: '69000-000',
    phone: '(92) 3234-5678',
    email: 'contato@modelonorte.com.br'
  },
  {
    id: '003',
    name: 'Escritório Contábil Beta',
    cnpj: '11.222.333/0001-44',
    logo: null,
    admin: {
      name: 'Carlos Oliveira',
      email: 'carlos@beta.com.br'
    },
    total_users: 8,
    created_at: '2025-01-05T11:30:00Z',
    last_activity: null,
    status: 'active',
    address: 'Rua Comércio, 234',
    city: 'Rio de Janeiro',
    state: 'RJ',
    cep: '20000-000',
    phone: '(21) 2987-6543',
    email: 'contato@beta.com.br'
  },
  {
    id: '004',
    name: 'Metalúrgica Sul Ltda',
    cnpj: '55.666.777/0001-88',
    logo: null,
    admin: {
      name: 'Ana Costa',
      email: 'ana.costa@metalsul.com.br'
    },
    total_users: 12,
    created_at: '2024-10-10T08:00:00Z',
    last_activity: '2025-01-19T16:45:00Z',
    status: 'inactive',
    address: 'Rod. BR-101, km 45',
    city: 'Curitiba',
    state: 'PR',
    cep: '80000-000',
    phone: '(41) 3456-1234',
    email: 'contato@metalsul.com.br'
  },
  {
    id: '005',
    name: 'Distribuidora Gamma Alimentos',
    cnpj: '33.444.555/0001-22',
    logo: null,
    admin: {
      name: 'Pedro Almeida',
      email: 'pedro@gamma.com.br'
    },
    total_users: 30,
    created_at: '2024-09-01T07:00:00Z',
    last_activity: '2025-01-21T11:20:00Z',
    status: 'active',
    address: 'Av. Central, 890',
    city: 'Belo Horizonte',
    state: 'MG',
    cep: '30000-000',
    phone: '(31) 3123-4567',
    email: 'contato@gamma.com.br'
  },
  {
    id: '006',
    name: 'Construtora Delta Engenharia',
    cnpj: '77.888.999/0001-33',
    logo: null,
    admin: {
      name: 'Rafael Mendes',
      email: 'rafael@deltaeng.com.br'
    },
    total_users: 18,
    created_at: '2024-08-15T14:00:00Z',
    last_activity: '2025-01-20T17:30:00Z',
    status: 'active',
    address: 'Rua das Obras, 123',
    city: 'Porto Alegre',
    state: 'RS',
    cep: '90000-000',
    phone: '(51) 3456-7890',
    email: 'contato@deltaeng.com.br'
  },
  {
    id: '007',
    name: 'Tecnologia Epsilon Ltda',
    cnpj: '22.333.444/0001-55',
    logo: null,
    admin: {
      name: 'Fernanda Lima',
      email: 'fernanda@epsilon.com.br'
    },
    total_users: 25,
    created_at: '2024-07-10T10:30:00Z',
    last_activity: '2025-01-21T08:45:00Z',
    status: 'active',
    address: 'Av. Tecnológica, 456',
    city: 'Florianópolis',
    state: 'SC',
    cep: '88000-000',
    phone: '(48) 3234-5678',
    email: 'contato@epsilon.com.br'
  },
  {
    id: '008',
    name: 'Farmacêutica Zeta S.A.',
    cnpj: '66.777.888/0001-99',
    logo: null,
    admin: {
      name: 'Juliana Rocha',
      email: 'juliana@zeta.com.br'
    },
    total_users: 20,
    created_at: '2024-06-20T09:15:00Z',
    last_activity: null,
    status: 'inactive',
    address: 'Rua Farmacêutica, 789',
    city: 'Salvador',
    state: 'BA',
    cep: '40000-000',
    phone: '(71) 3456-1234',
    email: 'contato@zeta.com.br'
  },
  {
    id: '009',
    name: 'Logística Omega Transportes',
    cnpj: '44.555.666/0001-77',
    logo: null,
    admin: {
      name: 'Ricardo Fernandes',
      email: 'ricardo@omega.com.br'
    },
    total_users: 35,
    created_at: '2024-05-05T11:00:00Z',
    last_activity: '2025-01-21T10:20:00Z',
    status: 'active',
    address: 'Rod. Transportadora, km 20',
    city: 'Campinas',
    state: 'SP',
    cep: '13000-000',
    phone: '(19) 3456-7890',
    email: 'contato@omega.com.br'
  },
  {
    id: '010',
    name: 'Têxtil Sigma Confecções',
    cnpj: '88.999.000/0001-11',
    logo: null,
    admin: {
      name: 'Patrícia Souza',
      email: 'patricia@sigma.com.br'
    },
    total_users: 14,
    created_at: '2024-04-01T08:30:00Z',
    last_activity: '2025-01-18T15:10:00Z',
    status: 'active',
    address: 'Rua dos Tecidos, 321',
    city: 'Fortaleza',
    state: 'CE',
    cep: '60000-000',
    phone: '(85) 3234-5678',
    email: 'contato@sigma.com.br'
  }
];
