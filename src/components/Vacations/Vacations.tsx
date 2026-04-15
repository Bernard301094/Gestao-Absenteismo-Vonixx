import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Search,
  User,
  Info,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from 'lucide-react';
import type { Employee, Vacation, VacationStats } from '../../types';
import { useVacationStats, calcVacationDates } from '../../hooks/useVacationStats';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface VacationsProps {
  employees: Employee[];
  vacations: Vacation[];
  handleAddVacation: (vacation: Omit<Vacation, 'id'>) => Promise<void>;
  handleDeleteVacation: (id: string) => Promise<void>;
}

// ─── Formatação ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso || iso.length < 10) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Badge de Status ───────────────────────────────────────────────────────────

function StatusBadge({ stat }: { stat: VacationStats }) {
  switch (stat.status) {
    case 'em_ferias_agora':
      return (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Em Férias AGORA
          </span>
          {stat.diasRestantes !== undefined && (
            <span className="text-[10px] text-blue-600 font-medium ml-1">
              Volta em {stat.diasRestantes} dia{stat.diasRestantes !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      );
    case 'ferias_agendadas':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Agendada
        </span>
      );
    case 'critico_vencido':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          Crítico / Vencido
        </span>
      );
    case 'agendar_em_breve':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          Agendar em breve
        </span>
      );
    case 'em_per_aquisitivo':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
          <CalendarDays className="w-3 h-3" />
          Per. Aquisitivo
        </span>
      );
    case 'ferias_concluidas':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
          <CheckCircle2 className="w-3 h-3" />
          Concluídas
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-400 border border-gray-200">
          Aguardando dados
        </span>
      );
  }
}

// ─── Linha Expansível da Tabela ────────────────────────────────────────────────

