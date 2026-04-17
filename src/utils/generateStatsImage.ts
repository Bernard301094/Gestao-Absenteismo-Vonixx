import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateStatsImage = async (data: { 
  faltas: string[]; 
  afastamentos: string[]; 
  ferias: string[]; 
  percentual: string 
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString('pt-BR');
  const totalOcorrencias = data.faltas.length + data.afastamentos.length + data.ferias.length;

  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Resumo do Turno', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Relatório Executivo de Frequência', 14, 20);
  doc.text(`Gerado em ${generatedAt}`, 14, 26);

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Indicadores-chave', 14, 42);

  autoTable(doc, {
    startY: 46,
    theme: 'grid',
    head: [['Indicador', 'Valor']],
    body: [
      ['Absenteísmo Total', data.percentual],
      ['Faltas', String(data.faltas.length)],
      ['Afastamentos', String(data.afastamentos.length)],
      ['Em Férias', String(data.ferias.length)],
      ['Total de Ocorrências', String(totalOcorrencias)],
    ],
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 2.5, textColor: [55, 65, 81] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', cellWidth: 70 },
    },
  });

  const sectionRows = [
    ...data.faltas.map((name) => ['Falta', name]),
    ...data.afastamentos.map((name) => ['Afastamento', name]),
    ...data.ferias.map((name) => ['Férias', name]),
  ];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    theme: 'striped',
    head: [['Categoria', 'Colaborador']],
    body: sectionRows.length ? sectionRows : [['Sem ocorrências', 'Nenhum colaborador registrado']],
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, textColor: [31, 41, 55], cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 130 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const footerY = (doc as any).lastAutoTable.finalY + 12;
  doc.setDrawColor(229, 231, 235);
  doc.line(14, footerY, 196, footerY);
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Vonixx Frequência · Documento de uso interno', 14, footerY + 5);

  doc.save('resumo_turno_detalhado.pdf');
};
