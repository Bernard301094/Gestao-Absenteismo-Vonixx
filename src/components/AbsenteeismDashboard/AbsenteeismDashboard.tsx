import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, Bot, Sparkles, Loader2, RefreshCw, Zap } from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import { exportToPDF } from '../../utils/exportPDF';
import type {
  Employee, AttendanceRecord, NotesRecord,
  EmployeeWithStats, DayData, WeekdayData, LeaderboardEntry, Alert
} from '../../types';

import PerformanceChart from '../Charts/PerformanceChart';
import RankingChart from '../Charts/RankingChart';
import WeekdayChart from '../Charts/WeekdayChart';
import DailyEvolutionChart from '../Charts/DailyEvolutionChart';
import DistributionChart from '../Charts/DistributionChart';
import EmployeeTable from '../Charts/EmployeeTable';
import DailyTable from '../Charts/DailyTable';
import { analyzePatterns } from '../../services/aiService';

interface DashboardProps {
  handleExportExcel: () => void;
  isSupervision: boolean;
  alerts: Alert[];
  selectedDay: number | 'all';
  currentMonth: number;
  currentYear: number;
  totalFaltasMes: number;
  employees: Employee[];
  attendance: AttendanceRecord;
  getStatusForDay: (empId: string, day: number) => string;
  taxaAbsenteismo: string;
  topEmployee: EmployeeWithStats | null;
  dailyData: DayData[];
  leaderboardData: LeaderboardEntry[];
  topEmployees: EmployeeWithStats[];
  weekdayData: WeekdayData[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (sf: any) => void;
  sortOrder: string;
  setSortOrder: (so: any) => void;
  filteredEmployees: EmployeeWithStats[];
  notes: NotesRecord;
  setSelectedEmployeeDetail: (emp: any) => void;
  getInitials: (name: string) => string;
}

// ─── Markdown com renderers inline — força texto branco no fundo escuro ──────
function AIMarkdown({ content }: { content: string }) {
  return (
    <div style={{ color: '#e2e8f0', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: '1.6' }}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 style={{ color: '#ffffff', fontWeight: 900, fontSize: '0.9rem', marginBottom: '0.5rem', marginTop: '1rem' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: '0.875rem', marginBottom: '0.5rem', marginTop: '1rem' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ color: '#bae6fd', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.375rem', marginTop: '0.75rem' }}>{children}</h3>,
          p:  ({ children }) => <p  style={{ color: '#e2e8f0', marginBottom: '0.75rem', lineHeight: '1.65' }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: '#ffffff', fontWeight: 900 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: '#7dd3fc', fontStyle: 'normal', fontWeight: 600 }}>{children}</em>,
          ul: ({ children }) => <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>{children}</ol>,
          li: ({ children }) => (
            <li style={{ color: '#e2e8f0', marginBottom: '0.375rem', paddingLeft: '1.125rem', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#38bdf8', fontWeight: 700 }}>▸</span>
              {children}
            </li>
          ),
          hr: () => <hr style={{ borderColor: '#334155', margin: '1rem 0' }} />,
          code: ({ children }) => (
            <code style={{ color: '#7dd3fc', background: '#1e3a5f', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function Dashboard({
  handleExportExcel,
  isSupervision,
  alerts,
  selectedDay,
  currentMonth,
  currentYear,
  totalFaltasMes,
  employees,
  attendance,
  getStatusForDay,
  taxaAbsenteismo,
  topEmployee,
  dailyData,
  leaderboardData,
  topEmployees,
  weekdayData,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  filteredEmployees,
  notes,
  setSelectedEmployeeDetail,
  getInitials,
}: DashboardProps) {
  const [isAnalyzingPatterns, setIsAnalyzingPatterns] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleExportPDF = () => {
    exportToPDF(
      isSupervision ? 'Supervisão' : 'Turno Atual',
      employees,
      attendance,
      selectedDay,
      currentMonth,
      currentYear
    );
  };

  const handleAnalyzePatterns = async () => {
    setIsAnalyzingPatterns(true);
    setAiError(null);
    try {
      const insights = await analyzePatterns(weekdayData);
      setAiInsights(insights);
    } catch (error: any) {
      setAiError(error?.message || 'Erro ao gerar insights. Verifique as chaves de API.');
    } finally {
      setIsAnalyzingPatterns(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 uppercase tracking-tight">Visão Geral do Mês</h2>
        <div className="flex flex-wrap items-center gap-2 self-start xs:self-auto">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* ── AI Insights Card ──────────────────────────────────────────────────── */}
      {selectedDay === 'all' && (
        <div className="relative rounded-2xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[#0f1e36]" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />

          <div className="relative p-5 sm:p-6">
            {/* Cabeçalho do card */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-sky-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-black text-base sm:text-lg tracking-tight">Insights de IA</h3>
                    <span className="hidden sm:inline-flex items-center gap-1 bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                      <Zap className="w-2.5 h-2.5" /> IA
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mt-0.5">
                    Análise de padrões de absenteisão por dia da semana
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {aiInsights && (
                  <button
                    onClick={() => { setAiInsights(null); setAiError(null); }}
                    className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={handleAnalyzePatterns}
                  disabled={isAnalyzingPatterns}
                  className="flex items-center gap-2 bg-white hover:bg-sky-50 disabled:bg-white/80 text-slate-900 disabled:text-slate-900/60 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:cursor-not-allowed"
                >
                  {isAnalyzingPatterns
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...</>
                    : aiInsights
                    ? <><RefreshCw className="w-3.5 h-3.5" /> Reanalisar</>
                    : <><Bot className="w-3.5 h-3.5" /> Analisar Padrões</>
                  }
                </button>
              </div>
            </div>

            {/* Loading */}
            {isAnalyzingPatterns && (
              <div className="mt-5 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                <p className="text-slate-300 text-sm">Processando dados de absenteisão...</p>
                <div className="ml-auto flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Erro */}
            {aiError && (
              <div className="mt-5 flex items-start gap-3 bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-300 text-xs font-black">!</span>
                </div>
                <p className="text-red-200 text-sm leading-relaxed">{aiError}</p>
              </div>
            )}

            {/* Insight gerado */}
            {aiInsights && !isAnalyzingPatterns && (
              <div className="mt-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-slate-600" />
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Análise gerada</span>
                  <div className="h-px flex-1 bg-slate-600" />
                </div>
                <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-5">
                  <AIMarkdown content={aiInsights} />
                </div>
              </div>
            )}

            {/* Estado vazio */}
            {!aiInsights && !isAnalyzingPatterns && !aiError && (
              <div className="mt-5 flex flex-col items-center gap-2 py-4 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-slate-400 text-xs max-w-xs">
                  Clique em <strong className="text-slate-200">Analisar Padrões</strong> para detectar tendências de absenteisão com IA.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Alerts ─────────────────────────────────────────────────────────────────── */}
      {isSupervision && alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-500">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm ${
                alert.type === 'critical'
                  ? 'bg-red-50 border-red-100 text-red-800'
                  : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}
            >
              <div className={`p-2 rounded-xl ${alert.type === 'critical' ? 'bg-red-100' : 'bg-amber-100'}`}>
                <alert.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold leading-tight flex-1">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">
            {selectedDay === 'all' ? 'Total Faltas' : 'Faltas Dia'}
          </h3>
          <div className="text-3xl sm:text-4xl font-extrabold text-red-600">
            {selectedDay === 'all'
              ? totalFaltasMes
              : employees.filter(emp => getStatusForDay(emp.id, selectedDay as number) === 'F').length}
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">
            {selectedDay === 'all' ? 'Absenteisão' : 'Presentes'}
          </h3>
          <div className="text-3xl sm:text-4xl font-extrabold text-orange-600">
            {selectedDay === 'all'
              ? `${taxaAbsenteismo}%`
              : employees.filter(emp => getStatusForDay(emp.id, selectedDay as number) === 'P').length}
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">Funcionários</h3>
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-600">{employees.length}</div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">
            {selectedDay === 'all' ? 'Mais Faltas' : 'Afast./Férias'}
          </h3>
          <div className="text-sm sm:text-lg font-bold text-green-700 leading-tight uppercase">
            {selectedDay === 'all'
              ? (topEmployee?.name ?? '-')
              : employees.filter(emp => ['Fe', 'A'].includes(attendance[emp.id]?.[selectedDay as number] || 'P')).length}
          </div>
          {selectedDay === 'all' && topEmployee && (
            <div className="text-xs sm:text-sm font-bold text-green-600">({topEmployee.faltas} Faltas no mês)</div>
          )}
        </div>
      </div>

      {/* ── Evolução do Mês ────────────────────────────────────────────────────── */}
      {selectedDay === 'all' && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Evolução do Mês</p>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="lg:col-span-1 h-[280px] sm:h-[340px] lg:h-[420px]">
              <DailyTable data={dailyData} currentMonth={currentMonth} />
            </div>
            <div className="lg:col-span-3">
              <DailyEvolutionChart data={dailyData} currentMonth={currentMonth} />
            </div>
          </div>
        </div>
      )}

      {/* ── Análise Detalhada ────────────────────────────────────────────────────── */}
      {selectedDay === 'all' && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Análise Detalhada</p>
          <div className="space-y-4 sm:space-y-6">
            {isSupervision && <PerformanceChart data={leaderboardData} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <RankingChart data={topEmployees} />
              <WeekdayChart data={weekdayData} />
            </div>
          </div>
        </div>
      )}

      {selectedDay !== 'all' && (
        <DistributionChart
          employees={employees}
          attendance={attendance}
          selectedDay={selectedDay as number}
        />
      )}

      {/* ── Detalhamento por Funcionário ───────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detalhamento por Funcionário</p>
        <EmployeeTable
          selectedDay={selectedDay}
          isSupervision={isSupervision}
          filteredEmployees={filteredEmployees}
          notes={notes}
          attendance={attendance}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          getStatusForDay={getStatusForDay}
          setSelectedEmployeeDetail={setSelectedEmployeeDetail}
          getInitials={getInitials}
        />
      </div>
    </div>
  );
}