function EmployeeRow({
  stat,
  onDelete,
}: {
  stat: VacationStats;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const urgencyColor =
    stat.diasParaVencer < 0
      ? 'text-red-600'
      : stat.diasParaVencer < 30
      ? 'text-red-500'
      : stat.diasParaVencer < 60
      ? 'text-amber-600'
      : 'text-gray-700';

  return (
    <>
      <motion.tr
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Funcionário */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 uppercase block">
                {stat.employeeName}
              </span>
              <span className="text-[10px] text-gray-400">
                Admissão: {fmtDate(stat.admissionDate)}
              </span>
            </div>
          </div>
        </td>

        {/* Período Aquisitivo */}
        <td className="px-6 py-4 hidden md:table-cell">
          {stat.inicioAquisitivo ? (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{fmtDate(stat.inicioAquisitivo)}</span>
              {' → '}
              <span className="font-medium text-gray-700">{fmtDate(stat.fimAquisitivo)}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>

        {/* Data Limite Concessão */}
        <td className="px-6 py-4">
          {stat.dataLimiteConcessao ? (
            <div className="flex flex-col">
              <span className={`text-xs font-bold ${urgencyColor}`}>
                {fmtDate(stat.dataLimiteConcessao)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                {stat.diasParaVencer < 0
                  ? `Vencido há ${Math.abs(stat.diasParaVencer)} dias`
                  : stat.status === 'em_per_aquisitivo'
                  ? 'Período aquisitivo'
                  : `Faltam ${stat.diasParaVencer} dias`}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>

        {/* Status */}
        <td className="px-6 py-4">
          <StatusBadge stat={stat} />
        </td>

        {/* Ações */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-1">
            {stat.currentVacation && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDelete(stat.currentVacation!.id);
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Cancelar Agendamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                setExpanded(v => !v);
              }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Ver detalhes"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </td>
      </motion.tr>

      {/* Linha de detalhes expansível */}
      <AnimatePresence>
        {expanded && (
          <motion.tr
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <td colSpan={5} className="px-6 pb-4 pt-0 bg-gray-50/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                <DetailCell
                  label="Início Aquisitivo"
                  value={fmtDate(stat.inicioAquisitivo)}
                />
                <DetailCell
                  label="Fim Aquisitivo"
                  value={fmtDate(stat.fimAquisitivo)}
                />
                <DetailCell
                  label="Fim Concessivo"
                  value={fmtDate(stat.fimConcessivo)}
                />
                <DetailCell
                  label="Limite p/ Iniciar"
                  value={fmtDate(stat.dataLimiteConcessao)}
                  highlight={stat.diasParaVencer < 60}
                />
                {stat.currentVacation && (
                  <>
                    <DetailCell
                      label="Início Férias"
                      value={fmtDate(stat.currentVacation.startDate)}
                    />
                    <DetailCell
                      label="Fim Férias"
                      value={fmtDate(stat.currentVacation.endDate)}
                    />
                    <DetailCell
                      label="Retorno"
                      value={fmtDate(stat.currentVacation.returnDate ?? '')}
                    />
                    <DetailCell
                      label="Dias a Gozar"
                      value={String(
                        (stat.currentVacation.diasDireito ?? 30) -
                          (stat.currentVacation.diasVendidos ?? 0),
                      )}
                    />
                    {stat.currentVacation.vendeuFerias && (
                      <DetailCell
                        label="Dias Vendidos"
                        value={String(stat.currentVacation.diasVendidos ?? 0)}
                      />
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

function DetailCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 border ${
        highlight
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-100'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
      <p
        className={`text-xs font-bold mt-0.5 ${
          highlight ? 'text-amber-700' : 'text-gray-700'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Vacations({
  employees,
  vacations,
  handleAddVacation,
  handleDeleteVacation,
}: VacationsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulário
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [diasDireito, setDiasDireito] = useState(30);
  const [vendeuFerias, setVendeuFerias] = useState(false);
  const [diasVendidos, setDiasVendidos] = useState(0);

  // ── Cálculo CLT via hook ──────────────────────────────────────────────────
  const vacationStats = useVacationStats(employees, vacations);

  // Preview de datas no modal
  const preview = useMemo(() => {
    if (!startDate) return null;
    return calcVacationDates(startDate, diasDireito, vendeuFerias ? diasVendidos : 0);
  }, [startDate, diasDireito, vendeuFerias, diasVendidos]);

  // ── Filtros e ordenação ───────────────────────────────────────────────────
  const priorityOrder: Record<string, number> = {
    critico_vencido: 1,
    agendar_em_breve: 2,
    em_ferias_agora: 3,
    ferias_agendadas: 4,
    em_per_aquisitivo: 5,
    ferias_concluidas: 6,
    aguardando_dados: 7,
  };

  const filteredStats = useMemo(
    () =>
      vacationStats
        .filter(s =>
          s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .sort((a, b) => {
          const pa = priorityOrder[a.status] ?? 99;
          const pb = priorityOrder[b.status] ?? 99;
          if (pa !== pb) return pa - pb;
          return a.diasParaVencer - b.diasParaVencer;
        }),
    [vacationStats, searchTerm],
  );

  // ── Counters para cards ───────────────────────────────────────────────────
  const countNow = vacationStats.filter(s => s.status === 'em_ferias_agora').length;
  const countScheduled = vacationStats.filter(s => s.status === 'ferias_agendadas').length;
  const countUrgent = vacationStats.filter(
    s => s.diasParaVencer < 60 && !['em_ferias_agora', 'em_per_aquisitivo', 'aguardando_dados'].includes(s.status),
  ).length;

  const employeesMissingAdmission = employees.filter(
    e => !e.admissionDate || e.admissionDate.length < 10,
  );

  // ── Submissão ─────────────────────────────────────────────────────────────
  const onAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !startDate) return;

    const sold = vendeuFerias ? diasVendidos : 0;
    const dates = calcVacationDates(startDate, diasDireito, sold);

    await handleAddVacation({
      employeeId: selectedEmployeeId,
      startDate: dates.startDate,
      endDate: dates.endDate,
      returnDate: dates.returnDate,
      status: 'scheduled',
      diasDireito,
      vendeuFerias,
      diasVendidos: sold,
    });

    setShowAddModal(false);
    setSelectedEmployeeId('');
    setStartDate('');
    setDiasDireito(30);
    setVendeuFerias(false);
    setDiasVendidos(0);
  };

  return (
    <div className="space-y-6">
      {/* Alerta: dados faltando */}
      {employeesMissingAdmission.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">{employeesMissingAdmission.length} funcionário(s)</span>{' '}
            estão com a data de admissão incompleta ou inválida e não aparecem nesta lista. Atualize
            o cadastro deles na aba <strong>Registro</strong>.
          </div>
        </motion.div>
      )}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          delay={0}
          color="blue"
          icon={<Calendar className="w-6 h-6" />}
          label="Em Férias Agora"
          value={countNow}
        />
        <SummaryCard
          delay={0.1}
          color="emerald"
          icon={<Clock className="w-6 h-6" />}
          label="Agendadas"
          value={countScheduled}
        />
        <SummaryCard
          delay={0.2}
          color="amber"
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Prazos Próximos"
          value={countUrgent}
        />
      </div>

      {/* Tabela principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar funcionário..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Agendar Férias
          </button>
        </div>

        {/* Legenda de linhas expansíveis */}
        <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
          <Info className="w-3 h-3" />
          Clique em uma linha para ver os detalhes do período CLT
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Funcionário
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">
                  Período Aquisitivo
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Limite Concessão
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredStats.map(stat => (
                  <EmployeeRow
                    key={stat.employeeId}
                    stat={stat}
                    onDelete={handleDeleteVacation}
                  />
                ))}
                {filteredStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Agendar Férias */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Agendar Férias</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={onAddSubmit} className="p-6 space-y-4">
                {/* Funcionário */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Funcionário
                  </label>
                  <select
                    required
                    value={selectedEmployeeId}
                    onChange={e => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none uppercase text-sm"
                  >
                    <option value="">Selecione...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Início */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Início das Férias
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                {/* Dias direito + vendeu */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Dias de Direito
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={diasDireito}
                      onChange={e => setDiasDireito(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Vendeu Férias?
                    </label>
                    <select
                      value={vendeuFerias ? 'sim' : 'nao'}
                      onChange={e => {
                        setVendeuFerias(e.target.value === 'sim');
                        if (e.target.value === 'nao') setDiasVendidos(0);
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                </div>

                {/* Dias vendidos */}
                {vendeuFerias && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Dias Vendidos (máx. 10)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={diasVendidos}
                      onChange={e => setDiasVendidos(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                )}

                {/* Preview calculado */}
                {preview && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
                    <p className="text-xs font-black text-blue-700 uppercase tracking-wider">
                      Cálculo Automático CLT
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <PreviewItem label="Dias a Gozar" value={`${preview.diasAGozar} dias`} />
                      <PreviewItem label="Fim das Férias" value={fmtDate(preview.endDate)} />
                      <PreviewItem label="Data de Retorno" value={fmtDate(preview.returnDate)} />
                      {vendeuFerias && (
                        <PreviewItem label="Dias Vendidos" value={`${diasVendidos} dias`} />
                      )}
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                  >
                    Agendar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-componentes menores ───────────────────────────────────────────────────

function SummaryCard({
  delay,
  color,
  icon,
  label,
  value,
}: {
  delay: number;
  color: 'blue' | 'emerald' | 'amber';
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-black text-gray-900">{value}</p>
      </div>
    </motion.div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-blue-500 font-bold uppercase">{label}</p>
      <p className="text-xs font-bold text-blue-800">{value}</p>
    </div>
  );
}