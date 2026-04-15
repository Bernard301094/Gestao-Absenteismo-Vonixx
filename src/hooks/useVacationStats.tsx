import { useMemo } from 'react';
import type { Employee, Vacation, VacationStats, VacationStatusType } from '../types';

// ─── Utilitários de Data ──────────────────────────────────────────────────────

/** Parseia uma string ISO YYYY-MM-DD sem problemas de fuso horário */
function parseISO(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return new Date(NaN);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}

/** Converte Date para string ISO YYYY-MM-DD */
function toISO(date: Date): string {
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Adiciona meses a uma data (respeitando fim de mês) */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return result;
}

/** Adiciona dias a uma data */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Diferença em dias entre duas datas (positivo = `to` está no futuro) */
function daysBetween(from: Date, to: Date): number {
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  const diff = to.getTime() - from.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/** Diferença em anos completos entre duas datas (DATADIF "Y") */
function completedYears(from: Date, to: Date): number {
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  let years = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  if (m < 0 || (m === 0 && to.getDate() < from.getDate())) {
    years--;
  }
  return years;
}

/** Simula a função DATA(ano; mês; dia) do Excel */
function excelDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

// ─── Cálculo de Período CLT ───────────────────────────────────────────────────

interface PeriodInfo {
  cycle: number;
  inicioAquisitivo: Date;
  fimAquisitivo: Date;
  fimConcessivo: Date;
  /** Último dia para INICIAR as férias sem multa (Fim Concessivo - 30 dias) */
  dataLimiteConcessao: Date;
}

/**
 * Calcula as datas do período aquisitivo/concessivo para um ciclo específico.
 * Baseado nas fórmulas Excel:
 * Inic. Per. Aquisitivo: DATA(ANO(Adm)+Periodo-1; MÊS(Adm); DIA(Adm))
 * Fim Per. Aquisitivo: DATA(ANO(Adm)+Periodo; MÊS(Adm); DIA(Adm))
 * Fim Per. Concessivo: DATA(ANO(Adm)+Periodo+1; MÊS(Adm); DIA(Adm))
 */
function getPeriod(admDate: Date, periodNumber: number): PeriodInfo {
  const y = admDate.getFullYear();
  const m = admDate.getMonth() + 1;
  const d = admDate.getDate();

  const inicioAquisitivo = excelDate(y + periodNumber - 1, m, d);
  const fimAquisitivo = excelDate(y + periodNumber, m, d);
  const fimConcessivo = excelDate(y + periodNumber + 1, m, d);
  const dataLimiteConcessao = addDays(fimConcessivo, -30);

  return { 
    cycle: periodNumber - 1, 
    inicioAquisitivo, 
    fimAquisitivo, 
    fimConcessivo, 
    dataLimiteConcessao 
  };
}

// ─── Cálculo de Datas de Férias ───────────────────────────────────────────────

export interface VacationDates {
  diasAGozar: number;
  startDate: string;
  endDate: string;
  returnDate: string;
}

/**
 * Dado o início das férias, calcula endDate e returnDate segundo CLT.
 * diasDireito: normalmente 30
 * diasVendidos: dias de abono pecuniário (máx 10)
 */
export function calcVacationDates(
  startDate: string,
  diasDireito = 30,
  diasVendidos = 0,
): VacationDates {
  const diasAGozar = diasDireito - diasVendidos;
  const start = parseISO(startDate);
  const end = addDays(start, diasAGozar - 1);
  const returnDay = addDays(end, 1);
  return {
    diasAGozar,
    startDate,
    endDate: toISO(end),
    returnDate: toISO(returnDay),
  };
}

// ─── Motor Principal ──────────────────────────────────────────────────────────

/**
 * Computa o VacationStats de todos os funcionários aplicando as regras CLT.
 * Pode ser chamado fora do contexto React (p.ex. em testes).
 */
export function computeVacationStats(
  employees: Employee[],
  vacations: Vacation[],
  today: Date = new Date(),
): VacationStats[] {
  const todayISO = toISO(today);

  return employees.map(emp => {
    const base = {
      employeeId: emp.id,
      employeeName: emp.name,
      cargo: emp.role || '',
      admissionDate: emp.admissionDate ?? '',
      numeroPeriodo: '',
      diasDireito: '',
      vendeuFerias: '',
      diasVendidos: '',
      diasAGozar: '',
      dataInicioFerias: '',
      dataFimFerias: '',
      diasGozados: '',
      dataRetorno: '',
      observacoes: '',
      diasRestantes: '',
    };

    // ── Sem data de admissão ────────────────────────────────────────────────
    if (!emp.admissionDate || emp.admissionDate.length < 10) {
      const empVacations = vacations
        .filter(v => v.employeeId === emp.id)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      
      const activeVacation = empVacations.find(v => todayISO >= v.startDate && todayISO <= (v.endDate || '')) || 
                             empVacations.find(v => v.startDate > todayISO);

      return {
        ...base,
        inicioAquisitivo: '',
        fimAquisitivo: '',
        fimConcessivo: '',
        dataLimiteConcessao: '',
        diasParaVencer: 0,
        status: activeVacation ? ('agendado_sem_admissao' as VacationStatusType) : ('aguardando_dados' as VacationStatusType),
        currentVacation: activeVacation,
        dataInicioFerias: activeVacation?.startDate || '',
        dataFimFerias: activeVacation?.endDate || '',
        dataRetorno: activeVacation?.returnDate || '',
      };
    }

    const admDate = parseISO(emp.admissionDate);
    if (isNaN(admDate.getTime())) {
      return {
        ...base,
        inicioAquisitivo: '',
        fimAquisitivo: '',
        fimConcessivo: '',
        dataLimiteConcessao: '',
        diasParaVencer: 0,
        status: 'aguardando_dados' as VacationStatusType,
      };
    }

    // ── Férias do funcionário, ordenadas por início ───────────────────────
    const empVacations = vacations
      .filter(v => v.employeeId === emp.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    // ── Encontra o ciclo alvo segundo a fórmula Excel fornecida ───────────
    // Periodo: =SE(D4="";"";SE(E(P4>=L4;O4<>"";O4<HOJE());DATADIF(D4;HOJE();"Y")+2;DATADIF(D4;HOJE();"Y")+1))
    
    const years = completedYears(admDate, today);
    
    // Verificamos se as férias do ciclo atual (years + 1) já foram concluídas
    // Nota: years + 1 é o período padrão.
    const pCurrent = getPeriod(admDate, years + 1);
    const fimAqISO_C = toISO(pCurrent.inicioAquisitivo);
    const fimConISO_C = toISO(pCurrent.fimConcessivo);
    
    const currentVac = empVacations.find(
      v => v.startDate >= fimAqISO_C && v.startDate < fimConISO_C
    );
    
    const diasAGozar_C = (currentVac?.diasDireito ?? 30) - (currentVac?.diasVendidos ?? 0);
    let diasGozados_C = 0;
    if (currentVac?.startDate && currentVac?.endDate) {
      diasGozados_C = daysBetween(parseISO(currentVac.startDate), parseISO(currentVac.endDate)) + 1;
    }
    
    const isFinished = currentVac && 
                       currentVac.status === 'taken' && 
                       diasGozados_C >= diasAGozar_C && 
                       currentVac.endDate && parseISO(currentVac.endDate) < today;

    const periodNumber = isFinished ? years + 2 : years + 1;

    const period = getPeriod(admDate, periodNumber);
    const fimAqISO = toISO(period.inicioAquisitivo);
    const fimConISO = toISO(period.fimConcessivo);
    
    // Dias p/ Vencer: =SE(M4="";"";M4-HOJE())
    const diasParaVencer = daysBetween(today, period.dataLimiteConcessao);

    // ── Férias deste ciclo ────────────────────────────────────────────────
    const currentVacation = empVacations.find(
      v => v.startDate >= fimAqISO && v.startDate < fimConISO,
    );

    // ── Determina Status conforme fórmula Excel ───────────────────────────
    let status: VacationStatusType;
    let diasRestantes: number | string = '';

    const L4 = (currentVacation?.diasDireito ?? 30) - (currentVacation?.diasVendidos ?? 0);
    const N4 = currentVacation?.startDate || '';
    const O4 = currentVacation?.endDate || '';
    const P4 = (N4 && O4) ? daysBetween(parseISO(N4), parseISO(O4)) + 1 : 0;
    const H4 = period.fimConcessivo;
    const M4 = period.dataLimiteConcessao;
    const G4 = period.fimAquisitivo;

    if (P4 >= L4 && O4 && parseISO(O4) < today) {
      status = 'ferias_concluidas';
    } else if (N4 && todayISO >= N4 && todayISO <= O4) {
      status = 'em_ferias_agora';
      // Dias restantes: =SE(R4="🏖️ Em Férias AGORA";O4-HOJE()+1;"")
      diasRestantes = daysBetween(today, parseISO(O4)) + 1;
    } else if (N4 && O4 && parseISO(O4) > today) {
      status = 'ferias_agendadas';
    } else if (today > H4) {
      status = 'critico_vencido'; // VENCIDO - Agendar JÁ
    } else if (today > M4) {
      status = 'critico_vencido'; // Crítico - Agendar JÁ
    } else if (daysBetween(today, M4) <= 60) {
      status = 'agendar_em_breve';
    } else if (today < G4) {
      status = 'em_per_aquisitivo';
    } else {
      status = 'a_vencer'; // "🟢 A Vencer"
    }

    return {
      ...base,
      numeroPeriodo: periodNumber.toString(),
      inicioAquisitivo: toISO(period.inicioAquisitivo),
      fimAquisitivo: toISO(period.fimAquisitivo),
      fimConcessivo: toISO(period.fimConcessivo),
      dataLimiteConcessao: toISO(period.dataLimiteConcessao),
      diasParaVencer,
      status,
      currentVacation,
      diasRestantes,
      diasDireito: currentVacation?.diasDireito?.toString() || '30',
      vendeuFerias: currentVacation?.vendeuFerias ? 'Sim' : 'Não',
      diasVendidos: currentVacation?.diasVendidos?.toString() || '0',
      diasAGozar: L4.toString(),
      dataInicioFerias: N4,
      dataFimFerias: O4,
      dataRetorno: (status === 'em_ferias_agora' || status === 'ferias_agendadas') && O4
        ? toISO(addDays(parseISO(O4), 1))
        : '',
      diasGozados: P4.toString(),
    };
  });
}

// ─── Hook React ───────────────────────────────────────────────────────────────

export function useVacationStats(
  employees: Employee[],
  vacations: Vacation[],
): VacationStats[] {
  return useMemo(
    () => computeVacationStats(employees, vacations),
    [employees, vacations],
  );
}