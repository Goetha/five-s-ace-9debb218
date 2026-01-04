import jsPDF from 'jspdf';
import type { CompanyReportData, EnvironmentSensoRow, NonConformityDetail } from './reportTypes';
import { SENSO_CONFIG, SensoKey, sanitizeTextForPDF } from './reportTypes';
import { getScoreLevelLabel, fetchImageAsBase64 } from './reportDataFormatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Constants
const PAGE_MARGIN = 15;
const MAX_IMAGE_WIDTH = 55;
const MAX_IMAGE_HEIGHT = 40;

interface PDFHelpers {
  pdf: jsPDF;
  pageWidth: number;
  pageHeight: number;
  yPos: number;
  currentPage: number;
}

// SENSO descriptions for table
const SENSO_DESCRIPTIONS: Record<string, string> = {
  '1S': 'Seiri (Utilizacao)',
  '2S': 'Seiton (Organizacao)',
  '3S': 'Seiso (Limpeza)',
  '4S': 'Seiketsu (Padronizacao)',
  '5S': 'Shitsuke (Disciplina)',
};

function createPDFHelpers(): PDFHelpers {
  const pdf = new jsPDF('p', 'mm', 'a4');
  return {
    pdf,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
    yPos: PAGE_MARGIN,
    currentPage: 1
  };
}

function addText(
  helpers: PDFHelpers, 
  text: string, 
  x: number, 
  y: number, 
  options?: { 
    fontSize?: number; 
    fontStyle?: 'normal' | 'bold'; 
    color?: string; 
    maxWidth?: number;
    align?: 'left' | 'center' | 'right';
  }
) {
  const { fontSize = 10, fontStyle = 'normal', color = '#000000', maxWidth, align = 'left' } = options || {};
  const { pdf, pageWidth } = helpers;
  
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', fontStyle);
  pdf.setTextColor(color);
  
  const safeText = sanitizeTextForPDF(text);
  
  let finalX = x;
  if (align === 'center') {
    const textWidth = pdf.getTextWidth(safeText);
    finalX = (pageWidth - textWidth) / 2;
  } else if (align === 'right') {
    const textWidth = pdf.getTextWidth(safeText);
    finalX = pageWidth - PAGE_MARGIN - textWidth;
  }
  
  if (maxWidth) {
    pdf.text(safeText, finalX, y, { maxWidth });
  } else {
    pdf.text(safeText, finalX, y);
  }
}

function addPageFooter(helpers: PDFHelpers) {
  const { pdf, pageWidth, pageHeight, currentPage } = helpers;
  const footerY = pageHeight - 8;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#9CA3AF');
  
  pdf.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`, PAGE_MARGIN, footerY);
  pdf.text(`Pagina ${currentPage}`, pageWidth / 2 - 10, footerY);
  pdf.text('Sistema 5S Manager', pageWidth - PAGE_MARGIN - 35, footerY);
}

function checkPageBreak(helpers: PDFHelpers, neededSpace: number): boolean {
  if (helpers.yPos + neededSpace > helpers.pageHeight - PAGE_MARGIN - 10) {
    addPageFooter(helpers);
    helpers.pdf.addPage();
    helpers.currentPage++;
    helpers.yPos = PAGE_MARGIN;
    return true;
  }
  return false;
}

function newPage(helpers: PDFHelpers) {
  addPageFooter(helpers);
  helpers.pdf.addPage();
  helpers.currentPage++;
  helpers.yPos = PAGE_MARGIN;
}

// ============= PAGE 1: COVER PAGE =============
function addCoverPage(helpers: PDFHelpers, data: CompanyReportData) {
  const { pdf, pageWidth, pageHeight } = helpers;
  
  // Background gradient (simulated with multiple rectangles)
  const gradientSteps = 20;
  const stepHeight = pageHeight / gradientSteps;
  
  for (let i = 0; i < gradientSteps; i++) {
    // Gradient from #1E40AF (dark blue) to #7C3AED (purple)
    const ratio = i / gradientSteps;
    const r = Math.round(30 + ratio * (124 - 30));
    const g = Math.round(64 + ratio * (58 - 64));
    const b = Math.round(175 + ratio * (237 - 175));
    pdf.setFillColor(r, g, b);
    pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
  }
  
  // Decorative circle at bottom right
  pdf.setFillColor(255, 255, 255, 0.1);
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.5);
  pdf.circle(pageWidth - 30, pageHeight - 50, 80, 'S');
  pdf.circle(pageWidth - 30, pageHeight - 50, 60, 'S');
  
  // Main title "5S"
  helpers.yPos = pageHeight * 0.35;
  pdf.setFontSize(100);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  const title5S = '5S';
  const titleWidth = pdf.getTextWidth(title5S);
  pdf.text(title5S, (pageWidth - titleWidth) / 2, helpers.yPos);
  
  // Subtitle
  helpers.yPos += 25;
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Relatorio Consolidado', 0, helpers.yPos, { align: 'center' });
  
  // Company name
  helpers.yPos += 30;
  pdf.setFontSize(18);
  pdf.setTextColor('#E0E7FF');
  const companyName = sanitizeTextForPDF(data.company_name);
  pdf.text(companyName, pageWidth / 2, helpers.yPos, { align: 'center' });
  
  // Period
  helpers.yPos += 15;
  pdf.setFontSize(12);
  pdf.setTextColor('#C7D2FE');
  const periodStart = data.period_start ? format(new Date(data.period_start), 'dd/MM/yyyy', { locale: ptBR }) : 'Inicio';
  const periodEnd = data.period_end ? format(new Date(data.period_end), 'dd/MM/yyyy', { locale: ptBR }) : 'Atual';
  pdf.text(`Periodo: ${periodStart} - ${periodEnd}`, pageWidth / 2, helpers.yPos, { align: 'center' });
  
  // Generation date at bottom
  pdf.setFontSize(10);
  pdf.setTextColor('#A5B4FC');
  const genDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  pdf.text(`Gerado em ${genDate}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
}

