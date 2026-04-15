import React from 'react';
import { X, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';

interface EmployeeDetailModalProps {
  selectedEmployeeDetail: any | null;
  setSelectedEmployeeDetail: (emp: any | null) => void;
  getInitials: (name: string) => string;
  globalAttendance: any;
  VALID_WORK_DAYS: number[];
  employeeData: any[];
  daysInMonth: number;
  currentMonth: number;
  currentYear: number;
  isWorkDay: (day: number, month: number, year: number) => boolean;
  getWeekdayName: (day: number, month: number, year: number) => string;
}

export default function EmployeeDetailModal({
  selectedEmployeeDetail,
  setSelectedEmployeeDetail,
  getInitials,
  globalAttendance,
  VALID_WORK_DAYS,
  employeeData,
  daysInMonth,
  currentMonth,
  currentYear,
  isWorkDay,
  getWeekdayName
}: EmployeeDetailModalProps) {
  if (!selectedEmployeeDetail) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-blue-900 to-blue-800 text-white shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black">
                {getInitials(selectedEmployeeDetail.name)}
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">{selectedEmployeeDetail.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">ID: #{selectedEmployeeDetail.id.padStart(3, '0')}</span>
                  <span className="px-2 py-0.5 bg-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-widest">Ativo</span>
                  {selectedEmployeeDetail.admissionDate && (
                    <span className="px-2 py-0.5 bg-blue-500 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      Adm: {(() => {
                        if (!selectedEmployeeDetail.admissionDate) return 'N/A';
                        const parts = selectedEmployeeDetail.admissionDate.split('-').map(Number);
                        if (parts.length === 3) {
                          const [y, m, d] = parts;
                          return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
                        }
                        return selectedEmployeeDetail.admissionDate;
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedEmployeeDetail(null)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Total de Faltas</span>
              <span className="text-3xl font-black text-red-600">
                {Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length}
              </span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Assiduidade</span>
              <span className="text-3xl font-black text-blue-600">
                {VALID_WORK_DAYS.length === 0 ? 0 : Math.round((1 - (Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length / VALID_WORK_DAYS.length)) * 100)}%
              </span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tendência</span>
              <div className="flex items-center gap-2">
                {employeeData.find(e => e.id === selectedEmployeeDetail.id)?.trend === 'up' ? (
                  <TrendingUp className="w-6 h-6 text-red-500" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-emerald-500" />
                )}
                <span className="text-lg font-bold text-gray-700 capitalize">
                  {employeeData.find(e => e.id === selectedEmployeeDetail.id)?.trend === 'up' ? 'Em Alta' : 'Em Baixa'}
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Heatmap / Pattern Analysis */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Análise de Padrões (Dias de Trabalho)
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isWork = isWorkDay(day, currentMonth, currentYear);
                const status = globalAttendance[selectedEmployeeDetail.id]?.[day];
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                
                return (
                  <div 
                    key={day}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${
                      !isWork ? 'bg-gray-50 border-gray-100 opacity-30' :
                      status === 'F' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' :
                      status === 'Fe' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      status === 'A' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-emerald-50 border-emerald-200 text-emerald-700'
                    } ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                  >
                    <span className="text-[10px] font-bold opacity-50">{day}</span>
                    {isWork && (
                      <span className="text-xs font-black">
                        {status || 'P'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekday Frequency */}
          <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Frequência por Dia da Semana</h3>
            <div className="space-y-3">
              {['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'].map(wd => {
                const dayFaltas = Object.entries(globalAttendance[selectedEmployeeDetail.id] || {})
                  .filter(([d, s]) => s === 'F' && getWeekdayName(Number(d), currentMonth, currentYear) === wd)
                  .length;
                
                if (dayFaltas === 0) return null;

                return (
                  <div key={wd} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 capitalize">{wd}</span>
                    <div className="flex items-center gap-3 flex-1 mx-4">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex-1">
                        <div 
                          className="h-full bg-red-500 rounded-full" 
                          style={{ width: `${Math.min((dayFaltas / 4) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-red-600 w-16 text-right">{dayFaltas} Faltas</span>
                    </div>
                  </div>
                );
              })}
              {Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">Nenhum padrão de falta detectado este mês.</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button 
            onClick={() => setSelectedEmployeeDetail(null)}
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
          >
            Fechar Perfil
          </button>
        </div>
      </div>
    </div>
  );
}
