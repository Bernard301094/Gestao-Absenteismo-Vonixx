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

/** Diferença em meses completos entre duas datas */
function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
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
 * Ciclo 0 = 1º ano completo de trabalho.
 */
function getPeriod(admDate: Date, cycle: number): PeriodInfo {
  const inicioAquisitivo = addMonths(admDate, cycle * 12);
  const fimAquisitivo = addMonths(admDate, (cycle + 1) * 12);
  const fimConcessivo = addMonths(admDate, (cycle + 2) * 12);
  const dataLimiteConcessao = addDays(fimConcessivo, -30);
  return { cycle, inicioAquisitivo, fimAquisitivo, fimConcessivo, dataLimiteConcessao };
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
    const totalMonths = monthsBetween(admDate, today);
    const earnedCycles = Math.floor(totalMonths / 12);

    // ── Férias do funcionário, ordenadas por início ───────────────────────
    const empVacations = vacations
      .filter(v => v.employeeId === emp.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    // ── Encontra o ciclo alvo (focado no presente em diante) ──────────────
    let targetCycle = 0;
    const currentYear = today.getFullYear();

    // Percorremos os ciclos para achar o primeiro que não foi "gozado" (taken)
    // Começamos a busca de forma que foque no "ano presente em diante"
    for (let c = 0; c <= earnedCycles + 1; c++) {
      const p = getPeriod(admDate, c);
      
      // Se o período concessivo terminou antes do ano atual, pulamos para focar no presente
      // A menos que seja o único ciclo disponível (c == earnedCycles)
      if (p.fimConcessivo.getFullYear() < currentYear && c < earnedCycles) {
        continue;
      }

      const fimAqISO = toISO(p.fimAquisitivo);
      const fimConISO = toISO(p.fimConcessivo);

      const takenVac = empVacations.find(
        v => v.status === 'taken' && v.startDate >= fimAqISO && v.startDate < fimConISO,
      );

      if (!takenVac) {
        targetCycle = c;
        break;
      }
      
      targetCycle = c + 1;
    }

    const period = getPeriod(admDate, targetCycle);
    const fimAqISO = toISO(period.fimAquisitivo);
    const fimConISO = toISO(period.fimConcessivo);
    const diasParaVencer = daysBetween(today, period.dataLimiteConcessao);

    // ── Férias deste ciclo ────────────────────────────────────────────────
    const currentVacation = empVacations.find(
      v => v.startDate >= fimAqISO && v.startDate < fimConISO,
    );

    // ── Determina Status ──────────────────────────────────────────────────
    let status: VacationStatusType;
    let diasRestantes: number | undefined;

    if (currentVacation) {
      const vStart = currentVacation.startDate;

      // Recalcula endDate a partir dos dias (prioriza dado armazenado)
      const diasAGozar =
        (currentVacation.diasDireito ?? 30) - (currentVacation.diasVendidos ?? 0);
      const computedEnd =
        currentVacation.endDate ||
        toISO(addDays(parseISO(vStart), diasAGozar - 1));

      if (todayISO >= vStart && todayISO <= computedEnd) {
        status = 'em_ferias_agora';
        diasRestantes = daysBetween(today, parseISO(computedEnd));
      } else if (todayISO > computedEnd) {
        status = 'ferias_concluidas';
      } else {
        status = 'ferias_agendadas';
      }
    } else if (diasParaVencer <= 0) {
      status = 'critico_vencido';
    } else if (diasParaVencer <= 60) {
      status = 'agendar_em_breve';
    } else {
      // Tem direito adquirido, mais de 60 dias de prazo, nada agendado
      status = 'agendar_em_breve';
    }

    return {
      ...base,
      numeroPeriodo: (targetCycle + 1).toString(),
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
      diasAGozar: ((currentVacation?.diasDireito ?? 30) - (currentVacation?.diasVendidos ?? 0)).toString(),
      dataInicioFerias: currentVacation?.startDate || '',
      dataFimFerias: currentVacation?.endDate || '',
      dataRetorno: currentVacation?.returnDate || '',
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