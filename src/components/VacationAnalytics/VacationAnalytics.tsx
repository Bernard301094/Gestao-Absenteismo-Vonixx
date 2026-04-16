import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle, History,
  TrendingUp, AlertCircle, Calendar, BarChart3, Filter, Layers,
  ShieldAlert, ChevronRight, Users, Wallet, Bot, Loader2, Sparkles
} from 'lucide-react';
import { VacationStats, VacationStatusType, Vacation, Employee } from '../../types';
import { suggestVacationResolution } from '../../services/aiService';

const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTH_NAMES_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

import CustomDropdown from '../CustomDropdown';

interface VacationAnalyticsProps {
  vacationStats: VacationStats[];
  vacationMonthlyBreakdown: Record<number, number[]>;
  vacationLiability: number;
  vacationOverlapAlerts: string[];
  vacationHeatmap: Record<string, number>;
  currentShift: string;
  allVacations: Vacation[];
  allEmployees: Employee[];
  currentYear: number;
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
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-default group">
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
    <div className={`overflow-x-auto custom-scrollbar ${maxHeight ? 'max-h-[360px] overflow-y-auto' : ''}`}>
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

// ─── Badge ────────────────────────────────────────────────────────────────────
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

// ─── PREMIUM: Férias por Mês / Ano ────────────────────────────────────────────
const YEAR_PALETTE: Record<string, { bg: string; text: string; bar: string; badge: string }> = {
  '2025': { bg: 'rgba(124,58,237,0.08)',  text: '#6d28d9', bar: '#7c3aed', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  '2026': { bg: 'rgba(37,99,235,0.08)',   text: '#1d4ed8', bar: '#2563eb', badge: 'bg-blue-100 text-blue-700 border-blue-200'       },
  '2027': { bg: 'rgba(8,145,178,0.08)',   text: '#0e7490', bar: '#0891b2', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200'       },
  '2028': { bg: 'rgba(5,150,105,0.08)',   text: '#047857', bar: '#059669', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};
const FALLBACK_PALETTE = { bg: 'rgba(100,116,139,0.08)', text: '#475569', bar: '#64748b', badge: 'bg-slate-100 text-slate-600 border-slate-200' };

function getPalette(year: string) { return YEAR_PALETTE[year] ?? FALLBACK_PALETTE; }

function cellIntensity(count: number, max: number): string {
  if (count === 0 || max === 0) return 'transparent';
  const r = count / max;
  if (r < 0.2)  return 'rgba(37,99,235,0.12)';
  if (r < 0.4)  return 'rgba(37,99,235,0.26)';
  if (r < 0.6)  return 'rgba(37,99,235,0.44)';
  if (r < 0.8)  return 'rgba(37,99,235,0.65)';
  return 'rgba(37,99,235,0.90)';
}

function cellTextColor(count: number, max: number): string {
  if (count === 0) return '#d1d5db';
  const r = count / max;
  return r >= 0.6 ? '#ffffff' : '#1d4ed8';
}

function FeriasPorMesAno({ vacationMonthlyBreakdown }: { vacationMonthlyBreakdown: Record<number, number[]> }) {
  const [hoveredCell, setHoveredCell] = useState<{ year: string; month: number } | null>(null);

  const entries = Object.entries(vacationMonthlyBreakdown).sort(([a], [b]) => Number(a) - Number(b));

  const globalMax = useMemo(() => {
    let max = 1;
    entries.forEach(([, months]) => {
      (months as number[]).forEach(c => { if (c > max) max = c; });
    });
    return max;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-300">
        <Calendar className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-bold text-gray-400">Sem dados disponíveis</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ── Header premium ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Distribuição</p>
            <p className="text-xs font-black text-gray-800 leading-tight mt-0.5">Férias por Mês · Ano</p>
          </div>
        </div>
        {/* Leyenda de intensidad */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mr-1">Escala</span>
          {[0.12, 0.26, 0.44, 0.65, 0.90].map((o, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-[3px]"
              style={{ background: `rgba(37,99,235,${o})`, border: '1px solid rgba(0,0,0,0.06)' }}
            />
          ))}
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Max</span>
        </div>
      </div>

      {/* ── Desktop grid ── */}
      <div className="hidden sm:block overflow-x-auto custom-scrollbar px-5 pb-5">
        <div className="min-w-[460px]">
          {/* Cabecera meses */}
          <div className="grid mb-1" style={{ gridTemplateColumns: '52px repeat(12, 1fr) 52px' }}>
            <div />
            {MONTH_NAMES_SHORT.map(m => (
              <div key={m} className="text-center text-[9px] font-black text-gray-400 uppercase tracking-wider py-1">{m}</div>
            ))}
            <div className="text-center text-[9px] font-black text-gray-400 uppercase tracking-wider py-1">Total</div>
          </div>

          {/* Filas por año */}
          <div className="space-y-1.5">
            {entries.map(([year, months]) => {
              const palette = getPalette(year);
              const total = (months as number[]).reduce((a, b) => a + b, 0);
              const monthMax = Math.max(...(months as number[]), 1);

              return (
                <div
                  key={year}
                  className="grid items-center rounded-xl overflow-hidden transition-all duration-200 group/row"
                  style={{
                    gridTemplateColumns: '52px repeat(12, 1fr) 52px',
                    background: palette.bg,
                    border: `1px solid ${palette.bar}22`,
                  }}
                >
                  {/* Año label */}
                  <div className="flex items-center justify-center py-2.5">
                    <span
                      className="text-[11px] font-black tabular-nums"
                      style={{ color: palette.text }}
                    >
                      {year}
                    </span>
                  </div>

                  {/* Celdas de meses */}
                  {(months as number[]).map((count, i) => {
                    const isHovered = hoveredCell?.year === year && hoveredCell?.month === i;
                    const bg = cellIntensity(count, globalMax);
                    const textCol = cellTextColor(count, globalMax);

                    return (
                      <div
                        key={i}
                        className="relative flex items-center justify-center py-2 cursor-default transition-transform duration-150 hover:scale-110 hover:z-10"
                        onMouseEnter={() => setHoveredCell({ year, month: i })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className="w-full mx-[2px] rounded-md flex items-center justify-center transition-all duration-200"
                          style={{
                            background: bg,
                            border: count > 0 ? `1px solid ${palette.bar}33` : '1px solid transparent',
                            minHeight: 28,
                          }}
                        >
                          <span
                            className="text-[11px] font-black tabular-nums select-none"
                            style={{ color: count > 0 ? textCol : '#e5e7eb' }}
                          >
                            {count > 0 ? count : '·'}
                          </span>
                        </div>

                        {/* Tooltip flotante */}
                        {isHovered && count > 0 && (
                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                          >
                            <div className="bg-gray-900 text-white rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
                              <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{MONTH_NAMES_FULL[i]} {year}</p>
                              <p className="text-sm font-black tabular-nums" style={{ color: palette.bar === '#2563eb' ? '#93c5fd' : '#a5f3fc' }}>
                                {count} férias
                              </p>
                            </div>
                            <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Total anual */}
                  <div className="flex items-center justify-center py-2.5">
                    <span
                      className="text-[11px] font-black tabular-nums px-2 py-0.5 rounded-md"
                      style={{ color: palette.text, background: `${palette.bar}18` }}
                    >
                      {total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fila de totales por mes */}
          <div
            className="grid items-center mt-2 rounded-xl overflow-hidden"
            style={{ gridTemplateColumns: '52px repeat(12, 1fr) 52px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center justify-center py-2.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Σ</span>
            </div>
            {MONTH_NAMES_SHORT.map((_, i) => {
              const colTotal = entries.reduce((acc, [, months]) => acc + ((months as number[])[i] ?? 0), 0);
              return (
                <div key={i} className="flex items-center justify-center py-2.5">
                  <span className={`text-[11px] font-black tabular-nums ${colTotal > 0 ? 'text-slate-600' : 'text-gray-200'}`}>
                    {colTotal > 0 ? colTotal : '·'}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-center py-2.5">
              <span className="text-[11px] font-black text-slate-700 tabular-nums">
                {entries.reduce((acc, [, months]) => acc + (months as number[]).reduce((a, b) => a + b, 0), 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: cards por año ── */}
      <div className="sm:hidden px-4 pb-4 space-y-3">
        {entries.map(([year, months]) => {
          const palette = getPalette(year);
          const total = (months as number[]).reduce((a, b) => a + b, 0);
          const monthMax = Math.max(...(months as number[]), 1);

          return (
            <div
              key={year}
              className="rounded-2xl overflow-hidden"
              style={{ background: palette.bg, border: `1px solid ${palette.bar}22` }}
            >
              {/* Header del año */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: `1px solid ${palette.bar}22` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: palette.text }}>{year}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${palette.badge}`}
                  >
                    {total} férias
                  </span>
                </div>
                {/* Mini sparkline */}
                <div className="flex items-end gap-[2px] h-5">
                  {(months as number[]).map((c, i) => (
                    <div
                      key={i}
                      className="w-[4px] rounded-sm transition-all"
                      style={{
                        height: `${monthMax > 0 ? Math.max(2, (c / monthMax) * 100) : 2}%`,
                        background: c > 0 ? palette.bar : '#e5e7eb',
                        minHeight: 2,
                        maxHeight: 20,
                        opacity: c > 0 ? 0.85 : 0.4,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Grid 4 col de meses */}
              <div className="grid grid-cols-4 gap-1.5 p-3">
                {(months as number[]).map((count, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center rounded-xl py-2 px-1 transition-all"
                    style={{
                      background: count > 0 ? cellIntensity(count, globalMax) : 'rgba(0,0,0,0.03)',
                      border: count > 0 ? `1px solid ${palette.bar}33` : '1px solid transparent',
                    }}
                  >
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">{MONTH_NAMES_SHORT[i]}</span>
                    <span
                      className="text-sm font-black tabular-nums mt-0.5"
                      style={{ color: count > 0 ? cellTextColor(count, globalMax) : '#d1d5db' }}
                    >
                      {count > 0 ? count : '0'}
                    </span>
                    {count > 0 && (
                      <div
                        className="w-full mt-1.5 rounded-full overflow-hidden"
                        style={{ height: 3, background: `${palette.bar}22` }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / monthMax) * 100}%`,
                            background: palette.bar,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Responsive Heatmap ────────────────────────────────────────────────────────
function VacationHeatmap({
  heatmapData,
  maxCount,
  currentYear,
}: {
  heatmapData: { name: string; days: { day: number; count: number; key: string; weekday: number }[] }[];
  maxCount: number;
  currentYear: number;
}) {
  const heatColor = (count: number): string => {
    if (count === 0) return 'rgba(219,234,254,0.3)';
    const ratio = count / Math.max(1, maxCount);
    if (ratio < 0.25) return 'rgba(59,130,246,0.3)';
    if (ratio < 0.5)  return 'rgba(59,130,246,0.55)';
    if (ratio < 0.75) return 'rgba(29,78,216,0.75)';
    return 'rgba(29,78,216,1)';
  };

  return (
    <div className="p-5">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-3">
        {heatmapData.map(month => (
          <div key={month.name} className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
              {month.name}
            </span>
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['L','M','X','J','V','S','D'].map(d => (
                <div
                  key={d}
                  className="flex items-center justify-center text-[6px] font-bold text-gray-300"
                  style={{ height: 10 }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {Array.from({ length: month.days[0]?.weekday ?? 0 }).map((_, i) => (
                <div key={`sp-${i}`} className="aspect-square" />
              ))}
              {month.days.map(d => (
                <div
                  key={d.key}
                  title={`${d.key}: ${d.count} pessoa${d.count !== 1 ? 's' : ''} em férias`}
                  className="rounded-[2px] transition-transform duration-150 hover:scale-[1.6] cursor-default"
                  style={{
                    background: heatColor(d.count),
                    aspectRatio: '1 / 1',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-5 flex-wrap">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
          {currentYear}
        </span>
        {[
          { color: 'rgba(219,234,254,0.35)', label: '0' },
          { color: 'rgba(59,130,246,0.3)',   label: 'Baixo' },
          { color: 'rgba(59,130,246,0.55)',  label: 'Médio' },
          { color: 'rgba(29,78,216,1)',       label: 'Alto'  },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
            <div
              className="w-2.5 h-2.5 rounded-[2px]"
              style={{ background: color, border: '1px solid rgba(0,0,0,0.07)' }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VacationAnalytics({
  vacationStats: rawVacationStats,
  vacationMonthlyBreakdown,
  vacationLiability,
  vacationOverlapAlerts,
  vacationHeatmap,
  currentShift,
  allVacations,
  allEmployees,
  currentYear,
}: VacationAnalyticsProps) {
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [expandedSection, setExpandedSection] = React.useState<string | null>('current');

  const [aiResolutions, setAiResolutions] = useState<Record<number, string>>({});
  const [isResolving, setIsResolving] = useState<Record<number, boolean>>({});

  const handleSuggestResolution = async (index: number, conflictText: string) => {
    setIsResolving(prev => ({ ...prev, [index]: true }));
    try {
      const resolution = await suggestVacationResolution(conflictText);
      setAiResolutions(prev => ({ ...prev, [index]: resolution }));
    } catch (error) {
      console.error(error);
      setAiResolutions(prev => ({ ...prev, [index]: 'Erro ao gerar sugestão. Verifique suas chaves de API.' }));
    } finally {
      setIsResolving(prev => ({ ...prev, [index]: false }));
    }
  };

  const roles = useMemo(
    () => Array.from(new Set(rawVacationStats.map(s => s.cargo).filter(Boolean))).sort(),
    [rawVacationStats],
  );

  const vacationStats = useMemo(
    () => roleFilter === 'all' ? rawVacationStats : rawVacationStats.filter(s => s.cargo === roleFilter),
    [rawVacationStats, roleFilter],
  );

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

  const heatmapData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const days: { day: number; count: number; key: string; weekday: number }[] = [];
      const date = new Date(currentYear, monthIndex, 1, 12, 0, 0);
      while (date.getMonth() === monthIndex) {
        const mm = String(monthIndex + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const key = `${currentYear}-${mm}-${dd}`;
        const rawWeekday = date.getDay();
        const weekday = rawWeekday === 0 ? 6 : rawWeekday - 1;
        days.push({ day: date.getDate(), count: vacationHeatmap[key] ?? 0, key, weekday });
        date.setDate(date.getDate() + 1);
      }
      return { name: MONTH_NAMES_SHORT[monthIndex], days };
    });
  }, [vacationHeatmap, currentYear]);

  const maxHeatmapCount = useMemo(
    () => Math.max(1, ...heatmapData.flatMap(m => m.days.map(d => d.count))),
    [heatmapData],
  );

  const chartData = useMemo(() =>
    MONTH_NAMES_SHORT.map((month, i) => {
      const entry: any = { name: month };
      Object.entries(vacationMonthlyBreakdown).forEach(([year, counts]) => { entry[year] = counts[i]; });
      return entry;
    }),
    [vacationMonthlyBreakdown],
  );

  const emFeriasAgora = useMemo(
    () => vacationStats.filter(s => s.status === 'em_ferias_agora'),
    [vacationStats],
  );

  const historicoConcluido = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const taken = allVacations.filter(v => v.endDate && v.endDate < todayISO);
    const uniqueMap = new Map<string, any>();
    taken.forEach(v => {
      const emp = allEmployees.find(e => e.id === v.employeeId);
      const key = `${v.employeeId}_${v.startDate}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          id: v.id,
          employeeId: v.employeeId,
          employeeName: emp?.name || 'Desconhecido',
          cargo: emp?.role || '—',
          dataInicioFerias: v.startDate,
          dataFimFerias: v.endDate,
          numeroPeriodo: emp?.admissionDate
            ? Math.floor(
                (new Date(v.startDate + 'T12:00:00').getTime() -
                  new Date(emp.admissionDate + 'T12:00:00').getTime()) /
                (1000 * 60 * 60 * 24 * 365.25),
              ) + 1
            : '?',
        });
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
      b.dataInicioFerias.localeCompare(a.dataInicioFerias),
    );
  }, [allVacations, allEmployees]);

  const previsaoProximas = useMemo(() =>
    vacationStats
      .filter(s => s.status === 'ferias_agendadas' || s.status === 'agendado_sem_admissao')
      .sort((a, b) => (a.dataInicioFerias || '9999').localeCompare(b.dataInicioFerias || '9999')),
    [vacationStats],
  );

  const alertasCriticos = useMemo(
    () => vacationStats.filter(s => s.status === 'critico_vencido'),
    [vacationStats],
  );

  const toggle = (key: string) => setExpandedSection(prev => (prev === key ? null : key));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-2xl shadow-xl shadow-blue-900/30 px-5 sm:px-7 py-5">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
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
              <h1 className="text-lg font-black text-white leading-tight">
                Análise de Férias · Turno {currentShift}
              </h1>
              <p className="text-blue-200/60 text-xs font-medium mt-0.5">
                Ano {currentYear} · Atualizado em{' '}
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          {roles.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto min-w-[140px]">
              <CustomDropdown
                value={roleFilter}
                onChange={(val) => setRoleFilter(val)}
                options={[
                  { value: 'all', label: 'Todos os Cargos' },
                  ...roles.map(r => ({ value: r, label: r }))
                ]}
                compact
                variant="header"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-2.5">
        {[
          { label: 'Total',          value: kpis.total,         sub: 'colaboradores', acc: 'bg-gray-400'   },
          { label: 'Em Férias',      value: kpis.em_ferias,     sub: 'agora',         acc: 'bg-orange-500' },
          { label: 'Concluídas',     value: kpis.concluidas,    sub: 'no ciclo',      acc: 'bg-emerald-500'},
          { label: 'Agendadas',      value: kpis.agendadas,     sub: 'previstas',     acc: 'bg-blue-600'   },
          { label: 'Agendar Breve',  value: kpis.agendar_breve, sub: 'atenção',       acc: 'bg-amber-500'  },
          { label: 'Críticos',       value: kpis.criticos,      sub: 'vencidos',      acc: 'bg-red-600'    },
          { label: 'Aquisitivo',     value: kpis.em_aquisitivo, sub: 'período',       acc: 'bg-cyan-500'   },
          { label: 'Aguardando',     value: kpis.aguardando,    sub: 'dados',         acc: 'bg-slate-400'  },
        ].map(({ label, value, sub, acc }) => (
          <KpiCard key={label} label={label} value={value} sub={sub} accentClass={acc} />
        ))}
      </div>

      {/* ── Alertas Críticos (Banner) ─────────────────────────────────────── */}
      {vacationOverlapAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-2xl p-4 flex gap-3 items-start">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-red-800 uppercase tracking-wider mb-1.5">
              ⚠ Alerta de Cobertura Crítica
            </p>
            <div className="space-y-3 mt-2">
              {vacationOverlapAlerts.map((a, i) => (
                <div key={i} className="bg-white/60 rounded-xl p-3 border border-red-100">
                  <p className="text-xs text-red-700 font-medium">· {a}</p>
                  <div className="mt-3">
                    {!aiResolutions[i] && (
                      <button
                        onClick={() => handleSuggestResolution(i, a)}
                        disabled={isResolving[i]}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
                      >
                        {isResolving[i] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                        Sugerir Resolução com IA
                      </button>
                    )}
                    {aiResolutions[i] && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 text-blue-800 mb-1.5">
                          <Bot className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Sugestão da IA</span>
                        </div>
                        <p className="text-xs text-blue-900 font-medium leading-relaxed whitespace-pre-wrap">
                          {aiResolutions[i]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Alertas Críticos — Listagem ─────────────────────────────────── */}
      <Section
        id="critical" expanded={expandedSection} onToggle={toggle}
        title="Alertas Críticos — Agendar Imediatamente"
        icon={<AlertCircle className="w-4 h-4 text-red-500" />}
        iconBg="bg-red-100" count={alertasCriticos.length} accentClass="bg-red-100 text-red-700"
      >
        <div className="hidden sm:block">
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
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-emerald-500 italic">
                    ✓ Nenhum alerta crítico no momento
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
        <div className="sm:hidden p-4 space-y-3 bg-red-50/10">
          {alertasCriticos.length > 0 ? alertasCriticos.map((s, i) => (
            <div key={s.employeeId} className="bg-white border border-red-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">#{i + 1}</span>
                  <span className="text-sm font-black text-gray-900 uppercase">{s.employeeName}</span>
                </div>
                <Badge color="red">{s.cargo}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Fim Concessivo</p>
                  <p className="text-gray-700 font-mono">{fmtDate(s.fimConcessivo)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Data Limite</p>
                  <p className="text-red-600 font-black font-mono">{fmtDate(s.dataLimiteConcessao)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Dias p/ Vencer</p>
                  <p className="text-red-700 font-black">{s.diasParaVencer}d</p>
                </div>
                <div className="flex items-end">
                  <Badge color="red">🔴 Crítico</Badge>
                </div>
              </div>
            </div>
          )) : (
            <p className="py-6 text-center text-xs text-emerald-500 italic bg-white rounded-xl border border-emerald-100">
              ✓ Nenhum alerta crítico no momento
            </p>
          )}
        </div>
      </Section>

      {/* ── Heatmap ───────────────────────────────────────────────────────── */}
      <Section
        id="heatmap" expanded={expandedSection} onToggle={toggle}
        title={`Mapa de Calor · Ocupação Diária ${currentYear}`}
        icon={<Layers className="w-4 h-4 text-blue-600" />}
        iconBg="bg-blue-100" count={null}
      >
        <VacationHeatmap
          heatmapData={heatmapData}
          maxCount={maxHeatmapCount}
          currentYear={currentYear}
        />
      </Section>

      {/* ── Em Férias Agora ───────────────────────────────────────────────── */}
      <Section
        id="current" expanded={expandedSection} onToggle={toggle}
        title="Em Férias Agora"
        icon={<TrendingUp className="w-4 h-4 text-orange-500" />}
        iconBg="bg-orange-100" count={emFeriasAgora.length} accentClass="bg-orange-100 text-orange-700"
      >
        <div className="hidden sm:block">
          <DataTable>
            <thead>
              <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Início</Th><Th>Fim</Th><Th>Progresso & Dias Restantes</Th></tr>
            </thead>
            <tbody>
              {emFeriasAgora.length > 0 ? emFeriasAgora.map((s, i) => {
                const totalDays = s.dataInicioFerias && s.dataFimFerias ? Math.round((new Date(s.dataFimFerias).getTime() - new Date(s.dataInicioFerias).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
                const remaining = Number(s.diasRestantes);
                const passed = totalDays - remaining;
                const percentage = totalDays > 0 ? Math.min(Math.max((passed / totalDays) * 100, 0), 100) : 0;
                return (
                  <tr key={s.employeeId} className="hover:bg-gray-50 transition-colors">
                    <Td muted mono>{i + 1}</Td>
                    <Td><span className="font-black text-gray-900 uppercase text-[12px]">{s.employeeName}</span></Td>
                    <Td><Badge color="orange">{s.cargo}</Badge></Td>
                    <Td mono>{fmtDate(s.dataInicioFerias)}</Td>
                    <Td mono>{fmtDate(s.dataFimFerias)}</Td>
                    <Td>
                      <div className="flex flex-col gap-1.5 w-48">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-orange-700">{remaining}d restantes</span>
                          <span className="text-gray-400">{passed}/{totalDays}d gozados</span>
                        </div>
                        <div className="h-2 w-full bg-orange-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </Td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400 italic">
                    Ninguém em férias no momento
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
        <div className="sm:hidden p-4 space-y-3 bg-gray-50/30">
          {emFeriasAgora.length > 0 ? emFeriasAgora.map((s, i) => {
            const totalDays = s.dataInicioFerias && s.dataFimFerias ? Math.round((new Date(s.dataFimFerias).getTime() - new Date(s.dataInicioFerias).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
            const remaining = Number(s.diasRestantes);
            const passed = totalDays - remaining;
            const percentage = totalDays > 0 ? Math.min(Math.max((passed / totalDays) * 100, 0), 100) : 0;
            return (
              <div key={s.employeeId} className="bg-white border border-orange-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">#{i + 1}</span>
                    <span className="text-sm font-black text-gray-900 uppercase">{s.employeeName}</span>
                  </div>
                  <Badge color="orange">{s.cargo}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] mb-4">
                  <div>
                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Início</p>
                    <p className="text-gray-700 font-mono">{fmtDate(s.dataInicioFerias)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Fim</p>
                    <p className="text-gray-700 font-mono">{fmtDate(s.dataFimFerias)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-wider">
                    <span className="text-orange-700">{remaining} dias restantes</span>
                    <span className="text-gray-400">{passed}/{totalDays} dias gozados</span>
                  </div>
                  <div className="h-2 w-full bg-orange-50 rounded-full overflow-hidden border border-orange-100/30">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          }) : (
            <p className="py-6 text-center text-xs text-gray-400 italic bg-white rounded-xl border border-gray-100">
              Ninguém em férias no momento
            </p>
          )}
        </div>
      </Section>

      {/* ── Previsão ──────────────────────────────────────────────────────── */}
      <Section
        id="forecast" expanded={expandedSection} onToggle={toggle}
        title="Previsão — Próximas Férias"
        icon={<CalendarDays className="w-4 h-4 text-blue-600" />}
        iconBg="bg-blue-100" count={previsaoProximas.length} accentClass="bg-blue-100 text-blue-700"
      >
        <div className="hidden sm:block">
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
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-400 italic">
                    Nenhuma previsão de férias
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
        <div className="sm:hidden p-4 space-y-3 bg-blue-50/10">
          {previsaoProximas.length > 0 ? previsaoProximas.map((s, i) => (
            <div key={s.employeeId} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">#{i + 1}</span>
                  <span className="text-sm font-black text-gray-900 uppercase">{s.employeeName}</span>
                </div>
                <Badge color="blue">{s.cargo}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Início</p>
                  <p className="text-blue-700 font-black font-mono">{fmtDate(s.dataInicioFerias)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Fim</p>
                  <p className="text-gray-700 font-mono">{fmtDate(s.dataFimFerias)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Dias a Gozar</p>
                  <p className="text-gray-900 font-black">{s.diasAGozar} dias</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Vence em</p>
                  <p className="text-gray-500 font-bold">{s.diasParaVencer}d</p>
                </div>
              </div>
            </div>
          )) : (
            <p className="py-6 text-center text-xs text-gray-400 italic bg-white rounded-xl border border-gray-100">
              Nenhuma previsão de férias
            </p>
          )}
        </div>
      </Section>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Gráfico de barras */}
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
                <XAxis dataKey="name" fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b', paddingTop: 12 }} />
                <Bar dataKey="2026" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="2027" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="2028" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── PREMIUM: Férias por Mês / Ano ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-200">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-black text-gray-900">Férias por Mês / Ano</span>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-none">Intensidade por volume · hover para detalhes</p>
            </div>
          </div>
          <FeriasPorMesAno vacationMonthlyBreakdown={vacationMonthlyBreakdown} />
        </div>
      </div>

      {/* ── Histórico ─────────────────────────────────────────────────────── */}
      <Section
        id="history" expanded={expandedSection} onToggle={toggle}
        title="Histórico — Ciclos Concluídos"
        icon={<History className="w-4 h-4 text-emerald-600" />}
        iconBg="bg-emerald-100" count={historicoConcluido.length} accentClass="bg-emerald-100 text-emerald-700"
      >
        <div className="hidden sm:block">
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
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400 italic">
                    Nenhum histórico encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
        <div className="sm:hidden p-4 space-y-3 bg-emerald-50/10">
          {historicoConcluido.length > 0 ? historicoConcluido.map((s, i) => (
            <div key={s.id} className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">#{i + 1}</span>
                  <span className="text-sm font-black text-gray-900 uppercase">{s.employeeName}</span>
                </div>
                <Badge color="green">{s.cargo}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Início</p>
                  <p className="text-gray-700 font-mono">{fmtDate(s.dataInicioFerias)}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Fim</p>
                  <p className="text-gray-700 font-mono">{fmtDate(s.dataFimFerias || '')}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-400 font-bold uppercase text-[9px]">Período Aquisitivo:</p>
                    <Badge color="blue">#{s.numeroPeriodo}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <p className="py-6 text-center text-xs text-gray-400 italic bg-white rounded-xl border border-gray-100">
              Nenhum histórico encontrado
            </p>
          )}
        </div>
      </Section>

      <div className="h-4" />
    </div>
  );
}
