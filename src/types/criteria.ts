export type SensoType = "1S" | "2S" | "3S" | "4S" | "5S";
export type ScoreType = "0-10" | "C/NC" | "0-5" | "Percentual";
export type CriteriaStatus = "Ativo" | "Inativo";
export type CriteriaTag = "Industrial" | "Escritório" | "Banheiro" | "Refeitório" | "Almoxarifado" | "Todos";

export interface Criteria {
  id: string;
  name: string;
  senso: SensoType;
  scoreType: ScoreType;
  weight: number;
  tags: CriteriaTag[];
  companiesUsing: number;
  modelsUsing: number;
  status: CriteriaStatus;
}

export interface CriteriaFilters {
  search: string;
  senso: SensoType | "Todos";
  scoreType: ScoreType | "Todos";
  weightRange: "Todos" | "Alto" | "Médio" | "Baixo";
  tags: CriteriaTag[];
  status: "Todos" | CriteriaStatus;
}
