import { supabase } from "@/integrations/supabase/client";
import type { 
  AuditReportData, 
  AuditItemReportData, 
  SensoScore, 
  CompanyReportData,
  AuditSummary,
  LocationRanking,
  SensoKey
} from "./reportTypes";
import { SENSO_CONFIG } from "./reportTypes";

export async function fetchAuditReportData(auditId: string): Promise<AuditReportData | null> {
  try {
    // Fetch audit with related data (without profiles join - no FK exists)
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select(`
        *,
        environments!audits_location_id_fkey(id, name, parent_id),
        companies!audits_company_id_fkey(name)
      `)
      .eq('id', auditId)
      .single();

    if (auditError || !audit) {
      console.error('Error fetching audit:', auditError);
      return null;
    }

    // Fetch auditor profile separately
    const { data: auditorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', audit.auditor_id)
      .single();

    // Fetch audit items with criterion info for senso
    const { data: items, error: itemsError } = await supabase
      .from('audit_items')
      .select(`
        *,
        company_criteria!audit_items_criterion_id_fkey(senso)
      `)
      .eq('audit_id', auditId)
      .order('created_at');

    if (itemsError) {
      console.error('Error fetching audit items:', itemsError);
      return null;
    }

    // Get location hierarchy
    const locationHierarchy = await getLocationHierarchy(audit.location_id);

    // Format items
    const formattedItems: AuditItemReportData[] = (items || []).map(item => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      comment: item.comment,
      photo_urls: item.photo_url ? JSON.parse(item.photo_url) : [],
      senso: (item.company_criteria as any)?.senso || []
    }));

    // Calculate senso scores
    const sensoScores = calculateSensoScores(formattedItems);

    return {
      audit_id: audit.id,
      company_name: (audit.companies as any)?.name || 'N/A',
      location_name: (audit.environments as any)?.name || 'N/A',
      area_name: locationHierarchy.area_name,
      environment_name: locationHierarchy.environment_name,
      auditor_name: auditorProfile?.full_name || 'N/A',
      started_at: audit.started_at || audit.created_at,
      completed_at: audit.completed_at,
      total_questions: audit.total_questions,
      total_yes: audit.total_yes,
      total_no: audit.total_no,
      score: audit.score,
      score_level: audit.score_level,
      observations: audit.observations,
      next_audit_date: audit.next_audit_date,
      items: formattedItems,
      senso_scores: sensoScores
    };
  } catch (error) {
    console.error('Error in fetchAuditReportData:', error);
    return null;
  }
}