// ============= PAGE 2: EXECUTIVE SUMMARY =============
function addExecutiveSummary(helpers: PDFHelpers, data: CompanyReportData) {
  const { pdf, pageWidth } = helpers;
  
  helpers.yPos = PAGE_MARGIN + 5;
  
  // Section header with icon
  pdf.setFillColor('#3B82F6');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 12, 2, 2, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text('Resumo Executivo', PAGE_MARGIN + 8, helpers.yPos + 8);
  helpers.yPos += 20;
  
  // Card dimensions
  const cardWidth = pageWidth - 2 * PAGE_MARGIN;
  const cardHeight = 32;
  const cardSpacing = 8;
  
  // Card 1: Auditorias Realizadas (Blue)
  pdf.setFillColor('#3B82F6');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, cardWidth, cardHeight, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setTextColor('#DBEAFE');
  pdf.text('Auditorias Realizadas', PAGE_MARGIN + 10, helpers.yPos + 12);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text(String(data.total_audits), PAGE_MARGIN + 10, helpers.yPos + 26);
  helpers.yPos += cardHeight + cardSpacing;
  
  // Card 2: Média Geral de Desempenho (Orange)
  pdf.setFillColor('#F59E0B');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, cardWidth, cardHeight, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setTextColor('#FEF3C7');
  pdf.text('Media Geral de Desempenho', PAGE_MARGIN + 10, helpers.yPos + 12);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  const avgScorePercent = (data.average_score * 10).toFixed(1);
  pdf.text(`${avgScorePercent}%`, PAGE_MARGIN + 10, helpers.yPos + 26);
  helpers.yPos += cardHeight + cardSpacing;
  
  // Card 3: Locais Auditados (Yellow/Gold)
  pdf.setFillColor('#EAB308');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, cardWidth, cardHeight, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setTextColor('#FEF9C3');
  pdf.text('Locais Auditados', PAGE_MARGIN + 10, helpers.yPos + 12);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text(String(data.locations_ranking.length), PAGE_MARGIN + 10, helpers.yPos + 26);
  helpers.yPos += cardHeight + cardSpacing;
  
  // Card 4: Conformidades Encontradas (Green)
  pdf.setFillColor('#10B981');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, cardWidth, cardHeight, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setTextColor('#D1FAE5');
  pdf.text('Conformidades Encontradas', PAGE_MARGIN + 10, helpers.yPos + 12);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text(String(data.total_conformities), PAGE_MARGIN + 10, helpers.yPos + 26);
  helpers.yPos += cardHeight + cardSpacing + 5;
  
  // Non-conformities section
  pdf.setFillColor('#FEF2F2');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, cardWidth, 45, 3, 3, 'F');
  
  // Red accent bar
  pdf.setFillColor('#EF4444');
  pdf.rect(PAGE_MARGIN, helpers.yPos, 4, 45, 'F');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#EF4444');
  pdf.text('Nao Conformidades', PAGE_MARGIN + 12, helpers.yPos + 12);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#7F1D1D');
  
  const totalItems = data.total_conformities + data.total_non_conformities;
  const conformityRate = totalItems > 0 ? ((data.total_conformities / totalItems) * 100).toFixed(1) : '0';
  
  const ncText = `Total de ${data.total_non_conformities} nao conformidades identificadas durante as auditorias, representando uma taxa de conformidade de ${conformityRate}% em relacao ao total de itens auditados.`;
  const lines = pdf.splitTextToSize(ncText, cardWidth - 20);
  pdf.text(lines, PAGE_MARGIN + 12, helpers.yPos + 22);
  
  helpers.yPos += 55;
}

