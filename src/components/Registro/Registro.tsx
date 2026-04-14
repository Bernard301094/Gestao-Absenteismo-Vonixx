import React from 'react';
import {
  CalendarX, UserPlus, CheckCircle2, Search,
  Edit2, Trash2, XCircle, Palmtree, Stethoscope,
  MessageSquare, Activity, CalendarDays, Lock, Unlock,
} from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import type { Employee, Status, AttendanceRecord, NotesRecord, LockedDaysRecord } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

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

type StatusCfg = {
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  activePill: string;
  stripBorder: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  barBg: string;
  kpiLabel: string;
};

const STATUS_CONFIG: Record<Status, StatusCfg> = {
  P: {
    label: 'Presente',
    short: 'P',
    icon: CheckCircle2,
    activePill: 'bg-emerald-500 text-white shadow-sm shadow-emerald-300',
    stripBorder: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    textColor: 'text-emerald-600',
    barBg: 'bg-emerald-500',
    kpiLabel: 'Presentes',
  },
  F: {
    label: 'Falta',
    short: 'F',
    icon: XCircle,
    activePill: 'bg-rose-500 text-white shadow-sm shadow-rose-300',
    stripBorder: 'border-l-rose-500',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    textColor: 'text-rose-600',
    barBg: 'bg-rose-500',
    kpiLabel: 'Faltas',
  },
  Fe: {
    label: 'Férias',
    short: 'Fe',
    icon: Palmtree,
    activePill: 'bg-indigo-500 text-white shadow-sm shadow-indigo-300',
    stripBorder: 'border-l-indigo-500',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    textColor: 'text-indigo-600',
    barBg: 'bg-indigo-500',
    kpiLabel: 'Férias',
  },
  A: {
    label: 'Afastamento',
    short: 'A',
    icon: Stethoscope,
    activePill: 'bg-amber-500 text-white shadow-sm shadow-amber-300',
    stripBorder: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-600',
    barBg: 'bg-amber-500',
    kpiLabel: 'Afastados',
  },
};

const STATUS_ORDER: Status[] = ['P', 'F', 'Fe', 'A'];

