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
  NonConformityDetail,
  EnvironmentSensoRow
} from "./reportTypes";
import { SENSO_CONFIG, sanitizeTextForPDF } from "./reportTypes";

// Helper to safely parse photo_url which can be a JSON array string or a plain URL string
function safeParsePhotoUrls(photoUrl: string | null | undefined): string[] {
  if (!photoUrl) return [];
  try {
    const parsed = JSON.parse(photoUrl);
    return Array.isArray(parsed) ? parsed : [photoUrl];
  } catch {
    // If it's not valid JSON, treat it as a single URL
    return [photoUrl];
  }
}

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

// Build environment senso table with scores per environment
// Follows 3-tier hierarchy: Root (company node, level 0) > Setor (level 1) > Local (level 2)
// Only includes level 1 (Setor) and level 2 (Local) in the final output
function buildEnvironmentSensoTable(
  environments: Array<{ id: string; name: string; parent_id: string | null }>,
  audits: Array<{ id: string; location_id: string; score: number | null }>,
  items: Array<AuditItemReportData & { audit_id: string }>
): EnvironmentSensoRow[] {
  const envMap = new Map(environments.map(e => [e.id, e]));
  
  // Find root environments (parent_id is null - these are company nodes, level 0)
  const rootEnvs = environments.filter(e => !e.parent_id);
  const rootIds = new Set(rootEnvs.map(e => e.id));
  
  // Calculate level for each environment in 3-tier model
  // Level 0: Root (company node, parent_id = null)
  // Level 1: Setor (direct child of root)
  // Level 2: Local (child of setor)
  function getLevel(envId: string): number {
    const env = envMap.get(envId);
    if (!env) return -1;
    
    // If no parent, it's root (level 0)
    if (!env.parent_id) return 0;
    
    // If parent is root, it's level 1 (Setor)
    if (rootIds.has(env.parent_id)) return 1;
    
    // Otherwise it's level 2 (Local)
    // We don't support deeper levels in the 3-tier model
    const parentEnv = envMap.get(env.parent_id);
    if (parentEnv && parentEnv.parent_id && rootIds.has(parentEnv.parent_id)) {
      return 2;
    }
    
    // If we get here, it's deeper than level 2 - skip these
    return 3;
  }
  
  // Group items by audit location
  const auditLocationMap = new Map<string, string>();
  for (const audit of audits) {
    auditLocationMap.set(audit.id, audit.location_id);
  }
  
  // Group items by location
  const locationItemsMap = new Map<string, Array<AuditItemReportData & { audit_id: string }>>();
  for (const item of items) {
    const locationId = auditLocationMap.get(item.audit_id);
    if (locationId) {
      if (!locationItemsMap.has(locationId)) {
        locationItemsMap.set(locationId, []);
      }
      locationItemsMap.get(locationId)!.push(item);
    }
  }
  
  // Calculate senso scores for each environment (including aggregation from children)
  function calculateEnvSensoScores(envId: string): {
    '1S': { total: number; conforme: number };
    '2S': { total: number; conforme: number };
    '3S': { total: number; conforme: number };
    '4S': { total: number; conforme: number };
    '5S': { total: number; conforme: number };
  } {
    const scores = {
      '1S': { total: 0, conforme: 0 },
      '2S': { total: 0, conforme: 0 },
      '3S': { total: 0, conforme: 0 },
      '4S': { total: 0, conforme: 0 },
      '5S': { total: 0, conforme: 0 },
    };
    
    // Items from this location
    const locationItems = locationItemsMap.get(envId) || [];
    for (const item of locationItems) {
      if (item.answer === null) continue;
      for (const s of item.senso || []) {
        if (scores[s as keyof typeof scores]) {
          scores[s as keyof typeof scores].total++;
          if (item.answer === true) {
            scores[s as keyof typeof scores].conforme++;
          }
        }
      }
    }
    
    // Add scores from children (all levels)
    for (const env of environments) {
      if (env.parent_id === envId) {
        const childScores = calculateEnvSensoScores(env.id);
        for (const s of ['1S', '2S', '3S', '4S', '5S'] as const) {
          scores[s].total += childScores[s].total;
          scores[s].conforme += childScores[s].conforme;
        }
      }
    }
    
    return scores;
  }
  
  // Build flat list ordered by hierarchy, filtering out level 0 (root) and level 3+ (too deep)
  const rows: EnvironmentSensoRow[] = [];
  
  function addEnvAndChildren(envId: string | null, parentLevel: number) {
    const children = environments.filter(e => e.parent_id === envId);
    for (const child of children) {
      const level = getLevel(child.id);
      
      // Skip root (level 0) and anything deeper than level 2
      if (level === 0 || level > 2) {
        // But still recurse to find valid children
        addEnvAndChildren(child.id, level);
        continue;
      }
      
      const sensoData = calculateEnvSensoScores(child.id);
      
      const sensoScores = {
        '1S': sensoData['1S'].total > 0 ? (sensoData['1S'].conforme / sensoData['1S'].total) * 100 : null,
        '2S': sensoData['2S'].total > 0 ? (sensoData['2S'].conforme / sensoData['2S'].total) * 100 : null,
        '3S': sensoData['3S'].total > 0 ? (sensoData['3S'].conforme / sensoData['3S'].total) * 100 : null,
        '4S': sensoData['4S'].total > 0 ? (sensoData['4S'].conforme / sensoData['4S'].total) * 100 : null,
        '5S': sensoData['5S'].total > 0 ? (sensoData['5S'].conforme / sensoData['5S'].total) * 100 : null,
      };
      
      const totalItems = Object.values(sensoData).reduce((sum, s) => sum + s.total, 0);
      const totalConforme = Object.values(sensoData).reduce((sum, s) => sum + s.conforme, 0);
      const averageScore = totalItems > 0 ? (totalConforme / totalItems) * 100 : null;
      
      rows.push({
        id: child.id,
        name: sanitizeTextForPDF(child.name),
        level,
        parent_id: child.parent_id,
        senso_scores: sensoScores,
        average_score: averageScore,
        has_audits: locationItemsMap.has(child.id) || environments.some(e => e.parent_id === child.id)
      });
      
      // Recursively add children
      addEnvAndChildren(child.id, level);
    }
  }
  
  // Start from root (null parent)
  addEnvAndChildren(null, -1);
  
  return rows;
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
      photo_urls: safeParsePhotoUrls(item.photo_url),
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
      sector_name: sanitizeTextForPDF(locationHierarchy.sector_name),
      local_name: sanitizeTextForPDF(locationHierarchy.local_name),
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
        photo_urls: safeParsePhotoUrls(item.photo_url),
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

    // Build environment senso table
    const environmentSensoTable = buildEnvironmentSensoTable(
      environments || [],
      audits || [],
      allItems
    );

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
      environment_senso_table: environmentSensoTable,
      non_conformities: nonConformities,
      total_conformities: totalConformities,
      total_non_conformities: totalNonConformities
    };
  } catch (error) {
    console.error('Error in fetchCompanyReportData:', error);
    return null;
  }
}

