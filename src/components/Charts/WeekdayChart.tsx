import React from 'react';
import { BarChart2 } from 'lucide-react';
import type { WeekdayData } from '../../types';

interface WeekdayChartProps {
  data: WeekdayData[];
}

const DAY_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  Seg: { from: 'from-blue-500',   to: 'to-blue-600',    glow: 'shadow-blue-200' },
  Ter: { from: 'from-violet-500', to: 'to-violet-600',  glow: 'shadow-violet-200' },
  Qua: { from: 'from-indigo-500', to: 'to-indigo-600',  glow: 'shadow-indigo-200' },
  Qui: { from: 'from-purple-500', to: 'to-purple-600',  glow: 'shadow-purple-200' },
  Sex: { from: 'from-orange-500', to: 'to-rose-500',    glow: 'shadow-orange-200' },
  Sáb: { from: 'from-rose-400',   to: 'to-rose-500',    glow: 'shadow-rose-200' },
  Dom: { from: 'from-red-400',    to: 'to-red-500',     glow: 'shadow-red-200' },
};

export default function WeekdayChart({ data }: WeekdayChartProps) {
  const max = Math.max(...data.map(d => d.faltas), 1);
  const total = data.reduce((sum, d) => sum + d.faltas, 0);
  const peakDay = data.reduce((a, b) => (a.faltas >= b.faltas ? a : b), data[0]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-50">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
            Faltas por Dia da Semana
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
            {total > 0 ? `Pico: ${peakDay?.day ?? '—'}` : 'Sem faltas este mês'}
          </p>
        </div>
        <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
          <BarChart2 className="w-4 h-4 text-indigo-500" />
        </div>
      </div>

      {/* Chart area */}
      <div className="px-5 pt-6 pb-5 flex-1 flex flex-col justify-end">
        <div className="flex items-end gap-2 h-44">
          {data.map((d) => {
            const heightPct = max > 0 ? (d.faltas / max) * 100 : 0;
            const colors = DAY_COLORS[d.day] ?? { from: 'from-gray-400', to: 'to-gray-500', glow: 'shadow-gray-200' };
            const isPeak = d.day === peakDay?.day && d.faltas > 0;

            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                {/* Count label */}
                <span className={`text-[10px] font-black tabular-nums transition-opacity ${
                  d.faltas > 0 ? 'text-gray-600 opacity-100' : 'opacity-0'
                }`}>
                  {d.faltas}
                </span>

                {/* Bar */}
                <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                  <div
                    className={`w-full rounded-t-xl bg-gradient-to-t ${colors.from} ${colors.to} transition-all duration-700 ease-out relative ${
                      isPeak ? `shadow-lg ${colors.glow}` : ''
                    }`}
                    style={{
                      height: `${Math.max(heightPct, d.faltas > 0 ? 6 : 0)}%`,
                    }}
                  >
                    {/* Shine overlay */}
                    <div className="absolute inset-0 rounded-t-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    {/* Peak indicator */}
                    {isPeak && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white ring-2 ring-current shadow" />
                    )}
                  </div>
                  {/* Zero state bar */}
                  {d.faltas === 0 && (
                    <div className="w-full h-1 rounded-full bg-gray-100" />
                  )}
                </div>

                {/* Day label */}
                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                  isPeak ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Baseline */}
        <div className="h-px w-full bg-gray-100 mt-1 mb-4" />

        {/* Summary row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${DAY_COLORS[peakDay?.day]?.from ?? 'from-gray-400'} ${DAY_COLORS[peakDay?.day]?.to ?? 'to-gray-500'}`} />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {total > 0 ? `${peakDay?.day} concentra mais faltas` : 'Nenhuma falta registrada'}
            </span>
          </div>
          <span className="text-[10px] font-black text-gray-400 tabular-nums">
            Total: {total}
          </span>
        </div>
      </div>
    </div>
  );
}
