import React from 'react';
import {
  CalendarX, UserPlus, CheckCircle2, Search,
  Edit2, Trash2, XCircle, Palmtree, Stethoscope,
  MessageSquare, Activity, CalendarDays, ShieldCheck, FileText,
  AlertTriangle, X, Calendar, ArrowRight,
} from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import { exportToPDF } from '../../utils/exportPDF';
import { wasActiveOnDay } from '../../hooks/useFirestoreData';
import type { Employee, Status, AttendanceRecord, NotesRecord, LockedDaysRecord, Vacation } from '../../types';

interface AttendanceRegistryProps {
  selectedDay: number | 'all';
  currentDayOfMonth: number;
  currentMonth: number;
  currentYear: number;
  isWorkDay: (day: number, month: number, year: number) => boolean;
  employees: Employee[];
  getStatusForDay: (empId: string, day: number) => Status;
  setShowAddEmployeeModal: (show: boolean) => void;
  handleMarkAllPresent: () => void;
  registroSearchTerm: string;
  setRegistroSearchTerm: (term: string) => void;
  filteredRegistroEmployees: Employee[];
  pendingAttendance: AttendanceRecord;
  attendance: AttendanceRecord;
  pendingNotes: NotesRecord;
  notes: NotesRecord;
  setEditingEmployee: (emp: Employee | null) => void;
  setShowEditEmployeeModal: (show: boolean) => void;
  handleDeleteEmployee: (id: string) => void;
  setStatus: (empId: string, day: number, status: Status) => void;
  lockedDays: LockedDaysRecord;
  setNote: (empId: string, day: number, note: string) => void;
  setLockedDays: React.Dispatch<React.SetStateAction<LockedDaysRecord>>;
  handleSave: () => void;
  isSaving: boolean;
  currentShift: string | null;
  vacations: Vacation[];
  handleUpdateVacation?: (id: string, vacation: Partial<Vacation>) => Promise<void>;
}

type StatusCfg = {
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
  barColor: string;
  kpiLabel: string;
};

const STATUS_CONFIG: Record<Status, StatusCfg> = {
  P: {
    label: 'Presente', short: 'P', icon: CheckCircle2,
    activeClass: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30',
    inactiveClass: 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    barColor: 'bg-emerald-500', kpiLabel: 'Presentes',
  },
  F: {
    label: 'Falta', short: 'F', icon: XCircle,
    activeClass: 'bg-rose-500 text-white shadow-sm shadow-rose-500/30',
    inactiveClass: 'text-gray-400 hover:text-rose-600 hover:bg-rose-50',
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    barColor: 'bg-rose-500', kpiLabel: 'Faltas',
  },
  Fe: {
    label: 'Férias', short: 'Fe', icon: Palmtree,
    activeClass: 'bg-blue-500 text-white shadow-sm shadow-blue-500/30',
    inactiveClass: 'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
    badgeClass: 'bg-blue-50 text-blue-700 ring-blue-200',
    barColor: 'bg-blue-500', kpiLabel: 'Férias',
  },
  A: {
    label: 'Afastamento', short: 'A', icon: Stethoscope,
    activeClass: 'bg-amber-500 text-white shadow-sm shadow-amber-500/30',
    inactiveClass: 'text-gray-400 hover:text-amber-600 hover:bg-amber-50',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    barColor: 'bg-amber-500', kpiLabel: 'Afastados',
  },
};

const STATUS_ORDER: Status[] = ['P', 'F', 'Fe', 'A'];

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns true if `dateStr` (YYYY-MM-DD) is within [startDate, endDate] inclusive */
function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  return dateStr >= startDate && dateStr <= endDate;
}

/** Returns the active vacation for an employee on a given date, or null */
function getActiveVacation(
  empId: string,
  dateStr: string,
  vacations: Vacation[],
): Vacation | null {
  return (
    vacations.find(
      v =>
        v.employeeId === empId &&
        v.status === 'taken' &&
        v.startDate &&
        v.endDate &&
        isDateInRange(dateStr, v.startDate, v.endDate),
    ) ?? null
  );
}

