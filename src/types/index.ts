// ─── Tipos de Domínio ────────────────────────────────────────────────────────

export type Status = 'P' | 'F' | 'Fe' | 'A';

export type ShiftType = 'A' | 'B' | 'C' | 'D' | 'ALL';

export type LoginShiftType = 'A' | 'B' | 'C' | 'D' | 'SUPERVISAO';

export interface Employee {
  id: string;
  name: string;
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
