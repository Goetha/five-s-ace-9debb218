export interface MasterModel {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  total_criteria: number;
  criteria_by_senso: {
    "1S": number;
    "2S": number;
    "3S": number;
    "4S": number;
    "5S": number;
  };
  companies_using: number;
  created_at: string;
  updated_at: string;
  criteria_ids: string[];
}

export interface ModelFilters {
  search: string;
  status: "Todos" | "Ativo" | "Inativo";
}
