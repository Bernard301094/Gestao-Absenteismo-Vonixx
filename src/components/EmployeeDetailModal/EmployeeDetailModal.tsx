import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { X, Bot, Loader2, RefreshCw, Sparkles, Zap, BrainCircuit } from 'lucide-react';
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

// ─── Markdown estilizado para IA ───────────────────────────────────────────────
function AIMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:font-black prose-headings:tracking-tight prose-headings:mb-2 prose-headings:mt-4 prose-headings:first:mt-0
      prose-h1:text-sm prose-h2:text-sm prose-h3:text-xs
      prose-h1:text-white prose-h2:text-blue-100 prose-h3:text-blue-200
      prose-p:text-white/88 prose-p:leading-relaxed prose-p:mb-3 prose-p:last:mb-0 prose-p:text-sm
      prose-strong:text-white prose-strong:font-black
      prose-em:text-blue-200 prose-em:not-italic prose-em:font-semibold
      prose-li:text-white/85 prose-li:mb-1.5 prose-li:leading-relaxed prose-li:text-sm
      prose-ul:my-3 prose-ul:space-y-1
      prose-ol:my-3 prose-ol:space-y-1
      [&>ul]:list-none [&>ul]:pl-0
      [&_ul]:list-none [&_ul]:pl-0
      [&_ol]:list-decimal [&_ol]:pl-4
      [&_li]:relative [&_li]:pl-5
      [&_ul>li]:before:content-['▸'] [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-blue-300 [&_ul>li]:before:font-bold
      prose-hr:border-white/15 prose-hr:my-4
      prose-code:text-blue-200 prose-code:bg-blue-900/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
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

  // Carrega insight salvo ao abrir
  useEffect(() => {
    if (!selectedEmployeeDetail) return;
    setInsight(null);
    setInsightError(null);
    const insightDocId = `${selectedEmployeeDetail.id}_${currentYear}_${currentMonth}_${activeShift}`;
    getDoc(doc(db, 'ai_insights', insightDocId)).then(snap => {
      if (snap.exists()) setInsight(snap.data().insight || null);
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
        selectedEmployeeDetail, record, holidays, currentDateString, detailedHistoryText
      );

      await setDoc(insightRef, {
        insight: response,
        employeeId: currentEmpId,
        year: currentReqYear,
        month: currentReqMonth,
        shift: currentReqShift,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      if (selectedEmployeeDetail?.id === currentEmpId && currentMonth === currentReqMonth && currentYear === currentReqYear) {
        setInsight(response);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      setInsightError(msg.includes('LIMITE DE CUSTO') ? msg : `Erro ao gerar insight: ${msg}`);
    } finally {
      setLoadingInsight(false);
    }
  };

  const record = globalAttendance[selectedEmployeeDetail.id] || {};
  const faltasMes      = Object.entries(record).filter(([d, s]) => s === 'F'  && isWorkDay(Number(d), currentMonth, currentYear)).length;
  const presencasMes   = Object.entries(record).filter(([d, s]) => s === 'P'  && isWorkDay(Number(d), currentMonth, currentYear)).length;
  const feriasMes      = Object.entries(record).filter(([d, s]) => s === 'Fe' && isWorkDay(Number(d), currentMonth, currentYear)).length;
  const afastamentosMes= Object.entries(record).filter(([d, s]) => s === 'A'  && isWorkDay(Number(d), currentMonth, currentYear)).length;

  const totalWorkDays = faltasMes + presencasMes;
  const presenceRate  = totalWorkDays > 0 ? Math.round((presencasMes / totalWorkDays) * 100) : 100;

  const statusColors: Record<string, string> = {
    P:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    F:  'bg-red-100    text-red-700    border-red-200',
    Fe: 'bg-blue-100   text-blue-700   border-blue-200',
    A:  'bg-amber-100  text-amber-700  border-amber-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEmployeeDetail(null)} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

        {/* ── Header com gradiente ─────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-5 shrink-0 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-xl">{getInitials(selectedEmployeeDetail.name)}</span>
              </div>
              {/* Badge de presença */}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800 flex items-center justify-center ${
                presenceRate >= 90 ? 'bg-emerald-400' : presenceRate >= 70 ? 'bg-amber-400' : 'bg-red-400'
              }`} title={`${presenceRate}% de presença`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-black text-base truncate uppercase tracking-tight">{selectedEmployeeDetail.name}</h3>
              <p className="text-slate-400 text-sm font-medium">{selectedEmployeeDetail.role || 'Sem cargo definido'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      presenceRate >= 90 ? 'bg-emerald-400' : presenceRate >= 70 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${presenceRate}%` }}
                  />
                </div>
                <span className="text-slate-400 text-[11px] font-bold shrink-0">{presenceRate}% presença</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedEmployeeDetail(null)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-px bg-gray-100 border-b border-gray-100 shrink-0">
          {[
            { label: 'Faltas',       value: faltasMes,       color: 'text-red-600',     bg: 'bg-red-50' },
            { label: 'Presenças',    value: presencasMes,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Férias',       value: feriasMes,       color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'Afastamentos', value: afastamentosMes, color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} flex flex-col items-center justify-center py-3 gap-0.5`}>
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Scroll area ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Calendário */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Registro do Mês</p>
            <div className="grid grid-cols-7 gap-1">
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-gray-400 uppercase pb-1.5">{d}</div>
              ))}
              {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const status = record[day];
                const isWork = isWorkDay(day, currentMonth, currentYear);
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;
                const colorClass = status
                  ? statusColors[status] || 'bg-gray-100 text-gray-500 border-gray-200'
                  : isWork
                  ? 'bg-white text-gray-300 border-gray-100'
                  : 'bg-gray-50 text-gray-200 border-transparent';
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg border flex items-center justify-center text-[11px] font-black transition-all ${
                      colorClass
                    } ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                    title={status || (isWork ? 'Dia de trabalho' : 'Folga')}
                  >
                    {status ?? day}
                  </div>
                );
              })}
            </div>
            {/* Legenda */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              {[['P','Presença','bg-emerald-100 text-emerald-700'],['F','Falta','bg-red-100 text-red-700'],['Fe','Férias','bg-blue-100 text-blue-700'],['A','Afastamento','bg-amber-100 text-amber-700']].map(([code,label,cls]) => (
                <div key={code} className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${cls}`}>{code}</span>
                  <span className="text-[11px] text-gray-400 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Seção Insight IA ─────────────────────────────────────────────── */}
          <div className="p-5">
            <div className="relative rounded-2xl overflow-hidden">
              {/* Fundo */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0c2a4a]" />
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
              <div className="absolute inset-0 rounded-2xl border border-white/8 pointer-events-none" />

              <div className="relative p-5">
                {/* Header da seção IA */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400/20 to-indigo-500/20 border border-blue-400/25 flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-4 h-4 text-blue-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-black text-sm">Insight Individual</h4>
                        <span className="inline-flex items-center gap-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full">
                          <Zap className="w-2 h-2" /> IA
                        </span>
                      </div>
                      <p className="text-blue-200/50 text-[11px] mt-0.5">Análise comportamental do colaborador</p>
                    </div>
                  </div>

                  <button
                    onClick={generateNewInsight}
                    disabled={loadingInsight}
                    className="flex items-center gap-1.5 bg-white hover:bg-blue-50 disabled:opacity-60 text-blue-900 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-900/30 active:scale-95 disabled:cursor-not-allowed shrink-0"
                  >
                    {loadingInsight
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</>
                      : insight
                      ? <><RefreshCw className="w-3 h-3" /> Atualizar</>
                      : <><Bot className="w-3 h-3" /> Gerar</>
                    }
                  </button>
                </div>

                {/* Loading */}
                {loadingInsight && (
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <Loader2 className="w-4 h-4 text-blue-300 animate-spin shrink-0" />
                    <p className="text-blue-200/70 text-xs">Analisando histórico de presença...</p>
                    <div className="ml-auto flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1 h-1 rounded-full bg-blue-400/60 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Erro */}
                {insightError && (
                  <div className="flex items-start gap-3 bg-red-500/10 border border-red-400/25 rounded-xl px-4 py-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-red-300 text-xs font-black">!</span>
                    </div>
                    <p className="text-red-200/90 text-xs leading-relaxed">{insightError}</p>
                  </div>
                )}

                {/* Insight gerado */}
                {insight && !loadingInsight && !insightError && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                      <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Análise gerada</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    </div>
                    <div className="bg-white/6 border border-white/10 rounded-xl p-4">
                      <AIMarkdown content={insight} />
                    </div>
                  </div>
                )}

                {/* Estado vazio */}
                {!insight && !loadingInsight && !insightError && (
                  <div className="flex flex-col items-center gap-2 py-5 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-blue-300/50" />
                    </div>
                    <p className="text-blue-200/40 text-xs max-w-[220px]">
                      Clique em <strong className="text-blue-200/60">Gerar</strong> para analisar o comportamento deste colaborador com IA.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
