import { useMemo } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { isWorkDay } from '../utils/dateUtils';
import type {
  Employee, GlobalEmployee, AttendanceRecord, NotesRecord,
  EmployeeWithStats, DayData, WeekdayData, LeaderboardEntry, Alert,
  Vacation, VacationStats
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

  // ─── Analytics de Férias ───────────────────────────────────────────────────

  const vacationStats = useMemo<VacationStats[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addYears = (date: Date, years: number) => {
      const d = new Date(date);
      d.setFullYear(d.getFullYear() + years);
      return d;
    };

    const addDays = (date: Date, days: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };

    return employees
      .filter(emp => emp.admissionDate && emp.admissionDate.length >= 10) // Only process employees with a valid-looking date
      .map(emp => {
        const admissionDate = new Date(emp.admissionDate!);
        
        // Check for invalid dates or extremely old dates (like 1900)
        if (isNaN(admissionDate.getTime()) || admissionDate.getFullYear() < 1970) {
          return null;
        }

        // Process all vacations for this employee to calculate exact end dates
        const processedVacations = vacations
          .filter(v => v.employeeId === emp.id)
          .map(v => {
            const diasDireito = v.diasDireito ?? 30;
            const diasVendidos = v.vendeuFerias ? (v.diasVendidos ?? 0) : 0;
            const diasAGozar = diasDireito - diasVendidos;
            
            const startDate = new Date(v.startDate);
            // Data Fim Férias: (Data Início Férias) + (Dias a Gozar) - 1 día
            const endDate = addDays(startDate, diasAGozar - 1);
            // Data de Retorno: Data Fim Férias + 1 día
            const returnDate = addDays(endDate, 1);

            return {
              ...v,
              endDate: endDate.toISOString().split('T')[0],
              returnDate: returnDate.toISOString().split('T')[0],
              parsedStartDate: startDate,
              parsedEndDate: endDate,
              parsedReturnDate: returnDate,
            };
          });

        // Find current or scheduled vacation
        const currentVacation = processedVacations.find(v => today >= v.parsedStartDate && today <= v.parsedEndDate);
        const scheduledVacation = processedVacations.find(v => v.parsedStartDate > today);
        const activeVacation = currentVacation || scheduledVacation;

        // Calculate periods taken (only fully completed vacations)
        const periodsTaken = processedVacations.filter(v => v.parsedEndDate < today).length;
        
        const inicioAquisitivo = addYears(admissionDate, periodsTaken);
        const fimAquisitivo = addYears(inicioAquisitivo, 1);
        const fimConcessivo = addYears(fimAquisitivo, 1);
        const dataLimiteConcessao = addDays(fimConcessivo, -30);

        const diasParaVencer = Math.ceil((dataLimiteConcessao.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: VacationStats['status'] = 'aguardando_dados';
        let diasRestantes: number | undefined;

        if (currentVacation) {
          status = 'em_ferias_agora';
          diasRestantes = Math.ceil((currentVacation.parsedEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else if (scheduledVacation) {
          status = 'ferias_agendadas';
        } else if (diasParaVencer <= 0) {
          status = 'critico_vencido';
        } else if (diasParaVencer <= 60) {
          status = 'agendar_em_breve';
        } else if (today < fimAquisitivo) {
          status = 'em_per_aquisitivo';
        } else {
          // Fallback if none of the above, but has completed aquisitive period and not yet in warning
          status = 'ferias_concluidas'; // or just pending, but let's map to ferias_concluidas if they just finished one, or keep it as a default
          // Actually, if they are between fimAquisitivo and dataLimiteConcessao - 60, they are just "pending"
          // Let's use 'ferias_concluidas' if they have no active vacation and are in a safe period
          status = 'ferias_concluidas';
        }

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          admissionDate: admissionDate.toISOString().split('T')[0],
          inicioAquisitivo: inicioAquisitivo.toISOString().split('T')[0],
          fimAquisitivo: fimAquisitivo.toISOString().split('T')[0],
          fimConcessivo: fimConcessivo.toISOString().split('T')[0],
          dataLimiteConcessao: dataLimiteConcessao.toISOString().split('T')[0],
          diasParaVencer,
          status,
          currentVacation: activeVacation,
          diasRestantes,
        };
      })
      .filter((stat): stat is any => stat !== null);
  }, [employees, vacations]);

  return {
    totalFaltasMes, faltasDoDia, taxaAbsenteismo,
    dailyData, weekdayData,
    employeeData, filteredEmployees, filteredRegistroEmployees,
    topEmployees, topEmployee,
    leaderboardData, alerts,
    vacationStats,
  };
}
