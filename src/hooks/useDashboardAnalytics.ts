import { useMemo, useCallback } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { isWorkDay } from '../utils/dateUtils';
import { computeVacationStats } from './useVacationStats';
import { wasActiveOnDay } from './useFirestoreData';
import type {
  Employee, GlobalEmployee, AttendanceRecord, NotesRecord,
  EmployeeWithStats, DayData, WeekdayData, LeaderboardEntry, Alert,
  Vacation, VacationStats, VacationStatusType
} from '../types';

interface UseDashboardAnalyticsParams {
  attendance: AttendanceRecord; employees: Employee[]; globalEmployees: GlobalEmployee[];
  globalAttendance: AttendanceRecord; globalCompletions: any[]; vacations: Vacation[];
  selectedDay: number | 'all'; currentMonth: number; currentYear: number;
  VALID_WORK_DAYS: number[]; isSupervision: boolean; searchTerm: string;
  statusFilter: 'all' | 'regular' | 'atencao' | 'critico'; sortOrder: 'desc_faltas' | 'asc_name' | 'desc_name';
  registroSearchTerm: string; isValidDay: (day: number) => boolean; showDismissed: boolean;
}

export function useDashboardAnalytics({
  attendance, employees, globalEmployees, globalAttendance, globalCompletions,
  selectedDay, currentMonth, currentYear, VALID_WORK_DAYS, isSupervision,
  searchTerm, statusFilter, sortOrder, registroSearchTerm, isValidDay,
  vacations, showDismissed,
}: UseDashboardAnalyticsParams) {

  const sourceEmployees  = isSupervision ? globalEmployees : employees;
  const sourceAttendance = isSupervision ? globalAttendance : attendance;

  const allModeRefDay = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;
    return isCurrentMonth
      ? now.getDate()
      : new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentMonth, currentYear]);

  const activeEmployees = useMemo(() => {
    return sourceEmployees.filter(emp =>
      wasActiveOnDay(emp, allModeRefDay, currentMonth, currentYear)
    );
  }, [sourceEmployees, allModeRefDay, currentMonth, currentYear]);

  const getActiveEmployeesForDay = useCallback((day: number) =>
    sourceEmployees.filter(emp => wasActiveOnDay(emp, day, currentMonth, currentYear)),
  [sourceEmployees, currentMonth, currentYear]);

  const displayEmployees = useMemo(
    () => showDismissed ? sourceEmployees : activeEmployees,
    [sourceEmployees, activeEmployees, showDismissed]
  );

  const totalFaltasMes = useMemo(() => {
    let count = 0;
    VALID_WORK_DAYS.forEach(day => {
      const empsDoDia = getActiveEmployeesForDay(day);
      empsDoDia.forEach(emp => {
        if (sourceAttendance[emp.id]?.[day] === 'F') count++;
      });
    });
    return count;
  }, [sourceAttendance, getActiveEmployeesForDay, VALID_WORK_DAYS]);

  const faltasDoDia = useMemo(() => {
    if (selectedDay === 'all' || !isWorkDay(selectedDay, currentMonth, currentYear) || !isValidDay(selectedDay)) return 0;
    const empsDoDia = getActiveEmployeesForDay(selectedDay);
    return empsDoDia.filter(emp => sourceAttendance[emp.id]?.[selectedDay] === 'F').length;
  }, [sourceAttendance, getActiveEmployeesForDay, selectedDay, currentMonth, currentYear, isValidDay]);

  const taxaAbsenteismo = useMemo(() => {
    let totalFeriasEAfastamentos = 0;
    let totalDiasPossiveis = 0;
    VALID_WORK_DAYS.forEach(day => {
      if (!isValidDay(day)) return;
      const empsDoDia = getActiveEmployeesForDay(day);
      totalDiasPossiveis += empsDoDia.length;
      empsDoDia.forEach(emp => {
        const st = sourceAttendance[emp.id]?.[day];
        if (st === 'Fe' || st === 'A') totalFeriasEAfastamentos++;
      });
    });
    const base = totalDiasPossiveis - totalFeriasEAfastamentos;
    if (base <= 0) return '0.0';
    return ((totalFaltasMes / base) * 100).toFixed(1);
  }, [totalFaltasMes, getActiveEmployeesForDay, sourceAttendance, VALID_WORK_DAYS, isValidDay]);

  const dailyData = useMemo<DayData[]>(() => {
    if (selectedDay === 'all') {
      return VALID_WORK_DAYS.filter(day => day <= allModeRefDay).map(day => {
        const empsDoDia = getActiveEmployeesForDay(day);
        const faltas = empsDoDia.filter(emp => sourceAttendance[emp.id]?.[day] === 'F').length;
        return { day: day.toString(), faltas };
      });
    }
    if ((selectedDay as number) > allModeRefDay) return [];
    const empsDoDia = getActiveEmployeesForDay(selectedDay as number);
    const faltas = empsDoDia.filter(emp => sourceAttendance[emp.id]?.[selectedDay] === 'F').length;
    return [{ day: selectedDay.toString(), faltas }];
  }, [sourceAttendance, getActiveEmployeesForDay, VALID_WORK_DAYS, selectedDay, allModeRefDay]);

  const weekdayData = useMemo<WeekdayData[]>(() => {
    const counts: Record<string, number> = { Dom: 0, Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, 'Sáb': 0 };
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const daysToScan = selectedDay === 'all' ? VALID_WORK_DAYS : [selectedDay as number];
    daysToScan.forEach(day => {
      const empsDoDia = getActiveEmployeesForDay(day);
      empsDoDia.forEach(emp => {
        if (sourceAttendance[emp.id]?.[day] === 'F') {
          counts[weekdays[new Date(currentYear, currentMonth, day).getDay()]]++;
        }
      });
    });
    return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(wd => ({ day: wd, faltas: counts[wd] }));
  }, [sourceAttendance, getActiveEmployeesForDay, selectedDay, VALID_WORK_DAYS, currentMonth, currentYear]);

  const employeeData = useMemo<EmployeeWithStats[]>(() => {
    const now = new Date(); const today = now.getDate(); const windowSize = 7;
    const currentWindowStart  = Math.max(1, today - windowSize + 1);
    const previousWindowStart = Math.max(1, currentWindowStart - windowSize);
    const previousWindowEnd   = currentWindowStart - 1;

    return displayEmployees.map(emp => {
      let totalFaltasMes = 0; let faltasJanelaAtual = 0; let faltasJanelaAnterior = 0;
      if (sourceAttendance[emp.id]) {
        Object.entries(sourceAttendance[emp.id]).forEach(([dayStr, status]) => {
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
        faltas: selectedDay === 'all'
          ? totalFaltasMes
          : (sourceAttendance[emp.id]?.[selectedDay as number] === 'F' ? 1 : 0),
        trend,
      };
    }).sort((a, b) => b.faltas - a.faltas);
  }, [sourceAttendance, displayEmployees, selectedDay, currentMonth, currentYear, VALID_WORK_DAYS]);

  const filteredEmployees = useMemo(() => {
    let result = employeeData;
    if (searchTerm) result = result.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
    const day = selectedDay === 'all' ? allModeRefDay : (selectedDay as number);
    let result = getActiveEmployeesForDay(day);
    if (registroSearchTerm)
      result = result.filter(emp => emp.name.toLowerCase().includes(registroSearchTerm.toLowerCase()));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [getActiveEmployeesForDay, selectedDay, allModeRefDay, registroSearchTerm]);

  const topEmployees = useMemo(() => [...employeeData].slice(0, 10).reverse(), [employeeData]);
  const topEmployee  = useMemo(() => (employeeData.length > 0 ? employeeData[0] : null), [employeeData]);

  const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
    if (!isSupervision) return [];
    return (['A', 'B', 'C', 'D'] as const).map(s => {
      const shiftEmps = globalEmployees.filter(e => e.shift === s && !e.dismissed);
      if (shiftEmps.length === 0) return { shift: `Turno ${s}`, rate: 0 };
      let totalPossible = 0; let totalPresent = 0;
      shiftEmps.forEach(emp => {
        VALID_WORK_DAYS.forEach(day => {
          totalPossible++;
          if ((globalAttendance[emp.id]?.[day] || 'P') === 'P') totalPresent++;
        });
      });
      return { shift: `Turno ${s}`, rate: totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0 };
    });
  }, [isSupervision, globalEmployees, globalAttendance, VALID_WORK_DAYS]);

  const alerts = useMemo<Alert[]>(() => {
    if (!isSupervision) return [];
    const newAlerts: Alert[] = []; const today = new Date().getDate();
    if (isWorkDay(today, currentMonth, currentYear)) {
      (['A', 'B', 'C', 'D'] as const).forEach(s => {
        if (!globalCompletions.some(c => c.shift === s && c.day === today)) {
          newAlerts.push({ type: 'warning', message: `Turno ${s} ainda não realizou o fechamento de hoje.`, icon: AlertCircle });
        }
      });
    }
    const criticalCount = globalEmployees.filter(emp => {
      if (emp.dismissed) return false;
      return Object.values(globalAttendance[emp.id] || {}).filter(s => s === 'F').length >= 5;
    }).length;
    if (criticalCount > 0)
      newAlerts.push({ type: 'critical', message: `${criticalCount} funcionários atingiram o limite de 5 faltas no mês.`, icon: XCircle });
    return newAlerts;
  }, [isSupervision, globalCompletions, globalEmployees, globalAttendance, currentMonth, currentYear]);

  const vacationStats = useMemo(() => computeVacationStats(activeEmployees, vacations), [activeEmployees, vacations]);

  const vacationMonthlyBreakdown = useMemo(() => {
    const years = [2026, 2027, 2028]; const months = Array.from({ length: 12 }, (_, i) => i);
    const breakdown: Record<number, number[]> = {};
    years.forEach(year => {
      breakdown[year] = months.map(month => vacations.filter(v => {
        if (!v.startDate) return false;
        const start = new Date(v.startDate + 'T12:00:00');
        return start.getFullYear() === year && start.getMonth() === month;
      }).length);
    });
    return breakdown;
  }, [vacations]);

  const vacationLiability = useMemo(() =>
    vacationStats.reduce((acc, s) => acc + (Number(s.diasAGozar) || 0), 0),
  [vacationStats]);

  const vacationOverlapAlerts = useMemo(() => {
    const result: string[] = [];
    Array.from(new Set(activeEmployees.map(e => e.role).filter(Boolean))).forEach(role => {
      const roleEmps = activeEmployees.filter(e => e.role === role);
      if (roleEmps.length < 2) return;
      const percentage = (
        vacationStats.filter(s => s.cargo === role && s.status === 'em_ferias_agora').length / roleEmps.length
      ) * 100;
      if (percentage >= 30)
        result.push(`${Math.round(percentage)}% dos ${role}s estão de férias simultaneamente.`);
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
    totalFaltasMes, faltasDoDia, taxaAbsenteismo, dailyData, weekdayData, employeeData,
    filteredEmployees, filteredRegistroEmployees, topEmployees, topEmployee, leaderboardData,
    alerts, vacationStats, vacationMonthlyBreakdown, vacationLiability, vacationOverlapAlerts,
    vacationHeatmap, activeEmployees,
  };
}
