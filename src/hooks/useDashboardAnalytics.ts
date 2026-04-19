import { useMemo } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { isWorkDay } from '../utils/dateUtils';
import { computeVacationStats } from './useVacationStats';
import type {
  Employee, GlobalEmployee, AttendanceRecord, NotesRecord,
  EmployeeWithStats, DayData, WeekdayData, LeaderboardEntry, Alert,
  Vacation, VacationStats, VacationStatusType
} from '../types';

interface UseDashboardAnalyticsParams {
  attendance: AttendanceRecord;
  employees: Employee[];
  globalEmployees: GlobalEmployee[];
  globalAttendance: AttendanceRecord;
  globalCompletions: any[];
  vacations: Vacation[];
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
  showDismissed: boolean; // ← NOVO
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
  vacations,
  showDismissed, // ← NOVO
}: UseDashboardAnalyticsParams) {

  // ─── Funcionários ativos (nunca inclui demitidos nos KPIs) ───────────────
  const activeEmployees = useMemo(
    () => employees.filter(emp => !emp.dismissed),
    [employees]
  );

  // ─── Funcionários para exibição (respeita o toggle) ──────────────────────
  const displayEmployees = useMemo(
    () => showDismissed ? employees : activeEmployees,
    [employees, activeEmployees, showDismissed]
  );

  // ─── Limite de dias passados ──────────────────────────────────────────────
  const todayLimitDay = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;
    return isCurrentMonth
      ? now.getDate()
      : new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentMonth, currentYear]);

  // ─── KPIs Básicos (sempre usa activeEmployees) ────────────────────────────

  const totalFaltasMes = useMemo(() => {
    let count = 0;
    activeEmployees.forEach(emp => {
      const empRecord = attendance[emp.id];
      if (!empRecord) return;
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = Number(dayStr);
        if (status === 'F' && isWorkDay(day, currentMonth, currentYear)) count++;
      });
    });
    return count;
  }, [attendance, activeEmployees, currentMonth, currentYear]);

  const faltasDoDia = useMemo(() => {
    if (selectedDay === 'all' || !isWorkDay(selectedDay, currentMonth, currentYear) || !isValidDay(selectedDay)) return 0;
    let count = 0;
    activeEmployees.forEach(emp => {
      if (attendance[emp.id]?.[selectedDay] === 'F') count++;
    });
    return count;
  }, [attendance, activeEmployees, selectedDay, currentMonth, currentYear, isValidDay]);

  const taxaAbsenteismo = useMemo(() => {
    let totalFeriasEAfastamentos = 0;
    activeEmployees.forEach(emp => {
      const empRecord = attendance[emp.id];
      if (!empRecord) return;
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = Number(dayStr);
        if ((status === 'Fe' || status === 'A') && isWorkDay(day, currentMonth, currentYear) && isValidDay(day)) {
          totalFeriasEAfastamentos++;
        }
      });
    });
    const totalDiasTrabalho = (activeEmployees.length * VALID_WORK_DAYS.length) - totalFeriasEAfastamentos;
    if (totalDiasTrabalho <= 0) return '0.0';
    return ((totalFaltasMes / totalDiasTrabalho) * 100).toFixed(1);
  }, [totalFaltasMes, activeEmployees, attendance, VALID_WORK_DAYS.length, currentMonth, currentYear, isValidDay]);

  // ─── Dados de Gráficos ────────────────────────────────────────────────────

  const dailyData = useMemo<DayData[]>(() => {
    if (selectedDay === 'all') {
      return VALID_WORK_DAYS
        .filter(day => day <= todayLimitDay)
        .map(day => {
          let faltas = 0;
          activeEmployees.forEach(emp => {
            if (attendance[emp.id]?.[day] === 'F') faltas++;
          });
          return { day: day.toString(), faltas };
        });
    }
    if ((selectedDay as number) > todayLimitDay) return [];
    let faltas = 0;
    activeEmployees.forEach(emp => {
      if (attendance[emp.id]?.[selectedDay] === 'F') faltas++;
    });
    return [{ day: selectedDay.toString(), faltas }];
  }, [attendance, activeEmployees, VALID_WORK_DAYS, selectedDay, todayLimitDay]);

  const weekdayData = useMemo<WeekdayData[]>(() => {
    const counts: Record<string, number> = { Dom: 0, Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0 };
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    activeEmployees.forEach(emp => {
      const empRecord = attendance[emp.id];
      if (!empRecord) return;
      Object.entries(empRecord).forEach(([dayStr, status]) => {
        const day = parseInt(dayStr);
        if (status === 'F' && isWorkDay(day, currentMonth, currentYear) && (selectedDay === 'all' || day === selectedDay)) {
          const weekday = weekdays[new Date(currentYear, currentMonth, day).getDay()];
          counts[weekday]++;
        }
      });
    });
    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(wd => ({ day: wd, faltas: counts[wd] }));
  }, [attendance, activeEmployees, selectedDay, currentMonth, currentYear]);

  // ─── Dados de Funcionários ────────────────────────────────────────────────

  const employeeData = useMemo<EmployeeWithStats[]>(() => {
    const now = new Date();
    const today = now.getDate();
    const windowSize = 7;
    const currentWindowStart = Math.max(1, today - windowSize + 1);
    const previousWindowStart = Math.max(1, currentWindowStart - windowSize);
    const previousWindowEnd = currentWindowStart - 1;

    return displayEmployees.map(emp => {
      let totalFaltasMes = 0;
      let faltasJanelaAtual = 0;
      let faltasJanelaAnterior = 0;

      if (attendance[emp.id]) {
        Object.entries(attendance[emp.id]).forEach(([dayStr, status]) => {
          const day = Number(dayStr);
          if (status === 'F' && isWorkDay(day, currentMonth, currentYear)) {
            totalFaltasMes++;
            if (day >= currentWindowStart && day <= today) faltasJanelaAtual++;
            else if (day >= previousWindowStart && day <= previousWindowEnd) faltasJanelaAnterior++;
          }
        });
      }

      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (faltasJanelaAtual > faltasJanelaAnterior) trend = 'up';
      else if (faltasJanelaAtual < faltasJanelaAnterior && faltasJanelaAnterior > 0) trend = 'down';

      return {
        ...emp,
        faltas: selectedDay === 'all' ? totalFaltasMes : (attendance[emp.id]?.[selectedDay as number] === 'F' ? 1 : 0),
        trend,
      };
    }).sort((a, b) => b.faltas - a.faltas);
  }, [attendance, displayEmployees, selectedDay, currentMonth, currentYear, VALID_WORK_DAYS]);

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
    // Registro sempre usa apenas ativos
    let result = activeEmployees.slice();
    if (registroSearchTerm) {
      result = result.filter(emp => emp.name.toLowerCase().includes(registroSearchTerm.toLowerCase()));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeEmployees, registroSearchTerm]);

  const topEmployees = useMemo(() => [...employeeData].slice(0, 10).reverse(), [employeeData]);
  const topEmployee = useMemo(() => (employeeData.length > 0 ? employeeData[0] : null), [employeeData]);

  // ─── Supervisão: Leaderboard e Alertas ────────────────────────────────────

  const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
    if (!isSupervision) return [];
    const shifts: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    return shifts.map(s => {
      const shiftEmps = globalEmployees.filter(e => e.shift === s && !e.dismissed);
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
      if (emp.dismissed) return false;
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

  // ─── Analytics de Férias ──────────────────────────────────────────────────
  const vacationStats = useMemo(() => {
    return computeVacationStats(activeEmployees, vacations);
  }, [activeEmployees, vacations]);

  const vacationMonthlyBreakdown = useMemo(() => {
    const years = [2026, 2027, 2028];
    const months = Array.from({ length: 12 }, (_, i) => i);
    const breakdown: Record<number, number[]> = {};
    years.forEach(year => {
      breakdown[year] = months.map(month => {
        return vacations.filter(v => {
          if (!v.startDate) return false;
          const start = new Date(v.startDate + 'T12:00:00');
          return start.getFullYear() === year && start.getMonth() === month;
        }).length;
      });
    });
    return breakdown;
  }, [vacations]);

  const vacationLiability = useMemo(() => {
    return vacationStats.reduce((acc, s) => acc + (Number(s.diasAGozar) || 0), 0);
  }, [vacationStats]);

  const vacationOverlapAlerts = useMemo(() => {
    const result: string[] = [];
    const roles = Array.from(new Set(activeEmployees.map(e => e.role).filter(Boolean)));
    roles.forEach(role => {
      const roleEmps = activeEmployees.filter(e => e.role === role);
      if (roleEmps.length < 2) return;
      const onVacation = vacationStats.filter(s =>
        s.cargo === role && s.status === 'em_ferias_agora'
      );
      const percentage = (onVacation.length / roleEmps.length) * 100;
      if (percentage >= 30) {
        result.push(`${Math.round(percentage)}% dos ${role}s estão de férias simultaneamente.`);
      }
    });
    return result;
  }, [activeEmployees, vacationStats]);

  const vacationHeatmap = useMemo(() => {
    const heatmap: Record<string, number> = {};
    vacations.forEach(v => {
      if (!v.startDate || !v.endDate) return;
      let current = new Date(v.startDate + 'T12:00:00');
      const end = new Date(v.endDate + 'T12:00:00');
      while (current <= end) {
        if (current.getFullYear() === currentYear) {
          const key = current.toISOString().split('T')[0];
          heatmap[key] = (heatmap[key] || 0) + 1;
        }
        current.setDate(current.getDate() + 1);
      }
    });
    return heatmap;
  }, [vacations, currentYear]);

  return {
    totalFaltasMes, faltasDoDia, taxaAbsenteismo,
    dailyData, weekdayData,
    employeeData, filteredEmployees, filteredRegistroEmployees,
    topEmployees, topEmployee,
    leaderboardData, alerts,
    vacationStats,
    vacationMonthlyBreakdown,
    vacationLiability,
    vacationOverlapAlerts,
    vacationHeatmap,
    activeEmployees,
  };
}
