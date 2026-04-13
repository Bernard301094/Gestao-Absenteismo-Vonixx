import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Employee, AttendanceRecord } from '../../../types';

interface DistributionChartProps {
  employees: Employee[];
  attendance: AttendanceRecord;
  selectedDay: number;
}

export default function DistributionChart({ employees, attendance, selectedDay }: DistributionChartProps) {
  const presentes = employees.length - employees.filter(emp => attendance[emp.id]?.[selectedDay] === 'F').length;
  const faltas = employees.filter(emp => attendance[emp.id]?.[selectedDay] === 'F').length;
  const outros = employees.filter(emp => ['Fe', 'A'].includes(attendance[emp.id]?.[selectedDay] || 'P')).length;
  const presencaRate = employees.length > 0 ? Math.round((presentes / employees.length) * 100) : 0;

  const pieData = [
    { name: 'Presentes', value: presentes },
    { name: 'Faltas', value: faltas },
    { name: 'Outros', value: outros },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col items-center relative group">
      <div className="w-full flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-gray-900">Distribuição de Asistencia</h3>
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
          Dia {selectedDay}
        </span>
      </div>

      <div className="h-[350px] w-full max-w-[500px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={85}
              outerRadius={115}
              paddingAngle={8}
              cornerRadius={10}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="#10b981" />
              <Cell fill="#f43f5e" />
              <Cell fill="#0ea5e9" />
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="block text-3xl font-black text-gray-900">{presencaRate}%</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Presença</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full mt-4">
        <div className="flex flex-col items-center p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Presentes</span>
          <span className="text-lg font-black text-emerald-700">{presentes}</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-2xl bg-rose-50 border border-rose-100">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-tighter">Faltas</span>
          <span className="text-lg font-black text-rose-700">{faltas}</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-2xl bg-sky-50 border border-sky-100">
          <span className="text-xs font-bold text-sky-600 uppercase tracking-tighter">Outros</span>
          <span className="text-lg font-black text-sky-700">{outros}</span>
        </div>
      </div>
    </div>
  );
}
