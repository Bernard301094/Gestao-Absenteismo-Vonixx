import React, { useMemo } from 'react';
import {
  CalendarDays, Palmtree, AlertCircle, CheckCircle2,
  Clock, Activity, BarChart3, AlertTriangle, ShieldAlert,
  ChevronRight, Users, Info
} from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import type { VacationStats, Employee, Vacation } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

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

export default function VacationAnalytics({
  vacationStats,
  vacationMonthlyBreakdown,
  vacationLiability,
  vacationOverlapAlerts,
  currentShift,
  currentYear,
  allVacations,
}: VacationAnalyticsProps) {
  
  // ─── Data Aggregations ────────────────────────────────────────────────────
  const today = new Date();
  const todayTime = today.getTime();

  const emFerias = vacationStats.filter(s => s.status === 'em_ferias_agora').map(s => {
    let diasRestantes = Number(s.diasRestantes) || 0;
    if (s.dataFimFerias) {
      const end = new Date(s.dataFimFerias + 'T12:00:00').getTime();
      diasRestantes = Math.max(0, Math.ceil((end - todayTime) / (1000 * 60 * 60 * 24)));
    }
    return { ...s, sortValue: diasRestantes, labelRestante: `Faltam ${diasRestantes} dias` };
  });

  const agendadas = vacationStats.filter(s => s.status === 'ferias_agendadas').map(s => {
    let diasParaInicio = 9999;
    if (s.dataInicioFerias) {
      const start = new Date(s.dataInicioFerias + 'T12:00:00').getTime();
      diasParaInicio = Math.max(0, Math.ceil((start - todayTime) / (1000 * 60 * 60 * 24)));
    }
    return { ...s, sortValue: diasParaInicio, labelRestante: `Daqui a ${diasParaInicio} dias` };
  }).sort((a, b) => a.sortValue - b.sortValue);

  const criticos = vacationStats.filter(s => s.status === 'critico_vencido');
  const concluidas = vacationStats.filter(s => s.status === 'ferias_concluidas');

  // Manual chart data calculation from allVacations
  const chartData = Array(12).fill(0);
  allVacations.forEach(v => {
    if (!v.startDate || v.status === 'taken' || v.isHistorical) return; // or include taken? let's include all for the year
    const start = new Date(v.startDate + 'T12:00:00');
    if (start.getFullYear() === currentYear) {
      chartData[start.getMonth()]++;
    }
  });
  
  const maxMonthlyVacations = Math.max(...chartData, 1);

  // Combine Em Férias and Agendadas for the timeline
  const timelineEvents = [...emFerias, ...agendadas].slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* ── SaaS Hero Header ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center shrink-0">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Analytics de Férias
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
                Visão {currentYear}
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">
              Monitoramento inteligente, previsão de conflitos e passivo. Turno {currentShift}.
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Em Férias */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Palmtree className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">Ativos</span>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900 leading-none">{emFerias.length}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Em Férias Agora</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* KPI: Agendadas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900 leading-none">{agendadas.length}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Agendadas</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* KPI: Críticos */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-rose-50 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            {criticos.length > 0 && <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />}
          </div>
          <div>
            <p className={`text-3xl font-black leading-none ${criticos.length > 0 ? 'text-rose-600' : 'text-gray-900'}`}>{criticos.length}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Vencendo / Vencidos</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* KPI: Passivo de Férias */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900 leading-none">{vacationLiability} <span className="text-sm text-gray-400">dias</span></p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">Passivo de Férias</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* ── Main Dashboard Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Chart & Timeline (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chart: Distribuição Anual */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">Distribuição de Férias</h3>
                  <p className="text-xs text-gray-500 font-medium">Projeção anual de saídas ({currentYear})</p>
                </div>
              </div>
            </div>
            
            <div className="h-56 flex items-end justify-between gap-1 sm:gap-2 px-1 relative">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                 <div className="w-full border-t border-dashed border-gray-200"></div>
                 <div className="w-full border-t border-dashed border-gray-200"></div>
                 <div className="w-full border-t border-dashed border-gray-200"></div>
                 <div className="w-full border-t border-solid border-gray-200"></div>
              </div>

              {chartData.map((count, index) => {
                const heightPct = count === 0 ? 0 : (count / maxMonthlyVacations) * 100;
                const hasData = count > 0;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group z-10">
                    {/* Tooltip / Counter */}
                    <div className={`mb-2 transition-all duration-300 ${hasData ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      <span className="text-[10px] font-black bg-gray-900 text-white px-2.5 py-1 rounded-md shadow-sm group-hover:bg-blue-600 transition-colors">
                        {count}
                      </span>
                    </div>
                    {/* Bar Container */}
                    <div className="w-full max-w-[40px] bg-gray-50/80 rounded-t-xl relative overflow-hidden h-40 flex items-end group-hover:bg-gray-100 transition-colors border-x border-t border-gray-100/50">
                      {/* Active Bar */}
                      <div 
                        className={`w-full rounded-t-xl transition-all duration-1000 ease-out relative overflow-hidden ${hasData ? 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]' : 'bg-transparent'}`} 
                        style={{ height: `${heightPct}%` }}
                      >
                         {hasData && <div className="absolute top-0 left-0 right-0 h-1 bg-white/30"></div>}
                      </div>
                    </div>
                    {/* Month Label */}
                    <div className={`text-[10px] font-bold uppercase tracking-wider mt-3 transition-colors ${hasData ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                      {MONTH_NAMES[index].substring(0,3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline: Férias Atuais e Próximas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Timeline de Férias</h3>
            </div>

            {timelineEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm font-medium">
                Nenhuma férias em andamento ou agendada.
              </div>
            ) : (
              <div className="space-y-4">
                {timelineEvents.map((ev, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${ev.status === 'em_ferias_agora' ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-300' : 'bg-gray-50/50 border-gray-100 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 border ${ev.status === 'em_ferias_agora' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                        {ev.status === 'em_ferias_agora' ? <Palmtree className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{ev.employeeName}</p>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{ev.cargo}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      {ev.status === 'em_ferias_agora' ? (
                        <>
                          <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md mb-1">Em Férias</span>
                          <span className="text-xs font-bold text-gray-600">{ev.labelRestante}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md mb-1">{ev.labelRestante}</span>
                          <span className="text-xs font-bold text-gray-600 text-right max-w-[120px] truncate">
                            {ev.dataInicioFerias ? new Date(ev.dataInicioFerias + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'N/A'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Alerts & Critical (span 1) */}
        <div className="space-y-6">
          
          {/* AI Intelligence Center */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldAlert className="w-32 h-32 text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-md border border-blue-500/30">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Centro de Alertas</h3>
              </div>

              {vacationOverlapAlerts.length === 0 ? (
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-xs font-medium text-gray-300 leading-relaxed">
                      Nenhuma sobreposição de férias detectada para o mesmo cargo. A cobertura da equipe parece adequada.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {vacationOverlapAlerts.map((alert, i) => (
                    <div key={i} className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-rose-300 mb-1">Risco de Cobertura</p>
                          <p className="text-xs font-medium text-gray-300 leading-relaxed">{alert}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Fake AI Recommendation based on alerts */}
                  <div className="mt-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <div className="flex items-start gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Recomendação do Sistema</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">Considere aprovar as próximas solicitações com pelo menos 1 semana de defasagem para evitar déficit na operação.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Critical Employees */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <Users className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Férias Críticas</h3>
              </div>
              <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{criticos.length}</span>
            </div>

            {criticos.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium text-center py-4">Nenhum funcionário com férias vencendo.</p>
            ) : (
              <div className="space-y-3">
                {criticos.map((c, i) => (
                  <div key={i} className="p-3 bg-white border border-rose-100 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-gray-900">{c.employeeName}</p>
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase">Atenção</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight mb-2">Período limite aproxima-se rapidamente. Agende as férias para evitar multas trabalhistas.</p>
                    {c.diasRestantes !== undefined && (
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                        {Number(c.diasRestantes) > 0 ? `Vence em ${c.diasRestantes} dias` : 'Vencido'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
