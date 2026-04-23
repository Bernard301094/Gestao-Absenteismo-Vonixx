import React from 'react';

export type Status = 'P' | 'F' | 'Fe' | 'A';
export type ShiftType = 'A' | 'B' | 'C' | 'D' | 'ALL';
export type LoginShiftType = 'A' | 'B' | 'C' | 'D' | 'SUPERVISAO';

export interface Employee {
  id: string;
  name: string;
  admissionDate?: string; 
  role?: string;
  cargo?: string;
  shift?: string;
  dismissed?: boolean;
  dismissalDate?: string; // <-- NOVO CAMPO
}

export type HistoricalVacationReason = 'taken' | 'correction' | 'import';

export interface Vacation {
  id: string;
  employeeId: string;
  startDate: string; 
  endDate: string;   
  returnDate?: string;
  status: 'scheduled' | 'taken';
  diasDireito?: number;
  vendeuFerias?: boolean;
  diasVendidos?: number;
  isHistorical?: boolean;
  historicalReason?: HistoricalVacationReason;
}

export type VacationStatusType = 
  | 'aguardando_dados' | 'em_ferias_agora' | 'ferias_concluidas'
  | 'ferias_agendadas' | 'critico_vencido' | 'agendar_em_breve'
  | 'em_per_aquisitivo' | 'agendado_sem_admissao' | 'a_vencer';

export interface VacationStats {
  employeeId: string; employeeName: string; cargo: string; admissionDate: string;
  numeroPeriodo: number | string; inicioAquisitivo: string; fimAquisitivo: string;
  fimConcessivo: string; diasDireito: number | string; vendeuFerias: string;
  diasVendidos: number | string; diasAGozar: number | string; dataLimiteConcessao: string;
  dataInicioFerias: string; dataFimFerias: string; diasGozados: number | string;
  diasParaVencer: number; status: VacationStatusType; currentVacation?: Vacation;
  diasRestantes: number | string; dataRetorno: string; observacoes: string;
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

export interface DayData { day: string; faltas: number; }
export interface WeekdayData { day: string; faltas: number; }
export interface LeaderboardEntry { shift: string; rate: number; }
export interface Alert { type: 'critical' | 'warning'; message: string; icon: React.ComponentType<{ className?: string }>; }
