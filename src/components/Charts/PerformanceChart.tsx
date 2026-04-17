import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import type { LeaderboardEntry } from '../../types';

interface PerformanceChartProps {
  data: LeaderboardEntry[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm 2xl:text-base font-bold text-gray-900 uppercase tracking-tight">
          Performance por Turno (% Assiduidade)
        </h3>
        <TrendingUp className="w-5 h-5 text-emerald-500" />
      </div>
      <div className="h-[200px] w-full" style={{ minWidth: 0 }}>
        {mounted && (
          <ResponsiveContainer width="99%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 40, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                dataKey="shift"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 'bold', fill: '#1e3a8a' }}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                }}
                formatter={(val) => [`${val}%`, 'Assiduidade']}
              />
              <Bar dataKey="rate" radius={[0, 10, 10, 0]} barSize={30}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.rate > 90 ? '#10b981' : entry.rate > 80 ? '#3b82f6' : '#f59e0b'}
                  />
                ))}
                <LabelList
                  dataKey="rate"
                  position="right"
                  formatter={(val: any) => `${val}%`}
                  fill="#1e3a8a"
                  fontSize={12}
                  fontWeight="bold"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
