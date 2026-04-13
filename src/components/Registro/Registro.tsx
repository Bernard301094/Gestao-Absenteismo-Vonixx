import React from 'react';
import {
  CalendarX, UserPlus, CheckCircle2, Search,
  Edit2, Trash2, XCircle, Palmtree, Stethoscope,
  MessageSquare, Activity, CalendarDays, Lock, Unlock
} from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import type { Employee, Status, AttendanceRecord, NotesRecord, LockedDaysRecord } from '../../types';

interface RegistroProps {
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
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  P:  { label: 'Presente',    short: 'P',  icon: CheckCircle2, active: 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-200', border: 'border-l-emerald-400', dot: 'bg-emerald-400',  iconColor: 'text-emerald-500' },
  F:  { label: 'Falta',       short: 'F',  icon: XCircle,      active: 'bg-red-50 border-red-300 text-red-700 ring-2 ring-red-200',                border: 'border-l-red-400',     dot: 'bg-red-400',       iconColor: 'text-red-500' },
  Fe: { label: 'Férias',      short: 'Fe', icon: Palmtree,     active: 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-200',             border: 'border-l-blue-400',    dot: 'bg-blue-400',      iconColor: 'text-blue-500' },
  A:  { label: 'Afastamento', short: 'A',  icon: Stethoscope,  active: 'bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-200',     border: 'border-l-purple-400',  dot: 'bg-purple-400',    iconColor: 'text-purple-500' },
} as const;

const KPI_CONFIG = [
  { key: 'P',  label: 'Presentes', color: 'text-emerald-600', bg: 'bg-emerald-500', track: 'bg-emerald-100' },
  { key: 'F',  label: 'Faltas',    color: 'text-red-600',     bg: 'bg-red-500',     track: 'bg-red-100'     },
  { key: 'Fe', label: 'Férias',    color: 'text-blue-600',    bg: 'bg-blue-500',    track: 'bg-blue-100'    },
  { key: 'A',  label: 'Afast.',    color: 'text-purple-600',  bg: 'bg-purple-500',  track: 'bg-purple-100'  },
] as const;

export default function Registro({
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
  setLockedDays,
  handleSave,
  isSaving,
}: RegistroProps) {
  const dayNum = selectedDay === 'all' ? currentDayOfMonth : (selectedDay as number);
  const isLocked = !!lockedDays[dayNum];
  const isHoliday = selectedDay !== 'all' && !isWorkDay(selectedDay as number, currentMonth, currentYear);

  // Count pending changes
  const pendingCount = Object.values(pendingAttendance).reduce((sum, days) => sum + Object.keys(days).length, 0)
    + Object.values(pendingNotes).reduce((sum, days) => sum + Object.keys(days).length, 0);

  // KPI counts
  const kpiCounts = KPI_CONFIG.map(({ key }) => ({
    key,
    count: key === 'P'
      ? employees.length - employees.filter(e => getStatusForDay(e.id, dayNum) !== 'P').length
      : employees.filter(e => getStatusForDay(e.id, dayNum) === key).length,
  }));

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Panel Header ────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] rounded-2xl overflow-hidden shadow-lg shadow-blue-900/20">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full" />

        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Left: title + day badge */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex flex-col items-center justify-center border border-white/20 shadow-inner shrink-0">
              <CalendarDays className="w-5 h-5 text-white/80" />
              {selectedDay !== 'all' && (
                <span className="text-[10px] font-black text-white leading-none mt-0.5">{selectedDay}</span>
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight leading-none flex items-center gap-2 flex-wrap">
                Lançamento de Frequência
                {isHoliday && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/20 text-white border border-white/30 uppercase tracking-widest">
                    Folga 12x36
                  </span>
                )}
                {isLocked && !isHoliday && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                    <Lock className="w-2.5 h-2.5" /> Bloqueado
                  </span>
                )}
              </h2>
              <p className="text-blue-200/80 text-xs sm:text-sm mt-1">
                {MONTH_NAMES[currentMonth]} {currentYear}
                {selectedDay !== 'all' && ` — Dia ${selectedDay}`}
              </p>
            </div>
          </div>

          {/* Right: KPI micro-cards */}
          {!isHoliday && selectedDay !== 'all' && (
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {kpiCounts.map(({ key, count }) => {
                const cfg = KPI_CONFIG.find(k => k.key === key)!;
                const pct = employees.length > 0 ? Math.round((count / employees.length) * 100) : 0;
                return (
                  <div key={key} className="flex flex-col items-center bg-white/10 rounded-xl px-2 py-2.5 sm:px-3 border border-white/10 min-w-[52px]">
                    <span className={`text-xl sm:text-2xl font-black ${cfg.color.replace('600', '300')} text-white`}>
                      {count}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-white/60 uppercase tracking-widest mt-0.5">{cfg.label}</span>
                    {/* Mini progress */}
                    <div className="w-full h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cfg.bg} opacity-80 transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Action Bar ──────────────────────────────────────────────────────── */}
      {!isHoliday && selectedDay !== 'all' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span className="uppercase tracking-wide">Novo</span>
            </button>
            <button
              onClick={handleMarkAllPresent}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-emerald-200 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="uppercase tracking-wide">Todos Presentes</span>
            </button>
            {isLocked && (
              <button
                onClick={() => setLockedDays(prev => ({ ...prev, [dayNum]: false }))}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-amber-200 active:scale-95"
              >
                <Unlock className="w-4 h-4" />
                <span className="uppercase tracking-wide">Desbloquear</span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs ml-auto group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Filtrar por nome ou ID..."
              value={registroSearchTerm}
              onChange={(e) => setRegistroSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white"
            />
          </div>
        </div>
      )}

      {/* ── Employee Grid ────────────────────────────────────────────────────── */}
      {isHoliday ? (
        /* Empty state — Folga */
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-10 sm:p-16 text-center shadow-sm">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
              <CalendarX className="w-12 h-12 text-gray-300" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-xs font-black text-gray-400">{selectedDay}</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Dia de Folga Geral</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Escala 12×36: este dia não possui expediente para este turno.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredRegistroEmployees.map(emp => {
            const currentStatus = pendingAttendance[emp.id]?.[dayNum] ?? attendance[emp.id]?.[dayNum] ?? 'P';
            const currentNote   = pendingNotes[emp.id]?.[dayNum] ?? notes[emp.id]?.[dayNum] ?? '';
            const isModified    = pendingAttendance[emp.id]?.[dayNum] !== undefined || pendingNotes[emp.id]?.[dayNum] !== undefined;
            const cfg           = STATUS_CONFIG[currentStatus as Status] ?? STATUS_CONFIG.P;
            const StatusIcon    = cfg.icon;
            const isDayLocked   = isLocked && !isModified;

            return (
              <div
                key={emp.id}
                className={`bg-white rounded-2xl border-l-4 border border-gray-100 ${cfg.border} flex flex-col overflow-hidden group transition-all duration-200 ${
                  isModified
                    ? 'shadow-md shadow-blue-100/60 ring-1 ring-blue-200'
                    : 'hover:shadow-md hover:border-gray-200'
                }`}
              >
                {/* ── Card Header ─────────────────────────────────────────── */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status dot avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      currentStatus === 'P' ? 'bg-emerald-50' :
                      currentStatus === 'F' ? 'bg-red-50' :
                      currentStatus === 'Fe' ? 'bg-blue-50' : 'bg-purple-50'
                    }`}>
                      <StatusIcon className={`w-4 h-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate uppercase tracking-tight">{emp.name}</h4>
                        {isModified && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-black text-gray-400 font-mono">#{emp.id.padStart(3, '0')}</span>
                        <span className="text-gray-200">·</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.iconColor}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Edit/Delete — visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }}
                      className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Status Buttons ───────────────────────────────────────── */}
                <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
                  {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG.P][]).map(([key, s]) => {
                    const Icon = s.icon;
                    const isActive = currentStatus === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setStatus(emp.id, dayNum, key)}
                        disabled={isDayLocked}
                        title={s.label}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border text-[8px] sm:text-[9px] font-black uppercase tracking-tighter transition-all duration-150 ${
                          isActive
                            ? s.active
                            : 'bg-gray-50 border-transparent text-gray-400 hover:bg-white hover:border-gray-200 hover:text-gray-600'
                        } ${isDayLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? '' : 'text-gray-300 group-hover:text-gray-400'}`} />
                        {s.short}
                      </button>
                    );
                  })}
                </div>

                {/* ── Note Input ───────────────────────────────────────────── */}
                <div className="px-3 pb-3 mt-auto">
                  <div className="relative group/note">
                    <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 group-focus-within/note:text-blue-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Observação..."
                      value={currentNote}
                      readOnly={isDayLocked}
                      onChange={(e) => setNote(emp.id, dayNum, e.target.value)}
                      className={`w-full pl-7 pr-3 py-2 text-[11px] bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-200 focus:outline-none transition-all placeholder:text-gray-300 ${
                        isDayLocked ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Save Bar ────────────────────────────────────────────────── */}
      {!isHoliday && selectedDay !== 'all' && (
        <div className="sticky bottom-4 z-10 flex justify-center pt-2">
          <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-gray-100 shadow-2xl shadow-gray-300/50 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-500">
            {/* Pending badge */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">
                  {pendingCount} alteraç{pendingCount === 1 ? 'ão' : 'ões'}
                </span>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving || pendingCount === 0}
              className={`flex items-center gap-2.5 px-6 sm:px-10 py-3.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${
                isSaving || pendingCount === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 shadow-lg shadow-blue-300'
              }`}
            >
              {isSaving ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar{pendingCount > 0 ? ` ${pendingCount} alteraç${pendingCount === 1 ? 'ão' : 'ões'}` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
