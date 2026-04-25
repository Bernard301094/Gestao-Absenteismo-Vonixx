import React, { useMemo, useState } from 'react';
import { Download, FileWarning, UserMinus, QrCode, ChevronDown, ChevronUp } from 'lucide-react';
import { exportToPDF } from '../../utils/exportPDF';
import { wasActiveOnDay } from '../../hooks/useFirestoreData';
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
import QRCodePanel from '../QRCodePanel/QRCodePanel';

const BASE_KIOSK_URL = `${window.location.origin}/presenca`;

interface DashboardProps {
  handleExportExcel: () => void;
  isSupervision: boolean;
  alerts: Alert[];
  selectedDay: number | 'all';
  currentMonth: number;
  currentYear: number;
  totalFaltasMes: number;
  employees: Employee[];
  rawEmployees: Employee[];
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
  activeEmployeesCount: number;
  showDismissed: boolean;
  setShowDismissed: (v: boolean) => void;
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
  rawEmployees,
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

  const [showQR, setShowQR] = useState(false);

  const kioskUrl = `${BASE_KIOSK_URL}?shift=${currentShift ?? 'A'}`;

  const handleExportPDF = () => {
    exportToPDF(
      isSupervision ? 'Supervisão' : 'Turno Atual',
      employees,
      attendance,
      selectedDay,
      currentMonth,
      currentYear,
      undefined,
      notes,
    );
  };

  const atestadoAlerts = useMemo(() => {
    let newAlerts: any[] = [];
    if (selectedDay === 'all') {
      const todosAtestados: { day: number, name: string, note: string }[] = [];
      employees.forEach(emp => {
        const empNotes = notes[emp.id];
        if (!empNotes) return;
        Object.entries(empNotes).forEach(([d, note]) => {
          if (note.toLowerCase().includes('atestado')) {
            todosAtestados.push({ day: Number(d), name: emp.name, note });
          }
        });
      });
      todosAtestados.sort((a, b) => b.day - a.day);
      todosAtestados.slice(0, 4).forEach(at => {
        newAlerts.push({
          type: 'warning',
          icon: FileWarning,
          message: `Atestado (Dia ${at.day}): ${at.name} - ${at.note}`
        });
      });
      if (todosAtestados.length > 4) {
        newAlerts.push({
          type: 'warning',
          icon: FileWarning,
          message: `Existem mais ${todosAtestados.length - 4} atestados registrados neste mês.`
        });
      }
    } else {
      const withAtestado = employees.filter(emp => {
        const note = notes[emp.id]?.[selectedDay as number] || '';
        return note.toLowerCase().includes('atestado');
      });
      newAlerts = withAtestado.map(emp => ({
        type: 'warning',
        icon: FileWarning,
        message: `Atestado Médico: ${emp.name} possui um atestado registrado neste dia.`
      }));
    }
    return newAlerts as Alert[];
  }, [employees, notes, selectedDay]);

  const dismissedAlerts = useMemo(() => {
    const refDay = selectedDay === 'all'
      ? new Date().getDate()
      : (selectedDay as number);
    const hiddenNow = rawEmployees.filter(emp =>
      emp.dismissed && !wasActiveOnDay(emp, refDay, currentMonth, currentYear)
    );
    if (hiddenNow.length === 0) return [];
    const names = hiddenNow.slice(0, 3).map(e => e.name).join(', ');
    const extra = hiddenNow.length > 3 ? ` e mais ${hiddenNow.length - 3}` : '';
    return [{
      type: 'info',
      icon: UserMinus,
      message: `Observação: ${hiddenNow.length} funcionário(s) oculto(s) nesta data (${names}${extra}). Demitido(s) a partir do dia ${String(refDay).padStart(2,'0')}/${String(currentMonth + 1).padStart(2,'0')} ou antes.`
    }];
  }, [rawEmployees, selectedDay, currentMonth, currentYear]);

  const combinedAlerts = [...(isSupervision ? alerts : []), ...atestadoAlerts, ...dismissedAlerts];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header + QR (mesma coluna, empilhados) ── */}
      <div className="flex flex-col gap-3">

        {/* Linha do título + botões */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 uppercase tracking-tight">Visão Geral do Mês</h2>
          <div className="flex flex-wrap items-center gap-2 self-start xs:self-auto">

            {!isSupervision && (
              <button
                onClick={() => setShowQR(v => !v)}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                QR Presença
                {showQR ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Painel QR — ocupa toda a largura, logo abaixo dos botões */}
        {showQR && !isSupervision && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <QRCodePanel baseUrl={kioskUrl} />
          </div>
        )}
      </div>

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

      {combinedAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-500">
          {combinedAlerts.map((alert, idx) => {
            let bgClass = 'bg-gray-50 border-gray-200 text-gray-700';
            let iconBgClass = 'bg-gray-200 text-gray-600';
            if (alert.type === 'critical') { bgClass = 'bg-red-50 border-red-100 text-red-800'; iconBgClass = 'bg-red-100 text-red-600'; }
            else if (alert.type === 'warning') { bgClass = 'bg-amber-50 border-amber-200 text-amber-900'; iconBgClass = 'bg-amber-100 text-amber-700'; }
            else if (alert.type === 'info') { bgClass = 'bg-slate-50 border-slate-200 text-slate-700'; iconBgClass = 'bg-slate-200 text-slate-600'; }
            return (
              <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm ${bgClass}`}>
                <div className={`p-2 rounded-xl ${iconBgClass}`}>
                  <alert.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold leading-tight flex-1">{alert.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI Cards */}
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
            {selectedDay === 'all' ? 'Absentesmo' : 'Presentes'}
          </h3>
          <div className="text-3xl sm:text-4xl font-extrabold text-orange-600">
            {selectedDay === 'all'
              ? `${taxaAbsenteismo}%`
              : employees.filter(emp => getStatusForDay(emp.id, selectedDay as number) === 'P').length}
          </div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col items-start gap-1 sm:gap-2 hover:shadow-md transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider leading-snug">Funcionários</h3>
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-600">{activeEmployeesCount}</div>
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
          getStatusForDay={getStatusForDay}
          selectedDay={selectedDay as number}
        />
      )}

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
