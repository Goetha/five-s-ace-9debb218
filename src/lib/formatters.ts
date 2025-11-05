/**
 * Formata CNPJ para o padrão XX.XXX.XXX/XXXX-XX
 */
export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

/**
 * Formata telefone para (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
 */
export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

/**
 * Formata CEP para XXXXX-XXX
 */
export const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 5) return numbers;
  
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

/**
 * Calcula tempo decorrido desde uma data (ex: "há 5 dias")
 */
export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'hoje';
  if (diffInDays === 1) return 'há 1 dia';
  if (diffInDays < 30) return `há ${diffInDays} dias`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return 'há 1 mês';
  if (diffInMonths < 12) return `há ${diffInMonths} meses`;
  
  const diffInYears = Math.floor(diffInMonths / 12);
  if (diffInYears === 1) return 'há 1 ano';
  return `há ${diffInYears} anos`;
};

/**
 * Formata data para DD/MM/YYYY
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formata data e hora para DD/MM/YYYY HH:mm
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Converte status do banco de dados para UI
 */
export const toUiStatus = (dbStatus: 'active' | 'inactive'): 'Ativo' | 'Inativo' => {
  return dbStatus === 'active' ? 'Ativo' : 'Inativo';
};

/**
 * Converte status da UI para banco de dados
 */
export const toDbStatus = (uiStatus: 'Ativo' | 'Inativo' | 'active' | 'inactive'): 'active' | 'inactive' => {
  return (uiStatus === 'Ativo' || uiStatus === 'active') ? 'active' : 'inactive';
};

/**
 * Normaliza array de senso, removendo valores nulos/undefined
 */
export const normalizeSenso = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.filter(Boolean);
  }
  if (input && typeof input === 'string') {
    return [input];
  }
  return [];
};
