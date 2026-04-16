import React, { useState, useEffect } from 'react';
import { Download, Bot, Sparkles, Loader2 } from 'lucide-react';
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
    try {
      const insights = await analyzePatterns(weekdayData);
      setAiInsights(insights);
    } catch (error) {
      console.error(error);
      setAiInsights('Erro ao gerar insights. Verifique se as chaves de API estão configuradas nas configurações do projeto.');
    } finally {
      setIsAnalyzingPatterns(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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

      {/* ── AI Insights Card (Pattern Detection) ─────────────────────────── */}
      {selectedDay === 'all' && (
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-5 sm:p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-800/50 border border-blue-700/50 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="text-white font-black text-base sm:text-lg tracking-tight">Insights de IA</h3>
                <p className="text-blue-200/70 text-xs sm:text-sm font-medium mt-0.5">
                  Detecte padrões de comportamento e tendências de absenteísmo no mês.
                </p>
              </div>
            </div>
            {!aiInsights && (
              <button
                onClick={handleAnalyzePatterns}
                disabled={isAnalyzingPatterns}
                className="shrink-0 flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 disabled:bg-white/80 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                {isAnalyzingPatterns ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                Analisar Padrões
              </button>
            )}
          </div>
          
          {aiInsights && (
            <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white text-sm font-medium leading-relaxed whitespace-pre-wrap">
              {aiInsights}
            </div>
          )}
        </div>
      )}

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
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

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
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
            {selectedDay === 'all' ? 'Absenteísmo' : 'Presentes'}
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

      {/* ═══════════════════════════════════════════════════════════════════
          ZONA 1 — Evolução do Mês  (DailyTable + LineChart lado a lado)
          ═══════════════════════════════════════════════════════════════════ */}
      {selectedDay === 'all' && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Evolução do Mês
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* DailyTable — stacked on mobile, sidebar on desktop */}
            <div className="lg:col-span-1 h-[280px] sm:h-[340px] lg:h-[420px]">
              <DailyTable data={dailyData} currentMonth={currentMonth} />
            </div>
            {/* Daily Evolution chart */}
            <div className="lg:col-span-3">
              <DailyEvolutionChart data={dailyData} currentMonth={currentMonth} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ZONA 2 — Análise Detalhada  (Ranking + Weekday, Performance full)
          ═══════════════════════════════════════════════════════════════════ */}
      {selectedDay === 'all' && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Análise Detalhada
          </p>
          <div className="space-y-4 sm:space-y-6">
            {isSupervision && (
              <PerformanceChart data={leaderboardData} />
            )}
            {/* Ranking + Weekday — stack on mobile, 2 cols on lg */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <RankingChart data={topEmployees} />
              <WeekdayChart data={weekdayData} />
            </div>
          </div>
        </div>
      )}

      {/* Vista de dia único — Distribution chart */}
      {selectedDay !== 'all' && (
        <DistributionChart
          employees={employees}
          attendance={attendance}
          selectedDay={selectedDay as number}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ZONA 3 — Detalhamento por Funcionário
          ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          Detalhamento por Funcionário
        </p>
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
