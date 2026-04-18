import React from 'react';
import {
  Search, ArrowUpDown, ArrowDown,
  TrendingUp, TrendingDown, Minus, MessageSquare, Activity, ChevronRight, FileText
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
  'bg-slate-800 text-slate-400 border border-slate-700',
  'bg-slate-800 text-slate-400 border border-slate-700',
  'bg-slate-800 text-slate-400 border border-slate-700',
  'bg-slate-800 text-slate-400 border border-slate-700',
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
    <div className="bg-[#0f1e36] rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col max-h-[700px]">
      
      {/* ── Header / Filtros ── */}
      <div className="p-5 border-b border-slate-700/50 bg-slate-900/20 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Detalhamento Operacional</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-800/50 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500/50 transition-all"
            />
          </div>
          <CustomDropdown
            variant="dark"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'Todos os Status' },
              { value: 'regular', label: 'Regular' },
              { value: 'atencao', label: 'Atenção' },
              { value: 'critico', label: 'Crítico' }
            ]}
            className="sm:w-44"
          />
        </div>
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden sm:block overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0f1e36] z-10">
            <tr className="border-b border-slate-700/50">
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <button onClick={() => setSortOrder(sortOrder === 'asc_name' ? 'desc_name' : 'asc_name')} className="flex items-center gap-2 hover:text-white transition-colors">
                  Funcionário <ArrowUpDown size={10} />
                </button>
              </th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">ID</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                {selectedDay === 'all' ? 'Faltas no Mês' : 'Status do Dia'}
              </th>
              {selectedDay === 'all' && (
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Tendência</th>
              )}
              {selectedDay !== 'all' && (
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Observações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredEmployees.map((emp) => {
              const status = selectedDay !== 'all' ? getStatusForDay(emp.id, selectedDay as number) : null;
              return (
                <tr 
                  key={emp.id} 
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  onClick={() => isSupervision && setSelectedEmployeeDetail(emp)}
                >
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {getInitials(emp.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-slate-200 truncate">{emp.name}</span>
                          {/* Ícones de tendência discretos */}
                          {selectedDay !== 'all' && emp.trend !== 'neutral' && (
                            <span>
                              {emp.trend === 'up' ? <TrendingUp size={12} className="text-red-500" /> : <TrendingDown size={12} className="text-emerald-500" />}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{emp.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <span className="text-[10px] font-mono text-slate-500">#{emp.id.padStart(3, '0')}</span>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    {selectedDay === 'all' ? (
                      <span className={`text-sm font-black font-mono ${emp.faltas > 3 ? 'text-red-400' : emp.faltas > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {emp.faltas}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        status === 'P' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        status === 'F' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        status === 'Fe' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                        'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {status ? STATUS_LABELS[status] : '—'}
                      </span>
                    )}
                  </td>
                  {selectedDay === 'all' && (
                    <td className="py-3.5 px-6">
                      <div className="flex justify-center">
                        {emp.trend === 'up' ? (
                          <div className="flex items-center gap-1 text-red-500/80 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10">
                            <TrendingUp size={10} /> <span className="text-[9px] font-black uppercase">Piorando</span>
                          </div>
                        ) : emp.trend === 'down' ? (
                          <div className="flex items-center gap-1 text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                            <TrendingDown size={10} /> <span className="text-[9px] font-black uppercase">Melhor</span>
                          </div>
                        ) : (
                          <Minus size={12} className="text-slate-700" />
                        )}
                      </div>
                    </td>
                  )}
                  {selectedDay !== 'all' && (
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2 text-slate-500 italic text-[11px] truncate max-w-[150px]">
                        <MessageSquare size={12} /> {notes[emp.id]?.[selectedDay as number] || '—'}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile View (Accordion) ── */}
      <div className="sm:hidden overflow-auto p-4 space-y-2 bg-slate-900/20">
        {filteredEmployees.map((emp) => {
          const isExpanded = expandedId === emp.id;
          const status = selectedDay !== 'all' ? getStatusForDay(emp.id, selectedDay as number) : null;
          return (
            <div key={emp.id} className={`bg-slate-800/40 border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-slate-700/50'}`}>
              <div onClick={() => setExpandedId(isExpanded ? null : emp.id)} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">{getInitials(emp.name)}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">{emp.name}</span>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{emp.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {selectedDay === 'all' ? (
                    <span className={`text-sm font-black font-mono ${emp.faltas > 3 ? 'text-red-400' : emp.faltas > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>{emp.faltas}f</span>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${status === 'P' ? 'bg-emerald-500' : status === 'F' ? 'bg-red-500' : status === 'Fe' ? 'bg-sky-500' : 'bg-slate-700'}`} />
                  )}
                  <ChevronRight size={14} className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-700/30 bg-slate-900/20 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ID Registro</p>
                      <p className="text-[10px] text-slate-300 font-mono">#{emp.id.padStart(3, '0')}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tendência</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {emp.trend === 'up' ? <TrendingUp size={12} className="text-red-500" /> : <TrendingDown size={12} className="text-emerald-500" />}
                        <span className={`text-[10px] font-black uppercase ${emp.trend === 'up' ? 'text-red-500' : 'text-emerald-500'}`}>{emp.trend === 'up' ? 'Piorando' : 'Melhor'}</span>
                      </div>
                    </div>
                  </div>
                  {isSupervision && (
                    <button 
                      onClick={() => setSelectedEmployeeDetail(emp)}
                      className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <FileText size={12} className="text-sky-400" /> Ver Dossiê Completo
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/40 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Equipe: {filteredEmployees.length}</span>
        <div className="flex gap-4">
           {['Regular', 'Atenção', 'Crítico'].map((label, i) => (
             <div key={label} className="flex items-center gap-1.5">
               <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-orange-400' : 'bg-red-500'}`} />
               <span className="text-[9px] text-slate-600 font-bold uppercase">{label}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}