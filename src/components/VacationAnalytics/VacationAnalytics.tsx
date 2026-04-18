import React from 'react';
import { X, Calendar, User, Briefcase, Clock, FileText } from 'lucide-react';
import { getWeekdayName } from '../../utils/dateUtils';

interface EmployeeDetailModalProps {
  selectedEmployeeDetail: any;
  setSelectedEmployeeDetail: (emp: any) => void;
  getInitials: (name: string) => string;
  globalAttendance: any;
  VALID_WORK_DAYS: number[];
  employeeData: any;
  daysInMonth: number;
  currentMonth: number;
  currentYear: number;
}

export default function EmployeeDetailModal({
  selectedEmployeeDetail: emp,
  setSelectedEmployeeDetail,
  getInitials,
  globalAttendance,
  VALID_WORK_DAYS,
  currentMonth,
  currentYear,
}: EmployeeDetailModalProps) {
  
  const attendance = globalAttendance[emp.id] || {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header com Avatar */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button 
            onClick={() => setSelectedEmployeeDetail(null)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-sky-500/20">
              {getInitials(emp.name)}
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{emp.name}</h2>
              <div className="flex items-center gap-3 mt-1 opacity-70">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded">ID #{emp.id.padStart(3, '0')}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">{emp.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo: Histórico de Presença */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-slate-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Histórico de Escala (12x36)</h3>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {VALID_WORK_DAYS.map(day => {
              const status = attendance[day];
              const date = new Date(currentYear, currentMonth, day);
              
              return (
                <div key={day} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-sky-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[40px]">
                      <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{getWeekdayName(date).slice(0, 3)}</p>
                      <p className="text-sm font-black text-slate-800 leading-none mt-1">{day}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-100" />
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                      status === 'P' ? 'bg-emerald-500/10 text-emerald-600' :
                      status === 'F' ? 'bg-red-500/10 text-red-600' :
                      status === 'Fe' ? 'bg-sky-500/10 text-sky-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {status === 'P' ? 'Presente' : status === 'F' ? 'Falta' : status === 'Fe' ? 'Férias' : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
          <button 
            onClick={() => setSelectedEmployeeDetail(null)}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            Fechar Registro
          </button>
        </div>
      </div>
    </div>
  );
}