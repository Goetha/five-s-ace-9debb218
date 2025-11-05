export type SensoType = "1S" | "2S" | "3S" | "4S" | "5S";
export type ScoreType = "0-10" | "conform-non-conform" | "0-5" | "percentage";
export type CriteriaStatus = "Ativo" | "Inativo";
export type CriteriaTag = "Industrial" | "Escritório" | "Banheiro" | "Refeitório" | "Almoxarifado" | "Todos";

export interface Criteria {
  id: string;
  name: string;
  senso: SensoType[]; // múltiplos sensos
  scoreType: ScoreType;
  tags: CriteriaTag[];
  companiesUsing: number;
  modelsUsing: number;
  status: CriteriaStatus;
}

export interface CriteriaFilters {
  search: string;
  senso: SensoType | "Todos";
  scoreType: ScoreType | "Todos";
  tags: CriteriaTag[];
  status: "Todos" | CriteriaStatus;
}
