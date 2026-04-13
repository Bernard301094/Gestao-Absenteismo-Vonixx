/**
 * exportStyledExcel — Gera um arquivo Excel estilizado usando a API
 * de baixo nível do SheetJS (xlsx), sem dependências externas.
 *
 * Funcionalidades:
 *  - Linha de título com merge de colunas e fundo azul escuro
 *  - Cabeçalho de colunas com fundo azul médio e fonte branca em negrito
 *  - Linhas de dados com alternância de cor (branco / cinza claro)
 *  - Células de status coloridas semanticamente:
 *      P  → fundo verde suave
 *      F  → fundo vermelho suave
 *      Fe → fundo azul suave
 *      A  → fundo laranja suave
 *  - Linha de totais no rodapé com negrito
 *  - Larguras de coluna automáticas
 *  - Bordas finas em todas as células de dados
 */

import * as XLSX from 'xlsx';
import { MONTH_NAMES } from './constants';
import type { Employee, Status, AttendanceRecord } from '../types';

// ─── Paleta de Cores ──────────────────────────────────────────────────────────
const COLORS = {
  headerBg:   '1E3A8A', // azul escuro da marca
  headerFont: 'FFFFFF',
  titleBg:    '1e40af',
  titleFont:  'FFFFFF',
  subHeaderBg:'EFF6FF',
  subHeaderFont:'1E3A8A',
  altRow:     'F8FAFF',
  white:      'FFFFFF',
  totalBg:    'F1F5F9',
  totalFont:  '1E293B',

  // Status
  presentBg:  'DCFCE7', presentFont: '166534',
  faltaBg:    'FEE2E2', faltaFont:   '991B1B',
  feriasBg:   'DBEAFE', feriasFont:  '1E40AF',
  afastBg:    'FEF3C7', afastFont:   '92400E',
};

// ─── Helpers de estilo ────────────────────────────────────────────────────────

function solidFill(argb: string) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } } as any;
}

function border(style: 'thin' | 'medium' = 'thin') {
  const b = { style, color: { argb: 'D1D5DB' } };
  return { top: b, left: b, bottom: b, right: b };
}

function headerBorder() {
  const b = { style: 'medium' as const, color: { argb: '1E3A8A' } };
  return { top: b, left: b, bottom: b, right: b };
}

function statusStyle(status: Status) {
  switch (status) {
    case 'F':  return { fill: solidFill(COLORS.faltaBg),   font: { color: { argb: COLORS.faltaFont },   bold: true, size: 10 } };
    case 'Fe': return { fill: solidFill(COLORS.feriasBg),  font: { color: { argb: COLORS.feriasFont },  bold: true, size: 10 } };
    case 'A':  return { fill: solidFill(COLORS.afastBg),   font: { color: { argb: COLORS.afastFont },   bold: true, size: 10 } };
    default:   return { fill: solidFill(COLORS.presentBg), font: { color: { argb: COLORS.presentFont }, bold: true, size: 10 } };
  }
}

// ─── Export Principal ─────────────────────────────────────────────────────────

