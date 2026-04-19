import React from 'react';
import { Download } from 'lucide-react';
import { exportToPDF } from '../../utils/exportPDF';
import type {
  Employee, AttendanceRecord, NotesRecord,
  EmployeeWithStats, DayData, WeekdayData, LeaderboardEntry, Alert,
  Vacation,
} from '../../types';

import PerformanceChart from '../Charts/PerformanceChart';
import RankingChart from '../Charts/RankingChart';
import WeekdayChart from '../Charts/WeekdayChart';
import DailyEvolutionChart from '../Charts/DailyEvolutionChart';
import DistributionChart from '../Charts/DistributionChart';
import EmployeeTable from '../Charts/EmployeeTable';
import DailyTable from '../Charts/DailyTable';
import AIInsightsPanel from './AIInsightsPanel';

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
  currentShift: string | null;
  lockedDays: Record<number, boolean>;
  validWorkDays: number[];
  vacations: Vacation[];
  activeEmployeesCount: number;   // ← NOVO
  showDismissed: boolean;         // ← NOVO
  setShowDismissed: (v: boolean) => void; // ← NOVO
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
  currentShift,
  lockedDays,
  validWorkDays,
  vacations,
  activeEmployeesCount,
  showDismissed,
  setShowDismissed,
}: DashboardProps) {

  const handleExportPDF = () => {
    exportToPDF(
      isSupervision ? 'Supervisão' : 'Turno Atual',
      employees,
      attendance,
      selectedDay,
      currentMonth,
      currentYear,
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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

      {/* ── AI Reports Panel ─────────────────────────────────────────────────── */}
      {selectedDay === 'all' && (
        <AIInsightsPanel
          shift={currentShift}
          employees={employees}
          attendance={attendance}
          notes={notes}
          vacations={vacations}
          lockedDays={lockedDays}
          currentMonth={currentMonth}
          currentYear={currentYear}
          validWorkDays={validWorkDays}
          isSupervision={isSupervision}
        />
      )}

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
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

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">
            {selectedDay === 'all' ? 'Total Faltas' : 'Faltas Dia'}
          </h3>
          <div className="text-3xl sm:text-4xl font-extrabold text-red-600">
            {selectedDay === 'all'
              ? totalFaltasMes
              : employees.filter(emp => !emp.dismissed && getStatusForDay(emp.id, selectedDay as number) === 'F').length}
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">
            {selectedDay === 'all' ? 'Absenteísmo' : 'Presentes'}
          </h3>
          <div className="text-3xl sm:text-4xl font-extrabold text-orange-600">
            {selectedDay === 'all'
              ? `${taxaAbsenteismo}%`
              : employees.filter(emp => !emp.dismissed && getStatusForDay(emp.id, selectedDay as number) === 'P').length}
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">Funcionários</h3>
          {/* Mostra só ativos no KPI */}
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-600">{activeEmployeesCount}</div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">
            {selectedDay === 'all' ? 'Mais Faltas' : 'Afast./Férias'}
          </h3>
          <div className="text-sm sm:text-lg font-bold text-green-700 leading-tight uppercase">
            {selectedDay === 'all'
              ? (topEmployee?.name ?? '-')
              : employees.filter(emp => !emp.dismissed && ['Fe', 'A'].includes(attendance[emp.id]?.[selectedDay as number] || 'P')).length}
          </div>
          {selectedDay === 'all' && topEmployee && (
            <div className="text-xs sm:text-sm font-bold text-green-600">({topEmployee.faltas} Faltas no mês)</div>
          )}
        </div>
      </div>

      {/* ── Evolução do Mês ──────────────────────────────────────────────────── */}
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

      {/* ── Análise Detalhada ─────────────────────────────────────────────────── */}
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

      {/* ── Distribuição do Dia ───────────────────────────────────────────────── */}
      {selectedDay !== 'all' && (
        <DistributionChart
          employees={employees}
          getStatusForDay={getStatusForDay}
          selectedDay={selectedDay as number}
        />
      )}

      {/* ── Detalhamento por Funcionário ──────────────────────────────────────── */}
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
          showDismissed={showDismissed}
          setShowDismissed={setShowDismissed}
        />
      </div>
    </div>
  );
}
