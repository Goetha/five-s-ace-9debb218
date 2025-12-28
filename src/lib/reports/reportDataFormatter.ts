import { supabase } from "@/integrations/supabase/client";
import type { 
  AuditReportData, 
  AuditItemReportData, 
  SensoScore, 
  CompanyReportData,
  ExtendedAuditSummary,
  LocationRanking,
  SensoKey,
  EnvironmentNode,
  NonConformityDetail
} from "./reportTypes";
import { SENSO_CONFIG, sanitizeTextForPDF } from "./reportTypes";

// Build environment tree from flat list
function buildEnvironmentTree(environments: Array<{ id: string; name: string; parent_id: string | null }>): EnvironmentNode[] {
  const envMap = new Map<string, EnvironmentNode>();
  
  // Create nodes
  for (const env of environments) {
    envMap.set(env.id, {
      id: env.id,
      name: sanitizeTextForPDF(env.name),
      parent_id: env.parent_id,
      children: [],
      level: 0
    });
  }
  
  // Build tree
  const roots: EnvironmentNode[] = [];
  for (const node of envMap.values()) {
    if (node.parent_id && envMap.has(node.parent_id)) {
      envMap.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  }
  
  // Set levels
  function setLevels(node: EnvironmentNode, level: number) {
    node.level = level;
    for (const child of node.children) {
      setLevels(child, level + 1);
    }
  }
  roots.forEach(r => setLevels(r, 0));
  
  return roots;
}

// Get full location path
function getLocationPath(
  locationId: string, 
  envMap: Map<string, { id: string; name: string; parent_id: string | null }>
): string {
  const parts: string[] = [];
  let currentId: string | null = locationId;
  
  while (currentId && envMap.has(currentId)) {
    const env = envMap.get(currentId)!;
    parts.unshift(sanitizeTextForPDF(env.name));
    currentId = env.parent_id;
  }
  
  return parts.join(' > ');
}

export async function fetchAuditReportData(auditId: string): Promise<AuditReportData | null> {
  try {
    // Fetch audit with related data
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

    // Fetch all environments for path building
    const { data: allEnvs } = await supabase
      .from('environments')
      .select('id, name, parent_id')
      .eq('company_id', audit.company_id);

    const envMap = new Map((allEnvs || []).map(e => [e.id, e]));

    // Fetch audit items with criterion info
    const { data: items, error: itemsError } = await supabase
      .from('audit_items')
      .select(`
        *,
        company_criteria!audit_items_criterion_id_fkey(name, senso, tags)
      `)
      .eq('audit_id', auditId)
      .order('created_at');

    if (itemsError) {
      console.error('Error fetching audit items:', itemsError);
      return null;
    }

    // Get location hierarchy
    const locationHierarchy = await getLocationHierarchy(audit.location_id);
    const fullPath = getLocationPath(audit.location_id, envMap);

    // Format items
    const formattedItems: AuditItemReportData[] = (items || []).map(item => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      comment: item.comment,
      photo_urls: item.photo_url ? JSON.parse(item.photo_url) : [],
      senso: (item.company_criteria as any)?.senso || [],
      criterion_name: (item.company_criteria as any)?.name || item.question,
      tags: (item.company_criteria as any)?.tags || []
    }));

    // Calculate senso scores
    const sensoScores = calculateSensoScores(formattedItems);

    return {
      audit_id: audit.id,
      company_name: sanitizeTextForPDF((audit.companies as any)?.name || 'N/A'),
      location_name: sanitizeTextForPDF((audit.environments as any)?.name || 'N/A'),
      area_name: sanitizeTextForPDF(locationHierarchy.area_name),
      environment_name: sanitizeTextForPDF(locationHierarchy.environment_name),
      full_location_path: fullPath || 'N/A',
      auditor_name: sanitizeTextForPDF(auditorProfile?.full_name || 'N/A'),
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

    // Fetch all environments for this company
    const { data: environments } = await supabase
      .from('environments')
      .select('id, name, parent_id')
      .eq('company_id', companyId)
      .eq('status', 'active');

    const envMap = new Map((environments || []).map(e => [e.id, e]));
    const environmentTree = buildEnvironmentTree(environments || []);

    // Build query for audits
    let query = supabase
      .from('audits')
      .select(`
        *,
        environments!audits_location_id_fkey(id, name, parent_id)
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

    // Fetch auditor profiles
    const auditorIds = [...new Set((audits || []).map(a => a.auditor_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', auditorIds);
    
    const profilesMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    // Fetch all items for these audits with criterion details
    const auditIds = (audits || []).map(a => a.id);
    let allItems: Array<AuditItemReportData & { audit_id: string }> = [];
    
    if (auditIds.length > 0) {
      const { data: items } = await supabase
        .from('audit_items')
        .select(`
          *,
          company_criteria!audit_items_criterion_id_fkey(name, senso, tags)
        `)
        .in('audit_id', auditIds);

      allItems = (items || []).map(item => ({
        id: item.id,
        audit_id: item.audit_id,
        question: item.question,
        answer: item.answer,
        comment: item.comment,
        photo_urls: item.photo_url ? JSON.parse(item.photo_url) : [],
        senso: (item.company_criteria as any)?.senso || [],
        criterion_name: (item.company_criteria as any)?.name || item.question,
        tags: (item.company_criteria as any)?.tags || []
      }));
    }

    // Build non-conformities list
    const nonConformities: NonConformityDetail[] = [];
    const auditMap = new Map((audits || []).map(a => [a.id, a]));
    
    for (const item of allItems) {
      if (item.answer === false) {
        const audit = auditMap.get(item.audit_id);
        if (audit) {
          nonConformities.push({
            audit_id: audit.id,
            audit_date: audit.completed_at || audit.started_at || '',
            location_path: getLocationPath(audit.location_id, envMap),
            location_name: sanitizeTextForPDF((audit.environments as any)?.name || 'N/A'),
            auditor_name: sanitizeTextForPDF(profilesMap.get(audit.auditor_id) || 'N/A'),
            criterion_name: item.criterion_name || item.question,
            question: item.question,
            comment: item.comment,
            photo_urls: item.photo_urls,
            senso: item.senso
          });
        }
      }
    }

    // Calculate totals
    const totalConformities = allItems.filter(i => i.answer === true).length;
    const totalNonConformities = allItems.filter(i => i.answer === false).length;

    // Calculate averages
    const scores = (audits || []).filter(a => a.score !== null).map(a => a.score as number);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Calculate senso averages
    const sensoAverages = calculateSensoScores(allItems);

    // Format extended audit summaries
    const auditSummaries: ExtendedAuditSummary[] = (audits || []).map(audit => ({
      id: audit.id,
      location_id: audit.location_id,
      location_name: sanitizeTextForPDF((audit.environments as any)?.name || 'N/A'),
      location_path: getLocationPath(audit.location_id, envMap),
      date: audit.completed_at || audit.started_at || '',
      score: audit.score,
      score_level: audit.score_level,
      auditor_name: sanitizeTextForPDF(profilesMap.get(audit.auditor_id) || 'N/A'),
      total_questions: audit.total_questions,
      total_yes: audit.total_yes,
      total_no: audit.total_no,
      observations: audit.observations
    }));

    // Calculate location rankings
    const locationMap = new Map<string, { scores: number[], name: string, path: string }>();
    for (const audit of (audits || [])) {
      const locId = audit.location_id;
      const locName = sanitizeTextForPDF((audit.environments as any)?.name || 'N/A');
      const locPath = getLocationPath(locId, envMap);
      
      if (!locationMap.has(locId)) {
        locationMap.set(locId, { scores: [], name: locName, path: locPath });
      }
      if (audit.score !== null) {
        locationMap.get(locId)!.scores.push(audit.score);
      }
    }

    const locationsRanking: LocationRanking[] = Array.from(locationMap.entries())
      .map(([id, data]) => ({
        location_id: id,
        location_name: data.name,
        location_path: data.path,
        average_score: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
        audit_count: data.scores.length
      }))
      .sort((a, b) => b.average_score - a.average_score);

    return {
      company_id: company.id,
      company_name: sanitizeTextForPDF(company.name),
      period_start: startDate || '',
      period_end: endDate || '',
      total_audits: (audits || []).length,
      average_score: averageScore,
      audits: auditSummaries,
      senso_averages: sensoAverages,
      locations_ranking: locationsRanking,
      environment_tree: environmentTree,
      non_conformities: nonConformities,
      total_conformities: totalConformities,
      total_non_conformities: totalNonConformities
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
    case 'low': return 'Critico';
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

// Fetch image as base64 for embedding in PDF
export async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
