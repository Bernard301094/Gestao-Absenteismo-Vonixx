import React, { useMemo, useState, useEffect } from 'react';
import {
  CalendarDays, History,
  TrendingUp, AlertCircle,
  ShieldAlert, ChevronRight, Bot, Loader2
} from 'lucide-react';
import { VacationStats, VacationStatusType, Vacation, Employee } from '../../types';
import { suggestVacationResolution } from '../../services/aiService';

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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VacationAnalytics({
  vacationStats: rawVacationStats,
  vacationMonthlyBreakdown: _vacationMonthlyBreakdown,
  vacationLiability: _vacationLiability,
  vacationOverlapAlerts,
  vacationHeatmap: _vacationHeatmap,
  currentShift,
  allVacations,
  allEmployees,
  currentYear,
}: VacationAnalyticsProps) {
  
  // ─── Estado "Ao Vivo" para cálculo em tempo real ───────────────────────────
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Atualiza a cada minuto. Quando passar das 23:59 para 00:00, os dias vão abater automaticamente.
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Gestão de Férias</p>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none">
              Analytics de Férias
            </h2>
            <p className="text-blue-200/60 text-xs mt-1.5 font-medium">
              Turno {currentShift} · Ano {currentYear}
            </p>
          </div>
          <div className="shrink-0">
            <CustomDropdown
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'all', label: 'Todos os Cargos' },
                ...roles.map(r => ({ value: r, label: r })),
              ]}
              className="min-w-[180px] text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Em Férias Agora"   value={kpis.em_ferias}     sub="colaboradores ativos"    accentClass="bg-orange-400" />
        <KpiCard label="Férias Concluídas" value={kpis.concluidas}    sub="no histórico"            accentClass="bg-emerald-400" />
        <KpiCard label="Agendadas"         value={kpis.agendadas}     sub="próximas a iniciar"      accentClass="bg-blue-400" />
        <KpiCard label="Críticos / Venc."  value={kpis.criticos}      sub="prazo expirado"          accentClass="bg-red-500" />
      </div>

      {/* ── Em Férias Agora ──────────────────────────────────────────────── */}
      <Section
        id="current"
        expanded={expandedSection}
        onToggle={toggle}
        title="Em Férias Agora"
        icon={<CalendarDays className="w-4 h-4 text-orange-600" />}
        iconBg="bg-orange-50"
        count={kpis.em_ferias}
        accentClass="bg-orange-100 text-orange-700"
      >
        {/* Desktop table */}
        <div className="hidden sm:block">
          <DataTable>
            <thead>
              <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Início</Th><Th>Fim</Th><Th>Progresso & Dias Restantes</Th></tr>
            </thead>
            <tbody>
              {emFeriasAgora.length > 0 ? emFeriasAgora.map((s, i) => {
                
                // Extração estrita sem fuso horário (UTC bug fix)
                const [yS, mS, dS] = (s.dataInicioFerias || '').split('-').map(Number);
                const [yE, mE, dE] = (s.dataFimFerias || '').split('-').map(Number);
                
                // Datas cravadas às 00:00:00 da zona local
                const startLocal = new Date(yS, mS - 1, dS, 0, 0, 0);
                const endLocal   = new Date(yE, mE - 1, dE, 0, 0, 0);
                const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                
                // Total de días del período (inicio y fin inclusivos)
                const totalDays = Math.round((endLocal.getTime() - startLocal.getTime()) / 86400000) + 1;
                
                // Días ya gozados = desde inicio hasta HOY inclusive
                let passed = Math.round((todayLocal.getTime() - startLocal.getTime()) / 86400000) + 1;
                if (passed < 0) passed = 0;
                if (passed > totalDays) passed = totalDays;
                
                // Días restantes = total - gozados
                const remaining = Math.max(totalDays - passed, 0);
                
                // Animação visual em percentagem contínua via ms
                const startMs   = startLocal.getTime();
                const endMs     = new Date(yE, mE - 1, dE, 23, 59, 59).getTime();
                const currentMs = now.getTime();
                const totalMs   = endMs - startMs;
                const elapsedMs = currentMs - startMs;
                const percentage = totalMs > 0 ? Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100) : 0;
                
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

        {/* Mobile cards */}
        <div className="sm:hidden p-4 space-y-3 bg-gray-50/30">
          {emFeriasAgora.length > 0 ? emFeriasAgora.map((s, i) => {
            
            const [yS, mS, dS] = (s.dataInicioFerias || '').split('-').map(Number);
            const [yE, mE, dE] = (s.dataFimFerias || '').split('-').map(Number);
            
            const startLocal = new Date(yS, mS - 1, dS, 0, 0, 0);
            const endLocal   = new Date(yE, mE - 1, dE, 0, 0, 0);
            const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            
            // Total de días del período (inicio y fin inclusivos)
            const totalDays = Math.round((endLocal.getTime() - startLocal.getTime()) / 86400000) + 1;
            
            // Días ya gozados = desde inicio hasta HOY inclusive
            let passed = Math.round((todayLocal.getTime() - startLocal.getTime()) / 86400000) + 1;
            if (passed < 0) passed = 0;
            if (passed > totalDays) passed = totalDays;
            
            // Días restantes = total - gozados
            const remaining = Math.max(totalDays - passed, 0);
            
            const startMs   = startLocal.getTime();
            const endMs     = new Date(yE, mE - 1, dE, 23, 59, 59).getTime();
            const currentMs = now.getTime();
            const totalMs   = endMs - startMs;
            const elapsedMs = currentMs - startMs;
            const percentage = totalMs > 0 ? Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100) : 0;
            
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
        id="upcoming"
        expanded={expandedSection}
        onToggle={toggle}
        title="Previsão de Próximas Férias"
        icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
        iconBg="bg-blue-50"
        count={previsaoProximas.length}
        accentClass="bg-blue-100 text-blue-700"
      >
        <div className="hidden sm:block">
          <DataTable>
            <thead>
              <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Início Previsto</Th><Th>Fim Previsto</Th><Th center>Dias</Th><Th center>Status</Th></tr>
            </thead>
            <tbody>
              {previsaoProximas.length > 0 ? previsaoProximas.map((s, i) => {
                const [yS, mS, dS] = (s.dataInicioFerias || '').split('-').map(Number);
                const [yE, mE, dE] = (s.dataFimFerias || '').split('-').map(Number);
                const start = new Date(yS, mS - 1, dS);
                const end   = new Date(yE, mE - 1, dE);
                const dias  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
                const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const daysUntil  = Math.round((start.getTime() - todayLocal.getTime()) / 86400000);
                return (
                  <tr key={s.employeeId + i} className="hover:bg-gray-50 transition-colors">
                    <Td muted mono>{i + 1}</Td>
                    <Td><span className="font-black text-gray-900 uppercase text-[12px]">{s.employeeName}</span></Td>
                    <Td><Badge color="blue">{s.cargo}</Badge></Td>
                    <Td mono>{fmtDate(s.dataInicioFerias)}</Td>
                    <Td mono>{fmtDate(s.dataFimFerias)}</Td>
                    <Td center accent>{isNaN(dias) ? '?' : dias}</Td>
                    <Td center>
                      {daysUntil <= 7
                        ? <Badge color="red">Iminente ({daysUntil}d)</Badge>
                        : daysUntil <= 30
                        ? <Badge color="amber">Em breve ({daysUntil}d)</Badge>
                        : <Badge color="blue">{daysUntil}d</Badge>
                      }
                    </Td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400 italic">Sem férias agendadas</td></tr>
              )}
            </tbody>
          </DataTable>
        </div>
        <div className="sm:hidden p-4 space-y-3 bg-gray-50/30">
          {previsaoProximas.length > 0 ? previsaoProximas.map((s, i) => {
            const [yS, mS, dS] = (s.dataInicioFerias || '').split('-').map(Number);
            const [yE, mE, dE] = (s.dataFimFerias || '').split('-').map(Number);
            const start = new Date(yS, mS - 1, dS);
            const end   = new Date(yE, mE - 1, dE);
            const dias  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
            const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const daysUntil  = Math.round((start.getTime() - todayLocal.getTime()) / 86400000);
            return (
              <div key={s.employeeId + i} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">#{i + 1}</span>
                    <span className="text-sm font-black text-gray-900 uppercase">{s.employeeName}</span>
                  </div>
                  <Badge color="blue">{s.cargo}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                  <div><p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Início</p><p className="text-gray-700 font-mono">{fmtDate(s.dataInicioFerias)}</p></div>
                  <div><p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Fim</p><p className="text-gray-700 font-mono">{fmtDate(s.dataFimFerias)}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-600">{isNaN(dias) ? '?' : dias} dias</span>
                  {daysUntil <= 7 ? <Badge color="red">Iminente ({daysUntil}d)</Badge>
                    : daysUntil <= 30 ? <Badge color="amber">Em breve ({daysUntil}d)</Badge>
                    : <Badge color="blue">{daysUntil}d</Badge>}
                </div>
              </div>
            );
          }) : (
            <p className="py-6 text-center text-xs text-gray-400 italic bg-white rounded-xl border border-gray-100">Sem férias agendadas</p>
          )}
        </div>
      </Section>

      {/* ── Histórico ─────────────────────────────────────────────────────── */}
      <Section
        id="history"
        expanded={expandedSection}
        onToggle={toggle}
        title="Histórico de Férias Concluídas"
        icon={<History className="w-4 h-4 text-emerald-600" />}
        iconBg="bg-emerald-50"
        count={historicoConcluido.length}
        accentClass="bg-emerald-100 text-emerald-700"
      >
        <div className="hidden sm:block">
          <DataTable maxHeight>
            <thead>
              <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Início</Th><Th>Fim</Th><Th center>Período</Th></tr>
            </thead>
            <tbody>
              {historicoConcluido.length > 0 ? historicoConcluido.map((r, i) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td muted mono>{i + 1}</Td>
                  <Td><span className="font-black text-gray-900 uppercase text-[12px]">{r.employeeName}</span></Td>
                  <Td><Badge color="green">{r.cargo}</Badge></Td>
                  <Td mono>{fmtDate(r.dataInicioFerias)}</Td>
                  <Td mono>{fmtDate(r.dataFimFerias)}</Td>
                  <Td center accent>{r.numeroPeriodo}º</Td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400 italic">Sem histórico disponível</td></tr>
              )}
            </tbody>
          </DataTable>
        </div>
        <div className="sm:hidden p-4 space-y-3 bg-gray-50/30 max-h-[420px] overflow-y-auto">
          {historicoConcluido.length > 0 ? historicoConcluido.map((r, i) => (
            <div key={r.id} className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">#{i + 1} · {r.numeroPeriodo}º período</span>
                  <span className="text-sm font-black text-gray-900 uppercase">{r.employeeName}</span>
                </div>
                <Badge color="green">{r.cargo}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Início</p><p className="text-gray-700 font-mono">{fmtDate(r.dataInicioFerias)}</p></div>
                <div><p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Fim</p><p className="text-gray-700 font-mono">{fmtDate(r.dataFimFerias)}</p></div>
              </div>
            </div>
          )) : (
            <p className="py-6 text-center text-xs text-gray-400 italic bg-white rounded-xl border border-gray-100">Sem histórico disponível</p>
          )}
        </div>
      </Section>

      {/* ── Alertas Críticos ──────────────────────────────────────────────── */}
      {alertasCriticos.length > 0 && (
        <Section
          id="critical"
          expanded={expandedSection}
          onToggle={toggle}
          title="Alertas Críticos"
          icon={<ShieldAlert className="w-4 h-4 text-red-600" />}
          iconBg="bg-red-50"
          count={alertasCriticos.length}
          accentClass="bg-red-100 text-red-700"
        >
          <div className="hidden sm:block">
            <DataTable>
              <thead>
                <tr><Th>#</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Admissão</Th><Th>Vencimento</Th><Th center>Dias Vencidos</Th></tr>
              </thead>
              <tbody>
                {alertasCriticos.map((s, i) => {
                  const venc = s.dataFimPeriodoAquisitivo
                    ? Math.round((now.getTime() - new Date(s.dataFimPeriodoAquisitivo + 'T12:00:00').getTime()) / 86400000)
                    : null;
                  return (
                    <tr key={s.employeeId} className="hover:bg-red-50/50 transition-colors">
                      <Td muted mono>{i + 1}</Td>
                      <Td><span className="font-black text-gray-900 uppercase text-[12px]">{s.employeeName}</span></Td>
                      <Td><Badge color="red">{s.cargo}</Badge></Td>
                      <Td mono>{fmtDate(s.dataAdmissao)}</Td>
                      <Td mono>{fmtDate(s.dataFimPeriodoAquisitivo)}</Td>
                      <Td center><span className="font-black text-red-600">{venc !== null ? `${venc}d` : '—'}</span></Td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
          <div className="sm:hidden p-4 space-y-3 bg-gray-50/30">
            {alertasCriticos.map((s, i) => {
              const venc = s.dataFimPeriodoAquisitivo
                ? Math.round((now.getTime() - new Date(s.dataFimPeriodoAquisitivo + 'T12:00:00').getTime()) / 86400000)
                : null;
              return (
                <div key={s.employeeId} className="bg-white border border-red-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-1">#{i + 1} · CRÍTICO</span>
                      <span className="text-sm font-black text-gray-900 uppercase">{s.employeeName}</span>
                    </div>
                    <Badge color="red">{s.cargo}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                    <div><p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Admissão</p><p className="text-gray-700 font-mono">{fmtDate(s.dataAdmissao)}</p></div>
                    <div><p className="text-gray-400 font-bold uppercase text-[9px] mb-0.5">Vencimento</p><p className="text-gray-700 font-mono">{fmtDate(s.dataFimPeriodoAquisitivo)}</p></div>
                  </div>
                  {venc !== null && (
                    <p className="text-xs font-black text-red-600">{venc} dias vencidos</p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Conflitos de Sobreposição ─────────────────────────────────────── */}
      {vacationOverlapAlerts.length > 0 && (
        <Section
          id="conflicts"
          expanded={expandedSection}
          onToggle={toggle}
          title="Conflitos de Sobreposição"
          icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50"
          count={vacationOverlapAlerts.length}
          accentClass="bg-amber-100 text-amber-700"
        >
          <div className="p-4 space-y-3">
            {vacationOverlapAlerts.map((alert, i) => (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-800 font-semibold leading-relaxed">{alert}</p>
                    {aiResolutions[i] && (
                      <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3">
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Sugestão IA</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{aiResolutions[i]}</p>
                      </div>
                    )}
                  </div>
                  {!aiResolutions[i] && (
                    <button
                      onClick={() => handleSuggestResolution(i, alert)}
                      disabled={isResolving[i]}
                      className="shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-70"
                    >
                      {isResolving[i] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  );
}
