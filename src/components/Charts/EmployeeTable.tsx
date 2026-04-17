import React from 'react';
import {
  Search, Filter, ArrowUpDown, ArrowDown,
  TrendingUp, TrendingDown, Minus, MessageSquare, Activity, MoveHorizontal, BrainCircuit, ChevronRight
} from 'lucide-react';
import type { EmployeeWithStats, AttendanceRecord, NotesRecord } from '../../types';
import CustomDropdown from '../CustomDropdown';

const STATUS_LABELS: Record<string, string> = {
  P: 'Presente',
  F: 'Falta',
  Fe: 'Férias',
  A: 'Afastamento',
};

const AVATAR_COLORS = [
  'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  'bg-violet-50 text-violet-600 ring-1 ring-violet-200',
  'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
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
  setSortOrder: (so: string) => void;
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
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[500px] sm:max-h-[600px] lg:max-h-[700px] transition-all duration-300">
        
        {/* ── Header / Filters ── */}
        <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col gap-4 shrink-0">
          
          {/* Title row */}
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-sm" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Detalhamento
                </h2>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-[11px] text-gray-500 font-medium tracking-wide">
                  Acompanhamento individual de faltas no mês
                </p>
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <CustomDropdown
                variant="light"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'all', label: 'Todos os Status' },
                  { value: 'regular', label: 'Regular (0)' },
                  { value: 'atencao', label: 'Atenção (1-3)' },
                  { value: 'critico', label: 'Crítico (4+)' }
                ]}
                className="w-full sm:w-[180px]"
              />
            </div>
          </div>
        </div>

        {/* ── Desktop Table View ── */}
        <div className="hidden sm:block overflow-x-auto overflow-y-auto flex-1 custom-scrollbar relative">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-white/90 backdrop-blur-md sticky top-0 z-20">
              <tr>
                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.13em] border-b border-gray-100">
                  <button
                    onClick={() =>
                      setSortOrder(sortOrder === 'asc_name' ? 'desc_name' : 'asc_name')
                    }
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                  >
                    Funcionário
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </th>

                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.13em] border-b border-gray-100 text-center">
                  ID
                </th>

                <th className="py-3.5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.13em] border-b border-gray-100 text-center">
                  {selectedDay === 'all' ? (
                    <button
                      onClick={() => setSortOrder('desc_faltas')}
                      className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors w-full group"
                    >
                      Faltas no Mês
                      <ArrowDown
                        className={`w-3 h-3 transition-all ${
                          sortOrder === 'desc_faltas'
                            ? 'text-blue-500 scale-110'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </button>
                  ) : (
                    'Status do Dia'
                  )}
                </th>

                {selectedDay === 'all' && (
                  <th
                    title="Compara as faltas da 2ª quinzena com a 1ª quinzena"
                    className="py-3.5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.13em] border-b border-gray-100 text-center cursor-help"
                  >
                    Tendência{' '}
                    <span className="text-gray-400 text-[9px] not-uppercase">ⓘ</span>
                  </th>
                )}

                {selectedDay !== 'all' && (
                  <th className="py-3.5 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.13em] border-b border-gray-100">
                    Observações
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map((emp, idx) => {
                const status =
                  selectedDay !== 'all'
                    ? getStatusForDay(emp.id, selectedDay as number)
                    : null;

                return (
                  <tr
                    key={emp.id}
                    className={`transition-colors duration-150 hover:bg-blue-50/40 ${
                      isSupervision ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => isSupervision && setSelectedEmployeeDetail(emp)}
                  >
                    {/* Name */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-transform duration-200 hover:scale-110 ${AVATAR_COLORS[idx % 4]}`}
                        >
                          {getInitials(emp.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-semibold text-gray-900 truncate tracking-tight">
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wide mt-0.5">
                            {emp.role || 'Membro da Equipe'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-3.5 px-6 text-center">
                      <span className="text-[11px] text-gray-500 font-mono font-bold bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">
                        #{emp.id.padStart(3, '0')}
                      </span>
                    </td>

                    {/* Faltas / Status */}
                    <td className="py-3.5 px-6 text-center">
                      {selectedDay === 'all' ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={`text-xl font-bold tracking-tight font-mono ${
                              emp.faltas > 3
                                ? 'text-red-600'
                                : emp.faltas > 0
                                ? 'text-orange-500'
                                : 'text-emerald-500'
                            }`}
                          >
                            {emp.faltas}
                          </span>
                          <div className="w-11 h-[3px] rounded-full overflow-hidden bg-gray-100">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                emp.faltas > 3
                                  ? 'bg-red-500'
                                  : emp.faltas > 0
                                  ? 'bg-orange-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min((emp.faltas / 5) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm ${
                            status === 'P'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : status === 'F'
                              ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                              : status === 'Fe'
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                              status === 'P'
                                ? 'bg-emerald-500'
                                : status === 'F'
                                ? 'bg-red-500'
                                : status === 'Fe'
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {status ? STATUS_LABELS[status] || status : '—'}
                        </span>
                      )}
                    </td>

                    {/* Tendência */}
                    {selectedDay === 'all' && (
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex justify-center">
                            {emp.trend === 'up' ? (
                              <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-red-600 cursor-help transition-transform hover:scale-105"
                                title="Piorando: Faltas aumentaram na 2ª quinzena"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                  Piorando
                                </span>
                              </div>
                            ) : emp.trend === 'down' ? (
                              <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 cursor-help transition-transform hover:scale-105"
                                title="Melhorando: Faltas reduziram na 2ª quinzena"
                              >
                                <TrendingDown className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                  Melhor
                                </span>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 cursor-help transition-transform hover:scale-105"
                                title="Estável: Sem aumento de faltas"
                              >
                                <Minus className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">
                                  Estável
                                </span>
                              </div>
                            )}
                          </div>

                          {isSupervision && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 animate-pulse transition-opacity">
                              <BrainCircuit className="w-3 h-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest">IA Disponível</span>
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Observações */}
                    {selectedDay !== 'all' && (
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2 text-gray-500 italic text-[12px]">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
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

        {/* ── Mobile Accordion View ── */}
        <div className="sm:hidden overflow-y-auto flex-1 custom-scrollbar bg-gray-50/50 p-3 space-y-2">
          {filteredEmployees.map((emp, idx) => {
            const status =
              selectedDay !== 'all'
                ? getStatusForDay(emp.id, selectedDay as number)
                : null;
            const isExpanded = expandedId === emp.id;

            return (
              <div
                key={emp.id}
                className={`bg-white border rounded-2xl shadow-sm transition-all duration-200 overflow-hidden ${
                  isExpanded ? 'border-blue-200 ring-2 ring-blue-500/5' : 'border-gray-100'
                }`}
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                  className="flex items-center justify-between p-3 cursor-pointer active:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${AVATAR_COLORS[idx % 4]}`}>
                      {getInitials(emp.name)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-gray-900 leading-tight uppercase truncate max-w-[140px]">
                        {emp.name}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                        {emp.role || 'Equipe'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-end">
                      {selectedDay === 'all' ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-black font-mono ${
                            emp.faltas > 3 ? 'text-red-600' : emp.faltas > 0 ? 'text-orange-500' : 'text-emerald-500'
                          }`}>
                            {emp.faltas}f
                          </span>
                        </div>
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${
                          status === 'P' ? 'bg-emerald-500' : status === 'F' ? 'bg-red-500' : status === 'Fe' ? 'bg-blue-500' : 'bg-amber-500'
                        }`} />
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-50">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Identificador</span>
                        <span className="text-[10px] text-gray-600 font-mono font-bold">#{emp.id.padStart(3, '0')}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                          {selectedDay === 'all' ? 'Tendência' : 'Status Completo'}
                        </span>
                        {selectedDay === 'all' ? (
                          <div className="flex items-center gap-1">
                            {emp.trend === 'up' ? <TrendingUp className="w-3 h-3 text-red-500" /> : emp.trend === 'down' ? <TrendingDown className="w-3 h-3 text-emerald-500" /> : <Minus className="w-3 h-3 text-gray-400" />}
                            <span className={`text-[10px] font-black uppercase ${
                              emp.trend === 'up' ? 'text-red-600' : emp.trend === 'down' ? 'text-emerald-600' : 'text-gray-500'
                            }`}>
                              {emp.trend === 'up' ? 'Piorando' : emp.trend === 'down' ? 'Melhor' : 'Estável'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-gray-700 uppercase">
                            {status ? STATUS_LABELS[status] || status : '—'}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Observações do Dia</span>
                        <div className="flex items-center gap-1.5 text-gray-500 italic text-[10px] bg-gray-50 p-2 rounded-lg border border-gray-100/50">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="leading-tight">
                            {notes[emp.id]?.[selectedDay as number] || 'Sem observações registradas.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    {isSupervision && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployeeDetail(emp);
                        }}
                        className="w-full flex items-center justify-between p-3 mt-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-[0.97]"
                      >
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" />
                          <span className="text-[11px] font-black uppercase tracking-wider">Ver Detalhes & IA</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Total: {filteredEmployees.length} Funcionários
          </span>

          {selectedDay === 'all' && (
            <div className="flex items-center gap-4">
              {[
                { color: 'bg-emerald-500', label: 'Regular' },
                { color: 'bg-orange-400', label: 'Atenção' },
                { color: 'bg-red-500', label: 'Crítico' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
