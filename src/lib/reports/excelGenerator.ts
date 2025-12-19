import * as XLSX from 'xlsx';
import type { AuditReportData, CompanyReportData } from './reportTypes';
import { getScoreLevelLabel } from './reportDataFormatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function generateAuditExcel(data: AuditReportData): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Resumo da Auditoria
  const summaryData = [
    ['RELATÓRIO DE AUDITORIA 5S'],
    [],
    ['Empresa', data.company_name],
    ['Área', data.area_name],
    ['Ambiente', data.environment_name],
    ['Local', data.location_name],
    ['Auditor', data.auditor_name],
    ['Data', data.started_at ? format(new Date(data.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'],
    [],
    ['RESULTADO'],
    ['Pontuação', data.score !== null ? data.score.toFixed(1) : 'N/A'],
    ['Nível', getScoreLevelLabel(data.score_level)],
    ['Total de Perguntas', data.total_questions],
    ['Conforme (Sim)', data.total_yes],
    ['Não Conforme (Não)', data.total_no],
    [],
    ['PERFORMANCE POR SENSO'],
    ['Senso', 'Nome', 'Score (%)', 'Conforme', 'Total'],
    ...data.senso_scores.map(s => [s.senso, s.name, `${s.score.toFixed(1)}%`, s.conforme, s.total]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // Sheet 2: Detalhes dos Itens
  const itemsHeader = ['Pergunta', 'Resposta', 'Senso', 'Comentário'];
  const itemsData = data.items.map(item => [
    item.question,
    item.answer === true ? 'Sim' : item.answer === false ? 'Não' : 'Não respondido',
    item.senso.join(', '),
    item.comment || '',
  ]);

  const itemsSheet = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsData]);
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Detalhes');

  // Sheet 3: Não Conformidades
  const ncItems = data.items.filter(item => item.answer === false);
  const ncHeader = ['#', 'Pergunta', 'Senso', 'Comentário', 'Fotos'];
  const ncData = ncItems.map((item, idx) => [
    idx + 1,
    item.question,
    item.senso.join(', '),
    item.comment || '',
    item.photo_urls.length > 0 ? `${item.photo_urls.length} foto(s)` : 'Sem fotos',
  ]);

  const ncSheet = XLSX.utils.aoa_to_sheet([ncHeader, ...ncData]);
  XLSX.utils.book_append_sheet(workbook, ncSheet, 'Não Conformidades');

  // Save
  const fileName = `Auditoria_5S_${data.location_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function generateCompanyExcel(data: CompanyReportData): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Resumo Consolidado
  const summaryData = [
    ['RELATÓRIO CONSOLIDADO 5S'],
    [],
    ['Empresa', data.company_name],
    ['Total de Auditorias', data.total_audits],
    ['Pontuação Média', `${data.average_score.toFixed(1)}/10`],
    ['Locais Auditados', data.locations_ranking.length],
    [],
    ['MÉDIA POR SENSO'],
    ['Senso', 'Nome', 'Score (%)', 'Conforme', 'Total'],
    ...data.senso_averages.map(s => [s.senso, s.name, `${s.score.toFixed(1)}%`, s.conforme, s.total]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // Sheet 2: Ranking de Locais
  const rankingHeader = ['Posição', 'Local', 'Pontuação Média', 'Nº Auditorias'];
  const rankingData = data.locations_ranking.map((loc, idx) => [
    idx + 1,
    loc.location_name,
    loc.average_score.toFixed(1),
    loc.audit_count,
  ]);

  const rankingSheet = XLSX.utils.aoa_to_sheet([rankingHeader, ...rankingData]);
  XLSX.utils.book_append_sheet(workbook, rankingSheet, 'Ranking Locais');

  // Sheet 3: Lista de Auditorias
  const auditsHeader = ['Data', 'Local', 'Auditor', 'Pontuação'];
  const auditsData = data.audits.map(a => [
    a.date ? format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A',
    a.location_name,
    a.auditor_name,
    a.score !== null ? a.score.toFixed(1) : 'N/A',
  ]);

  const auditsSheet = XLSX.utils.aoa_to_sheet([auditsHeader, ...auditsData]);
  XLSX.utils.book_append_sheet(workbook, auditsSheet, 'Auditorias');

  // Save
  const fileName = `Relatorio_5S_${data.company_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
