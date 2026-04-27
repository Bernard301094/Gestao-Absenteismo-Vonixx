import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MONTH_NAMES } from './constants';
import { downloadOrSharePDF } from './downloadPDF';

export const exportToPDF = async (
  title: string, // Ejemplo: "Turno A"
  employees: any[],
  attendance: any,
  selectedDay: number | 'all',
  currentMonth: number,
  currentYear: number,
  signatureData?: string,
  notes?: any 
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
    }
  });

  // ── HEADER DISEÑO MEJORADO ──
  // Fondo del encabezado
  doc.setFillColor(15, 23, 42); // Navy Blue muy oscuro
  doc.rect(0, 0, 210, 40, 'F');
  
  // Línea de acento
  doc.setFillColor(59, 130, 246); // Azul brillante
  doc.rect(0, 38, 210, 2, 'F');

  // Título Principal (Corregido según solicitud)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const mainTitle = `Lista de Faltas - Produção ${title}`;
  doc.text(mainTitle.toUpperCase(), 14, 18);

  // Subtítulo / Empresa
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('VONIXX ESTÉTICA AUTOMOTIVA · DEPARTAMENTO LOGÍSTICO', 14, 25);

  // Fecha del reporte
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('pt-BR');
  const periodText = selectedDay === 'all' 
    ? `RELATÓRIO MENSAL: ${MONTH_NAMES[currentMonth].toUpperCase()} / ${currentYear}`
    : `DATA: ${String(selectedDay).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(periodText, 210 - 14 - doc.getTextWidth(periodText), 22);

  // ── SECCIÓN DE KPIs ESTILIZADOS ──
  let startY = 50;

  if (selectedDay !== 'all') {
    const boxW = 44;
    const gap = 4;
    const startX = 14;

    const drawKPI = (x: number, label: string, value: string, color: [number, number, number], bgColor: [number, number, number], borderColor: [number, number, number]) => {
      doc.setFillColor(...bgColor);
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, startY, boxW, 22, 3, 3, 'FD');
      
      doc.setTextColor(...color);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label.toUpperCase(), x + 4, startY + 7);
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text(value, x + 4, startY + 17);
    };

    // KPI 1: Colaboradores
    drawKPI(startX, 'Colaboradores', totalEmployees.toString(), [100, 116, 139], [248, 250, 252], [226, 232, 240]);
    // KPI 2: Faltas
    drawKPI(startX + boxW + gap, 'Faltas Brutas', totalFaltas.toString(), [220, 38, 38], [254, 242, 242], [254, 202, 202]);
    // KPI 3: Justificadas
    drawKPI(startX + (boxW + gap) * 2, 'Atestados', totalJustificadas.toString(), [234, 88, 12], [255, 247, 237], [254, 215, 170]);
    // KPI 4: Presentes
    drawKPI(startX + (boxW + gap) * 3, 'Presentes', totalPresentes.toString(), [5, 150, 105], [236, 253, 245], [167, 243, 208]);

    startY += 32;
  }

  // ── TABLA FILTRADA (Sólo lo que no es Presente) ──
  const rawTableData = validEmployees.map(emp => {
    let statusRaw = 'P';
    let statusVal = '';

    if (selectedDay !== 'all') {
      statusRaw = attendance[emp.id]?.[selectedDay] || 'P';
      const justified = statusRaw === 'F' && hasAtestado(emp.id, selectedDay);
      if (justified) {
        statusRaw = 'FJ';
        statusVal = 'Falta Justificada';
      } else {
        const map: any = { P: 'Presente', F: 'Falta', Fe: 'Férias', A: 'Afastamento' };
        statusVal = map[statusRaw] || statusRaw;
      }
    }

    const atestadoCol = selectedDay !== 'all' ? (hasAtestado(emp.id, selectedDay) ? 'Sim' : '-') : '';

    return {
      statusRaw,
      row: [
        `#${emp.id.padStart(3, '0')}`,
        emp.name,
        emp.role || 'Equipe',
        { content: statusVal, rawStatus: statusRaw },
        atestadoCol
      ]
    };
  });

  // Aplicar filtro solicitado: Ocultar los "Presentes"
  const filteredTableData = selectedDay !== 'all' 
    ? rawTableData.filter(item => item.statusRaw !== 'P')
    : rawTableData;

  const tableRows = filteredTableData.map(item => item.row);

  // Mensaje si no hay incidencias
  if (tableRows.length === 0 && selectedDay !== 'all') {
    tableRows.push(['-', 'Nenhuma ocorrência (falta, férias ou afastamento) hoje.', '-', '-', '-']);
  }

  autoTable(doc, {
    startY,
    head: [['ID', 'COLABORADOR', 'CARGO', 'STATUS ATUAL', 'ATESTADO']],
    body: tableRows as any,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 4
    },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3.5, verticalAlign: 'middle' },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold', textColor: [100, 116, 139] },
      1: { fontStyle: 'bold' },
      3: { cellWidth: 40 },
      4: { cellWidth: 20, halign: 'center' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw) {
        const rs = (data.cell.raw as any).rawStatus;
        if (rs === 'F') data.cell.styles.textColor = [220, 38, 38];
        if (rs === 'FJ') data.cell.styles.textColor = [234, 88, 12];
        if (rs === 'Fe' || rs === 'A') data.cell.styles.textColor = [59, 130, 246];
      }
    }
  });

  // ── ÁREA DE FIRMA ──
  let finalY = (doc as any).lastAutoTable.finalY + 25;
  if (finalY > 260) { doc.addPage(); finalY = 40; }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, finalY, 80, finalY);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ASSINATURA DO SUPERVISOR', 14, finalY + 5);
  if (signatureData) doc.addImage(signatureData, 'PNG', 14, finalY - 15, 45, 12);

  // ── FOOTER ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Relatório Gerado em ${today.toLocaleString('pt-BR')} · Sistema de Gestão Vonixx`, 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 180, 290);
  }

  // ── NOMBRE DE ARCHIVO (Corregido según solicitud) ──
  const fileDate = today.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const fileName = `Lista_de_Faltas_Producao_${title.replace(/\s+/g, '_')}_${fileDate}.pdf`;
  
  await downloadOrSharePDF(doc, fileName);
};
