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
  signatureData?: string,
  notes?: any // NotesRecord
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const hasAtestado = (empId: string, day: number | 'all'): boolean => {
    if (!notes || day === 'all') return false;
    const note = notes[empId]?.[day as number] || '';
    return note.toLowerCase().includes('atestado');
  };

  // ── MÉTRICAS ──
  const validEmployees = employees.filter(e => !e.dismissed);
  const totalEmployees = validEmployees.length;
  let totalFaltas = 0;
  let totalJustificadas = 0;
  let totalPresentes = 0;

  validEmployees.forEach(emp => {
    if (selectedDay !== 'all') {
      const status = attendance[emp.id]?.[selectedDay] || 'P';
      const justified = status === 'F' && hasAtestado(emp.id, selectedDay);
      if (status === 'F' && !justified) totalFaltas++;
      if (justified) totalJustificadas++;
      if (status === 'P') totalPresentes++;
    } else {
      const monthAttendance = attendance[emp.id] || {};
      totalFaltas += Object.values(monthAttendance).filter((s: any) => s === 'F').length;
    }
  });

  // ── HEADER ──
  doc.setFillColor(15, 30, 54);
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Logístico & HR', 14, 18);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);

  const dateText = `Período: ${selectedDay === 'all' ? 'Mensal' : `${String(selectedDay).padStart(2, '0')}`} de ${MONTH_NAMES[currentMonth]} de ${currentYear}`;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(dateText, 210 - 14 - doc.getTextWidth(dateText), 22);

  // ── KPI SECTION ──
  let startY = 45;

  if (selectedDay !== 'all' && totalJustificadas > 0) {
    // 4 KPIs: Colaboradores | Faltas | F. Justificadas | Presentes
    const boxW = 43;
    const gap = 4;
    const startX = 14;

    // Box 1: Total
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(startX, startY, boxW, 20, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('COLABORADORES', startX + 4, startY + 7);
    doc.setTextColor(15, 23, 42); doc.setFontSize(18);
    doc.text(totalEmployees.toString(), startX + 4, startY + 16);

    // Box 2: Faltas
    const x2 = startX + boxW + gap;
    doc.setFillColor(254, 242, 242); doc.setDrawColor(254, 202, 202);
    doc.roundedRect(x2, startY, boxW, 20, 2, 2, 'FD');
    doc.setTextColor(220, 38, 38); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('FALTAS', x2 + 4, startY + 7);
    doc.setFontSize(18);
    doc.text(totalFaltas.toString(), x2 + 4, startY + 16);

    // Box 3: Justificadas
    const x3 = x2 + boxW + gap;
    doc.setFillColor(255, 247, 237); doc.setDrawColor(254, 215, 170); // orange-50 / orange-200
    doc.roundedRect(x3, startY, boxW, 20, 2, 2, 'FD');
    doc.setTextColor(234, 88, 12); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); // orange-600
    doc.text('F. JUSTIFICADAS', x3 + 4, startY + 7);
    doc.setFontSize(18);
    doc.text(totalJustificadas.toString(), x3 + 4, startY + 16);

    // Box 4: Presentes
    const x4 = x3 + boxW + gap;
    doc.setFillColor(236, 253, 245); doc.setDrawColor(167, 243, 208);
    doc.roundedRect(x4, startY, boxW, 20, 2, 2, 'FD');
    doc.setTextColor(5, 150, 105); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('PRESENTES', x4 + 4, startY + 7);
    doc.setFontSize(18);
    doc.text(totalPresentes.toString(), x4 + 4, startY + 16);

  } else {
    // Layout original: 3 KPIs
    doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, startY, 55, 20, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DE COLABORADORES', 18, startY + 7);
    doc.setTextColor(15, 23, 42); doc.setFontSize(18);
    doc.text(totalEmployees.toString(), 18, startY + 16);

    doc.setFillColor(254, 242, 242); doc.setDrawColor(254, 202, 202);
    doc.roundedRect(73, startY, 55, 20, 2, 2, 'FD');
    doc.setTextColor(220, 38, 38); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(selectedDay === 'all' ? 'FALTAS (MÊS)' : 'FALTAS (DIA)', 77, startY + 7);
    doc.setFontSize(18);
    doc.text(totalFaltas.toString(), 77, startY + 16);

    if (selectedDay !== 'all') {
      doc.setFillColor(236, 253, 245); doc.setDrawColor(167, 243, 208);
      doc.roundedRect(132, startY, 55, 20, 2, 2, 'FD');
      doc.setTextColor(5, 150, 105); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('PRESENTES (DIA)', 136, startY + 7);
      doc.setFontSize(18);
      doc.text(totalPresentes.toString(), 136, startY + 16);
    }
  }

  startY += 28;

  // ── TABLE ──
  const rawTableData = validEmployees.map(emp => {
    let statusRaw = 'P';
    let statusVal = '';

    if (selectedDay !== 'all') {
      statusRaw = attendance[emp.id]?.[selectedDay] || 'P';
      const justified = statusRaw === 'F' && hasAtestado(emp.id, selectedDay);
      if (justified) {
        statusRaw = 'FJ'; // código interno para falta justificada
        statusVal = 'Falta Justificada';
      } else {
        const map: any = { P: 'Presente', F: 'Falta', Fe: 'Férias', A: 'Afastamento' };
        statusVal = map[statusRaw] || statusRaw;
      }
    } else {
      const monthAttendance = attendance[emp.id] || {};
      const faltas = Object.values(monthAttendance).filter((s: any) => s === 'F').length;
      statusVal = faltas > 0 ? `${faltas} Falta(s)` : 'Sem faltas';
      statusRaw = faltas > 0 ? 'F' : 'P';
    }

    // Coluna de atestado: só relevante para visualização por dia
    const atestadoCol = selectedDay !== 'all'
      ? (hasAtestado(emp.id, selectedDay) ? 'Sim' : '-')
      : '';

    return {
      statusRaw,
      row: [
        `#${emp.id.padStart(3, '0')}`,
        emp.name,
        emp.role || 'Equipe',
        { content: statusVal, rawStatus: statusRaw },
        ...(selectedDay !== 'all' ? [{ content: atestadoCol, hasAtestado: hasAtestado(emp.id, selectedDay) }] : [])
      ]
    };
  });

  // Filtrar para dejar solo Faltas (F), Justificadas (FJ) y Afastamentos (A) si es diario
  let filteredTableData = rawTableData;
  if (selectedDay !== 'all') {
    filteredTableData = rawTableData.filter(item => 
      item.statusRaw === 'F' || 
      item.statusRaw === 'FJ' || 
      item.statusRaw === 'A'
    );
  }

  const tableData = filteredTableData.map(item => item.row);

  if (tableData.length === 0 && selectedDay !== 'all') {
    tableData.push([
      '-',
      'Nenhuma falta, atestado ou afastamento registrado.',
      '-',
      { content: '-', rawStatus: 'P' },
      '-'
    ]);
  }

  const headColumns = selectedDay !== 'all'
    ? ['ID', 'Nome do Colaborador', 'Cargo', 'Status', 'Atestado']
    : ['ID', 'Nome do Colaborador', 'Cargo', 'Status'];

  const colStyles: any = {
    0: { fontStyle: 'bold', textColor: [148, 163, 184] },
    1: { fontStyle: 'bold', textColor: [15, 23, 42] },
  };
  if (selectedDay !== 'all') {
    colStyles[3] = { cellWidth: 38 };
    colStyles[4] = { cellWidth: 22, halign: 'center' };
  }

  autoTable(doc, {
    startY,
    head: [headColumns],
    body: tableData as any,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [100, 116, 139],
      fontStyle: 'bold',
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.5 },
      halign: 'left'
    },
    bodyStyles: { textColor: [51, 65, 85] },
    columnStyles: colStyles,
    didParseCell: function (data) {
      if (data.section === 'body') {
        // Colorir coluna Status
        if (data.column.index === 3 && data.cell.raw && typeof data.cell.raw === 'object') {
          const rawStatus = (data.cell.raw as any).rawStatus;
          if (rawStatus === 'P')  data.cell.styles.textColor = [16, 185, 129];  // verde
          else if (rawStatus === 'F')  data.cell.styles.textColor = [239, 68, 68];   // vermelho
          else if (rawStatus === 'FJ') data.cell.styles.textColor = [234, 88, 12];   // laranja
          else if (rawStatus === 'Fe' || rawStatus === 'A') data.cell.styles.textColor = [59, 130, 246]; // azul
        }
        // Colorir coluna Atestado
        if (selectedDay !== 'all' && data.column.index === 4 && data.cell.raw && typeof data.cell.raw === 'object') {
          const ha = (data.cell.raw as any).hasAtestado;
          if (ha) data.cell.styles.textColor = [234, 88, 12]; // laranja
          else    data.cell.styles.textColor = [148, 163, 184]; // cinza
        }
      }
    },
    willDrawCell: function (data) {
      if (data.section === 'body') {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  // ── LEGENDA (só no modo dia) ──
  if (selectedDay !== 'all') {
    const legendY = (doc as any).lastAutoTable.finalY + 8;
    if (legendY < 270) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Legenda:', 14, legendY);
      doc.setFont('helvetica', 'normal');

      const items = [
        { color: [16, 185, 129] as [number,number,number], label: 'Presente' },
        { color: [239, 68, 68]  as [number,number,number], label: 'Falta' },
        { color: [234, 88, 12]  as [number,number,number], label: 'Falta Justificada (atestado médico)' },
        { color: [59, 130, 246] as [number,number,number], label: 'Férias / Afastamento' },
      ];

      let lx = 32;
      items.forEach(item => {
        doc.setFillColor(...item.color);
        doc.circle(lx, legendY - 1, 1.2, 'F');
        doc.setTextColor(...item.color);
        doc.text(item.label, lx + 3, legendY);
        lx += doc.getTextWidth(item.label) + 10;
      });
    }
  }

  // ── ÁREA DE ASSINATURA ──
  let finalY = (doc as any).lastAutoTable.finalY + 30;
  if (finalY > 250) { doc.addPage(); finalY = 40; }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, finalY, 80, finalY);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Supervisor', 14, finalY + 5);

  if (signatureData) doc.addImage(signatureData, 'PNG', 14, finalY - 18, 50, 15);

  // ── FOOTER & PAGINAÇÃO ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  const timestamp = new Date().toLocaleString('pt-BR');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 282, 196, 282);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Relatório Vonixx · Gerado em ${timestamp}`, 14, 288);
    const pageText = `Página ${i} de ${pageCount}`;
    doc.text(pageText, 210 - 14 - doc.getTextWidth(pageText), 288);
  }

  const prefix = selectedDay === 'all' ? 'Mensal' : 'Diario';
  const fileName = `Relatorio_${prefix}_${title.replace(/\s+/g, '_')}_${currentYear}.pdf`;
  await downloadOrSharePDF(doc, fileName);
};