// ============= PAGE 3: SENSO PERFORMANCE =============
function addSensoPerformance(helpers: PDFHelpers, data: CompanyReportData) {
  const { pdf, pageWidth } = helpers;
  
  helpers.yPos = PAGE_MARGIN + 5;
  
  // Section header
  pdf.setFillColor('#3B82F6');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 12, 2, 2, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text('Desempenho por Senso 5S', PAGE_MARGIN + 8, helpers.yPos + 8);
  helpers.yPos += 22;
  
  // Horizontal bar chart
  const chartWidth = pageWidth - 2 * PAGE_MARGIN;
  const barWidth = (chartWidth - 40) / 5;
  const maxBarHeight = 50;
  const barStartY = helpers.yPos + maxBarHeight;
  
  const sensoKeys = ['1S', '2S', '3S', '4S', '5S'] as const;
  
  sensoKeys.forEach((sensoKey, i) => {
    const sensoData = data.senso_averages.find(s => s.senso === sensoKey);
    const score = sensoData?.score || 0;
    const barHeight = (score / 100) * maxBarHeight;
    
    const x = PAGE_MARGIN + 20 + i * barWidth;
    const color = SENSO_CONFIG[sensoKey].color;
    
    // Draw bar
    pdf.setFillColor(color);
    pdf.roundedRect(x, barStartY - barHeight, barWidth - 8, barHeight, 2, 2, 'F');
    
    // Percentage above bar
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(color);
    const pctText = `${Math.round(score)}%`;
    const pctWidth = pdf.getTextWidth(pctText);
    pdf.text(pctText, x + (barWidth - 8) / 2 - pctWidth / 2, barStartY - barHeight - 3);
    
    // Label below bar
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#374151');
    pdf.text(sensoKey, x + (barWidth - 8) / 2 - 3, barStartY + 8);
  });
  
  helpers.yPos = barStartY + 18;
  
  // Detail table
  const tableWidth = pageWidth - 2 * PAGE_MARGIN;
  const colWidths = [25, 75, 35, 35];
  
  // Table header
  pdf.setFillColor('#1E3A5F');
  pdf.rect(PAGE_MARGIN, helpers.yPos, tableWidth, 10, 'F');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  
  let colX = PAGE_MARGIN + 3;
  pdf.text('Senso', colX, helpers.yPos + 7);
  colX += colWidths[0];
  pdf.text('Descricao', colX, helpers.yPos + 7);
  colX += colWidths[1];
  pdf.text('Desempenho', colX, helpers.yPos + 7);
  colX += colWidths[2];
  pdf.text('Auditorias', colX, helpers.yPos + 7);
  
  helpers.yPos += 10;
  
  // Table rows
  sensoKeys.forEach((sensoKey, i) => {
    const sensoData = data.senso_averages.find(s => s.senso === sensoKey);
    const score = sensoData?.score || 0;
    const conforme = sensoData?.conforme || 0;
    const total = sensoData?.total || 0;
    const color = SENSO_CONFIG[sensoKey].color;
    
    // Row background
    const bgColor = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    pdf.setFillColor(bgColor);
    pdf.rect(PAGE_MARGIN, helpers.yPos, tableWidth, 12, 'F');
    
    colX = PAGE_MARGIN + 3;
    
    // Senso badge
    pdf.setFillColor(color);
    pdf.roundedRect(colX, helpers.yPos + 2, 14, 8, 2, 2, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#FFFFFF');
    pdf.text(sensoKey, colX + 4, helpers.yPos + 7.5);
    colX += colWidths[0];
    
    // Description
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#374151');
    pdf.text(SENSO_DESCRIPTIONS[sensoKey] || '', colX, helpers.yPos + 7.5);
    colX += colWidths[1];
    
    // Performance indicator
    pdf.setFillColor(color);
    pdf.circle(colX + 5, helpers.yPos + 6, 3, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(color);
    pdf.text(`${Math.round(score)}%`, colX + 12, helpers.yPos + 7.5);
    colX += colWidths[2];
    
    // Auditorias fraction
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#6B7280');
    pdf.text(`${conforme}/${total}`, colX + 5, helpers.yPos + 7.5);
    
    helpers.yPos += 12;
  });
  
  helpers.yPos += 10;
  
  // Legend
  const legendItems = [
    { color: '#10B981', label: 'Excelente (>=80%)' },
    { color: '#F59E0B', label: 'Atencao (50-79%)' },
    { color: '#EF4444', label: 'Critico (<50%)' },
  ];
  
  let legendX = PAGE_MARGIN;
  legendItems.forEach(item => {
    pdf.setFillColor(item.color);
    pdf.circle(legendX + 3, helpers.yPos, 3, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor('#6B7280');
    pdf.text(item.label, legendX + 8, helpers.yPos + 2);
    legendX += 55;
  });
  
  helpers.yPos += 15;
}

// ============= PAGE 4: LOCATION RANKING =============
function addLocationRanking(helpers: PDFHelpers, data: CompanyReportData) {
  const { pdf, pageWidth } = helpers;
  
  helpers.yPos = PAGE_MARGIN + 5;
  
  // Section header
  pdf.setFillColor('#3B82F6');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 12, 2, 2, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text('Ranking de Locais', PAGE_MARGIN + 8, helpers.yPos + 8);
  helpers.yPos += 18;
  
  // Subtitle
  pdf.setFontSize(9);
  pdf.setTextColor('#6B7280');
  pdf.text('Classificacao dos locais por desempenho medio nas auditorias realizadas.', PAGE_MARGIN, helpers.yPos);
  helpers.yPos += 12;
  
  const itemHeight = 18;
  const maxItems = Math.min(data.locations_ranking.length, 12);
  
  for (let i = 0; i < maxItems; i++) {
    checkPageBreak(helpers, itemHeight + 5);
    
    const loc = data.locations_ranking[i];
    const itemY = helpers.yPos;
    
    // Background
    const bgColor = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    pdf.setFillColor(bgColor);
    pdf.roundedRect(PAGE_MARGIN, itemY, pageWidth - 2 * PAGE_MARGIN, itemHeight, 2, 2, 'F');
    
    // Position badge
    let badgeColor = '#3B82F6';
    if (i === 0) badgeColor = '#FFD700';
    else if (i === 1) badgeColor = '#C0C0C0';
    else if (i === 2) badgeColor = '#CD7F32';
    
    pdf.setFillColor(badgeColor);
    pdf.circle(PAGE_MARGIN + 12, itemY + itemHeight / 2, 6, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#FFFFFF');
    const posText = String(i + 1);
    const posWidth = pdf.getTextWidth(posText);
    pdf.text(posText, PAGE_MARGIN + 12 - posWidth / 2, itemY + itemHeight / 2 + 3);
    
    // Location name
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#1F2937');
    const locName = loc.location_name.length > 40 ? loc.location_name.substring(0, 37) + '...' : loc.location_name;
    pdf.text(locName, PAGE_MARGIN + 25, itemY + 8);
    
    // Audit count
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#6B7280');
    pdf.text(`Auditorias: ${loc.audit_count} | Media: ${(loc.average_score * 10).toFixed(1)}%`, PAGE_MARGIN + 25, itemY + 14);
    
    // Score on right
    const scorePercent = (loc.average_score * 10);
    let scoreColor = '#EF4444';
    if (scorePercent >= 80) scoreColor = '#10B981';
    else if (scorePercent >= 50) scoreColor = '#F59E0B';
    
    pdf.setFillColor(scoreColor);
    pdf.roundedRect(pageWidth - PAGE_MARGIN - 25, itemY + 4, 22, 10, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#FFFFFF');
    pdf.text(`${scorePercent.toFixed(0)}%`, pageWidth - PAGE_MARGIN - 20, itemY + 11);
    
    helpers.yPos += itemHeight + 3;
  }
  
  if (data.locations_ranking.length > maxItems) {
    helpers.yPos += 5;
    pdf.setFontSize(8);
    pdf.setTextColor('#6B7280');
    pdf.text(`... e mais ${data.locations_ranking.length - maxItems} locais`, PAGE_MARGIN, helpers.yPos);
  }
}

// ============= PAGE 5: ENVIRONMENT SUMMARY =============
function addEnvironmentSummary(helpers: PDFHelpers, data: CompanyReportData) {
  const { pdf, pageWidth } = helpers;
  
  if (data.environment_senso_table.length === 0) return;
  
  helpers.yPos = PAGE_MARGIN + 5;
  
  // Section header
  pdf.setFillColor('#3B82F6');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 12, 2, 2, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text('Resumo por Ambiente', PAGE_MARGIN + 8, helpers.yPos + 8);
  helpers.yPos += 18;
  
  // Table setup
  const tableWidth = pageWidth - 2 * PAGE_MARGIN;
  const sensoColWidth = 16;
  const avgColWidth = 18;
  const nameColWidth = tableWidth - (5 * sensoColWidth) - avgColWidth;
  
  // Table header
  pdf.setFillColor('#1E3A5F');
  pdf.rect(PAGE_MARGIN, helpers.yPos, tableWidth, 10, 'F');
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  
  pdf.text('Ambiente / Local', PAGE_MARGIN + 3, helpers.yPos + 7);
  
  const sensoKeys = ['1S', '2S', '3S', '4S', '5S'] as const;
  sensoKeys.forEach((key, i) => {
    const x = PAGE_MARGIN + nameColWidth + i * sensoColWidth;
    pdf.setFillColor(SENSO_CONFIG[key].color);
    pdf.rect(x, helpers.yPos, sensoColWidth, 10, 'F');
    pdf.text(key, x + sensoColWidth / 2 - 3, helpers.yPos + 7);
  });
  
  const avgX = PAGE_MARGIN + nameColWidth + 5 * sensoColWidth;
  pdf.setFillColor('#6B7280');
  pdf.rect(avgX, helpers.yPos, avgColWidth, 10, 'F');
  pdf.text('Geral', avgX + 4, helpers.yPos + 7);
  
  helpers.yPos += 10;
  
  // Table rows - hierarchical
  const rowHeight = 10;
  const maxRows = 18;
  const rows = data.environment_senso_table.slice(0, maxRows);
  
  rows.forEach((row, idx) => {
    checkPageBreak(helpers, rowHeight + 2);
    
    // Row background based on level
    let bgColor = '#FFFFFF';
    let textColor = '#374151';
    let indent = 3;
    
    if (row.level === 1) {
      bgColor = '#ECFDF5';
      textColor = '#047857';
      indent = 3;
    } else if (row.level === 2) {
      bgColor = '#EFF6FF';
      textColor = '#1D4ED8';
      indent = 10;
    } else if (row.level === 3) {
      bgColor = '#F9FAFB';
      textColor = '#6B7280';
      indent = 17;
    }
    
    pdf.setFillColor(bgColor);
    pdf.rect(PAGE_MARGIN, helpers.yPos, tableWidth, rowHeight, 'F');
    pdf.setDrawColor('#E5E7EB');
    pdf.rect(PAGE_MARGIN, helpers.yPos, tableWidth, rowHeight, 'S');
    
    // Environment name with indent
    pdf.setFontSize(7);
    pdf.setFont('helvetica', row.level === 1 ? 'bold' : 'normal');
    pdf.setTextColor(textColor);
    
    const prefix = row.level === 1 ? '>' : row.level === 2 ? '-' : '  ·';
    const name = row.name.length > 35 ? row.name.substring(0, 32) + '...' : row.name;
    pdf.text(`${prefix} ${name}`, PAGE_MARGIN + indent, helpers.yPos + 6.5);
    
    // Senso scores with icons
    sensoKeys.forEach((key, i) => {
      const x = PAGE_MARGIN + nameColWidth + i * sensoColWidth;
      const score = row.senso_scores[key];
      
      if (score !== null) {
        let iconColor = '#EF4444';
        let symbol = 'X';
        if (score >= 80) {
          iconColor = '#10B981';
          symbol = 'V';
        } else if (score >= 50) {
          iconColor = '#F59E0B';
          symbol = '!';
        }
        
        pdf.setFillColor(iconColor);
        pdf.circle(x + sensoColWidth / 2, helpers.yPos + 5, 2.5, 'F');
        pdf.setFontSize(5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor('#FFFFFF');
        pdf.text(symbol, x + sensoColWidth / 2 - 1.2, helpers.yPos + 6.2);
      } else {
        pdf.setFontSize(7);
        pdf.setTextColor('#9CA3AF');
        pdf.text('-', x + sensoColWidth / 2 - 1, helpers.yPos + 6.5);
      }
    });
    
    // Average score
    if (row.average_score !== null) {
      const avgPct = row.average_score;
      let avgColor = '#EF4444';
      if (avgPct >= 80) avgColor = '#10B981';
      else if (avgPct >= 50) avgColor = '#F59E0B';
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(avgColor);
      pdf.text(`${Math.round(avgPct)}%`, avgX + 5, helpers.yPos + 6.5);
    } else {
      pdf.setFontSize(7);
      pdf.setTextColor('#9CA3AF');
      pdf.text('-', avgX + 7, helpers.yPos + 6.5);
    }
    
    helpers.yPos += rowHeight;
  });
  
  if (data.environment_senso_table.length > maxRows) {
    helpers.yPos += 5;
    pdf.setFontSize(8);
    pdf.setTextColor('#6B7280');
    pdf.text(`... e mais ${data.environment_senso_table.length - maxRows} locais`, PAGE_MARGIN, helpers.yPos);
    helpers.yPos += 8;
  }
  
  // Observations box
  helpers.yPos += 8;
  checkPageBreak(helpers, 35);
  
  pdf.setFillColor('#F3F4F6');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, tableWidth, 30, 3, 3, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#374151');
  pdf.text('Principais Observacoes', PAGE_MARGIN + 5, helpers.yPos + 8);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#6B7280');
  
  // Find best and worst
  const rowsWithScores = data.environment_senso_table.filter(r => r.average_score !== null);
  if (rowsWithScores.length > 0) {
    const best = rowsWithScores.reduce((a, b) => (a.average_score || 0) > (b.average_score || 0) ? a : b);
    const worst = rowsWithScores.reduce((a, b) => (a.average_score || 0) < (b.average_score || 0) ? a : b);
    
    pdf.text(`Melhor desempenho: ${best.name} (${Math.round(best.average_score || 0)}%)`, PAGE_MARGIN + 5, helpers.yPos + 16);
    pdf.text(`Atencao requerida: ${worst.name} (${Math.round(worst.average_score || 0)}%)`, PAGE_MARGIN + 5, helpers.yPos + 24);
  }
}

// ============= PAGE 6: AUDIT HISTORY =============
function addAuditHistory(helpers: PDFHelpers, data: CompanyReportData) {
  const { pdf, pageWidth } = helpers;
  
  if (data.audits.length === 0) return;
  
  helpers.yPos = PAGE_MARGIN + 5;
  
  // Section header
  pdf.setFillColor('#3B82F6');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 12, 2, 2, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text('Historico de Auditorias', PAGE_MARGIN + 8, helpers.yPos + 8);
  helpers.yPos += 18;
  
  // Table
  const tableWidth = pageWidth - 2 * PAGE_MARGIN;
  const colWidths = [25, 65, 45, 18, 25];
  
  // Table header
  pdf.setFillColor('#1E3A5F');
  pdf.rect(PAGE_MARGIN, helpers.yPos, tableWidth, 10, 'F');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  
  let colX = PAGE_MARGIN + 3;
  const headers = ['Data', 'Local', 'Auditor', 'Nota', 'Status'];
  headers.forEach((header, i) => {
    pdf.text(header, colX, helpers.yPos + 7);
    colX += colWidths[i];
  });
  
  helpers.yPos += 10;
  
  // Table rows
  const rowHeight = 10;
  const maxRows = 15;
  const audits = data.audits.slice(0, maxRows);
  
  audits.forEach((audit, idx) => {
    checkPageBreak(helpers, rowHeight + 2);
    
    const bgColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    pdf.setFillColor(bgColor);
    pdf.rect(PAGE_MARGIN, helpers.yPos, tableWidth, rowHeight, 'F');
    
    colX = PAGE_MARGIN + 3;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#374151');
    
    // Date
    const dateStr = audit.date ? format(new Date(audit.date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
    pdf.text(dateStr, colX, helpers.yPos + 6.5);
    colX += colWidths[0];
    
    // Location
    const locName = audit.location_name.length > 30 ? audit.location_name.substring(0, 27) + '...' : audit.location_name;
    pdf.text(locName, colX, helpers.yPos + 6.5);
    colX += colWidths[1];
    
    // Auditor
    const auditorName = audit.auditor_name.length > 20 ? audit.auditor_name.substring(0, 17) + '...' : audit.auditor_name;
    pdf.text(auditorName, colX, helpers.yPos + 6.5);
    colX += colWidths[2];
    
    // Score
    const score = audit.score !== null ? (audit.score * 10) : 0;
    let scoreColor = '#EF4444';
    if (score >= 80) scoreColor = '#10B981';
    else if (score >= 50) scoreColor = '#F59E0B';
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(scoreColor);
    pdf.text(audit.score !== null ? `${score.toFixed(0)}%` : 'N/A', colX, helpers.yPos + 6.5);
    colX += colWidths[3];
    
    // Status badge
    let statusText = 'Critico';
    let statusColor = '#EF4444';
    if (score >= 80) {
      statusText = 'Aprovado';
      statusColor = '#10B981';
    } else if (score >= 50) {
      statusText = 'Atencao';
      statusColor = '#F59E0B';
    }
    
    pdf.setFillColor(statusColor);
    pdf.roundedRect(colX, helpers.yPos + 2, 22, 6, 1, 1, 'F');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#FFFFFF');
    pdf.text(statusText, colX + 2, helpers.yPos + 6);
    
    helpers.yPos += rowHeight;
  });
  
  if (data.audits.length > maxRows) {
    helpers.yPos += 5;
    pdf.setFontSize(8);
    pdf.setTextColor('#6B7280');
    pdf.text(`... e mais ${data.audits.length - maxRows} auditorias`, PAGE_MARGIN, helpers.yPos);
    helpers.yPos += 8;
  }
  
  // Temporal analysis box
  helpers.yPos += 8;
  checkPageBreak(helpers, 35);
  
  const boxWidth = pageWidth - 2 * PAGE_MARGIN;
  pdf.setFillColor('#EFF6FF');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, boxWidth, 30, 3, 3, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#1E40AF');
  pdf.text('Analise Temporal', PAGE_MARGIN + 5, helpers.yPos + 8);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#3B82F6');
  
  const avgScore = (data.average_score * 10);
  let analysisText = '';
  if (avgScore >= 80) {
    analysisText = `O desempenho medio de ${avgScore.toFixed(1)}% indica um excelente nivel de conformidade 5S. Continue mantendo as boas praticas.`;
  } else if (avgScore >= 50) {
    analysisText = `O desempenho medio de ${avgScore.toFixed(1)}% indica oportunidades de melhoria. Recomenda-se atencao aos pontos criticos identificados.`;
  } else {
    analysisText = `O desempenho medio de ${avgScore.toFixed(1)}% indica necessidade de acoes corretivas urgentes. Priorize os sensos com menor desempenho.`;
  }
  
  const lines = pdf.splitTextToSize(analysisText, boxWidth - 10);
  pdf.text(lines, PAGE_MARGIN + 5, helpers.yPos + 16);
}

// ============= PAGE 7+: NON-CONFORMITIES =============
async function addNonConformities(helpers: PDFHelpers, data: CompanyReportData) {
  const { pdf, pageWidth } = helpers;
  
  if (data.non_conformities.length === 0) return;
  
  // Section header
  pdf.setFillColor('#EF4444');
  pdf.roundedRect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 12, 2, 2, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#FFFFFF');
  pdf.text(`Principais Nao Conformidades (${Math.min(data.non_conformities.length, 10)})`, PAGE_MARGIN + 8, helpers.yPos + 8);
  helpers.yPos += 18;
  
  const maxNC = Math.min(data.non_conformities.length, 10);
  
  for (let i = 0; i < maxNC; i++) {
    const nc = data.non_conformities[i];
    const hasPhotos = nc.photo_urls.length > 0;
    const cardHeight = 45 + (nc.comment ? 12 : 0) + (hasPhotos ? MAX_IMAGE_HEIGHT + 10 : 0);
    
    checkPageBreak(helpers, cardHeight + 10);
    
    // Card background
    pdf.setFillColor('#FEF2F2');
    pdf.roundedRect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, cardHeight, 3, 3, 'F');
    
    // Number badge
    pdf.setFillColor('#EF4444');
    pdf.circle(PAGE_MARGIN + 10, helpers.yPos + 10, 6, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#FFFFFF');
    const numText = String(i + 1);
    const numWidth = pdf.getTextWidth(numText);
    pdf.text(numText, PAGE_MARGIN + 10 - numWidth / 2, helpers.yPos + 12);
    
    // Location and date
    const dateStr = nc.audit_date ? format(new Date(nc.audit_date), 'dd/MM/yyyy', { locale: ptBR }) : '';
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#9B1C1C');
    pdf.text(`${nc.location_path} - ${dateStr}`, PAGE_MARGIN + 22, helpers.yPos + 10);
    
    // Question
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#7F1D1D');
    const question = nc.question.length > 80 ? nc.question.substring(0, 77) + '...' : nc.question;
    pdf.text(question, PAGE_MARGIN + 22, helpers.yPos + 22, { maxWidth: pageWidth - 2 * PAGE_MARGIN - 30 });
    
    // Auditor
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#9B1C1C');
    pdf.text(`Auditor: ${nc.auditor_name}`, PAGE_MARGIN + 22, helpers.yPos + 32);
    
    let currentY = helpers.yPos + 38;
    
    // Comment
    if (nc.comment) {
      pdf.setFontSize(8);
      pdf.setTextColor('#7F1D1D');
      const comment = nc.comment.length > 100 ? nc.comment.substring(0, 97) + '...' : nc.comment;
      pdf.text(`Obs: ${comment}`, PAGE_MARGIN + 22, currentY);
      currentY += 12;
    }
    
    // Photos
    if (hasPhotos) {
      currentY += 3;
      let imageX = PAGE_MARGIN + 22;
      
      for (const photoUrl of nc.photo_urls.slice(0, 2)) {
        try {
          const base64 = await fetchImageAsBase64(photoUrl);
          if (base64) {
            let format: 'JPEG' | 'PNG' = 'JPEG';
            if (base64.includes('data:image/png')) {
              format = 'PNG';
            }
            pdf.addImage(base64, format, imageX, currentY, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT);
            imageX += MAX_IMAGE_WIDTH + 5;
          }
        } catch (error) {
          console.error('Error embedding NC image:', error);
        }
      }
    }
    
    helpers.yPos += cardHeight + 8;
  }
  
  if (data.non_conformities.length > 10) {
    pdf.setFontSize(8);
    pdf.setTextColor('#6B7280');
    pdf.text(`... e mais ${data.non_conformities.length - 10} nao conformidades registradas`, PAGE_MARGIN, helpers.yPos);
  }
}

// ============= MAIN EXPORT FUNCTION =============
export async function generateCompanyReportPDFPremium(data: CompanyReportData): Promise<void> {
  const helpers = createPDFHelpers();
  
  // Page 1: Cover
  addCoverPage(helpers, data);
  
  // Page 2: Executive Summary
  newPage(helpers);
  addExecutiveSummary(helpers, data);
  
  // Page 3: Senso Performance
  newPage(helpers);
  addSensoPerformance(helpers, data);
  
  // Page 4: Location Ranking
  if (data.locations_ranking.length > 0) {
    newPage(helpers);
    addLocationRanking(helpers, data);
  }
  
  // Page 5: Environment Summary
  if (data.environment_senso_table.length > 0) {
    newPage(helpers);
    addEnvironmentSummary(helpers, data);
  }
  
  // Page 6: Audit History
  if (data.audits.length > 0) {
    newPage(helpers);
    addAuditHistory(helpers, data);
  }
  
  // Page 7+: Non-conformities
  if (data.non_conformities.length > 0) {
    newPage(helpers);
    await addNonConformities(helpers, data);
  }
  
  // Footer on last page
  addPageFooter(helpers);
  
  // Save
  const fileName = `Relatorio_5S_${sanitizeTextForPDF(data.company_name).replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  helpers.pdf.save(fileName);
}
