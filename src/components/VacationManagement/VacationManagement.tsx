import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, Plus, Trash2,
  Edit2, Search, User, Info, ChevronDown, ChevronUp, CalendarDays,
  X, TrendingDown, UserCheck, CalendarCheck,
} from 'lucide-react';
import type { Employee, Vacation, VacationStats } from '../../types';
import { useVacationStats, calcVacationDates } from '../../hooks/useVacationStats';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface VacationManagementProps {
  employees: Employee[];
  vacations: Vacation[];
  handleAddVacation: (vacation: Omit<Vacation, 'id'>) => Promise<void>;
  handleDeleteVacation: (id: string) => Promise<void>;
  handleUpdateVacation: (id: string, vacation: Partial<Vacation>) => Promise<void>;
  updateEmployeeData: (id: string, data: any) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso || iso.length < 10) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ stat }: { stat: VacationStats }) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap';
  switch (stat.status) {
    case 'em_ferias_agora':
      return (
        <div className="flex flex-col gap-1">
          <span className={`${base} bg-orange-100 text-orange-700 border border-orange-200`}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Em Férias Agora
          </span>
          {stat.diasRestantes !== undefined && stat.diasRestantes !== '' && (
            <span className="text-[10px] text-orange-500 font-medium">
              {stat.diasRestantes}d restantes
            </span>
          )}
        </div>
      );
    case 'ferias_agendadas':
      return <span className={`${base} bg-blue-100 text-blue-700 border border-blue-200`}><CalendarDays className="w-3 h-3" /> Agendado</span>;
    case 'critico_vencido':
      return <span className={`${base} bg-red-100 text-red-700 border border-red-200`}><AlertTriangle className="w-3 h-3" /> Crítico / Vencido</span>;
    case 'agendar_em_breve':
      return <span className={`${base} bg-amber-100 text-amber-700 border border-amber-200`}><Clock className="w-3 h-3" /> Agendar em Breve</span>;
    case 'em_per_aquisitivo':
      return <span className={`${base} bg-cyan-100 text-cyan-700 border border-cyan-200`}><CalendarDays className="w-3 h-3" /> Per. Aquisitivo</span>;
    case 'ferias_concluidas':
      return <span className={`${base} bg-emerald-100 text-emerald-700 border border-emerald-200`}><CheckCircle2 className="w-3 h-3" /> Concluído</span>;
    case 'agendado_sem_admissao':
      return <span className={`${base} bg-blue-50 text-blue-500 border border-blue-100`}><CalendarDays className="w-3 h-3" /> Agendado</span>;
    case 'a_vencer':
      return <span className={`${base} bg-green-100 text-green-700 border border-green-200`}><CheckCircle2 className="w-3 h-3" /> A Vencer</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-400 border border-gray-200`}>Aguardando</span>;
  }
}

// ─── Desktop Table Row ────────────────────────────────────────────────────────

function DesktopRow({
  stat, onDelete, onEdit,
}: { stat: VacationStats; onDelete: (id: string) => void; onEdit: (s: VacationStats) => void }) {
  const [expanded, setExpanded] = useState(false);
  const urgencyColor =
    stat.diasParaVencer < 0   ? 'text-red-600 font-black' :
    stat.diasParaVencer < 30  ? 'text-red-500 font-bold'  :
    stat.diasParaVencer < 60  ? 'text-amber-600 font-bold' : 'text-gray-700';

  return (
    <>
      <motion.tr
        layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 uppercase tracking-tight block leading-tight">{stat.employeeName}</span>
              <span className="text-[10px] text-gray-400 font-medium">Admissão: {fmtDate(stat.admissionDate)}</span>
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5 hidden md:table-cell">
          {stat.inicioAquisitivo ? (
            <div className="text-xs">
              <span className="font-semibold text-gray-700">{fmtDate(stat.inicioAquisitivo)}</span>
              <span className="text-gray-300 mx-1">→</span>
              <span className="font-semibold text-gray-700">{fmtDate(stat.fimAquisitivo)}</span>
            </div>
          ) : <span className="text-xs text-gray-300">—</span>}
        </td>
        <td className="px-5 py-3.5">
          {stat.dataLimiteConcessao ? (
            <div>
              <span className={`text-xs ${urgencyColor}`}>{fmtDate(stat.dataLimiteConcessao)}</span>
              <span className="block text-[10px] text-gray-400 mt-0.5">
                {stat.diasParaVencer < 0
                  ? `Vencido há ${Math.abs(stat.diasParaVencer)}d`
                  : stat.status === 'em_per_aquisitivo'
                  ? 'Período aquisitivo'
                  : `Faltam ${stat.diasParaVencer}d`}
              </span>
            </div>
          ) : <span className="text-xs text-gray-300">—</span>}
        </td>
        <td className="px-5 py-3.5"><StatusBadge stat={stat} /></td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-0.5">
            <button onClick={e => { e.stopPropagation(); onEdit(stat); }}
              className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar">
              <Edit2 className="w-4 h-4" />
            </button>
            {stat.currentVacation && (
              <button onClick={e => { e.stopPropagation(); onDelete(stat.currentVacation!.id); }}
                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Cancelar">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </motion.tr>

      <AnimatePresence>
        {expanded && (
          <motion.tr key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <td colSpan={5} className="px-5 pb-4 pt-0 bg-blue-50/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                <DetailCell label="Início Aquisitivo"  value={fmtDate(stat.inicioAquisitivo)} />
                <DetailCell label="Fim Aquisitivo"     value={fmtDate(stat.fimAquisitivo)} />
                <DetailCell label="Fim Concessivo"     value={fmtDate(stat.fimConcessivo)} />
                <DetailCell label="Limite p/ Iniciar"  value={fmtDate(stat.dataLimiteConcessao)} highlight={stat.diasParaVencer < 60} />
                {stat.currentVacation && (
                  <>
                    <DetailCell label="Início Férias"  value={fmtDate(stat.currentVacation.startDate)} />
                    <DetailCell label="Fim Férias"     value={fmtDate(stat.currentVacation.endDate)} />
                    <DetailCell label="Retorno"        value={fmtDate(stat.currentVacation.returnDate ?? '')} />
                    <DetailCell label="Dias a Gozar"   value={String((stat.currentVacation.diasDireito ?? 30) - (stat.currentVacation.diasVendidos ?? 0))} />
                    {stat.currentVacation.vendeuFerias && (
                      <DetailCell label="Dias Vendidos" value={String(stat.currentVacation.diasVendidos ?? 0)} />
                    )}
                  </>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

function DetailCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
      <p className="text-[9px] uppercase tracking-widest font-black text-gray-400">{label}</p>
      <p className={`text-xs font-bold mt-0.5 ${highlight ? 'text-amber-700' : 'text-gray-700'}`}>{value || '—'}</p>
    </div>
  );
}

// ─── Mobile Employee Card ─────────────────────────────────────────────────────

function MobileCard({
  stat, onDelete, onEdit,
}: { stat: VacationStats; onDelete: (id: string) => void; onEdit: (s: VacationStats) => void }) {
  const [expanded, setExpanded] = useState(false);
  const urgencyBorder =
    stat.diasParaVencer < 0  ? 'border-l-red-500'   :
    stat.diasParaVencer < 30 ? 'border-l-red-400'   :
    stat.diasParaVencer < 60 ? 'border-l-amber-500' : 'border-l-gray-200';

  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${urgencyBorder} shadow-sm overflow-hidden`}>
      <div className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[13px] font-black text-gray-900 uppercase tracking-tight block truncate">
                {stat.employeeName}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                Admissão: {fmtDate(stat.admissionDate)}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(stat)}
                className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {stat.currentVacation && (
                <button onClick={() => onDelete(stat.currentVacation!.id)}
                  className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <StatusBadge stat={stat} />
            {stat.dataLimiteConcessao && (
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold block ${stat.diasParaVencer < 0 ? 'text-red-600' : stat.diasParaVencer < 60 ? 'text-amber-600' : 'text-gray-600'}`}>
                  {fmtDate(stat.dataLimiteConcessao)}
                </span>
                <span className="text-[9px] text-gray-400">Limite concessão</span>
              </div>
            )}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Ocultar' : 'Ver detalhes CLT'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-2 border-t border-gray-50">
              <DetailCell label="Início Aquisitivo"  value={fmtDate(stat.inicioAquisitivo)} />
              <DetailCell label="Fim Aquisitivo"     value={fmtDate(stat.fimAquisitivo)} />
              <DetailCell label="Fim Concessivo"     value={fmtDate(stat.fimConcessivo)} />
              <DetailCell label="Limite Concessão"   value={fmtDate(stat.dataLimiteConcessao)} highlight={stat.diasParaVencer < 60} />
              {stat.currentVacation && (
                <>
                  <DetailCell label="Início Férias"  value={fmtDate(stat.currentVacation.startDate)} />
                  <DetailCell label="Fim Férias"     value={fmtDate(stat.currentVacation.endDate)} />
                  <DetailCell label="Retorno"        value={fmtDate(stat.currentVacation.returnDate ?? '')} />
                  <DetailCell label="Dias a Gozar"   value={String((stat.currentVacation.diasDireito ?? 30) - (stat.currentVacation.diasVendidos ?? 0))} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared Form Field ────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-sm font-medium text-gray-800 bg-white transition-all';

// ─── Preview Block ────────────────────────────────────────────────────────────

function PreviewBlock({ preview, vendeuFerias, diasVendidos }: {
  preview: { diasAGozar: number; endDate: string; returnDate: string } | null;
  vendeuFerias: boolean;
  diasVendidos: number;
}) {
  if (!preview) return null;
  return (
    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-blue-600" />
        <p className="text-xs font-black text-blue-700 uppercase tracking-wider">Cálculo Automático CLT</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Dias a Gozar',    value: `${preview.diasAGozar}d` },
          { label: 'Fim das Férias',  value: fmtDate(preview.endDate) },
          { label: 'Data de Retorno', value: fmtDate(preview.returnDate) },
          ...(vendeuFerias ? [{ label: 'Dias Vendidos', value: `${diasVendidos}d` }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg px-3 py-2 border border-blue-100">
            <p className="text-[9px] text-blue-400 font-black uppercase tracking-wider">{label}</p>
            <p className="text-sm font-black text-blue-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[95dvh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-black text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function VacationManagement({
  employees, vacations, handleAddVacation, handleDeleteVacation, handleUpdateVacation, updateEmployeeData,
}: VacationManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add form
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate]       = useState('');
  const [diasDireito, setDiasDireito]   = useState(30);
  const [vendeuFerias, setVendeuFerias] = useState(false);
  const [diasVendidos, setDiasVendidos] = useState(0);

  // Edit form
  const [editingStat, setEditingStat]         = useState<VacationStats | null>(null);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [editAdmissionDate, setEditAdmissionDate] = useState('');
  const [editStartDate, setEditStartDate]     = useState('');
  const [editDiasDireito, setEditDiasDireito] = useState(30);
  const [editVendeuFerias, setEditVendeuFerias] = useState(false);
  const [editDiasVendidos, setEditDiasVendidos] = useState(0);

  const vacationStats = useVacationStats(employees, vacations);

  const preview = useMemo(
    () => startDate ? calcVacationDates(startDate, diasDireito, vendeuFerias ? diasVendidos : 0) : null,
    [startDate, diasDireito, vendeuFerias, diasVendidos],
  );

  const editPreview = useMemo(
    () => editStartDate ? calcVacationDates(editStartDate, editDiasDireito, editVendeuFerias ? editDiasVendidos : 0) : null,
    [editStartDate, editDiasDireito, editVendeuFerias, editDiasVendidos],
  );

  const handleEditClick = (stat: VacationStats) => {
    setEditingStat(stat);
    setEditAdmissionDate(stat.admissionDate);
    if (stat.currentVacation) {
      setEditStartDate(stat.currentVacation.startDate);
      setEditDiasDireito(stat.currentVacation.diasDireito ?? 30);
      setEditVendeuFerias(stat.currentVacation.vendeuFerias ?? false);
      setEditDiasVendidos(stat.currentVacation.diasVendidos ?? 0);
    } else {
      setEditStartDate(''); setEditDiasDireito(30); setEditVendeuFerias(false); setEditDiasVendidos(0);
    }
    setShowEditModal(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStat) return;
    if (editAdmissionDate !== editingStat.admissionDate) {
      await updateEmployeeData(editingStat.employeeId, { admissionDate: editAdmissionDate });
    }
    const sold  = editVendeuFerias ? editDiasVendidos : 0;
    const dates = editStartDate ? calcVacationDates(editStartDate, editDiasDireito, sold) : null;
    const todayISO = new Date().toISOString().split('T')[0];
    if (editingStat.currentVacation) {
      const status = (dates && dates.endDate < todayISO) ? 'taken' : editingStat.currentVacation.status;
      await handleUpdateVacation(editingStat.currentVacation.id, {
        startDate: dates?.startDate || editingStat.currentVacation.startDate,
        endDate: dates?.endDate || editingStat.currentVacation.endDate,
        returnDate: dates?.returnDate || editingStat.currentVacation.returnDate,
        diasDireito: editDiasDireito, vendeuFerias: editVendeuFerias, diasVendidos: sold, status,
      });
    } else if (dates) {
      await handleAddVacation({
        employeeId: editingStat.employeeId,
        startDate: dates.startDate, endDate: dates.endDate, returnDate: dates.returnDate,
        status: dates.endDate < todayISO ? 'taken' : 'scheduled',
        diasDireito: editDiasDireito, vendeuFerias: editVendeuFerias, diasVendidos: sold,
      });
    }
    setShowEditModal(false); setEditingStat(null);
  };

  const priorityOrder: Record<string, number> = {
    critico_vencido: 1, agendar_em_breve: 2, em_ferias_agora: 3, ferias_agendadas: 4,
    a_vencer: 5, em_per_aquisitivo: 6, ferias_concluidas: 7, aguardando_dados: 8,
  };

  const filteredStats = useMemo(() =>
    vacationStats
      .filter(s => s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const pa = priorityOrder[a.status] ?? 99, pb = priorityOrder[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        return a.diasParaVencer - b.diasParaVencer;
      }),
    [vacationStats, searchTerm],
  );

  const countNow       = vacationStats.filter(s => s.status === 'em_ferias_agora').length;
  const countScheduled = vacationStats.filter(s => s.status === 'ferias_agendadas').length;
  const countUrgent    = vacationStats.filter(s =>
    s.diasParaVencer < 60 && !['em_ferias_agora','em_per_aquisitivo','aguardando_dados'].includes(s.status),
  ).length;

  const employeesMissingAdmission = employees.filter(e => !e.admissionDate || e.admissionDate.length < 10);

  const onAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !startDate) return;
    const sold  = vendeuFerias ? diasVendidos : 0;
    const dates = calcVacationDates(startDate, diasDireito, sold);
    const todayISO = new Date().toISOString().split('T')[0];
    await handleAddVacation({
      employeeId: selectedEmployeeId,
      startDate: dates.startDate, endDate: dates.endDate, returnDate: dates.returnDate,
      status: dates.endDate < todayISO ? 'taken' : 'scheduled',
      diasDireito, vendeuFerias, diasVendidos: sold,
    });
    setShowAddModal(false);
    setSelectedEmployeeId(''); setStartDate(''); setDiasDireito(30); setVendeuFerias(false); setDiasVendidos(0);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Missing Admission Warning ─────────────────────────────────────── */}
      {employeesMissingAdmission.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-sm text-amber-800">
            <span className="font-black">{employeesMissingAdmission.length} colaborador(es)</span>{' '}
            com data de admissão incompleta. Atualize o cadastro na aba{' '}
            <strong>Registro</strong> para que sejam exibidos.
          </div>
        </motion.div>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <UserCheck className="w-5 h-5" />, label: 'Em Férias Agora',  value: countNow,       color: 'blue'   },
          { icon: <CalendarDays className="w-5 h-5" />, label: 'Agendadas',     value: countScheduled, color: 'emerald' },
          { icon: <TrendingDown className="w-5 h-5" />, label: 'Prazos Próximos', value: countUrgent,  color: 'amber'  },
        ].map(({ icon, label, value, color }) => {
          const colorMap: Record<string, string> = {
            blue:    'bg-blue-700 shadow-blue-700/20',
            emerald: 'bg-emerald-600 shadow-emerald-600/20',
            amber:   'bg-amber-500 shadow-amber-500/20',
          };
          const bgMap: Record<string, string> = {
            blue: 'from-blue-50 to-white border-blue-100',
            emerald: 'from-emerald-50 to-white border-emerald-100',
            amber: 'from-amber-50 to-white border-amber-100',
          };
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gradient-to-br ${bgMap[color]} border rounded-2xl p-5 flex items-center gap-4 shadow-sm`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg ${colorMap[color]} shrink-0`}>
                {icon}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-black text-gray-900 leading-none mt-0.5">{value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Table / Card Panel ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-black hover:bg-blue-600 transition-all shadow-md shadow-blue-700/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Agendar Férias
          </button>
        </div>

        {/* Hint */}
        <div className="px-5 py-2 bg-slate-50 border-b border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
          <Info className="w-3 h-3 shrink-0" />
          Clique em uma linha para ver os detalhes do período CLT
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                {['Colaborador','Período Aquisitivo','Limite Concessão','Status','Ações'].map(h => (
                  <th key={h} className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap last:w-[120px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredStats.map(stat => (
                  <DesktopRow key={stat.employeeId} stat={stat} onDelete={handleDeleteVacation} onEdit={handleEditClick} />
                ))}
                {filteredStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                      Nenhum colaborador encontrado.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards ── */}
        <div className="sm:hidden p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredStats.map(stat => (
              <MobileCard key={stat.employeeId} stat={stat} onDelete={handleDeleteVacation} onEdit={handleEditClick} />
            ))}
            {filteredStats.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">
                Nenhum colaborador encontrado.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modal: Agendar Férias ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <Modal title="Agendar Férias" onClose={() => setShowAddModal(false)}>
            <form onSubmit={onAddSubmit} className="p-5 sm:p-6 space-y-4">
              <FormField label="Colaborador">
                <select required value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className={inputCls}>
                  <option value="">Selecione...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </FormField>

              <FormField label="Início das Férias">
                <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Dias de Direito">
                  <input type="number" required min={1} max={30} value={diasDireito}
                    onChange={e => setDiasDireito(Number(e.target.value))} className={inputCls} />
                </FormField>
                <FormField label="Vendeu Férias?">
                  <select value={vendeuFerias ? 'sim' : 'nao'}
                    onChange={e => { setVendeuFerias(e.target.value === 'sim'); if (e.target.value === 'nao') setDiasVendidos(0); }}
                    className={inputCls}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </FormField>
              </div>

              {vendeuFerias && (
                <FormField label="Dias Vendidos (máx. 10)">
                  <input type="number" required min={1} max={10} value={diasVendidos}
                    onChange={e => setDiasVendidos(Number(e.target.value))} className={inputCls} />
                </FormField>
              )}

              <PreviewBlock preview={preview} vendeuFerias={vendeuFerias} diasVendidos={diasVendidos} />

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-700 text-white text-sm font-black hover:bg-blue-600 transition-colors shadow-md shadow-blue-700/20">
                  Agendar
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Modal: Editar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && editingStat && (
          <Modal title="Editar Informações" subtitle={editingStat.employeeName} onClose={() => { setShowEditModal(false); setEditingStat(null); }}>
            <form onSubmit={onEditSubmit} className="p-5 sm:p-6 space-y-4">
              <FormField label="Data de Admissão">
                <input type="date" required value={editAdmissionDate} onChange={e => setEditAdmissionDate(e.target.value)} className={inputCls} />
              </FormField>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Dados de Férias</p>

                <FormField label="Início das Férias">
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className={inputCls} />
                </FormField>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <FormField label="Dias de Direito">
                    <input type="number" min={1} max={30} value={editDiasDireito}
                      onChange={e => setEditDiasDireito(Number(e.target.value))} className={inputCls} />
                  </FormField>
                  <FormField label="Vendeu Férias?">
                    <select value={editVendeuFerias ? 'sim' : 'nao'}
                      onChange={e => { setEditVendeuFerias(e.target.value === 'sim'); if (e.target.value === 'nao') setEditDiasVendidos(0); }}
                      className={inputCls}>
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </FormField>
                </div>

                {editVendeuFerias && (
                  <div className="mt-3">
                    <FormField label="Dias Vendidos (máx. 10)">
                      <input type="number" min={1} max={10} value={editDiasVendidos}
                        onChange={e => setEditDiasVendidos(Number(e.target.value))} className={inputCls} />
                    </FormField>
                  </div>
                )}
              </div>

              <PreviewBlock preview={editPreview} vendeuFerias={editVendeuFerias} diasVendidos={editDiasVendidos} />

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStat(null); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-700 text-white text-sm font-black hover:bg-blue-600 transition-colors shadow-md shadow-blue-700/20">
                  Salvar
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}