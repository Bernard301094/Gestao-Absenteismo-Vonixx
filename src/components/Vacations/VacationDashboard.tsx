import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  CalendarDays, CheckCircle2, Clock, AlertTriangle, Users,
  History, TrendingUp, AlertCircle, Calendar, BarChart3,
  Filter, Layers, ShieldAlert, ChevronRight, Zap
} from 'lucide-react';
import { VacationStats, VacationStatusType, Vacation, Employee } from '../../types';

const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface VacationDashboardProps {
  vacationStats: VacationStats[];
  vacationMonthlyBreakdown: Record<number, number[]>;
  vacationLiability: number;
  vacationOverlapAlerts: string[];
  vacationHeatmap: Record<string, number>;
  currentShift: string;
  allVacations: Vacation[];
  allEmployees: Employee[];
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '10px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    }}>
      <p style={{ color: '#0f172a', fontWeight: 700, marginBottom: 4, fontSize: 12 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: '#334155', fontSize: 12 }}>
          {p.dataKey}: <span style={{ color: p.fill, fontWeight: 700 }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function VacationDashboard({
  vacationStats: rawVacationStats,
  vacationMonthlyBreakdown,
  vacationLiability,
  vacationOverlapAlerts,
  vacationHeatmap,
  currentShift,
  allVacations,
  allEmployees
}: VacationDashboardProps) {
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [expandedSection, setExpandedSection] = React.useState<string | null>('current');

  const roles = useMemo(() =>
    Array.from(new Set(rawVacationStats.map(s => s.cargo).filter(Boolean))).sort(),
  [rawVacationStats]);

  const vacationStats = useMemo(() =>
    roleFilter === 'all' ? rawVacationStats : rawVacationStats.filter(s => s.cargo === roleFilter),
  [rawVacationStats, roleFilter]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:        vacationStats.length,
    em_ferias:    vacationStats.filter(s => s.status === 'em_ferias_agora').length,
    concluidas:   vacationStats.filter(s => s.status === 'ferias_concluidas').length,
    agendadas:    vacationStats.filter(s => s.status === 'ferias_agendadas').length,
    agendar_breve:vacationStats.filter(s => s.status === 'agendar_em_breve').length,
    criticos:     vacationStats.filter(s => s.status === 'critico_vencido').length,
    em_aquisitivo:vacationStats.filter(s => s.status === 'em_per_aquisitivo').length,
    aguardando:   vacationStats.filter(s => s.status === 'aguardando_dados').length,
  }), [vacationStats]);

  // ─── Heatmap ──────────────────────────────────────────────────────────────
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

  const maxHeatmapCount = useMemo(() =>
    Math.max(1, ...heatmapData.flatMap(m => m.days.map(d => d.count))),
  [heatmapData]);

  // ─── Chart ────────────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    MONTH_NAMES_SHORT.map((month, i) => {
      const entry: any = { name: month };
      Object.entries(vacationMonthlyBreakdown).forEach(([year, counts]) => {
        entry[year] = counts[i];
      });
      return entry;
    }),
  [vacationMonthlyBreakdown]);

  // ─── Filtered Tables ──────────────────────────────────────────────────────
  const emFeriasAgora   = useMemo(() => vacationStats.filter(s => s.status === 'em_ferias_agora'), [vacationStats]);
  
  const historicoConcluido = useMemo(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    
    // Filtramos apenas as que já terminaram
    const taken = allVacations.filter(v => {
      const isPast = v.endDate && v.endDate < todayISO;
      // Se tiver status 'taken' ou se a data já passou (para garantir dados antigos)
      return (v.status === 'taken' || isPast) && isPast;
    });

    // Removemos duplicatas (mesmo funcionário na mesma data de início)
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
          numeroPeriodo: emp?.admissionDate ? Math.floor((new Date(v.startDate + 'T12:00:00').getTime() - new Date(emp.admissionDate + 'T12:00:00').getTime()) / (1000*60*60*24*365.25)) + 1 : '?',
          inicioAquisitivo: emp?.admissionDate || '', // Para manter compatibilidade se necessário
        });
      }
    });

    return Array.from(uniqueMap.values())
      .sort((a, b) => b.dataInicioFerias.localeCompare(a.dataInicioFerias));
  }, [allVacations, allEmployees]);

  const previsaoProximas = useMemo(() =>
    vacationStats
      .filter(s => s.status === 'ferias_agendadas' || s.status === 'agendado_sem_admissao')
      .sort((a, b) => (a.dataInicioFerias || '9999').localeCompare(b.dataInicioFerias || '9999')),
  [vacationStats]);
  const alertasCriticos = useMemo(() => vacationStats.filter(s => s.status === 'critico_vencido'), [vacationStats]);

  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const toggle = (key: string) =>
    setExpandedSection(prev => prev === key ? null : key);

  // ─── Heatmap color ────────────────────────────────────────────────────────
  const heatColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.04)';
    const ratio = count / maxHeatmapCount;
    if (ratio < 0.25) return 'rgba(245,158,11,0.25)';
    if (ratio < 0.5)  return 'rgba(245,158,11,0.5)';
    if (ratio < 0.75) return 'rgba(245,158,11,0.75)';
    return 'rgba(245,158,11,1)';
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .vd-root { background: #f8fafc; min-height: 100vh; color: #1e293b; }

        /* Header */
        .vd-header {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 20px 24px;
          display: flex; flex-wrap: wrap; gap: 16px;
          align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 50;
          backdrop-filter: blur(12px);
        }
        .vd-header-left { display: flex; align-items: center; gap: 14px; }
        .vd-logo-ring {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(245,158,11,0.2);
          flex-shrink: 0;
        }
        .vd-title { font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: 0.3px; }
        .vd-subtitle { font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px; }
        .vd-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 20px; padding: 4px 10px;
          font-size: 11px; font-weight: 600; color: #d97706;
        }
        .vd-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block; animation: pulse-dot 2s infinite; }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Filter */
        .vd-filter {
          display: flex; align-items: center; gap: 8px;
          background: #ffffff; border: 1px solid #e2e8f0;
          border-radius: 10px; padding: 8px 14px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .vd-filter select {
          background: transparent; border: none; outline: none;
          color: #1e293b; font-size: 12px; font-weight: 600;
          font-family: inherit; cursor: pointer;
        }
        .vd-filter select option { background: #ffffff; color: #1e293b; }

        /* KPI Grid */
        .vd-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px; padding: 20px;
        }
        @media(min-width:480px) { .vd-kpi-grid { grid-template-columns: repeat(3,1fr); } }
        @media(min-width:768px) { .vd-kpi-grid { grid-template-columns: repeat(4,1fr); } }
        @media(min-width:1200px){ .vd-kpi-grid { grid-template-columns: repeat(9,1fr); gap:10px; } }

        .vd-kpi {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px; padding: 16px;
          display: flex; flex-direction: column; gap: 8px;
          position: relative; overflow: hidden;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
          cursor: default;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .vd-kpi:hover { transform: translateY(-2px); border-color: #f59e0b; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .vd-kpi::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: var(--kpi-accent, #f59e0b);
        }
        .vd-kpi-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
        .vd-kpi-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1; }
        .vd-kpi-sub { font-size: 10px; color: #94a3b8; }

        /* Sections */
        .vd-section {
          margin: 0 20px 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .vd-section-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
          user-select: none;
        }
        .vd-section-header:hover { background: #f8fafc; }
        .vd-section-title { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: #0f172a; letter-spacing: 0.2px; }
        .vd-section-icon {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: var(--icon-bg, rgba(245,158,11,0.1));
        }
        .vd-section-count {
          font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
          background: #f1f5f9; color: #64748b;
        }
        .vd-chevron { transition: transform 0.25s; color: #94a3b8; }
        .vd-chevron.open { transform: rotate(90deg); }
        .vd-section-body { overflow: hidden; transition: max-height 0.3s ease; }

        /* Tables */
        .vd-table { width: 100%; border-collapse: collapse; }
        .vd-table thead tr {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .vd-table th {
          padding: 10px 16px; text-align: left;
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          color: #64748b; text-transform: uppercase; white-space: nowrap;
        }
        .vd-table td {
          padding: 12px 16px; font-size: 12px; color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }
        .vd-table tbody tr { transition: background 0.15s; }
        .vd-table tbody tr:hover { background: #f8fafc; }
        .vd-table tbody tr:last-child td { border-bottom: none; }
        .vd-table .emp-name { font-weight: 600; color: #0f172a; }
        .vd-table .mono { font-family: 'DM Mono', monospace; font-size: 11px; }
        .vd-table .num-col { text-align: center; font-family: 'DM Mono', monospace; font-size: 11px; color: #94a3b8; }
        .vd-empty { text-align: center; padding: 40px 16px; color: #94a3b8; font-size: 13px; font-style: italic; }

        /* Badges */
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; }
        .badge-green  { background: #ecfdf5; color: #059669; border: 1px solid #d1fae5; }
        .badge-amber  { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; }
        .badge-blue   { background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; }
        .badge-red    { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
        .badge-orange { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }

        /* Overlap Alert */
        .vd-alert {
          margin: 0 20px 16px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          border-left: 3px solid #ef4444;
          border-radius: 16px; padding: 16px 20px;
          display: flex; gap: 14px; align-items: flex-start;
        }
        .vd-alert-icon { width: 36px; height: 36px; border-radius: 10px; background: #fee2e2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .vd-alert-title { font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; }
        .vd-alert-item { font-size: 12px; color: #b91c1c; margin-top: 4px; }

        /* Heatmap */
        .vd-heatmap-wrap { padding: 20px; overflow-x: auto; }
        .vd-heatmap-inner { display: flex; gap: 12px; min-width: max-content; }
        .vd-heatmap-month { display: flex; flex-direction: column; gap: 4px; }
        .vd-heatmap-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; margin-bottom: 2px; }
        .vd-heatmap-days { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
        .vd-heatmap-cell {
          width: 12px; height: 12px; border-radius: 3px;
          transition: opacity 0.2s, transform 0.2s;
          cursor: default;
        }
        .vd-heatmap-cell:hover { transform: scale(1.4); opacity: 1 !important; z-index: 10; }
        .vd-heatmap-legend { display: flex; align-items: center; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
        .vd-heatmap-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #64748b; font-weight: 500; }
        .vd-heatmap-legend-dot { width: 10px; height: 10px; border-radius: 2px; }

        /* Chart Area */
        .vd-chart-grid {
          display: grid; grid-template-columns: 1fr;
          gap: 16px; margin: 0 20px 20px;
        }
        @media(min-width:1024px) { .vd-chart-grid { grid-template-columns: 2fr 1fr; } }

        .vd-chart-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .vd-chart-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 700; color: #0f172a;
        }
        .vd-chart-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(245,158,11,0.1);
          display: flex; align-items: center; justify-content: center;
        }
        .vd-chart-body { padding: 20px; }

        /* Mini breakdown table */
        .vd-breakdown-table { width: 100%; border-collapse: collapse; font-family: 'DM Mono', monospace; }
        .vd-breakdown-table th {
          font-size: 9px; text-align: center; padding: 6px 4px;
          color: #94a3b8; font-weight: 500; text-transform: uppercase;
          border-bottom: 1px solid #f1f5f9;
        }
        .vd-breakdown-table td {
          font-size: 11px; text-align: center; padding: 6px 4px;
          border-bottom: 1px solid #f8fafc;
        }
        .vd-breakdown-table .year-cell {
          font-weight: 700; color: #d97706; font-size: 10px;
          border-right: 1px solid #f1f5f9; text-align: left; padding-left: 8px;
        }
        .vd-breakdown-table .count-cell { color: #cbd5e1; }
        .vd-breakdown-table .count-cell.has-data { color: #2563eb; font-weight: 600; }
        .vd-breakdown-table tbody tr:hover { background: #f8fafc; }
        .vd-breakdown-table tbody tr:last-child td { border-bottom: none; }

        /* Scrollable table wrapper */
        .vd-table-wrap { overflow-x: auto; }
        .vd-table-scroll { max-height: 380px; overflow-y: auto; }
        .vd-table-scroll thead { position: sticky; top: 0; z-index: 5; }
        .vd-table-scroll thead tr { background: #ffffff; }

        /* Scrollbar */
        .vd-table-wrap::-webkit-scrollbar,
        .vd-table-scroll::-webkit-scrollbar,
        .vd-heatmap-wrap::-webkit-scrollbar { height: 4px; width: 4px; }
        .vd-table-wrap::-webkit-scrollbar-track,
        .vd-table-scroll::-webkit-scrollbar-track,
        .vd-heatmap-wrap::-webkit-scrollbar-track { background: #f1f5f9; }
        .vd-table-wrap::-webkit-scrollbar-thumb,
        .vd-table-scroll::-webkit-scrollbar-thumb,
        .vd-heatmap-wrap::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        /* Row index */
        .row-idx { width: 36px; color: #cbd5e1; font-family: 'DM Mono', monospace; font-size: 10px; text-align: center; }

        /* Bottom padding */
        .vd-spacer { height: 32px; }
      `}</style>

      <div className="vd-root">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="vd-header">
          <div className="vd-header-left">
            <div className="vd-logo-ring">
              <CalendarDays size={20} color="#0f1a33" strokeWidth={2.5} />
            </div>
            <div>
              <div className="vd-title">Controle de Férias · Turno {currentShift} · Vonixx</div>
              <div className="vd-subtitle">Atualizado em {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div className="vd-filter">
              <Filter size={13} color="#f59e0b" />
              <span style={{ fontSize:10, fontWeight:600, color:'rgba(245,158,11,0.7)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Cargo</span>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">Todos</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}
        <div className="vd-kpi-grid">
          {[
            { label:'Total', value:kpis.total,         accent:'rgba(148,163,184,0.6)', sub:'funcionários' },
            { label:'Em Férias',  value:kpis.em_ferias,     accent:'rgba(249,115,22,0.8)',  sub:'agora' },
            { label:'Concluídas', value:kpis.concluidas,    accent:'rgba(16,185,129,0.8)',  sub:'no ciclo' },
            { label:'Agendadas',  value:kpis.agendadas,     accent:'rgba(59,130,246,0.8)',  sub:'previstas' },
            { label:'Agendar Breve', value:kpis.agendar_breve, accent:'rgba(245,158,11,0.8)', sub:'atenção' },
            { label:'Críticos',   value:kpis.criticos,      accent:'rgba(239,68,68,0.9)',   sub:'vencidos' },
            { label:'Aquisitivo', value:kpis.em_aquisitivo, accent:'rgba(20,184,166,0.8)',  sub:'período' },
            { label:'Aguardando', value:kpis.aguardando,    accent:'rgba(100,116,139,0.6)', sub:'dados' },
            { label:'Passivo',    value:vacationLiability,  accent:'rgba(168,85,247,0.8)',  sub:'dias totais' },
          ].map(({ label, value, accent, sub }) => (
            <div key={label} className="vd-kpi" style={{ '--kpi-accent': accent } as React.CSSProperties}>
              <div className="vd-kpi-label">{label}</div>
              <div className="vd-kpi-value">{value}</div>
              <div className="vd-kpi-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Overlap Alerts ───────────────────────────────────────────────── */}
        {vacationOverlapAlerts.length > 0 && (
          <div className="vd-alert">
            <div className="vd-alert-icon">
              <ShieldAlert size={18} color="#f87171" />
            </div>
            <div>
              <div className="vd-alert-title">⚠ Alerta de Cobertura Crítica</div>
              {vacationOverlapAlerts.map((a, i) => (
                <div key={i} className="vd-alert-item">· {a}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── Heatmap ─────────────────────────────────────────────────────── */}
        <Section
          id="heatmap"
          expanded={expandedSection}
          onToggle={toggle}
          title="Mapa de Calor · Ocupação Diária"
          icon={<Layers size={15} color="#f59e0b" />}
          count={null}
        >
          <div className="vd-heatmap-wrap">
            <div className="vd-heatmap-inner">
              {heatmapData.map(month => (
                <div key={month.name} className="vd-heatmap-month">
                  <div className="vd-heatmap-label">{month.name}</div>
                  <div className="vd-heatmap-days">
                    {month.days.map(d => (
                      <div
                        key={d.key}
                        className="vd-heatmap-cell"
                        title={`${d.key}: ${d.count} em férias`}
                        style={{ background: heatColor(d.count) }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="vd-heatmap-legend">
              {[
                { color:'rgba(255,255,255,0.04)', label:'0 ausências' },
                { color:'rgba(245,158,11,0.25)',  label:'Baixo' },
                { color:'rgba(245,158,11,0.55)',  label:'Médio' },
                { color:'rgba(245,158,11,1)',      label:'Alto' },
              ].map(({ color, label }) => (
                <div key={label} className="vd-heatmap-legend-item">
                  <div className="vd-heatmap-legend-dot" style={{ background: color, border:'1px solid rgba(255,255,255,0.1)' }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Em Férias Agora ──────────────────────────────────────────────── */}
        <Section
          id="current"
          expanded={expandedSection}
          onToggle={toggle}
          title="Em Férias Agora"
          icon={<TrendingUp size={15} color="#fb923c" />}
          iconBg="rgba(249,115,22,0.15)"
          count={emFeriasAgora.length}
          accentColor="#fb923c"
        >
          <div className="vd-table-wrap">
            <table className="vd-table">
              <thead>
                <tr>
                  <th className="row-idx">#</th>
                  <th>Funcionário</th>
                  <th>Cargo</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Dias Rest.</th>
                </tr>
              </thead>
              <tbody>
                {emFeriasAgora.length > 0 ? emFeriasAgora.map((s, i) => (
                  <tr key={s.employeeId}>
                    <td className="row-idx">{i + 1}</td>
                    <td className="emp-name">{s.employeeName}</td>
                    <td><span className="badge badge-orange">{s.cargo}</span></td>
                    <td className="mono">{fmtDate(s.dataInicioFerias)}</td>
                    <td className="mono">{fmtDate(s.dataFimFerias)}</td>
                    <td><span className="badge badge-amber">{s.diasRestantes}d</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="vd-empty">Ninguém em férias no momento</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Histórico ────────────────────────────────────────────────────── */}
        <Section
          id="history"
          expanded={expandedSection}
          onToggle={toggle}
          title="Histórico — Ciclos Concluídos"
          icon={<History size={15} color="#10b981" />}
          iconBg="rgba(16,185,129,0.15)"
          count={historicoConcluido.length}
          accentColor="#10b981"
        >
          <div className="vd-table-wrap vd-table-scroll">
            <table className="vd-table">
              <thead>
                <tr>
                  <th className="row-idx">#</th>
                  <th>Funcionário</th>
                  <th>Cargo</th>
                  <th>Início Férias</th>
                  <th>Fim Férias</th>
                  <th style={{textAlign:'center'}}>Período</th>
                  <th>Próx. Aquisitivo</th>
                </tr>
              </thead>
              <tbody>
                {historicoConcluido.length > 0 ? historicoConcluido.map((s, i) => (
                  <tr key={s.id}>
                    <td className="row-idx">{i + 1}</td>
                    <td className="emp-name">{s.employeeName}</td>
                    <td><span className="badge badge-green">{s.cargo}</span></td>
                    <td className="mono">{fmtDate(s.dataInicioFerias)}</td>
                    <td className="mono">{fmtDate(s.dataFimFerias || '')}</td>
                    <td style={{textAlign:'center'}}><span className="badge badge-blue">#{s.numeroPeriodo}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="vd-empty">Nenhum histórico encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Previsão ─────────────────────────────────────────────────────── */}
        <Section
          id="forecast"
          expanded={expandedSection}
          onToggle={toggle}
          title="Previsão — Próximas Férias"
          icon={<CalendarDays size={15} color="#60a5fa" />}
          iconBg="rgba(59,130,246,0.15)"
          count={previsaoProximas.length}
          accentColor="#60a5fa"
        >
          <div className="vd-table-wrap vd-table-scroll">
            <table className="vd-table">
              <thead>
                <tr>
                  <th className="row-idx">#</th>
                  <th>Funcionário</th>
                  <th>Cargo</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th style={{textAlign:'center'}}>Dias</th>
                  <th>Status</th>
                  <th>Dias p/ Vencer</th>
                </tr>
              </thead>
              <tbody>
                {previsaoProximas.length > 0 ? previsaoProximas.map((s, i) => (
                  <tr key={s.employeeId}>
                    <td className="row-idx">{i + 1}</td>
                    <td className="emp-name">{s.employeeName}</td>
                    <td><span className="badge badge-blue">{s.cargo}</span></td>
                    <td className="mono" style={{color:'#60a5fa',fontWeight:600}}>{fmtDate(s.dataInicioFerias)}</td>
                    <td className="mono">{fmtDate(s.dataFimFerias)}</td>
                    <td style={{textAlign:'center', fontFamily:'DM Mono', fontSize:12, fontWeight:700, color:'#f1f5f9'}}>{s.diasAGozar}</td>
                    <td><span className="badge badge-blue">📅 Agendado</span></td>
                    <td className="mono" style={{color:'rgba(226,232,240,0.45)'}}>{s.diasParaVencer}d</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="vd-empty">Nenhuma previsão de férias</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Alertas Críticos ─────────────────────────────────────────────── */}
        <Section
          id="critical"
          expanded={expandedSection}
          onToggle={toggle}
          title="Alertas Críticos — Agendar Imediatamente"
          icon={<AlertCircle size={15} color="#f87171" />}
          iconBg="rgba(239,68,68,0.15)"
          count={alertasCriticos.length}
          accentColor="#f87171"
        >
          <div className="vd-table-wrap">
            <table className="vd-table">
              <thead>
                <tr>
                  <th className="row-idx">#</th>
                  <th>Funcionário</th>
                  <th>Cargo</th>
                  <th>Fim Concessivo</th>
                  <th>Limite Concessão</th>
                  <th>Dias p/ Vencer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alertasCriticos.length > 0 ? alertasCriticos.map((s, i) => (
                  <tr key={s.employeeId} style={{background:'rgba(239,68,68,0.04)'}}>
                    <td className="row-idx" style={{color:'rgba(248,113,113,0.4)'}}>{i + 1}</td>
                    <td className="emp-name" style={{color:'#fca5a5'}}>{s.employeeName}</td>
                    <td><span className="badge badge-red">{s.cargo}</span></td>
                    <td className="mono" style={{color:'#fca5a5'}}>{fmtDate(s.fimConcessivo)}</td>
                    <td className="mono" style={{color:'#f87171',fontWeight:700}}>{fmtDate(s.dataLimiteConcessao)}</td>
                    <td><span className="badge badge-red" style={{fontSize:11,fontFamily:'DM Mono'}}>{s.diasParaVencer}d</span></td>
                    <td><span className="badge badge-red">🔴 Crítico</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:'32px 16px',color:'rgba(16,185,129,0.6)',fontStyle:'italic',fontSize:13}}>
                    ✓ Nenhum alerta crítico no momento
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Charts ──────────────────────────────────────────────────────── */}
        <div className="vd-chart-grid">
          <div className="vd-chart-box">
            <div className="vd-chart-header">
              <div className="vd-chart-icon"><BarChart3 size={15} color="#f59e0b" /></div>
              Distribuição Mensal de Férias
            </div>
            <div className="vd-chart-body">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} tick={{ fill:'#64748b', fontFamily:'DM Sans' }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} tick={{ fill:'#64748b', fontFamily:'DM Sans' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill:'#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize:11, color:'#64748b', paddingTop:12 }} />
                    <Bar dataKey="2026" fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={24} />
                    <Bar dataKey="2027" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={24} />
                    <Bar dataKey="2028" fill="#8b5cf6" radius={[4,4,0,0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="vd-chart-box">
            <div className="vd-chart-header">
              <div className="vd-chart-icon"><Calendar size={15} color="#f59e0b" /></div>
              Férias por Mês/Ano
            </div>
            <div className="vd-chart-body" style={{padding:0}}>
              <div style={{overflowX:'auto'}}>
                <table className="vd-breakdown-table">
                  <thead>
                    <tr>
                      <th style={{textAlign:'left',paddingLeft:16}}>Ano</th>
                      {MONTH_NAMES_SHORT.map(m => <th key={m}>{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(vacationMonthlyBreakdown).map(([year, months]) => (
                      <tr key={year}>
                        <td className="year-cell">{year}</td>
                        {months.map((count, i) => (
                          <td key={i} className={`count-cell ${count > 0 ? 'has-data' : ''}`}>
                            {count > 0 ? count : '·'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="vd-spacer" />
      </div>
    </div>
  );
}

// ─── Collapsible Section ───────────────────────────────────────────────────────
function Section({
  id, expanded, onToggle, title, icon, iconBg, count, accentColor, children
}: {
  id: string;
  expanded: string | null;
  onToggle: (id: string) => void;
  title: string;
  icon: React.ReactNode;
  iconBg?: string;
  count: number | null;
  accentColor?: string;
  children: React.ReactNode;
}) {
  const isOpen = expanded === id;
  return (
    <div className="vd-section" style={accentColor ? { borderColor: `rgba(${hexToRgb(accentColor)},0.12)` } : {}}>
      <div className="vd-section-header" onClick={() => onToggle(id)}>
        <div className="vd-section-title">
          <div className="vd-section-icon" style={{ background: iconBg || 'rgba(245,158,11,0.15)' }}>
            {icon}
          </div>
          {title}
          {count !== null && (
            <span className="vd-section-count" style={count > 0 ? { color: accentColor, background:`rgba(${hexToRgb(accentColor || '#f59e0b')},0.1)` } : {}}>
              {count}
            </span>
          )}
        </div>
        <ChevronRight size={16} className={`vd-chevron${isOpen ? ' open' : ''}`} />
      </div>
      {isOpen && <div className="vd-section-body">{children}</div>}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const map: Record<string, string> = {
    '#f59e0b': '245,158,11', '#fb923c': '249,115,22', '#10b981': '16,185,129',
    '#60a5fa': '96,165,250', '#f87171': '248,113,113', '#a78bfa': '167,139,250',
  };
  return map[hex] || '245,158,11';
}