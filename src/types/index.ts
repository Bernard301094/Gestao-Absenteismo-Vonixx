import React from 'react';

// ─── Tipos de Domínio ────────────────────────────────────────────────────────

export type Status = 'P' | 'F' | 'Fe' | 'A';

export type ShiftType = 'A' | 'B' | 'C' | 'D' | 'ALL';

export type LoginShiftType = 'A' | 'B' | 'C' | 'D' | 'SUPERVISAO';

export interface Employee {
  id: string;
  name: string;
  admissionDate?: string; // ISO string YYYY-MM-DD
}

export interface Vacation {
  id: string;
  employeeId: string;
  startDate: string; // ISO string YYYY-MM-DD
  endDate: string;   // ISO string YYYY-MM-DD
  returnDate?: string;
  status: 'scheduled' | 'taken';
  diasDireito?: number;
  vendeuFerias?: boolean;
  diasVendidos?: number;
}

export type VacationStatusType = 
  | 'aguardando_dados'
  | 'em_ferias_agora'
  | 'ferias_concluidas'
  | 'ferias_agendadas'
  | 'critico_vencido'
  | 'agendar_em_breve'
  | 'em_per_aquisitivo';

export interface VacationStats {
  employeeId: string;
  employeeName: string;
  admissionDate: string;
  inicioAquisitivo: string;
  fimAquisitivo: string;
  fimConcessivo: string;
  dataLimiteConcessao: string;
  diasParaVencer: number;
  status: VacationStatusType;
  currentVacation?: Vacation;
  diasRestantes?: number;
}

export interface GlobalEmployee extends Employee {
  shift: string;
}

export interface EmployeeWithStats extends Employee {
  faltas: number;
  trend: 'up' | 'down' | 'neutral';
}

export type AttendanceRecord = Record<string, Record<number, Status>>;

export type NotesRecord = Record<string, Record<number, string>>;

export type LockedDaysRecord = Record<number, boolean>;

// ─── Tipos de Analytics ──────────────────────────────────────────────────────

export interface DayData {
  day: string;
  faltas: number;
}

export interface WeekdayData {
  day: string;
  faltas: number;
}

export interface LeaderboardEntry {
  shift: string;
  rate: number;
}

export interface Alert {
  type: 'critical' | 'warning';
  message: string;
  icon: React.ComponentType<{ className?: string }>;
}
