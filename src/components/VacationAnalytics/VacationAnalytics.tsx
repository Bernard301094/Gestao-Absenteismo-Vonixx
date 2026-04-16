import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle, History,
  TrendingUp, AlertCircle, Calendar, BarChart3, Filter, Layers,
  ShieldAlert, ChevronRight, Users, Wallet,
} from 'lucide-react';
import { VacationStats, VacationStatusType, Vacation, Employee } from '../../types';

const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface VacationAnalyticsProps {
  vacationStats: VacationStats[];
  vacationMonthlyBreakdown: Record<number, number[]>;
  vacationLiability: number;
  vacationOverlapAlerts: string[];
  vacationHeatmap: Record<string, number>;
  currentShift: string;
  allVacations: Vacation[];
  allEmployees: Employee[];
}

// ─── Custom Chart Tooltip ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-xl shadow-gray-200/50">
      <p className="text-xs font-black text-gray-900 mb-2 uppercase tracking-wider">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs text-gray-600">
          {p.dataKey}:{' '}
          <span className="font-black" style={{ color: p.fill }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function fmtDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accentClass }: {
  label: string; value: number | string; sub: string; accentClass: string;
}) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-default group`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentClass} rounded-t-2xl`} />
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 leading-none mt-1.5 tabular-nums">{value}</p>
      <p className="text-[10px] text-gray-400 mt-1 font-medium">{sub}</p>
    </div>
  );
}

// ─── Collapsible Section ───────────────────────────────────────────────────────
function Section({
  id, expanded, onToggle, title, icon, iconBg, count, accentClass, children,
}: {
  id: string; expanded: string | null; onToggle: (id: string) => void;
  title: string; icon: React.ReactNode; iconBg: string;
  count: number | null; accentClass?: string; children: React.ReactNode;
}) {
  const isOpen = expanded === id;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors border-b border-gray-100"
        onClick={() => onToggle(id)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg} shrink-0`}>
            {icon}
          </div>
          <span className="text-sm font-black text-gray-900 text-left">{title}</span>
          {count !== null && (
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${count > 0 ? (accentClass || 'bg-blue-100 text-blue-700') : 'bg-gray-100 text-gray-400'}`}>
              {count}
            </span>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-250 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

