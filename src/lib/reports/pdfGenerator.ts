import jsPDF from 'jspdf';
import type { AuditReportData, CompanyReportData, EnvironmentNode, NonConformityDetail, EnvironmentSensoRow } from './reportTypes';
import { SENSO_CONFIG, SensoKey, sanitizeTextForPDF } from './reportTypes';
import { getScoreLevelLabel, getScoreLevelColor, fetchImageAsBase64 } from './reportDataFormatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Constants
const PAGE_MARGIN = 15;
const MAX_IMAGE_WIDTH = 55;
const MAX_IMAGE_HEIGHT = 42;
const MAX_IMAGES_PER_ROW = 3;
const MAX_PHOTOS_PER_ITEM = 4; // Limit photos per item to avoid infinite loading
const MAX_NON_CONFORMITIES_COMPANY_REPORT = 15; // Limit non-conformities in company report
const IMAGE_PROCESS_TIMEOUT = 3000; // 3 seconds timeout per image

interface PDFHelpers {
  pdf: jsPDF;
  pageWidth: number;
  pageHeight: number;
  yPos: number;
  currentPage: number;
}

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

function addLine(helpers: PDFHelpers, y: number) {
  const { pdf, pageWidth } = helpers;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
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

function addSectionHeader(helpers: PDFHelpers, title: string, color: string = '#3B82F6') {
  checkPageBreak(helpers, 20);
  addText(helpers, title, PAGE_MARGIN, helpers.yPos, { fontSize: 12, fontStyle: 'bold', color });
  helpers.yPos += 8;
}

// Score box component
function addScoreBox(helpers: PDFHelpers, score: number | null, scoreLevel: string | null) {
  const { pdf, pageWidth } = helpers;
  const boxWidth = 60;
  const boxHeight = 35;
  const boxX = (pageWidth - boxWidth) / 2;
  
  pdf.setFillColor(getScoreLevelColor(scoreLevel));
  pdf.roundedRect(boxX, helpers.yPos, boxWidth, boxHeight, 3, 3, 'F');
  
  const scoreText = score !== null ? score.toFixed(1) : 'N/A';
  addText(helpers, scoreText, pageWidth / 2 - 8, helpers.yPos + 18, { fontSize: 24, fontStyle: 'bold', color: '#FFFFFF' });
  addText(helpers, '/10', pageWidth / 2 + 12, helpers.yPos + 18, { fontSize: 12, color: '#FFFFFF' });
  addText(helpers, getScoreLevelLabel(scoreLevel), 0, helpers.yPos + 28, { fontSize: 10, color: '#FFFFFF', align: 'center' });
  
  helpers.yPos += boxHeight + 10;
}

// Stats boxes component
function addStatsBoxes(helpers: PDFHelpers, stats: Array<{ label: string; value: string; color?: string }>) {
  const { pdf, pageWidth } = helpers;
  const boxWidth = 50;
  const boxSpacing = 10;
  const totalWidth = stats.length * boxWidth + (stats.length - 1) * boxSpacing;
  const startX = (pageWidth - totalWidth) / 2;
  
  stats.forEach((stat, i) => {
    const x = startX + (boxWidth + boxSpacing) * i;
    const bgColor = stat.color || '#F1F5F9';
    pdf.setFillColor(bgColor);
    pdf.roundedRect(x, helpers.yPos, boxWidth, 25, 2, 2, 'F');
    
    const textColor = stat.color ? '#FFFFFF' : '#374151';
    addText(helpers, stat.label, x + 5, helpers.yPos + 8, { fontSize: 8, color: stat.color ? '#FFFFFF' : '#6B7280' });
    addText(helpers, stat.value, x + 5, helpers.yPos + 18, { fontSize: 14, fontStyle: 'bold', color: textColor });
  });
  
  helpers.yPos += 35;
}

// Senso progress bars
function addSensoProgressBars(helpers: PDFHelpers, sensoScores: Array<{ senso: string; score: number; conforme: number; total: number }>) {
  const { pdf, pageWidth } = helpers;
  const barWidth = 100;
  const barHeight = 6;
  const barX = PAGE_MARGIN + 50;
  
  for (const senso of sensoScores) {
    checkPageBreak(helpers, 12);
    const sensoConfig = SENSO_CONFIG[senso.senso as SensoKey];
    
    addText(helpers, senso.senso, PAGE_MARGIN, helpers.yPos + 4, { fontSize: 9, fontStyle: 'bold' });
    addText(helpers, sensoConfig?.name || '', PAGE_MARGIN + 12, helpers.yPos + 4, { fontSize: 7, color: '#6B7280' });
    
    // Background bar
    pdf.setFillColor('#E5E7EB');
    pdf.roundedRect(barX, helpers.yPos, barWidth, barHeight, 1, 1, 'F');
    
    // Progress bar
    pdf.setFillColor(sensoConfig?.color || '#6B7280');
    pdf.roundedRect(barX, helpers.yPos, (barWidth * senso.score) / 100, barHeight, 1, 1, 'F');
    
    addText(helpers, `${senso.score.toFixed(0)}%`, barX + barWidth + 5, helpers.yPos + 5, { fontSize: 9, fontStyle: 'bold' });
    addText(helpers, `(${senso.conforme}/${senso.total})`, barX + barWidth + 25, helpers.yPos + 5, { fontSize: 8, color: '#6B7280' });
    
    helpers.yPos += 12;
  }
}

// Add embedded image
async function addEmbeddedImage(helpers: PDFHelpers, imageUrl: string, x: number, maxWidth: number = MAX_IMAGE_WIDTH): Promise<boolean> {
  try {
    const base64 = await fetchImageAsBase64(imageUrl);
    if (!base64) return false;
    
    // Detect format from base64 header
    let format: 'JPEG' | 'PNG' = 'JPEG';
    if (base64.includes('data:image/png')) {
      format = 'PNG';
    }
    
    helpers.pdf.addImage(base64, format, x, helpers.yPos, maxWidth, MAX_IMAGE_HEIGHT);
    return true;
  } catch (error) {
    console.error('Error embedding image:', error);
    return false;
  }
}

// Environment tree rendering
function renderEnvironmentTree(helpers: PDFHelpers, nodes: EnvironmentNode[], indent: number = 0) {
  for (const node of nodes) {
    checkPageBreak(helpers, 8);
    
    const prefix = indent === 0 ? '' : '  '.repeat(indent) + '- ';
    const icon = node.children.length > 0 ? '[+] ' : '    ';
    addText(helpers, `${prefix}${icon}${node.name}`, PAGE_MARGIN + indent * 5, helpers.yPos, { fontSize: 9 });
    helpers.yPos += 6;
    
    if (node.children.length > 0) {
      renderEnvironmentTree(helpers, node.children, indent + 1);
    }
  }
}

// Get score indicator with icon, label and color matching the system UI
function getScoreIndicator(score: number | null): { 
  symbol: string; 
  color: string; 
  bgColor: string;
  label: string;
  borderColor: string;
} {
  if (score === null) return { 
    symbol: '-', 
    color: '#9CA3AF', 
    bgColor: '#F3F4F6',
    label: '',
    borderColor: '#E5E7EB'
  };
  if (score >= 80) return { 
    symbol: 'V', // Checkmark
    color: '#10B981', 
    bgColor: '#ECFDF5',
    label: 'Excelente',
    borderColor: '#10B981'
  };
  if (score >= 50) return { 
    symbol: '!', // Warning triangle
    color: '#F59E0B', 
    bgColor: '#FFFBEB',
    label: 'Atencao',
    borderColor: '#F59E0B'
  };
  return { 
    symbol: 'X', // X mark
    color: '#EF4444', 
    bgColor: '#FEF2F2',
    label: 'Critico',
    borderColor: '#EF4444'
  };
}

// Draw score indicator - smaller icons, larger numbers
function drawScoreIndicator(
  pdf: jsPDF, 
  x: number, 
  y: number, 
  score: number | null, 
  isAggregate: boolean,
  helpers: PDFHelpers
) {
  const indicator = getScoreIndicator(score);
  
  if (score === null) {
    addText(helpers, '-', x - 2, y + 2, { fontSize: 9, color: '#9CA3AF' });
    return;
  }
  
  if (isAggregate) {
    // Smaller circle with icon
    const circleRadius = 3.2;
    
    // Draw circle with border
    pdf.setDrawColor(indicator.borderColor);
    pdf.setLineWidth(0.5);
    pdf.setFillColor('#FFFFFF');
    pdf.circle(x, y, circleRadius, 'FD');
    pdf.setLineWidth(0.2);
    
    // Draw simple icon inside - smaller
    if (score >= 80) {
      // Simple checkmark ✓
      pdf.setDrawColor(indicator.color);
      pdf.setLineWidth(0.6);
      pdf.line(x - 1.4, y, x - 0.4, y + 1.2);
      pdf.line(x - 0.4, y + 1.2, x + 1.6, y - 1.2);
      pdf.setLineWidth(0.2);
    } else if (score >= 50) {
      // Simple triangle with ! inside
      pdf.setFillColor(indicator.color);
      pdf.triangle(x, y - 1.8, x - 1.8, y + 1.2, x + 1.8, y + 1.2, 'F');
      pdf.setFillColor('#FFFFFF');
      pdf.rect(x - 0.25, y - 1, 0.5, 1.2, 'F');
      pdf.circle(x, y + 0.6, 0.3, 'F');
    } else {
      // Simple X mark
      pdf.setDrawColor(indicator.color);
      pdf.setLineWidth(0.6);
      pdf.line(x - 1.2, y - 1.2, x + 1.2, y + 1.2);
      pdf.line(x + 1.2, y - 1.2, x - 1.2, y + 1.2);
      pdf.setLineWidth(0.2);
    }
    
    // Label below circle - smaller
    pdf.setFontSize(3.5);
    const labelWidth = pdf.getTextWidth(indicator.label);
    addText(helpers, indicator.label, x - labelWidth / 2, y + circleRadius + 3.5, { 
      fontSize: 3.5, color: indicator.color 
    });
  } else {
    // Just percentage for detail rows - LARGER
    const pctText = `${Math.round(score)}%`;
    pdf.setFontSize(9);
    const pctWidth = pdf.getTextWidth(pctText);
    addText(helpers, pctText, x - pctWidth / 2, y + 2, { 
      fontSize: 9, fontStyle: 'bold', color: indicator.color 
    });
  }
}

// Render summary table showing only level 1 environments (Setores)
function renderEnvironmentSummaryTable(helpers: PDFHelpers, rows: EnvironmentSensoRow[]) {
  const { pdf, pageWidth } = helpers;
  
  // Filter only level 1 rows (Setores in 3-tier hierarchy)
  const summaryRows = rows.filter(row => row.level === 1);
  if (summaryRows.length === 0) return;
  
  // Column widths - balanced for readability
  const totalWidth = pageWidth - 2 * PAGE_MARGIN;
  const sensoColWidth = 18;
  const avgColWidth = 20;
  const numSensoCols = 5;
  const scoreColumnsWidth = (numSensoCols * sensoColWidth) + avgColWidth;
  const nameColWidth = totalWidth - scoreColumnsWidth;
  const tableLeft = PAGE_MARGIN;
  
  // Table header
  checkPageBreak(helpers, 14);
  const headerY = helpers.yPos;
  
  // Header background for name column
  pdf.setFillColor('#F3F4F6');
  pdf.rect(tableLeft, headerY, nameColWidth, 12, 'F');
  addText(helpers, 'Ambiente / Local', tableLeft + 3, headerY + 8, { fontSize: 7, fontStyle: 'bold', color: '#374151' });
  
  // Senso column headers
  const sensoHeaders = [
    { label: '1S', subLabel: 'Utilizacao', color: SENSO_CONFIG['1S'].color },
    { label: '2S', subLabel: 'Organizacao', color: SENSO_CONFIG['2S'].color },
    { label: '3S', subLabel: 'Limpeza', color: SENSO_CONFIG['3S'].color },
    { label: '4S', subLabel: 'Saude', color: SENSO_CONFIG['4S'].color },
    { label: '5S', subLabel: 'Autodiscipl.', color: SENSO_CONFIG['5S'].color },
  ];
  
  sensoHeaders.forEach((senso, i) => {
    const x = tableLeft + nameColWidth + (i * sensoColWidth);
    pdf.setFillColor(senso.color);
    pdf.rect(x, headerY, sensoColWidth, 12, 'F');
    addText(helpers, senso.label, x + sensoColWidth / 2 - 2.5, headerY + 5, { fontSize: 7, fontStyle: 'bold', color: '#FFFFFF' });
    addText(helpers, senso.subLabel, x + 1, headerY + 10, { fontSize: 3.5, color: '#FFFFFF' });
  });
  
  // GERAL column header
  const avgX = tableLeft + nameColWidth + (numSensoCols * sensoColWidth);
  pdf.setFillColor('#6B7280');
  pdf.rect(avgX, headerY, avgColWidth, 12, 'F');
  addText(helpers, 'GERAL', avgX + avgColWidth / 2 - 5, headerY + 5, { fontSize: 6, fontStyle: 'bold', color: '#FFFFFF' });
  addText(helpers, 'Media', avgX + avgColWidth / 2 - 4, headerY + 10, { fontSize: 3.5, color: '#FFFFFF' });
  
  helpers.yPos += 13;
  
  // Render summary rows
  for (const row of summaryRows) {
    const rowHeight = 14;
    
    checkPageBreak(helpers, rowHeight + 2);
    const rowY = helpers.yPos;
    
    // Row background
    const bgColor = '#ECFDF5';
    pdf.setFillColor(bgColor);
    pdf.rect(tableLeft, rowY, totalWidth, rowHeight, 'F');
    pdf.setDrawColor('#E5E7EB');
    pdf.rect(tableLeft, rowY, totalWidth, rowHeight, 'S');
    
    // Environment name
    addText(helpers, '>', tableLeft + 3, rowY + rowHeight / 2 + 1, { fontSize: 6, color: '#10B981' });
    addText(helpers, row.name, tableLeft + 10, rowY + rowHeight / 2 + 1, { 
      fontSize: 7, 
      fontStyle: 'bold',
      color: '#10B981',
      maxWidth: nameColWidth - 15
    });
    
    // Senso score cells
    const sensoKeys = ['1S', '2S', '3S', '4S', '5S'] as const;
    sensoKeys.forEach((key, i) => {
      const x = tableLeft + nameColWidth + (i * sensoColWidth);
      const score = row.senso_scores[key];
      const indicator = getScoreIndicator(score);
      
      // Cell background
      pdf.setFillColor(indicator.bgColor);
      pdf.rect(x, rowY, sensoColWidth, rowHeight, 'F');
      pdf.setDrawColor('#E5E7EB');
      pdf.rect(x, rowY, sensoColWidth, rowHeight, 'S');
      
      const cellCenterX = x + sensoColWidth / 2;
      const cellCenterY = rowY + 5;
      
      drawScoreIndicator(pdf, cellCenterX, cellCenterY, score, true, helpers);
    });
    
    // GERAL column
    const avgIndicator = getScoreIndicator(row.average_score);
    pdf.setFillColor(avgIndicator.bgColor);
    pdf.rect(avgX, rowY, avgColWidth, rowHeight, 'F');
    pdf.setDrawColor('#E5E7EB');
    pdf.rect(avgX, rowY, avgColWidth, rowHeight, 'S');
    
    const avgCenterX = avgX + avgColWidth / 2;
    const avgCenterY = rowY + 5;
    
    if (row.average_score !== null) {
      // Smaller circle with icon
      const circleRadius = 3.2;
      pdf.setDrawColor(avgIndicator.borderColor);
      pdf.setLineWidth(0.5);
      pdf.setFillColor('#FFFFFF');
      pdf.circle(avgCenterX, avgCenterY, circleRadius, 'FD');
      pdf.setLineWidth(0.2);
      
      // Draw icon
      if (row.average_score >= 80) {
        pdf.setDrawColor(avgIndicator.color);
        pdf.setLineWidth(0.6);
        pdf.line(avgCenterX - 1.4, avgCenterY, avgCenterX - 0.4, avgCenterY + 1.2);
        pdf.line(avgCenterX - 0.4, avgCenterY + 1.2, avgCenterX + 1.6, avgCenterY - 1.2);
        pdf.setLineWidth(0.2);
      } else if (row.average_score >= 50) {
        pdf.setFillColor(avgIndicator.color);
        pdf.triangle(avgCenterX, avgCenterY - 1.8, avgCenterX - 1.8, avgCenterY + 1.2, avgCenterX + 1.8, avgCenterY + 1.2, 'F');
        pdf.setFillColor('#FFFFFF');
        pdf.rect(avgCenterX - 0.25, avgCenterY - 1, 0.5, 1.2, 'F');
        pdf.circle(avgCenterX, avgCenterY + 0.6, 0.3, 'F');
      } else {
        pdf.setDrawColor(avgIndicator.color);
        pdf.setLineWidth(0.6);
        pdf.line(avgCenterX - 1.2, avgCenterY - 1.2, avgCenterX + 1.2, avgCenterY + 1.2);
        pdf.line(avgCenterX + 1.2, avgCenterY - 1.2, avgCenterX - 1.2, avgCenterY + 1.2);
        pdf.setLineWidth(0.2);
      }
      
      // Percentage below
      const pctText = `${Math.round(row.average_score)}%`;
      pdf.setFontSize(7);
      const pctWidth = pdf.getTextWidth(pctText);
      addText(helpers, pctText, avgCenterX - pctWidth / 2, avgCenterY + circleRadius + 4.5, { 
        fontSize: 7, fontStyle: 'bold', color: avgIndicator.color 
      });
    } else {
      addText(helpers, '-', avgCenterX - 2, avgCenterY + 2, { fontSize: 9, color: '#9CA3AF' });
    }
    
    helpers.yPos += rowHeight;
  }
  
  // Compact legend
  helpers.yPos += 6;
  checkPageBreak(helpers, 12);
  
  let legendX = PAGE_MARGIN;
  const legendItems = [
    { color: '#10B981', label: 'Excelente (>=80%)' },
    { color: '#F59E0B', label: 'Atencao (50-79%)' },
    { color: '#EF4444', label: 'Critico (<50%)' },
  ];
  
  for (const item of legendItems) {
    pdf.setFillColor(item.color);
    pdf.circle(legendX + 2, helpers.yPos, 2, 'F');
    addText(helpers, item.label, legendX + 6, helpers.yPos + 1.5, { fontSize: 6, color: '#6B7280' });
    legendX += 50;
  }
  
  helpers.yPos += 10;
}

// Render hierarchical environment senso table matching system UI design exactly
function renderEnvironmentSensoTable(helpers: PDFHelpers, rows: EnvironmentSensoRow[]) {
  const { pdf, pageWidth } = helpers;
  
  // Column widths - balanced for readability
  const totalWidth = pageWidth - 2 * PAGE_MARGIN;
  const sensoColWidth = 18;
  const avgColWidth = 20;
  const numSensoCols = 5;
  const scoreColumnsWidth = (numSensoCols * sensoColWidth) + avgColWidth;
  const nameColWidth = totalWidth - scoreColumnsWidth;
  const tableLeft = PAGE_MARGIN;
  
  // Table header
  checkPageBreak(helpers, 14);
  const headerY = helpers.yPos;
  
  // Header background for name column
  pdf.setFillColor('#F3F4F6');
  pdf.rect(tableLeft, headerY, nameColWidth, 12, 'F');
  addText(helpers, 'Setor / Local', tableLeft + 3, headerY + 8, { fontSize: 7, fontStyle: 'bold', color: '#374151' });
  
  // Senso column headers
  const sensoHeaders = [
    { label: '1S', subLabel: 'Utilizacao', color: SENSO_CONFIG['1S'].color },
    { label: '2S', subLabel: 'Organizacao', color: SENSO_CONFIG['2S'].color },
    { label: '3S', subLabel: 'Limpeza', color: SENSO_CONFIG['3S'].color },
    { label: '4S', subLabel: 'Saude', color: SENSO_CONFIG['4S'].color },
    { label: '5S', subLabel: 'Autodiscipl.', color: SENSO_CONFIG['5S'].color },
  ];
  
  sensoHeaders.forEach((senso, i) => {
    const x = tableLeft + nameColWidth + (i * sensoColWidth);
    pdf.setFillColor(senso.color);
    pdf.rect(x, headerY, sensoColWidth, 12, 'F');
    addText(helpers, senso.label, x + sensoColWidth / 2 - 2.5, headerY + 5, { fontSize: 7, fontStyle: 'bold', color: '#FFFFFF' });
    addText(helpers, senso.subLabel, x + 1, headerY + 10, { fontSize: 3.5, color: '#FFFFFF' });
  });
  
  // GERAL column header
  const avgX = tableLeft + nameColWidth + (numSensoCols * sensoColWidth);
  pdf.setFillColor('#6B7280');
  pdf.rect(avgX, headerY, avgColWidth, 12, 'F');
  addText(helpers, 'GERAL', avgX + avgColWidth / 2 - 5, headerY + 5, { fontSize: 6, fontStyle: 'bold', color: '#FFFFFF' });
  addText(helpers, 'Media', avgX + avgColWidth / 2 - 4, headerY + 10, { fontSize: 3.5, color: '#FFFFFF' });
  
  helpers.yPos += 13;
  
  // Render rows - only level 1 (Setor) and level 2 (Local) in 3-tier model
  for (const row of rows) {
    // Level 1 = Setor (aggregate), Level 2 = Local (detail)
    const isAggregateRow = row.level === 1;
    const rowHeight = isAggregateRow ? 14 : 9;
    
    checkPageBreak(helpers, rowHeight + 2);
    const rowY = helpers.yPos;
    const indent = row.level === 2 ? 8 : 0; // Indent only locals
    
    // Row background based on level
    let bgColor = '#FFFFFF';
    if (row.level === 1) bgColor = '#ECFDF5'; // Setor - green tint
    else if (row.level === 2) bgColor = '#F0F9FF'; // Local - blue tint
    
    pdf.setFillColor(bgColor);
    pdf.rect(tableLeft, rowY, totalWidth, rowHeight, 'F');
    pdf.setDrawColor('#E5E7EB');
    pdf.rect(tableLeft, rowY, totalWidth, rowHeight, 'S');
    
    // Level indicator icon
    let levelIcon = '';
    let levelColor = '#6B7280';
    if (row.level === 1) { levelIcon = '>'; levelColor = '#10B981'; } // Setor
    else if (row.level === 2) { levelIcon = '-'; levelColor = '#3B82F6'; } // Local
    
    // Environment name
    addText(helpers, levelIcon, tableLeft + 2 + indent, rowY + rowHeight / 2 + 1, { fontSize: 5, color: levelColor });
    addText(helpers, row.name, tableLeft + 8 + indent, rowY + rowHeight / 2 + 1, { 
      fontSize: row.level === 1 ? 7 : 6, 
      fontStyle: row.level === 1 ? 'bold' : 'normal',
      color: row.level === 1 ? '#10B981' : '#374151',
      maxWidth: nameColWidth - indent - 10
    });
    
    // Senso score cells
    const sensoKeys = ['1S', '2S', '3S', '4S', '5S'] as const;
    sensoKeys.forEach((key, i) => {
      const x = tableLeft + nameColWidth + (i * sensoColWidth);
      const score = row.senso_scores[key];
      const indicator = getScoreIndicator(score);
      
      // Cell background
      pdf.setFillColor(isAggregateRow ? indicator.bgColor : '#FFFFFF');
      pdf.rect(x, rowY, sensoColWidth, rowHeight, 'F');
      pdf.setDrawColor('#E5E7EB');
      pdf.rect(x, rowY, sensoColWidth, rowHeight, 'S');
      
      const cellCenterX = x + sensoColWidth / 2;
      const cellCenterY = isAggregateRow ? rowY + 5 : rowY + rowHeight / 2;
      
      drawScoreIndicator(pdf, cellCenterX, cellCenterY, score, isAggregateRow, helpers);
    });
    
    // GERAL column
    const avgIndicator = getScoreIndicator(row.average_score);
    pdf.setFillColor(isAggregateRow ? avgIndicator.bgColor : '#FFFFFF');
    pdf.rect(avgX, rowY, avgColWidth, rowHeight, 'F');
    pdf.setDrawColor('#E5E7EB');
    pdf.rect(avgX, rowY, avgColWidth, rowHeight, 'S');
    
    const avgCenterX = avgX + avgColWidth / 2;
    const avgCenterY = isAggregateRow ? rowY + 5 : rowY + rowHeight / 2;
    
    if (row.average_score !== null) {
      if (isAggregateRow) {
        // Smaller circle with icon
        const circleRadius = 3.2;
        pdf.setDrawColor(avgIndicator.borderColor);
        pdf.setLineWidth(0.5);
        pdf.setFillColor('#FFFFFF');
        pdf.circle(avgCenterX, avgCenterY, circleRadius, 'FD');
        pdf.setLineWidth(0.2);
        
        // Draw icon - smaller
        if (row.average_score >= 80) {
          pdf.setDrawColor(avgIndicator.color);
          pdf.setLineWidth(0.6);
          pdf.line(avgCenterX - 1.4, avgCenterY, avgCenterX - 0.4, avgCenterY + 1.2);
          pdf.line(avgCenterX - 0.4, avgCenterY + 1.2, avgCenterX + 1.6, avgCenterY - 1.2);
          pdf.setLineWidth(0.2);
        } else if (row.average_score >= 50) {
          pdf.setFillColor(avgIndicator.color);
          pdf.triangle(avgCenterX, avgCenterY - 1.8, avgCenterX - 1.8, avgCenterY + 1.2, avgCenterX + 1.8, avgCenterY + 1.2, 'F');
          pdf.setFillColor('#FFFFFF');
          pdf.rect(avgCenterX - 0.25, avgCenterY - 1, 0.5, 1.2, 'F');
          pdf.circle(avgCenterX, avgCenterY + 0.6, 0.3, 'F');
        } else {
          pdf.setDrawColor(avgIndicator.color);
          pdf.setLineWidth(0.6);
          pdf.line(avgCenterX - 1.2, avgCenterY - 1.2, avgCenterX + 1.2, avgCenterY + 1.2);
          pdf.line(avgCenterX + 1.2, avgCenterY - 1.2, avgCenterX - 1.2, avgCenterY + 1.2);
          pdf.setLineWidth(0.2);
        }
        
        // Percentage below - LARGER
        const pctText = `${Math.round(row.average_score)}%`;
        pdf.setFontSize(7);
        const pctWidth = pdf.getTextWidth(pctText);
        addText(helpers, pctText, avgCenterX - pctWidth / 2, avgCenterY + circleRadius + 4.5, { 
          fontSize: 7, fontStyle: 'bold', color: avgIndicator.color 
        });
      } else {
        // Just percentage for detail rows - LARGER
        const pctText = `${Math.round(row.average_score)}%`;
        pdf.setFontSize(9);
        const pctWidth = pdf.getTextWidth(pctText);
        addText(helpers, pctText, avgCenterX - pctWidth / 2, avgCenterY + 2, { 
          fontSize: 9, fontStyle: 'bold', color: avgIndicator.color 
        });
      }
    } else {
      addText(helpers, '-', avgCenterX - 2, avgCenterY + 2, { fontSize: 9, color: '#9CA3AF' });
    }
    
    helpers.yPos += rowHeight;
  }
  
  // Compact legend
  helpers.yPos += 6;
  checkPageBreak(helpers, 12);
  
  let legendX = PAGE_MARGIN;
  const legendItems = [
    { color: '#10B981', label: 'Excelente (>=80%)' },
    { color: '#F59E0B', label: 'Atencao (50-79%)' },
    { color: '#EF4444', label: 'Critico (<50%)' },
  ];
  
  for (const item of legendItems) {
    pdf.setFillColor(item.color);
    pdf.circle(legendX + 2, helpers.yPos, 2, 'F');
    addText(helpers, item.label, legendX + 6, helpers.yPos + 1.5, { fontSize: 6, color: '#6B7280' });
    legendX += 50;
  }
  
  helpers.yPos += 10;
}

export async function generateAuditPDF(data: AuditReportData): Promise<void> {
  const helpers = createPDFHelpers();
  const { pdf, pageWidth } = helpers;

  // Header
  addText(helpers, 'RELATORIO DE AUDITORIA 5S', 0, helpers.yPos, { fontSize: 18, fontStyle: 'bold', align: 'center' });
  helpers.yPos += 12;

  addLine(helpers, helpers.yPos);
  helpers.yPos += 8;

  // General info section
  addSectionHeader(helpers, 'INFORMACOES GERAIS');
  
  const infoLines = [
    ['Empresa:', data.company_name],
    ['Setor:', data.sector_name],
    ['Local:', data.local_name || data.location_name],
    ['Auditor:', data.auditor_name],
    ['Data:', data.started_at ? format(new Date(data.started_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }) : 'N/A'],
    ['Status:', data.completed_at ? 'Concluida' : 'Em andamento'],
  ];

  for (const [label, value] of infoLines) {
    addText(helpers, label, PAGE_MARGIN, helpers.yPos, { fontSize: 9, fontStyle: 'bold', color: '#6B7280' });
    addText(helpers, value, PAGE_MARGIN + 25, helpers.yPos, { fontSize: 10 });
    helpers.yPos += 6;
  }

  helpers.yPos += 5;
  addLine(helpers, helpers.yPos);
  helpers.yPos += 10;

  // Score section
  addSectionHeader(helpers, 'RESULTADO GERAL');
  addScoreBox(helpers, data.score, data.score_level);

  // Summary stats
  addStatsBoxes(helpers, [
    { label: 'Total', value: String(data.total_questions), color: '#3B82F6' },
    { label: 'Conforme', value: String(data.total_yes), color: '#10B981' },
    { label: 'Nao Conforme', value: String(data.total_no), color: '#EF4444' },
  ]);

  addLine(helpers, helpers.yPos);
  helpers.yPos += 10;

  // Senso performance
  addSectionHeader(helpers, 'PERFORMANCE POR SENSO');
  addSensoProgressBars(helpers, data.senso_scores);

  helpers.yPos += 5;
  addLine(helpers, helpers.yPos);
  helpers.yPos += 10;

  // Non-conformities with photos
  const nonConformItems = data.items.filter(item => item.answer === false);
  
  if (nonConformItems.length > 0) {
    addSectionHeader(helpers, `NAO CONFORMIDADES (${nonConformItems.length})`, '#EF4444');

    for (let i = 0; i < nonConformItems.length; i++) {
      const item = nonConformItems[i];
      checkPageBreak(helpers, 60);

      // Item header with number
      pdf.setFillColor('#FEF2F2');
      const boxHeight = 25 + (item.comment ? 12 : 0);
      pdf.roundedRect(PAGE_MARGIN, helpers.yPos - 2, pageWidth - 2 * PAGE_MARGIN, boxHeight, 2, 2, 'F');
      
      // Number badge
      pdf.setFillColor('#EF4444');
      pdf.circle(PAGE_MARGIN + 8, helpers.yPos + 6, 5, 'F');
      addText(helpers, String(i + 1), PAGE_MARGIN + 6, helpers.yPos + 8, { fontSize: 9, fontStyle: 'bold', color: '#FFFFFF' });
      
      // Question
      addText(helpers, item.question, PAGE_MARGIN + 18, helpers.yPos + 8, { fontSize: 10, fontStyle: 'bold', maxWidth: pageWidth - 2 * PAGE_MARGIN - 25 });
      
      // Senso tags
      if (item.senso.length > 0) {
        let tagX = PAGE_MARGIN + 18;
        helpers.yPos += 12;
        for (const s of item.senso) {
          const sensoConfig = SENSO_CONFIG[s as SensoKey];
          if (sensoConfig) {
            pdf.setFillColor(sensoConfig.color);
            pdf.roundedRect(tagX, helpers.yPos, 12, 5, 1, 1, 'F');
            addText(helpers, s, tagX + 2, helpers.yPos + 4, { fontSize: 6, color: '#FFFFFF' });
            tagX += 15;
          }
        }
        helpers.yPos += 8;
      } else {
        helpers.yPos += 15;
      }

      // Comment
      if (item.comment) {
        addText(helpers, `Obs: ${item.comment}`, PAGE_MARGIN + 18, helpers.yPos, { fontSize: 9, color: '#6B7280', maxWidth: pageWidth - 2 * PAGE_MARGIN - 25 });
        helpers.yPos += 12;
      }

      helpers.yPos += 5;

      // Photos - show ALL photos, not just limited
      if (item.photo_urls.length > 0) {
        checkPageBreak(helpers, MAX_IMAGE_HEIGHT + 15);
        addText(helpers, `Evidencias fotograficas (${item.photo_urls.length}):`, PAGE_MARGIN + 5, helpers.yPos, { fontSize: 8, color: '#6B7280' });
        helpers.yPos += 5;

        let imageX = PAGE_MARGIN + 5;
        let imagesInRow = 0;
        
        // Limit photos per item to prevent infinite loading
        const photosToShow = item.photo_urls.slice(0, MAX_PHOTOS_PER_ITEM);
        for (const photoUrl of photosToShow) {
          if (imagesInRow >= MAX_IMAGES_PER_ROW) {
            helpers.yPos += MAX_IMAGE_HEIGHT + 5;
            imageX = PAGE_MARGIN + 5;
            imagesInRow = 0;
            checkPageBreak(helpers, MAX_IMAGE_HEIGHT + 10);
          }
          
          const success = await addEmbeddedImage(helpers, photoUrl, imageX, MAX_IMAGE_WIDTH);
          if (success) {
            imageX += MAX_IMAGE_WIDTH + 5;
            imagesInRow++;
          }
        }
        
        if (item.photo_urls.length > MAX_PHOTOS_PER_ITEM) {
          helpers.yPos += 5;
          addText(helpers, `... e mais ${item.photo_urls.length - MAX_PHOTOS_PER_ITEM} foto(s)`, PAGE_MARGIN + 5, helpers.yPos, { fontSize: 7, color: '#6B7280' });
        }
        
        if (imagesInRow > 0) {
          helpers.yPos += MAX_IMAGE_HEIGHT + 10;
        }
      }

      helpers.yPos += 5;
    }
  }

  // Conformities section
  const conformItems = data.items.filter(item => item.answer === true);
  
  if (conformItems.length > 0) {
    checkPageBreak(helpers, 30);
    addLine(helpers, helpers.yPos);
    helpers.yPos += 10;

    addSectionHeader(helpers, `CONFORMIDADES (${conformItems.length})`, '#10B981');

    for (let i = 0; i < conformItems.length; i++) {
      const item = conformItems[i];
      checkPageBreak(helpers, 12);

      // Checkmark
      pdf.setFillColor('#10B981');
      pdf.circle(PAGE_MARGIN + 4, helpers.yPos + 2, 3, 'F');
      addText(helpers, 'V', PAGE_MARGIN + 2.5, helpers.yPos + 4, { fontSize: 7, fontStyle: 'bold', color: '#FFFFFF' });
      
      addText(helpers, item.question, PAGE_MARGIN + 12, helpers.yPos + 4, { fontSize: 9, maxWidth: pageWidth - 2 * PAGE_MARGIN - 20 });
      
      // Senso tags inline
      if (item.senso.length > 0) {
        const sensoText = item.senso.join(', ');
        addText(helpers, `[${sensoText}]`, pageWidth - PAGE_MARGIN - 25, helpers.yPos + 4, { fontSize: 7, color: '#3B82F6' });
      }
      
      helpers.yPos += 10;
    }
  }

  // Observations
  if (data.observations) {
    checkPageBreak(helpers, 30);
    helpers.yPos += 5;
    addLine(helpers, helpers.yPos);
    helpers.yPos += 10;

    addSectionHeader(helpers, 'OBSERVACOES GERAIS');
    addText(helpers, data.observations, PAGE_MARGIN, helpers.yPos, { fontSize: 10, maxWidth: pageWidth - 2 * PAGE_MARGIN });
    helpers.yPos += 15;
  }

  // Next audit date
  if (data.next_audit_date) {
    checkPageBreak(helpers, 20);
    addText(helpers, `Proxima auditoria programada: ${format(new Date(data.next_audit_date), 'dd/MM/yyyy', { locale: ptBR })}`, PAGE_MARGIN, helpers.yPos, { fontSize: 10, fontStyle: 'bold', color: '#3B82F6' });
  }

  // Footer on last page
  addPageFooter(helpers);

  // Save
  const fileName = `Auditoria_5S_${sanitizeTextForPDF(data.location_name).replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);
}

export async function generateCompanyReportPDF(data: CompanyReportData): Promise<void> {
  const helpers = createPDFHelpers();
  const { pdf, pageWidth } = helpers;

  // Header
  addText(helpers, 'RELATORIO CONSOLIDADO 5S', 0, helpers.yPos, { fontSize: 18, fontStyle: 'bold', align: 'center' });
  helpers.yPos += 8;
  addText(helpers, data.company_name, 0, helpers.yPos, { fontSize: 14, color: '#3B82F6', align: 'center' });
  helpers.yPos += 8;
  
  // Period if available
  if (data.period_start || data.period_end) {
    const periodText = `Periodo: ${data.period_start ? format(new Date(data.period_start), 'dd/MM/yyyy', { locale: ptBR }) : 'Inicio'} - ${data.period_end ? format(new Date(data.period_end), 'dd/MM/yyyy', { locale: ptBR }) : 'Atual'}`;
    addText(helpers, periodText, 0, helpers.yPos, { fontSize: 10, color: '#6B7280', align: 'center' });
    helpers.yPos += 8;
  }

  addLine(helpers, helpers.yPos);
  helpers.yPos += 10;

  // Executive summary
  addSectionHeader(helpers, 'RESUMO EXECUTIVO');
  
  addStatsBoxes(helpers, [
    { label: 'Auditorias', value: String(data.total_audits), color: '#3B82F6' },
    { label: 'Media Geral', value: data.average_score.toFixed(1) + '/10', color: data.average_score >= 7 ? '#10B981' : data.average_score >= 5 ? '#F59E0B' : '#EF4444' },
    { label: 'Locais', value: String(data.locations_ranking.length) },
  ]);

  // Totals conformities
  addStatsBoxes(helpers, [
    { label: 'Conformidades', value: String(data.total_conformities), color: '#10B981' },
    { label: 'Nao Conformidades', value: String(data.total_non_conformities), color: '#EF4444' },
  ]);

  addLine(helpers, helpers.yPos);
  helpers.yPos += 10;

  // Environment Summary Table (level 1 only)
  if (data.environment_senso_table.length > 0) {
    addSectionHeader(helpers, 'RESUMO POR AMBIENTE');
    renderEnvironmentSummaryTable(helpers, data.environment_senso_table);
    helpers.yPos += 5;
    addLine(helpers, helpers.yPos);
    helpers.yPos += 10;
  }

  // Environment Senso Table (full hierarchical)
  if (data.environment_senso_table.length > 0) {
    addSectionHeader(helpers, 'DESEMPENHO POR AMBIENTE / LOCAL');
    renderEnvironmentSensoTable(helpers, data.environment_senso_table);
    helpers.yPos += 5;
    addLine(helpers, helpers.yPos);
    helpers.yPos += 10;
  }

  // Senso averages
  addSectionHeader(helpers, 'DESEMPENHO POR SENSO');
  addSensoProgressBars(helpers, data.senso_averages);
  
  helpers.yPos += 5;
  addLine(helpers, helpers.yPos);
  helpers.yPos += 10;

  // Location rankings
  if (data.locations_ranking.length > 0) {
    addSectionHeader(helpers, 'RANKING DE LOCAIS');

    // Table header
    pdf.setFillColor('#F3F4F6');
    pdf.rect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 8, 'F');
    addText(helpers, '#', PAGE_MARGIN + 3, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    addText(helpers, 'Local', PAGE_MARGIN + 12, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    addText(helpers, 'Auditorias', pageWidth - PAGE_MARGIN - 50, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    addText(helpers, 'Media', pageWidth - PAGE_MARGIN - 20, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    helpers.yPos += 10;

    for (let i = 0; i < Math.min(data.locations_ranking.length, 15); i++) {
      checkPageBreak(helpers, 10);
      const loc = data.locations_ranking[i];
      
      // Alternating row color
      if (i % 2 === 0) {
        pdf.setFillColor('#F9FAFB');
        pdf.rect(PAGE_MARGIN, helpers.yPos - 2, pageWidth - 2 * PAGE_MARGIN, 8, 'F');
      }
      
      // Position badge
      let posColor = '#6B7280';
      if (i === 0) posColor = '#FFD700';
      else if (i === 1) posColor = '#C0C0C0';
      else if (i === 2) posColor = '#CD7F32';
      
      pdf.setFillColor(posColor);
      pdf.circle(PAGE_MARGIN + 5, helpers.yPos + 1, 3, 'F');
      addText(helpers, String(i + 1), PAGE_MARGIN + 3.5, helpers.yPos + 3, { fontSize: 6, fontStyle: 'bold', color: '#FFFFFF' });
      
      // Location name (truncate if too long)
      const locName = loc.location_name.length > 35 ? loc.location_name.substring(0, 32) + '...' : loc.location_name;
      addText(helpers, locName, PAGE_MARGIN + 12, helpers.yPos + 4, { fontSize: 9 });
      
      addText(helpers, String(loc.audit_count), pageWidth - PAGE_MARGIN - 45, helpers.yPos + 4, { fontSize: 9 });
      
      // Score with color
      const scoreColor = loc.average_score >= 7 ? '#10B981' : loc.average_score >= 5 ? '#F59E0B' : '#EF4444';
      addText(helpers, `${loc.average_score.toFixed(1)}`, pageWidth - PAGE_MARGIN - 18, helpers.yPos + 4, { fontSize: 9, fontStyle: 'bold', color: scoreColor });
      
      helpers.yPos += 8;
    }
    
    helpers.yPos += 5;
    addLine(helpers, helpers.yPos);
    helpers.yPos += 10;
  }

  // Audit history
  if (data.audits.length > 0) {
    addSectionHeader(helpers, 'HISTORICO DE AUDITORIAS');

    // Table header
    pdf.setFillColor('#F3F4F6');
    pdf.rect(PAGE_MARGIN, helpers.yPos, pageWidth - 2 * PAGE_MARGIN, 8, 'F');
    addText(helpers, 'Data', PAGE_MARGIN + 3, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    addText(helpers, 'Local', PAGE_MARGIN + 28, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    addText(helpers, 'Auditor', pageWidth - PAGE_MARGIN - 70, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    addText(helpers, 'Nota', pageWidth - PAGE_MARGIN - 18, helpers.yPos + 5, { fontSize: 8, fontStyle: 'bold' });
    helpers.yPos += 10;

    for (let i = 0; i < Math.min(data.audits.length, 20); i++) {
      checkPageBreak(helpers, 10);
      const audit = data.audits[i];
      
      if (i % 2 === 0) {
        pdf.setFillColor('#F9FAFB');
        pdf.rect(PAGE_MARGIN, helpers.yPos - 2, pageWidth - 2 * PAGE_MARGIN, 8, 'F');
      }
      
      const dateStr = audit.date ? format(new Date(audit.date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
      addText(helpers, dateStr, PAGE_MARGIN + 3, helpers.yPos + 4, { fontSize: 8 });
      
      const locName = audit.location_name.length > 30 ? audit.location_name.substring(0, 27) + '...' : audit.location_name;
      addText(helpers, locName, PAGE_MARGIN + 28, helpers.yPos + 4, { fontSize: 8 });
      
      const auditorName = audit.auditor_name.length > 15 ? audit.auditor_name.substring(0, 12) + '...' : audit.auditor_name;
      addText(helpers, auditorName, pageWidth - PAGE_MARGIN - 70, helpers.yPos + 4, { fontSize: 8 });
      
      const scoreColor = (audit.score || 0) >= 7 ? '#10B981' : (audit.score || 0) >= 5 ? '#F59E0B' : '#EF4444';
      addText(helpers, audit.score !== null ? audit.score.toFixed(1) : 'N/A', pageWidth - PAGE_MARGIN - 15, helpers.yPos + 4, { fontSize: 8, fontStyle: 'bold', color: scoreColor });
      
      helpers.yPos += 8;
    }

    if (data.audits.length > 20) {
      helpers.yPos += 3;
      addText(helpers, `... e mais ${data.audits.length - 20} auditorias`, PAGE_MARGIN, helpers.yPos, { fontSize: 8, color: '#6B7280' });
      helpers.yPos += 8;
    }

    helpers.yPos += 5;
    addLine(helpers, helpers.yPos);
    helpers.yPos += 10;
  }

  // Non-conformities section with photos - LIMITED to prevent timeout
  if (data.non_conformities.length > 0) {
    const ncCount = Math.min(data.non_conformities.length, MAX_NON_CONFORMITIES_COMPANY_REPORT);
    addSectionHeader(helpers, `NAO CONFORMIDADES (${ncCount} de ${data.non_conformities.length})`, '#EF4444');

    console.log(`[PDF] Processing ${ncCount} non-conformities...`);
    
    // Limit non-conformities to prevent infinite loading
    for (let i = 0; i < ncCount; i++) {
      const nc = data.non_conformities[i];
      checkPageBreak(helpers, 50);

      // Card background - calculate dynamic height based on content
      const hasPhotos = nc.photo_urls.length > 0;
      const photoRows = hasPhotos ? Math.ceil(nc.photo_urls.length / MAX_IMAGES_PER_ROW) : 0;
      const cardHeight = 35 + (nc.comment ? 12 : 0) + (photoRows * (MAX_IMAGE_HEIGHT + 5));
      
      pdf.setFillColor('#FEF2F2');
      pdf.roundedRect(PAGE_MARGIN, helpers.yPos - 2, pageWidth - 2 * PAGE_MARGIN, Math.min(cardHeight, 60), 2, 2, 'F');
      
      // Number badge
      pdf.setFillColor('#EF4444');
      pdf.circle(PAGE_MARGIN + 8, helpers.yPos + 6, 5, 'F');
      addText(helpers, String(i + 1), PAGE_MARGIN + 6, helpers.yPos + 8, { fontSize: 9, fontStyle: 'bold', color: '#FFFFFF' });
      
      // Location and date
      const dateStr = nc.audit_date ? format(new Date(nc.audit_date), 'dd/MM/yyyy', { locale: ptBR }) : '';
      addText(helpers, `${nc.location_path} - ${dateStr}`, PAGE_MARGIN + 18, helpers.yPos + 5, { fontSize: 8, color: '#6B7280' });
      helpers.yPos += 8;
      
      // Question
      addText(helpers, nc.question, PAGE_MARGIN + 18, helpers.yPos + 5, { fontSize: 10, fontStyle: 'bold', maxWidth: pageWidth - 2 * PAGE_MARGIN - 25 });
      helpers.yPos += 10;
      
      // Auditor
      addText(helpers, `Auditor: ${nc.auditor_name}`, PAGE_MARGIN + 18, helpers.yPos + 5, { fontSize: 8, color: '#6B7280' });
      helpers.yPos += 8;
      
      // Comment
      if (nc.comment) {
        addText(helpers, `Obs: ${nc.comment}`, PAGE_MARGIN + 18, helpers.yPos + 3, { fontSize: 9, color: '#374151', maxWidth: pageWidth - 2 * PAGE_MARGIN - 25 });
        helpers.yPos += 12;
      }

      // Photos indicator (NO image loading for speed - images only in individual audit reports)
      if (nc.photo_urls.length > 0) {
        addText(helpers, `📷 ${nc.photo_urls.length} foto(s) de evidência disponível(is)`, PAGE_MARGIN + 18, helpers.yPos + 3, { fontSize: 8, color: '#3B82F6' });
        helpers.yPos += 8;
      }

      helpers.yPos += 8;
    }
    
    // Show message if there are more non-conformities
    if (data.non_conformities.length > MAX_NON_CONFORMITIES_COMPANY_REPORT) {
      helpers.yPos += 5;
      addText(helpers, `... e mais ${data.non_conformities.length - MAX_NON_CONFORMITIES_COMPANY_REPORT} não conformidades registradas`, PAGE_MARGIN, helpers.yPos, { fontSize: 9, color: '#6B7280' });
      helpers.yPos += 10;
    }
    
    console.log('[PDF] Non-conformities section complete');
  }

  // Footer on last page
  addPageFooter(helpers);

  const fileName = `Relatorio_5S_${sanitizeTextForPDF(data.company_name).replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);
}
