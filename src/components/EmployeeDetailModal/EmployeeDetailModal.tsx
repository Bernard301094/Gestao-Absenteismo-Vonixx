import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { X, Bot, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { db } from '../../firebase';
import { generateEmployeeInsight } from '../../services/aiService';
import { getHolidaysForYear } from '../../utils/holidays';
import { getWeekdayName } from '../../utils/dateUtils';
import type { Employee, EmployeeWithStats, AttendanceRecord } from '../../types';

interface EmployeeDetailModalProps {
  selectedEmployeeDetail: Employee;
  setSelectedEmployeeDetail: (emp: Employee | null) => void;
  getInitials: (name: string) => string;
  globalAttendance: AttendanceRecord;
  VALID_WORK_DAYS: number[];
  employeeData: EmployeeWithStats[];
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
  supervisionShiftFilter,
  isSupervision,
  currentShift,
}: EmployeeDetailModalProps) {
  const activeShift = isSupervision ? supervisionShiftFilter : (currentShift ?? 'A');

  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Carrega insight salvo do Firestore ao abrir o modal
  useEffect(() => {
    if (!selectedEmployeeDetail) return;
    setInsight(null);
    setInsightError(null);

    const insightDocId = `${selectedEmployeeDetail.id}_${currentYear}_${currentMonth}_${activeShift}`;
    const insightRef = doc(db, 'ai_insights', insightDocId);

    getDoc(insightRef).then(snap => {
      if (snap.exists()) {
        setInsight(snap.data().insight || null);
      }
    }).catch(() => {});
  }, [selectedEmployeeDetail?.id, currentMonth, currentYear, activeShift]);

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

      const detailedHistoryArray: string[] = [];
      for (let d = 1; d <= dayInt; d++) {
        const wdName = getWeekdayName(d, currentReqMonth, currentReqYear);
        const status = record[d];
        if (status === 'F') detailedHistoryArray.push(`- Dia ${d} (${wdName}): FALTA INJUSTIFICADA (Dia de Trabalho)`);
        else if (status === 'Fe') detailedHistoryArray.push(`- Dia ${d} (${wdName}): FÉRIAS`);
        else if (status === 'A') detailedHistoryArray.push(`- Dia ${d} (${wdName}): AFASTAMENTO LEGAL`);
        else if (status === 'P') detailedHistoryArray.push(`- Dia ${d} (${wdName}): PRESENÇA CONFIRMADA`);
      }
      const detailedHistoryText = detailedHistoryArray.length > 0
        ? detailedHistoryArray.join('\n')
        : 'Nenhum registro de falta ou presença anotado até o momento.';

      const response = await generateEmployeeInsight(
        selectedEmployeeDetail,
        record,
        holidays,
        currentDateString,
        detailedHistoryText
      );

      await setDoc(insightRef, {
        insight: response,
        employeeId: currentEmpId,
        year: currentReqYear,
        month: currentReqMonth,
        shift: currentReqShift,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // FIX: removida a comparação com activeShift que impedia o setInsight
      if (
        selectedEmployeeDetail?.id === currentEmpId &&
        currentMonth === currentReqMonth &&
        currentYear === currentReqYear
      ) {
        setInsight(response);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      setInsightError(
        msg.includes('LIMITE DE CUSTO')
          ? msg
          : `Erro ao gerar insight: ${msg}`
      );
    } finally {
      setLoadingInsight(false);
    }
  };

  const empStats = employeeData.find(e => e.id === selectedEmployeeDetail.id);
  const record = globalAttendance[selectedEmployeeDetail.id] || {};

  const faltasMes = Object.entries(record).filter(
    ([dayStr, status]) => status === 'F' && isWorkDay(Number(dayStr), currentMonth, currentYear)
  ).length;

  const presencasMes = Object.entries(record).filter(
    ([dayStr, status]) => status === 'P' && isWorkDay(Number(dayStr), currentMonth, currentYear)
  ).length;

  const feriasMes = Object.entries(record).filter(
    ([dayStr, status]) => status === 'Fe' && isWorkDay(Number(dayStr), currentMonth, currentYear)
  ).length;

  const afastamentosMes = Object.entries(record).filter(
    ([dayStr, status]) => status === 'A' && isWorkDay(Number(dayStr), currentMonth, currentYear)
  ).length;

  const statusColors: Record<string, string> = {
    P: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    F: 'bg-red-100 text-red-700 border-red-200',
    Fe: 'bg-blue-100 text-blue-700 border-blue-200',
    A: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const statusLabel: Record<string, string> = {
    P: 'P', F: 'F', Fe: 'Fe', A: 'A',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEmployeeDetail(null)} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-100 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-lg">{getInitials(selectedEmployeeDetail.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-gray-900 truncate uppercase tracking-tight">{selectedEmployeeDetail.name}</h3>
            <p className="text-sm text-gray-500 font-medium">{selectedEmployeeDetail.role || 'Sem cargo definido'}</p>
          </div>
          <button
            onClick={() => setSelectedEmployeeDetail(null)}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 p-5 border-b border-gray-100 shrink-0">
          {[
            { label: 'Faltas', value: faltasMes, color: 'text-red-600' },
            { label: 'Presenças', value: presencasMes, color: 'text-emerald-600' },
            { label: 'Férias', value: feriasMes, color: 'text-blue-600' },
            { label: 'Afastamentos', value: afastamentosMes, color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto">

          {/* Calendário do mês */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Registro do Mês</p>
            <div className="grid grid-cols-7 gap-1.5">
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-gray-400 uppercase pb-1">{d}</div>
              ))}
              {/* Offset para o primeiro dia do mês */}
              {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const status = record[day];
                const isWork = isWorkDay(day, currentMonth, currentYear);
                const colorClass = status
                  ? statusColors[status] || 'bg-gray-100 text-gray-600 border-gray-200'
                  : isWork
                  ? 'bg-white text-gray-400 border-gray-200'
                  : 'bg-gray-50 text-gray-300 border-transparent';
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg border flex items-center justify-center text-[11px] font-bold ${colorClass}`}
                    title={status || (isWork ? 'Dia de trabalho' : 'Folga')}
                  >
                    {status ? statusLabel[status] || status : day}
                  </div>
                );
              })}
            </div>
            {/* Legenda */}
            <div className="flex flex-wrap gap-3 mt-3">
              {[['P', 'Presença', 'bg-emerald-100 text-emerald-700'], ['F', 'Falta', 'bg-red-100 text-red-700'], ['Fe', 'Férias', 'bg-blue-100 text-blue-700'], ['A', 'Afastamento', 'bg-amber-100 text-amber-700']].map(([code, label, cls]) => (
                <div key={code} className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${cls}`}>{code}</span>
                  <span className="text-[11px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seção de Insight IA */}
          <div className="p-5">
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-800/50 border border-blue-700/50 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-blue-300" />
                    </div>
                    <div>
                      <h4 className="text-white font-black text-sm">Insight IA</h4>
                      <p className="text-blue-200/70 text-[11px]">Análise comportamental do colaborador</p>
                    </div>
                  </div>
                  <button
                    onClick={generateNewInsight}
                    disabled={loadingInsight}
                    className="flex items-center gap-1.5 bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-70 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow active:scale-95"
                  >
                    {loadingInsight
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                      : insight
                      ? <><RefreshCw className="w-3.5 h-3.5" /> Atualizar</>
                      : <><Bot className="w-3.5 h-3.5" /> Gerar Insight</>
                    }
                  </button>
                </div>

                {insightError && (
                  <div className="bg-red-900/40 border border-red-500/30 rounded-xl p-3 text-red-200 text-xs">
                    {insightError}
                  </div>
                )}

                {insight && !insightError && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                    <div className="prose prose-invert prose-sm max-w-none
                      prose-p:text-white/90 prose-p:leading-relaxed prose-p:mb-2
                      prose-strong:text-white prose-strong:font-bold
                      prose-em:text-blue-200
                      prose-li:text-white/90 prose-li:mb-1
                      prose-ul:my-2 [&>ul]:list-disc [&>ul]:pl-4
                      prose-ol:my-2 [&>ol]:list-decimal [&>ol]:pl-4">
                      <ReactMarkdown>{insight}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {!insight && !loadingInsight && !insightError && (
                  <p className="text-blue-200/60 text-xs text-center py-2">
                    Clique em "Gerar Insight" para analisar o comportamento deste colaborador.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
