import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadOrSharePDF } from './downloadPDF';

export const generateStatsImage = async (data: { 
  faltas: string[]; 
  afastamentos: string[]; 
  ferias: string[]; 
  percentual: string;
  title: string;
  subtitle?: string;
  shift?: string;
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString('pt-BR');
  const totalOcorrencias = data.faltas.length + data.afastamentos.length + data.ferias.length;

  // ── HEADER ──
  doc.setFillColor(15, 30, 54); // Slate-900
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(data.title, 14, 18);
  
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.subtitle || 'Resumo de Frequência do Turno', 14, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Gerado em ${generatedAt}`, 210 - 14 - doc.getTextWidth(`Gerado em ${generatedAt}`), 22);

  // ── KPI SECTION ──
  let startY = 45;

  // Box 1: Absenteísmo Total
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, 55, 20, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ABSENTEÍSMO TOTAL', 18, startY + 7);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text(data.percentual, 18, startY + 16);

  // Box 2: Total Ocorrências
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(73, startY, 55, 20, 2, 2, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('TOTAL DE OCORRÊNCIAS', 77, startY + 7);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text(totalOcorrencias.toString(), 77, startY + 16);

  startY += 28;

  // ── KPIS EM TABELA (Resumo Menor) ──
  autoTable(doc, {
    startY,
    head: [['Indicador de Ausência', 'Quantidade']],
    body: [
      ['Faltas Injustificadas', String(data.faltas.length)],
      ['Afastamentos', String(data.afastamentos.length)],
      ['Em Férias', String(data.ferias.length)],
    ],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    headStyles: { 
      fillColor: [248, 250, 252], 
      textColor: [100, 116, 139],
      fontStyle: 'bold',
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.5 },
    },
    bodyStyles: { textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    willDrawCell: function(data) {
      if (data.section === 'body') {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  // ── DETALHAMENTO DE OCORRÊNCIAS ──
  const sectionRows = [
    ...data.faltas.map((name) => [{ content: 'Falta', rawStatus: 'F' }, name]),
    ...data.afastamentos.map((name) => [{ content: 'Afastamento', rawStatus: 'A' }, name]),
    ...data.ferias.map((name) => [{ content: 'Férias', rawStatus: 'Fe' }, name]),
  ];

  const currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 30, 54);
  doc.text('Detalhamento por Colaborador', 14, currentY);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Categoria', 'Colaborador']],
    body: sectionRows.length ? sectionRows as any : [['Sem ocorrências', 'Nenhum colaborador registrado']],
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    headStyles: { 
      fillColor: [248, 250, 252], 
      textColor: [100, 116, 139],
      fontStyle: 'bold',
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.5 },
    },
    bodyStyles: { textColor: [51, 65, 85] },
    columnStyles: {
      1: { fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 0 && data.cell.raw) {
        const rawStatus = (data.cell.raw as any).rawStatus;
        if (rawStatus === 'F') data.cell.styles.textColor = [239, 68, 68];
        else if (rawStatus === 'A' || rawStatus === 'Fe') data.cell.styles.textColor = [59, 130, 246];
      }
    },
    willDrawCell: function(data) {
      if (data.section === 'body') {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });

  // ── FOOTER & PAGINATION ──
  const pageCount = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 282, 196, 282);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Relatório Vonixx · Documento de uso interno`, 14, 288);
    const pageText = `Página ${i} de ${pageCount}`;
    doc.text(pageText, 210 - 14 - doc.getTextWidth(pageText), 288);
  }

  // Date formatting for filename
  const dateObj = new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const dateStr = `${day}${month}${year}`;
  
  const fileName = data.shift 
    ? `Frequencia_Vonixx_Turno${data.shift}_${dateStr}.pdf` 
    : `resumo_turno_detalhado_${dateStr}.pdf`;

  // Faz o download inteligente (Native Share vs Web Download)
  await downloadOrSharePDF(doc, fileName);
};
