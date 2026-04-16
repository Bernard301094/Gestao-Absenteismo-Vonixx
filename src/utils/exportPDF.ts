import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MONTH_NAMES } from './constants';

export const exportToPDF = (
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

  // Professional Header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Relatório Logístico & HR', 14, 18);
  doc.setFontSize(14);
  doc.text(title, 14, 25);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text(`Data: ${selectedDay === 'all' ? 'Todo o mês' : selectedDay} de ${MONTH_NAMES[currentMonth]} de ${currentYear}`, 14, 35);

  // Table
  const tableData = employees.map(emp => {
    let status = 'P';
    if (selectedDay !== 'all') {
      status = attendance[emp.id]?.[selectedDay] || 'P';
    } else {
      const monthAttendance = attendance[emp.id] || {};
      status = Object.values(monthAttendance).filter((s:any) => s === 'F').length.toString() + ' Faltas';
    }
    return [emp.name, emp.role || '-', status];
  });

  autoTable(doc, {
    startY: 40,
    head: [['Nome', 'Cargo', 'Status/Faltas']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
  });

  // Signature Area
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.text('__________________________', 14, finalY);
  doc.text('Assinatura do Supervisor', 14, finalY + 5);

  if (signatureData) {
    doc.addImage(signatureData, 'PNG', 14, finalY - 15, 50, 15);
  }

  doc.save(`Relatorio_${title.replace(/\s+/g, '_')}_${currentYear}.pdf`);
};
