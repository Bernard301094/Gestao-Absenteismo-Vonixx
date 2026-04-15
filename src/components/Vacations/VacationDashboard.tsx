import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  History,
  TrendingUp,
  AlertCircle,
  Calendar,
  BarChart3
} from 'lucide-react';
import { VacationStats, VacationStatusType } from '../../types';

interface VacationDashboardProps {
  vacationStats: VacationStats[];
  vacationMonthlyBreakdown: Record<number, number[]>;
  currentShift: string;
}

export default function VacationDashboard({ 
  vacationStats, 
  vacationMonthlyBreakdown,
  currentShift 
}: VacationDashboardProps) {
  
  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const counts = {
      total: vacationStats.length,
      em_ferias: vacationStats.filter(s => s.status === 'em_ferias_agora').length,
      concluidas: vacationStats.filter(s => s.status === 'ferias_concluidas').length,
      agendadas: vacationStats.filter(s => s.status === 'ferias_agendadas').length,
      agendar_breve: vacationStats.filter(s => s.status === 'agendar_em_breve').length,
      criticos: vacationStats.filter(s => s.status === 'critico_vencido').length,
      em_aquisitivo: vacationStats.filter(s => s.status === 'em_per_aquisitivo').length,
      aguardando: vacationStats.filter(s => s.status === 'aguardando_dados').length,
    };
    return counts;
  }, [vacationStats]);

  // ─── Dados para o Gráfico ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((month, i) => {
      const entry: any = { name: month };
      Object.entries(vacationMonthlyBreakdown).forEach(([year, counts]) => {
        entry[year] = counts[i];
      });
      return entry;
    });
  }, [vacationMonthlyBreakdown]);

  // ─── Tabelas Filtradas ─────────────────────────────────────────────────────
  const emFeriasAgora = useMemo(() => 
    vacationStats.filter(s => s.status === 'em_ferias_agora'), 
  [vacationStats]);

  const historicoConcluido = useMemo(() => 
    vacationStats.filter(s => s.status === 'ferias_concluidas'), 
  [vacationStats]);

  const previsaoProximas = useMemo(() => 
    vacationStats
      .filter(s => s.status === 'ferias_agendadas' || s.status === 'agendado_sem_admissao')
      .sort((a, b) => (a.dataInicioFerias || '9999').localeCompare(b.dataInicioFerias || '9999')), 
  [vacationStats]);

  const alertasCriticos = useMemo(() => 
    vacationStats.filter(s => s.status === 'critico_vencido'), 
  [vacationStats]);

  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Estilo Excel */}
      <div className="bg-[#1e3a5f] text-white p-4 rounded-t-lg shadow-lg flex flex-col items-center justify-center border-b-4 border-[#ff9900]">
        <h1 className="text-xl font-bold uppercase tracking-widest flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#ff9900]" />
          Dashboard – Controle de Férias | Turno {currentShift} | Vonixx
        </h1>
        <p className="text-[10px] opacity-70 mt-1 uppercase">Atualizado em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-0 shadow-xl rounded-b-lg overflow-hidden border border-gray-200">
        <KPICard label="Total" value={kpis.total} color="bg-[#1e3a5f]" />
        <KPICard label="Em Férias" value={kpis.em_ferias} color="bg-[#d35400]" />
        <KPICard label="Concluídas" value={kpis.concluidas} color="bg-[#27ae60]" />
        <KPICard label="Agendadas" value={kpis.agendadas} color="bg-[#2980b9]" />
        <KPICard label="Agendar Breve" value={kpis.agendar_breve} color="bg-[#f39c12]" />
        <KPICard label="Críticos" value={kpis.criticos} color="bg-[#c0392b]" />
        <KPICard label="Em Aquisitivo" value={kpis.em_aquisitivo} color="bg-[#16a085]" />
        <KPICard label="Aguardando" value={kpis.aguardando} color="bg-[#7f8c8d]" />
      </div>

      {/* Seção: Quem está de Férias AGORA */}
      <DashboardSection 
        title="Quem está de Férias AGORA" 
        icon={<TrendingUp className="w-5 h-5" />}
        headerColor="bg-[#c0392b]"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[11px] uppercase font-bold text-gray-600 border-b">
                <th className="px-4 py-2 border-r w-12 text-center">#</th>
                <th className="px-4 py-2 border-r">Nome do Funcionário</th>
                <th className="px-4 py-2 border-r">Cargo</th>
                <th className="px-4 py-2 border-r">Data Início</th>
                <th className="px-4 py-2 border-r">Data Fim</th>
                <th className="px-4 py-2">Dias Rest.</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {emFeriasAgora.length > 0 ? emFeriasAgora.map((s, i) => (
                <tr key={s.employeeId} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 border-r text-center font-mono text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 border-r font-bold text-gray-800">{s.employeeName}</td>
                  <td className="px-4 py-2 border-r text-gray-600">{s.cargo}</td>
                  <td className="px-4 py-2 border-r font-mono">{fmtDate(s.dataInicioFerias)}</td>
                  <td className="px-4 py-2 border-r font-mono">{fmtDate(s.dataFimFerias)}</td>
                  <td className="px-4 py-2 font-bold text-orange-600">{s.diasRestantes} dias</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Ninguém em férias no momento.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      {/* Seção: Histórico */}
      <DashboardSection 
        title="Histórico - Funcionários que já gozaram férias (ciclo concluído)" 
        icon={<History className="w-5 h-5" />}
        headerColor="bg-[#27ae60]"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[11px] uppercase font-bold text-gray-600 border-b">
                <th className="px-4 py-2 border-r w-12 text-center">#</th>
                <th className="px-4 py-2 border-r">Nome do Funcionário</th>
                <th className="px-4 py-2 border-r">Cargo</th>
                <th className="px-4 py-2 border-r">Início Férias</th>
                <th className="px-4 py-2 border-r">Fim Férias</th>
                <th className="px-4 py-2 border-r text-center">Nº Per. Atual</th>
                <th className="px-4 py-2">Próx. Início Aquis.</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {historicoConcluido.length > 0 ? historicoConcluido.map((s, i) => (
                <tr key={s.employeeId} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 border-r text-center font-mono text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 border-r font-bold text-gray-800">{s.employeeName}</td>
                  <td className="px-4 py-2 border-r text-gray-600">{s.cargo}</td>
                  <td className="px-4 py-2 border-r font-mono">{fmtDate(s.dataInicioFerias)}</td>
                  <td className="px-4 py-2 border-r font-mono">{fmtDate(s.dataFimFerias)}</td>
                  <td className="px-4 py-2 border-r text-center font-bold">{s.numeroPeriodo}</td>
                  <td className="px-4 py-2 font-mono text-blue-600">{fmtDate(s.inicioAquisitivo)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">Nenhum histórico encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      {/* Seção: Previsão */}
      <DashboardSection 
        title="Previsão - Próximas Férias (ordenado por Data de Início)" 
        icon={<CalendarDays className="w-5 h-5" />}
        headerColor="bg-[#2980b9]"
      >
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 text-[11px] uppercase font-bold text-gray-600 border-b shadow-sm">
                <th className="px-4 py-2 border-r w-12 text-center">#</th>
                <th className="px-4 py-2 border-r">Nome do Funcionário</th>
                <th className="px-4 py-2 border-r">Cargo</th>
                <th className="px-4 py-2 border-r">Data Início</th>
                <th className="px-4 py-2 border-r">Data Fim</th>
                <th className="px-4 py-2 border-r text-center">Dias a Gozar</th>
                <th className="px-4 py-2 border-r">Status</th>
                <th className="px-4 py-2">Dias p/ Vencer</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {previsaoProximas.length > 0 ? previsaoProximas.map((s, i) => (
                <tr key={s.employeeId} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 border-r text-center font-mono text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 border-r font-bold text-gray-800">{s.employeeName}</td>
                  <td className="px-4 py-2 border-r text-gray-600">{s.cargo}</td>
                  <td className="px-4 py-2 border-r font-mono text-blue-700 font-bold">{fmtDate(s.dataInicioFerias)}</td>
                  <td className="px-4 py-2 border-r font-mono">{fmtDate(s.dataFimFerias)}</td>
                  <td className="px-4 py-2 border-r text-center font-bold">{s.diasAGozar}</td>
                  <td className="px-4 py-2 border-r">
                    <span className="flex items-center gap-1">
                      {s.status === 'agendado_sem_admissao' ? '📅 Agendado (sem admissão)' : '📅 Férias Agendadas'}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-500">{s.diasParaVencer} dias</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">Nenhuma previsão de férias.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      {/* Seção: Alertas Críticos */}
      <DashboardSection 
        title="Alertas Críticos – Agendar IMEDIATAMENTE" 
        icon={<AlertCircle className="w-5 h-5" />}
        headerColor="bg-[#c0392b]"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[11px] uppercase font-bold text-gray-600 border-b">
                <th className="px-4 py-2 border-r w-12 text-center">#</th>
                <th className="px-4 py-2 border-r">Nome do Funcionário</th>
                <th className="px-4 py-2 border-r">Cargo</th>
                <th className="px-4 py-2 border-r">Fim Concessivo</th>
                <th className="px-4 py-2 border-r">Lim. Concessão</th>
                <th className="px-4 py-2 border-r">Dias p/ Vencer</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {alertasCriticos.length > 0 ? alertasCriticos.map((s, i) => (
                <tr key={s.employeeId} className="border-b bg-red-50 hover:bg-red-100 transition-colors">
                  <td className="px-4 py-2 border-r text-center font-mono text-red-300">{i + 1}</td>
                  <td className="px-4 py-2 border-r font-bold text-red-900">{s.employeeName}</td>
                  <td className="px-4 py-2 border-r text-red-700">{s.cargo}</td>
                  <td className="px-4 py-2 border-r font-mono text-red-700">{fmtDate(s.fimConcessivo)}</td>
                  <td className="px-4 py-2 border-r font-mono text-red-700 font-bold">{fmtDate(s.dataLimiteConcessao)}</td>
                  <td className="px-4 py-2 border-r font-mono font-black text-red-600">{s.diasParaVencer} dias</td>
                  <td className="px-4 py-2 font-bold text-red-600 uppercase tracking-tighter">🔴 Crítico - Agendar JÁ</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-green-600 font-medium bg-green-50 italic">Nenhum alerta crítico no momento.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      {/* Gráfico e Tabela de Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DashboardSection 
            title="Distribuição Mensal de Férias" 
            icon={<BarChart3 className="w-5 h-5" />}
            headerColor="bg-[#1e3a5f]"
          >
            <div className="h-[300px] w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="2026" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="2027" fill="#2980b9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="2028" fill="#3498db" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashboardSection>
        </div>

        <div className="lg:col-span-1">
          <DashboardSection 
            title="Férias Agendadas por Mês" 
            icon={<Calendar className="w-5 h-5" />}
            headerColor="bg-[#1e3a5f]"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white text-[10px] uppercase font-bold border-b">
                    <th className="px-2 py-2 border-r w-16">Ano</th>
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => (
                      <th key={m} className="px-2 py-2 border-r">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[10px]">
                  {Object.entries(vacationMonthlyBreakdown).map(([year, months]) => (
                    <tr key={year} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-2 py-2 border-r font-bold bg-gray-100">{year}</td>
                      {months.map((count, i) => (
                        <td key={i} className={`px-2 py-2 border-r font-mono ${count > 0 ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-300'}`}>
                          {count}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className={`${color} text-white p-3 flex flex-col items-center justify-center border-r border-white/10 last:border-r-0`}>
      <span className="text-[10px] uppercase font-bold opacity-80 tracking-tighter">{label}</span>
      <span className="text-2xl font-black">{value}</span>
    </div>
  );
}

function DashboardSection({ title, icon, children, headerColor }: { title: string, icon: React.ReactNode, children: React.ReactNode, headerColor: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className={`${headerColor} text-white px-4 py-2 flex items-center gap-2 font-bold text-sm uppercase tracking-wide`}>
        {icon}
        {title}
      </div>
      <div className="p-0">
        {children}
      </div>
    </div>
  );
}
