import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MONTH_NAMES } from './constants';
import { downloadOrSharePDF } from './downloadPDF';

export const exportToPDF = async (
  title: string,
  employees: any[],
  attendance: any,
  selectedDay: number | 'all',
  currentMonth: number,
  currentYear: number,
  signatureData?: string // base64 image
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Calculate Metrics
  const validEmployees = employees.filter(e => !e.dismissed);
  const totalEmployees = validEmployees.length;
  let totalFaltas = 0;
  let totalPresentes = 0;

  validEmployees.forEach(emp => {
    if (selectedDay !== 'all') {
      const status = attendance[emp.id]?.[selectedDay] || 'P';
      if (status === 'F') totalFaltas++;
      if (status === 'P') totalPresentes++;
    } else {
      const monthAttendance = attendance[emp.id] || {};
      totalFaltas += Object.values(monthAttendance).filter((s: any) => s === 'F').length;
    }
  });

  // ── HEADER ──
  doc.setFillColor(15, 30, 54); // Slate-900 background
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Logístico & HR', 14, 18);

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);

  const dateText = `Período: ${selectedDay === 'all' ? 'Mensal' : `${selectedDay.toString().padStart(2, '0')}`} de ${MONTH_NAMES[currentMonth]} de ${currentYear}`;
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(dateText, 210 - 14 - doc.getTextWidth(dateText), 22);

  // ── KPI SECTION ──
  let startY = 45;

  // Box 1: Total Employees
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, 55, 20, 2, 2, 'FD');
  
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DE COLABORADORES', 18, startY + 7);
  
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFontSize(18);
  doc.text(totalEmployees.toString(), 18, startY + 16);

  // Box 2: Faltas
  doc.setFillColor(254, 242, 242); // Red-50
  doc.setDrawColor(254, 202, 202); // Red-200
  doc.roundedRect(73, startY, 55, 20, 2, 2, 'FD');

  doc.setTextColor(220, 38, 38); // Red-600
  doc.setFontSize(8);
  doc.text(selectedDay === 'all' ? 'FALTAS (MÊS)' : 'FALTAS (DIA)', 77, startY + 7);
  
  doc.setFontSize(18);
  doc.text(totalFaltas.toString(), 77, startY + 16);

  // Box 3: Presentes (somente se for dia)
  if (selectedDay !== 'all') {
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(167, 243, 208); // Emerald-200
    doc.roundedRect(132, startY, 55, 20, 2, 2, 'FD');

    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.setFontSize(8);
    doc.text('PRESENTES (DIA)', 136, startY + 7);
    
    doc.setFontSize(18);
    doc.text(totalPresentes.toString(), 136, startY + 16);
  }

  startY += 28; // Move below KPIs

  // ── TABLE ──
  const tableData = validEmployees.map(emp => {
    let statusRaw = 'P';
    let statusVal = '';
    
    if (selectedDay !== 'all') {
      statusRaw = attendance[emp.id]?.[selectedDay] || 'P';
      const map: any = { P: 'Presente', F: 'Falta', Fe: 'Férias', A: 'Afastamento' };
      statusVal = map[statusRaw] || statusRaw;
    } else {
      const monthAttendance = attendance[emp.id] || {};
      const faltas = Object.values(monthAttendance).filter((s:any) => s === 'F').length;
      statusVal = faltas > 0 ? `${faltas} Falta(s)` : 'Sem faltas';
      statusRaw = faltas > 0 ? 'F' : 'P';
    }
    
    return [
      `#${emp.id.padStart(3, '0')}`,
      emp.name, 
      emp.role || 'Equipe', 
      { content: statusVal, rawStatus: statusRaw } // Objeto para estilizacao condicional
    ];
  });

  autoTable(doc, {
    startY,
    head: [['ID', 'Nome do Colaborador', 'Cargo', 'Status']],
    body: tableData as any,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: { 
      fillColor: [248, 250, 252], 
      textColor: [100, 116, 139],
      fontStyle: 'bold',
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.5 },
      halign: 'left'
    },
    bodyStyles: {
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [148, 163, 184] }, // ID cinza claro
      1: { fontStyle: 'bold', textColor: [15, 23, 42] }     // Nome escuro
    },
    didParseCell: function(data) {
      // Colorize Status column based on rawStatus
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw) {
        const rawStatus = (data.cell.raw as any).rawStatus;
        if (rawStatus === 'P') data.cell.styles.textColor = [16, 185, 129]; // Verde
        else if (rawStatus === 'F') data.cell.styles.textColor = [239, 68, 68]; // Vermelho
        else if (rawStatus === 'Fe' || rawStatus === 'A') data.cell.styles.textColor = [59, 130, 246]; // Azul
      }
    },
    willDrawCell: function(data) {
      // Draw horizontal line below each row
      if (data.section === 'body') {
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.2);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  // ── SIGNATURE AREA ──
  let finalY = (doc as any).lastAutoTable.finalY + 30;
  
  // If signature doesn't fit on this page, add a new page
  if (finalY > 250) {
    doc.addPage();
    finalY = 40;
  }

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(14, finalY, 80, finalY); // Linha de assinatura
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Supervisor', 14, finalY + 5);

  if (signatureData) {
    doc.addImage(signatureData, 'PNG', 14, finalY - 18, 50, 15);
  }

  // ── FOOTER & PAGINATION ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  const timestamp = new Date().toLocaleString('pt-BR');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Draw footer line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 282, 196, 282);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    
    // Left: Timestamp
    doc.text(`Relatório Vonixx · Gerado em ${timestamp}`, 14, 288);
    
    // Right: Pagination
    const pageText = `Página ${i} de ${pageCount}`;
    doc.text(pageText, 210 - 14 - doc.getTextWidth(pageText), 288);
  }

  // Save the PDF
  const prefix = selectedDay === 'all' ? 'Mensal' : 'Diario';
  const fileName = `Relatorio_${prefix}_${title.replace(/\s+/g, '_')}_${currentYear}.pdf`;
  await downloadOrSharePDF(doc, fileName);
};