// Get hierarchy following 3-level structure: Empresa > Setor (level 1) > Local (level 2)
// The location (Local) is level 2, its parent (Setor) is level 1, and above that is the company root (level 0)
async function getLocationHierarchy(locationId: string): Promise<{ sector_name: string; local_name: string }> {
  try {
    const { data: envs } = await supabase
      .from('environments')
      .select('id, name, parent_id');

    if (!envs) return { sector_name: 'N/A', local_name: 'N/A' };

    const envMap = new Map(envs.map(e => [e.id, e]));
    const location = envMap.get(locationId);
    if (!location) return { sector_name: 'N/A', local_name: 'N/A' };

    // Walk up the hierarchy to find the correct levels
    // In 3-level: Local -> Setor -> Root (company node)
    const parent = location.parent_id ? envMap.get(location.parent_id) : null;
    
    // Check if parent is the sector (level 1) or if we need to go one more level up
    // Sector should have parent_id pointing to root (which has null parent_id or is the company root)
    if (parent) {
      const grandparent = parent.parent_id ? envMap.get(parent.parent_id) : null;
      
      // If grandparent exists and has no parent (is root), then:
      // - grandparent = root (company node)
      // - parent = setor (level 1)
      // - location = local (level 2)
      if (grandparent && !grandparent.parent_id) {
        return {
          sector_name: parent.name || 'N/A',
          local_name: location.name || 'N/A'
        };
      }
      
      // If parent has no parent_id, parent is root, location is sector
      if (!parent.parent_id) {
        return {
          sector_name: location.name || 'N/A',
          local_name: 'N/A' // This is a sector, not a local
        };
      }
      
      // Otherwise, parent is the sector
      return {
        sector_name: parent.name || 'N/A',
        local_name: location.name || 'N/A'
      };
    }

    // Location has no parent, it's likely a root or sector
    return { sector_name: location.name || 'N/A', local_name: 'N/A' };
  } catch {
    return { sector_name: 'N/A', local_name: 'N/A' };
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
    // Try using an Image element for better CORS handling
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } catch {
          // Canvas tainted by cross-origin data, try fetch as fallback
          fetchImageViaFetch(url).then(resolve);
        }
      };
      
      img.onerror = () => {
        // If image fails to load, try fetch as fallback
        fetchImageViaFetch(url).then(resolve);
      };
      
      // Add cache-busting for external URLs
      const separator = url.includes('?') ? '&' : '?';
      img.src = url + separator + 't=' + Date.now();
    });
  } catch {
    return null;
  }
}

// Fallback fetch method for images
async function fetchImageViaFetch(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn('Failed to fetch image for PDF:', url);
    return null;
  }
}
