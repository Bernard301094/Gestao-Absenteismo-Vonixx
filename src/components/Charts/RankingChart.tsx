import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { EmployeeWithStats } from '../../types';

interface RankingChartProps {
  data: EmployeeWithStats[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getSeverity(faltas: number): {
  bar: string;
  badge: string;
  text: string;
  label: string;
} {
  if (faltas >= 5) return {
    bar: 'from-red-500 to-rose-600',
    badge: 'bg-red-100 text-red-700 border-red-200',
    text: 'text-red-600',
    label: 'Crítico',
  };
  if (faltas >= 3) return {
    bar: 'from-orange-400 to-orange-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    text: 'text-orange-500',
    label: 'Atenção',
  };
  if (faltas >= 1) return {
    bar: 'from-yellow-400 to-amber-500',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    text: 'text-yellow-600',
    label: 'Regular',
  };
  return {
    bar: 'from-emerald-400 to-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    text: 'text-emerald-600',
    label: 'Ótimo',
  };
}



const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-cyan-100 text-cyan-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-lime-100 text-lime-700',
  'bg-sky-100 text-sky-700',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RankingChart({ data }: RankingChartProps) {
  const maxFaltas = Math.max(...data.map(d => d.faltas), 1);
  const top10 = data.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-50">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
            Ranking de Faltas
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
            {top10.length} com maior nº de faltas
          </p>
        </div>
        <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
          <Trophy className="w-4 h-4 text-amber-500" />
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-gray-50 overflow-y-auto max-h-[420px]">
        {top10.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
            <Trophy className="w-10 h-10 mb-3" />
            <p className="text-xs font-bold uppercase tracking-widest">Sem faltas registradas</p>
          </div>
        ) : (
          top10.map((emp, idx) => {
            const severity = getSeverity(emp.faltas);
            const barPct = Math.round((emp.faltas / maxFaltas) * 100);
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];


            return (
              <div
                key={emp.id}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/80 transition-colors duration-150 group"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Rank number */}
                <span className="text-xs font-black w-5 shrink-0 tabular-nums text-center text-gray-300">
                  {idx + 1}
                </span>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-transform group-hover:scale-110 ${avatarColor}`}>
                  {getInitials(emp.name)}
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-[11px] font-semibold text-gray-800 truncate leading-none">
                      {emp.name}
                    </span>
                    {/* Trend icon */}
                    <span className="shrink-0">
                      {emp.trend === 'up'
                        ? <TrendingUp className="w-3 h-3 text-red-400" />
                        : emp.trend === 'down'
                        ? <TrendingDown className="w-3 h-3 text-emerald-400" />
                        : <Minus className="w-3 h-3 text-gray-300" />
                      }
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${severity.bar} transition-all duration-700 ease-out`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>

                {/* Faltas count + badge */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-sm font-black tabular-nums ${severity.text}`}>
                    {emp.faltas}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-full border ${severity.badge}`}>
                    {severity.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-gray-400">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-rose-600" />
            Crítico (5+)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
            Atenção (3-4)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" />
            Regular (1-2)
          </span>
        </div>
      </div>
    </div>
  );
}
