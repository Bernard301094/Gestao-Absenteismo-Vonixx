import React from 'react';
import {
  CalendarX, UserPlus, CheckCircle2, Search,
  Edit2, Trash2, XCircle, Palmtree, Stethoscope,
  MessageSquare, Activity, CalendarDays, Lock, Unlock,
  ShieldCheck, FileText
} from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import { generateStatsImage } from '../../utils/generateStatsImage';
import type { Employee, Status, AttendanceRecord, NotesRecord, LockedDaysRecord } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

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
}

// ─── Status Config ────────────────────────────────────────────────────────────

type StatusCfg = {
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  activePill: string;
  stripBorder: string;
  badgeBg: string;
  badgeText: string;
  iconRing: string;
  iconColor: string;
  barColor: string;
  kpiLabel: string;
  kpiAccent: string;
};

const STATUS_CONFIG: Record<Status, StatusCfg> = {
  P: {
    label: 'Presente',
    short: 'P',
    icon: CheckCircle2,
    activePill:  'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25',
    stripBorder: 'border-l-emerald-500',
    badgeBg:     'bg-emerald-50',
    badgeText:   'text-emerald-700',
    iconRing:    'bg-emerald-100 ring-1 ring-emerald-200',
    iconColor:   'text-emerald-600',
    barColor:    'bg-emerald-500',
    kpiLabel:    'Presentes',
    kpiAccent:   'border-t-emerald-500',
  },
  F: {
    label: 'Falta',
    short: 'F',
    icon: XCircle,
    activePill:  'bg-rose-600 text-white shadow-lg shadow-rose-500/25',
    stripBorder: 'border-l-rose-500',
    badgeBg:     'bg-rose-50',
    badgeText:   'text-rose-700',
    iconRing:    'bg-rose-100 ring-1 ring-rose-200',
    iconColor:   'text-rose-600',
    barColor:    'bg-rose-500',
    kpiLabel:    'Faltas',
    kpiAccent:   'border-t-rose-500',
  },
  Fe: {
    label: 'Férias',
    short: 'Fe',
    icon: Palmtree,
    activePill:  'bg-blue-600 text-white shadow-lg shadow-blue-500/25',
    stripBorder: 'border-l-blue-500',
    badgeBg:     'bg-blue-50',
    badgeText:   'text-blue-700',
    iconRing:    'bg-blue-100 ring-1 ring-blue-200',
    iconColor:   'text-blue-600',
    barColor:    'bg-blue-500',
    kpiLabel:    'Férias',
    kpiAccent:   'border-t-blue-500',
  },
  A: {
    label: 'Afastamento',
    short: 'A',
    icon: Stethoscope,
    activePill:  'bg-amber-500 text-white shadow-lg shadow-amber-500/25',
    stripBorder: 'border-l-amber-500',
    badgeBg:     'bg-amber-50',
    badgeText:   'text-amber-700',
    iconRing:    'bg-amber-100 ring-1 ring-amber-200',
    iconColor:   'text-amber-600',
    barColor:    'bg-amber-500',
    kpiLabel:    'Afastados',
    kpiAccent:   'border-t-amber-500',
  },
};

const STATUS_ORDER: Status[] = ['P', 'F', 'Fe', 'A'];

