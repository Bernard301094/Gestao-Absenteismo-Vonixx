import { useMemo } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { isWorkDay } from '../utils/dateUtils';
import type {
  Employee, GlobalEmployee, AttendanceRecord, NotesRecord,
  EmployeeWithStats, DayData, WeekdayData, LeaderboardEntry, Alert
} from '../types';

interface UseDashboardAnalyticsParams {
  attendance: AttendanceRecord;
  employees: Employee[];
  globalEmployees: GlobalEmployee[];
  globalAttendance: AttendanceRecord;
  globalCompletions: any[];
  selectedDay: number | 'all';
  currentMonth: number;
  currentYear: number;
  VALID_WORK_DAYS: number[];
  isSupervision: boolean;
  searchTerm: string;
  statusFilter: 'all' | 'regular' | 'atencao' | 'critico';
  sortOrder: 'desc_faltas' | 'asc_name' | 'desc_name';
  registroSearchTerm: string;
  isValidDay: (day: number) => boolean;
}

export function useDashboardAnalytics({
  attendance,
  employees,
  globalEmployees,
  globalAttendance,
  globalCompletions,
  selectedDay,
  currentMonth,
  currentYear,
  VALID_WORK_DAYS,
  isSupervision,
  searchTerm,
  statusFilter,
  sortOrder,
  registroSearchTerm,
  isValidDay,
}: UseDashboardAnalyticsParams) {

  // ─── KPIs Básicos ─────────────────────────────────────────────────────────

  const totalFaltasMes = useMemo(() => {
    let count = 0;
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = Number(dayStr);
        if (status === 'F' && isWorkDay(day, currentMonth, currentYear)) count++;
      });
    });
    return count;
  }, [attendance, currentMonth, currentYear]);

  const faltasDoDia = useMemo(() => {
    if (selectedDay === 'all' || !isWorkDay(selectedDay, currentMonth, currentYear) || !isValidDay(selectedDay)) return 0;
    let count = 0;
    Object.values(attendance).forEach(empRecord => {
      if (empRecord[selectedDay] === 'F') count++;
    });
    return count;
  }, [attendance, selectedDay, currentMonth, currentYear, isValidDay]);

  const taxaAbsenteismo = useMemo(() => {
    let totalFeriasEAfastamentos = 0;
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = Number(dayStr);
        if ((status === 'Fe' || status === 'A') && isWorkDay(day, currentMonth, currentYear) && isValidDay(day)) {
          totalFeriasEAfastamentos++;
        }
      });
    });
    const totalDiasTrabalho = (employees.length * VALID_WORK_DAYS.length) - totalFeriasEAfastamentos;
    if (totalDiasTrabalho <= 0) return '0.0';
    return ((totalFaltasMes / totalDiasTrabalho) * 100).toFixed(1);
  }, [totalFaltasMes, employees.length, attendance, VALID_WORK_DAYS.length, currentMonth, currentYear, isValidDay]);

  // ─── Dados de Gráficos ────────────────────────────────────────────────────

  const dailyData = useMemo<DayData[]>(() => {
    if (selectedDay === 'all') {
      return VALID_WORK_DAYS.map(day => {
        let faltas = 0;
        Object.values(attendance).forEach(empRecord => {
          if (empRecord[day] === 'F') faltas++;
        });
        return { day: day.toString(), faltas };
      });
    }
    let faltas = 0;
    Object.values(attendance).forEach(empRecord => {
      if (empRecord[selectedDay] === 'F') faltas++;
    });
    return [{ day: selectedDay.toString(), faltas }];
  }, [attendance, VALID_WORK_DAYS, selectedDay]);

  const weekdayData = useMemo<WeekdayData[]>(() => {
    const counts: Record<string, number> = { Dom: 0, Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0 };
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    Object.values(attendance).forEach(empRecord => {
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = parseInt(dayStr);
        if (status === 'F' && isWorkDay(day, currentMonth, currentYear) && (selectedDay === 'all' || day === selectedDay)) {
          const weekday = weekdays[new Date(currentYear, currentMonth, day).getDay()];
          counts[weekday]++;
        }
      });
    });
    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(wd => ({ day: wd, faltas: counts[wd] }));
  }, [attendance, selectedDay, currentMonth, currentYear]);

  // ─── Dados de Funcionários ─────────────────────────────────────────────────

  const employeeData = useMemo<EmployeeWithStats[]>(() => {
    return employees.map(emp => {
      let faltas = 0;
      let firstHalfFaltas = 0;
      let secondHalfFaltas = 0;

      if (attendance[emp.id]) {
        Object.entries(attendance[emp.id]).forEach(([dayStr, status]) => {
          const day = Number(dayStr);
          if (status === 'F' && isWorkDay(day, currentMonth, currentYear)) {
            faltas++;
            if (day <= 15) firstHalfFaltas++;
            else secondHalfFaltas++;
          }
        });
      }

      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (secondHalfFaltas > firstHalfFaltas) trend = 'up';
      else if (secondHalfFaltas < firstHalfFaltas) trend = 'down';

      return {
        ...emp,
        faltas: selectedDay === 'all' ? faltas : (attendance[emp.id]?.[selectedDay as number] === 'F' ? 1 : 0),
        trend,
      };
    }).sort((a, b) => b.faltas - a.faltas);
  }, [attendance, employees, selectedDay, currentMonth, currentYear]);

  const filteredEmployees = useMemo(() => {
    let result = employeeData;

    if (searchTerm) {
      result = result.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (statusFilter !== 'all') {
      result = result.filter(emp => {
        if (statusFilter === 'critico') return emp.faltas > 3;
        if (statusFilter === 'atencao') return emp.faltas > 0 && emp.faltas <= 3;
        if (statusFilter === 'regular') return emp.faltas === 0;
        return true;
      });
    }

    if (sortOrder === 'asc_name') return [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sortOrder === 'desc_name') return [...result].sort((a, b) => b.name.localeCompare(a.name));
    return [...result].sort((a, b) => b.faltas - a.faltas);
  }, [searchTerm, statusFilter, sortOrder, employeeData]);

  const filteredRegistroEmployees = useMemo(() => {
    let result = [...employees];
    if (registroSearchTerm) {
      result = result.filter(emp => emp.name.toLowerCase().includes(registroSearchTerm.toLowerCase()));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, registroSearchTerm]);

  const topEmployees = useMemo(() => [...employeeData].slice(0, 10).reverse(), [employeeData]);
  const topEmployee = useMemo(() => (employeeData.length > 0 ? employeeData[0] : null), [employeeData]);

  // ─── Supervisão: Leaderboard e Alertas ────────────────────────────────────

  const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
    if (!isSupervision) return [];
    const shifts: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    return shifts.map(s => {
      const shiftEmps = globalEmployees.filter(e => e.shift === s);
      if (shiftEmps.length === 0) return { shift: `Turno ${s}`, rate: 0 };
      let totalPossible = 0;
      let totalPresent = 0;
      shiftEmps.forEach(emp => {
        VALID_WORK_DAYS.forEach(day => {
          totalPossible++;
          const status = globalAttendance[emp.id]?.[day] || 'P';
          if (status === 'P') totalPresent++;
        });
      });
      const rate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
      return { shift: `Turno ${s}`, rate };
    });
  }, [isSupervision, globalEmployees, globalAttendance, VALID_WORK_DAYS]);

  const alerts = useMemo<Alert[]>(() => {
    if (!isSupervision) return [];
    const newAlerts: Alert[] = [];
    const today = new Date().getDate();

    if (isWorkDay(today, currentMonth, currentYear)) {
      (['A', 'B', 'C', 'D'] as const).forEach(s => {
        const isCompleted = globalCompletions.some(c => c.shift === s && c.day === today);
        if (!isCompleted) {
          newAlerts.push({
            type: 'warning',
            message: `Turno ${s} ainda não realizou o fechamento de hoje.`,
            icon: AlertCircle,
          });
        }
      });
    }

    const criticalCount = globalEmployees.filter(emp => {
      const faltas = Object.values(globalAttendance[emp.id] || {}).filter(s => s === 'F').length;
      return faltas >= 5;
    }).length;

    if (criticalCount > 0) {
      newAlerts.push({
        type: 'critical',
        message: `${criticalCount} funcionários atingiram o limite de 5 faltas no mês.`,
        icon: XCircle,
      });
    }

    return newAlerts;
  }, [isSupervision, globalCompletions, globalEmployees, globalAttendance, currentMonth, currentYear]);

  return {
    totalFaltasMes, faltasDoDia, taxaAbsenteismo,
    dailyData, weekdayData,
    employeeData, filteredEmployees, filteredRegistroEmployees,
    topEmployees, topEmployee,
    leaderboardData, alerts,
  };
}