export async function fetchCompanyReportData(
  companyId: string, 
  startDate?: string, 
  endDate?: string
): Promise<CompanyReportData | null> {
  try {
    // Fetch company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) return null;

    // Build query for audits (without profiles join - no FK exists)
    let query = supabase
      .from('audits')
      .select(`
        *,
        environments!audits_location_id_fkey(name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (startDate) {
      query = query.gte('completed_at', startDate);
    }
    if (endDate) {
      query = query.lte('completed_at', endDate);
    }

    const { data: audits, error: auditsError } = await query;
    if (auditsError) return null;

    // Fetch auditor profiles separately
    const auditorIds = [...new Set((audits || []).map(a => a.auditor_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', auditorIds);
    
    const profilesMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    // Fetch all items for these audits
    const auditIds = (audits || []).map(a => a.id);
    let allItems: AuditItemReportData[] = [];
    
    if (auditIds.length > 0) {
      const { data: items } = await supabase
        .from('audit_items')
        .select(`*, company_criteria!audit_items_criterion_id_fkey(senso)`)
        .in('audit_id', auditIds);

      allItems = (items || []).map(item => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        comment: item.comment,
        photo_urls: item.photo_url ? JSON.parse(item.photo_url) : [],
        senso: (item.company_criteria as any)?.senso || []
      }));
    }

    // Calculate averages
    const scores = (audits || []).filter(a => a.score !== null).map(a => a.score as number);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Calculate senso averages across all audits
    const sensoAverages = calculateSensoScores(allItems);

    // Format audit summaries
    const auditSummaries: AuditSummary[] = (audits || []).map(audit => ({
      id: audit.id,
      location_name: (audit.environments as any)?.name || 'N/A',
      date: audit.completed_at || audit.started_at || '',
      score: audit.score,
      auditor_name: profilesMap.get(audit.auditor_id) || 'N/A'
    }));

    // Calculate location rankings
    const locationMap = new Map<string, { scores: number[], name: string }>();
    for (const audit of (audits || [])) {
      const locId = audit.location_id;
      const locName = (audit.environments as any)?.name || 'N/A';
      if (!locationMap.has(locId)) {
        locationMap.set(locId, { scores: [], name: locName });
      }
      if (audit.score !== null) {
        locationMap.get(locId)!.scores.push(audit.score);
      }
    }

    const locationsRanking: LocationRanking[] = Array.from(locationMap.entries())
      .map(([id, data]) => ({
        location_id: id,
        location_name: data.name,
        average_score: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
        audit_count: data.scores.length
      }))
      .sort((a, b) => b.average_score - a.average_score);

    return {
      company_id: company.id,
      company_name: company.name,
      period_start: startDate || '',
      period_end: endDate || '',
      total_audits: (audits || []).length,
      average_score: averageScore,
      audits: auditSummaries,
      senso_averages: sensoAverages,
      locations_ranking: locationsRanking
    };
  } catch (error) {
    console.error('Error in fetchCompanyReportData:', error);
    return null;
  }
}

async function getLocationHierarchy(locationId: string): Promise<{ area_name: string; environment_name: string }> {
  try {
    const { data: envs } = await supabase
      .from('environments')
      .select('id, name, parent_id');

    if (!envs) return { area_name: 'N/A', environment_name: 'N/A' };

    const envMap = new Map(envs.map(e => [e.id, e]));
    const location = envMap.get(locationId);
    if (!location) return { area_name: 'N/A', environment_name: 'N/A' };

    const parent = location.parent_id ? envMap.get(location.parent_id) : null;
    const grandparent = parent?.parent_id ? envMap.get(parent.parent_id) : null;

    return {
      area_name: grandparent?.name || 'N/A',
      environment_name: parent?.name || 'N/A'
    };
  } catch {
    return { area_name: 'N/A', environment_name: 'N/A' };
  }
}

function calculateSensoScores(items: AuditItemReportData[]): SensoScore[] {
  const sensoMap: Record<string, { total: number; conforme: number }> = {
    '1S': { total: 0, conforme: 0 },
    '2S': { total: 0, conforme: 0 },
    '3S': { total: 0, conforme: 0 },
    '4S': { total: 0, conforme: 0 },
    '5S': { total: 0, conforme: 0 },
  };

  for (const item of items) {
    if (item.answer === null) continue;
    
    const sensoList = item.senso || [];
    for (const s of sensoList) {
      if (sensoMap[s]) {
        sensoMap[s].total++;
        if (item.answer === true) {
          sensoMap[s].conforme++;
        }
      }
    }
  }

  return Object.entries(sensoMap).map(([key, val]) => ({
    senso: key,
    name: SENSO_CONFIG[key as SensoKey]?.name || key,
    score: val.total > 0 ? (val.conforme / val.total) * 100 : 0,
    total: val.total,
    conforme: val.conforme
  }));
}

export function getScoreLevelLabel(level: string | null): string {
  switch (level) {
    case 'high': return 'Excelente';
    case 'medium': return 'Regular';
    case 'low': return 'Crítico';
    default: return 'N/A';
  }
}

export function getScoreLevelColor(level: string | null): string {
  switch (level) {
    case 'high': return '#10B981';
    case 'medium': return '#F59E0B';
    case 'low': return '#EF4444';
    default: return '#6B7280';
  }
}