// ─── Table Wrapper ─────────────────────────────────────────────────────────────
function DataTable({ children, maxHeight }: { children: React.ReactNode; maxHeight?: boolean }) {
  return (
    <div className={`overflow-x-auto ${maxHeight ? 'max-h-[360px] overflow-y-auto' : ''}`}>
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  );
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100 whitespace-nowrap ${center ? 'text-center' : ''}`}>
      {children}
    </th>
  );
}

function Td({ children, mono, center, muted, accent }: {
  children?: React.ReactNode; mono?: boolean; center?: boolean; muted?: boolean; accent?: boolean;
}) {
  return (
    <td className={[
      'px-4 py-3 text-xs border-b border-gray-50',
      mono    ? 'font-mono'         : '',
      center  ? 'text-center'       : '',
      muted   ? 'text-gray-400'     : 'text-gray-700',
      accent  ? 'font-black text-blue-700' : '',
    ].join(' ')}>
      {children}
    </td>
  );
}

// ─── Inline Badge ─────────────────────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode; color: 'blue' | 'green' | 'amber' | 'red' | 'orange' }) {
  const cls: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700 border-blue-200',
    green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber:  'bg-amber-100 text-amber-700 border-amber-200',
    red:    'bg-red-100 text-red-700 border-red-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${cls[color]}`}>
      {children}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VacationAnalytics({
  vacationStats: rawVacationStats,
  vacationMonthlyBreakdown,
  vacationLiability,
  vacationOverlapAlerts,
  vacationHeatmap,
  currentShift,
  allVacations,
  allEmployees,
}: VacationAnalyticsProps) {
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [expandedSection, setExpandedSection] = React.useState<string | null>('current');

  const roles = useMemo(
    () => Array.from(new Set(rawVacationStats.map(s => s.cargo).filter(Boolean))).sort(),
    [rawVacationStats],
  );

  const vacationStats = useMemo(
    () => roleFilter === 'all' ? rawVacationStats : rawVacationStats.filter(s => s.cargo === roleFilter),
    [rawVacationStats, roleFilter],
  );

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:         vacationStats.length,
    em_ferias:     vacationStats.filter(s => s.status === 'em_ferias_agora').length,
    concluidas:    vacationStats.filter(s => s.status === 'ferias_concluidas').length,
    agendadas:     vacationStats.filter(s => s.status === 'ferias_agendadas').length,
    agendar_breve: vacationStats.filter(s => s.status === 'agendar_em_breve').length,
    criticos:      vacationStats.filter(s => s.status === 'critico_vencido').length,
    em_aquisitivo: vacationStats.filter(s => s.status === 'em_per_aquisitivo').length,
    aguardando:    vacationStats.filter(s => s.status === 'aguardando_dados').length,
  }), [vacationStats]);

  // ─── Heatmap ─────────────────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, m) => {
      const days: { day: number; count: number; key: string }[] = [];
      const date = new Date(year, m, 1);
      while (date.getMonth() === m) {
        const key = date.toISOString().split('T')[0];
        days.push({ day: date.getDate(), count: vacationHeatmap[key] || 0, key });
        date.setDate(date.getDate() + 1);
      }
      return { name: MONTH_NAMES_SHORT[m], days };
    });
  }, [vacationHeatmap]);

  const maxHeatmapCount = useMemo(
    () => Math.max(1, ...heatmapData.flatMap(m => m.days.map(d => d.count))),
    [heatmapData],
  );

  const heatColor = (count: number) => {
    if (count === 0) return 'rgba(219,234,254,0.25)'; // blue-100 faint
    const r = count / maxHeatmapCount;
    if (r < 0.25) return 'rgba(59,130,246,0.25)';
    if (r < 0.5)  return 'rgba(59,130,246,0.5)';
    if (r < 0.75) return 'rgba(29,78,216,0.7)';
    return 'rgba(29,78,216,1)';
  };

  // ─── Chart Data ───────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    MONTH_NAMES_SHORT.map((month, i) => {
      const entry: any = { name: month };
      Object.entries(vacationMonthlyBreakdown).forEach(([year, counts]) => { entry[year] = counts[i]; });
      return entry;
    }),
    [vacationMonthlyBreakdown],
  );

  // ─── Tables ───────────────────────────────────────────────────────────────
  const emFeriasAgora = useMemo(() => vacationStats.filter(s => s.status === 'em_ferias_agora'), [vacationStats]);

  const historicoConcluido = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const taken = allVacations.filter(v => v.endDate && v.endDate < todayISO && (v.status === 'taken' || v.endDate < todayISO));
    const uniqueMap = new Map<string, any>();
    taken.forEach(v => {
      const emp = allEmployees.find(e => e.id === v.employeeId);
      const key = `${v.employeeId}_${v.startDate}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          id: v.id, employeeId: v.employeeId,
          employeeName: emp?.name || 'Desconhecido',
          cargo: emp?.role || '—',
          dataInicioFerias: v.startDate,
          dataFimFerias: v.endDate,
          numeroPeriodo: emp?.admissionDate
            ? Math.floor((new Date(v.startDate + 'T12:00:00').getTime() - new Date(emp.admissionDate + 'T12:00:00').getTime()) / (1000*60*60*24*365.25)) + 1
            : '?',
        });
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => b.dataInicioFerias.localeCompare(a.dataInicioFerias));
  }, [allVacations, allEmployees]);

  const previsaoProximas = useMemo(() =>
    vacationStats
      .filter(s => s.status === 'ferias_agendadas' || s.status === 'agendado_sem_admissao')
      .sort((a, b) => (a.dataInicioFerias || '9999').localeCompare(b.dataInicioFerias || '9999')),
    [vacationStats],
  );

  const alertasCriticos = useMemo(() => vacationStats.filter(s => s.status === 'critico_vencido'), [vacationStats]);

  const toggle = (key: string) => setExpandedSection(prev => prev === key ? null : key);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-2xl overflow-hidden shadow-xl shadow-blue-900/30 px-5 sm:px-7 py-5">
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight">Análise de Férias · Turno {currentShift}</h1>
              <p className="text-blue-200/60 text-xs font-medium mt-0.5">
                Atualizado em {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}
              </p>
            </div>
          </div>

          {/* Role filter */}
          {roles.length > 0 && (
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2 self-start sm:self-auto">
              <Filter className="w-3.5 h-3.5 text-blue-200/60" />
              <span className="text-[9px] font-black text-blue-200/50 uppercase tracking-widest">Cargo</span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-xs font-semibold cursor-pointer [&>option]:bg-blue-900 [&>option]:text-white"
              >
                <option value="all">Todos</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-9 gap-2.5">
        {[
          { label:'Total',           value: kpis.total,         sub:'colaboradores', acc:'bg-gray-400'     },
          { label:'Em Férias',       value: kpis.em_ferias,     sub:'agora',         acc:'bg-orange-500'   },
          { label:'Concluídas',      value: kpis.concluidas,    sub:'no ciclo',      acc:'bg-emerald-500'  },
          { label:'Agendadas',       value: kpis.agendadas,     sub:'previstas',     acc:'bg-blue-600'     },
          { label:'Agendar Breve',   value: kpis.agendar_breve, sub:'atenção',       acc:'bg-amber-500'    },
          { label:'Críticos',        value: kpis.criticos,      sub:'vencidos',      acc:'bg-red-600'      },
          { label:'Aquisitivo',      value: kpis.em_aquisitivo, sub:'período',       acc:'bg-cyan-500'     },
          { label:'Aguardando',      value: kpis.aguardando,    sub:'dados',         acc:'bg-slate-400'    },
          { label:'Passivo (dias)',  value: vacationLiability,  sub:'acumulados',    acc:'bg-purple-600'   },
        ].map(({ label, value, sub, acc }) => (
          <KpiCard key={label} label={label} value={value} sub={sub} accentClass={acc} />
        ))}
      </div>

      {/* ── Overlap Alerts ────────────────────────────────────────────────── */}
      {vacationOverlapAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-2xl p-4 flex gap-3 items-start">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
          </div>
          <div>
            <p className="text-xs font-black text-red-800 uppercase tracking-wider mb-1.5">⚠ Alerta de Cobertura Crítica</p>
            {vacationOverlapAlerts.map((a, i) => (
              <p key={i} className="text-xs text-red-700 mt-1">· {a}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Heatmap ───────────────────────────────────────────────────────── */}
      <Section id="heatmap" expanded={expandedSection} onToggle={toggle}
        title="Mapa de Calor · Ocupação Diária" icon={<Layers className="w-4 h-4 text-blue-600" />}
        iconBg="bg-blue-100" count={null}>
        <div className="p-5 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {heatmapData.map(month => (
              <div key={month.name} className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center mb-1">
                  {month.name}
                </span>
                <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {month.days.map(d => (
                    <div
                      key={d.key}
                      title={`${d.key}: ${d.count} em férias`}
                      className="w-3 h-3 rounded-[3px] transition-transform hover:scale-150 cursor-default"
                      style={{ background: heatColor(d.count) }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {[
              { color: 'rgba(219,234,254,0.35)', label: '0' },
              { color: 'rgba(59,130,246,0.25)',  label: 'Baixo' },
              { color: 'rgba(59,130,246,0.55)',  label: 'Médio' },
              { color: 'rgba(29,78,216,1)',       label: 'Alto'  },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: color, border: '1px solid rgba(0,0,0,0.06)' }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Em Férias Agora ───────────────────────────────────────────────── */}
      <Section id="current" expanded={expandedSection} onToggle={toggle}
        title="Em Férias Agora" icon={<TrendingUp className="w-4 h-4 text-orange-500" />}
        iconBg="bg-orange-100" count={emFeriasAgora.length} accentClass="bg-orange-100 text-orange-700">
        <DataTable>
          <thead>
            <tr>
              <Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Início</Th><Th>Fim</Th><Th center>Dias Rest.</Th>
            </tr>
          </thead>
          <tbody>
            {emFeriasAgora.length > 0 ? emFeriasAgora.map((s, i) => (
              <tr key={s.employeeId} className="hover:bg-gray-50 transition-colors">
                <Td muted mono>{i + 1}</Td>
                <Td><span className="font-black text-gray-900 uppercase text-[12px]">{s.employeeName}</span></Td>
                <Td><Badge color="orange">{s.cargo}</Badge></Td>
                <Td mono>{fmtDate(s.dataInicioFerias)}</Td>
                <Td mono>{fmtDate(s.dataFimFerias)}</Td>
                <Td center><Badge color="amber">{s.diasRestantes}d</Badge></Td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400 italic">Ninguém em férias no momento</td></tr>
            )}
          </tbody>
        </DataTable>
      </Section>

      {/* ── Histórico ─────────────────────────────────────────────────────── */}
      <Section id="history" expanded={expandedSection} onToggle={toggle}
        title="Histórico — Ciclos Concluídos" icon={<History className="w-4 h-4 text-emerald-600" />}
        iconBg="bg-emerald-100" count={historicoConcluido.length} accentClass="bg-emerald-100 text-emerald-700">
        <DataTable maxHeight>
          <thead>
            <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Início Férias</Th><Th>Fim Férias</Th><Th center>Período</Th></tr>
          </thead>
          <tbody>
            {historicoConcluido.length > 0 ? historicoConcluido.map((s, i) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <Td muted mono>{i + 1}</Td>
                <Td><span className="font-black text-gray-900 uppercase text-[12px]">{s.employeeName}</span></Td>
                <Td><Badge color="green">{s.cargo}</Badge></Td>
                <Td mono>{fmtDate(s.dataInicioFerias)}</Td>
                <Td mono>{fmtDate(s.dataFimFerias || '')}</Td>
                <Td center><Badge color="blue">#{s.numeroPeriodo}</Badge></Td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400 italic">Nenhum histórico encontrado</td></tr>
            )}
          </tbody>
        </DataTable>
      </Section>

      {/* ── Previsão ──────────────────────────────────────────────────────── */}
      <Section id="forecast" expanded={expandedSection} onToggle={toggle}
        title="Previsão — Próximas Férias" icon={<CalendarDays className="w-4 h-4 text-blue-600" />}
        iconBg="bg-blue-100" count={previsaoProximas.length} accentClass="bg-blue-100 text-blue-700">
        <DataTable maxHeight>
          <thead>
            <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Início</Th><Th>Fim</Th><Th center>Dias</Th><Th>Vence em</Th></tr>
          </thead>
          <tbody>
            {previsaoProximas.length > 0 ? previsaoProximas.map((s, i) => (
              <tr key={s.employeeId} className="hover:bg-gray-50 transition-colors">
                <Td muted mono>{i + 1}</Td>
                <Td><span className="font-black text-gray-900 uppercase text-[12px]">{s.employeeName}</span></Td>
                <Td><Badge color="blue">{s.cargo}</Badge></Td>
                <Td><span className="font-black text-blue-700 font-mono text-xs">{fmtDate(s.dataInicioFerias)}</span></Td>
                <Td mono>{fmtDate(s.dataFimFerias)}</Td>
                <Td center><span className="font-black text-gray-700 font-mono text-xs">{s.diasAGozar}</span></Td>
                <Td muted mono>{s.diasParaVencer}d</Td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400 italic">Nenhuma previsão de férias</td></tr>
            )}
          </tbody>
        </DataTable>
      </Section>

      {/* ── Alertas Críticos ──────────────────────────────────────────────── */}
      <Section id="critical" expanded={expandedSection} onToggle={toggle}
        title="Alertas Críticos — Agendar Imediatamente" icon={<AlertCircle className="w-4 h-4 text-red-500" />}
        iconBg="bg-red-100" count={alertasCriticos.length} accentClass="bg-red-100 text-red-700">
        <DataTable>
          <thead>
            <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Fim Concessivo</Th><Th>Limite</Th><Th>Dias</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {alertasCriticos.length > 0 ? alertasCriticos.map((s, i) => (
              <tr key={s.employeeId} className="bg-red-50/30 hover:bg-red-50/60 transition-colors">
                <Td muted mono>{i + 1}</Td>
                <Td><span className="font-black text-red-700 uppercase text-[12px]">{s.employeeName}</span></Td>
                <Td><Badge color="red">{s.cargo}</Badge></Td>
                <Td mono><span className="text-red-500">{fmtDate(s.fimConcessivo)}</span></Td>
                <Td mono><span className="font-black text-red-600">{fmtDate(s.dataLimiteConcessao)}</span></Td>
                <Td><Badge color="red">{s.diasParaVencer}d</Badge></Td>
                <Td><Badge color="red">🔴 Crítico</Badge></Td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-emerald-500 italic">
                ✓ Nenhum alerta crítico no momento
              </td></tr>
            )}
          </tbody>
        </DataTable>
      </Section>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-black text-gray-900">Distribuição Mensal de Férias</span>
          </div>
          <div className="p-5" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tick={{ fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} tick={{ fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill:'#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize:11, color:'#64748b', paddingTop:12 }} />
                <Bar dataKey="2026" fill="#2563eb" radius={[4,4,0,0]} maxBarSize={22} />
                <Bar dataKey="2027" fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={22} />
                <Bar dataKey="2028" fill="#0891b2" radius={[4,4,0,0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-black text-gray-900">Férias por Mês / Ano</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-left">Ano</th>
                  {MONTH_NAMES_SHORT.map(m => (
                    <th key={m} className="px-1 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-8">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(vacationMonthlyBreakdown).map(([year, months]) => (
                  <tr key={year} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-[10px] font-black text-blue-700">{year}</td>
                    {months.map((count, i) => (
                      <td key={i} className="px-1 py-2 text-center">
                        <span className={`text-[11px] font-mono ${count > 0 ? 'font-black text-blue-600' : 'text-gray-200'}`}>
                          {count > 0 ? count : '·'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-4" />
    </div>
  );
}