/** Returns the vacation whose returnDate is today or has passed, meaning employee should have returned */
function getOverdueVacation(
  empId: string,
  dateStr: string,
  vacations: Vacation[],
): Vacation | null {
  return (
    vacations.find(v => {
      if (v.employeeId !== empId) return false;
      if (v.status !== 'taken') return false;
      if (!v.returnDate) return false;
      // returnDate has passed OR is today → overdue
      return v.returnDate <= dateStr;
    }) ?? null
  );
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Return-alert modal ────────────────────────────────────────────────────────

interface ReturnModalState {
  vacation: Vacation;
  employee: Employee;
}

function VacationReturnModal({
  state,
  onConfirmReturn,
  onExtend,
  onClose,
}: {
  state: ReturnModalState;
  onConfirmReturn: (vacation: Vacation) => void;
  onExtend: (vacation: Vacation, newEndDate: string) => void;
  onClose: () => void;
}) {
  const [newEndDate, setNewEndDate] = React.useState(state.vacation.endDate || '');
  const [mode, setMode] = React.useState<'choose' | 'extend'>('choose');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 text-sm">Retorno de Férias</h3>
            <p className="text-amber-700 text-xs font-medium mt-0.5 truncate">
              {state.employee.name}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
            A data de retorno prevista era{' '}
            <span className="font-black">
              {state.vacation.returnDate
                ? new Date(state.vacation.returnDate + 'T12:00:00').toLocaleDateString('pt-BR')
                : '—'}
            </span>
            . O colaborador deveria ter voltado.
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="font-bold uppercase tracking-widest block mb-0.5">Início Férias</span>
              <span className="text-gray-800 font-black tabular-nums">
                {state.vacation.startDate
                  ? new Date(state.vacation.startDate + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="font-bold uppercase tracking-widest block mb-0.5">Fim Férias</span>
              <span className="text-gray-800 font-black tabular-nums">
                {state.vacation.endDate
                  ? new Date(state.vacation.endDate + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              </span>
            </div>
          </div>

          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => onConfirmReturn(state.vacation)}
                className="w-full flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-3 rounded-xl transition-colors"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-black">Confirmar Retorno</div>
                  <div className="text-xs font-medium opacity-80">Marcar férias como concluídas</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0" />
              </button>
              <button
                onClick={() => setMode('extend')}
                className="w-full flex items-center gap-3 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 px-4 py-3 rounded-xl transition-colors border border-blue-100"
              >
                <Calendar className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-black">Estender Férias</div>
                  <div className="text-xs font-medium opacity-70">Prorrogar a data de encerramento</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0" />
              </button>
            </div>
          )}

          {mode === 'extend' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                  Nova data de fim das férias
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  min={state.vacation.endDate || ''}
                  onChange={e => setNewEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('choose')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => onExtend(state.vacation, newEndDate)}
                  disabled={!newEndDate || newEndDate <= (state.vacation.endDate || '')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-black transition-colors"
                >
                  Salvar extensão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AttendanceRegistry({
  selectedDay,
  currentDayOfMonth,
  currentMonth,
  currentYear,
  isWorkDay,
  employees,
  getStatusForDay,
  setShowAddEmployeeModal,
  handleMarkAllPresent,
  registroSearchTerm,
  setRegistroSearchTerm,
  filteredRegistroEmployees,
  pendingAttendance,
  attendance,
  pendingNotes,
  notes,
  setEditingEmployee,
  setShowEditEmployeeModal,
  handleDeleteEmployee,
  setStatus,
  lockedDays,
  setNote,
  handleSave,
  isSaving,
  currentShift,
  vacations = [],
  handleUpdateVacation,
}: AttendanceRegistryProps) {
  const dayNum    = selectedDay === 'all' ? currentDayOfMonth : (selectedDay as number);
  const isLocked  = !!lockedDays[dayNum];
  const isHoliday = selectedDay !== 'all' && !isWorkDay(selectedDay as number, currentMonth, currentYear);

  const [localStatusFilter, setLocalStatusFilter] = React.useState<'all' | Status>('all');
  const [returnModal, setReturnModal] = React.useState<ReturnModalState | null>(null);

  // Current date string for vacation detection
  const currentDateStr = toDateStr(currentYear, currentMonth, dayNum);

  // ── Auto-apply Fe status for employees on active vacation ──────────────────
  const autoAppliedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (selectedDay === 'all' || isHoliday || vacations.length === 0) return;

    employees.forEach(emp => {
      const key = `${emp.id}_${currentDateStr}`;
      if (autoAppliedRef.current.has(key)) return;

      const activeVac = getActiveVacation(emp.id, currentDateStr, vacations);
      if (!activeVac) return;

      // Only auto-apply if no manual override already exists
      const existingStatus = pendingAttendance[emp.id]?.[dayNum] ?? attendance[emp.id]?.[dayNum];
      if (existingStatus === undefined || existingStatus === 'P') {
        setStatus(emp.id, dayNum, 'Fe');
        autoAppliedRef.current.add(key);
      }
    });
  }, [employees, vacations, currentDateStr, dayNum, selectedDay, isHoliday]);

  // Reset autoApplied cache when day changes
  React.useEffect(() => {
    autoAppliedRef.current = new Set();
  }, [dayNum]);

  // ── Collect overdue-vacation employees for banner ──────────────────────────
  const overdueVacationEmployees = React.useMemo(() => {
    if (selectedDay === 'all' || isHoliday) return [];
    return employees
      .map(emp => {
        const overdue = getOverdueVacation(emp.id, currentDateStr, vacations);
        if (!overdue) return null;
        return { employee: emp, vacation: overdue };
      })
      .filter(Boolean) as { employee: Employee; vacation: Vacation }[];
  }, [employees, vacations, currentDateStr, selectedDay, isHoliday]);

  const activeEmployees = employees.filter(emp => {
    if (!wasActiveOnDay(emp, dayNum, currentMonth, currentYear)) return false;
    if (!emp.admissionDate) return true;
    const [y, m, d] = emp.admissionDate.split('-').map(Number);
    return new Date(currentYear, currentMonth, dayNum) >= new Date(y, m - 1, d);
  });

  const pendingCount =
    Object.values(pendingAttendance).reduce((s, d) => s + Object.keys(d).length, 0) +
    Object.values(pendingNotes).reduce((s, d) => s + Object.keys(d).length, 0);

  const kpiCounts = STATUS_ORDER.map(key => ({
    key,
    count:
      key === 'P'
        ? activeEmployees.length - activeEmployees.filter(e => getStatusForDay(e.id, dayNum) !== 'P').length
        : activeEmployees.filter(e => getStatusForDay(e.id, dayNum) === key).length,
  }));

  const mergedAttendance: AttendanceRecord = {};
  activeEmployees.forEach(emp => {
    mergedAttendance[emp.id] = { ...attendance[emp.id] };
    if (pendingAttendance[emp.id]) Object.assign(mergedAttendance[emp.id], pendingAttendance[emp.id]);
  });

  const mergedNotes: NotesRecord = {};
  activeEmployees.forEach(emp => {
    mergedNotes[emp.id] = { ...notes[emp.id] };
    if (pendingNotes[emp.id]) Object.assign(mergedNotes[emp.id], pendingNotes[emp.id]);
  });

  const handleGeneratePDF = () => {
    exportToPDF(
      `Turno ${currentShift || 'A'}`,
      activeEmployees,
      mergedAttendance,
      selectedDay,
      currentMonth,
      currentYear,
      undefined,
      mergedNotes,
    );
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const finalEmployees = filteredRegistroEmployees.filter(emp => {
    if (localStatusFilter === 'all') return true;
    const currentStatus = (pendingAttendance[emp.id]?.[dayNum] ?? attendance[emp.id]?.[dayNum] ?? 'P') as Status;
    return currentStatus === localStatusFilter;
  });

  // ── Return-modal handlers ──────────────────────────────────────────────────

  const handleConfirmReturn = async (vacation: Vacation) => {
    if (handleUpdateVacation) {
      await handleUpdateVacation(vacation.id, { status: 'taken' });
    }
    setReturnModal(null);
  };

  const handleExtendVacation = async (vacation: Vacation, newEndDate: string) => {
    if (!handleUpdateVacation) return;
    // Recalculate returnDate: endDate + 1 day
    const end = new Date(newEndDate + 'T12:00:00');
    end.setDate(end.getDate() + 1);
    const newReturnDate = end.toISOString().split('T')[0];
    await handleUpdateVacation(vacation.id, {
      endDate: newEndDate,
      returnDate: newReturnDate,
    });
    setReturnModal(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">

      {/* ── Overdue vacation banner ──────────────────────────────────────────── */}
      {overdueVacationEmployees.length > 0 && !isHoliday && selectedDay !== 'all' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900">Retorno de Férias Pendente</h3>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                {overdueVacationEmployees.length === 1
                  ? '1 colaborador deveria ter retornado das férias.'
                  : `${overdueVacationEmployees.length} colaboradores deveriam ter retornado das férias.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueVacationEmployees.map(({ employee, vacation }) => (
              <button
                key={employee.id}
                onClick={() => setReturnModal({ employee, vacation })}
                className="inline-flex items-center gap-2 bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                <Palmtree className="w-3.5 h-3.5 text-amber-500" />
                {employee.name}
                <span className="ml-1 text-[10px] font-black text-amber-500 uppercase tracking-wider">Ver</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center shrink-0">
              {selectedDay !== 'all' ? (
                <>
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none tabular-nums tracking-tight">
                    {selectedDay}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{MONTH_NAMES[currentMonth].substring(0, 3)}</span>
                </>
              ) : (
                <CalendarDays className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Registro Diário
                </h2>
                {isHoliday && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-100 uppercase tracking-wider">
                    Folga 12×36
                  </span>
                )}
                {isLocked && !isHoliday && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Salvo
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm font-medium">
                Turno {currentShift || 'A'} · {activeEmployees.length} colaboradores
              </p>
            </div>
          </div>

          {!isHoliday && selectedDay !== 'all' && (
            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
              <button onClick={() => setShowAddEmployeeModal(true)} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Colaborador
              </button>
              <button onClick={handleMarkAllPresent} className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors border border-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5" /> Todos Presentes
              </button>
              <button onClick={handleGeneratePDF} className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors border border-gray-200">
                <FileText className="w-3.5 h-3.5" /> Exportar PDF
              </button>
            </div>
          )}
        </div>

        {!isHoliday && selectedDay !== 'all' && (
          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpiCounts.map(({ key, count }) => {
              const cfg = STATUS_CONFIG[key as Status];
              const pct = activeEmployees.length > 0 ? Math.round((count / activeEmployees.length) * 100) : 0;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-gray-500">{cfg.kpiLabel}</span>
                    <span className="text-lg font-black text-gray-900 tabular-nums leading-none">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${cfg.barColor} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isHoliday && selectedDay !== 'all' && (
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={registroSearchTerm}
              onChange={e => setRegistroSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow text-gray-700 shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm shrink-0">
            <button onClick={() => setLocalStatusFilter('all')} className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors ${localStatusFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Todos</button>
            <button onClick={() => setLocalStatusFilter('P')} className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors ${localStatusFilter === 'P' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}>Presentes</button>
            <button onClick={() => setLocalStatusFilter('F')} className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors ${localStatusFilter === 'F' ? 'bg-rose-100 text-rose-700' : 'text-gray-500 hover:bg-gray-100'}`}>Faltas</button>
            <button onClick={() => setLocalStatusFilter('Fe')} className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors ${localStatusFilter === 'Fe' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>Férias</button>
            <button onClick={() => setLocalStatusFilter('A')} className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors ${localStatusFilter === 'A' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}>Afastados</button>
          </div>
        </div>
      )}

      {isHoliday ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarX className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-2">Dia de Folga Geral</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">Escala 12×36: sem expediente neste dia para o turno {currentShift}.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {finalEmployees.length > 0 && (
            <div className="hidden lg:grid grid-cols-[1fr_240px_1.5fr_80px] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-12">Colaborador</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Observação</span>
              <span />
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {finalEmployees.map((emp) => {
              const currentStatus = (pendingAttendance[emp.id]?.[dayNum] ?? attendance[emp.id]?.[dayNum] ?? 'P') as Status;
              const currentNote   = pendingNotes[emp.id]?.[dayNum] ?? notes[emp.id]?.[dayNum] ?? '';
              const isModified    = pendingAttendance[emp.id]?.[dayNum] !== undefined || pendingNotes[emp.id]?.[dayNum] !== undefined;

              let isNotYetHired = false;
              if (emp.admissionDate) {
                const [y, m, d] = emp.admissionDate.split('-').map(Number);
                isNotYetHired = new Date(currentYear, currentMonth, dayNum) < new Date(y, m - 1, d);
              }

              const cfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.P;

              // Vacation badge info
              const activeVac = getActiveVacation(emp.id, currentDateStr, vacations);
              const overdueVac = getOverdueVacation(emp.id, currentDateStr, vacations);
              const isOnVacation = !!activeVac;

              return (
                <div key={emp.id} className={`group relative transition-colors ${isModified ? 'bg-blue-50/30' : isOnVacation ? 'bg-blue-50/20' : 'hover:bg-gray-50/50'}`}>
                  {isModified && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-r-full" />
                  )}
                  {!isModified && isOnVacation && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-300 rounded-r-full" />
                  )}

                  {/* ── Desktop row ──────────────────────────────────────────────── */}
                  <div className="hidden lg:grid grid-cols-[1fr_240px_1.5fr_80px] gap-4 px-6 py-3.5 items-center">
                    <div className="flex items-center gap-3 min-w-0 pl-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${isOnVacation ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {getInitials(emp.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 truncate">{emp.name}</span>
                          {isNotYetHired && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500 uppercase">Pré-Admissão</span>}
                          {isOnVacation && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase">
                              <Palmtree className="w-2.5 h-2.5" />
                              Férias até {activeVac && new Date(activeVac.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                          {overdueVac && (
                            <button
                              onClick={() => setReturnModal({ employee: emp, vacation: overdueVac })}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase hover:bg-amber-200 transition-colors"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Retorno pendente
                            </button>
                          )}
                          {isModified && <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Modificado</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400 font-mono">#{emp.id.padStart(3,'0')}</span>
                          <span className="text-gray-300 text-[10px]">•</span>
                          <span className="text-[11px] text-gray-500 font-medium">{emp.role || 'Sem Cargo'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className={`flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/60 ${isNotYetHired ? 'opacity-50 pointer-events-none' : ''}`}>
                        {STATUS_ORDER.map(key => {
                          const s = STATUS_CONFIG[key];
                          const Icon = s.icon;
                          const isActive = currentStatus === key;
                          return (
                            <button
                              key={key}
                              onClick={() => !isNotYetHired && setStatus(emp.id, dayNum, key)}
                              title={s.label}
                              className={['flex items-center justify-center w-12 h-8 rounded-lg transition-all duration-200', isActive ? s.activeClass : s.inactiveClass].join(' ')}
                            >
                              <Icon className={`w-4 h-4 ${isActive ? '' : 'opacity-70'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative group/note pr-4">
                      <MessageSquare className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors ${currentNote ? 'text-blue-500' : 'text-gray-400 group-focus-within/note:text-gray-900'}`} />
                      <input
                        type="text"
                        placeholder="Adicionar observação..."
                        value={currentNote}
                        readOnly={isNotYetHired}
                        onChange={e => setNote(emp.id, dayNum, e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 text-xs font-medium bg-transparent border border-transparent hover:border-gray-200 hover:bg-white focus:bg-white focus:border-gray-300 focus:ring-0 focus:outline-none rounded-xl transition-all placeholder:text-gray-400 text-gray-700 ${isNotYetHired ? 'opacity-50 pointer-events-none' : ''}`}
                      />
                    </div>

                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Mobile card ───────────────────────────────────────────────── */}
                  <div className="lg:hidden p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 border ${isOnVacation ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {getInitials(emp.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-gray-900 block truncate">{emp.name}</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="text-[11px] text-gray-500">{emp.role}</span>
                            {isOnVacation && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase">
                                <Palmtree className="w-2.5 h-2.5" /> Férias
                              </span>
                            )}
                            {overdueVac && (
                              <button
                                onClick={() => setReturnModal({ employee: emp, vacation: overdueVac })}
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" /> Retorno
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }} className="p-2 text-gray-400 hover:text-gray-900">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className={`grid grid-cols-4 bg-gray-100/80 p-1 rounded-xl border border-gray-200/60 ${isNotYetHired ? 'opacity-50 pointer-events-none' : ''}`}>
                      {STATUS_ORDER.map(key => {
                        const s = STATUS_CONFIG[key];
                        const Icon = s.icon;
                        const isActive = currentStatus === key;
                        return (
                          <button
                            key={key}
                            onClick={() => !isNotYetHired && setStatus(emp.id, dayNum, key)}
                            className={['flex flex-col items-center gap-1 py-2 rounded-lg transition-all', isActive ? s.activeClass : s.inactiveClass].join(' ')}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-[9px] font-bold uppercase">{s.short}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Observação..."
                        value={currentNote}
                        readOnly={isNotYetHired}
                        onChange={e => setNote(emp.id, dayNum, e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-400 focus:outline-none transition-all text-gray-700"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {finalEmployees.length === 0 && (
              <div className="p-12 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Nenhum colaborador encontrado para este filtro.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isHoliday && selectedDay !== 'all' && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform ${pendingCount > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-gray-900/20 flex items-center gap-4">
            <div className="flex items-center gap-2 pl-2 border-r border-gray-700 pr-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="text-xs font-bold tracking-wide">
                {pendingCount} alteraç{pendingCount === 1 ? 'ão' : 'ões'}
              </span>
            </div>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95">
              {isSaving ? <><Activity className="w-4 h-4 animate-spin" /> Salvando...</> : <><CheckCircle2 className="w-4 h-4" /> Salvar Alterações</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Return modal ────────────────────────────────────────────────────── */}
      {returnModal && (
        <VacationReturnModal
          state={returnModal}
          onConfirmReturn={handleConfirmReturn}
          onExtend={handleExtendVacation}
          onClose={() => setReturnModal(null)}
        />
      )}
    </div>
  );
}
