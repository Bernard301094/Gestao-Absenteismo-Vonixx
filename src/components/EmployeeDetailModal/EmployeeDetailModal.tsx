import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, CalendarDays, BrainCircuit, Loader2, RefreshCw, Activity } from 'lucide-react';
import { generateEmployeeInsight } from '../../services/aiService';
import { getHolidaysForYear } from '../../utils/holidays';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ReactMarkdown from 'react-markdown';

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
  supervisionShiftFilter: 'A' | 'B' | 'C' | 'D';
  isSupervision: boolean;
  currentShift: string | null;
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
  getWeekdayName,
  supervisionShiftFilter,
  isSupervision,
  currentShift
}: EmployeeDetailModalProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  const activeShift = isSupervision ? supervisionShiftFilter : (currentShift || 'A');

  // Logic to clear insight when employee or turn changes
  useEffect(() => {
    setInsight(null);
    setInsightError(null);
  }, [selectedEmployeeDetail?.id, activeShift, currentMonth, currentYear]);

  const fetchInsightFromDB = async () => {
    if (!selectedEmployeeDetail) return;
    
    // Use a local copy to prevent race conditions
    const currentEmpId = selectedEmployeeDetail.id;
    const currentReqShift = activeShift;
    const currentReqMonth = currentMonth;
    const currentReqYear = currentYear;

    setLoadingInsight(true);
    setInsightError(null);

    try {
      const insightDocId = `${currentEmpId}_${currentReqYear}_${currentReqMonth}_${currentReqShift}`;
      const insightRef = doc(db, 'ai_insights', insightDocId);

      const insightSnap = await getDoc(insightRef);
      
      // Ensure we are still looking at the same context
      if (selectedEmployeeDetail?.id === currentEmpId && 
          activeShift === currentReqShift && 
          currentMonth === currentReqMonth && 
          currentYear === currentReqYear) {
        if (insightSnap.exists()) {
          setInsight(insightSnap.data().insight);
        } else {
          setInsight(null);
        }
      }
    } catch (err: any) {
      console.error("Erro ao buscar insight salvo:", err);
    } finally {
      setLoadingInsight(false);
    }
  };

  const generateNewInsight = async () => {
    if (!selectedEmployeeDetail) return;
    
    const currentEmpId = selectedEmployeeDetail.id;
    const currentReqShift = activeShift;
    const currentReqMonth = currentMonth;
    const currentReqYear = currentYear;

    setLoadingInsight(true);
    setInsightError(null);
    setInsight(null);

    try {
      const insightDocId = `${currentEmpId}_${currentReqYear}_${currentReqMonth}_${currentReqShift}`;
      const insightRef = doc(db, 'ai_insights', insightDocId);

      const record = globalAttendance[currentEmpId] || {};
      const holidays = getHolidaysForYear(currentReqYear).filter(
        h => parseInt(h.date.split('-')[1], 10) === currentReqMonth + 1
      );
      
      const realSysDate = new Date();
      let dayInt = realSysDate.getDate();
      if (realSysDate.getMonth() !== currentReqMonth || realSysDate.getFullYear() !== currentReqYear) {
         dayInt = new Date(currentReqYear, currentReqMonth + 1, 0).getDate();
      }
      
      const currentDateString = `${currentReqYear}-${String(currentReqMonth + 1).padStart(2, '0')}-${String(dayInt).padStart(2, '0')}`;

      // Enviar definições de status para a IA não confundir
      const statusDefinitions = {
        'P': 'Presença Confirmada',
        'F': 'Falta Injustificada',
        'Fe': 'Férias (NÃO é falta)',
        'A': 'Afastamento Legal (NÃO é falta)'
      };

      const response = await generateEmployeeInsight(
        selectedEmployeeDetail,
        record,
        holidays,
        currentDateString
      );

      await setDoc(insightRef, {
        insight: response,
        employeeId: currentEmpId,
        year: currentReqYear,
        month: currentReqMonth,
        shift: currentReqShift,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (selectedEmployeeDetail?.id === currentEmpId && 
          activeShift === currentReqShift && 
          currentMonth === currentReqMonth && 
          currentYear === currentReqYear) {
        setInsight(response);
      }
    } catch (err: any) {
      setInsightError('Erro ao gerar insight. Verifique se as chaves de API estão configuradas nas configurações do projeto.');
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeDetail) {
      fetchInsightFromDB();
    }
  }, [selectedEmployeeDetail, globalAttendance, currentMonth, currentYear, supervisionShiftFilter, isSupervision, currentShift]);

  if (!selectedEmployeeDetail) return null;

  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const isPastMonth = (today.getFullYear() > currentYear) || (today.getFullYear() === currentYear && today.getMonth() > currentMonth);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-4xl h-[92vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-5 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-blue-900 to-blue-800 text-white shrink-0 relative">
          <button 
            onClick={() => setSelectedEmployeeDetail(null)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl transition-colors sm:hidden"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl sm:text-2xl font-black shrink-0">
                {getInitials(selectedEmployeeDetail.name)}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight leading-tight truncate pr-8 sm:pr-0">
                  {selectedEmployeeDetail.name}
                </h2>
                <p className="text-blue-200 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 truncate">
                  {selectedEmployeeDetail.role || selectedEmployeeDetail.cargo || 'Membro da Equipe'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="px-2 py-0.5 bg-white/20 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">ID: #{selectedEmployeeDetail.id.padStart(3, '0')}</span>
                  <span className="px-2 py-0.5 bg-emerald-500 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Ativo</span>
                  {selectedEmployeeDetail.admissionDate && (
                    <span className="px-2 py-0.5 bg-blue-500 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
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
              className="hidden sm:block p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Total de Faltas</span>
              <span className="text-2xl sm:text-3xl font-black text-red-600">
                {Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length}
              </span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Assiduidade</span>
              <span className="text-2xl sm:text-3xl font-black text-blue-600">
                {VALID_WORK_DAYS.length === 0 ? 0 : Math.round((1 - (Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length / VALID_WORK_DAYS.length)) * 100)}%
              </span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-center col-span-2 sm:col-span-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tendência</span>
              <div className="flex items-center gap-2">
                {employeeData.find(e => e.id === selectedEmployeeDetail.id)?.trend === 'up' ? (
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                )}
                <span className="text-base sm:text-lg font-bold text-gray-700 capitalize">
                  {employeeData.find(e => e.id === selectedEmployeeDetail.id)?.trend === 'up' ? 'Em Alta' : 'Em Baixa'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-3 relative z-10">
              <h3 className="text-[11px] sm:text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-600" />
                AI Insight Individual
              </h3>
              {insight && !isPastMonth && (
                <button 
                  onClick={() => generateNewInsight()}
                  disabled={loadingInsight}
                  className="p-1 sm:p-1.5 bg-white/60 hover:bg-white rounded-lg border border-blue-200 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  title="Regerar Insight"
                >
                  <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 ${loadingInsight ? 'animate-spin' : ''}`} />
                  <span className="text-[8px] sm:text-[10px] font-bold text-blue-800 uppercase">Regerar</span>
                </button>
              )}
            </div>
            
            <div className="text-xs sm:text-sm text-blue-800/80 leading-relaxed font-medium relative z-10 markdown-custom-styles">
              {loadingInsight && (
                <div className="flex flex-col sm:flex-row items-center gap-3 p-5 text-blue-700 bg-white/60 rounded-xl justify-center text-center border border-blue-100/30">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-bold text-sm">Analisando dados comportamentais...</span>
                </div>
              )}
              {!loadingInsight && insightError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs sm:text-sm font-bold">
                  {insightError}
                </div>
              )}
              {!loadingInsight && !insightError && !insight && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
                    <BrainCircuit className="w-6 h-6 text-blue-600 opacity-50" />
                  </div>
                  <p className="text-xs sm:text-sm text-blue-700/60 font-bold mb-5 max-w-[240px]">Nenhum insight gerado para este colaborador.</p>
                  <button 
                    onClick={() => generateNewInsight()}
                    className="flex flex-row items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all w-full sm:w-auto justify-center"
                  >
                    <BrainCircuit className="w-4 h-4" />
                    Gerar Análise RH IA
                  </button>
                </div>
              )}
              {!loadingInsight && !insightError && insight && (
                <div className="bg-white/80 p-4 sm:p-6 rounded-xl border border-blue-100 shadow-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p className="mb-4 last:mb-0 text-blue-900/90" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-black text-blue-950 bg-blue-100/30 px-1 rounded" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1.5" {...props} />,
                      li: ({ node, ...props }) => <li className="text-blue-900/90" {...props} />,
                    }}
                  >
                    {insight}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* Calendar Heatmap / Pattern Analysis */}
          <div className="space-y-4">
            <h3 className="text-[11px] sm:text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Padrões de Trabalho do Mês
            </h3>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isWork = isWorkDay(day, currentMonth, currentYear);
                const status = globalAttendance[selectedEmployeeDetail.id]?.[day];
                const isToday = day === todayDay && isCurrentMonth;
                const isFuture = isCurrentMonth && day > todayDay && !isPastMonth;
                
                const displayStatus = status || (!isFuture ? 'P' : '');
                const hasStatus = !!status || (!isFuture && isWork);

                return (
                   <div 
                    key={day}
                    className={`aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center border transition-all ${
                      !isWork ? 'bg-gray-50 border-gray-100 opacity-20' :
                      isFuture && !status ? 'bg-gray-50/50 border-gray-100 text-gray-300 italic' :
                      status === 'F' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' :
                      status === 'Fe' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      status === 'A' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-emerald-50 border-emerald-200 text-emerald-700'
                    } ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                  >
                    <span className="text-[8px] sm:text-[10px] font-bold opacity-50">{day}</span>
                    {isWork && hasStatus && (
                      <span className="text-[10px] sm:text-xs font-black">
                        {displayStatus}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekday Frequency */}
          <div className="bg-gray-50 rounded-[28px] p-5 sm:p-7 border border-gray-100 shadow-inner">
            <h3 className="text-[11px] sm:text-sm font-black text-gray-900 uppercase tracking-widest mb-5">Incidência por Dia da Semana</h3>
            <div className="space-y-4">
              {['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'].map(wd => {
                const dayFaltas = Object.entries(globalAttendance[selectedEmployeeDetail.id] || {})
                  .filter(([d, s]) => s === 'F' && getWeekdayName(Number(d), currentMonth, currentYear) === wd)
                  .length;
                
                if (dayFaltas === 0) return null;

                return (
                  <div key={wd} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-500 capitalize">{wd}</span>
                      <span className="text-[10px] sm:text-xs font-black text-red-600">{dayFaltas} Faltas</span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200/50 shadow-sm">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min((dayFaltas / 4) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.values(globalAttendance[selectedEmployeeDetail.id] || {}).filter(s => s === 'F').length === 0 && (
                <div className="flex flex-col items-center py-6">
                   <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                    <Activity className="w-5 h-5 text-emerald-600" />
                   </div>
                   <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Perfeito: Sem faltas registradas</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button 
            onClick={() => setSelectedEmployeeDetail(null)}
            className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
          >
            Fechar Perfil
          </button>
        </div>
      </div>
    </div>
  );
}