// ─── Component ────────────────────────────────────────────────────────────────

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
  setLockedDays,
  handleSave,
  isSaving,
}: AttendanceRegistryProps) {
  const dayNum    = selectedDay === 'all' ? currentDayOfMonth : (selectedDay as number);
  const isLocked  = !!lockedDays[dayNum];
  const isHoliday = selectedDay !== 'all' && !isWorkDay(selectedDay as number, currentMonth, currentYear);

  const activeEmployees = employees.filter(emp => {
    if (!emp.admissionDate) return true;
    const [y, m, d] = emp.admissionDate.split('-').map(Number);
    const admDate    = new Date(y, m - 1, d);
    const targetDate = new Date(currentYear, currentMonth, dayNum);
    return targetDate >= admDate;
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

  const handleGeneratePDF = () => {
    const listF = activeEmployees.filter(e => getStatusForDay(e.id, dayNum) === 'F').map(e => e.name);
    const listA = activeEmployees.filter(e => getStatusForDay(e.id, dayNum) === 'A').map(e => e.name);
    const listFe = activeEmployees.filter(e => getStatusForDay(e.id, dayNum) === 'Fe').map(e => e.name);
    
    const totalStatus = listF.length + listA.length + listFe.length;
    const totalEmployees = activeEmployees.length || 1;
    const percentual = `${Math.round((totalStatus / totalEmployees) * 100)}%`;

    generateStatsImage({
      faltas: listF,
      afastamentos: listA,
      ferias: listFe,
      percentual
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Command Header ──────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-2xl overflow-hidden shadow-xl shadow-blue-900/30">

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Top-right radial glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="relative px-5 sm:px-7 py-5 flex flex-col xl:flex-row xl:items-center gap-5">

          {/* Left: day badge + title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-[62px] h-[62px] sm:w-[70px] sm:h-[70px] rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center shrink-0 shadow-inner">
              {selectedDay !== 'all' ? (
                <>
                  <span className="text-[34px] sm:text-[38px] font-black text-white leading-none tabular-nums tracking-tight">
                    {selectedDay}
                  </span>
                  <span className="text-[7px] font-extrabold text-blue-200/60 uppercase tracking-[0.3em] mt-0.5">dia</span>
                </>
              ) : (
                <CalendarDays className="w-7 h-7 text-white/40" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                  Lançamento de Frequência
                </h2>
                {isHoliday && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-sky-400/20 text-sky-200 border border-sky-400/30 uppercase tracking-[0.15em] shrink-0">
                    Folga 12×36
                  </span>
                )}
                {isLocked && !isHoliday && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black bg-amber-400/20 text-amber-200 border border-amber-400/30 uppercase tracking-[0.12em] shrink-0">
                    <Lock className="w-2.5 h-2.5" /> Bloqueado
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-blue-200/70 text-xs sm:text-sm font-medium">
                {MONTH_NAMES[currentMonth]} {currentYear}
                {selectedDay !== 'all' && (
                  <span className="text-blue-200/40 ml-1">
                    · {activeEmployees.length} ativo{activeEmployees.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: KPI tiles */}
          {!isHoliday && selectedDay !== 'all' && (
            <div className="grid grid-cols-4 gap-2 shrink-0">
              {kpiCounts.map(({ key, count }) => {
                const cfg = STATUS_CONFIG[key as Status];
                const pct = activeEmployees.length > 0
                  ? Math.round((count / activeEmployees.length) * 100)
                  : 0;
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center bg-white/[0.07] hover:bg-white/[0.12] transition-all duration-200 rounded-xl px-3 sm:px-4 py-3 border border-white/10 min-w-[58px] cursor-default"
                  >
                    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">
                      {count}
                    </span>
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.18em] mt-1">
                      {cfg.kpiLabel}
                    </span>
                    <div className="w-full h-[2px] bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full ${cfg.barColor} rounded-full transition-all duration-700`}
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
              className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 shadow-md shadow-blue-700/30 border border-blue-600"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Novo Colaborador
            </button>

            <button
              onClick={handleMarkAllPresent}
              className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border border-emerald-200"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Todos Presentes
            </button>

            <button
              onClick={handleGeneratePDF}
              className="inline-flex items-center gap-2 bg-violet-50 hover:bg-violet-100 text-violet-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border border-violet-200"
            >
              <FileText className="w-3.5 h-3.5" />
              Exportar Resumo (PDF)
            </button>

            {isLocked && (
              <button
                onClick={() => setLockedDays(prev => ({ ...prev, [dayNum]: false }))}
                className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border border-amber-200"
              >
                <Unlock className="w-3.5 h-3.5" />
                Desbloquear
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs ml-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar colaborador..."
              value={registroSearchTerm}
              onChange={e => setRegistroSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-400 transition-all placeholder:text-gray-300 font-medium text-gray-700 shadow-sm"
            />
          </div>
        </div>
      )}

      {/* ── Column Headers (desktop) ─────────────────────────────────────────── */}
      {!isHoliday && selectedDay !== 'all' && filteredRegistroEmployees.length > 0 && (
        <div className="hidden lg:grid grid-cols-[1fr_220px_1fr_80px] items-center px-4 gap-0">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] pl-11">Colaborador</span>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Status</span>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Observação</span>
          <span />
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      {isHoliday ? (

        /* ── Holiday Empty State ── */
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="w-full h-full bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
              <CalendarX className="w-9 h-9 text-blue-300" />
            </div>
            <span className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm text-[11px] font-black text-gray-400">
              {selectedDay}
            </span>
          </div>
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-2">Dia de Folga Geral</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
            Escala 12×36: sem expediente neste dia para este turno.
          </p>
        </div>

      ) : (
        <div className="space-y-2">

          {/* Employee rows */}
          {filteredRegistroEmployees.map((emp, index) => {
            const currentStatus = (pendingAttendance[emp.id]?.[dayNum] ?? attendance[emp.id]?.[dayNum] ?? 'P') as Status;
            const currentNote   = pendingNotes[emp.id]?.[dayNum] ?? notes[emp.id]?.[dayNum] ?? '';
            const isModified    = pendingAttendance[emp.id]?.[dayNum] !== undefined || pendingNotes[emp.id]?.[dayNum] !== undefined;

            let isNotYetHired = false;
            if (emp.admissionDate) {
              const [y, m, d] = emp.admissionDate.split('-').map(Number);
              const admDate    = new Date(y, m - 1, d);
              const targetDate = new Date(currentYear, currentMonth, dayNum);
              isNotYetHired = targetDate < admDate;
            }

            const cfg        = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.P;
            const StatusIcon = cfg.icon;
            const isDayLocked = (isLocked && !isModified) || isNotYetHired;

            return (
              <div
                key={emp.id}
                className={[
                  'group relative bg-white rounded-xl border-l-[3px] transition-all duration-200',
                  cfg.stripBorder,
                  isModified
                    ? 'shadow-md shadow-blue-100/80 ring-1 ring-blue-200/60 border border-blue-100'
                    : 'border border-gray-100 hover:border-gray-200 hover:shadow-sm',
                ].join(' ')}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                {/* ── Desktop Row ─────────────────────────────────────────── */}
                <div className="hidden lg:grid grid-cols-[1fr_220px_1fr_80px] items-center gap-0 px-4 py-3 min-h-[64px]">

                  {/* Employee info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconRing}`}>
                      <StatusIcon className={`w-4 h-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight truncate">
                          {emp.name}
                        </span>
                        {isNotYetHired && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-gray-100 text-gray-400 uppercase tracking-wider shrink-0">
                            Pré-Admissão
                          </span>
                        )}
                        {isModified && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-100 text-blue-600 uppercase tracking-wider shrink-0">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse inline-block" />
                            Pendente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-300 font-mono">#{emp.id.padStart(3,'0')}</span>
                        <span className="text-gray-200 text-xs">·</span>
                        <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">{emp.role || 'Sem Cargo'}</span>
                        <span className="text-gray-200 text-xs">·</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.badgeText}`}>{cfg.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status control */}
                  <div className="flex items-center justify-center">
                    <div className="inline-flex items-center bg-gray-50 rounded-xl p-[3px] border border-gray-200 gap-[2px]">
                      {STATUS_ORDER.map(key => {
                        const s    = STATUS_CONFIG[key];
                        const Icon = s.icon;
                        const isActive = currentStatus === key;
                        return (
                          <button
                            key={key}
                            onClick={() => !isDayLocked && setStatus(emp.id, dayNum, key)}
                            disabled={isDayLocked}
                            title={s.label}
                            className={[
                              'flex items-center gap-1.5 px-3 py-2 rounded-[9px]',
                              'text-[9px] font-black uppercase tracking-[0.1em]',
                              'transition-all duration-150',
                              isActive
                                ? s.activePill
                                : 'text-gray-400 hover:text-gray-700 hover:bg-white',
                              isDayLocked ? 'cursor-not-allowed opacity-40' : 'active:scale-95 cursor-pointer',
                            ].join(' ')}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{s.short}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Note */}
                  <div className="pl-4 relative group/note">
                    <MessageSquare className="absolute left-7 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 group-focus-within/note:text-blue-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Observação..."
                      value={currentNote}
                      readOnly={isDayLocked}
                      onChange={e => setNote(emp.id, dayNum, e.target.value)}
                      className={[
                        'w-full pl-7 pr-3 py-2 text-[11px] font-medium',
                        'bg-gray-50 border border-transparent rounded-lg',
                        'focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-50 focus:outline-none',
                        'transition-all placeholder:text-gray-300 text-gray-600',
                        isDayLocked ? 'cursor-not-allowed opacity-50' : '',
                      ].join(' ')}
                    />
                  </div>

                  {/* Edit / Delete */}
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150 pr-1">
                    <button
                      onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }}
                      className="p-2 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-2 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Mobile Card ─────────────────────────────────────────── */}
                <div className="lg:hidden p-3.5 space-y-3">
                  {/* Top: avatar + name + badges */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconRing}`}>
                      <StatusIcon className={`w-4.5 h-4.5 ${cfg.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight truncate leading-tight">
                          {emp.name}
                        </span>
                        {isNotYetHired && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-gray-100 text-gray-400 uppercase tracking-wider shrink-0">Pré-Admissão</span>
                        )}
                        {isModified && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-100 text-blue-600 uppercase tracking-wider shrink-0">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse inline-block" />
                            Pendente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-300 font-mono">#{emp.id.padStart(3,'0')}</span>
                        <span className="text-gray-200 text-xs">·</span>
                        <span className="text-[10px] font-semibold text-blue-500 uppercase">{emp.role || 'Sem Cargo'}</span>
                      </div>
                    </div>
                    {/* Mobile edit/delete */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingEmployee(emp); setShowEditEmployeeModal(true); }}
                        className="p-2 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-2 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status control - bigger for touch */}
                  <div className="flex items-center">
                    <div className="inline-flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 gap-1 w-full justify-between">
                      {STATUS_ORDER.map(key => {
                        const s    = STATUS_CONFIG[key];
                        const Icon = s.icon;
                        const isActive = currentStatus === key;
                        return (
                          <button
                            key={key}
                            onClick={() => !isDayLocked && setStatus(emp.id, dayNum, key)}
                            disabled={isDayLocked}
                            title={s.label}
                            className={[
                              'flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-lg',
                              'text-[10px] font-black uppercase tracking-[0.08em]',
                              'transition-all duration-150 min-h-[42px]',
                              isActive
                                ? s.activePill
                                : 'text-gray-400 hover:text-gray-700 hover:bg-white',
                              isDayLocked ? 'cursor-not-allowed opacity-40' : 'active:scale-95 cursor-pointer',
                            ].join(' ')}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{s.short}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Note input */}
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Observação..."
                      value={currentNote}
                      readOnly={isDayLocked}
                      onChange={e => setNote(emp.id, dayNum, e.target.value)}
                      className={[
                        'w-full pl-9 pr-3 py-2.5 text-sm font-medium',
                        'bg-gray-50 border border-gray-200 rounded-xl',
                        'focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-50 focus:outline-none',
                        'transition-all placeholder:text-gray-300 text-gray-600',
                        isDayLocked ? 'cursor-not-allowed opacity-50' : '',
                      ].join(' ')}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty search */}
          {filteredRegistroEmployees.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
              <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">
                Nenhum colaborador encontrado para "{registroSearchTerm}".
              </p>
            </div>
          )}

          {/* Count footer */}
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
          <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-gray-100 shadow-2xl shadow-gray-400/20 flex items-center gap-3">

            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.12em]">
                  {pendingCount} alteraç{pendingCount === 1 ? 'ão' : 'ões'} pendente{pendingCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || pendingCount === 0}
              className={[
                'flex items-center gap-2 px-8 sm:px-12 py-3 rounded-xl',
                'text-[11px] font-black uppercase tracking-[0.12em] transition-all',
                isSaving || pendingCount === 0
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-700 hover:bg-blue-600 text-white hover:scale-[1.03] active:scale-95 shadow-lg shadow-blue-700/30',
              ].join(' ')}
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