// ─── Component ────────────────────────────────────────────────────────────────

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
  const dayNum    = selectedDay === 'all' ? currentDayOfMonth : (selectedDay as number);
  const isLocked  = !!lockedDays[dayNum];
  const isHoliday = selectedDay !== 'all' && !isWorkDay(selectedDay as number, currentMonth, currentYear);

  const pendingCount =
    Object.values(pendingAttendance).reduce((s, d) => s + Object.keys(d).length, 0) +
    Object.values(pendingNotes).reduce((s, d) => s + Object.keys(d).length, 0);

  const kpiCounts = STATUS_ORDER.map(key => ({
    key,
    count:
      key === 'P'
        ? employees.length - employees.filter(e => getStatusForDay(e.id, dayNum) !== 'P').length
        : employees.filter(e => getStatusForDay(e.id, dayNum) === key).length,
  }));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Command Header ───────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-xl shadow-slate-900/20">

        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        {/* Radial glow top-right */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-gradient-to-bl from-blue-600/25 to-transparent pointer-events-none" />

        <div className="relative px-5 sm:px-6 py-5 flex flex-col xl:flex-row xl:items-center gap-5">

          {/* Left block ── day + title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm flex flex-col items-center justify-center shrink-0">
              {selectedDay !== 'all' ? (
                <>
                  <span className="text-3xl sm:text-[34px] font-black text-white leading-none tabular-nums">
                    {selectedDay}
                  </span>
                  <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.25em] mt-0.5">dia</span>
                </>
              ) : (
                <CalendarDays className="w-6 h-6 text-white/40" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                  Lançamento de Frequência
                </h2>
                {isHoliday && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-[0.15em] shrink-0">
                    Folga 12×36
                  </span>
                )}
                {isLocked && !isHoliday && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-[0.12em] shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    Bloqueado
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-slate-400 text-xs sm:text-sm font-medium">
                {MONTH_NAMES[currentMonth]} {currentYear}
                {selectedDay !== 'all' && (
                  <span className="text-slate-500"> · {employees.length} colaborador{employees.length !== 1 ? 'es' : ''}</span>
                )}
              </p>
            </div>
          </div>

          {/* Right block ── KPI tiles */}
          {!isHoliday && selectedDay !== 'all' && (
            <div className="grid grid-cols-4 gap-2 shrink-0">
              {kpiCounts.map(({ key, count }) => {
                const cfg = STATUS_CONFIG[key as Status];
                const pct = employees.length > 0 ? Math.round((count / employees.length) * 100) : 0;
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl px-3 sm:px-4 py-3 border border-white/[0.07] min-w-[58px]"
                  >
                    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">{count}</span>
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.18em] mt-1">
                      {cfg.kpiLabel}
                    </span>
                    <div className="w-full h-[2px] bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full ${cfg.barBg} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-bold text-white/25 mt-1 tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Action Bar ───────────────────────────────────────────────────────── */}
      {!isHoliday && selectedDay !== 'all' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.12em] transition-all active:scale-95 shadow-md shadow-slate-900/15"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Novo
            </button>

            <button
              onClick={handleMarkAllPresent}
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border border-emerald-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Todos Presentes
            </button>

            {isLocked && (
              <button
                onClick={() => setLockedDays(prev => ({ ...prev, [dayNum]: false }))}
                className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border border-amber-200"
              >
                <Unlock className="w-3.5 h-3.5" />
                Desbloquear
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none transition-colors" />
            <input
              type="text"
              placeholder="Filtrar por nome ou ID..."
              value={registroSearchTerm}
              onChange={e => setRegistroSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-gray-300 font-medium text-gray-700"
            />
          </div>
        </div>
      )}

      {/* ── List / Empty State ───────────────────────────────────────────────── */}
      {isHoliday ? (

        /* ── Holiday empty ── */
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-14 text-center shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="w-full h-full bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
              <CalendarX className="w-9 h-9 text-gray-200" />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm text-[11px] font-black text-gray-300">
              {selectedDay}
            </span>
          </div>
          <h3 className="text-base font-black text-gray-700 uppercase tracking-tight mb-1">Dia de Folga Geral</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">Escala 12×36: sem expediente neste dia para este turno.</p>
        </div>

      ) : (
        <div className="space-y-2">

          {/* Column labels (desktop only) */}
          <div className="hidden lg:flex items-center px-4 pl-[52px] gap-0">
            <span className="flex-1 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Colaborador</span>
            <span className="w-[212px] shrink-0 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] text-center">Status</span>
            <span className="flex-1 pl-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Observação</span>
            <span className="w-[72px] shrink-0" />
          </div>

          {/* Employee rows */}
          {filteredRegistroEmployees.map((emp, index) => {
            const currentStatus = (pendingAttendance[emp.id]?.[dayNum] ?? attendance[emp.id]?.[dayNum] ?? 'P') as Status;
            const currentNote   = pendingNotes[emp.id]?.[dayNum] ?? notes[emp.id]?.[dayNum] ?? '';
            const isModified    = pendingAttendance[emp.id]?.[dayNum] !== undefined || pendingNotes[emp.id]?.[dayNum] !== undefined;
            const cfg           = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.P;
            const StatusIcon    = cfg.icon;
            const isDayLocked   = isLocked && !isModified;

            return (
              <div
                key={emp.id}
                className={`
                  group relative bg-white border-l-[3px] ${cfg.stripBorder}
                  rounded-xl border border-gray-100
                  transition-all duration-200
                  ${isModified
                    ? 'shadow-md shadow-blue-100/70 ring-1 ring-blue-200/60'
                    : 'hover:shadow-sm hover:border-gray-200'
                  }
                `}
                style={{ animationDelay: `${index * 25}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-0 p-3 sm:p-3.5">

                  {/* ── Employee info ─────────────────────────────────────── */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 ${cfg.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight truncate leading-none">
                          {emp.name}
                        </span>
                        {isModified && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black bg-blue-100 text-blue-500 uppercase tracking-[0.15em] shrink-0 leading-none">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse inline-block" />
                            Pendente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-[3px]">
                        <span className="text-[10px] font-black text-gray-300 font-mono">#{emp.id.padStart(3, '0')}</span>
                        <span className="text-gray-200">·</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.textColor}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Status segmented control ──────────────────────────── */}
                  <div className="flex items-center justify-start lg:justify-center lg:w-[212px] lg:shrink-0">
                    <div className="inline-flex items-center bg-gray-50 rounded-xl p-[3px] border border-gray-100 gap-[2px]">
                      {STATUS_ORDER.map(key => {
                        const s = STATUS_CONFIG[key];
                        const Icon = s.icon;
                        const isActive = currentStatus === key;
                        return (
                          <button
                            key={key}
                            onClick={() => !isDayLocked && setStatus(emp.id, dayNum, key)}
                            disabled={isDayLocked}
                            title={s.label}
                            className={`
                              flex items-center gap-1 px-2.5 py-1.5 rounded-[9px]
                              text-[9px] font-black uppercase tracking-[0.1em]
                              transition-all duration-150
                              ${isActive
                                ? s.activePill
                                : 'text-gray-400 hover:text-gray-600 hover:bg-white'
                              }
                              ${isDayLocked ? 'cursor-not-allowed opacity-40' : 'active:scale-95'}
                            `}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span>{s.short}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Note input ────────────────────────────────────────── */}
                  <div className="flex-1 lg:pl-3 min-w-0 relative group/note">
                    <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-200 group-focus-within/note:text-blue-400 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Observação..."
                      value={currentNote}
                      readOnly={isDayLocked}
                      onChange={e => setNote(emp.id, dayNum, e.target.value)}
                      className={`
                        w-full pl-7 pr-3 py-2 text-[11px]
                        bg-gray-50 border border-transparent rounded-lg
                        focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-50/80 focus:outline-none
                        transition-all placeholder:text-gray-200 font-medium text-gray-600
                        ${isDayLocked ? 'cursor-not-allowed opacity-50' : ''}
                      `}
                    />
                  </div>

                  {/* ── Edit / Delete ─────────────────────────────────────── */}
                  <div className="hidden lg:flex items-center gap-1 shrink-0 pl-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-[72px] justify-end">
                    <button
                      onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mobile edit/delete row */}
                  <div className="flex lg:hidden items-center gap-2 pt-1 border-t border-gray-50">
                    <button
                      onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>

                </div>
              </div>
            );
          })}

          {/* No results */}
          {filteredRegistroEmployees.length === 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-12 text-center">
              <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">Nenhum colaborador encontrado para "{registroSearchTerm}".</p>
            </div>
          )}

          {/* List footer count */}
          {filteredRegistroEmployees.length > 0 && (
            <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest pt-1">
              {filteredRegistroEmployees.length} colaborador{filteredRegistroEmployees.length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── Floating Save Bar ────────────────────────────────────────────────── */}
      {!isHoliday && selectedDay !== 'all' && (
        <div className="sticky bottom-4 z-10 flex justify-center pt-2">
          <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-gray-100 shadow-2xl shadow-gray-300/40 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-500">

            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.14em]">
                  {pendingCount} alteraç{pendingCount === 1 ? 'ão' : 'ões'}
                </span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || pendingCount === 0}
              className={`
                flex items-center gap-2 px-7 sm:px-10 py-3 rounded-xl
                text-[11px] font-black uppercase tracking-[0.14em] transition-all
                ${isSaving || pendingCount === 0
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-105 active:scale-95 shadow-lg shadow-slate-400/20'
                }
              `}
            >
              {isSaving ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
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