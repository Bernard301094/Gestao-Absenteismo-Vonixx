import React from 'react';
import {
  Search, Filter, ArrowUpDown, ArrowDown,
  TrendingUp, TrendingDown, Minus, MessageSquare, Activity
} from 'lucide-react';
import type { EmployeeWithStats, AttendanceRecord, NotesRecord } from '../../../types';

const STATUS_LABELS: Record<string, string> = {
  P: 'Presente',
  F: 'Falta',
  Fe: 'Férias',
  A: 'Afastamento',
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-purple-100 text-purple-600',
  'bg-emerald-100 text-emerald-600',
  'bg-orange-100 text-orange-600',
];

interface EmployeeTableProps {
  selectedDay: number | 'all';
  isSupervision: boolean;
  filteredEmployees: EmployeeWithStats[];
  notes: NotesRecord;
  attendance: AttendanceRecord;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (sf: any) => void;
  sortOrder: string;
  setSortOrder: (so: any) => void;
  getStatusForDay: (empId: string, day: number) => string;
  setSelectedEmployeeDetail: (emp: any) => void;
  getInitials: (name: string) => string;
}

export default function EmployeeTable({
  selectedDay,
  isSupervision,
  filteredEmployees,
  notes,
  attendance,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  getStatusForDay,
  setSelectedEmployeeDetail,
  getInitials,
}: EmployeeTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[500px] sm:max-h-[600px] lg:max-h-[700px] transition-all duration-300 hover:shadow-2xl">
      {/* Table Header / Filters */}
      <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col gap-4 shrink-0">
        {/* Title row */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Detalhamento</h2>
            <div className="hidden sm:flex items-center gap-2 text-gray-500">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-xs sm:text-sm font-medium">Acompanhamento individual de faltas no mês.</p>
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white/50"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-auto pl-11 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none bg-white cursor-pointer hover:bg-gray-50 transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="regular">Regular (0)</option>
              <option value="atencao">Atenção (1-3)</option>
              <option value="critico">Crítico (4+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <tr>
              <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <button
                  onClick={() => setSortOrder((prev: string) => prev === 'asc_name' ? 'desc_name' : 'asc_name')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                >
                  Funcionário
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
              <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">ID</th>
              <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">
                {selectedDay === 'all' ? (
                  <button
                    onClick={() => setSortOrder('desc_faltas')}
                    className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors w-full group"
                  >
                    Faltas no Mês
                    <ArrowDown className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'desc_faltas' ? 'scale-110 text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ) : 'Status do Dia'}
              </th>
              {selectedDay === 'all' && (
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Tendência</th>
              )}
              {selectedDay !== 'all' && (
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Observações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEmployees.map((emp, idx) => {
              const status = selectedDay !== 'all' ? getStatusForDay(emp.id, selectedDay as number) : null;
              return (
                <tr
                  key={emp.id}
                  className={`group hover:bg-blue-50/30 transition-all duration-200 ${isSupervision ? 'cursor-pointer' : ''}`}
                  onClick={() => isSupervision && setSelectedEmployeeDetail(emp)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm transition-transform group-hover:scale-110 ${AVATAR_COLORS[idx % 4]}`}>
                        {getInitials(emp.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{emp.name}</span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">Membro da Equipe</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="inline-flex px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-mono font-bold">
                      #{emp.id.padStart(3, '0')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {selectedDay === 'all' ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-black ${emp.faltas > 3 ? 'text-red-600' : emp.faltas > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                          {emp.faltas}
                        </span>
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${emp.faltas > 3 ? 'bg-red-500' : emp.faltas > 0 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                            style={{ width: `${Math.min((emp.faltas / 5) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm ${
                        status === 'P' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                        status === 'F' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                        status === 'Fe' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                        'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          status === 'P' ? 'bg-emerald-500' :
                          status === 'F' ? 'bg-red-500' :
                          status === 'Fe' ? 'bg-blue-500' : 'bg-amber-500'
                        }`} />
                        {status ? STATUS_LABELS[status] || status : '-'}
                      </span>
                    )}
                  </td>
                  {selectedDay === 'all' && (
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        {emp.trend === 'up' ? (
                          <div className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Alta</span>
                          </div>
                        ) : emp.trend === 'down' ? (
                          <div className="flex items-center gap-1 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Baixa</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                            <Minus className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Estável</span>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {selectedDay !== 'all' && (
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-500 italic text-xs">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {notes[emp.id]?.[selectedDay as number] || 'Sem observações'}
                        </span>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest shrink-0">
        <span>Total: {filteredEmployees.length} Funcionários</span>
        {selectedDay === 'all' && (
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Regular</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /> Atenção</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Crítico</div>
          </div>
        )}
      </div>
    </div>
  );
}
