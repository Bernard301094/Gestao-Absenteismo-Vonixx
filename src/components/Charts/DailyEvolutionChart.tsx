import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import type { DayData } from '../../../types';

interface DailyEvolutionChartProps {
  data: DayData[];
  currentMonth: number;
}

export default function DailyEvolutionChart({ data, currentMonth }: DailyEvolutionChartProps) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col">
      <h3 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-6 text-center">
        Evolução Diária de Faltas
      </h3>
      <div className="h-[300px] sm:h-[350px] 2xl:h-[450px] w-full mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}`}
            />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0, 0, 0, 0.1)',
              }}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Line
              type="monotone"
              dataKey="faltas"
              stroke="#1e3a8a"
              strokeWidth={2}
              dot={{ r: 3, fill: '#1e3a8a', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
