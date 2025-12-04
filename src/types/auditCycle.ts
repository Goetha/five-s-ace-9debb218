export interface AuditCycle {
  id: string;
  company_id: string;
  auditor_id: string;
  status: 'in_progress' | 'completed';
  total_locations: number;
  completed_locations: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditCycleWithDetails extends AuditCycle {
  company_name: string;
  auditor_name: string;
  audited_location_ids: string[];
}

export interface CycleLocation {
  id: string;
  name: string;
  area_name: string;
  environment_name: string;
  is_audited: boolean;
  has_criteria?: boolean;
}
