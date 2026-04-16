import React from 'react';
import { CalendarDays } from 'lucide-react';
import { MONTH_NAMES } from '../../utils/constants';
import type { DayData } from '../../types';

interface DailyTableProps {
  data: DayData[];
  currentMonth: number;
  maxFaltas?: number;
}

function getSeverityColor(faltas: number, max: number) {
  if (faltas === 0) return { bar: 'bg-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  const ratio = faltas / max;
  if (ratio >= 0.75) return { bar: 'bg-red-500',    text: 'text-red-600',    bg: 'bg-red-50' };
  if (ratio >= 0.5)  return { bar: 'bg-orange-400', text: 'text-orange-600', bg: 'bg-orange-50' };
  return              { bar: 'bg-amber-400',  text: 'text-amber-600',  bg: 'bg-amber-50' };
}

export default function DailyTable({ data, currentMonth, maxFaltas }: DailyTableProps) {
  const max = maxFaltas ?? Math.max(...data.map(d => d.faltas), 1);
  const monthAbbr = MONTH_NAMES[currentMonth].substring(0, 3).toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-2 border-b border-gray-100 shrink-0">
        <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest leading-none">
            Dia vs Faltas
          </h3>
          <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
            {MONTH_NAMES[currentMonth]}
          </p>
        </div>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto flex-1 divide-y divide-gray-50 custom-scrollbar">
        {data.map((d, idx) => {
          const colors = getSeverityColor(d.faltas, max);
          const barWidth = max > 0 ? Math.round((d.faltas / max) * 100) : 0;

          return (
            <div
              key={idx}
              className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/70 transition-colors duration-100 group"
            >
              {/* Day badge */}
              <span className={`text-[10px] font-black w-14 shrink-0 rounded-lg px-2 py-1 text-center tabular-nums transition-colors ${
                d.faltas > 0 ? colors.bg + ' ' + colors.text : 'bg-gray-50 text-gray-400'
              }`}>
                {d.day.padStart(2, '0')}/{monthAbbr}
              </span>

              {/* Mini bar */}
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${colors.bar}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Count */}
              <span className={`text-xs font-black tabular-nums w-4 text-right shrink-0 ${
                d.faltas > 0 ? colors.text : 'text-gray-300'
              }`}>
                {d.faltas}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50 flex items-center gap-3 shrink-0">
        {[
          { color: 'bg-emerald-400', label: 'Sem faltas' },
          { color: 'bg-amber-400',   label: 'Baixo' },
          { color: 'bg-orange-400',  label: 'Médio' },
          { color: 'bg-red-500',     label: 'Alto' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
