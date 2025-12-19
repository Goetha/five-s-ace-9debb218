import jsPDF from 'jspdf';
import type { AuditReportData, CompanyReportData } from './reportTypes';
import { SENSO_CONFIG, SensoKey } from './reportTypes';
import { getScoreLevelLabel, getScoreLevelColor } from './reportDataFormatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function generateAuditPDF(data: AuditReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper functions
  const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; color?: string; maxWidth?: number }) => {
    const { fontSize = 10, fontStyle = 'normal', color = '#000000', maxWidth } = options || {};
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(color);
    if (maxWidth) {
      pdf.text(text, x, y, { maxWidth });
    } else {
      pdf.text(text, x, y);
    }
  };

  const addLine = (y: number) => {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageWidth - margin, y);
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  addText('RELATÓRIO DE AUDITORIA 5S', pageWidth / 2, yPos, { fontSize: 18, fontStyle: 'bold' });
  pdf.setFontSize(18);
  const titleWidth = pdf.getTextWidth('RELATÓRIO DE AUDITORIA 5S');
  addText('RELATÓRIO DE AUDITORIA 5S', (pageWidth - titleWidth) / 2, yPos, { fontSize: 18, fontStyle: 'bold' });
  yPos += 12;

  addLine(yPos);
  yPos += 8;

  // Company and audit info
  addText('INFORMAÇÕES GERAIS', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#3B82F6' });
  yPos += 8;

  const infoLines = [
    `Empresa: ${data.company_name}`,
    `Local: ${data.area_name} > ${data.environment_name} > ${data.location_name}`,
    `Auditor: ${data.auditor_name}`,
    `Data: ${data.started_at ? format(new Date(data.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}`,
  ];

  for (const line of infoLines) {
    addText(line, margin, yPos, { fontSize: 10 });
    yPos += 6;
  }

  yPos += 5;
  addLine(yPos);
  yPos += 10;

  // Score Section
  addText('RESULTADO GERAL', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#3B82F6' });
  yPos += 10;

  // Score box
  const scoreBoxWidth = 60;
  const scoreBoxHeight = 35;
  const scoreBoxX = (pageWidth - scoreBoxWidth) / 2;
  
  pdf.setFillColor(getScoreLevelColor(data.score_level));
  pdf.roundedRect(scoreBoxX, yPos, scoreBoxWidth, scoreBoxHeight, 3, 3, 'F');
  
  addText(data.score !== null ? data.score.toFixed(1) : 'N/A', pageWidth / 2 - 8, yPos + 18, { fontSize: 24, fontStyle: 'bold', color: '#FFFFFF' });
  addText('/10', pageWidth / 2 + 12, yPos + 18, { fontSize: 12, color: '#FFFFFF' });
  addText(getScoreLevelLabel(data.score_level), pageWidth / 2 - 12, yPos + 28, { fontSize: 10, color: '#FFFFFF' });
  
  yPos += scoreBoxHeight + 10;

  // Summary stats
  const statsY = yPos;
  const statsBoxWidth = 50;
  
  // Yes box
  pdf.setFillColor(16, 185, 129);
  pdf.roundedRect(margin + 20, statsY, statsBoxWidth, 25, 2, 2, 'F');
  addText('Conforme', margin + 35, statsY + 10, { fontSize: 9, color: '#FFFFFF' });
  addText(String(data.total_yes), margin + 40, statsY + 20, { fontSize: 14, fontStyle: 'bold', color: '#FFFFFF' });

  // No box
  pdf.setFillColor(239, 68, 68);
  pdf.roundedRect(pageWidth - margin - 70, statsY, statsBoxWidth, 25, 2, 2, 'F');
  addText('Não Conforme', pageWidth - margin - 60, statsY + 10, { fontSize: 9, color: '#FFFFFF' });
  addText(String(data.total_no), pageWidth - margin - 50, statsY + 20, { fontSize: 14, fontStyle: 'bold', color: '#FFFFFF' });

  yPos += 35;
  addLine(yPos);
  yPos += 10;

  // Senso Scores
  addText('PERFORMANCE POR SENSO', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#3B82F6' });
  yPos += 8;

  for (const senso of data.senso_scores) {
    checkPageBreak(12);
    const sensoConfig = SENSO_CONFIG[senso.senso as SensoKey];
    const barWidth = 100;
    const barHeight = 6;
    const barX = margin + 50;
    
    addText(senso.senso, margin, yPos + 4, { fontSize: 9, fontStyle: 'bold' });
    
    // Background bar
    pdf.setFillColor(229, 231, 235);
    pdf.roundedRect(barX, yPos, barWidth, barHeight, 1, 1, 'F');
    
    // Progress bar
    pdf.setFillColor(sensoConfig?.color || '#6B7280');
    pdf.roundedRect(barX, yPos, (barWidth * senso.score) / 100, barHeight, 1, 1, 'F');
    
    addText(`${senso.score.toFixed(0)}%`, barX + barWidth + 5, yPos + 5, { fontSize: 9 });
    addText(`(${senso.conforme}/${senso.total})`, barX + barWidth + 25, yPos + 5, { fontSize: 8, color: '#6B7280' });
    
    yPos += 12;
  }

  yPos += 5;
  addLine(yPos);
  yPos += 10;

  // Non-conformities section
  const nonConformItems = data.items.filter(item => item.answer === false);
  
  if (nonConformItems.length > 0) {
    addText('NÃO CONFORMIDADES', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#EF4444' });
    yPos += 8;

    for (let i = 0; i < nonConformItems.length; i++) {
      const item = nonConformItems[i];
      checkPageBreak(30);

      // Item number and question
      pdf.setFillColor(254, 242, 242);
      pdf.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 20 + (item.comment ? 10 : 0), 2, 2, 'F');
      
      addText(`${i + 1}. ${item.question}`, margin + 3, yPos + 5, { fontSize: 10, fontStyle: 'bold', maxWidth: pageWidth - 2 * margin - 10 });
      
      if (item.comment) {
        addText(`Observação: ${item.comment}`, margin + 6, yPos + 15, { fontSize: 9, color: '#6B7280', maxWidth: pageWidth - 2 * margin - 15 });
      }
      
      if (item.senso.length > 0) {
        addText(`Senso: ${item.senso.join(', ')}`, margin + 6, yPos + (item.comment ? 23 : 15), { fontSize: 8, color: '#3B82F6' });
      }

      yPos += 25 + (item.comment ? 10 : 0);
    }
  }

  // Conformities section
  const conformItems = data.items.filter(item => item.answer === true);
  
  if (conformItems.length > 0) {
    checkPageBreak(30);
    yPos += 5;
    addLine(yPos);
    yPos += 10;

    addText('CONFORMIDADES', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#10B981' });
    yPos += 8;

    for (let i = 0; i < conformItems.length; i++) {
      const item = conformItems[i];
      checkPageBreak(15);

      addText(`✓ ${item.question}`, margin + 3, yPos + 5, { fontSize: 9, color: '#374151', maxWidth: pageWidth - 2 * margin - 10 });
      yPos += 10;
    }
  }

  // Observations
  if (data.observations) {
    checkPageBreak(30);
    yPos += 5;
    addLine(yPos);
    yPos += 10;

    addText('OBSERVAÇÕES GERAIS', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#3B82F6' });
    yPos += 8;
    addText(data.observations, margin, yPos, { fontSize: 10, maxWidth: pageWidth - 2 * margin });
  }

  // Footer
  const footerY = pageHeight - 10;
  addText(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, footerY, { fontSize: 8, color: '#9CA3AF' });
  addText('Sistema 5S Manager', pageWidth - margin - 35, footerY, { fontSize: 8, color: '#9CA3AF' });

  // Save
  const fileName = `Auditoria_5S_${data.location_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);
}

export async function generateCompanyReportPDF(data: CompanyReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; color?: string; maxWidth?: number }) => {
    const { fontSize = 10, fontStyle = 'normal', color = '#000000', maxWidth } = options || {};
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(color);
    if (maxWidth) {
      pdf.text(text, x, y, { maxWidth });
    } else {
      pdf.text(text, x, y);
    }
  };

  const addLine = (y: number) => {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageWidth - margin, y);
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  addText('RELATÓRIO CONSOLIDADO 5S', (pageWidth - 70) / 2, yPos, { fontSize: 18, fontStyle: 'bold' });
  yPos += 8;
  addText(data.company_name, (pageWidth - pdf.getTextWidth(data.company_name) * 0.35) / 2, yPos, { fontSize: 14, color: '#3B82F6' });
  yPos += 12;

  addLine(yPos);
  yPos += 10;

  // Summary stats
  addText('RESUMO EXECUTIVO', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#3B82F6' });
  yPos += 10;

  const statsData = [
    { label: 'Total de Auditorias', value: String(data.total_audits) },
    { label: 'Pontuação Média', value: data.average_score.toFixed(1) + '/10' },
    { label: 'Locais Auditados', value: String(data.locations_ranking.length) },
  ];

  const boxWidth = 50;
  const boxSpacing = 10;
  const startX = (pageWidth - (boxWidth * 3 + boxSpacing * 2)) / 2;

  statsData.forEach((stat, i) => {
    const x = startX + (boxWidth + boxSpacing) * i;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(x, yPos, boxWidth, 25, 2, 2, 'F');
    addText(stat.label, x + 5, yPos + 8, { fontSize: 8, color: '#6B7280' });
    addText(stat.value, x + 5, yPos + 18, { fontSize: 14, fontStyle: 'bold' });
  });

  yPos += 35;
  addLine(yPos);
  yPos += 10;

  // Senso averages
  addText('MÉDIA POR SENSO', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#3B82F6' });
  yPos += 10;

  for (const senso of data.senso_averages) {
    checkPageBreak(12);
    const sensoConfig = SENSO_CONFIG[senso.senso as SensoKey];
    const barWidth = 100;
    const barHeight = 6;
    const barX = margin + 50;
    
    addText(senso.senso, margin, yPos + 4, { fontSize: 9, fontStyle: 'bold' });
    
    pdf.setFillColor(229, 231, 235);
    pdf.roundedRect(barX, yPos, barWidth, barHeight, 1, 1, 'F');
    
    pdf.setFillColor(sensoConfig?.color || '#6B7280');
    pdf.roundedRect(barX, yPos, (barWidth * senso.score) / 100, barHeight, 1, 1, 'F');
    
    addText(`${senso.score.toFixed(0)}%`, barX + barWidth + 5, yPos + 5, { fontSize: 9 });
    
    yPos += 12;
  }

  yPos += 5;
  addLine(yPos);
  yPos += 10;

  // Locations ranking
  if (data.locations_ranking.length > 0) {
    addText('RANKING DE LOCAIS', margin, yPos, { fontSize: 12, fontStyle: 'bold', color: '#3B82F6' });
    yPos += 10;

    for (let i = 0; i < Math.min(data.locations_ranking.length, 10); i++) {
      checkPageBreak(12);
      const loc = data.locations_ranking[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      
      addText(medal, margin, yPos + 4, { fontSize: 10 });
      addText(loc.location_name, margin + 15, yPos + 4, { fontSize: 10 });
      addText(`${loc.average_score.toFixed(1)}/10`, pageWidth - margin - 30, yPos + 4, { fontSize: 10, fontStyle: 'bold' });
      addText(`(${loc.audit_count} auditorias)`, pageWidth - margin - 60, yPos + 4, { fontSize: 8, color: '#6B7280' });
      
      yPos += 10;
    }
  }

  // Footer
  const footerY = pageHeight - 10;
  addText(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, footerY, { fontSize: 8, color: '#9CA3AF' });
  addText('Sistema 5S Manager', pageWidth - margin - 35, footerY, { fontSize: 8, color: '#9CA3AF' });

  const fileName = `Relatorio_5S_${data.company_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);
}