export function exportStyledExcel(params: {
  employees: Employee[];
  attendance: AttendanceRecord;
  validWorkDays: number[];
  currentMonth: number;
  currentYear: number;
  shiftLabel: string;
}) {
  const { employees, attendance, validWorkDays, currentMonth, currentYear, shiftLabel } = params;

  const wb = XLSX.utils.book_new();
  (wb as any).SheetNames = [];
  (wb as any).Sheets = {};

  // ── Criar worksheet manualmente ──────────────────────────────────────────

  const ws: any = {};
  const merges: any[] = [];

  const totalCols = 3 + validWorkDays.length + 1; // ID | Nome | Turno | Dia1..DiaX | Total
  const lastColLetter = colLetter(totalCols - 1);

  let row = 0;

  // ── Linha 0: Título ───────────────────────────────────────────────────────
  ws[addr(0, row)] = {
    v: `RELATÓRIO DE FREQUÊNCIA — ${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear} — TURNO ${shiftLabel}`,
    t: 's',
    s: {
      fill: solidFill(COLORS.headerBg),
      font: { color: { argb: COLORS.headerFont }, bold: true, size: 13, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: headerBorder(),
    },
  };
  // Preenche colunas mescladas com estilo
  for (let c = 1; c < totalCols; c++) {
    ws[addr(c, row)] = {
      v: '',
      t: 's',
      s: { fill: solidFill(COLORS.headerBg), border: headerBorder() },
    };
  }
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
  row++;

  // ── Linha 1: Sub-cabeçalho de geração ────────────────────────────────────
  const now = new Date();
  ws[addr(0, row)] = {
    v: `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    t: 's',
    s: {
      fill: solidFill(COLORS.subHeaderBg),
      font: { color: { argb: COLORS.subHeaderFont }, italic: true, size: 9 },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: border(),
    },
  };
  for (let c = 1; c < totalCols; c++) {
    ws[addr(c, row)] = { v: '', t: 's', s: { fill: solidFill(COLORS.subHeaderBg), border: border() } };
  }
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
  row++;

  // ── Linha 2: Em branco ────────────────────────────────────────────────────
  row++;

  // ── Linha 3: Cabeçalhos de coluna ─────────────────────────────────────────
  const headers = ['ID', 'Funcionário', 'Turno', ...validWorkDays.map(d => `Dia ${d}`), 'Total Faltas'];
  headers.forEach((h, c) => {
    ws[addr(c, row)] = {
      v: h,
      t: 's',
      s: {
        fill: solidFill(COLORS.headerBg),
        font: { color: { argb: COLORS.headerFont }, bold: true, size: 10, name: 'Calibri' },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: headerBorder(),
      },
    };
  });
  row++;

  // ── Linhas de Dados ───────────────────────────────────────────────────────
  employees.forEach((emp, empIdx) => {
    const isAlt = empIdx % 2 === 1;
    const rowBg = isAlt ? COLORS.altRow : COLORS.white;
    const totalFaltas = validWorkDays.filter(d => attendance[emp.id]?.[d] === 'F').length;

    // ID
    ws[addr(0, row)] = {
      v: emp.id,
      t: 's',
      s: {
        fill: solidFill(rowBg),
        font: { size: 9, color: { argb: '6B7280' }, bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: border(),
      },
    };

    // Nome
    ws[addr(1, row)] = {
      v: emp.name,
      t: 's',
      s: {
        fill: solidFill(rowBg),
        font: { size: 10, bold: false },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: border(),
      },
    };

    // Turno
    ws[addr(2, row)] = {
      v: shiftLabel,
      t: 's',
      s: {
        fill: solidFill(rowBg),
        font: { size: 9, bold: true, color: { argb: COLORS.subHeaderFont } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: border(),
      },
    };

    // Status por dia
    validWorkDays.forEach((day, i) => {
      const status: Status = (attendance[emp.id]?.[day] as Status) ?? 'P';
      const ss = statusStyle(status);
      ws[addr(3 + i, row)] = {
        v: status,
        t: 's',
        s: {
          ...ss,
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: border(),
        },
      };
    });

    // Total faltas
    const totalStyle = totalFaltas >= 5
      ? { fill: solidFill(COLORS.faltaBg), font: { bold: true, color: { argb: COLORS.faltaFont }, size: 11 } }
      : totalFaltas >= 3
      ? { fill: solidFill(COLORS.afastBg),  font: { bold: true, color: { argb: COLORS.afastFont },  size: 11 } }
      : { fill: solidFill(rowBg),            font: { bold: true, size: 11 } };

    ws[addr(3 + validWorkDays.length, row)] = {
      v: totalFaltas,
      t: 'n',
      s: {
        ...totalStyle,
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: border(),
      },
    };

    row++;
  });

  // ── Linha de Totais ───────────────────────────────────────────────────────
  ws[addr(0, row)] = {
    v: 'TOTAL',
    t: 's',
    s: {
      fill: solidFill(COLORS.totalBg),
      font: { bold: true, size: 10, color: { argb: COLORS.totalFont } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: border('medium'),
    },
  };
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 2 } });

  validWorkDays.forEach((day, i) => {
    const dayTotal = employees.filter(emp => attendance[emp.id]?.[day] === 'F').length;
    const hasFaltas = dayTotal > 0;
    ws[addr(3 + i, row)] = {
      v: dayTotal,
      t: 'n',
      s: {
        fill: solidFill(hasFaltas ? COLORS.faltaBg : COLORS.totalBg),
        font: { bold: true, size: 10, color: { argb: hasFaltas ? COLORS.faltaFont : COLORS.totalFont } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: border('medium'),
      },
    };
  });

  const grandTotal = employees.reduce((sum, emp) =>
    sum + validWorkDays.filter(d => attendance[emp.id]?.[d] === 'F').length, 0);

  ws[addr(3 + validWorkDays.length, row)] = {
    v: grandTotal,
    t: 'n',
    s: {
      fill: solidFill(grandTotal > 0 ? COLORS.faltaBg : COLORS.totalBg),
      font: { bold: true, size: 12, color: { argb: grandTotal > 0 ? COLORS.faltaFont : COLORS.totalFont } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: border('medium'),
    },
  };

  // ── Ref do range ──────────────────────────────────────────────────────────
  ws['!ref'] = `A1:${lastColLetter}${row + 1}`;
  ws['!merges'] = merges;

  // ── Larguras de coluna ────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 6 },                                  // ID
    { wch: 36 },                                 // Nome
    { wch: 8 },                                  // Turno
    ...validWorkDays.map(() => ({ wch: 7 })),    // Dia X
    { wch: 12 },                                 // Total
  ];

  // ── Altura das linhas ─────────────────────────────────────────────────────
  ws['!rows'] = [
    { hpt: 30 },  // título
    { hpt: 18 },  // sub-cabeçalho
    { hpt: 8 },   // espaço em branco
    { hpt: 28 },  // cabeçalhos
    ...employees.map(() => ({ hpt: 22 })),
    { hpt: 26 },  // totais
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Frequência');

  // ── Salvar ────────────────────────────────────────────────────────────────
  XLSX.writeFile(
    wb,
    `Frequencia_${MONTH_NAMES[currentMonth]}_${currentYear}_Turno_${shiftLabel}.xlsx`,
    { bookType: 'xlsx', type: 'binary', cellStyles: true }
  );
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Endereço de célula: (col, row) → "A1" */
function addr(col: number, row: number): string {
  return `${colLetter(col)}${row + 1}`;
}

/** Índice de coluna → letra Excel: 0 → "A", 25 → "Z", 26 → "AA" */
function colLetter(col: number): string {
  let s = '';
  let n = col;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}
