import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Clock3,
  AlertTriangle,
  Umbrella,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Briefcase,
  Sparkles,
  History,
} from 'lucide-react';
import type { Employee, Vacation, VacationStats, HistoricalVacationReason } from '../../types';
import { calcVacationDates } from '../../hooks/useVacationStats';
import CustomDropdown from '../CustomDropdown';

interface VacationManagementProps {
  employees: Employee[];
  vacations: Vacation[];
  vacationStats: VacationStats[];
  handleAddVacation: (vacation: Omit<Vacation, 'id'>) => Promise<void>;
  handleDeleteVacation: (id: string) => Promise<void>;
  handleUpdateVacation: (id: string, vacation: Partial<Vacation>) => Promise<void>;
  updateEmployeeData: (id: string, data: Partial<Employee>) => Promise<void>;
}

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function StatusChip({ status }: { status: VacationStats['status'] }) {
  const config = {
    em_ferias_agora: ['🏖️ Em Férias', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    ferias_agendadas: ['🗓️ Agendadas', 'bg-blue-50 text-blue-700 border-blue-200'],
    ferias_concluidas: ['✅ Concluídas', 'bg-slate-50 text-slate-700 border-slate-200'],
    critico_vencido: ['🚨 Crítico', 'bg-red-50 text-red-700 border-red-200'],
    agendar_em_breve: ['⏳ Em breve', 'bg-amber-50 text-amber-700 border-amber-200'],
    em_per_aquisitivo: ['📆 Aquisitivo', 'bg-violet-50 text-violet-700 border-violet-200'],
    aguardando_dados: ['⚠️ Dados', 'bg-orange-50 text-orange-700 border-orange-200'],
    agendado_sem_admissao: ['📌 Sem admissão', 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'],
    a_vencer: ['🟢 A vencer', 'bg-green-50 text-green-700 border-green-200'],
  } as const;
  const [label, cls] = config[status] || ['Status', 'bg-gray-50 text-gray-700 border-gray-200'];
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black border ${cls}`}>{label}</span>;
}

function HistoricalBadge({ vacation }: { vacation?: Vacation }) {
  if (!vacation?.isHistorical) return null;
  const reasonLabel: Record<HistoricalVacationReason, string> = {
    taken: 'Férias já gozadas',
    correction: 'Correção de registro',
    import: 'Importação histórica',
  };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border bg-amber-50 text-amber-700 border-amber-200">
      <History className="w-3.5 h-3.5" />
      Histórico{vacation.historicalReason ? ` · ${reasonLabel[vacation.historicalReason]}` : ''}
    </span>
  );
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.18 }} className="relative w-full max-w-2xl rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <XCircle className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function PreviewBlock({ preview, vendeuFerias, diasVendidos }: {
  preview: { diasAGozar: number; endDate: string; returnDate: string; returnDateAdjusted?: boolean } | null;
  vendeuFerias: boolean;
  diasVendidos: number;
}) {
  if (!preview) return null;
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-black text-blue-900">Pré-visualização automática</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DetailCell label="Dias a gozar" value={preview.diasAGozar} />
        <DetailCell label="Fim das Férias" value={fmtDate(preview.endDate)} />
        <DetailCell label="Retorno" value={fmtDate(preview.returnDate)} />
        <DetailCell label="Abono" value={vendeuFerias ? `${diasVendidos} dias` : 'Não'} />
      </div>
      
      {/* Alerta de Ajuste 12x36 */}
      {preview.returnDateAdjusted && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-blue-100/50 border border-blue-200 p-3">
          <span className="text-lg leading-none mt-0.5">💡</span>
          <p className="text-xs font-medium text-blue-800 leading-relaxed">
            O dia de retorno original cairia numa folga (escala 12x36). O sistema ajustou a data de retorno automaticamente para o próximo <b>dia de trabalho</b>.
          </p>
        </div>
      )}
    </div>
  );
}

function HistoricalWarning({
  preview,
  enabled,
  reason,
  onEnable,
  onReasonChange,
}: {
  preview: { endDate: string } | null;
  enabled: boolean;
  reason: HistoricalVacationReason | '';
  onEnable: (v: boolean) => void;
  onReasonChange: (v: HistoricalVacationReason | '') => void;
}) {
  if (!preview) return null;
  const todayISO = new Date().toISOString().split('T')[0];
  const isPast = preview.endDate < todayISO;
  if (!isPast) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-2xl bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h4 className="text-sm font-black text-amber-900">Esta data já passou</h4>
          <p className="text-sm text-amber-800 mt-1">
            Pelos cálculos atuais, essas férias terminariam em <span className="font-black">{fmtDate(preview.endDate)}</span>. Confirme se você está registrando férias históricas ou corrija a data antes de salvar.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white/80 px-3 py-3 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={e => onEnable(e.target.checked)} className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
        <div>
          <p className="text-sm font-black text-amber-900">Confirmar como registro histórico</p>
          <p className="text-xs text-amber-700 mt-0.5">Use isso apenas quando as férias realmente já aconteceram e você precisa registrar o histórico no sistema.</p>
        </div>
      </label>

      {enabled && (
        <FormField label="Motivo do registro histórico">
          <CustomDropdown
            variant="light"
            value={reason}
            onChange={(val) => onReasonChange(val as HistoricalVacationReason | '')}
            options={[
              { value: '', label: 'Selecione o motivo...' },
              { value: 'taken', label: 'Férias já gozadas' },
              { value: 'correction', label: 'Correção de registro' },
              { value: 'import', label: 'Importação histórica' },
            ]}
            label="Selecione o motivo..."
          />
        </FormField>
      )}
    </div>
  );
}

export default function VacationManagement({
  employees: employeesProp,
  vacations,
  vacationStats: vacationStatsProp,
  handleAddVacation,
  handleDeleteVacation,
  handleUpdateVacation,
  updateEmployeeData,
}: VacationManagementProps) {
  // ── Guards contra undefined/null durante loading ─────────────────────────
  const employees: Employee[] = employeesProp ?? [];
  const vacationStats: VacationStats[] = vacationStatsProp ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [diasDireito, setDiasDireito] = useState(30);
  const [vendeuFerias, setVendeuFerias] = useState(false);
  const [diasVendidos, setDiasVendidos] = useState(0);
  const [addHistoricalConfirmed, setAddHistoricalConfirmed] = useState(false);
  const [addHistoricalReason, setAddHistoricalReason] = useState<HistoricalVacationReason | ''>('');

  const [editingStat, setEditingStat] = useState<VacationStats | null>(null);
  const [editAdmissionDate, setEditAdmissionDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDiasDireito, setEditDiasDireito] = useState(30);
  const [editVendeuFerias, setEditVendeuFerias] = useState(false);
  const [editDiasVendidos, setEditDiasVendidos] = useState(0);
  const [editHistoricalConfirmed, setEditHistoricalConfirmed] = useState(false);
  const [editHistoricalReason, setEditHistoricalReason] = useState<HistoricalVacationReason | ''>('');

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';

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
      setEditHistoricalConfirmed(stat.currentVacation.isHistorical ?? false);
      setEditHistoricalReason(stat.currentVacation.historicalReason ?? '');
    } else {
      setEditStartDate('');
      setEditDiasDireito(30);
      setEditVendeuFerias(false);
      setEditDiasVendidos(0);
      setEditHistoricalConfirmed(false);
      setEditHistoricalReason('');
    }
    setShowEditModal(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStat) return;
    if (editAdmissionDate !== editingStat.admissionDate) {
      await updateEmployeeData(editingStat.employeeId, { admissionDate: editAdmissionDate });
    }
    const sold = editVendeuFerias ? editDiasVendidos : 0;
    const dates = editStartDate ? calcVacationDates(editStartDate, editDiasDireito, sold) : null;
    const todayISO = new Date().toISOString().split('T')[0];
    const isPast = !!dates && dates.endDate < todayISO;

    if (isPast && (!editHistoricalConfirmed || !editHistoricalReason)) return;

    if (editingStat.currentVacation) {
      const status = isPast ? 'taken' : editingStat.currentVacation.status;
      await handleUpdateVacation(editingStat.currentVacation.id, {
        startDate: dates?.startDate || editingStat.currentVacation.startDate,
        endDate: dates?.endDate || editingStat.currentVacation.endDate,
        returnDate: dates?.returnDate || editingStat.currentVacation.returnDate,
        diasDireito: editDiasDireito,
        vendeuFerias: editVendeuFerias,
        diasVendidos: sold,
        status,
        isHistorical: isPast ? editHistoricalConfirmed : false,
        historicalReason: isPast ? (editHistoricalReason || undefined) : undefined,
      });
    } else if (dates) {
      await handleAddVacation({
        employeeId: editingStat.employeeId,
        startDate: dates.startDate,
        endDate: dates.endDate,
        returnDate: dates.returnDate,
        status: isPast ? 'taken' : 'scheduled',
        diasDireito: editDiasDireito,
        vendeuFerias: editVendeuFerias,
        diasVendidos: sold,
        isHistorical: isPast ? editHistoricalConfirmed : false,
        historicalReason: isPast ? (editHistoricalReason || undefined) : undefined,
      });
    }
    setShowEditModal(false);
    setEditingStat(null);
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
    const sold = vendeuFerias ? diasVendidos : 0;
    const dates = calcVacationDates(startDate, diasDireito, sold);
    const todayISO = new Date().toISOString().split('T')[0];
    const isPast = dates.endDate < todayISO;

    if (isPast && (!addHistoricalConfirmed || !addHistoricalReason)) return;

    await handleAddVacation({
      employeeId: selectedEmployeeId,
      startDate: dates.startDate,
      endDate: dates.endDate,
      returnDate: dates.returnDate,
      status: isPast ? 'taken' : 'scheduled',
      diasDireito,
      vendeuFerias,
      diasVendidos: sold,
      isHistorical: isPast ? addHistoricalConfirmed : false,
      historicalReason: isPast ? (addHistoricalReason || undefined) : undefined,
    });

    setShowAddModal(false);
    setSelectedEmployeeId('');
    setStartDate('');
    setDiasDireito(30);
    setVendeuFerias(false);
    setDiasVendidos(0);
    setAddHistoricalConfirmed(false);
    setAddHistoricalReason('');
  };

  // ── Loading skeleton mientras no hay datos ───────────────────────────────
  if (!vacationStatsProp) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 rounded-3xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 rounded-3xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {employeesMissingAdmission.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-700" />
          </div>
          <div>
            <p className="text-sm font-black text-orange-900">Colaboradores sem data de admissão</p>
            <p className="text-sm text-orange-800 mt-1">{employeesMissingAdmission.length} colaborador(es) precisam de data de admissão para cálculo correto dos períodos aquisitivo e concessivo.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center"><Umbrella className="w-5 h-5 text-emerald-700" /></div><div><p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Em férias agora</p><p className="text-3xl font-black text-emerald-900">{countNow}</p></div></div>
        </div>
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center"><CalendarClock className="w-5 h-5 text-blue-700" /></div><div><p className="text-[11px] font-black uppercase tracking-wider text-blue-600">Agendadas</p><p className="text-3xl font-black text-blue-900">{countScheduled}</p></div></div>
        </div>
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center"><Clock3 className="w-5 h-5 text-red-700" /></div><div><p className="text-[11px] font-black uppercase tracking-wider text-red-600">Prioridade</p><p className="text-3xl font-black text-red-900">{countUrgent}</p></div></div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900">Gestão de Férias</h2>
            <p className="text-sm text-gray-500 mt-0.5">Cadastre, edite e acompanhe o status das férias com validação histórica.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar colaborador..." className={`${inputCls} sm:w-72`} />
            <button type="button" onClick={() => setShowAddModal(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 text-white px-4 py-3 text-sm font-black shadow-md shadow-blue-700/20 hover:bg-blue-600 transition-colors">
              <Plus className="w-4 h-4" />
              Nova Férias
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          <AnimatePresence>
            {filteredStats.length > 0 ? filteredStats.map(stat => (
              <motion.div key={stat.employeeId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-gray-900 truncate">{stat.employeeName}</h3>
                      <StatusChip status={stat.status} />
                      <HistoricalBadge vacation={stat.currentVacation} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1.5"><Briefcase className="w-4 h-4" />{stat.cargo || 'Sem cargo'}</span>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />Admissão: {fmtDate(stat.admissionDate)}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="w-4 h-4" />Período: {stat.numeroPeriodo || '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button type="button" onClick={() => handleEditClick(stat)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-black text-gray-700 hover:bg-gray-50 transition-colors"><Pencil className="w-4 h-4" />Editar</button>
                    {stat.currentVacation && (
                      <button type="button" onClick={() => handleDeleteVacation(stat.currentVacation!.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" />Excluir</button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-4">
                  <DetailCell label="Início Férias" value={fmtDate(stat.currentVacation?.startDate)} />
                  <DetailCell label="Fim Férias" value={fmtDate(stat.currentVacation?.endDate)} />
                  <DetailCell label="Retorno" value={fmtDate(stat.currentVacation?.returnDate)} />
                  <DetailCell label="Dias Direito" value={stat.currentVacation?.diasDireito ?? '30'} />
                  <DetailCell label="Dias Vendidos" value={stat.currentVacation?.diasVendidos ?? '0'} />
                  <DetailCell label="Dias p/ vencer" value={stat.diasParaVencer} />
                </div>
              </motion.div>
            )) : (
              <div className="p-8 text-center text-sm text-gray-500">Nenhum colaborador encontrado.</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <Modal title="Agendar Férias" onClose={() => { setShowAddModal(false); setAddHistoricalConfirmed(false); setAddHistoricalReason(''); }}>
            <form onSubmit={onAddSubmit} className="p-5 sm:p-6 space-y-4">
              <FormField label="Colaborador">
                <CustomDropdown
                  variant="light"
                  value={selectedEmployeeId}
                  onChange={(val) => setSelectedEmployeeId(val)}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...employees.map(emp => ({ value: emp.id, label: emp.name }))
                  ]}
                  label="Selecione..."
                />
              </FormField>

              <FormField label="Início das Férias">
                <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Dias de Direito">
                  <input type="number" required min={1} max={30} value={diasDireito} onChange={e => setDiasDireito(Number(e.target.value))} className={inputCls} />
                </FormField>
                <FormField label="Vendeu Férias?">
                  <CustomDropdown
                    variant="light"
                    value={vendeuFerias ? 'sim' : 'nao'}
                    onChange={(val) => {
                      setVendeuFerias(val === 'sim');
                      if (val === 'nao') setDiasVendidos(0);
                    }}
                    options={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]}
                  />
                </FormField>
              </div>

              {vendeuFerias && (
                <FormField label="Dias Vendidos (máx. 10)">
                  <input type="number" required min={1} max={10} value={diasVendidos} onChange={e => setDiasVendidos(Number(e.target.value))} className={inputCls} />
                </FormField>
              )}

              <PreviewBlock preview={preview} vendeuFerias={vendeuFerias} diasVendidos={diasVendidos} />
              <HistoricalWarning
                preview={preview}
                enabled={addHistoricalConfirmed}
                reason={addHistoricalReason}
                onEnable={(v) => {
                  setAddHistoricalConfirmed(v);
                  if (!v) setAddHistoricalReason('');
                }}
                onReasonChange={setAddHistoricalReason}
              />

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-700 text-white text-sm font-black hover:bg-blue-600 transition-colors shadow-md shadow-blue-700/20">Salvar</button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && editingStat && (
          <Modal title="Editar Informações" subtitle={editingStat.employeeName} onClose={() => { setShowEditModal(false); setEditingStat(null); }}>
            <form onSubmit={onEditSubmit} className="p-5 sm:p-6 space-y-4">
              <FormField label="Data de Admissão">
                <input type="date" required value={editAdmissionDate} onChange={e => setEditAdmissionDate(e.target.value)} className={inputCls} />
              </FormField>

              <FormField label="Início das Férias">
                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className={inputCls} />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Dias de Direito">
                  <input type="number" required min={1} max={30} value={editDiasDireito} onChange={e => setEditDiasDireito(Number(e.target.value))} className={inputCls} />
                </FormField>
                <FormField label="Vendeu Férias?">
                  <CustomDropdown
                    variant="light"
                    value={editVendeuFerias ? 'sim' : 'nao'}
                    onChange={(val) => {
                      setEditVendeuFerias(val === 'sim');
                      if (val === 'nao') setEditDiasVendidos(0);
                    }}
                    options={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]}
                  />
                </FormField>
              </div>

              {editVendeuFerias && (
                <FormField label="Dias Vendidos (máx. 10)">
                  <input type="number" required min={1} max={10} value={editDiasVendidos} onChange={e => setEditDiasVendidos(Number(e.target.value))} className={inputCls} />
                </FormField>
              )}

              <PreviewBlock preview={editPreview} vendeuFerias={editVendeuFerias} diasVendidos={editDiasVendidos} />
              <HistoricalWarning
                preview={editPreview}
                enabled={editHistoricalConfirmed}
                reason={editHistoricalReason}
                onEnable={(v) => {
                  setEditHistoricalConfirmed(v);
                  if (!v) setEditHistoricalReason('');
                }}
                onReasonChange={setEditHistoricalReason}
              />

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStat(null); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-black text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-700 text-white text-sm font-black hover:bg-blue-600 transition-colors shadow-md shadow-blue-700/20">Salvar Alterações</button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
