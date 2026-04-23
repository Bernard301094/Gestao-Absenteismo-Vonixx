import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles, Loader2, Calendar, CalendarDays,
  ChevronDown, ChevronUp, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import { useAIInsights, type AIInsight } from '../../hooks/useAIInsights';
import type { Employee, AttendanceRecord, NotesRecord, Vacation } from '../../types';

// ─── Markdown renderer ────────────────────────────────────────────────────────

function AIMarkdown({ content }: { content: string }) {
  return (
    <div style={{ color: '#cbd5e1', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: '1.6' }}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-white font-bold text-base mt-5 mb-2 border-b border-slate-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-slate-100 font-semibold text-sm mt-4 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sky-400 font-semibold text-xs mt-4 mb-2 uppercase tracking-wider">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-slate-300 mb-3 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="text-white font-bold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-slate-400 italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 mb-3 list-none pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 mb-3 list-decimal pl-5 text-slate-300">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-300 relative pl-4">
              <span className="absolute left-0 top-[0.5em] w-1 h-1 bg-sky-500 rounded-full" />
              {children}
            </li>
          ),
          hr: () => <hr className="border-slate-700/50 my-5" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-slate-600 pl-3 my-3 text-slate-400 italic text-xs">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Format Firestore timestamp ───────────────────────────────────────────────

function formatTimestamp(ts: any): string {
  if (!ts) return '';
  try {
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// ─── InsightCard ──────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: AIInsight;
  label: string;
}

function InsightCard({ insight, label }: InsightCardProps) {
  const [expanded, setExpanded] = useState(true);
  const ts = formatTimestamp(insight.generatedAt);

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-200 font-semibold text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          {ts && (
            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium hidden sm:block">
              {ts}
            </span>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-700/50 bg-slate-800/20">
          <AIMarkdown content={insight.content} />
          {ts && (
            <p className="text-slate-500 text-[10px] mt-5 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
              <Clock className="w-3 h-3" /> Emitido em {ts}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GenerateButton ───────────────────────────────────────────────────────────

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  label: string;
}

function GenerateButton({ onClick, isLoading, disabled, label }: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800/50 text-white disabled:text-slate-500 border border-slate-600 disabled:border-slate-700/50 px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed w-full sm:w-auto shadow-sm"
    >
      {isLoading ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
      ) : (
        <><Sparkles className="w-3.5 h-3.5 text-sky-400" /> {label}</>
      )}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AIInsightsPanelProps {
  shift: string | null;
  employees: Employee[];
  attendance: AttendanceRecord;
  notes: NotesRecord;
  vacations: Vacation[];
  lockedDays: Record<number, boolean>;
  currentMonth: number;
  currentYear: number;
  validWorkDays: number[];
  isSupervision: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIInsightsPanel({
  shift, employees, attendance, notes, vacations,
  lockedDays, currentMonth, currentYear, validWorkDays, isSupervision,
}: AIInsightsPanelProps) {

  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly'>('monthly');

  const {
    monthlyInsight, weeklyInsights,
    isGeneratingMonthly, isGeneratingWeekly,
    monthlyError, weeklyError,
    setMonthlyError, setWeeklyError,
    handleGenerateMonthly, handleGenerateWeekly,
    canGenerateMonthly, canGenerateWeekly,
    getAvailableWeeks, getWeekRange, getLastWorkDayOfMonth,
    isLoadingHistory,
  } = useAIInsights({
    shift, employees, attendance, notes, vacations,
    lockedDays, currentMonth, currentYear, validWorkDays, isSupervision,
  });

  const availableWeeks = getAvailableWeeks();
  const lastWorkDay    = getLastWorkDayOfMonth();
  const monthlyUnlocked = canGenerateMonthly();
  const monthLabel = MONTH_NAMES?.[currentMonth] ?? `Mês ${currentMonth + 1}`;

  if (isLoadingHistory) {
    return (
      <div className="bg-[#0f1e36] rounded-2xl border border-slate-700/50 p-10 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0f1e36] rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg">
      <div className="p-5 sm:p-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base sm:text-lg">Auditoria de Turno (IA)</h3>
              <p className="text-slate-400 text-xs mt-0.5">Relatórios oficiais de fechamento</p>
            </div>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <div className="flex bg-slate-800/80 p-1 rounded-lg self-start sm:self-auto border border-slate-700/50">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'monthly'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Mensal
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'weekly'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Semanal
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB: MONTHLY
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'monthly' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <div>
                <p className="text-slate-200 font-semibold text-sm">
                  Fechamento Gerencial — {monthLabel}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {monthlyInsight
                    ? 'Dossiê emitido e arquivado definitivamente.'
                    : monthlyUnlocked
                      ? `Lista do dia ${lastWorkDay} fechada. Pronto para emissão.`
                      : `Emissão requer o fechamento do dia ${lastWorkDay}.`}
                </p>
              </div>
              {!monthlyInsight && (
                <GenerateButton
                  onClick={() => { setMonthlyError(null); handleGenerateMonthly(); }}
                  isLoading={isGeneratingMonthly}
                  disabled={!monthlyUnlocked}
                  label="Gerar Dossiê"
                />
              )}
            </div>

            {monthlyError && !isGeneratingMonthly && (
              <div className="flex items-start gap-3 bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{monthlyError}</p>
              </div>
            )}

            {monthlyInsight && !isGeneratingMonthly && (
              <InsightCard insight={monthlyInsight} label={`Relatório Final — ${monthLabel}`} />
            )}

            {!monthlyInsight && !isGeneratingMonthly && !monthlyError && monthlyUnlocked && (
              <div className="py-8 text-center rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20">
                <p className="text-slate-500 text-sm">Pronto para gerar a auditoria final do mês.</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: WEEKLY
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'weekly' && (
          <div className="animate-in fade-in duration-300">
            {weeklyError && (
              <div className="flex items-start gap-3 bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{weeklyError}</p>
              </div>
            )}

            {availableWeeks.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
                <p className="text-slate-500 text-sm">Nenhum ciclo disponível.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableWeeks.map(weekNum => {
                  const { start, end, days } = getWeekRange(weekNum);
                  const existingInsight = weeklyInsights.find(w => w.weekNumber === weekNum);
                  const unlocked   = canGenerateWeekly(weekNum);
                  const isGenerating = isGeneratingWeekly === weekNum;

                  return (
                    <div key={weekNum}>
                      {existingInsight && !isGenerating ? (
                        <InsightCard
                          insight={existingInsight}
                          label={`Semana ${weekNum} (Dias ${start} a ${end})`}
                        />
                      ) : (
                        days.length > 0 && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 px-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                            <div>
                              <p className="text-slate-200 font-semibold text-sm">Semana {weekNum}</p>
                              <p className="text-slate-400 text-xs mt-0.5">Dias {start} a {end}</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              {!unlocked && (
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Aguardando dia {end}
                                </span>
                              )}
                              <GenerateButton
                                onClick={() => { setWeeklyError(null); handleGenerateWeekly(weekNum); }}
                                isLoading={isGenerating}
                                disabled={!unlocked || (isGeneratingWeekly !== null && !isGenerating)}
                                label="Gerar Auditoria"
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
